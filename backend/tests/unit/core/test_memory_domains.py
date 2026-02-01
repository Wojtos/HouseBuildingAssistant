"""
Unit tests for memory_domains module.

Tests the core memory domain definitions and utility functions
that are critical for the multi-agent routing and fact storage.
"""

import pytest

from app.core.memory_domains import (
    AGENT_TO_DOMAIN,
    DOMAIN_TO_AGENT,
    MEMORY_DOMAINS,
    get_default_memory_structure,
)


class TestMemoryDomains:
    """Tests for MEMORY_DOMAINS constant."""

    def test_all_expected_domains_present(self):
        """All 9 expected domains should be defined."""
        expected_domains = [
            "LAND_FEASIBILITY",
            "REGULATORY_PERMITTING",
            "ARCHITECTURAL_DESIGN",
            "FINANCE_LEGAL",
            "SITE_PREP_FOUNDATION",
            "SHELL_SYSTEMS",
            "PROCUREMENT_QUALITY",
            "FINISHES_FURNISHING",
            "GENERAL",
        ]

        for domain in expected_domains:
            assert domain in MEMORY_DOMAINS, f"Missing domain: {domain}"

    def test_domain_count(self):
        """Should have exactly 9 domains."""
        assert len(MEMORY_DOMAINS) == 9

    def test_no_duplicate_domains(self):
        """There should be no duplicate domains."""
        assert len(MEMORY_DOMAINS) == len(set(MEMORY_DOMAINS))

    def test_domains_are_uppercase(self):
        """All domain names should be uppercase."""
        for domain in MEMORY_DOMAINS:
            assert domain == domain.upper(), f"Domain not uppercase: {domain}"

    def test_domains_use_underscores(self):
        """Domain names should use underscores, not hyphens or spaces."""
        for domain in MEMORY_DOMAINS:
            assert " " not in domain, f"Domain has space: {domain}"
            assert "-" not in domain, f"Domain has hyphen: {domain}"


class TestAgentToDomain:
    """Tests for AGENT_TO_DOMAIN mapping."""

    def test_all_agents_have_domain_mapping(self):
        """All 9 agents should have a domain mapping."""
        expected_agents = [
            "LAND_FEASIBILITY_AGENT",
            "REGULATORY_PERMITTING_AGENT",
            "ARCHITECTURAL_DESIGN_AGENT",
            "FINANCE_LEGAL_AGENT",
            "SITE_PREP_FOUNDATION_AGENT",
            "SHELL_SYSTEMS_AGENT",
            "PROCUREMENT_QUALITY_AGENT",
            "FINISHES_FURNISHING_AGENT",
            "TRIAGE_MEMORY_AGENT",
        ]

        for agent in expected_agents:
            assert agent in AGENT_TO_DOMAIN, f"Missing agent mapping: {agent}"

    def test_agent_count(self):
        """Should have exactly 9 agent mappings."""
        assert len(AGENT_TO_DOMAIN) == 9

    def test_all_mapped_domains_are_valid(self):
        """All mapped domains should exist in MEMORY_DOMAINS."""
        for agent, domain in AGENT_TO_DOMAIN.items():
            assert domain in MEMORY_DOMAINS, f"Agent {agent} maps to invalid domain: {domain}"

    def test_triage_agent_maps_to_general(self):
        """TRIAGE_MEMORY_AGENT should map to GENERAL domain."""
        assert AGENT_TO_DOMAIN["TRIAGE_MEMORY_AGENT"] == "GENERAL"

    @pytest.mark.parametrize(
        "agent,expected_domain",
        [
            ("LAND_FEASIBILITY_AGENT", "LAND_FEASIBILITY"),
            ("REGULATORY_PERMITTING_AGENT", "REGULATORY_PERMITTING"),
            ("ARCHITECTURAL_DESIGN_AGENT", "ARCHITECTURAL_DESIGN"),
            ("FINANCE_LEGAL_AGENT", "FINANCE_LEGAL"),
            ("SITE_PREP_FOUNDATION_AGENT", "SITE_PREP_FOUNDATION"),
            ("SHELL_SYSTEMS_AGENT", "SHELL_SYSTEMS"),
            ("PROCUREMENT_QUALITY_AGENT", "PROCUREMENT_QUALITY"),
            ("FINISHES_FURNISHING_AGENT", "FINISHES_FURNISHING"),
            ("TRIAGE_MEMORY_AGENT", "GENERAL"),
        ],
    )
    def test_specific_agent_domain_mappings(self, agent, expected_domain):
        """Each agent should map to its expected domain."""
        assert AGENT_TO_DOMAIN[agent] == expected_domain


class TestDomainToAgent:
    """Tests for DOMAIN_TO_AGENT reverse mapping."""

    def test_is_reverse_of_agent_to_domain(self):
        """DOMAIN_TO_AGENT should be exact reverse of AGENT_TO_DOMAIN."""
        for agent, domain in AGENT_TO_DOMAIN.items():
            assert DOMAIN_TO_AGENT[domain] == agent

    def test_all_domains_have_agent(self):
        """All memory domains should map back to an agent."""
        for domain in MEMORY_DOMAINS:
            assert domain in DOMAIN_TO_AGENT, f"Domain {domain} has no agent mapping"

    def test_domain_count_matches_agent_count(self):
        """Domain to agent count should match agent to domain count."""
        assert len(DOMAIN_TO_AGENT) == len(AGENT_TO_DOMAIN)


class TestGetDefaultMemoryStructure:
    """Tests for get_default_memory_structure function."""

    def test_returns_dict(self):
        """Should return a dictionary."""
        result = get_default_memory_structure()

        assert isinstance(result, dict)

    def test_contains_all_domains(self):
        """Result should contain all memory domains as keys."""
        result = get_default_memory_structure()

        for domain in MEMORY_DOMAINS:
            assert domain in result, f"Missing domain key: {domain}"

    def test_all_values_are_empty_dicts(self):
        """All domain values should be empty dictionaries."""
        result = get_default_memory_structure()

        for domain, value in result.items():
            assert isinstance(value, dict), f"Domain {domain} value is not a dict"
            assert len(value) == 0, f"Domain {domain} is not empty"

    def test_returns_new_instance_each_call(self):
        """Each call should return a new instance (not shared reference)."""
        result1 = get_default_memory_structure()
        result2 = get_default_memory_structure()

        assert result1 is not result2

        # Modifying one should not affect the other
        result1["FINANCE_LEGAL"]["budget"] = "$500,000"
        assert "budget" not in result2["FINANCE_LEGAL"]

    def test_nested_dicts_are_independent(self):
        """Nested dicts should also be independent instances."""
        result1 = get_default_memory_structure()
        result2 = get_default_memory_structure()

        assert result1["FINANCE_LEGAL"] is not result2["FINANCE_LEGAL"]

    def test_domain_count_in_result(self):
        """Result should have exactly 9 domains."""
        result = get_default_memory_structure()

        assert len(result) == 9

    def test_no_extra_keys(self):
        """Result should only contain known domain keys."""
        result = get_default_memory_structure()

        for key in result.keys():
            assert key in MEMORY_DOMAINS, f"Unexpected key: {key}"
