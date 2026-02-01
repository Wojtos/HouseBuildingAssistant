"""
Application configuration settings
"""

from typing import Union

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # API Configuration
    api_title: str = "HomeBuild AI Assistant API"
    api_version: str = "0.1.0"

    # CORS Configuration
    cors_origins: Union[list[str], str] = ["http://localhost:4001"]

    # Supabase Configuration
    supabase_url: str = ""
    supabase_key: str = ""

    # OpenRouter Configuration - Core
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # OpenRouter Configuration - Model Defaults
    openrouter_default_chat_model: str = "openai/gpt-4o-mini"
    openrouter_routing_model: str = "openai/gpt-4o-mini"
    openrouter_default_embedding_model: str = "openai/text-embedding-3-small"

    # OpenRouter Configuration - Request Defaults
    openrouter_default_temperature: float = 0.7
    openrouter_default_max_tokens: int = 1024

    # OpenRouter Configuration - Operational Limits
    openrouter_timeout_seconds: int = 30
    openrouter_max_retries: int = 2
    openrouter_max_prompt_chars: int = 100000
    openrouter_max_messages: int = 50

    # OpenRouter Configuration - App Identity (for OpenRouter headers)
    openrouter_app_url: str = "https://homebuild-assistant.local"
    openrouter_app_name: str = "HomeBuild AI Assistant"

    # Web Search Configuration (UC-2) - uses OpenRouter :online models
    openrouter_web_search_model: str = "openai/gpt-4o-mini:online"
    web_search_enabled: bool = True

    # Fact Extraction Configuration (UC-3)
    fact_extraction_enabled: bool = True
    openrouter_fact_extraction_model: str = "openai/gpt-4o-mini"

    # Context Limits
    max_memory_tokens: int = 2000
    max_document_tokens: int = 2000
    max_history_messages: int = 10
    max_document_chunks: int = 5

    # Database Configuration
    database_url: str = ""

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list"""
        if isinstance(v, str):
            # Split by comma and strip whitespace
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def is_openrouter_configured(self) -> bool:
        """Check if OpenRouter API key is properly configured."""
        return bool(
            self.openrouter_api_key and self.openrouter_api_key != "your-openrouter-api-key-here"
        )

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
