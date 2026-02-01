"""
Document API Schemas

DTOs and Command Models for document endpoints (Section 2.4 of API plan).
Derived from: Document, DocumentBase, DocumentInsert, DocumentUpdate,
              DocumentChunk, DocumentChunkBase models in app/db/models.py
"""

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.db.enums import ProcessingState
from app.schemas.common import PaginationInfo, PaginationParams

# =============================================================================
# CONSTANTS
# =============================================================================

# Maximum file size for document uploads (10MB)
MAX_FILE_SIZE_BYTES = 10485760

# Supported file types for document upload
SUPPORTED_FILE_TYPES = frozenset(
    [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/tiff",
        "text/plain",
    ]
)


# =============================================================================
# TYPE ALIASES
# =============================================================================

# Flexible structure for chunk metadata (page numbers, categories, etc.)
ChunkMetadata = dict[str, Any]


# =============================================================================
# EXTENDED ENUMS
# =============================================================================


class DocumentProcessingState(str, Enum):
    """
    Extended processing state that includes PENDING_UPLOAD.

    The API uses this state before upload is confirmed,
    but it's not stored in the database enum.
    """

    PENDING_UPLOAD = "PENDING_UPLOAD"
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# =============================================================================
# QUERY PARAMETERS
# =============================================================================


class DocumentListParams(PaginationParams):
    """
    Document list query parameters.

    GET /api/projects/{project_id}/documents query params
    Extends common pagination with document-specific filters.
    """

    processing_state: Optional[DocumentProcessingState] = Field(
        default=None,
        description="Filter by processing state",
    )
    file_type: Optional[str] = Field(
        default=None,
        description="Filter by file type (MIME type)",
    )
    include_deleted: bool = Field(
        default=False,
        description="Include soft-deleted documents",
    )


class DocumentChunkListParams(PaginationParams):
    """
    Document chunk list query parameters.

    GET /api/projects/{project_id}/documents/{document_id}/chunks query params
    Uses standard pagination parameters.
    """

    pass


# =============================================================================
# RESPONSE DTOs
# =============================================================================


class DocumentListItem(BaseModel):
    """
    Document list item DTO.

    Individual document in GET /api/projects/{project_id}/documents response.
    Derived from: Document model + computed chunk_count
    """

    id: UUID = Field(description="Document unique identifier")
    project_id: UUID = Field(description="Associated project ID")
    name: str = Field(description="Document file name")
    file_type: Optional[str] = Field(default=None, description="MIME type of the file")
    processing_state: DocumentProcessingState = Field(description="Current processing state")
    error_message: Optional[str] = Field(
        default=None, description="Error message if processing failed"
    )
    chunk_count: int = Field(description="Number of extracted text chunks")
    created_at: datetime = Field(description="Upload timestamp")
    deleted_at: Optional[datetime] = Field(
        default=None, description="Soft delete timestamp (null if active)"
    )

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """
    Paginated document list response.

    GET /api/projects/{project_id}/documents response
    """

    data: list[DocumentListItem] = Field(description="List of documents")
    pagination: PaginationInfo = Field(description="Pagination metadata")


class DocumentCreateResponse(BaseModel):
    """
    Document create response DTO.

    POST /api/projects/{project_id}/documents response
    Includes presigned upload URL for direct upload to storage.

    Notes:
    - The upload_url is a presigned URL for direct upload to Supabase Storage
    - URL expires after 15 minutes
    - Frontend should upload file directly to this URL, then call confirm endpoint
    """

    id: UUID = Field(description="Document unique identifier")
    project_id: UUID = Field(description="Associated project ID")
    name: str = Field(description="Document file name")
    file_type: str = Field(description="MIME type of the file")
    processing_state: Literal["PENDING_UPLOAD"] = Field(
        default="PENDING_UPLOAD",
        description="Initial state before upload",
    )
    upload_url: str = Field(description="Presigned URL for direct upload to storage")
    upload_url_expires_at: datetime = Field(description="Expiration timestamp for the upload URL")
    created_at: datetime = Field(description="Record creation timestamp")


class DocumentConfirmResponse(BaseModel):
    """
    Document upload confirm response DTO.

    POST /api/projects/{project_id}/documents/{document_id}/confirm response
    Derived from: Document model (subset of fields)
    """

    id: UUID = Field(description="Document unique identifier")
    project_id: UUID = Field(description="Associated project ID")
    name: str = Field(description="Document file name")
    file_type: str = Field(description="MIME type of the file")
    processing_state: Literal["UPLOADED"] = Field(
        default="UPLOADED",
        description="State after upload is confirmed",
    )
    created_at: datetime = Field(description="Record creation timestamp")

    class Config:
        from_attributes = True


