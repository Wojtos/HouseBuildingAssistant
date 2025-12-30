# Supabase Python/FastAPI Integration Guide

This guide provides a complete, reproducible setup for integrating Supabase with a FastAPI Python backend. It is the Python equivalent of the Astro/TypeScript Supabase integration guide.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [File Structure](#file-structure)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Usage Examples](#usage-examples)
5. [Key Differences from TypeScript](#key-differences-from-typescript)

---

## Prerequisites

Before proceeding, ensure the following are in place:

- ✅ **Python 3.11+** installed
- ✅ **FastAPI** backend with `supabase==2.8.0` in `requirements.txt`
- ✅ **Supabase CLI** installed and running (`supabase start`)
- ✅ **Database migrations** applied (in `/supabase/migrations/`)
- ✅ **Configuration file** exists at `/supabase/config.toml`

**IMPORTANT**: Verify all prerequisites before continuing. If any are missing, resolve them first.

---

## File Structure

The Supabase integration consists of four key files in `backend/app/db/`:

```
backend/app/db/
├── __init__.py       # Exports and FastAPI dependency injection
├── enums.py          # Python enums matching PostgreSQL ENUMs
├── models.py         # Pydantic models (equivalent to database.types.ts)
└── supabase.py       # Supabase client initialization
```

### File Purposes

| File | Purpose | TypeScript Equivalent |
|------|---------|----------------------|
| `enums.py` | Python Enum classes for database ENUMs | Part of `database.types.ts` |
| `models.py` | Pydantic models for type-safe database operations | `database.types.ts` |
| `supabase.py` | Supabase client initialization | `src/db/supabase.client.ts` |
| `__init__.py` | FastAPI dependency + exports | `src/middleware/index.ts` + exports |

---

## Step-by-Step Setup

### Step 1: Create Database Enums (`backend/app/db/enums.py`)

Create Python Enum classes that mirror your PostgreSQL ENUM types:

```python
from enum import Enum

class ConstructionPhase(str, Enum):
    """Matches public.construction_phase PostgreSQL ENUM"""
    LAND_SELECTION = "LAND_SELECTION"
    FEASIBILITY = "FEASIBILITY"
    PERMITTING = "PERMITTING"
    DESIGN = "DESIGN"
    SITE_PREP = "SITE_PREP"
    FOUNDATION = "FOUNDATION"
    SHELL_SYSTEMS = "SHELL_SYSTEMS"
    PROCUREMENT = "PROCUREMENT"
    FINISHES_FURNISHING = "FINISHES_FURNISHING"
    COMPLETED = "COMPLETED"

class ProcessingState(str, Enum):
    """Matches public.processing_state PostgreSQL ENUM"""
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class MeasurementUnit(str, Enum):
    """Matches public.measurement_unit PostgreSQL ENUM"""
    METRIC = "METRIC"
    IMPERIAL = "IMPERIAL"
```

**Key Points:**
- Inherit from both `str` and `Enum` for proper JSON/PostgreSQL serialization
- Values must match database ENUM values exactly
- Add docstrings referencing the PostgreSQL ENUM type

### Step 2: Create Pydantic Models (`backend/app/db/models.py`)

Create Pydantic models for each database table. Use a pattern of Base/Full/Insert/Update models:

```python
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from app.db.enums import ConstructionPhase, MeasurementUnit

# Base model (shared fields)
class ProjectBase(BaseModel):
    name: str
    location: Optional[str] = None
    current_phase: ConstructionPhase = ConstructionPhase.LAND_SELECTION

# Full model (complete database row)
class Project(ProjectBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Insert model (for creating new records)
class ProjectInsert(ProjectBase):
    user_id: UUID

# Update model (for partial updates)
class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    current_phase: Optional[ConstructionPhase] = None
```

**Repeat this pattern** for all database tables: profiles, projects, project_memory, documents, document_chunks, messages, memory_audit_trail, routing_audits, web_search_cache, usage_logs.

### Step 3: Initialize Supabase Client (`backend/app/db/supabase.py`)

Create the Supabase client using environment variables:

```python
from supabase import Client, create_client
from app.core.config import settings

supabase_client: Client = create_client(
    supabase_url=settings.supabase_url,
    supabase_key=settings.supabase_key
)
```

This reads `SUPABASE_URL` and `SUPABASE_KEY` from your environment (via `pydantic-settings`).

### Step 4: Create FastAPI Dependency (`backend/app/db/__init__.py`)

FastAPI uses **dependency injection** instead of middleware. Create a dependency function:

```python
from typing import Generator
from supabase import Client
from app.db.supabase import supabase_client

def get_supabase() -> Generator[Client, None, None]:
    """
    FastAPI dependency for injecting Supabase client into route handlers.
    This is the Python equivalent of Astro's context.locals.supabase
    """
    yield supabase_client
```

**Export everything** for convenient imports:

```python
from app.db.enums import ConstructionPhase, ProcessingState, MeasurementUnit
from app.db.models import Project, ProjectInsert, ProjectUpdate, Message, ...
from app.db.supabase import supabase_client

__all__ = [
    "ConstructionPhase", "ProcessingState", "MeasurementUnit",
    "Project", "ProjectInsert", "ProjectUpdate",
    "supabase_client", "get_supabase",
    ...
]
```

### Step 5: Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Get credentials from: supabase status -o env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=your-anon-key-from-supabase-status

OPENROUTER_API_KEY=your-openrouter-api-key
```

**Getting the anon key:**
```bash
supabase start
supabase status -o env  # Requires CLI 2.48.x+
```

---

## Usage Examples

### Example 1: Query Projects

```python
from fastapi import APIRouter, Depends
from supabase import Client
from app.db import get_supabase, Project

router = APIRouter()

@router.get("/projects", response_model=list[Project])
async def list_projects(supabase: Client = Depends(get_supabase)):
    """Get all projects with type-safe response"""
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
    """Create a new project with validation"""
    response = (
        supabase.table("projects")
        .insert(project.model_dump(mode="json"))
        .execute()
    )
    return response.data[0]
```

### Example 3: Update with Type Safety

```python
from app.db import ProjectUpdate, ConstructionPhase

@router.patch("/projects/{project_id}", response_model=Project)
async def update_project(
    project_id: UUID,
    project: ProjectUpdate,
    supabase: Client = Depends(get_supabase)
):
    """Update only the fields that were provided"""
    update_data = project.model_dump(exclude_unset=True, mode="json")
    
    response = (
        supabase.table("projects")
        .update(update_data)
        .eq("id", str(project_id))
        .execute()
    )
    return response.data[0]
```

### Example 4: Using Enums

```python
from app.db import ConstructionPhase, ProjectUpdate

# Type-safe enum usage
update = ProjectUpdate(current_phase=ConstructionPhase.FOUNDATION)

# Enum values serialize correctly to strings
assert update.current_phase == "FOUNDATION"
assert update.current_phase.value == "FOUNDATION"
```

### Example 5: Vector Search (Advanced)

```python
@router.get("/search")
async def semantic_search(
    query_embedding: list[float],
    project_id: UUID,
    supabase: Client = Depends(get_supabase)
):
    """Semantic search using vector similarity"""
    response = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_threshold": 0.8,
            "match_count": 10,
            "filter_project_id": str(project_id)
        }
    ).execute()
    
    return response.data
