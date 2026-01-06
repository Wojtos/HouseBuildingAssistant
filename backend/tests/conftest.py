"""
Pytest configuration and fixtures for backend tests
"""

import pytest
from uuid import uuid4


@pytest.fixture
def sample_user_id():
    """Fixture providing a sample user ID"""
    return uuid4()


@pytest.fixture
def sample_project_id():
    """Fixture providing a sample project ID"""
    return uuid4()


@pytest.fixture
def sample_document_id():
    """Fixture providing a sample document ID"""
    return uuid4()


@pytest.fixture
def auth_token(sample_user_id):
    """Fixture providing a valid auth token (user ID as token for testing)"""
    return str(sample_user_id)


@pytest.fixture
def auth_headers(auth_token):
    """Fixture providing authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}
