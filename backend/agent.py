"""
LangChain Agent for StayBot with Round-Robin API Key Load Balancing.

Rotates across GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3 per request,
with automatic failover: if a key hits rate-limit (429) or auth error (401),
it marks it as temporarily exhausted and tries the next key.
"""

import os
import re
import time
import uuid
import statistics
import threading
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage

from backend.logger import get_logger
from backend.prompts import SYSTEM_PROMPT
from backend.memory import memory_store
from backend.observability import (
    RequestContext,
    RequestRecord,
    set_request_context,
    get_request_context,
    metrics_store,
)
from backend.tools.search_tool import search_listings_semantic
from backend.tools.sql_tool import filter_listings
from backend.tools.faq_tool import search_faqs
from backend.tools.detail_tool import get_listing_details
from backend.tools.price_tool import calculate_price_breakdown
from backend.tools.compare_tool import compare_listings
from backend.tools.booking_tool import check_availability, book_listing
from backend.tools.memory_tool import save_user_preferences, load_user_preferences, update_memory_summary
from backend.tools.weather_tool import get_weather_forecast
from backend.tools.places_tool import search_nearby_places
from backend.tools.web_search_tool import web_search

load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────────

# gpt-oss-* are Groq's reference models for native tool calling. Llama-3.3-70b
# and Llama-4-Scout fail to emit valid tool calls for our schemas even at
# temperature 0 (verified empirically), so they are NOT a safe default here.
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# Collect all API keys from env (GROQ_API_KEY_1, _2, _3, ...)
_API_KEYS = []
for i in range(1, 10):  # supports up to 9 keys
    key = os.getenv(f"GROQ_API_KEY_{i}")
    if key:
        _API_KEYS.append(key)

# Also accept plain GROQ_API_KEY as fallback
if not _API_KEYS:
    single = os.getenv("GROQ_API_KEY")
    if single:
        _API_KEYS.append(single)

if not _API_KEYS:
    raise ValueError(
        "No Groq API keys found. Set GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3 in .env"
    )

log = get_logger("agent")
log.info("agent.keys_loaded", key_count=len(_API_KEYS))

# ── Round-Robin Key Manager ────────────────────────────────────────────────────

class KeyManager:
    """
    Thread-safe round-robin API key rotator with per-key cooldown on rate limits.
    
    On 429 → marks key as exhausted for `cooldown_seconds`, tries next key.
    On 401 → marks key as permanently bad (skipped until restart).
    Tracks usage count per key for observability.
    """

    RATE_LIMIT_COOLDOWN = 60   # seconds to wait before retrying a rate-limited key
    MAX_RETRIES = 5            # max attempts across keys before giving up

    def __init__(self, keys: list[str]):
        self._keys = keys
        self._index = 0
        self._lock = threading.Lock()
        # key → timestamp when it can be used again (0 = available)
        self._cooldown_until: dict[str, float] = {k: 0.0 for k in keys}
        # key → "bad" flag for permanent auth failures
        self._bad_keys: set[str] = set()
        # usage stats
        self._usage: dict[str, int] = {k: 0 for k in keys}

    def get_next_key(self) -> str | None:
        """Get the next available key in round-robin order."""
        with self._lock:
            now = time.time()
            available = [
                k for k in self._keys
                if k not in self._bad_keys and self._cooldown_until[k] <= now
            ]
            if not available:
                return None
            # round-robin among available keys
            self._index = self._index % len(available)
            key = available[self._index % len(available)]
            self._index = (self._index + 1) % len(available)
            self._usage[key] = self._usage.get(key, 0) + 1
            return key

    def mark_rate_limited(self, key: str, cooldown_seconds: float | None = None):
        """Mark a key as temporarily exhausted due to 429."""
        cooldown = max(1, int(cooldown_seconds or self.RATE_LIMIT_COOLDOWN))
        with self._lock:
            self._cooldown_until[key] = time.time() + cooldown
            log.warning("key_manager.rate_limited", key_suffix=key[-6:], cooldown_s=cooldown)

    def mark_bad(self, key: str):
        """Mark a key as permanently invalid (401)."""
        with self._lock:
            self._bad_keys.add(key)
            log.error("key_manager.invalid_key", key_suffix=key[-6:])

    def status(self) -> dict:
        """Return current key status for monitoring."""
        now = time.time()
        return {
            "total_keys": len(self._keys),
            "bad_keys": len(self._bad_keys),
            "rate_limited_keys": sum(
                1 for k, t in self._cooldown_until.items()
                if t > now and k not in self._bad_keys
            ),
            "available_keys": sum(
                1 for k in self._keys
                if k not in self._bad_keys and self._cooldown_until[k] <= now
            ),
            "usage_per_key": {
                f"key_{i+1}": self._usage.get(k, 0)
                for i, k in enumerate(self._keys)
            },
        }

    def seconds_until_available(self) -> int:
        """Return seconds until the next non-bad key exits cooldown."""
        with self._lock:
            now = time.time()
            waits = [
                t - now for k, t in self._cooldown_until.items()
                if k not in self._bad_keys and t > now
            ]
        return max(1, int(min(waits))) if waits else 0

    def each_key_status(self) -> list[dict]:
        """Return per-key status for TUI dashboard."""
        now = time.time()
        with self._lock:
            result = []
            for i, key in enumerate(self._keys):
                if key in self._bad_keys:
                    state, eta = "INVALID", None
                elif self._cooldown_until[key] > now:
                    state, eta = "COOLING", int(self._cooldown_until[key] - now)
                else:
                    state, eta = "READY", None
                result.append({
                    "index": i + 1,
                    "state": state,
                    "eta_seconds": eta,
                    "usage": self._usage.get(key, 0),
                })
        return result


