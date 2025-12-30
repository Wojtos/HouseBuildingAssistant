# Environment Configuration

## Required Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# =============================================================================
# Backend Environment Configuration
# =============================================================================

# -----------------------------------------------------------------------------
# Supabase Configuration
# -----------------------------------------------------------------------------
# Get these values by running: supabase status -o env
# For local development, use the local Supabase instance
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=your-anon-key-here

# For production, use your Supabase project URL and anon key
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-production-anon-key

# -----------------------------------------------------------------------------
# Database Configuration (Optional - direct PostgreSQL connection)
# -----------------------------------------------------------------------------
# DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# -----------------------------------------------------------------------------
# OpenRouter Configuration (for AI models)
# -----------------------------------------------------------------------------
OPENROUTER_API_KEY=your-openrouter-api-key-here
# OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
# Comma-separated list of allowed origins
# CORS_ORIGINS=http://localhost:4001,http://localhost:3000
```

## Getting Supabase Credentials

### For Local Development

1. Start your local Supabase instance:
   ```bash
   supabase start
   ```

2. Get the environment variables (requires Supabase CLI 2.48.x+):
   ```bash
   supabase status -o env
   ```

3. Copy the `ANON_KEY` value to `SUPABASE_KEY` in your `.env` file
4. The URL will be `http://127.0.0.1:54321` for local development

### For Production

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "Project URL" to `SUPABASE_URL`
4. Copy the "anon/public" key to `SUPABASE_KEY`

## Configuration Loading

The application uses `pydantic-settings` to load environment variables automatically:

- Variables are loaded from `.env` file (if present)
- Environment variables take precedence over `.env` file
- Configuration is available via `app.core.config.settings`

Example:
```python
from app.core.config import settings

print(settings.supabase_url)
print(settings.supabase_key)
```

## Security Notes

- **Never commit `.env` files** to version control
- The `.env` file is already listed in `.gitignore` (or should be)
- Use different credentials for development and production
- Rotate keys regularly in production environments
- The `SUPABASE_KEY` should be the "anon/public" key, not the "service_role" key

