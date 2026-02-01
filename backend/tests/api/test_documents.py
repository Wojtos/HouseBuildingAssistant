"""
Tests for Document API Endpoints

Tests for:
- GET /api/projects/{project_id}/documents
- POST /api/projects/{project_id}/documents
- POST /api/projects/{project_id}/documents/{document_id}/confirm
- GET /api/projects/{project_id}/documents/{document_id}
- DELETE /api/projects/{project_id}/documents/{document_id}
- GET /api/projects/{project_id}/documents/{document_id}/chunks
- POST /api/projects/{project_id}/documents/search
"""

from datetime import datetime
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.schemas.common import PaginationInfo
from app.schemas.document import (
    DocumentChunkItem,
    DocumentConfirmResponse,
    DocumentCreateRequest,
    DocumentCreateResponse,
    DocumentDeleteResponse,
    DocumentDetailResponse,
    DocumentListItem,
    DocumentProcessingState,
    DocumentSearchRequest,
    DocumentSearchResponse,
    DocumentSearchResult,
)


class TestListDocuments:
    """Tests for GET /api/projects/{project_id}/documents"""

    @pytest.mark.asyncio
    async def test_list_documents_success(self):
        """Test successful document listing"""
        project_id = uuid4()
        user_id = uuid4()

        mock_documents = [
            DocumentListItem(
                id=uuid4(),
                project_id=project_id,
                name="blueprint.pdf",
                file_type="application/pdf",
                processing_state=DocumentProcessingState.COMPLETED,
                error_message=None,
                chunk_count=5,
                created_at=datetime.utcnow(),
                deleted_at=None,
            ),
        ]

        mock_service = AsyncMock()
        mock_service.list_documents.return_value = (mock_documents, 1)

        from app.api.documents import list_documents

        result = await list_documents(
            project_id=project_id,
            page=1,
            limit=20,
            processing_state=None,
            file_type=None,
            include_deleted=False,
            user_id=user_id,
            project=None,
            document_service=mock_service,
        )

        assert len(result.data) == 1
        assert result.data[0].name == "blueprint.pdf"
        assert result.pagination.total_items == 1


