"""
Supabase Client Initialization
Creates and exports the Supabase client instance for database operations.
"""

from supabase import Client, create_client

from app.core.config import settings

# Initialize Supabase client with URL and anon key from settings
supabase_client: Client = create_client(
    supabase_url=settings.supabase_url, supabase_key=settings.supabase_key
)
