"""
Observability for StayBot — request metrics, RAG pipeline stats, token usage.

Design:
  - ContextVar holds a mutable RequestContext for the lifetime of one async request.
  - Tools write RAG timing + scores into it directly.
  - agent.py finalises it into an immutable RequestRecord and pushes it to MetricsStore.
  - GET /api/metrics reads MetricsStore.summary() — no DB, all in-memory.
"""

import time
import threading
import statistics
from collections import deque, defaultdict
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Optional


# ── Per-request mutable context (async-safe via ContextVar) ───────────────────

@dataclass
class RequestContext:
    request_id: str
    session_id: str
    start_time: float = field(default_factory=time.monotonic)
    tool_calls: list[str] = field(default_factory=list)
    # RAG pipeline timings (set by search_tool.py)
    rag_embedding_ms: Optional[float] = None
    rag_retrieval_ms: Optional[float] = None
    rag_scores: list[float] = field(default_factory=list)
    rag_results_count: int = 0
    # LLM token usage (set by agent.py after ainvoke)
    input_tokens: int = 0
    output_tokens: int = 0
    # Retry tracking
    retries: int = 0
    error: bool = False


_request_ctx: ContextVar[Optional[RequestContext]] = ContextVar("request_ctx", default=None)


def set_request_context(ctx: RequestContext) -> None:
    _request_ctx.set(ctx)


def get_request_context() -> Optional[RequestContext]:
    return _request_ctx.get()


# ── Immutable record stored after each request ────────────────────────────────

@dataclass(frozen=True)
class RequestRecord:
    request_id: str
    session_id: str
    timestamp: float
    latency_ms: float
    tool_calls: tuple[str, ...]
    rag_embedding_ms: Optional[float]
    rag_retrieval_ms: Optional[float]
    rag_avg_score: Optional[float]
    rag_min_score: Optional[float]
    rag_max_score: Optional[float]
    rag_results_count: int
    input_tokens: int
    output_tokens: int
    retries: int
    error: bool


# ── Metrics store ─────────────────────────────────────────────────────────────

_MAX_HISTORY = 1000  # sliding window; increase for longer-running deployments


class MetricsStore:
    """Thread-safe in-memory metrics store with percentile histogram support."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._records: deque[RequestRecord] = deque(maxlen=_MAX_HISTORY)
        self._tool_counts: dict[str, int] = defaultdict(int)
        self._total_requests: int = 0
        self._total_errors: int = 0
        self._total_input_tokens: int = 0
        self._total_output_tokens: int = 0

    def record(self, rec: RequestRecord) -> None:
        with self._lock:
            self._records.append(rec)
            self._total_requests += 1
            if rec.error:
                self._total_errors += 1
            self._total_input_tokens += rec.input_tokens
            self._total_output_tokens += rec.output_tokens
            for t in rec.tool_calls:
                self._tool_counts[t] += 1

    def summary(self) -> dict:
        with self._lock:
            records = list(self._records)
            tool_counts = dict(self._tool_counts)
            total_req = self._total_requests
            total_err = self._total_errors
            total_in = self._total_input_tokens
            total_out = self._total_output_tokens

        if not records:
            return {"total_requests": 0, "note": "No requests recorded yet."}

        def pct(data: list[float], p: int) -> float:
            if not data:
                return 0.0
            s = sorted(data)
            idx = max(0, min(int(len(s) * p / 100), len(s) - 1))
            return round(s[idx], 2)

        latencies = [r.latency_ms for r in records]
        rag_recs = [r for r in records if r.rag_embedding_ms is not None]
        embed_ms = [r.rag_embedding_ms for r in rag_recs]
        retr_ms = [r.rag_retrieval_ms for r in rag_recs if r.rag_retrieval_ms is not None]
        scores = [r.rag_avg_score for r in rag_recs if r.rag_avg_score is not None]

        return {
            "overview": {
                "total_requests": total_req,
                "error_rate_pct": round(total_err / total_req * 100, 2),
                "window": f"last {len(records)} of {_MAX_HISTORY} max",
            },
            "latency_ms": {
                "p50": pct(latencies, 50),
                "p75": pct(latencies, 75),
                "p95": pct(latencies, 95),
                "p99": pct(latencies, 99),
                "avg": round(statistics.mean(latencies), 2),
                "min": round(min(latencies), 2),
                "max": round(max(latencies), 2),
            },
            "tokens": {
                "total_input": total_in,
                "total_output": total_out,
                "avg_input_per_req": round(total_in / total_req, 1),
                "avg_output_per_req": round(total_out / total_req, 1),
            },
            "tool_usage": dict(sorted(tool_counts.items(), key=lambda x: -x[1])),
            "rag": {
                "total_semantic_searches": len(rag_recs),
                "embedding_latency_ms": {
                    "avg": round(statistics.mean(embed_ms), 2) if embed_ms else None,
                    "p95": pct(embed_ms, 95),
                },
                "retrieval_latency_ms": {
                    "avg": round(statistics.mean(retr_ms), 2) if retr_ms else None,
                    "p95": pct(retr_ms, 95),
                },
                "relevance_score": {
                    "avg": round(statistics.mean(scores), 4) if scores else None,
                    "min": round(min(scores), 4) if scores else None,
                    "max": round(max(scores), 4) if scores else None,
                },
            } if rag_recs else None,
            "recent_requests": [
                {
                    "id": r.request_id,
                    "latency_ms": round(r.latency_ms, 1),
                    "tools": list(r.tool_calls),
                    "tokens_in": r.input_tokens,
                    "tokens_out": r.output_tokens,
                    "rag": r.rag_embedding_ms is not None,
                    "retries": r.retries,
                    "error": r.error,
                }
                for r in records[-10:]
            ],
        }


metrics_store = MetricsStore()
