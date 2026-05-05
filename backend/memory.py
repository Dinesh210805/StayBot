"""
Conversation memory management for StayBot.

Session-based in-memory storage. Each session gets isolated conversation history.
Includes DoS protections: max session cap, TTL expiry, no auto-create.
"""

from langchain_core.messages import HumanMessage, AIMessage
import uuid
import time
from threading import Lock


class SessionMemory:
    """Thread-safe session-based conversation memory with abuse protections."""

    MAX_SESSIONS = 500         # Maximum concurrent sessions
    SESSION_TTL = 3600         # Session TTL in seconds (1 hour)
    MAX_MESSAGES = 40          # Keep last N messages per session (20 turns)

    def __init__(self):
        self._sessions: dict[str, list] = {}
        self._last_active: dict[str, float] = {}  # session_id -> last activity timestamp
        self._lock = Lock()

    def create_session(self) -> str:
        """Create a new session and return its ID."""
        with self._lock:
            # Evict expired sessions first
            self._evict_expired()

            # Reject if at capacity
            if len(self._sessions) >= self.MAX_SESSIONS:
                # Evict oldest session to make room
                oldest_id = min(self._last_active, key=self._last_active.get)
                del self._sessions[oldest_id]
                del self._last_active[oldest_id]

            session_id = str(uuid.uuid4())
            self._sessions[session_id] = []
            self._last_active[session_id] = time.time()
            return session_id

    def get_history(self, session_id: str) -> list:
        """Get conversation history for an existing session.
        Returns empty list if session doesn't exist (does NOT auto-create).
        """
        with self._lock:
            if session_id not in self._sessions:
                return []
            # Check TTL
            if self._is_expired(session_id):
                self._remove_session(session_id)
                return []
            self._last_active[session_id] = time.time()
            return list(self._sessions[session_id])

    def add_message(self, session_id: str, role: str, content: str):
        """Add a message to session history. No-op if session doesn't exist."""
        with self._lock:
            if session_id not in self._sessions:
                return

            if self._is_expired(session_id):
                self._remove_session(session_id)
                return

            if role == "human":
                self._sessions[session_id].append(HumanMessage(content=content))
            elif role == "ai":
                self._sessions[session_id].append(AIMessage(content=content))

            # Trim to max messages (keep most recent)
            if len(self._sessions[session_id]) > self.MAX_MESSAGES:
                self._sessions[session_id] = self._sessions[session_id][-self.MAX_MESSAGES:]

            self._last_active[session_id] = time.time()

    def session_exists(self, session_id: str) -> bool:
        """Check if a session exists and is not expired."""
        with self._lock:
            if session_id not in self._sessions:
                return False
            if self._is_expired(session_id):
                self._remove_session(session_id)
                return False
            return True

    def clear_session(self, session_id: str):
        """Clear memory for a session."""
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id] = []
                self._last_active[session_id] = time.time()

    def delete_session(self, session_id: str):
        """Delete a session entirely."""
        with self._lock:
            self._remove_session(session_id)

    def list_sessions(self) -> list[str]:
        """List all active (non-expired) session IDs."""
        with self._lock:
            self._evict_expired()
            return list(self._sessions.keys())

    def active_count(self) -> int:
        """Return count of active sessions."""
        with self._lock:
            self._evict_expired()
            return len(self._sessions)

    # ── Internal ───────────────────────────────────────────────────────────────

    def _is_expired(self, session_id: str) -> bool:
        """Check if a session has exceeded its TTL."""
        last = self._last_active.get(session_id, 0)
        return (time.time() - last) > self.SESSION_TTL

    def _remove_session(self, session_id: str):
        """Remove a session without acquiring lock (caller must hold lock)."""
        self._sessions.pop(session_id, None)
        self._last_active.pop(session_id, None)

    def _evict_expired(self):
        """Remove all expired sessions (caller must hold lock)."""
        now = time.time()
        expired = [
            sid for sid, last in self._last_active.items()
            if (now - last) > self.SESSION_TTL
        ]
        for sid in expired:
            self._remove_session(sid)
        if expired:
            print(f"[MEMORY] Evicted {len(expired)} expired sessions")


# Global memory instance
memory_store = SessionMemory()
