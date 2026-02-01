"""
Unit tests for ChatOrchestrationService utility functions.

Tests pure utility functions used in chat orchestration:
- _should_search_documents: Determines if document search is needed
- _format_project_memory: Formats memory for LLM context
- _format_documents: Formats document chunks for LLM context
- _format_chat_history: Formats chat history for LLM context
"""

import pytest
import json
from unittest.mock import Mock

from app.services.chat_orchestration_service import ChatOrchestrationService


@pytest.fixture
def mock_openrouter_service():
    """Create a mock OpenRouterService for testing."""
    mock = Mock()
    mock.mock_mode = True
    return mock


class TestShouldSearchDocuments:
    """Tests for the _should_search_documents utility function."""

    @pytest.fixture
    def service(self, mock_openrouter_service):
        """Create a ChatOrchestrationService instance for testing.
        
        Uses a mock OpenRouterService since the __init__ accesses mock_mode.
        """
        return ChatOrchestrationService(
            openrouter_service=mock_openrouter_service,
            message_service=None,
        )

    # ==========================================================================
    # Positive cases - should trigger document search
    # ==========================================================================

    @pytest.mark.parametrize("message", [
        "What does my contract say about payment terms?",
        "Check if the permit mentions setback requirements",
        "According to the uploaded documents, what is the timeline?",
        "Can you find the quote from the contractor?",
        "What's the estimate for roofing?",
        "Is there an agreement about warranties?",
        "What document did I upload about foundations?",
        "In the file I shared, what does it say?",
        "The permit application says something about height limits",
    ])
    def test_trigger_keywords_return_true(self, service, message):
        """Messages containing trigger keywords should return True."""
        result = service._should_search_documents(message)
        
        assert result is True

    def test_multiple_trigger_keywords(self, service):
        """Message with multiple trigger keywords should return True."""
        message = "Check the contract and the permit documents I uploaded"
        
        result = service._should_search_documents(message)
        
        assert result is True

    # ==========================================================================
    # Negative cases - should NOT trigger document search
    # ==========================================================================

    @pytest.mark.parametrize("message", [
        # Note: "permits" contains "permit" which is a trigger - use different wording
        "What building approvals do I need for a deck?",
        "How much does a roof typically cost?",
        "What are the building codes in Denver?",
        "Tell me about foundation types",
        "How long does construction take?",
        "What's the best insulation material?",
        "Hello, can you help me?",
        "Thank you for your help!",
    ])
    def test_general_queries_return_false(self, service, message):
        """General queries without trigger keywords should return False."""
        result = service._should_search_documents(message)
        
        assert result is False

    def test_empty_message_returns_false(self, service):
        """Empty message should return False."""
        result = service._should_search_documents("")
        
        assert result is False

    def test_whitespace_only_returns_false(self, service):
        """Whitespace-only message should return False."""
        result = service._should_search_documents("   \n\t  ")
        
        assert result is False

    # ==========================================================================
    # Case sensitivity tests
    # ==========================================================================

    def test_uppercase_trigger_keyword(self, service):
        """Trigger keywords should match case-insensitively."""
        message = "What does my CONTRACT say?"
        
        result = service._should_search_documents(message)
        
        assert result is True

    def test_mixed_case_trigger_keyword(self, service):
        """Mixed case trigger keywords should match."""
        message = "Check the Document I uploaded"
        
        result = service._should_search_documents(message)
        
        assert result is True

    # ==========================================================================
    # Edge cases
    # ==========================================================================

    def test_trigger_keyword_as_substring(self, service):
        """Trigger keywords as substrings should still match."""
        # "contract" is in "contractor" - this is expected behavior
        message = "I need a contractor recommendation"
        
        result = service._should_search_documents(message)
        
        # "contract" is a substring of "contractor" so this returns True
        # This is the current behavior - document search will find nothing
        assert result is True

    def test_partial_trigger_at_word_boundary(self, service):
        """Partial matches at word boundaries."""
        message = "I'm documenting my project progress"
        
        result = service._should_search_documents(message)
        
        # "document" is in "documenting"
        assert result is True

    def test_very_long_message_with_trigger(self, service):
        """Very long message with trigger keyword should still match."""
        long_text = "This is a very long message " * 100
        message = long_text + "according to the contract" + long_text
        
        result = service._should_search_documents(message)
        
        assert result is True

    def test_trigger_with_special_characters(self, service):
        """Trigger keywords surrounded by special characters should match."""
        message = "What's in the [document]?"
        
        result = service._should_search_documents(message)
        
        assert result is True


