"""
Common API Schemas

Shared types used across multiple endpoints including pagination,
error responses, and generic wrappers.
"""

from datetime import datetime
from enum import Enum
from typing import Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, Field


# =============================================================================
# TYPE VARIABLES
# =============================================================================

T = TypeVar("T")


# =============================================================================
# ENUMS
# =============================================================================

class SortOrder(str, Enum):
    """Sort order for list queries"""
    ASC = "asc"
    DESC = "desc"


class ErrorCode(str, Enum):
    """Standard API error codes"""
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    RATE_LIMITED = "RATE_LIMITED"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


# =============================================================================
# PAGINATION
# =============================================================================

class PaginationParams(BaseModel):
    """
    Common pagination query parameters for list endpoints.
    
    Used as query parameter dependencies in FastAPI endpoints.
    """
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    limit: int = Field(
        default=20, ge=1, le=100, description="Items per page (max 100)"
    )


class PaginationInfo(BaseModel):
    """
    Pagination metadata included in list responses.
    
    Provides information about current page position and total available items.
    """
    page: int = Field(description="Current page number")
    limit: int = Field(description="Items per page")
    total_items: int = Field(description="Total number of items across all pages")
    total_pages: int = Field(description="Total number of pages")


# =============================================================================
# PAGINATED RESPONSE
# =============================================================================

class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic paginated response wrapper.
    
    Used to wrap list responses with pagination metadata.
    
    Type Parameters:
        T: The type of items in the data list
    """
    data: list[T] = Field(description="List of items for the current page")
    pagination: PaginationInfo = Field(description="Pagination metadata")


# =============================================================================
# ERROR RESPONSES
# =============================================================================

class ErrorDetail(BaseModel):
    """
    Additional error details for debugging.
    
    Optional structured information about validation errors or other issues.
    """
    field: Optional[str] = Field(
        default=None, description="Field that caused the error"
    )
    reason: Optional[str] = Field(
        default=None, description="Detailed reason for the error"
    )


class ErrorBody(BaseModel):
    """
    Error body structure.
    
    Contains the error code, human-readable message, and optional details.
    """
    code: ErrorCode = Field(description="Machine-readable error code")
    message: str = Field(description="Human-readable error message")
    details: Optional[ErrorDetail] = Field(
        default=None, description="Additional error details"
    )


class ErrorResponse(BaseModel):
    """
    Standard error response format.
    
    All API error responses follow this structure for consistent
    error handling on the client side.
    
    Example:
        {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid field value",
                "details": {
                    "field": "email",
                    "reason": "Must be a valid email address"
                }
            }
        }
    """
    error: ErrorBody = Field(description="Error information")

    @classmethod
    def create(
        cls,
        code: ErrorCode,
        message: str,
        field: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> "ErrorResponse":
        """
        Factory method to create an error response.
        
        Args:
            code: The error code
            message: Human-readable error message
            field: Optional field name that caused the error
            reason: Optional detailed reason for the error
            
        Returns:
            ErrorResponse instance
        """
        details = None
        if field or reason:
            details = ErrorDetail(field=field, reason=reason)
        return cls(error=ErrorBody(code=code, message=message, details=details))

