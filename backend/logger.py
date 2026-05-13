"""
Structured logging for StayBot.

LOG_FORMAT=pretty  → human-readable colored output (default, dev)
LOG_FORMAT=json    → newline-delimited JSON (production / log aggregators)
"""

import os
from collections import deque

import structlog

_json_mode = os.getenv("LOG_FORMAT", "pretty").lower() == "json"

# Shared log buffer — consumed by the TUI dashboard in run.py.
# Always populated regardless of whether TUI is active; harmless overhead.
tui_log_buffer: deque = deque(maxlen=80)


def _tui_capture_processor(logger, method, event_dict):
    """Copy each structured log event into tui_log_buffer (non-destructive)."""
    ts = event_dict.get("timestamp", "")
    ts_display = ts[11:19] if len(ts) >= 19 else (ts or "??:??:??")
    level = (event_dict.get("level") or method or "info").upper()
    event = str(event_dict.get("event", ""))
    extras = " ".join(
        f"{k}={v}"
        for k, v in event_dict.items()
        if k not in ("event", "level", "timestamp", "logger", "exc_info", "stack_info")
        and not k.startswith("_")
    )
    msg = f"{event}  {extras}".strip() if extras else event
    tui_log_buffer.append((ts_display, level, msg))
    return event_dict


structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        _tui_capture_processor,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer() if _json_mode else structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)


def get_logger(name: str = "staybot"):
    return structlog.get_logger(name)
