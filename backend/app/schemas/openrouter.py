"""
OpenRouter API Schemas

Pydantic models for OpenRouter API request/response handling,
including structured JSON schema responses.
"""

from typing import Any, Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    """A single chat message in OpenRouter format."""
    
    role: Literal["system", "user", "assistant", "tool"]
    content: str
    
    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        """Ensure content is not empty or only whitespace."""
        if not v or not v.strip():
            raise ValueError("Message content cannot be empty")
        return v


class ModelParams(BaseModel):
    """
    Model parameters for chat completions.
    
    All fields are optional - unset fields will use service defaults.
    """
    
    temperature: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=2.0,
        description="Sampling temperature (0.0-2.0)"
    )
    max_tokens: Optional[int] = Field(
        default=None,
        ge=1,
        le=128000,
        description="Maximum tokens in response"
    )
    top_p: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Top-p nucleus sampling"
    )
    presence_penalty: Optional[float] = Field(
        default=None,
        ge=-2.0,
        le=2.0,
        description="Presence penalty for new topics"
    )
    frequency_penalty: Optional[float] = Field(
        default=None,
        ge=-2.0,
        le=2.0,
        description="Frequency penalty for repetition"
    )
    stop: Optional[Union[list[str], str]] = Field(
        default=None,
        description="Stop sequences"
    )
    seed: Optional[int] = Field(
        default=None,
        description="Random seed for reproducibility"
    )
    
    def merge(self, overrides: Optional["ModelParams"]) -> "ModelParams":
        """
        Merge this params object with overrides.
        
        Overrides take precedence for any non-None values.
        
        Args:
            overrides: Optional params to override defaults
            
        Returns:
            New ModelParams with merged values
        """
        if overrides is None:
            return self
        
        return ModelParams(
            temperature=overrides.temperature if overrides.temperature is not None else self.temperature,
            max_tokens=overrides.max_tokens if overrides.max_tokens is not None else self.max_tokens,
            top_p=overrides.top_p if overrides.top_p is not None else self.top_p,
            presence_penalty=overrides.presence_penalty if overrides.presence_penalty is not None else self.presence_penalty,
            frequency_penalty=overrides.frequency_penalty if overrides.frequency_penalty is not None else self.frequency_penalty,
            stop=overrides.stop if overrides.stop is not None else self.stop,
            seed=overrides.seed if overrides.seed is not None else self.seed,
        )
    
    def to_api_params(self) -> dict[str, Any]:
        """
        Convert to dict for API payload, excluding None values.
        
        Returns:
            Dict with only set parameters
        """
        params = {}
        if self.temperature is not None:
            params["temperature"] = self.temperature
        if self.max_tokens is not None:
            params["max_tokens"] = self.max_tokens
        if self.top_p is not None:
            params["top_p"] = self.top_p
        if self.presence_penalty is not None:
            params["presence_penalty"] = self.presence_penalty
        if self.frequency_penalty is not None:
            params["frequency_penalty"] = self.frequency_penalty
        if self.stop is not None:
            params["stop"] = self.stop
        if self.seed is not None:
            params["seed"] = self.seed
        return params


class JsonSchemaSpec(BaseModel):
    """JSON Schema specification for structured responses."""
    
    name: str = Field(..., description="Schema name identifier")
    strict: bool = Field(default=True, description="Enforce strict schema validation")
    schema_: dict[str, Any] = Field(..., alias="schema", description="JSON Schema object")
    
    model_config = {"populate_by_name": True}


class ResponseFormat(BaseModel):
    """Response format specification for structured outputs."""
    
    type: Literal["json_schema"] = "json_schema"
    json_schema: JsonSchemaSpec
    
    @classmethod
    def from_schema(
        cls,
        name: str,
        schema: dict[str, Any],
        strict: bool = True
    ) -> "ResponseFormat":
        """
        Create ResponseFormat from a JSON schema dict.
        
        Args:
            name: Schema identifier name
            schema: JSON Schema definition
            strict: Whether to enforce strict validation
            
        Returns:
            ResponseFormat instance
        """
        return cls(
            type="json_schema",
            json_schema=JsonSchemaSpec(name=name, strict=strict, schema=schema)
        )
    
    def to_api_format(self) -> dict[str, Any]:
        """
        Convert to OpenRouter API format.
        
        Returns:
            Dict in OpenRouter response_format shape
        """
        return {
            "type": self.type,
            "json_schema": {
                "name": self.json_schema.name,
                "strict": self.json_schema.strict,
                "schema": self.json_schema.schema_
            }
        }


class TokenUsage(BaseModel):
    """Token usage information from API response."""
    
    prompt_tokens: int = Field(..., ge=0, description="Tokens in the prompt")
    completion_tokens: int = Field(..., ge=0, description="Tokens in the completion")
    total_tokens: int = Field(..., ge=0, description="Total tokens used")
    
    @classmethod
    def from_api_response(cls, usage: dict[str, Any]) -> "TokenUsage":
        """
        Create TokenUsage from API response.
        
        Args:
            usage: Usage dict from OpenRouter response
            
        Returns:
            TokenUsage instance
        """
        return cls(
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0)
        )


class NormalizedChatResult(BaseModel):
    """
    Normalized chat completion result.
    
    Provides a consistent interface regardless of the underlying
    model or provider used via OpenRouter.
    """
    
    content: str = Field(..., description="Assistant message content (text or JSON string)")
    model: str = Field(..., description="Model identifier used for completion")
    finish_reason: Optional[str] = Field(
        default=None,
        description="Reason for completion (stop, length, etc.)"
    )
    usage: Optional[TokenUsage] = Field(
        default=None,
        description="Token usage statistics"
    )
    raw: Optional[dict[str, Any]] = Field(
        default=None,
        description="Raw provider response (for debugging, redact before logging)"
    )
    
    @classmethod
    def from_api_response(cls, response: dict[str, Any]) -> "NormalizedChatResult":
        """
        Create NormalizedChatResult from OpenRouter API response.
        
        Args:
            response: Raw API response dict
            
        Returns:
            NormalizedChatResult instance
            
        Raises:
            ValueError: If response shape is invalid
        """
        try:
            choices = response.get("choices", [])
            if not choices:
                raise ValueError("Response missing 'choices' array")
            
            first_choice = choices[0]
            message = first_choice.get("message", {})
            content = message.get("content")
            
            if content is None:
                raise ValueError("Response missing 'message.content'")
            
            usage = None
            if "usage" in response:
                usage = TokenUsage.from_api_response(response["usage"])
            
            return cls(
                content=content,
                model=response.get("model", "unknown"),
                finish_reason=first_choice.get("finish_reason"),
                usage=usage,
                raw=response
            )
        except KeyError as e:
            raise ValueError(f"Invalid response shape: missing {e}")


# Convenience type for structured output parsing
class StructuredOutputResult(BaseModel):
    """Result from structured output parsing."""
    
    parsed: Any = Field(..., description="Parsed and validated output object")
    result: NormalizedChatResult = Field(..., description="Original chat result")
