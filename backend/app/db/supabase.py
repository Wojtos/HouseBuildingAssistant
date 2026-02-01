"""
Supabase Client Initialization
Creates and exports the Supabase client instance for database operations.

Uses lazy initialization to defer client creation until first access.
This allows tests to run without valid Supabase credentials.
"""

from typing import Optional

from supabase import Client, create_client

from app.core.config import settings

# Lazy-initialized Supabase client instance
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get the Supabase client instance, creating it if necessary.

    Uses lazy initialization to defer client creation until first access.
    This allows tests to run without valid Supabase credentials when
    the client is mocked or not used.

    Returns:
        Client: The Supabase client instance
    """
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            supabase_url=settings.supabase_url, supabase_key=settings.supabase_key
        )
    return _supabase_client


# Backwards-compatible property-like access
# NOTE: This is deprecated - use get_supabase_client() instead
class _LazySupabaseClient:
    """Wrapper that lazily initializes the Supabase client on first access."""

    def __getattr__(self, name):
        return getattr(get_supabase_client(), name)


supabase_client = _LazySupabaseClient()