class TestCreateDocument:
    """Tests for POST /api/projects/{project_id}/documents"""

    @pytest.mark.asyncio
    async def test_create_document_success(self):
        """Test successful document creation with presigned URL"""
        project_id = uuid4()
        user_id = uuid4()

        request = DocumentCreateRequest(
            name="plan.pdf",
            file_type="application/pdf",
            file_size=1024000,
        )

        mock_response = DocumentCreateResponse(
            id=uuid4(),
            project_id=project_id,
            name="plan.pdf",
            file_type="application/pdf",
            processing_state="PENDING_UPLOAD",
            upload_url="https://storage.example.com/upload?token=xyz",
            upload_url_expires_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.create_document.return_value = mock_response

        from app.api.documents import create_document

        result = await create_document(
            project_id=project_id,
            request=request,
            user_id=user_id,
            project=None,
            document_service=mock_service,
        )

        assert result.name == "plan.pdf"
        assert result.processing_state == "PENDING_UPLOAD"
        assert "upload" in result.upload_url

    @pytest.mark.asyncio
    async def test_create_document_file_too_large(self):
        """Test file size limit enforcement"""
        from pydantic import ValidationError

        # Test that Pydantic validation rejects files > 10MB
        with pytest.raises(ValidationError) as exc_info:
            request = DocumentCreateRequest(
                name="huge.pdf",
                file_type="application/pdf",
                file_size=11 * 1024 * 1024,  # 11MB > 10MB limit
            )

        # Verify the error is about file_size
        assert "file_size" in str(exc_info.value)


class TestConfirmDocumentUpload:
    """Tests for POST /api/projects/{project_id}/documents/{document_id}/confirm"""

    @pytest.mark.asyncio
    async def test_confirm_upload_success(self):
        """Test successful upload confirmation"""
        project_id = uuid4()
        document_id = uuid4()
        user_id = uuid4()

        mock_response = DocumentConfirmResponse(
            id=document_id,
            project_id=project_id,
            name="plan.pdf",
            file_type="application/pdf",
            processing_state="UPLOADED",
            created_at=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.confirm_upload.return_value = mock_response

        from app.api.documents import confirm_document_upload

        result = await confirm_document_upload(
            project_id=project_id,
            document_id=document_id,
            user_id=user_id,
            project=None,
            document_service=mock_service,
        )

        assert result.processing_state == "UPLOADED"
        mock_service.confirm_upload.assert_called_once()

    @pytest.mark.asyncio
    async def test_confirm_upload_file_not_in_storage(self):
        """Test confirmation when file not uploaded"""
        project_id = uuid4()
        document_id = uuid4()
        user_id = uuid4()

        mock_service = AsyncMock()
        mock_service.confirm_upload.side_effect = Exception("not found in storage")

        from app.api.documents import confirm_document_upload

        with pytest.raises(HTTPException) as exc_info:
            await confirm_document_upload(
                project_id=project_id,
                document_id=document_id,
                user_id=user_id,
                project=None,
                document_service=mock_service,
            )

        assert exc_info.value.status_code == 400


class TestGetDocument:
    """Tests for GET /api/projects/{project_id}/documents/{document_id}"""

    @pytest.mark.asyncio
    async def test_get_document_success(self):
        """Test successful document retrieval"""
        project_id = uuid4()
        document_id = uuid4()
        user_id = uuid4()

        mock_document = DocumentDetailResponse(
            id=document_id,
            project_id=project_id,
            name="plan.pdf",
            file_type="application/pdf",
            processing_state=DocumentProcessingState.COMPLETED,
            error_message=None,
            chunk_count=5,
            created_at=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.get_document.return_value = mock_document

        from app.api.documents import get_document

        result = await get_document(
            project_id=project_id,
            document_id=document_id,
            user_id=user_id,
            project=None,
            document_service=mock_service,
        )

        assert result.id == document_id
        assert result.name == "plan.pdf"


class TestDeleteDocument:
    """Tests for DELETE /api/projects/{project_id}/documents/{document_id}"""

    @pytest.mark.asyncio
    async def test_delete_document_success(self):
        """Test successful document soft delete"""
        project_id = uuid4()
        document_id = uuid4()
        user_id = uuid4()

        mock_response = DocumentDeleteResponse(
            id=document_id,
            deleted_at=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.delete_document.return_value = mock_response

        from app.api.documents import delete_document

        result = await delete_document(
            project_id=project_id,
            document_id=document_id,
            user_id=user_id,
            project=None,
            document_service=mock_service,
        )

        assert result.id == document_id
        assert result.deleted_at is not None


class TestGetDocumentChunks:
    """Tests for GET /api/projects/{project_id}/documents/{document_id}/chunks"""

    @pytest.mark.asyncio
    async def test_get_chunks_success(self):
        """Test successful chunk retrieval"""
        project_id = uuid4()
        document_id = uuid4()
        user_id = uuid4()

        mock_chunks = [
            DocumentChunkItem(
                id=uuid4(),
                document_id=document_id,
                content="This is page 1 content",
                chunk_index=0,
                metadata={"page": 1},
                created_at=datetime.utcnow(),
            ),
        ]

        mock_service = AsyncMock()
        mock_service.get_chunks.return_value = (mock_chunks, 1)

        from app.api.documents import get_document_chunks

        result = await get_document_chunks(
            project_id=project_id,
            document_id=document_id,
            page=1,
            limit=20,
            user_id=user_id,
            project=None,
            document_service=mock_service,
        )

        assert len(result.data) == 1
        assert result.data[0].content == "This is page 1 content"


class TestSearchDocuments:
    """Tests for POST /api/projects/{project_id}/documents/search"""

    @pytest.mark.asyncio
    async def test_search_documents_success(self):
        """Test successful semantic search"""
        project_id = uuid4()
        user_id = uuid4()

        request = DocumentSearchRequest(
            query="What is the foundation type?",
            limit=5,
            threshold=0.7,
        )

        mock_results = [
            DocumentSearchResult(
                chunk_id=uuid4(),
                document_id=uuid4(),
                document_name="specs.pdf",
                content="Foundation type: concrete slab",
                chunk_index=0,
                similarity_score=0.85,
                metadata={},
            ),
        ]

        mock_retrieval_service = AsyncMock()
        mock_retrieval_service.search_documents.return_value = mock_results

        from app.api.documents import search_documents

        result = await search_documents(
            project_id=project_id,
            request=request,
            user_id=user_id,
            project=None,
            retrieval_service=mock_retrieval_service,
        )

        assert len(result.results) == 1
        assert result.results[0].similarity_score == 0.85
        assert result.query == "What is the foundation type?"
        assert result.total_results == 1
