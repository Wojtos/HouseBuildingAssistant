"""
Profile API Schemas

DTOs and Command Models for profile endpoints (Section 2.1 of API plan).
Derived from: Profile, ProfileBase models in app/db/models.py
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.enums import MeasurementUnit


# =============================================================================
# RESPONSE DTOs
# =============================================================================

class ProfileResponse(BaseModel):
    """
    Profile response DTO.
    
    GET /api/profiles/me response
    Derived from: Profile model in app/db/models.py
    """
    id: UUID = Field(description="User's unique identifier (matches Supabase Auth uid)")
    full_name: Optional[str] = Field(
        default=None, description="User's display name"
    )
    preferred_units: MeasurementUnit = Field(
        description="Preferred measurement unit system"
    )
    language: str = Field(description="Preferred language (ISO 639-1 code)")
    created_at: datetime = Field(description="Profile creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

    class Config:
        from_attributes = True


# =============================================================================
# REQUEST COMMAND MODELS
# =============================================================================

class ProfileUpdateRequest(BaseModel):
    """
    Profile update command model.
    
    PUT /api/profiles/me request
    Derived from: ProfileBase model (all fields optional for partial updates)
    
    Validation:
    - preferred_units must be METRIC or IMPERIAL
    - language must be a valid 2-character ISO 639-1 code
    """
    full_name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="User's display name",
    )
    preferred_units: Optional[MeasurementUnit] = Field(
        default=None,
        description="Preferred measurement unit system",
    )
    language: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=2,
        pattern=r"^[a-z]{2}$",
        description="Preferred language (ISO 639-1 code, e.g., 'en', 'pl', 'de')",
    )