class DocumentDetailResponse(BaseModel):
    """
    Document detail response DTO.

    GET /api/projects/{project_id}/documents/{document_id} response
    Derived from: Document model + computed chunk_count
    """

    id: UUID = Field(description="Document unique identifier")
    project_id: UUID = Field(description="Associated project ID")
    name: str = Field(description="Document file name")
    file_type: Optional[str] = Field(default=None, description="MIME type of the file")
    processing_state: DocumentProcessingState = Field(description="Current processing state")
    error_message: Optional[str] = Field(
        default=None, description="Error message if processing failed"
    )
    chunk_count: int = Field(description="Number of extracted text chunks")
    created_at: datetime = Field(description="Upload timestamp")

    class Config:
        from_attributes = True


class DocumentDeleteResponse(BaseModel):
    """
    Document delete response DTO.

    DELETE /api/projects/{project_id}/documents/{document_id} response
    Confirms soft delete with timestamp.

    Side Effects:
    - Sets deleted_at timestamp on the document
    - Associated document_chunks are excluded from search queries
    - Soft deleted documents are excluded from list queries by default
    """

    id: UUID = Field(description="Deleted document's ID")
    deleted_at: datetime = Field(description="Deletion timestamp")


class DocumentChunkItem(BaseModel):
    """
    Document chunk item DTO.

    Individual chunk in GET chunks response.
    Derived from: DocumentChunk model (excludes embedding for API response)
    """

    id: UUID = Field(description="Chunk unique identifier")
    document_id: UUID = Field(description="Parent document ID")
    content: str = Field(description="Extracted text content")
    chunk_index: int = Field(description="Position in document (0-indexed)")
    metadata: ChunkMetadata = Field(
        default_factory=dict,
        description="Additional metadata (page number, category, etc.)",
    )
    created_at: datetime = Field(description="Extraction timestamp")

    class Config:
        from_attributes = True


class DocumentChunkListResponse(BaseModel):
    """
    Paginated document chunk list response.

    GET /api/projects/{project_id}/documents/{document_id}/chunks response
    """

    data: list[DocumentChunkItem] = Field(description="List of chunks")
    pagination: PaginationInfo = Field(description="Pagination metadata")


class DocumentSearchResult(BaseModel):
    """
    Document search result item DTO.

    Individual result in semantic search response.
    Includes similarity score and document context.
    """

    chunk_id: UUID = Field(description="Matching chunk's ID")
    document_id: UUID = Field(description="Parent document's ID")
    document_name: str = Field(description="Parent document's name")
    content: str = Field(description="Matching text content")
    chunk_index: int = Field(description="Position in document (0-indexed)")
    similarity_score: float = Field(ge=0.0, le=1.0, description="Cosine similarity score (0-1)")
    metadata: ChunkMetadata = Field(
        default_factory=dict,
        description="Chunk metadata (page number, etc.)",
    )


class DocumentSearchResponse(BaseModel):
    """
    Document search response DTO.

    POST /api/projects/{project_id}/documents/search response
    """

    results: list[DocumentSearchResult] = Field(description="Search results ordered by similarity")
    query: str = Field(description="Original search query")
    total_results: int = Field(description="Number of results returned")


# =============================================================================
# REQUEST COMMAND MODELS
# =============================================================================


class DocumentCreateRequest(BaseModel):
    """
    Document create command model.

    POST /api/projects/{project_id}/documents request
    Used to create document record and request presigned upload URL.

    Validation:
    - name is required, max 255 characters
    - file_type must be one of supported types
    - file_size is required, max 10MB (10485760 bytes)
    """

    name: str = Field(
        min_length=1,
        max_length=255,
        description="Document file name",
    )
    file_type: str = Field(
        description="MIME type of the file",
    )
    file_size: int = Field(
        gt=0,
        le=MAX_FILE_SIZE_BYTES,
        description=f"File size in bytes (max {MAX_FILE_SIZE_BYTES})",
    )

    @field_validator("file_type")
    @classmethod
    def validate_file_type(cls, v: str) -> str:
        """Validate that file type is supported."""
        if v not in SUPPORTED_FILE_TYPES:
            supported = ", ".join(sorted(SUPPORTED_FILE_TYPES))
            raise ValueError(f"Unsupported file type '{v}'. Supported types: {supported}")
        return v


class DocumentSearchRequest(BaseModel):
    """
    Document semantic search command model.

    POST /api/projects/{project_id}/documents/search request

    Validation:
    - query is required
    - limit must be between 1 and 20 (default: 5)
    - threshold must be between 0 and 1 (default: 0.7)
    """

    query: str = Field(
        min_length=1,
        description="Search query for semantic matching",
    )
    limit: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum number of results to return",
    )
    threshold: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Minimum similarity threshold (0-1)",
    )
