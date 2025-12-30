"""
Database Enums
Python enums matching PostgreSQL ENUM types from database migrations
"""

from enum import Enum


class ConstructionPhase(str, Enum):
    """
    Tracks the current construction phase of a building project.
    Matches public.construction_phase PostgreSQL ENUM.
    """
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
    """
    Tracks the processing state of uploaded documents through OCR and embedding pipeline.
    Matches public.processing_state PostgreSQL ENUM.
    """
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class MeasurementUnit(str, Enum):
    """
    User preference for measurement units in the application.
    Matches public.measurement_unit PostgreSQL ENUM.
    """
    METRIC = "METRIC"
    IMPERIAL = "IMPERIAL"