key_manager = KeyManager(_API_KEYS)

# ── Tools ──────────────────────────────────────────────────────────────────────

TOOLS = [
    # Search & Discovery
    search_listings_semantic,
    filter_listings,
    search_faqs,
    get_listing_details,
    calculate_price_breakdown,
    compare_listings,
    # Booking Engine
    check_availability,
    book_listing,
    # Persistent Memory
    save_user_preferences,
    load_user_preferences,
    update_memory_summary,
    # Trip Planner
    get_weather_forecast,
    search_nearby_places,
    web_search,
]


# ── Agent Builder with Cache ──────────────────────────────────────────────────

_TOOL_BY_NAME = {tool.name: tool for tool in TOOLS}
_DEFAULT_TOOL_NAMES = ("search_listings_semantic", "filter_listings", "search_faqs")

_agent_cache: dict[tuple[str, bool, tuple[str, ...]], object] = {}

_TOOL_RETRY_PROMPT = """

## Tool Calling Retry Mode
- Use only the platform's native tool-call mechanism.
- Do not write XML, pseudo-code, markdown code blocks, or raw `<function=...>` text.
- If a tool is needed, call exactly one tool with valid JSON arguments.
- If no tool is needed, answer directly in concise markdown.
"""


def _select_tool_names(message: str) -> tuple[str, ...]:
    """Select a small, relevant tool set for the user's latest request.

    Groq function calling becomes much less reliable when the model receives a
    large list of similar tools. Keep the schema surface tight per turn.
    """
    text = message.lower()
    selected: list[str] = []
    has_listing_reference = bool(
        re.search(r"\b(listing|property|place|stay)\s*#?\s*\d+\b|\b(id|details?)\s*#?\s*\d+\b", text)
    )

    def add(*names: str) -> None:
        for name in names:
            if name in _TOOL_BY_NAME and name not in selected:
                selected.append(name)

    if re.search(r"\b(weather|temperature|rain|forecast|climate|hot|cold)\b", text):
        add("get_weather_forecast")

    if has_listing_reference and re.search(r"\b(nearby|near|restaurant|cafe|bar|museum|park|gym|beach|attraction|things to do|around)\b", text):
        add("search_nearby_places", "get_listing_details")

    if re.search(r"\b(event|festival|visa|advisory|current|latest|today|tomorrow|transport|train|flight)\b", text):
        add("web_search")

    if re.search(r"\b(book|reserve|reservation|confirm)\b", text):
        add("check_availability", "book_listing", "calculate_price_breakdown")
    elif re.search(r"\b(available|availability|check[- ]?in|check[- ]?out|dates?|nights?)\b", text):
        add("check_availability", "calculate_price_breakdown")

    if re.search(r"\b(price|cost|total|how much|fee|fees|breakdown|budget)\b", text):
        add("calculate_price_breakdown", "filter_listings")

    if re.search(r"\b(compare|versus| vs |difference|better between)\b", text):
        add("compare_listings", "get_listing_details")

    if has_listing_reference:
        add("get_listing_details")

    if re.search(r"\b(cancel|refund|policy|policies|rules|faq|how does|how do i)\b", text):
        add("search_faqs")

    if re.search(r"\b(i am|i'm|im |my name|remember|prefer|preference|i like|i want)\b", text):
        add("load_user_preferences", "save_user_preferences")

    has_listing_action = bool(
        re.search(r"\b(show|find|search|list|recommend|suggest|stays?|places?|properties?|rooms?)\b", text)
        and re.search(r"\b(bangkok|london|cape town|istanbul|under|over|guests?|bed|bedroom|bath|villa|apartment|house|condo|studio|loft|pool|pet|wifi|temple|temples|beach)\b", text)
    )
    has_listing_criteria = bool(
        re.search(r"\b(under|over|guests?|bed|bedroom|bath|villa|apartment|house|condo|studio|loft|pool|pet|wifi|temple|temples|beach)\b", text)
    )
    if has_listing_action or has_listing_criteria:
        add("filter_listings", "search_listings_semantic")

    if not selected:
        add(*_DEFAULT_TOOL_NAMES)

    return tuple(selected)


