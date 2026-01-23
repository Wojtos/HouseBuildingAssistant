"""
Memory domain definitions aligned with agent specializations.

This module defines the canonical memory domain names used throughout
the application for organizing project facts and routing context.
"""

from typing import List

# Canonical memory domains matching agent specializations
MEMORY_DOMAINS: List[str] = [
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

# Map agent IDs to their primary memory domains
AGENT_TO_DOMAIN: dict[str, str] = {
    "LAND_FEASIBILITY_AGENT": "LAND_FEASIBILITY",
    "REGULATORY_PERMITTING_AGENT": "REGULATORY_PERMITTING",
    "ARCHITECTURAL_DESIGN_AGENT": "ARCHITECTURAL_DESIGN",
    "FINANCE_LEGAL_AGENT": "FINANCE_LEGAL",
    "SITE_PREP_FOUNDATION_AGENT": "SITE_PREP_FOUNDATION",
    "SHELL_SYSTEMS_AGENT": "SHELL_SYSTEMS",
    "PROCUREMENT_QUALITY_AGENT": "PROCUREMENT_QUALITY",
    "FINISHES_FURNISHING_AGENT": "FINISHES_FURNISHING",
    "TRIAGE_MEMORY_AGENT": "GENERAL",
}

# Map domains back to their agents (reverse lookup)
DOMAIN_TO_AGENT: dict[str, str] = {v: k for k, v in AGENT_TO_DOMAIN.items()}


def get_default_memory_structure() -> dict[str, dict]:
    """
    Get default memory structure with domain keys.
    
    Returns:
        Dictionary with domain keys initialized to empty dicts
    """
    return {domain: {} for domain in MEMORY_DOMAINS}
