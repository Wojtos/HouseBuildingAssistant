"""
Unit Tests for OpenRouterService

Tests the OpenRouter service including:
- Request building
- Response normalization
- Error handling
- Retry logic
- Mock mode
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
from pydantic import BaseModel

from app.clients.openrouter_service import (
    OpenRouterService,
    OpenRouterError,
    OpenRouterAuthError,
    OpenRouterRateLimitError,
    OpenRouterBadRequestError,
    OpenRouterProviderError,
    OpenRouterTimeoutError,
    OpenRouterNetworkError,
    OpenRouterResponseError,
    OpenRouterParseError,
    OpenRouterValidationError,
)
from app.schemas.openrouter import (
    ChatMessage,
    ModelParams,
    NormalizedChatResult,
    ResponseFormat,
    TokenUsage,
)
from app.core.config import Settings


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def mock_settings():
    """Create mock settings for testing."""
    return Settings(
        openrouter_api_key="test-api-key",
        openrouter_base_url="https://api.test.openrouter.ai/v1",
        openrouter_default_chat_model="test/model",
        openrouter_routing_model="test/routing-model",
        openrouter_default_temperature=0.7,
        openrouter_default_max_tokens=1024,
        openrouter_timeout_seconds=30,
        openrouter_max_retries=2,
        openrouter_max_prompt_chars=10000,
        openrouter_max_messages=20,
        openrouter_app_url="https://test.app",
        openrouter_app_name="Test App",
    )


@pytest.fixture
def mock_http_client():
    """Create mock HTTP client."""
    return AsyncMock(spec=httpx.AsyncClient)


@pytest.fixture
def service_with_mock_client(mock_settings, mock_http_client):
    """Create service with mock HTTP client."""
    return OpenRouterService(
        settings=mock_settings,
        http_client=mock_http_client,
        mock_mode=False,
    )


@pytest.fixture
def mock_mode_service(mock_settings):
    """Create service in mock mode."""
    return OpenRouterService(
        settings=mock_settings,
        mock_mode=True,
    )


@pytest.fixture
def success_response():
    """Create a successful API response."""
    return {
        "id": "chatcmpl-123",
        "object": "chat.completion",
        "created": 1677652288,
        "model": "test/model",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "This is a test response.",
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30,
        },
    }


@pytest.fixture
def json_response():
    """Create a JSON structured response."""
    return {
        "id": "chatcmpl-456",
        "object": "chat.completion",
        "created": 1677652288,
        "model": "test/routing-model",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": '{"agent_id": "TEST_AGENT", "confidence": 0.95, "reasoning": "Test routing"}',
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 15,
            "completion_tokens": 25,
            "total_tokens": 40,
        },
    }


# ============================================================================
# Constructor Tests
# ============================================================================


class TestOpenRouterServiceInit:
    """Tests for OpenRouterService initialization."""
    
    def test_init_with_valid_settings(self, mock_settings):
        """Test service initializes with valid settings."""
        service = OpenRouterService(settings=mock_settings, mock_mode=True)
        
        assert service.mock_mode is True
        assert service.default_model == "test/model"
        assert service.routing_model == "test/routing-model"
    
    def test_auto_detect_mock_mode_with_missing_key(self):
        """Test mock mode is auto-detected when API key is missing."""
        settings = Settings(openrouter_api_key="")
        service = OpenRouterService(settings=settings)
        
        assert service.mock_mode is True
    
    def test_auto_detect_mock_mode_with_placeholder_key(self):
        """Test mock mode is auto-detected with placeholder key."""
        settings = Settings(openrouter_api_key="your-openrouter-api-key-here")
        service = OpenRouterService(settings=settings)
        
        assert service.mock_mode is True
    
    def test_real_mode_with_valid_key(self, mock_settings, mock_http_client):
        """Test service initializes in real mode with valid key."""
        service = OpenRouterService(
            settings=mock_settings,
            http_client=mock_http_client,
            mock_mode=False,
        )
        
        assert service.mock_mode is False


# ============================================================================
# Request Building Tests
# ============================================================================


class TestRequestBuilding:
    """Tests for request building methods."""
    
    def test_build_headers(self, service_with_mock_client):
        """Test headers are built correctly."""
        headers = service_with_mock_client._build_headers()
        
        assert "Authorization" in headers
        assert headers["Authorization"] == "Bearer test-api-key"
        assert headers["Content-Type"] == "application/json"
        assert headers["HTTP-Referer"] == "https://test.app"
        assert headers["X-Title"] == "Test App"
    
    def test_build_messages_simple(self, service_with_mock_client):
        """Test message building with system and user messages."""
        messages = service_with_mock_client._build_messages(
            system_message="You are a helper.",
            user_message="Hello",
            messages=None,
        )
        
        assert len(messages) == 2
        assert messages[0] == {"role": "system", "content": "You are a helper."}
        assert messages[1] == {"role": "user", "content": "Hello"}
    
    def test_build_messages_user_only(self, service_with_mock_client):
        """Test message building with user message only."""
        messages = service_with_mock_client._build_messages(
            system_message=None,
            user_message="Hello",
            messages=None,
        )
        
        assert len(messages) == 1
        assert messages[0] == {"role": "user", "content": "Hello"}
    
    def test_build_messages_override(self, service_with_mock_client):
        """Test that explicit messages override system/user."""
        custom_messages = [
            ChatMessage(role="system", content="Custom system"),
            ChatMessage(role="user", content="Custom user"),
            ChatMessage(role="assistant", content="Custom assistant"),
        ]
        
        messages = service_with_mock_client._build_messages(
            system_message="Ignored",
            user_message="Also ignored",
            messages=custom_messages,
        )
        
        assert len(messages) == 3
        assert messages[0]["content"] == "Custom system"
    
    def test_build_payload_basic(self, service_with_mock_client):
        """Test basic payload building."""
        messages = [{"role": "user", "content": "Hello"}]
        params = ModelParams(temperature=0.5, max_tokens=100)
        
        payload = service_with_mock_client._build_payload(
            model="test/model",
            messages=messages,
            params=params,
            response_format=None,
        )
        
        assert payload["model"] == "test/model"
        assert payload["messages"] == messages
        assert payload["temperature"] == 0.5
        assert payload["max_tokens"] == 100
        assert "response_format" not in payload
    
    def test_build_payload_with_response_format(self, service_with_mock_client):
        """Test payload building with JSON schema response format."""
        messages = [{"role": "user", "content": "Hello"}]
        params = ModelParams(temperature=0.0)
        
        response_format = ResponseFormat.from_schema(
            name="test_schema",
            schema={"type": "object", "properties": {"result": {"type": "string"}}},
            strict=True,
        )
        
        payload = service_with_mock_client._build_payload(
            model="test/model",
            messages=messages,
            params=params,
            response_format=response_format,
        )
        
        assert "response_format" in payload
        assert payload["response_format"]["type"] == "json_schema"
        assert payload["response_format"]["json_schema"]["name"] == "test_schema"
        assert payload["response_format"]["json_schema"]["strict"] is True


# ============================================================================
# Response Normalization Tests
# ============================================================================


class TestResponseNormalization:
    """Tests for response normalization."""
    
    def test_normalize_success_response(self, service_with_mock_client, success_response):
        """Test normalizing a successful API response."""
        result = service_with_mock_client._normalize_chat_response(success_response)
        
        assert isinstance(result, NormalizedChatResult)
        assert result.content == "This is a test response."
        assert result.model == "test/model"
        assert result.finish_reason == "stop"
        assert result.usage is not None
        assert result.usage.total_tokens == 30
    
    def test_normalize_missing_choices(self, service_with_mock_client):
        """Test error handling for missing choices."""
        bad_response = {"model": "test", "usage": {}}
        
        with pytest.raises(OpenRouterResponseError):
            service_with_mock_client._normalize_chat_response(bad_response)
    
    def test_normalize_missing_content(self, service_with_mock_client):
        """Test error handling for missing content."""
        bad_response = {
            "model": "test",
            "choices": [{"message": {}}],
        }
        
        with pytest.raises(OpenRouterResponseError):
            service_with_mock_client._normalize_chat_response(bad_response)


# ============================================================================
# JSON Parsing Tests
# ============================================================================


class TestJsonParsing:
    """Tests for JSON content parsing."""
    
    def test_parse_valid_json(self, service_with_mock_client):
        """Test parsing valid JSON content."""
        content = '{"key": "value", "number": 42}'
        result = service_with_mock_client._parse_json_content(content)
        
        assert result == {"key": "value", "number": 42}
    
    def test_parse_json_with_whitespace(self, service_with_mock_client):
        """Test parsing JSON with surrounding whitespace."""
        content = '  \n  {"key": "value"}  \n  '
        result = service_with_mock_client._parse_json_content(content)
        
        assert result == {"key": "value"}
    
    def test_parse_invalid_json(self, service_with_mock_client):
        """Test error handling for invalid JSON."""
        content = "not valid json"
        
        with pytest.raises(OpenRouterParseError):
            service_with_mock_client._parse_json_content(content)


# ============================================================================
# Error Handling Tests
# ============================================================================


class TestErrorHandling:
    """Tests for error handling."""
    
    def test_handle_401_error(self, service_with_mock_client):
        """Test handling of 401 authentication error."""
        response = MagicMock(spec=httpx.Response)
        response.status_code = 401
        response.text = "Unauthorized"
        response.json.return_value = {"error": {"message": "Invalid API key"}}
        
        with pytest.raises(OpenRouterAuthError):
            service_with_mock_client._handle_error_response(response)
    
    def test_handle_429_rate_limit(self, service_with_mock_client):
        """Test handling of 429 rate limit error."""
        response = MagicMock(spec=httpx.Response)
        response.status_code = 429
        response.text = "Rate limited"
        response.headers = {"Retry-After": "60"}
        response.json.return_value = {"error": {"message": "Rate limit exceeded"}}
        
        with pytest.raises(OpenRouterRateLimitError) as exc_info:
            service_with_mock_client._handle_error_response(response)
        
        assert exc_info.value.retry_after == 60
    
    def test_handle_400_bad_request(self, service_with_mock_client):
        """Test handling of 400 bad request error."""
        response = MagicMock(spec=httpx.Response)
        response.status_code = 400
        response.text = "Bad request"
        response.json.return_value = {"error": {"message": "Invalid parameter"}}
        
        with pytest.raises(OpenRouterBadRequestError):
            service_with_mock_client._handle_error_response(response)
    
    def test_handle_500_provider_error(self, service_with_mock_client):
        """Test handling of 500 provider error."""
        response = MagicMock(spec=httpx.Response)
        response.status_code = 500
        response.text = "Internal error"
        response.json.return_value = {"error": {"message": "Provider error"}}
        
        with pytest.raises(OpenRouterProviderError):
            service_with_mock_client._handle_error_response(response)


# ============================================================================
# Retry Logic Tests
# ============================================================================


class TestRetryLogic:
    """Tests for retry logic."""
    
    def test_calculate_backoff_initial(self, service_with_mock_client):
        """Test backoff calculation for first retry."""
        delay = service_with_mock_client._calculate_backoff(0)
        
        # First retry: 2^0 = 1 second + jitter (0-0.5)
        assert 1.0 <= delay <= 1.5
    
    def test_calculate_backoff_with_retry_after(self, service_with_mock_client):
        """Test backoff respects Retry-After header."""
        error = OpenRouterRateLimitError("Rate limited", retry_after=30)
        delay = service_with_mock_client._calculate_backoff(0, error)
        
        assert delay == 30.0
    
    def test_calculate_backoff_max_cap(self, service_with_mock_client):
        """Test backoff is capped at maximum."""
        delay = service_with_mock_client._calculate_backoff(10)
        
        # Should be capped at 30 seconds
        assert delay <= 30.0


# ============================================================================
# Mock Mode Tests
# ============================================================================


class TestMockMode:
    """Tests for mock mode operation."""
    
    @pytest.mark.asyncio
    async def test_mock_chat_completion(self, mock_mode_service):
        """Test mock chat completion returns valid response."""
        result = await mock_mode_service.chat_completion(
            user_message="What permits do I need?",
            system_message="You are a helper.",
        )
        
        assert isinstance(result, NormalizedChatResult)
        assert result.content  # Has content
        assert "(mock)" in result.model
        assert result.finish_reason == "stop"
        assert result.usage is not None
    
    @pytest.mark.asyncio
    async def test_mock_routing_response(self, mock_mode_service):
        """Test mock mode returns valid routing response."""
        schema = {
            "type": "object",
            "properties": {
                "agent_id": {"type": "string"},
                "confidence": {"type": "number"},
                "reasoning": {"type": "string"},
            },
            "required": ["agent_id", "confidence", "reasoning"],
        }
        
        parsed, result = await mock_mode_service.chat_completion_json(
            user_message="Route this query",
            schema_name="agent_routing",
            schema=schema,
        )
        
        assert "agent_id" in parsed
        assert "confidence" in parsed
        assert "reasoning" in parsed
    
    @pytest.mark.asyncio
    async def test_mock_domain_specific_response(self, mock_mode_service):
        """Test mock mode returns domain-specific responses."""
        result = await mock_mode_service.chat_completion(
            user_message="What permits do I need for construction?",
        )
        
        # Should contain permit-related content
        assert "permit" in result.content.lower() or "building" in result.content.lower()


# ============================================================================
# Integration-Style Tests (with mocked HTTP)
# ============================================================================


class TestChatCompletion:
    """Integration-style tests for chat completion."""
    
    @pytest.mark.asyncio
    async def test_chat_completion_success(
        self, service_with_mock_client, mock_http_client, success_response
    ):
        """Test successful chat completion."""
        # Setup mock response
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = success_response
        mock_http_client.post.return_value = mock_response
        
        result = await service_with_mock_client.chat_completion(
            user_message="Hello",
            system_message="You are a helper.",
        )
        
        assert result.content == "This is a test response."
        assert mock_http_client.post.called
    
    @pytest.mark.asyncio
    async def test_chat_completion_json_success(
        self, service_with_mock_client, mock_http_client, json_response
    ):
        """Test successful JSON chat completion."""
        # Setup mock response
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = json_response
        mock_http_client.post.return_value = mock_response
        
        class TestOutput(BaseModel):
            agent_id: str
            confidence: float
            reasoning: str
        
        schema = {
            "type": "object",
            "properties": {
                "agent_id": {"type": "string"},
                "confidence": {"type": "number"},
                "reasoning": {"type": "string"},
            },
            "required": ["agent_id", "confidence", "reasoning"],
        }
        
        parsed, result = await service_with_mock_client.chat_completion_json(
            user_message="Route this",
            schema_name="test_routing",
            schema=schema,
            output_model=TestOutput,
        )
        
        assert isinstance(parsed, TestOutput)
        assert parsed.agent_id == "TEST_AGENT"
        assert parsed.confidence == 0.95


# ============================================================================
# Input Validation Tests
# ============================================================================


class TestInputValidation:
    """Tests for input validation."""
    
    def test_validate_message_count(self, service_with_mock_client):
        """Test message count validation."""
        # Create too many messages (limit is 20)
        messages = [{"role": "user", "content": f"Message {i}"} for i in range(25)]
        
        with pytest.raises(OpenRouterBadRequestError):
            service_with_mock_client._validate_input(messages)
    
    def test_validate_prompt_length(self, service_with_mock_client):
        """Test prompt length validation."""
        # Create message that exceeds character limit (10000)
        long_content = "x" * 15000
        messages = [{"role": "user", "content": long_content}]
        
        with pytest.raises(OpenRouterBadRequestError):
            service_with_mock_client._validate_input(messages)
    
    def test_validate_valid_input(self, service_with_mock_client):
        """Test valid input passes validation."""
        messages = [
            {"role": "system", "content": "You are a helper."},
            {"role": "user", "content": "Hello"},
        ]
        
        # Should not raise
        service_with_mock_client._validate_input(messages)