def _get_agent(api_key: str, tool_names: tuple[str, ...], strict_tool_mode: bool = False):
    """Get or build a cached LangGraph agent for the given API key."""
    cache_key = (api_key, strict_tool_mode, tool_names)
    if cache_key not in _agent_cache:
        # Groq recommends temperature 0.0-0.5 for reliable tool calling; 0.7 is
        # above that range and increases malformed-tool-call rates. Strict-retry
        # drops near-deterministic to recover from a generation failure.
        llm = ChatGroq(
            model=GROQ_MODEL,
            temperature=0.1 if strict_tool_mode else 0.4,
            max_tokens=600,
            api_key=api_key,
        )
        prompt = SYSTEM_PROMPT + (_TOOL_RETRY_PROMPT if strict_tool_mode else "")
        tools = [_TOOL_BY_NAME[name] for name in tool_names]
        _agent_cache[cache_key] = create_react_agent(model=llm, tools=tools, prompt=prompt)
    return _agent_cache[cache_key]


def _is_rate_limit_error(error_msg: str) -> bool:
    """Return True when Groq reports a quota/rate-limit failure."""
    normalized = error_msg.lower()
    return "429" in error_msg or "rate_limit" in normalized or "rate limit" in normalized


def _is_auth_error(error_msg: str) -> bool:
    """Return True when Groq reports an invalid API key."""
    normalized = error_msg.lower()
    return "401" in error_msg or "invalid_api_key" in normalized or "invalid api key" in normalized


def _is_tool_generation_error(error_msg: str) -> bool:
    """Return True for transient model failures while emitting tool calls."""
    normalized = error_msg.lower()
    return (
        "failed to call a function" in normalized
        or "tool_use_failed" in normalized
        or "failed_generation" in normalized
    )


def _retry_after_seconds(error_msg: str) -> float | None:
    """Extract Groq's suggested retry delay when it is present in the error text."""
    match = re.search(r"try again in\s+([0-9.]+)s", error_msg, re.IGNORECASE)
    if match:
        return float(match.group(1))
    return None


