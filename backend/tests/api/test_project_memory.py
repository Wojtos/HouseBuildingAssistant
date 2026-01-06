"""
Tests for Project Memory API Endpoints

Tests for:
- GET /api/projects/{project_id}/memory
- PATCH /api/projects/{project_id}/memory
- GET /api/projects/{project_id}/memory/audit (TODO - returns 501)
"""

import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from datetime import datetime

from app.schemas.memory import (
    ProjectMemoryResponse,
    ProjectMemoryUpdateRequest,
)


class TestGetProjectMemory:
    """Tests for GET /api/projects/{project_id}/memory"""

    @pytest.mark.asyncio
    async def test_get_memory_success(self):
        """Test successful memory retrieval"""
        project_id = uuid4()
        user_id = uuid4()

        memory_data = {
            "FINANCE": {
                "total_budget": 500000,
                "currency": "USD",
            },
            "PERMITTING": {
                "zoning": "residential",
            },
        }

        # Mock Supabase response
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "data": memory_data,
                "updated_at": datetime.utcnow().isoformat(),
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Mock service
        mock_service = AsyncMock()
        mock_service.get_memory.return_value = memory_data

        with patch("app.api.project_memory.get_project_memory_service", return_value=mock_service):
            from app.api.project_memory import get_project_memory

            result = await get_project_memory(
                project_id=project_id,
                user_id=user_id,
                project=None,
                supabase=mock_supabase,
            )

            assert isinstance(result, ProjectMemoryResponse)
            assert result.data["FINANCE"]["total_budget"] == 500000
            assert result.data["PERMITTING"]["zoning"] == "residential"
            mock_service.get_memory.assert_called_once_with(project_id)

    @pytest.mark.asyncio
    async def test_get_memory_empty(self):
        """Test memory retrieval when no memory exists"""
        project_id = uuid4()
        user_id = uuid4()

        default_memory = {
            "LAND": {},
            "PERMITTING": {},
            "DESIGN": {},
            "FINANCE": {},
            "SITE_PREP": {},
            "SHELL_SYSTEMS": {},
            "PROCUREMENT": {},
            "FINISHES": {},
            "GENERAL": {},
        }

        # Mock empty Supabase response
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Mock service
        mock_service = AsyncMock()
        mock_service.get_memory.return_value = default_memory

        with patch("app.api.project_memory.get_project_memory_service", return_value=mock_service):
            from app.api.project_memory import get_project_memory

            result = await get_project_memory(
                project_id=project_id,
                user_id=user_id,
                project=None,
                supabase=mock_supabase,
            )

            assert isinstance(result, ProjectMemoryResponse)
            assert "FINANCE" in result.data
            assert result.data["FINANCE"] == {}


class TestUpdateProjectMemory:
    """Tests for PATCH /api/projects/{project_id}/memory"""

    @pytest.mark.asyncio
    async def test_update_memory_success(self):
        """Test successful memory update"""
        project_id = uuid4()
        user_id = uuid4()

        request = ProjectMemoryUpdateRequest(
            data={
                "FINANCE": {
                    "total_budget": 600000,
                    "currency": "EUR",
                }
            },
            agent_id="FINANCE_LEGAL_AGENT",
            change_summary="Updated budget after quote review",
        )

        updated_data = {
            "FINANCE": {
                "total_budget": 600000,
                "currency": "EUR",
            },
            "PERMITTING": {
                "zoning": "residential",
            },
        }

        # Mock Supabase response
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "data": updated_data,
                "updated_at": datetime.utcnow().isoformat(),
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Mock service
        mock_service = AsyncMock()
        mock_service.update_memory.return_value = updated_data

        with patch("app.api.project_memory.get_project_memory_service", return_value=mock_service):
            from app.api.project_memory import update_project_memory

            result = await update_project_memory(
                project_id=project_id,
                request=request,
                user_id=user_id,
                project=None,
                supabase=mock_supabase,
            )

            assert isinstance(result, ProjectMemoryResponse)
            assert result.data["FINANCE"]["total_budget"] == 600000
            mock_service.update_memory.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_memory_deep_merge(self):
        """Test that deep merge preserves existing data"""
        project_id = uuid4()
        user_id = uuid4()

        request = ProjectMemoryUpdateRequest(
            data={
                "FINANCE": {
                    "loan_amount": 400000,  # Adding new field
                }
            },
        )

        # Existing budget should be preserved
        updated_data = {
            "FINANCE": {
                "total_budget": 600000,  # Preserved
                "loan_amount": 400000,   # New
            },
        }

        # Mock Supabase response
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "data": updated_data,
                "updated_at": datetime.utcnow().isoformat(),
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Mock service
        mock_service = AsyncMock()
        mock_service.update_memory.return_value = updated_data

        with patch("app.api.project_memory.get_project_memory_service", return_value=mock_service):
            from app.api.project_memory import update_project_memory

            result = await update_project_memory(
                project_id=project_id,
                request=request,
                user_id=user_id,
                project=None,
                supabase=mock_supabase,
            )

            # Both old and new fields should be present
            assert result.data["FINANCE"]["total_budget"] == 600000
            assert result.data["FINANCE"]["loan_amount"] == 400000

    @pytest.mark.asyncio
    async def test_update_memory_with_agent_tracking(self):
        """Test memory update with agent ID and change summary"""
        project_id = uuid4()
        user_id = uuid4()

        request = ProjectMemoryUpdateRequest(
            data={"DESIGN": {"style": "modern"}},
            agent_id="ARCHITECTURAL_DESIGN_AGENT",
            change_summary="Confirmed architectural style preference",
        )

        updated_data = {"DESIGN": {"style": "modern"}}

        # Mock Supabase
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "data": updated_data,
                "updated_at": datetime.utcnow().isoformat(),
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

        # Mock service
        mock_service = AsyncMock()
        mock_service.update_memory.return_value = updated_data

        with patch("app.api.project_memory.get_project_memory_service", return_value=mock_service):
            from app.api.project_memory import update_project_memory

            result = await update_project_memory(
                project_id=project_id,
                request=request,
                user_id=user_id,
                project=None,
                supabase=mock_supabase,
            )

            # TODO: Once audit trail is implemented, verify audit entry created
            assert result.data["DESIGN"]["style"] == "modern"


class TestGetMemoryAuditTrail:
    """Tests for GET /api/projects/{project_id}/memory/audit"""

    @pytest.mark.asyncio
    async def test_get_audit_trail_not_implemented(self):
        """Test that audit trail endpoint returns 501 Not Implemented"""
        project_id = uuid4()
        user_id = uuid4()

        mock_supabase = MagicMock()

        from app.api.project_memory import get_memory_audit_trail

        with pytest.raises(HTTPException) as exc_info:
            await get_memory_audit_trail(
                project_id=project_id,
                page=1,
                limit=20,
                user_id=user_id,
                project=None,
                supabase=mock_supabase,
            )

        assert exc_info.value.status_code == 501
        assert "not implemented" in exc_info.value.detail.lower()
