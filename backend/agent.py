"""
LangChain Agent for StayBot with Round-Robin API Key Load Balancing.

Rotates across GROQ_API_KEY_1, GROQ_API_KEY_2, GROQ_API_KEY_3 per request,
with automatic failover: if a key hits rate-limit (429) or auth error (401),
it marks it as temporarily exhausted and tries the next key.
"""

import os
import re
import time
import threading
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage

from backend.prompts import SYSTEM_PROMPT
from backend.memory import memory_store
from backend.tools.search_tool import search_listings_semantic
from backend.tools.sql_tool import filter_listings
from backend.tools.faq_tool import search_faqs
from backend.tools.detail_tool import get_listing_details
from backend.tools.price_tool import calculate_price_breakdown
from backend.tools.compare_tool import compare_listings

load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────────

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

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

print(f"[AGENT] Loaded {len(_API_KEYS)} Groq API key(s) — round-robin enabled")

# ── Round-Robin Key Manager ────────────────────────────────────────────────────

class KeyManager:
    """
    Thread-safe round-robin API key rotator with per-key cooldown on rate limits.
    
    On 429 → marks key as exhausted for `cooldown_seconds`, tries next key.
    On 401 → marks key as permanently bad (skipped until restart).
    Tracks usage count per key for observability.
    """

    RATE_LIMIT_COOLDOWN = 60   # seconds to wait before retrying a rate-limited key
    MAX_RETRIES = 3            # max attempts across keys before giving up

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

    def mark_rate_limited(self, key: str):
        """Mark a key as temporarily exhausted due to 429."""
        with self._lock:
            self._cooldown_until[key] = time.time() + self.RATE_LIMIT_COOLDOWN
            print(f"[KEY-MANAGER] Key ...{key[-6:]} rate-limited, cooldown {self.RATE_LIMIT_COOLDOWN}s")

    def mark_bad(self, key: str):
        """Mark a key as permanently invalid (401)."""
        with self._lock:
            self._bad_keys.add(key)
            print(f"[KEY-MANAGER] Key ...{key[-6:]} marked as invalid (auth error)")

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


key_manager = KeyManager(_API_KEYS)

# ── Tools ──────────────────────────────────────────────────────────────────────

TOOLS = [
    search_listings_semantic,
    filter_listings,
    search_faqs,
    get_listing_details,
    calculate_price_breakdown,
    compare_listings,
]


# ── Agent Builder with Cache ──────────────────────────────────────────────────

_agent_cache: dict[str, object] = {}


def _get_agent(api_key: str):
    """Get or build a cached LangGraph agent for the given API key."""
    if api_key not in _agent_cache:
        llm = ChatGroq(
            model=GROQ_MODEL,
            temperature=0.7,
            max_tokens=2048,
            api_key=api_key,
        )
        _agent_cache[api_key] = create_react_agent(model=llm, tools=TOOLS, prompt=SYSTEM_PROMPT)
    return _agent_cache[api_key]


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

    last_error = None
    for attempt in range(KeyManager.MAX_RETRIES):
        api_key = key_manager.get_next_key()

        if api_key is None:
            print("[AGENT] All keys exhausted or rate-limited")
            return (
                "I'm experiencing high demand across all API keys. "
                "Please try again in a minute!"
            )

        try:
            agent = _get_agent(api_key)
            result = await agent.ainvoke({"messages": messages})

            # Extract the last AI text response
            response = ""
            for msg in reversed(result.get("messages", [])):
                if type(msg).__name__ == "AIMessage" and msg.content:
                    response = msg.content
                    break

            if not response:
                response = "I'm sorry, I couldn't generate a response. Could you try rephrasing?"

            # Save to memory only on success
            memory_store.add_message(session_id, "human", message)
            memory_store.add_message(session_id, "ai", response)

            key_short = f"...{api_key[-6:]}"
            print(f"[AGENT] Success on attempt {attempt+1} using key {key_short}")
            return response

        except Exception as e:
            error_msg = str(e)
            last_error = error_msg
            print(f"[AGENT] Attempt {attempt+1} failed with key ...{api_key[-6:]}: {error_msg[:120]}")

            if "429" in error_msg or "rate_limit" in error_msg.lower():
                key_manager.mark_rate_limited(api_key)
                continue
            elif "401" in error_msg or "invalid_api_key" in error_msg.lower():
                key_manager.mark_bad(api_key)
                # Invalidate cached agent for this key
                _agent_cache.pop(api_key, None)
                continue
            elif "tool_use_failed" in error_msg:
                # Bad tool call format — don't retry, return graceful message
                return (
                    "I had trouble processing that request. "
                    "Could you rephrase it? For example: 'Find apartments in Bangkok under $100'"
                )
            else:
                # Unknown error — return immediately
                print(f"[AGENT ERROR] Unhandled: {error_msg}")
                return (
                    "I encountered an unexpected issue. "
                    "Could you try rephrasing or asking something else?"
                )

    # All retries exhausted
    print(f"[AGENT] All {KeyManager.MAX_RETRIES} attempts failed. Last: {last_error}")
    return "I'm experiencing issues right now. Please try again in a moment!"


def get_key_status() -> dict:
    """Return the current API key rotation status."""
    return key_manager.status()