class TestFormatProjectMemory:
    """Tests for the _format_project_memory utility function."""

    @pytest.fixture
    def service(self, mock_openrouter_service):
        """Create service instance for testing."""
        return ChatOrchestrationService(
            openrouter_service=mock_openrouter_service,
            message_service=None,
        )

    # ==========================================================================
    # Basic functionality
    # ==========================================================================

    def test_empty_memory_returns_empty_string(self, service):
        """Empty memory dict should return empty string."""
        result = service._format_project_memory({})
        
        assert result == ""

    def test_none_memory_returns_empty_string(self, service):
        """None memory should return empty string."""
        result = service._format_project_memory(None)
        
        assert result == ""

    def test_memory_with_empty_domains_returns_empty(self, service):
        """Memory with only empty domain dicts should return empty string."""
        memory = {
            "FINANCE_LEGAL": {},
            "LAND_FEASIBILITY": {},
        }
        
        result = service._format_project_memory(memory)
        
        assert result == ""

    def test_single_domain_with_data(self, service):
        """Single domain with data should format correctly."""
        memory = {
            "FINANCE_LEGAL": {"budget": "$500,000", "loan_type": "construction"},
        }
        
        result = service._format_project_memory(memory)
        
        assert "=== PROJECT MEMORY ===" in result
        assert "FINANCE_LEGAL" in result
        assert "$500,000" in result
        assert "construction" in result

    def test_multiple_domains_with_data(self, service):
        """Multiple domains should all be included."""
        memory = {
            "FINANCE_LEGAL": {"budget": "$500,000"},
            "LAND_FEASIBILITY": {"lot_size": "0.5 acres"},
            "PERMITTING": {},  # Empty, should be excluded
        }
        
        result = service._format_project_memory(memory)
        
        assert "FINANCE_LEGAL" in result
        assert "LAND_FEASIBILITY" in result
        assert "PERMITTING" not in result

    # ==========================================================================
    # Priority domain ordering
    # ==========================================================================

    def test_priority_domains_appear_first(self, service):
        """Priority domains should appear before other domains."""
        memory = {
            "LAND_FEASIBILITY": {"lot_size": "0.5 acres"},
            "FINANCE_LEGAL": {"budget": "$500,000"},
            "ARCHITECTURAL_DESIGN": {"style": "modern"},
        }
        
        result = service._format_project_memory(
            memory, 
            priority_domains=["FINANCE_LEGAL"]
        )
        
        # FINANCE_LEGAL should appear before other domains in the JSON
        finance_pos = result.find("FINANCE_LEGAL")
        land_pos = result.find("LAND_FEASIBILITY")
        
        assert finance_pos < land_pos

    def test_multiple_priority_domains(self, service):
        """Multiple priority domains should maintain order."""
        memory = {
            "LAND_FEASIBILITY": {"lot_size": "0.5 acres"},
            "FINANCE_LEGAL": {"budget": "$500,000"},
            "ARCHITECTURAL_DESIGN": {"style": "modern"},
        }
        
        result = service._format_project_memory(
            memory,
            priority_domains=["ARCHITECTURAL_DESIGN", "FINANCE_LEGAL"]
        )
        
        arch_pos = result.find("ARCHITECTURAL_DESIGN")
        finance_pos = result.find("FINANCE_LEGAL")
        land_pos = result.find("LAND_FEASIBILITY")
        
        assert arch_pos < finance_pos < land_pos

    def test_priority_domain_not_in_memory(self, service):
        """Priority domain not in memory should not cause errors."""
        memory = {
            "FINANCE_LEGAL": {"budget": "$500,000"},
        }
        
        result = service._format_project_memory(
            memory,
            priority_domains=["NONEXISTENT_DOMAIN"]
        )
        
        assert "FINANCE_LEGAL" in result
        assert "$500,000" in result

    # ==========================================================================
    # Truncation tests
    # ==========================================================================

    def test_truncation_at_max_tokens(self, service):
        """Memory exceeding max_tokens should be truncated."""
        # Create a large memory structure
        large_value = "x" * 10000
        memory = {
            "FINANCE_LEGAL": {"large_field": large_value},
        }
        
        result = service._format_project_memory(memory, max_tokens=100)
        
        assert "... (truncated)" in result
        # Result should be shorter than the original
        assert len(result) < len(large_value)

    def test_small_max_tokens(self, service):
        """Very small max_tokens should still produce valid output."""
        memory = {
            "FINANCE_LEGAL": {"budget": "$500,000"},
        }
        
        result = service._format_project_memory(memory, max_tokens=50)
        
        assert "=== PROJECT MEMORY ===" in result
        # May or may not be truncated depending on actual size

    # ==========================================================================
    # JSON serialization edge cases
    # ==========================================================================

    def test_nested_dict_values(self, service):
        """Nested dictionary values should serialize correctly."""
        memory = {
            "FINANCE_LEGAL": {
                "loans": {
                    "primary": "$400,000",
                    "secondary": "$100,000",
                }
            },
        }
        
        result = service._format_project_memory(memory)
        
        assert "primary" in result
        assert "$400,000" in result

    def test_list_values(self, service):
        """List values should serialize correctly."""
        memory = {
            "PROCUREMENT_QUALITY": {
                "contractors": ["ABC Builders", "XYZ Construction"],
            },
        }
        
        result = service._format_project_memory(memory)
        
        assert "ABC Builders" in result
        assert "XYZ Construction" in result


