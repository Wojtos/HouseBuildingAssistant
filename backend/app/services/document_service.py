"""
Document Service Layer

Handles business logic for document operations including:
- Listing documents with pagination and filters
- Creating document records and generating presigned upload URLs
- Confirming uploads and triggering OCR pipeline
- Retrieving document details
- Soft deleting documents
- Retrieving document chunks
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from uuid import UUID

from fastapi import Depends
from supabase import Client

from app.db import Document, DocumentChunk, DocumentInsert, DocumentUpdate, get_supabase
from app.schemas.document import (
    DocumentChunkItem,
    DocumentConfirmResponse,
    DocumentCreateResponse,
    DocumentDeleteResponse,
    DocumentDetailResponse,
    DocumentListItem,
    DocumentProcessingState,
)

logger = logging.getLogger(__name__)

# Supabase Storage configuration
STORAGE_BUCKET = "documents"
PRESIGNED_URL_EXPIRY_MINUTES = 15


class DocumentService:
    """Service for managing documents and their metadata."""

    def __init__(self, supabase: Client):
        """
        Initialize document service.

        Args:
            supabase: Supabase client instance for database and storage operations
        """
        self.supabase = supabase

    async def list_documents(
        self,
        project_id: UUID,
        page: int,
        limit: int,
        processing_state: Optional[DocumentProcessingState] = None,
        file_type: Optional[str] = None,
        include_deleted: bool = False,
    ) -> Tuple[List[DocumentListItem], int]:
        """
        Retrieve paginated documents for a project.

        Args:
            project_id: Project identifier
            page: Page number (1-indexed)
            limit: Items per page
            processing_state: Optional filter by processing state
            file_type: Optional filter by MIME type
            include_deleted: Whether to include soft-deleted documents

        Returns:
            Tuple of (list of DocumentListItem DTOs, total count)

        Raises:
            Exception: If database query fails
        """
        try:
            offset = (page - 1) * limit

            # Build base query
            query = (
                self.supabase.table("documents")
                .select("*, document_chunks(count)", count="exact")
                .eq("project_id", str(project_id))
            )

            # Apply filters
            if not include_deleted:
                query = query.is_("deleted_at", "null")

            if processing_state:
                # Map extended state to database enum
                if processing_state == DocumentProcessingState.PENDING_UPLOAD:
                    # This state doesn't exist in DB, skip this filter
                    pass
                else:
                    query = query.eq("processing_state", processing_state.value)

            if file_type:
                query = query.eq("file_type", file_type)

            # Apply ordering and pagination
            query = query.order("created_at", desc=True).range(offset, offset + limit - 1)

            # Execute query
            response = query.execute()

            documents_data = response.data
            total_count = response.count if response.count is not None else 0

            # Transform to DTOs
            documents = [
                DocumentListItem(
                    id=doc["id"],
                    project_id=doc["project_id"],
                    name=doc["name"],
                    file_type=doc.get("file_type"),
                    processing_state=DocumentProcessingState(doc["processing_state"]),
                    error_message=doc.get("error_message"),
                    chunk_count=(
                        doc.get("document_chunks", [{}])[0].get("count", 0)
                        if doc.get("document_chunks")
                        else 0
                    ),
                    created_at=datetime.fromisoformat(doc["created_at"].replace("Z", "+00:00")),
                    deleted_at=(
                        datetime.fromisoformat(doc["deleted_at"].replace("Z", "+00:00"))
                        if doc.get("deleted_at")
                        else None
                    ),
                )
                for doc in documents_data
            ]

            logger.info(
                f"Listed {len(documents)} documents for project {project_id} "
                f"(page {page}, total {total_count})"
            )

            return documents, total_count

        except Exception as e:
            logger.error(f"Error listing documents for project {project_id}: {e}", exc_info=True)
            raise

    async def create_document(
        self,
        project_id: UUID,
        name: str,
        file_type: str,
        file_size: int,
    ) -> DocumentCreateResponse:
        """
        Create document record and generate presigned upload URL.

        Args:
            project_id: Project identifier
            name: Document filename
            file_type: MIME type
            file_size: File size in bytes

        Returns:
            DocumentCreateResponse with presigned upload URL

        Raises:
            Exception: If record creation or URL generation fails
        """
        try:
            # Generate storage path with sanitized filename
            # Remove/replace special characters to avoid URL encoding issues with signed URLs
            import re
            import unicodedata

            # Normalize unicode and remove diacritics
            sanitized_name = (
                unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
            )
            # Replace spaces with underscores and remove other non-alphanumeric chars except dots and underscores
            sanitized_name = re.sub(r"[^\w\-_\.]", "_", sanitized_name)
            # Remove consecutive underscores
            sanitized_name = re.sub(r"_+", "_", sanitized_name).strip("_")
            # Ensure we have a valid filename
            if not sanitized_name:
                sanitized_name = "document"

            timestamp = datetime.utcnow().isoformat().replace(":", "-")
            storage_path = f"{project_id}/{timestamp}_{sanitized_name}"

            # Create document record with UPLOADED state
            # (In the plan, PENDING_UPLOAD is API-only state)
            document_data = DocumentInsert(
                project_id=project_id,
                name=name,
                storage_path=storage_path,
                file_type=file_type,
                processing_state="UPLOADED",  # Will be set to UPLOADED after confirmation
            )

            response = (
                self.supabase.table("documents")
                .insert(document_data.model_dump(mode="json"))
                .execute()
            )

            if not response.data:
                raise Exception("Failed to create document record")

            created_doc = response.data[0]

            # Generate presigned upload URL
            expiry_seconds = PRESIGNED_URL_EXPIRY_MINUTES * 60

            # Create presigned URL for upload
            presigned_response = self.supabase.storage.from_(
                STORAGE_BUCKET
            ).create_signed_upload_url(storage_path)

            # Handle different response types from the SDK
            if hasattr(presigned_response, "signed_url"):
                # SDK returns object with signed_url attribute
                upload_url = presigned_response.signed_url
            elif isinstance(presigned_response, dict):
                # SDK returns dict (older versions)
                upload_url = (
                    presigned_response.get("signedURL")
                    or presigned_response.get("signed_url")
                    or presigned_response.get("signedUrl")
                )
            else:
                upload_url = str(presigned_response)

            # Replace Docker internal hostname with localhost for browser access
            if upload_url:
                if "host.docker.internal" in upload_url:
                    upload_url = upload_url.replace("host.docker.internal", "localhost")
                # Fix double slash in path (e.g., /v1//object/ -> /v1/object/)
                upload_url = upload_url.replace("/v1//object/", "/v1/object/")

            expires_at = datetime.utcnow() + timedelta(minutes=PRESIGNED_URL_EXPIRY_MINUTES)

            logger.info(
                f"Created document {created_doc['id']} for project {project_id} "
                f"with presigned URL (expires in {PRESIGNED_URL_EXPIRY_MINUTES} min)"
            )

            return DocumentCreateResponse(
                id=created_doc["id"],
                project_id=created_doc["project_id"],
                name=created_doc["name"],
                file_type=created_doc["file_type"],
                processing_state="PENDING_UPLOAD",
                upload_url=upload_url,
                upload_url_expires_at=expires_at,
                created_at=datetime.fromisoformat(created_doc["created_at"].replace("Z", "+00:00")),
            )

        except Exception as e:
            logger.error(f"Error creating document for project {project_id}: {e}", exc_info=True)
            raise

    async def confirm_upload(
        self,
        document_id: UUID,
        project_id: UUID,
    ) -> DocumentConfirmResponse:
        """
        Confirm document upload and set state to UPLOADED.

        TODO: Trigger async OCR/chunking/embedding pipeline.

        Args:
            document_id: Document identifier
            project_id: Project identifier (for verification)

        Returns:
            DocumentConfirmResponse with updated state

        Raises:
            Exception: If document not found or file doesn't exist in storage
        """
        try:
            # Get document record
            response = (
                self.supabase.table("documents")
                .select("*")
                .eq("id", str(document_id))
                .eq("project_id", str(project_id))
                .execute()
            )

            if not response.data:
                raise Exception(f"Document {document_id} not found")

            doc = response.data[0]
            storage_path = doc["storage_path"]

            # Verify file exists in storage
            # list() expects a directory path, so we need to split the storage_path
            try:
                import os

                dir_path = os.path.dirname(storage_path)
                file_name = os.path.basename(storage_path)

                file_list = self.supabase.storage.from_(STORAGE_BUCKET).list(path=dir_path)

                # Check if the file exists in the listing
                file_exists = (
                    any(f.get("name") == file_name for f in file_list) if file_list else False
                )

                if not file_exists:
                    logger.warning(
                        f"File not found. Looking for '{file_name}' in '{dir_path}'. Found: {[f.get('name') for f in (file_list or [])]}"
                    )
                    raise Exception(f"File not found in storage: {storage_path}")
            except Exception as e:
                if "File not found in storage" in str(e):
                    raise
                logger.error(f"Storage verification failed: {e}")
                raise Exception("File not found in storage. Please upload the file first.")

            # Update state to UPLOADED
            update_response = (
                self.supabase.table("documents")
                .update({"processing_state": "UPLOADED"})
                .eq("id", str(document_id))
                .execute()
            )

            if not update_response.data:
                raise Exception("Failed to update document state")

            updated_doc = update_response.data[0]

            # TODO: Trigger async OCR/chunking/embedding pipeline
            # This could be done via:
            # - FastAPI BackgroundTasks
            # - Message queue (Celery, Redis, etc.)
            # - Webhook to external service
            logger.info(f"Document {document_id} confirmed - TODO: trigger OCR pipeline")

            return DocumentConfirmResponse(
                id=updated_doc["id"],
                project_id=updated_doc["project_id"],
                name=updated_doc["name"],
                file_type=updated_doc["file_type"],
                processing_state="UPLOADED",
                created_at=datetime.fromisoformat(updated_doc["created_at"].replace("Z", "+00:00")),
            )

        except Exception as e:
            logger.error(f"Error confirming upload for document {document_id}: {e}", exc_info=True)
            raise

    async def get_document(
        self,
        document_id: UUID,
        project_id: UUID,
    ) -> DocumentDetailResponse:
        """
        Get document details by ID.

        Args:
            document_id: Document identifier
            project_id: Project identifier (for verification)

        Returns:
            DocumentDetailResponse with document details

        Raises:
            Exception: If document not found
        """
        try:
            response = (
                self.supabase.table("documents")
                .select("*, document_chunks(count)")
                .eq("id", str(document_id))
                .eq("project_id", str(project_id))
                .is_("deleted_at", "null")
                .execute()
            )

            if not response.data:
                raise Exception(f"Document {document_id} not found")

            doc = response.data[0]

            logger.info(f"Retrieved document {document_id}")

            return DocumentDetailResponse(
                id=doc["id"],
                project_id=doc["project_id"],
                name=doc["name"],
                file_type=doc.get("file_type"),
                processing_state=DocumentProcessingState(doc["processing_state"]),
                error_message=doc.get("error_message"),
                chunk_count=(
                    doc.get("document_chunks", [{}])[0].get("count", 0)
                    if doc.get("document_chunks")
                    else 0
                ),
                created_at=datetime.fromisoformat(doc["created_at"].replace("Z", "+00:00")),
            )

        except Exception as e:
            logger.error(f"Error getting document {document_id}: {e}", exc_info=True)
            raise

    async def delete_document(
        self,
        document_id: UUID,
        project_id: UUID,
    ) -> DocumentDeleteResponse:
        """
        Soft delete a document by setting deleted_at timestamp.

        Args:
            document_id: Document identifier
            project_id: Project identifier (for verification)

        Returns:
            DocumentDeleteResponse with deletion timestamp

        Raises:
            Exception: If document not found or already deleted
        """
        try:
            deleted_at = datetime.utcnow()

            response = (
                self.supabase.table("documents")
                .update({"deleted_at": deleted_at.isoformat()})
                .eq("id", str(document_id))
                .eq("project_id", str(project_id))
                .is_("deleted_at", "null")
                .execute()
            )

            if not response.data:
                raise Exception(f"Document {document_id} not found or already deleted")

            logger.info(f"Soft deleted document {document_id}")

            return DocumentDeleteResponse(
                id=document_id,
                deleted_at=deleted_at,
            )

        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {e}", exc_info=True)
            raise

    async def get_chunks(
        self,
        document_id: UUID,
        project_id: UUID,
        page: int,
        limit: int,
    ) -> Tuple[List[DocumentChunkItem], int]:
        """
        Get text chunks for a document.

        Args:
            document_id: Document identifier
            project_id: Project identifier (for verification)
            page: Page number (1-indexed)
            limit: Items per page

        Returns:
            Tuple of (list of DocumentChunkItem DTOs, total count)

        Raises:
            Exception: If document not found or query fails
        """
        try:
            # Verify document exists and belongs to project
            doc_response = (
                self.supabase.table("documents")
                .select("id")
                .eq("id", str(document_id))
                .eq("project_id", str(project_id))
                .is_("deleted_at", "null")
                .execute()
            )

            if not doc_response.data:
                raise Exception(f"Document {document_id} not found")

            offset = (page - 1) * limit

            # Query chunks
            query = (
                self.supabase.table("document_chunks")
                .select("*", count="exact")
                .eq("document_id", str(document_id))
                .order("chunk_index", desc=False)
                .range(offset, offset + limit - 1)
            )

            response = query.execute()

            chunks_data = response.data
            total_count = response.count if response.count is not None else 0

            # Transform to DTOs (exclude embedding for API response)
            chunks = [
                DocumentChunkItem(
                    id=chunk["id"],
                    document_id=chunk["document_id"],
                    content=chunk["content"],
                    chunk_index=chunk["chunk_index"],
                    metadata=chunk.get("metadata", {}),
                    created_at=datetime.fromisoformat(chunk["created_at"].replace("Z", "+00:00")),
                )
                for chunk in chunks_data
            ]

            logger.info(
                f"Retrieved {len(chunks)} chunks for document {document_id} "
                f"(page {page}, total {total_count})"
            )

            return chunks, total_count

        except Exception as e:
            logger.error(f"Error getting chunks for document {document_id}: {e}", exc_info=True)
            raise


def get_document_service(supabase: Client = Depends(get_supabase)) -> DocumentService:
    """
    Factory function for creating DocumentService instances.

    Used as a FastAPI dependency.

    Args:
        supabase: Supabase client from dependency injection

    Returns:
        DocumentService instance
    """
    return DocumentService(supabase)
