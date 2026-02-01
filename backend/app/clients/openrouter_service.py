"""
OpenRouter Service

Handles communication with OpenRouter API for LLM chat completions.
Provides:
- Typed integration point for all model calls
- Consistent message construction
- Support for structured JSON responses
- Robust error handling with retries
- Security controls (key management, safe logging)
"""

import asyncio
import hashlib
import json
import logging
import random
from typing import Any, Optional, Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import Settings
from app.core.config import settings as default_settings
from app.schemas.openrouter import (
    ChatMessage,
    ModelParams,
    NormalizedChatResult,
    ResponseFormat,
    TokenUsage,
)

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


# ============================================================================
# Exception Hierarchy
# ============================================================================


class OpenRouterError(Exception):
    """Base exception for OpenRouter service errors."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class OpenRouterAuthError(OpenRouterError):
    """Authentication/authorization error (401/403)."""

    pass


class OpenRouterRateLimitError(OpenRouterError):
    """Rate limit exceeded (429)."""

    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message, status_code=429)
        self.retry_after = retry_after


class OpenRouterBadRequestError(OpenRouterError):
    """Bad request error (400)."""

    pass


class OpenRouterProviderError(OpenRouterError):
    """Provider-side error (5xx)."""

    pass


class OpenRouterTimeoutError(OpenRouterError):
    """Request timeout error."""

    pass


class OpenRouterNetworkError(OpenRouterError):
    """Network/connection error."""

    pass


class OpenRouterResponseError(OpenRouterError):
    """Invalid response shape from API."""

    pass


class OpenRouterParseError(OpenRouterError):
    """Failed to parse JSON content from response."""

    pass


class OpenRouterValidationError(OpenRouterError):
    """Structured output validation failed."""

    pass


# ============================================================================
# OpenRouter Service
# ============================================================================


class OpenRouterService:
    """
    Service for OpenRouter API integration.

    Provides chat completions with support for:
    - Standard text responses
    - Structured JSON schema responses
    - Automatic retry with exponential backoff
    - Mock mode for development/testing
    """

    def __init__(
        self,
        settings: Optional[Settings] = None,
        http_client: Optional[httpx.AsyncClient] = None,
        mock_mode: Optional[bool] = None,
    ):
        """
        Initialize OpenRouter service.

        Args:
            settings: Application settings (defaults to global settings)
            http_client: Optional HTTP client for testing
            mock_mode: Force mock mode (auto-detects if None)
        """
        self._settings = settings or default_settings

        # API configuration
        self._api_key = self._settings.openrouter_api_key
        self._base_url = self._settings.openrouter_base_url.rstrip("/")

        # Auto-detect mock mode if not specified
        if mock_mode is None:
            mock_mode = not self._settings.is_openrouter_configured

        self._mock_mode = mock_mode

        # Default model settings
        self._default_model = self._settings.openrouter_default_chat_model
        self._routing_model = self._settings.openrouter_routing_model
        self._embedding_model = self._settings.openrouter_default_embedding_model

        # Default parameters
        self._default_params = ModelParams(
            temperature=self._settings.openrouter_default_temperature,
            max_tokens=self._settings.openrouter_default_max_tokens,
        )

        # Operational limits
        self._timeout = self._settings.openrouter_timeout_seconds
        self._max_retries = self._settings.openrouter_max_retries
        self._max_prompt_chars = self._settings.openrouter_max_prompt_chars
        self._max_messages = self._settings.openrouter_max_messages

        # App identity headers
        self._app_headers = {
            "HTTP-Referer": self._settings.openrouter_app_url,
            "X-Title": self._settings.openrouter_app_name,
        }

        # HTTP client
        if http_client is not None:
            self._client = http_client
            self._owns_client = False
        elif not self._mock_mode:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(self._timeout, connect=10.0))
            self._owns_client = True
        else:
            self._client = None
            self._owns_client = False

        if self._mock_mode:
            logger.info("OpenRouterService initialized in MOCK MODE")
        else:
            logger.info("OpenRouterService initialized with OpenRouter API")

    # ========================================================================
    # Public Properties
    # ========================================================================

    @property
    def mock_mode(self) -> bool:
        """Whether the service is in mock mode."""
        return self._mock_mode

    @property
    def default_model(self) -> str:
        """Default model for chat completions."""
        return self._default_model

    @property
    def routing_model(self) -> str:
        """Model for routing/triage operations."""
        return self._routing_model

    # ========================================================================
    # Public Methods
    # ========================================================================

    async def chat_completion(
        self,
        user_message: str,
        system_message: Optional[str] = None,
        messages: Optional[list[ChatMessage]] = None,
        model: Optional[str] = None,
        params: Optional[ModelParams] = None,
        response_format: Optional[ResponseFormat] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> NormalizedChatResult:
        """
        Execute a chat completion via OpenRouter.

        Args:
            user_message: The user's primary message
            system_message: Optional system instruction
            messages: Full message list (overrides system_message/user_message)
            model: Model identifier (defaults to service default)
            params: Model parameters (merged with defaults)
            response_format: Optional JSON schema for structured output
            metadata: Optional metadata for logging/tracing

        Returns:
            Normalized chat completion result

        Raises:
            OpenRouterError: On API or processing errors
        """
        if self._mock_mode:
            return self._mock_chat_completion(
                user_message=user_message,
                system_message=system_message,
                messages=messages,
                model=model,
                response_format=response_format,
            )

        # Build request components
        resolved_model = model or self._default_model
        resolved_params = self._default_params.merge(params)
        built_messages = self._build_messages(system_message, user_message, messages)

        # Validate input constraints
        self._validate_input(built_messages)

        # Build payload
        payload = self._build_payload(
            model=resolved_model,
            messages=built_messages,
            params=resolved_params,
            response_format=response_format,
        )

        # Execute request with retry
        raw_response = await self._request_with_retry(payload, metadata)

        # Normalize response
        return self._normalize_chat_response(raw_response)

    async def chat_completion_json(
        self,
        user_message: str,
        schema_name: str,
        schema: dict[str, Any],
        output_model: Optional[Type[T]] = None,
        system_message: Optional[str] = None,
        messages: Optional[list[ChatMessage]] = None,
        model: Optional[str] = None,
        params: Optional[ModelParams] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> tuple[Any, NormalizedChatResult]:
        """
        Execute chat completion with JSON schema response format.

        Args:
            user_message: The user's primary message
            schema_name: Name identifier for the JSON schema
            schema: JSON Schema definition
            output_model: Optional Pydantic model for validation
            system_message: Optional system instruction
            messages: Full message list (overrides system_message/user_message)
            model: Model identifier (defaults to routing model)
            params: Model parameters (merged with defaults)
            metadata: Optional metadata for logging/tracing

        Returns:
            Tuple of (parsed_object, normalized_result)

        Raises:
            OpenRouterParseError: If response is not valid JSON
            OpenRouterValidationError: If response fails schema/model validation
        """
        # Use routing model by default for structured outputs
        resolved_model = model or self._routing_model

        # Build response format
        response_format = ResponseFormat.from_schema(
            name=schema_name,
            schema=schema,
            strict=True,
        )

        # Execute completion
        result = await self.chat_completion(
            user_message=user_message,
            system_message=system_message,
            messages=messages,
            model=resolved_model,
            params=params,
            response_format=response_format,
            metadata=metadata,
        )

        # Parse JSON content
        parsed = self._parse_json_content(result.content)

        # Validate against Pydantic model if provided
        if output_model is not None:
            try:
                parsed = output_model.model_validate(parsed)
            except ValidationError as e:
                raise OpenRouterValidationError(
                    f"Response validation failed: {e.error_count()} errors"
                ) from e

        return parsed, result

    async def close(self) -> None:
        """Close the HTTP client connection."""
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            logger.debug("OpenRouterService HTTP client closed")

    # ========================================================================
    # Private Methods - Request Building
    # ========================================================================

    def _build_headers(self) -> dict[str, str]:
        """Build HTTP headers for OpenRouter API request."""
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        headers.update(self._app_headers)
        return headers

    def _build_messages(
        self,
        system_message: Optional[str],
        user_message: str,
        messages: Optional[list[ChatMessage]],
    ) -> list[dict[str, str]]:
        """
        Build message list for API request.

        Args:
            system_message: Optional system instruction
            user_message: Primary user message
            messages: Full message list (if provided, overrides others)

        Returns:
            List of message dicts for API
        """
        if messages is not None:
            return [{"role": msg.role, "content": msg.content} for msg in messages]

        result = []

        if system_message:
            result.append({"role": "system", "content": system_message})

        result.append({"role": "user", "content": user_message})

        return result

    def _build_payload(
        self,
        model: str,
        messages: list[dict[str, str]],
        params: ModelParams,
        response_format: Optional[ResponseFormat],
    ) -> dict[str, Any]:
        """
        Build request payload for OpenRouter API.

        Args:
            model: Model identifier
            messages: List of messages
            params: Model parameters
            response_format: Optional response format specification

        Returns:
            Complete request payload dict
        """
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
        }

        # Add model parameters
        payload.update(params.to_api_params())

        # Add response format if specified
        if response_format is not None:
            payload["response_format"] = response_format.to_api_format()

        return payload

    def _validate_input(self, messages: list[dict[str, str]]) -> None:
        """
        Validate input constraints.

        Args:
            messages: List of messages to validate

        Raises:
            OpenRouterBadRequestError: If validation fails
        """
        if len(messages) > self._max_messages:
            raise OpenRouterBadRequestError(
                f"Too many messages: {len(messages)} > {self._max_messages}"
            )

        total_chars = sum(len(msg.get("content", "")) for msg in messages)
        if total_chars > self._max_prompt_chars:
            raise OpenRouterBadRequestError(
                f"Prompt too long: {total_chars} chars > {self._max_prompt_chars}"
            )

    # ========================================================================
    # Private Methods - Request Execution
    # ========================================================================

    async def _request_with_retry(
        self,
        payload: dict[str, Any],
        metadata: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Execute request with retry logic.

        Args:
            payload: Request payload
            metadata: Optional metadata for logging

        Returns:
            Raw API response

        Raises:
            OpenRouterError: On non-retryable or exhausted retries
        """
        last_error: Optional[Exception] = None

        for attempt in range(self._max_retries + 1):
            try:
                return await self._request_chat_completions(payload)

            except (
                OpenRouterRateLimitError,
                OpenRouterProviderError,
                OpenRouterTimeoutError,
                OpenRouterNetworkError,
            ) as e:
                last_error = e

                if attempt < self._max_retries:
                    delay = self._calculate_backoff(attempt, e)
                    logger.warning(
                        f"OpenRouter request failed (attempt {attempt + 1}/{self._max_retries + 1}), "
                        f"retrying in {delay:.1f}s: {e}"
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"OpenRouter request failed after {self._max_retries + 1} attempts: {e}"
                    )
                    raise

            except (OpenRouterAuthError, OpenRouterBadRequestError):
                # Non-retryable errors
                raise

        # Should not reach here, but satisfy type checker
        if last_error:
            raise last_error
        raise OpenRouterError("Request failed")

    async def _request_chat_completions(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Execute single chat completion request.

        Args:
            payload: Request payload

        Returns:
            Raw API response dict

        Raises:
            OpenRouterError subclass based on error type
        """
        url = f"{self._base_url}/chat/completions"
        headers = self._build_headers()

        try:
            response = await self._client.post(url, headers=headers, json=payload)

            # Handle error responses
            if response.status_code != 200:
                self._handle_error_response(response)

            return response.json()

        except httpx.TimeoutException as e:
            raise OpenRouterTimeoutError(f"Request timed out: {e}")

        except httpx.RequestError as e:
            raise OpenRouterNetworkError(f"Network error: {e}")

    def _handle_error_response(self, response: httpx.Response) -> None:
        """
        Handle non-200 response and raise appropriate exception.

        Args:
            response: HTTP response object

        Raises:
            OpenRouterError subclass based on status code
        """
        status = response.status_code

        try:
            body = response.json()
            error_msg = body.get("error", {}).get("message", response.text[:200])
        except Exception:
            error_msg = response.text[:200] if response.text else "Unknown error"

        if status in (401, 403):
            raise OpenRouterAuthError(f"Authentication failed: {error_msg}", status_code=status)

        elif status == 429:
            retry_after = response.headers.get("Retry-After")
            raise OpenRouterRateLimitError(
                f"Rate limit exceeded: {error_msg}",
                retry_after=int(retry_after) if retry_after else None,
            )

        elif status == 400:
            raise OpenRouterBadRequestError(f"Bad request: {error_msg}", status_code=status)

        elif status == 404:
            raise OpenRouterBadRequestError(f"Not found: {error_msg}", status_code=status)

        elif status >= 500:
            raise OpenRouterProviderError(f"Provider error: {error_msg}", status_code=status)

        else:
            raise OpenRouterError(f"HTTP {status}: {error_msg}", status_code=status)

    def _calculate_backoff(
        self,
        attempt: int,
        error: Optional[Exception] = None,
    ) -> float:
        """
        Calculate retry backoff delay with jitter.

        Args:
            attempt: Current attempt number (0-based)
            error: Optional error for rate limit handling

        Returns:
            Delay in seconds
        """
        # Check for Retry-After header
        if isinstance(error, OpenRouterRateLimitError) and error.retry_after:
            return min(error.retry_after, 60.0)

        # Exponential backoff: 1s, 2s, 4s... with jitter
        base_delay = 2**attempt
        jitter = random.uniform(0, 0.5)
        return min(base_delay + jitter, 30.0)

    # ========================================================================
    # Private Methods - Response Processing
    # ========================================================================

    def _normalize_chat_response(
        self,
        raw: dict[str, Any],
    ) -> NormalizedChatResult:
        """
        Normalize raw API response to standard format.

        Args:
            raw: Raw API response dict

        Returns:
            Normalized result

        Raises:
            OpenRouterResponseError: If response shape is invalid
        """
        try:
            return NormalizedChatResult.from_api_response(raw)
        except ValueError as e:
            raise OpenRouterResponseError(str(e))

    def _parse_json_content(self, content: str) -> Any:
        """
        Parse JSON from assistant content.

        Args:
            content: Raw content string

        Returns:
            Parsed JSON object

        Raises:
            OpenRouterParseError: If content is not valid JSON
        """
        try:
            return json.loads(content.strip())
        except json.JSONDecodeError as e:
            # Include short excerpt for debugging
            excerpt = content[:100] + "..." if len(content) > 100 else content
            raise OpenRouterParseError(f"Failed to parse JSON: {e.msg} (excerpt: {excerpt!r})")

    # ========================================================================
    # Mock Implementation
    # ========================================================================

    def _mock_chat_completion(
        self,
        user_message: str,
        system_message: Optional[str],
        messages: Optional[list[ChatMessage]],
        model: Optional[str],
        response_format: Optional[ResponseFormat],
    ) -> NormalizedChatResult:
        """
        Generate mock chat completion for testing.

        Args:
            user_message: User message
            system_message: System message
            messages: Full message list
            model: Model identifier
            response_format: Response format specification

        Returns:
            Mock normalized result
        """
        resolved_model = model or self._default_model

        # Determine the actual user message content
        if messages:
            user_content = ""
            for msg in reversed(messages):
                if msg.role == "user":
                    user_content = msg.content
                    break
        else:
            user_content = user_message

        # Generate appropriate mock response
        if response_format is not None:
            content = self._generate_mock_structured_response(user_content, response_format)
        else:
            content = self._generate_mock_text_response(user_content)

        # Calculate mock token usage
        prompt_tokens = len(user_content.split()) + (
            len(system_message.split()) if system_message else 0
        )
        completion_tokens = len(content.split())

        logger.info(f"[MOCK] Generated response ({completion_tokens} tokens)")

        return NormalizedChatResult(
            content=content,
            model=f"{resolved_model} (mock)",
            finish_reason="stop",
            usage=TokenUsage(
                prompt_tokens=int(prompt_tokens * 1.3),
                completion_tokens=int(completion_tokens * 1.3),
                total_tokens=int((prompt_tokens + completion_tokens) * 1.3),
            ),
            raw=None,
        )

    def _generate_mock_text_response(self, user_message: str) -> str:
        """Generate contextual mock text response."""
        user_lower = user_message.lower()

        # Agent routing responses
        if "agent" in user_lower or "route" in user_lower:
            return "LAND_FEASIBILITY_AGENT"

        # Domain-specific responses
        if any(word in user_lower for word in ["permit", "regulation", "zoning"]):
            return """For residential construction, you typically need several permits:

1. **Building Permit**: Required for structural work, issued by local building department
2. **Zoning Permit**: Ensures compliance with local zoning regulations
3. **Utility Permits**: For electrical, plumbing, and HVAC connections

The exact requirements vary by location. I recommend contacting your local building department."""

        elif any(word in user_lower for word in ["cost", "budget", "price", "finance"]):
            return """Construction costs vary significantly based on location, materials, and specifications.

For a single-family home, typical costs range from:
- **Basic construction**: $150-200 per square foot
- **Mid-range finishes**: $200-300 per square foot
- **High-end custom**: $300-500+ per square foot

Budget an additional 10-20% contingency for unexpected costs."""

        elif any(word in user_lower for word in ["land", "plot", "site"]):
            return """When selecting a plot of land, consider these key factors:

1. **Location & Access**: Proximity to utilities, roads, and services
2. **Soil Quality**: Get a soil test to assess foundation requirements
3. **Topography**: Slope and drainage characteristics
4. **Zoning**: Permitted uses and building restrictions
5. **Utilities**: Availability of water, sewer, electricity, and gas"""

        else:
            return f"""I understand you're asking about: "{user_message[:100]}"

As your home building assistant, I'm here to help guide you through every phase of construction. Could you provide more specific details about your question?"""

    def _generate_mock_structured_response(
        self,
        user_message: str,
        response_format: ResponseFormat,
    ) -> str:
        """Generate mock structured JSON response."""
        schema_name = response_format.json_schema.name

        if schema_name == "agent_routing":
            return json.dumps(
                {
                    "agent_id": "LAND_FEASIBILITY_AGENT",
                    "confidence": 0.85,
                    "reasoning": "Mock routing based on user query content",
                }
            )

        elif schema_name == "project_facts_extract":
            return json.dumps(
                {
                    "facts": [
                        {
                            "domain": "general",
                            "key": "mock_fact",
                            "value": "This is a mock extracted fact",
                            "source": "user_message",
                        }
                    ]
                }
            )

        else:
            # Generic JSON response
            return json.dumps({"result": "mock_response", "query": user_message[:50]})


# ============================================================================
# Factory Function
# ============================================================================


def get_openrouter_service(
    settings: Optional[Settings] = None,
    mock_mode: Optional[bool] = None,
) -> OpenRouterService:
    """
    Factory function for creating OpenRouterService instances.

    Used as a FastAPI dependency.

    Args:
        settings: Optional settings override
        mock_mode: Optional mock mode override

    Returns:
        OpenRouterService instance
    """
    return OpenRouterService(settings=settings, mock_mode=mock_mode)
