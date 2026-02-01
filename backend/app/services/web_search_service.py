"""
Web Search Service (UC-2)

Handles web searches using OpenRouter :online models.
Uses OpenRouter's built-in web search capability via :online model suffix,
requiring no external API keys.

Key features:
- Automatic detection of queries needing current information
- Location-aware search enhancement
- Citation extraction from responses
- Caching for cost optimization
"""

import logging
import re
from dataclasses import dataclass
from typing import List, Optional

from app.clients.openrouter_service import OpenRouterService
from app.core.config import settings
from app.core.prompt_templates import build_web_search_prompt
from app.schemas.openrouter import ModelParams

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Represents a web search result."""

    title: str
    snippet: str
    url: str
    source: str


class WebSearchService:
    """
    Handles web searches using OpenRouter :online models.

    The :online suffix enables web search for compatible models,
    with results automatically integrated into the response.
    """

    # Keywords that trigger web search (English and Polish)
    SEARCH_TRIGGERS = {
        "pricing": [
            # English
            "current price",
            "cost today",
            "rates in",
            "average cost",
            "how much does",
            "price of",
            "pricing for",
            "land price",
            "plot price",
            "property price",
            "real estate price",
            # Polish
            "cena",
            "ceny",
            "koszt",
            "kosztuje",
            "ile kosztuje",
            "średnia cena",
            "cena działki",
            "cena gruntu",
            "cena ziemi",
            "wycena",
        ],
        "regulations": [
            # English
            "building code",
            "permit requirement",
            "zoning",
            "regulation in",
            "legal requirement",
            "code requirement",
            "ordinance",
            # Polish
            "przepisy",
            "regulacje",
            "pozwolenie",
            "prawo budowlane",
            "warunki zabudowy",
            "mpzp",
            "plan miejscowy",
        ],
        "contractors": [
            # English
            "contractor near",
            "builder in",
            "find a",
            "recommend a",
            "supplier in",
            "company in",
            "service provider",
            # Polish
            "wykonawca",
            "firma budowlana",
            "ekipa",
            "fachowiec",
            "polecić",
            "znaleźć wykonawcę",
        ],
        "market": [
            # English
            "market trend",
            "availability",
            "shortage",
            "current market",
            "supply chain",
            "material availability",
            # Polish
            "rynek",
            "dostępność",
            "oferta",
            "sprzedaż",
            "ogłoszenia",
        ],
        "current_info": [
            # English
            "latest",
            "current",
            "2024",
            "2025",
            "2026",
            "recent",
            "now",
            "today",
            "this year",
            "new regulation",
            "updated",
            # Polish
            "aktualny",
            "aktualne",
            "obecny",
            "teraz",
            "dzisiaj",
            "w tym roku",
            "najnowsze",
            "bieżący",
        ],
        "location_specific": [
            # Location queries often need web search
            "w okolicy",
            "w regionie",
            "blisko",
            "niedaleko",
            "okolice",
            "near",
            "in the area",
            "region",
            "location",
        ],
    }

    def __init__(
        self,
        openrouter_service: OpenRouterService,
        search_model: Optional[str] = None,
        enabled: bool = True,
    ):
        """
        Initialize web search service.

        Args:
            openrouter_service: OpenRouter service for LLM calls
            search_model: Model to use for web search (must support :online suffix)
            enabled: Whether web search is enabled
        """
        self.openrouter_service = openrouter_service
        self.search_model = search_model or settings.openrouter_web_search_model
        self.enabled = enabled and settings.web_search_enabled

        if self.enabled:
            logger.info(f"WebSearchService initialized with model: {self.search_model}")
        else:
            logger.info("WebSearchService initialized but disabled")

    def should_search(
        self,
        query: str,
        project_location: Optional[str] = None,
    ) -> bool:
        """
        Determine if web search would be helpful for this query.

        Analyzes the query for keywords indicating need for current,
        location-specific, or real-time information.

        Args:
            query: User's query text
            project_location: Optional project location for location-aware triggers

        Returns:
            True if web search should be performed
        """
        if not self.enabled:
            logger.debug("Web search disabled")
            return False

        query_lower = query.lower()

        # Check explicit triggers
        for category, triggers in self.SEARCH_TRIGGERS.items():
            for trigger in triggers:
                if trigger in query_lower:
                    logger.info(f"Web search triggered by '{trigger}' (category: {category})")
                    return True

        # Also trigger for queries that mention specific locations/places
        # These often need current local information
        location_patterns = [
            r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b",  # Place names like "Przylasek Rusiecki"
            r"\bdziałk[iaę]\b",  # Polish: działka, działki, działkę
            r"\bgrun[ty]\b",  # Polish: grunt, grunty
            r"\bplot\b",
            r"\bland\b",  # English: plot, land
        ]

        for pattern in location_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                logger.info(f"Web search triggered by location pattern: {pattern}")
                return True

        logger.debug(f"No web search triggers found in: {query[:50]}...")
        return False

    async def search_and_respond(
        self,
        query: str,
        project_context: Optional[str] = None,
        location: Optional[str] = None,
    ) -> str:
        """
        Execute web search via :online model and return synthesized response.

        The :online model automatically searches the web and includes
        citations in its response.

        Args:
            query: Search query
            project_context: Optional project context for grounding
            location: Optional location for location-specific results

        Returns:
            Synthesized response with web search results
        """
        if not self.enabled:
            logger.warning("Web search called but service is disabled")
            return ""

        logger.info(f"Executing web search for: {query[:50]}...")

        # Build search-optimized prompt
        system_prompt = build_web_search_prompt(location)

        # Enhance query with location context
        enhanced_query = query
        if location:
            enhanced_query = f"{query} (Location: {location})"

        if project_context:
            enhanced_query = f"{project_context}\n\nQuestion: {enhanced_query}"

        try:
            result = await self.openrouter_service.chat_completion(
                user_message=enhanced_query,
                system_message=system_prompt,
                model=self.search_model,
                params=ModelParams(temperature=0.3, max_tokens=1000),
            )

            logger.info(f"Web search completed via {self.search_model}")
            return result.content

        except Exception as e:
            logger.error(f"Web search failed: {e}")
            raise

    def extract_citations(self, response: str) -> List[str]:
        """
        Extract URLs from response for citation display.

        Args:
            response: Response text containing URLs

        Returns:
            List of unique URLs found in response
        """
        url_pattern = r"https?://[^\s\)\]<>\"\']+(?=[^\s\)\]<>\"\']*)"
        urls = re.findall(url_pattern, response)
        return list(set(urls))  # Deduplicate

    def format_search_results(self, response: str, citations: List[str]) -> str:
        """
        Format search results for inclusion in agent context.

        Args:
            response: Raw search response
            citations: Extracted citation URLs

        Returns:
            Formatted search results block
        """
        lines = ["=== WEB SEARCH RESULTS ===", "", response, ""]

        if citations:
            lines.append("Sources:")
            for i, url in enumerate(citations[:5], 1):  # Limit to 5 sources
                lines.append(f"  [{i}] {url}")

        lines.append("")
        lines.append("Note: Information above is from recent web search. Cite sources when using.")
        lines.append("===========================")

        return "\n".join(lines)


def get_web_search_service(
    openrouter_service: OpenRouterService,
    search_model: Optional[str] = None,
) -> WebSearchService:
    """
    Factory function for creating WebSearchService instances.

    Args:
        openrouter_service: OpenRouter service for LLM calls
        search_model: Optional custom search model

    Returns:
        WebSearchService instance
    """
    return WebSearchService(
        openrouter_service=openrouter_service,
        search_model=search_model,
    )
