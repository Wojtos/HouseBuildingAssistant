"""
API Schemas (DTOs and Command Models)

Pydantic models for API request/response validation.
These are derived from database models (app/db/models.py) and implement
the API plan specifications (.ai/api-plan.md).
"""

from app.schemas.common import (
    ErrorDetail,
    ErrorResponse,
    PaginatedResponse,
    PaginationInfo,
    PaginationParams,
    SortOrder,
)
from app.schemas.document import (
    ChunkMetadata,
    DocumentChunkItem,
    DocumentChunkListParams,
    DocumentChunkListResponse,
    DocumentConfirmResponse,
    DocumentCreateRequest,
    DocumentCreateResponse,
    DocumentDeleteResponse,
    DocumentDetailResponse,
    DocumentListItem,
    DocumentListParams,
    DocumentListResponse,
    DocumentSearchRequest,
    DocumentSearchResponse,
    DocumentSearchResult,
)
from app.schemas.health import (
    HealthResponse,
    ServiceStatus,
)
from app.schemas.memory import (
    MemoryAuditItem,
    MemoryAuditListParams,
    MemoryAuditListResponse,
    ProjectMemoryResponse,
    ProjectMemoryUpdateRequest,
)
from app.schemas.message import (
    ChatRequest,
    ChatResponse,
    MessageFeedbackRequest,
    MessageFeedbackResponse,
    MessageItem,
    MessageListParams,
    MessageListResponse,
    RoutingMetadata,
)
from app.schemas.profile import (
    ProfileResponse,
    ProfileUpdateRequest,
)
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectDeleteResponse,
    ProjectDetailResponse,
    ProjectListItem,
    ProjectListParams,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
)
from app.schemas.usage import (
    ProjectUsageResponse,
    UsageApiItem,
    UsageParams,
    UsagePeriodItem,
    UsageResponse,
    UsageSummary,
)

__all__ = [
    # Common
    "ErrorDetail",
    "ErrorResponse",
    "PaginatedResponse",
    "PaginationInfo",
    "PaginationParams",
    "SortOrder",
    # Profile
    "ProfileResponse",
    "ProfileUpdateRequest",
    # Project
    "ProjectCreateRequest",
    "ProjectDeleteResponse",
    "ProjectDetailResponse",
    "ProjectListItem",
    "ProjectListParams",
    "ProjectListResponse",
    "ProjectResponse",
    "ProjectUpdateRequest",
    # Memory
    "MemoryAuditItem",
    "MemoryAuditListParams",
    "MemoryAuditListResponse",
    "ProjectMemoryResponse",
    "ProjectMemoryUpdateRequest",
    # Document
    "ChunkMetadata",
    "DocumentChunkItem",
    "DocumentChunkListParams",
    "DocumentChunkListResponse",
    "DocumentConfirmResponse",
    "DocumentCreateRequest",
    "DocumentCreateResponse",
    "DocumentDeleteResponse",
    "DocumentDetailResponse",
    "DocumentListItem",
    "DocumentListParams",
    "DocumentListResponse",
    "DocumentSearchRequest",
    "DocumentSearchResponse",
    "DocumentSearchResult",
    # Message
    "ChatRequest",
    "ChatResponse",
    "MessageFeedbackRequest",
    "MessageFeedbackResponse",
    "MessageItem",
    "MessageListParams",
    "MessageListResponse",
    "RoutingMetadata",
    # Usage
    "ProjectUsageResponse",
    "UsageApiItem",
    "UsageParams",
    "UsagePeriodItem",
    "UsageResponse",
    "UsageSummary",
    # Health
    "HealthResponse",
    "ServiceStatus",
]