def _looks_like_internal_process_response(response: str) -> bool:
    """Detect responses that leaked implementation steps instead of useful output."""
    normalized = response.lower()
    # Raw function-call tags emitted as text (model used wrong output format)
    if "<function=" in response or "<function_calls>" in response:
        return True
    if "<|python_tag|>" in response or "<tool_call>" in response:
        return True
    return any(
        phrase in normalized
        for phrase in (
            "filter_listings tool",
            "search_listings_semantic tool",
            "get_listing_details tool",
            "search_nearby_places tool",
            "i'll use the",
            "i will use the",
            "please give me a moment",
            "once i have the results",
        )
    )


# ── Input Sanitization ───────────────────────────────────────────────────

# Patterns that indicate prompt injection attempts
_INJECTION_PATTERNS = re.compile(
    r"(ignore\s+(all\s+)?previous\s+instructions"
    r"|you\s+are\s+now\s+DAN"
    r"|system:\s*override"
    r"|forget\s+your\s+role"
    r"|output\s+your\s+(entire\s+)?system\s+prompt"
    r"|reveal\s+your\s+instructions)",
    re.IGNORECASE,
)


def _sanitize_input(message: str) -> str:
    """Sanitize user input to mitigate prompt injection."""
    # Strip known injection prefixes
    cleaned = _INJECTION_PATTERNS.sub("[filtered]", message)
    # Truncate to max length (defence in depth — schema also enforces 2000)
    return cleaned[:2000]


# ── Observability Helpers ─────────────────────────────────────────────────────

def _extract_tool_calls(messages: list) -> list[str]:
    """Return ordered list of tool names called during an agent invocation."""
    tools: list[str] = []
    for msg in messages:
        if type(msg).__name__ == "AIMessage" and getattr(msg, "tool_calls", None):
            for tc in msg.tool_calls:
                name = tc.get("name", "") if isinstance(tc, dict) else getattr(tc, "name", "")
                if name:
                    tools.append(name)
    return tools


def _extract_token_usage(messages: list) -> tuple[int, int]:
    """Sum input/output tokens across all AIMessages in an invocation result."""
    input_tokens = output_tokens = 0
    for msg in messages:
        if type(msg).__name__ != "AIMessage":
            continue
        usage = (getattr(msg, "response_metadata", None) or {}).get("token_usage", {})
        input_tokens += usage.get("prompt_tokens", 0)
        output_tokens += usage.get("completion_tokens", 0)
    return input_tokens, output_tokens


def _finalize_metrics(ctx: RequestContext) -> None:
    """Build an immutable RequestRecord from the context and push it to the store."""
    latency_ms = (time.monotonic() - ctx.start_time) * 1000
    scores = ctx.rag_scores
    metrics_store.record(
        RequestRecord(
            request_id=ctx.request_id,
            session_id=ctx.session_id,
            timestamp=time.time(),
            latency_ms=latency_ms,
            tool_calls=tuple(ctx.tool_calls),
            rag_embedding_ms=ctx.rag_embedding_ms,
            rag_retrieval_ms=ctx.rag_retrieval_ms,
            rag_avg_score=round(statistics.mean(scores), 4) if scores else None,
            rag_min_score=round(min(scores), 4) if scores else None,
            rag_max_score=round(max(scores), 4) if scores else None,
            rag_results_count=ctx.rag_results_count,
            input_tokens=ctx.input_tokens,
            output_tokens=ctx.output_tokens,
            retries=ctx.retries,
            error=ctx.error,
        )
    )


# ── Public API ─────────────────────────────────────────────────────────────────

