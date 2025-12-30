# Supabase Python/FastAPI Initialization

This document provides a reproducible guide for integrating Supabase with your FastAPI Python backend.

## Prerequisites

- FastAPI backend with Python 3.11+
- `supabase==2.8.0` package installed (see `requirements.txt`)
- Ensure that `/supabase/config.toml` exists
- Supabase local instance running (`supabase start`)

**IMPORTANT**: Check prerequisites before proceeding. If they're not met, stop and ask the user for the fix.

## File Structure

The Supabase integration is located in `backend/app/db/`:

```
backend/app/db/
├── __init__.py       # Exports and FastAPI dependency injection
├── supabase.py       # Supabase client initialization
├── models.py         # Pydantic models (equivalent to database.types.ts)
└── enums.py          # Python enums matching database ENUMs
```

## Implementation Details

### 1. Database Enums (`backend/app/db/enums.py`)

Python Enum classes matching PostgreSQL ENUM types:

```python
from app.db.enums import ConstructionPhase, ProcessingState, MeasurementUnit
```

- **ConstructionPhase**: 10 phases from LAND_SELECTION to COMPLETED
- **ProcessingState**: UPLOADED, PROCESSING, COMPLETED, FAILED
- **MeasurementUnit**: METRIC, IMPERIAL

### 2. Pydantic Models (`backend/app/db/models.py`)

Type-safe Pydantic models matching the database schema (equivalent to TypeScript `database.types.ts`):

```python
from app.db.models import (
    Profile, Project, ProjectMemory, Document, DocumentChunk,
    Message, MemoryAuditTrail, RoutingAudit, UsageLog
)
```

Each table has multiple model variants:
- **Base models**: For shared fields (e.g., `ProjectBase`)
- **Full models**: Complete database row (e.g., `Project`)
- **Insert models**: For creating new records (e.g., `ProjectInsert`)
- **Update models**: For partial updates (e.g., `ProjectUpdate`)

### 3. Supabase Client (`backend/app/db/supabase.py`)

Initializes the Supabase client using environment variables:

```python
from app.db.supabase import supabase_client

# Use directly in services
response = supabase_client.table("projects").select("*").execute()
```

### 4. FastAPI Dependency Injection (`backend/app/db/__init__.py`)

FastAPI uses dependency injection instead of middleware. Import the `get_supabase` dependency:

```python
from fastapi import Depends
from supabase import Client
from app.db import get_supabase

@app.get("/projects")
async def get_projects(supabase: Client = Depends(get_supabase)):
    """Get all projects for the current user"""
    response = supabase.table("projects").select("*").execute()
    return response.data
```

**All exports are available from the `app.db` module:**

```python
from app.db import (
    # Enums
    ConstructionPhase, ProcessingState, MeasurementUnit,
    # Models
    Project, ProjectInsert, ProjectUpdate,
    Message, MessageInsert,
    # Client and dependency
    supabase_client, get_supabase
)
```

## Environment Configuration

### 1. Get Supabase Credentials

For local development, start Supabase and get credentials:

```bash
# Start Supabase local instance
supabase start

# Get environment variables (requires Supabase CLI 2.48.x+)
supabase status -o env
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cd backend
cp .env.example .env
```

Update the `.env` file with your Supabase credentials:

```env
# Local development (from supabase status -o env)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Production (from Supabase dashboard)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-production-anon-key
```

### 3. Verify Configuration

The configuration is loaded via `pydantic-settings` in `app/core/config.py`:

```python
from app.core.config import settings

print(settings.supabase_url)  # Should print your Supabase URL
print(settings.supabase_key)  # Should print your anon key
```

## Usage Examples

### Example 1: Query Projects

```python
from fastapi import APIRouter, Depends
from supabase import Client
from app.db import get_supabase, Project

router = APIRouter()

@router.get("/projects", response_model=list[Project])
async def list_projects(supabase: Client = Depends(get_supabase)):
    """Get all projects"""
    response = supabase.table("projects").select("*").execute()
    return response.data
```

### Example 2: Create a Project

```python
from app.db import ProjectInsert

@router.post("/projects", response_model=Project)
async def create_project(
    project: ProjectInsert,
    supabase: Client = Depends(get_supabase)
):
    """Create a new project"""
    response = (
        supabase.table("projects")
        .insert(project.model_dump())
        .execute()
    )
    return response.data[0]
```

### Example 3: Vector Search on Document Chunks

```python
@router.get("/search")
async def semantic_search(
    query_embedding: list[float],
    project_id: str,
    supabase: Client = Depends(get_supabase)
):
    """Semantic search using vector similarity"""
    response = (
        supabase.rpc(
            "match_document_chunks",
            {
                "query_embedding": query_embedding,
                "match_threshold": 0.8,
                "match_count": 10,
                "filter_project_id": project_id
            }
        )
        .execute()
    )
    return response.data
```

### Example 4: Using Models for Type Safety

```python
from app.db import Message, MessageInsert, ConstructionPhase

# Type-safe message creation
new_message = MessageInsert(
    project_id="123e4567-e89b-12d3-a456-426614174000",
    user_id="123e4567-e89b-12d3-a456-426614174001",
    role="user",
    content="What's the current phase?"
)

# Validate with Pydantic
message_dict = new_message.model_dump()

# Use enums for type safety
from app.db import ProjectUpdate, ConstructionPhase

update = ProjectUpdate(current_phase=ConstructionPhase.FOUNDATION)
```

## Key Differences from TypeScript Setup

| Astro/TypeScript | FastAPI/Python |
|------------------|----------------|
| `database.types.ts` (auto-generated) | `models.py` (manual Pydantic models) |
| Middleware (`src/middleware/index.ts`) | Dependency injection (`get_supabase`) |
| `context.locals.supabase` | `Depends(get_supabase)` |
| `env.d.ts` for type augmentation | Pydantic models provide type safety |
| TypeScript interfaces | Pydantic BaseModel classes |

## Notes

- **Type Generation**: Supabase CLI does not support Python type generation. The Pydantic models in `models.py` are manually created based on the database schema but provide equivalent type safety.
- **Enums**: Python Enums inherit from both `str` and `Enum` to ensure proper serialization to/from JSON and PostgreSQL.
- **Dependency Injection**: FastAPI's dependency injection system (`Depends`) is more powerful than Astro's middleware, allowing for better testing and composition.
- **RLS Policies**: Row Level Security policies are defined in the database migrations (`20251222100400_enable_rls_policies.sql`). The Python client uses the anon key, so RLS policies apply automatically.

## Related Documentation

- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)
- [FastAPI Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Pydantic Models](https://docs.pydantic.dev/latest/concepts/models/)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)