class TestFormatDocuments:
    """Tests for the _format_documents utility function."""

    @pytest.fixture
    def service(self, mock_openrouter_service):
        """Create service instance for testing."""
        return ChatOrchestrationService(
            openrouter_service=mock_openrouter_service,
            message_service=None,
        )

    def test_empty_documents_returns_empty_string(self, service):
        """Empty document list should return empty string."""
        result = service._format_documents([])
        
        assert result == ""

    def test_single_document_formatting(self, service):
        """Single document should format with all metadata."""
        documents = [
            {
                "source": "contract.pdf",
                "content": "Payment terms are net 30.",
                "similarity": 0.85,
                "chunk_index": 0,
                "upload_date": "2024-01-15",
            }
        ]
        
        result = service._format_documents(documents)
        
        assert "=== RETRIEVED DOCUMENTS ===" in result
        assert "contract.pdf" in result
        assert "Payment terms are net 30." in result
        assert "0.85" in result
        assert "Chunk 0" in result
        assert "2024-01-15" in result

    def test_multiple_documents_numbered(self, service):
        """Multiple documents should be numbered."""
        documents = [
            {
                "source": "doc1.pdf",
                "content": "Content 1",
                "similarity": 0.9,
                "chunk_index": 0,
            },
            {
                "source": "doc2.pdf",
                "content": "Content 2",
                "similarity": 0.8,
                "chunk_index": 1,
            },
        ]
        
        result = service._format_documents(documents)
        
        assert "Document 1:" in result
        assert "Document 2:" in result

    def test_missing_metadata_uses_defaults(self, service):
        """Missing metadata should use default values."""
        documents = [
            {
                "content": "Some content",
            }
        ]
        
        result = service._format_documents(documents)
        
        assert "Unknown" in result  # Default source
        assert "Some content" in result

    def test_citation_instruction_included(self, service):
        """Citation instruction should be included."""
        documents = [
            {
                "source": "doc.pdf",
                "content": "Content",
                "similarity": 0.9,
            }
        ]
        
        result = service._format_documents(documents)
        
        assert "Cite document sources" in result


class TestFormatChatHistory:
    """Tests for the _format_chat_history utility function."""

    @pytest.fixture
    def service(self, mock_openrouter_service):
        """Create service instance for testing."""
        return ChatOrchestrationService(
            openrouter_service=mock_openrouter_service,
            message_service=None,
        )

    def test_empty_history_returns_empty_string(self, service):
        """Empty history should return empty string."""
        result = service._format_chat_history([])
        
        assert result == ""

    def test_single_message_formatting(self, service):
        """Single message should format with capitalized role."""
        history = [
            {"role": "user", "content": "Hello!"}
        ]
        
        result = service._format_chat_history(history)
        
        assert "User: Hello!" in result

    def test_multiple_messages_formatting(self, service):
        """Multiple messages should be formatted line by line."""
        history = [
            {"role": "user", "content": "What permits do I need?"},
            {"role": "assistant", "content": "For a deck, you'll need..."},
        ]
        
        result = service._format_chat_history(history)
        
        assert "User: What permits do I need?" in result
        assert "Assistant: For a deck, you'll need..." in result
        # Check they're on separate lines
        lines = result.strip().split("\n")
        assert len(lines) == 2

    def test_missing_fields_handled(self, service):
        """Missing fields should use defaults."""
        history = [
            {},  # Empty dict
            {"role": "user"},  # Missing content
        ]
        
        result = service._format_chat_history(history)
        
        # Should not raise, should use defaults
        assert "Unknown:" in result or "User:" in result