async def chat(session_id: str, message: str) -> str:
    """
    Process a user message through the agent, rotating API keys on failures.

    Args:
        session_id: The conversation session ID
        message: The user's natural language message

    Returns:
        The agent's response string
    """
    message = _sanitize_input(message)
    chat_history = memory_store.get_history(session_id)
    messages = chat_history + [HumanMessage(content=message)]
    tool_names = _select_tool_names(message)
    log.info("agent.request", session_id=session_id, tools=list(tool_names))

    # Initialise per-request observability context
    req_ctx = RequestContext(
        request_id=uuid.uuid4().hex[:8],
        session_id=session_id,
    )
    set_request_context(req_ctx)

    last_error = None
    strict_tool_retry = False
    tool_generation_failures = 0
    for attempt in range(KeyManager.MAX_RETRIES):
        api_key = key_manager.get_next_key()

        if api_key is None:
            log.error("agent.all_keys_exhausted", session_id=session_id)
            req_ctx.error = True
            _finalize_metrics(req_ctx)
            wait_seconds = key_manager.seconds_until_available()
            if wait_seconds:
                return (
                    "I'm experiencing high demand across all API keys. "
                    f"Please try again in about {wait_seconds} seconds."
                )
            return (
                "I'm experiencing high demand across all API keys. "
                "Please try again in a minute!"
            )

        try:
            agent = _get_agent(api_key, tool_names, strict_tool_mode=strict_tool_retry)
            result = await agent.ainvoke({"messages": messages})
            result_messages = result.get("messages", [])

            # Collect observability data from result messages
            req_ctx.tool_calls = _extract_tool_calls(result_messages)
            in_tok, out_tok = _extract_token_usage(result_messages)
            req_ctx.input_tokens = in_tok
            req_ctx.output_tokens = out_tok
            req_ctx.retries = attempt

            # Extract the last AI text response
            response = ""
            for msg in reversed(result_messages):
                if type(msg).__name__ == "AIMessage" and msg.content:
                    response = msg.content
                    break

            if not response:
                response = "I'm sorry, I couldn't generate a response. Could you try rephrasing?"

            if _looks_like_internal_process_response(response):
                response = (
                    "I got stuck before showing the results. Please send that search once more, "
                    "and I'll return the matching stays directly."
                )

            # Save to memory only on success
            memory_store.add_message(session_id, "human", message)
            memory_store.add_message(session_id, "ai", response)

            log.info("agent.success", session_id=session_id, attempt=attempt + 1, key_suffix=api_key[-6:])
            _finalize_metrics(req_ctx)
            return response

        except Exception as e:
            error_msg = str(e)
            last_error = error_msg
            log.warning("agent.attempt_failed", session_id=session_id, attempt=attempt + 1, key_suffix=api_key[-6:], error=error_msg[:120])

            if _is_rate_limit_error(error_msg):
                key_manager.mark_rate_limited(api_key, _retry_after_seconds(error_msg))
                continue
            elif _is_auth_error(error_msg):
                key_manager.mark_bad(api_key)
                # Invalidate cached agent for this key
                for cache_key in list(_agent_cache):
                    if cache_key[0] == api_key:
                        _agent_cache.pop(cache_key, None)
                continue
            elif _is_tool_generation_error(error_msg):
                # Bad tool call format — retry with a stricter low-temperature agent.
                tool_generation_failures += 1
                if tool_generation_failures > 2:
                    req_ctx.error = True
                    req_ctx.retries = attempt
                    _finalize_metrics(req_ctx)
                    return (
                        "I had trouble formatting that tool request. "
                        "Could you rephrase it with the city, dates, budget, or listing ID?"
                    )
                log.warning("agent.tool_generation_failed", session_id=session_id, attempt=attempt + 1)
                import asyncio
                await asyncio.sleep(0.5)
                strict_tool_retry = True
                continue
            else:
                # Unknown error — return immediately
                log.error("agent.unhandled_error", session_id=session_id, error=error_msg)
                req_ctx.error = True
                req_ctx.retries = attempt
                _finalize_metrics(req_ctx)
                return (
                    "I encountered an unexpected issue. "
                    "Could you try rephrasing or asking something else?"
                )

    # All retries exhausted
    req_ctx.error = True
    req_ctx.retries = KeyManager.MAX_RETRIES
    _finalize_metrics(req_ctx)
    log.error("agent.all_retries_exhausted", session_id=session_id, last_error=last_error)
    return "I'm experiencing issues right now. Please try again in a moment!"


def get_key_status() -> dict:
    """Return the current API key rotation status."""
    status = key_manager.status()
    status["keys"] = key_manager.each_key_status()
    return status
