"""
Web Search Tool for StayBot.

Uses the Tavily API (1,000 free searches/month) to search the live internet
for travel tips, events, visa info, and other real-time information.
Falls back to a helpful message if TAVILY_API_KEY is not set.
"""

import os
from langchain_core.tools import tool

_tavily_available = False
_tavily_search = None


def _init_tavily():
    """Lazy-init Tavily client."""
    global _tavily_available, _tavily_search
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        _tavily_available = False
        return

    try:
        from langchain_tavily import TavilySearch
        _tavily_search = TavilySearch(
            max_results=5,
            topic="general",
            tavily_api_key=api_key,
        )
        _tavily_available = True
    except ImportError:
        # Try older import path as fallback
        try:
            from langchain_community.tools.tavily_search import TavilySearchResults
            _tavily_search = TavilySearchResults(
                max_results=5,
                tavily_api_key=api_key,
            )
            _tavily_available = True
        except ImportError:
            _tavily_available = False


@tool
def web_search(query: str) -> str:
    """Search the live internet for travel-related information. Use this tool when
    the user asks about local events, festivals, visa requirements, travel advisories,
    transportation, best time to visit, or any real-time information that is NOT
    about specific listings in the database.

    Args:
        query: The search query (e.g., 'music festivals in Cape Town June 2026',
               'do I need a visa for Thailand', 'best time to visit London')

    Returns:
        Search results with summaries and source URLs
    """
    global _tavily_available, _tavily_search

    if _tavily_search is None:
        _init_tavily()

    if not _tavily_available or _tavily_search is None:
        return (
            "Web search is not available (TAVILY_API_KEY not configured). "
            "I can still help you with listing searches, bookings, weather, "
            "and nearby places using my other tools!"
        )

    try:
        results = _tavily_search.invoke(query)

        # Handle different response formats
        if isinstance(results, str):
            return f"Web search results for '{query}':\n\n{results}"

        if isinstance(results, list):
            lines = [f"Web search results for '{query}':\n"]
            for i, result in enumerate(results, 1):
                if isinstance(result, dict):
                    title = result.get("title", result.get("name", ""))
                    content = result.get("content", result.get("snippet", ""))
                    url = result.get("url", result.get("link", ""))
                    lines.append(f"{i}. **{title}**")
                    if content:
                        # Truncate long content
                        lines.append(f"   {content[:200]}...")
                    if url:
                        lines.append(f"   Source: {url}")
                    lines.append("")
                else:
                    lines.append(f"{i}. {str(result)[:200]}")

            return "\n".join(lines)

        return f"Search results: {str(results)[:500]}"

    except Exception as e:
        return (
            f"Web search encountered an error: {str(e)[:100]}. "
            f"I can still help you with listings, bookings, weather, and nearby places!"
        )