```

### Example 6: Complete API Router

See `backend/app/api/projects.py` for a complete example with CRUD operations:
- GET `/api/projects` - List all projects
- GET `/api/projects/{id}` - Get single project
- POST `/api/projects` - Create project
- PATCH `/api/projects/{id}` - Update project
- DELETE `/api/projects/{id}` - Delete project

---

## Key Differences from TypeScript

| Feature | Astro/TypeScript | FastAPI/Python |
|---------|------------------|----------------|
| **Type Generation** | Auto-generated via `supabase gen types typescript` | Manual Pydantic models in `models.py` |
| **Type Definitions** | `database.types.ts` interface file | Pydantic `BaseModel` classes |
| **Client Injection** | Middleware: `context.locals.supabase` | Dependency: `Depends(get_supabase)` |
| **Environment Types** | `env.d.ts` augmentation | `pydantic-settings` in `config.py` |
| **Enums** | TypeScript string unions or enums | Python `Enum` classes inheriting from `str` |
| **Validation** | TypeScript compile-time checks | Pydantic runtime validation |
| **Model Variants** | Separate interfaces (Row, Insert, Update) | Separate Pydantic models (Base, Full, Insert, Update) |

### Why Manual Models?

The Supabase CLI's `supabase gen types` command only supports TypeScript, Go, and Swift. For Python, we manually create Pydantic models that:

1. **Provide runtime validation** (TypeScript only validates at compile time)
2. **Generate JSON schemas** for OpenAPI documentation
3. **Support multiple model variants** (Insert, Update, Full)
4. **Include helpful metadata** (descriptions, examples, constraints)

---

## Additional Resources

- **Full implementation**: All files are created in `backend/app/db/`
- **Example API**: See `backend/app/api/projects.py`
- **Environment setup**: See `backend/ENV_CONFIGURATION.md`
- **Detailed documentation**: See `backend/SUPABASE_SETUP.md`

### Official Documentation

- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)
- [FastAPI Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Pydantic Models](https://docs.pydantic.dev/latest/concepts/models/)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)

---

## Quick Start Checklist

- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Start Supabase: `supabase start`
- [ ] Get credentials: `supabase status -o env`
- [ ] Create `.env` file with `SUPABASE_URL` and `SUPABASE_KEY`
- [ ] Verify setup: Import `from app.db import supabase_client`
- [ ] Test endpoint: `GET http://localhost:8000/api/projects`

---

## Conclusion

You now have a complete Supabase integration for your FastAPI backend, equivalent to the Astro/TypeScript setup. The Python implementation uses:

- **Pydantic models** for type-safe database operations
- **FastAPI dependencies** for client injection
- **Python Enums** matching PostgreSQL ENUMs
- **Environment-based configuration** via `pydantic-settings`

All code follows FastAPI and Pydantic best practices while maintaining feature parity with the TypeScript implementation.

