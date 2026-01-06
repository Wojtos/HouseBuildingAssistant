"""
Tests for Profile API Endpoints

Tests for:
- GET /api/profiles/me
- PUT /api/profiles/me
"""

import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.schemas.profile import ProfileResponse, ProfileUpdateRequest
from app.db.enums import MeasurementUnit
from app.db.models import Profile
from datetime import datetime


class TestGetMyProfile:
    """Tests for GET /api/profiles/me endpoint"""

    @pytest.mark.asyncio
    async def test_get_profile_success(self):
        """Test successful profile retrieval"""
        user_id = uuid4()
        mock_profile = Profile(
            id=user_id,
            full_name="John Doe",
            preferred_units=MeasurementUnit.METRIC,
            language="en",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.get_profile.return_value = mock_profile

        with patch("app.api.profiles.get_profile_service", return_value=mock_service):
            from app.api.profiles import get_my_profile

            result = await get_my_profile(
                user_id=user_id,
                profile_service=mock_service,
            )

            assert isinstance(result, ProfileResponse)
            assert result.id == user_id
            assert result.full_name == "John Doe"
            assert result.preferred_units == MeasurementUnit.METRIC
            assert result.language == "en"
            mock_service.get_profile.assert_called_once_with(user_id)

    @pytest.mark.asyncio
    async def test_get_profile_not_found(self):
        """Test profile not found error"""
        user_id = uuid4()

        mock_service = AsyncMock()
        mock_service.get_profile.side_effect = Exception("Profile not found for user")

        with patch("app.api.profiles.get_profile_service", return_value=mock_service):
            from app.api.profiles import get_my_profile

            with pytest.raises(HTTPException) as exc_info:
                await get_my_profile(
                    user_id=user_id,
                    profile_service=mock_service,
                )

            assert exc_info.value.status_code == 404
            assert "not found" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_get_profile_database_error(self):
        """Test database error handling"""
        user_id = uuid4()

        mock_service = AsyncMock()
        mock_service.get_profile.side_effect = Exception("Database connection failed")

        with patch("app.api.profiles.get_profile_service", return_value=mock_service):
            from app.api.profiles import get_my_profile

            with pytest.raises(HTTPException) as exc_info:
                await get_my_profile(
                    user_id=user_id,
                    profile_service=mock_service,
                )

            assert exc_info.value.status_code == 500
            assert "internal server error" in exc_info.value.detail.lower()


class TestUpdateMyProfile:
    """Tests for PUT /api/profiles/me endpoint"""

    @pytest.mark.asyncio
    async def test_update_profile_full_name(self):
        """Test updating full name"""
        user_id = uuid4()
        updates = ProfileUpdateRequest(full_name="Jane Smith")

        mock_updated_profile = Profile(
            id=user_id,
            full_name="Jane Smith",
            preferred_units=MeasurementUnit.METRIC,
            language="en",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.update_profile.return_value = mock_updated_profile

        with patch("app.api.profiles.get_profile_service", return_value=mock_service):
            from app.api.profiles import update_my_profile

            result = await update_my_profile(
                updates=updates,
                user_id=user_id,
                profile_service=mock_service,
            )

            assert isinstance(result, ProfileResponse)
            assert result.full_name == "Jane Smith"
            mock_service.update_profile.assert_called_once_with(user_id, updates)

    @pytest.mark.asyncio
    async def test_update_profile_units(self):
        """Test updating preferred units"""
        user_id = uuid4()
        updates = ProfileUpdateRequest(preferred_units=MeasurementUnit.IMPERIAL)

        mock_updated_profile = Profile(
            id=user_id,
            full_name="John Doe",
            preferred_units=MeasurementUnit.IMPERIAL,
            language="en",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.update_profile.return_value = mock_updated_profile

        with patch("app.api.profiles.get_profile_service", return_value=mock_service):
            from app.api.profiles import update_my_profile

            result = await update_my_profile(
                updates=updates,
                user_id=user_id,
                profile_service=mock_service,
            )

            assert result.preferred_units == MeasurementUnit.IMPERIAL
            mock_service.update_profile.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_profile_language(self):
        """Test updating language preference"""
        user_id = uuid4()
        updates = ProfileUpdateRequest(language="pl")

        mock_updated_profile = Profile(
            id=user_id,
            full_name="John Doe",
            preferred_units=MeasurementUnit.METRIC,
            language="pl",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.update_profile.return_value = mock_updated_profile

        with patch("app.api.profiles.get_profile_service", return_value=mock_service):
            from app.api.profiles import update_my_profile

            result = await update_my_profile(
                updates=updates,
                user_id=user_id,
                profile_service=mock_service,
            )

            assert result.language == "pl"

    @pytest.mark.asyncio
    async def test_update_profile_multiple_fields(self):
        """Test updating multiple fields at once"""
        user_id = uuid4()
        updates = ProfileUpdateRequest(
            full_name="Jane Smith",
            preferred_units=MeasurementUnit.IMPERIAL,
            language="de",
        )

        mock_updated_profile = Profile(
            id=user_id,
            full_name="Jane Smith",
            preferred_units=MeasurementUnit.IMPERIAL,
            language="de",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.update_profile.return_value = mock_updated_profile

        with patch("app.api.profiles.get_profile_service", return_value=mock_service):
            from app.api.profiles import update_my_profile

            result = await update_my_profile(
                updates=updates,
                user_id=user_id,
                profile_service=mock_service,
            )

            assert result.full_name == "Jane Smith"
            assert result.preferred_units == MeasurementUnit.IMPERIAL
            assert result.language == "de"

    @pytest.mark.asyncio
    async def test_update_profile_not_found(self):
        """Test update on non-existent profile"""
        user_id = uuid4()
        updates = ProfileUpdateRequest(full_name="Jane Smith")

        mock_service = AsyncMock()
        mock_service.update_profile.side_effect = Exception("Profile not found")

        with patch("app.api.profiles.get_profile_service", return_value=mock_service):
            from app.api.profiles import update_my_profile

            with pytest.raises(HTTPException) as exc_info:
                await update_my_profile(
                    updates=updates,
                    user_id=user_id,
                    profile_service=mock_service,
                )

            assert exc_info.value.status_code == 404
