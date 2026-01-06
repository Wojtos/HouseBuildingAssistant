"""
Document API Endpoints

Implements endpoints for document management and semantic search (Section 2.4 of API plan):
- GET /api/projects/{project_id}/documents - List documents
- POST /api/projects/{project_id}/documents - Create document and get presigned upload URL
- POST /api/projects/{project_id}/documents/{document_id}/confirm - Confirm upload
- GET /api/projects/{project_id}/documents/{document_id} - Get document details
- DELETE /api/projects/{project_id}/documents/{document_id} - Soft delete document
- GET /api/projects/{project_id}/documents/{document_id}/chunks - Get document chunks
- POST /api/projects/{project_id}/documents/search - Semantic search (uses existing retrieval service)
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import get_current_user, verify_project_ownership
from app.db.models import Project
from app.schemas.common import PaginationInfo
from app.schemas.document import (
    DocumentListParams,
    DocumentListResponse,
    DocumentCreateRequest,
    DocumentCreateResponse,
    DocumentConfirmResponse,
    DocumentDetailResponse,
    DocumentDeleteResponse,
    DocumentChunkListParams,
    DocumentChunkListResponse,
    DocumentSearchRequest,
    DocumentSearchResponse,
    DocumentProcessingState,
)
from app.services.document_service import DocumentService, get_document_service
from app.services.document_retrieval_service import (
    DocumentRetrievalService,
    get_document_retrieval_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List documents",
    description="Retrieve paginated list of documents for a project with optional filters",
)
async def list_documents(
    project_id: UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    processing_state: DocumentProcessingState = Query(default=None),
    file_type: str = Query(default=None),
    include_deleted: bool = Query(default=False),
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    document_service: DocumentService = Depends(get_document_service),
):
    """
    List documents for a project.

    Returns paginated list with:
    - Document metadata (name, type, state)
    - Processing status
    - Chunk count
    - Creation/deletion timestamps

    Supports filtering by:
    - Processing state (UPLOADED, PROCESSING, COMPLETED, FAILED)
    - File type (MIME type)
    - Soft-deleted documents (excluded by default)

    Requires authentication and project ownership.

    Raises:
        401: If authentication token is missing or invalid
        403: If user doesn't own the project
        404: If project not found
        500: If database error occurs
    """
    try:
        documents, total_count = await document_service.list_documents(
            project_id=project_id,
            page=page,
            limit=limit,
            processing_state=processing_state,
            file_type=file_type,
            include_deleted=include_deleted,
        )

        total_pages = (total_count + limit - 1) // limit

        return DocumentListResponse(
            data=documents,
            pagination=PaginationInfo(
                page=page,
                limit=limit,
                total_items=total_count,
                total_pages=total_pages,
            ),
        )

    except Exception as e:
        logger.error(
            f"Error listing documents for project {project_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.post(
    "",
    response_model=DocumentCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create document record",
    description="Create document metadata and get presigned upload URL",
)
async def create_document(
    project_id: UUID,
    request: DocumentCreateRequest,
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    document_service: DocumentService = Depends(get_document_service),
):
    """
    Create document record and get presigned upload URL.

    Workflow:
    1. Creates document metadata record
    2. Generates presigned URL for direct upload to Supabase Storage
    3. Returns URL valid for 15 minutes
    4. Client uploads file directly to returned URL
    5. Client calls confirm endpoint after upload

    Validation:
    - File size: max 10MB
    - File types: PDF, PNG, JPEG, TIFF, TXT

    Requires authentication and project ownership.

    Raises:
        401: If authentication token is missing or invalid
        403: If user doesn't own the project
        404: If project not found
        413: If file size exceeds 10MB
        422: If file type is unsupported
        500: If database or storage error occurs
    """
    try:
        # File size validation (already done by Pydantic, but double-check)
        if request.file_size > 10485760:  # 10MB
            raise HTTPException(
                status_code=413,
                detail="File size exceeds 10MB limit"
            )

        document_response = await document_service.create_document(
            project_id=project_id,
            name=request.name,
            file_type=request.file_type,
            file_size=request.file_size,
        )

        return document_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error creating document for project {project_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.post(
    "/{document_id}/confirm",
    response_model=DocumentConfirmResponse,
    summary="Confirm document upload",
    description="Verify file upload and trigger processing pipeline",
)
async def confirm_document_upload(
    project_id: UUID,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    document_service: DocumentService = Depends(get_document_service),
):
    """
    Confirm document upload after file is uploaded to storage.

    Workflow:
    1. Verifies file exists in Supabase Storage
    2. Updates processing state to UPLOADED
    3. TODO: Triggers async OCR/chunking/embedding pipeline

    Call this endpoint after successfully uploading file to presigned URL.

    Requires authentication and project ownership.

    Raises:
        400: If file not found in storage
        401: If authentication token is missing or invalid
        403: If user doesn't own the project
        404: If project or document not found
        500: If database error occurs
    """
    try:
        confirm_response = await document_service.confirm_upload(
            document_id=document_id,
            project_id=project_id,
        )

        return confirm_response

    except Exception as e:
        if "not found in storage" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail="File not found in storage. Please upload the file first."
            )

        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )

        logger.error(
            f"Error confirming upload for document {document_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Get document details",
    description="Retrieve detailed information about a specific document",
)
async def get_document(
    project_id: UUID,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    document_service: DocumentService = Depends(get_document_service),
):
    """
    Get document details.

    Returns:
    - Document metadata
    - Processing state and error messages
    - Chunk count
    - Timestamps

    Requires authentication and project ownership.

    Raises:
        401: If authentication token is missing or invalid
        403: If user doesn't own the project
        404: If project or document not found
        500: If database error occurs
    """
    try:
        document = await document_service.get_document(
            document_id=document_id,
            project_id=project_id,
        )

        return document

    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )

        logger.error(
            f"Error getting document {document_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.delete(
    "/{document_id}",
    response_model=DocumentDeleteResponse,
    summary="Delete document",
    description="Soft delete a document (sets deleted_at timestamp)",
)
async def delete_document(
    project_id: UUID,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    document_service: DocumentService = Depends(get_document_service),
):
    """
    Soft delete a document.

    Sets deleted_at timestamp. Document and its chunks are excluded from:
    - List queries (unless include_deleted=true)
    - Search queries

    The file remains in storage but metadata is marked as deleted.

    Requires authentication and project ownership.

    Raises:
        401: If authentication token is missing or invalid
        403: If user doesn't own the project
        404: If project, document not found, or already deleted
        500: If database error occurs
    """
    try:
        delete_response = await document_service.delete_document(
            document_id=document_id,
            project_id=project_id,
        )

        return delete_response

    except Exception as e:
        if "not found" in str(e).lower() or "already deleted" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Document not found or already deleted"
            )

        logger.error(
            f"Error deleting document {document_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.get(
    "/{document_id}/chunks",
    response_model=DocumentChunkListResponse,
    summary="Get document chunks",
    description="Retrieve paginated text chunks extracted from a document",
)
async def get_document_chunks(
    project_id: UUID,
    document_id: UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    document_service: DocumentService = Depends(get_document_service),
):
    """
    Get text chunks for a document.

    Returns paginated list of chunks with:
    - Extracted text content
    - Chunk index (position in document)
    - Metadata (page numbers, categories, etc.)

    Embeddings are excluded from response for performance.

    Requires authentication and project ownership.

    Raises:
        401: If authentication token is missing or invalid
        403: If user doesn't own the project
        404: If project or document not found
        500: If database error occurs
    """
    try:
        chunks, total_count = await document_service.get_chunks(
            document_id=document_id,
            project_id=project_id,
            page=page,
            limit=limit,
        )

        total_pages = (total_count + limit - 1) // limit

        return DocumentChunkListResponse(
            data=chunks,
            pagination=PaginationInfo(
                page=page,
                limit=limit,
                total_items=total_count,
                total_pages=total_pages,
            ),
        )

    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )

        logger.error(
            f"Error getting chunks for document {document_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


@router.post(
    "/search",
    response_model=DocumentSearchResponse,
    summary="Search documents",
    description="Semantic search across all document chunks in a project",
)
async def search_documents(
    project_id: UUID,
    request: DocumentSearchRequest,
    user_id: UUID = Depends(get_current_user),
    project: Project = Depends(verify_project_ownership),
    retrieval_service: DocumentRetrievalService = Depends(get_document_retrieval_service),
):
    """
    Perform semantic search across document chunks.

    Uses vector similarity search to find relevant text chunks based on query.

    Search parameters:
    - query: Natural language search query
    - limit: Max results (1-20, default 5)
    - threshold: Min similarity score (0-1, default 0.7)

    Returns chunks ordered by similarity score with:
    - Matching text content
    - Document name and ID
    - Similarity score
    - Chunk metadata

    Requires authentication and project ownership.

    Raises:
        401: If authentication token is missing or invalid
        403: If user doesn't own the project
        404: If project not found
        500: If search or embedding service fails
    """
    try:
        # Use existing DocumentRetrievalService for vector search
        search_results = await retrieval_service.search_documents(
            project_id=project_id,
            query=request.query,
            top_k=request.limit,
            similarity_threshold=request.threshold,
        )

        return DocumentSearchResponse(
            results=search_results,
            query=request.query,
            total_results=len(search_results),
        )

    except Exception as e:
        logger.error(
            f"Error searching documents for project {project_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Search service temporarily unavailable"
        )
