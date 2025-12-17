"""
Application configuration settings
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    api_title: str = "HomeBuild AI Assistant API"
    api_version: str = "0.1.0"
    
    # CORS Configuration
    cors_origins: list[str] = ["http://localhost:4001"]
    
    # Supabase Configuration
    supabase_url: str = ""
    supabase_key: str = ""
    
    # OpenRouter Configuration
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    
    # Database Configuration
    database_url: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

