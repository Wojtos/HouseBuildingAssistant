"""
AI Client for LLM Integration

Handles communication with OpenRouter API for:
- Chat completions (agent responses)
- Text embeddings (document vectorization)

For development, includes a mock mode for testing without API calls.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    """Exception raised when AI service calls fail"""

    pass


class AIClient:
    """
    Client for AI service integration via OpenRouter.

    Supports both real API calls and mock mode for development/testing.
    """

    def __init__(self, mock_mode: bool = None):
        """
        Initialize AI client.

        Args:
            mock_mode: If True, use mock responses. If None, auto-detect from env.
        """
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

        # Auto-detect mock mode if not specified
        if mock_mode is None:
            mock_mode = not self.api_key or self.api_key == "your-openrouter-api-key-here"

        self.mock_mode = mock_mode

        if self.mock_mode:
            logger.info("AI Client initialized in MOCK MODE")
        else:
            logger.info("AI Client initialized with OpenRouter API")
            self.client = httpx.AsyncClient(timeout=30.0)

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "openai/gpt-4-turbo",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Generate a chat completion.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model identifier (e.g., "openai/gpt-4-turbo")
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens in response

        Returns:
            Dict with 'content', 'model', 'usage' (tokens), etc.

        Raises:
            AIServiceError: If API call fails
        """
        if self.mock_mode:
            return self._mock_chat_completion(messages, model)

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
            }

            if max_tokens:
                payload["max_tokens"] = max_tokens

            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()

            result = response.json()

            # Extract and return normalized response
            return {
                "content": result["choices"][0]["message"]["content"],
                "model": result["model"],
                "usage": {
                    "prompt_tokens": result["usage"]["prompt_tokens"],
                    "completion_tokens": result["usage"]["completion_tokens"],
                    "total_tokens": result["usage"]["total_tokens"],
                },
                "finish_reason": result["choices"][0]["finish_reason"],
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"OpenRouter API error: {e.response.status_code} - {e.response.text}")
            raise AIServiceError(f"AI service error: {e.response.status_code}")

        except httpx.TimeoutException:
            logger.error("OpenRouter API timeout")
            raise AIServiceError("AI service timeout")

        except Exception as e:
            logger.error(f"Unexpected error in chat_completion: {e}", exc_info=True)
            raise AIServiceError(f"AI service error: {str(e)}")

    async def generate_embedding(
        self,
        text: str,
        model: str = "openai/text-embedding-3-small",
    ) -> List[float]:
        """
        Generate text embedding for semantic search.

        Args:
            text: Text to embed
            model: Embedding model identifier

        Returns:
            List of floats representing the embedding vector

        Raises:
            AIServiceError: If API call fails
        """
        if self.mock_mode:
            return self._mock_embedding(text)

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            payload = {
                "model": model,
                "input": text,
            }

            response = await self.client.post(
                f"{self.base_url}/embeddings",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()

            result = response.json()
            return result["data"][0]["embedding"]

        except httpx.HTTPStatusError as e:
            logger.error(f"OpenRouter embedding error: {e.response.status_code}")
            raise AIServiceError(f"Embedding service error: {e.response.status_code}")

        except Exception as e:
            logger.error(f"Unexpected error in generate_embedding: {e}", exc_info=True)
            raise AIServiceError(f"Embedding service error: {str(e)}")

    async def close(self):
        """Close HTTP client connection."""
        if not self.mock_mode and hasattr(self, "client"):
            await self.client.aclose()

    # Mock implementations for development

    def _mock_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
    ) -> Dict[str, Any]:
        """
        Generate mock chat completion for testing.

        Returns realistic-looking responses based on the last user message.
        """
        # Get the last user message
        user_message = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_message = msg.get("content", "")
                break

        # Generate mock response based on keywords
        response_content = self._generate_mock_response(user_message)

        # Simulate token usage
        prompt_tokens = sum(len(msg.get("content", "").split()) for msg in messages) * 1.3
        completion_tokens = len(response_content.split()) * 1.3

        logger.info(f"[MOCK] Generated response ({int(completion_tokens)} tokens)")

        return {
            "content": response_content,
            "model": f"{model} (mock)",
            "usage": {
                "prompt_tokens": int(prompt_tokens),
                "completion_tokens": int(completion_tokens),
                "total_tokens": int(prompt_tokens + completion_tokens),
            },
            "finish_reason": "stop",
        }

    def _generate_mock_response(self, user_message: str) -> str:
        """Generate contextual mock response based on user message."""
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

The exact requirements vary by location. I recommend contacting your local building department for specific requirements in your area."""

        elif any(word in user_lower for word in ["cost", "budget", "price", "finance"]):
            return """Construction costs vary significantly based on location, materials, and specifications. 

For a single-family home, typical costs range from:
- **Basic construction**: $150-200 per square foot
- **Mid-range finishes**: $200-300 per square foot  
- **High-end custom**: $300-500+ per square foot

Keep in mind to budget an additional 10-20% contingency for unexpected costs. Would you like help breaking down specific cost categories?"""

        elif any(word in user_lower for word in ["land", "plot", "site"]):
            return """When selecting a plot of land, consider these key factors:

1. **Location & Access**: Proximity to utilities, roads, and services
2. **Soil Quality**: Get a soil test to assess foundation requirements
3. **Topography**: Slope and drainage characteristics
4. **Zoning**: Permitted uses and building restrictions
5. **Utilities**: Availability of water, sewer, electricity, and gas

I can help you evaluate specific properties if you share more details."""

        elif any(word in user_lower for word in ["foundation", "excavation"]):
            return """Foundation types depend on soil conditions and building requirements:

**Common Options:**
- **Slab-on-grade**: Cost-effective for stable soil
- **Crawl space**: Better for sloped lots or areas with moisture
- **Full basement**: Adds living/storage space but higher cost

Each requires proper site preparation, excavation, and drainage systems. A soil report will determine the best option for your site."""

        else:
            # Generic helpful response
            return f"""I understand you're asking about: "{user_message[:100]}"

As your home building assistant, I'm here to help guide you through every phase of construction. I can provide information about:

- Land selection and site analysis
- Permits and regulations
- Design and architecture
- Budgeting and financing
- Construction processes
- Materials and finishes

Could you provide more specific details about your question so I can give you more targeted guidance?"""

    def _mock_embedding(self, text: str) -> List[float]:
        """
        Generate mock embedding vector.

        Returns a deterministic vector based on text hash for consistency.
        """
        # Generate deterministic but varied embedding
        import hashlib

        text_hash = int(hashlib.md5(text.encode()).hexdigest(), 16)

        # Generate 1536-dimensional vector (matching text-embedding-3-small)
        embedding = []
        for i in range(1536):
            # Use hash to generate pseudo-random but deterministic values
            seed = (text_hash + i) % (2**31)
            value = (seed % 1000) / 500.0 - 1.0  # Range: -1.0 to 1.0
            embedding.append(value)

        logger.debug(f"[MOCK] Generated embedding vector (1536 dimensions)")
        return embedding


def get_ai_client(mock_mode: bool = None) -> AIClient:
    """
    Factory function for creating AIClient instances.

    Used as a FastAPI dependency.

    Args:
        mock_mode: Override auto-detection of mock mode

    Returns:
        AIClient instance
    """
    return AIClient(mock_mode=mock_mode)
