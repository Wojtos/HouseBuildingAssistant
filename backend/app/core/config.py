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
    
    # OpenRouter Configuration
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    
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
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

