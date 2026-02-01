"""
Unit tests for DocumentRetrievalService utility functions.

Tests the _cosine_similarity function which is critical for
vector similarity search accuracy in the RAG pipeline.
"""

import math

import pytest

from app.services.document_retrieval_service import DocumentRetrievalService


class TestCosineSimilarity:
    """Tests for the _cosine_similarity utility function."""

    @pytest.fixture
    def service(self):
        """Create a DocumentRetrievalService instance for testing.

        Note: We pass None for dependencies since we're only testing
        the pure utility method _cosine_similarity.
        """
        # Create instance without real dependencies (we only test the static method)
        return DocumentRetrievalService(supabase=None, ai_client=None)

    # ==========================================================================
    # Basic functionality tests
    # ==========================================================================

    def test_identical_vectors_return_one(self, service):
        """Identical vectors should have similarity of 1.0."""
        vec = [1.0, 2.0, 3.0, 4.0, 5.0]

        result = service._cosine_similarity(vec, vec)

        assert result == pytest.approx(1.0, abs=1e-9)

    def test_orthogonal_vectors_return_zero(self, service):
        """Orthogonal (perpendicular) vectors should have similarity of 0.0."""
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [0.0, 1.0, 0.0]

        result = service._cosine_similarity(vec1, vec2)

        assert result == pytest.approx(0.0, abs=1e-9)

    def test_opposite_vectors_return_negative_one(self, service):
        """Opposite vectors should have similarity of -1.0."""
        vec1 = [1.0, 2.0, 3.0]
        vec2 = [-1.0, -2.0, -3.0]

        result = service._cosine_similarity(vec1, vec2)

        assert result == pytest.approx(-1.0, abs=1e-9)

    # ==========================================================================
    # Parameterized tests for various similarity values
    # ==========================================================================

    @pytest.mark.parametrize(
        "vec1,vec2,expected",
        [
            # Identical normalized vectors
            ([1.0, 0.0], [1.0, 0.0], 1.0),
            # 45-degree angle (cos(45°) ≈ 0.707)
            ([1.0, 0.0], [1.0, 1.0], math.sqrt(2) / 2),
            # Same direction, different magnitudes (should still be 1.0)
            ([2.0, 4.0, 6.0], [1.0, 2.0, 3.0], 1.0),
            # Negative correlation
            ([1.0, 1.0], [-1.0, -1.0], -1.0),
            # Partial correlation
            ([1.0, 1.0, 0.0], [1.0, 0.0, 0.0], math.sqrt(2) / 2),
        ],
    )
    def test_known_similarity_values(self, service, vec1, vec2, expected):
        """Test cosine similarity with known mathematical values."""
        result = service._cosine_similarity(vec1, vec2)

        assert result == pytest.approx(expected, abs=1e-6)

    # ==========================================================================
    # Edge cases and boundary conditions
    # ==========================================================================

    def test_zero_vector_returns_zero(self, service):
        """Zero vector should return 0.0 (avoid division by zero)."""
        vec1 = [0.0, 0.0, 0.0]
        vec2 = [1.0, 2.0, 3.0]

        result = service._cosine_similarity(vec1, vec2)

        assert result == 0.0

    def test_both_zero_vectors_return_zero(self, service):
        """Two zero vectors should return 0.0."""
        vec1 = [0.0, 0.0, 0.0]
        vec2 = [0.0, 0.0, 0.0]

        result = service._cosine_similarity(vec1, vec2)

        assert result == 0.0

    def test_different_length_vectors_return_zero(self, service):
        """Vectors of different lengths should return 0.0 (with warning logged)."""
        vec1 = [1.0, 2.0, 3.0]
        vec2 = [1.0, 2.0]

        result = service._cosine_similarity(vec1, vec2)

        assert result == 0.0

    def test_single_dimension_vectors(self, service):
        """Single dimension vectors should work correctly."""
        vec1 = [5.0]
        vec2 = [3.0]

        result = service._cosine_similarity(vec1, vec2)

        assert result == pytest.approx(1.0, abs=1e-9)

    def test_single_dimension_opposite(self, service):
        """Single dimension opposite vectors should return -1.0."""
        vec1 = [5.0]
        vec2 = [-3.0]

        result = service._cosine_similarity(vec1, vec2)

        assert result == pytest.approx(-1.0, abs=1e-9)

    def test_empty_vectors_return_zero(self, service):
        """Empty vectors should return 0.0."""
        vec1 = []
        vec2 = []

        result = service._cosine_similarity(vec1, vec2)

        assert result == 0.0

    # ==========================================================================
    # High-dimensional vectors (typical for embeddings)
    # ==========================================================================

    def test_high_dimensional_identical(self, service):
        """High-dimensional identical vectors should return 1.0."""
        # Typical embedding dimension size (simplified)
        vec = [0.1 * i for i in range(100)]

        result = service._cosine_similarity(vec, vec)

        assert result == pytest.approx(1.0, abs=1e-9)

    def test_high_dimensional_orthogonal(self, service):
        """High-dimensional orthogonal vectors should return 0.0."""
        # Create two orthogonal vectors in high dimensions
        vec1 = [1.0] + [0.0] * 99
        vec2 = [0.0] + [1.0] + [0.0] * 98

        result = service._cosine_similarity(vec1, vec2)

        assert result == pytest.approx(0.0, abs=1e-9)

    # ==========================================================================
    # Numerical stability tests
    # ==========================================================================

    def test_very_small_values(self, service):
        """Very small values should not cause numerical issues."""
        vec1 = [1e-10, 2e-10, 3e-10]
        vec2 = [1e-10, 2e-10, 3e-10]

        result = service._cosine_similarity(vec1, vec2)

        assert result == pytest.approx(1.0, abs=1e-6)

    def test_very_large_values(self, service):
        """Very large values should not cause overflow."""
        vec1 = [1e10, 2e10, 3e10]
        vec2 = [1e10, 2e10, 3e10]

        result = service._cosine_similarity(vec1, vec2)

        assert result == pytest.approx(1.0, abs=1e-6)

    def test_mixed_magnitude_values(self, service):
        """Mixed magnitude values should compute correctly."""
        vec1 = [1e-5, 1e5, 1.0]
        vec2 = [1e-5, 1e5, 1.0]

        result = service._cosine_similarity(vec1, vec2)

        assert result == pytest.approx(1.0, abs=1e-6)
