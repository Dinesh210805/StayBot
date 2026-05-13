#!/usr/bin/env python3
"""
StayBot launcher -- starts backend + frontend with a live split-pane TUI.

Usage:
    python run.py          # TUI dashboard (default)
    python run.py --no-tui # Raw terminal output, no dashboard
"""

import os
import re
import sys
import time
import threading
import subprocess
import argparse
from collections import deque
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

_VERSION = "0.1.0"
_BACKEND_PORT = int(os.getenv("PORT", 8000))
_FRONTEND_PORT = 3000
_ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
_ROOT = Path(__file__).parent
_FRONTEND_DIR = _ROOT / "frontend"
_NPM = "npm.cmd" if sys.platform == "win32" else "npm"

# Strip ANSI escape sequences (color codes, cursor moves, etc.)
_ANSI_RE = re.compile(r"\x1b(?:\[[0-9;?]*[a-zA-Z]|\][^\x07]*\x07|[()][AB012])")

_backend_logs: deque = deque(maxlen=100)
_frontend_logs: deque = deque(maxlen=100)
_procs: list = []

_metrics_data: dict = {}
_status_data: dict = {}

# -- Subprocess helpers ---------------------------------------------------------

def _strip_ansi(s: str) -> str:
    return _ANSI_RE.sub("", s)

_KW_COLOR = [
    ("ERROR",   "red"),
    ("CRITICAL","bold red"),
    ("FATAL",   "bold red"),
    ("WARNING", "yellow"),
    ("WARN",    "yellow"),
    ("INFO",    "bright_blue"),
    ("DEBUG",   "dim"),
]

def _get_color(line: str) -> str:
    upper = line.upper()
    for kw, c in _KW_COLOR:
        if kw in upper:
            return c
    return "white"

def _reader(proc: subprocess.Popen, buf: deque) -> None:
    """Drain a subprocess stdout into buf, one line at a time."""
    try:
        for raw in proc.stdout:
            line = _strip_ansi(raw.rstrip("\n\r"))
            if line.strip():
                buf.append((line, _get_color(line)))
    except Exception:
        pass


def _start_backend() -> subprocess.Popen:
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    proc = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn", "backend.main:app",
            "--host", "0.0.0.0",
            "--port", str(_BACKEND_PORT),
            "--log-level", "info",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=env,
        cwd=str(_ROOT),
    )
    threading.Thread(target=_reader, args=(proc, _backend_logs), daemon=True).start()
    return proc


def _start_frontend() -> subprocess.Popen:
    env = {**os.environ, "FORCE_COLOR": "0", "NO_COLOR": "1"}
    proc = subprocess.Popen(
        [_NPM, "run", "dev"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=env,
        cwd=str(_FRONTEND_DIR),
    )
    threading.Thread(target=_reader, args=(proc, _frontend_logs), daemon=True).start()
    return proc


def _stop_all() -> None:
    import platform
    for p in _procs:
        try:
            if platform.system() == "Windows":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                p.terminate()
        except Exception:
            pass


# -- HTTP metrics background poller ---------------------------------------------

def _poll_metrics():
    import requests as req
    while True:
        try:
            r1 = req.get(f"http://localhost:{_BACKEND_PORT}/api/metrics", params={"token": _ADMIN_TOKEN}, timeout=0.8)
            if r1.ok:
                _metrics_data.clear()
                _metrics_data.update(r1.json())
        except Exception:
            pass
            
        try:
            r2 = req.get(f"http://localhost:{_BACKEND_PORT}/api/agent/status", params={"token": _ADMIN_TOKEN}, timeout=0.8)
            if r2.ok:
                _status_data.clear()
                _status_data.update(r2.json())
        except Exception:
            pass
            
        time.sleep(2.0)


# -- Render helpers -------------------------------------------------------------

def _render_header(uptime: str):
    from rich.panel import Panel
    from rich.text import Text

    be_url = f"http://localhost:{_BACKEND_PORT}"
    fe_url = f"http://localhost:{_FRONTEND_PORT}"
    model = os.getenv("GROQ_MODEL", "unknown")

    t = Text(justify="left", no_wrap=True)
    t.append("  >>  StayBot", style="bold bright_cyan")
    t.append(f"  v{_VERSION}", style="dim white")
    t.append("   [ONLINE]", style="bold green")
    t.append("   |  BE: ", style="dim white")
    t.append(be_url, style=f"link {be_url} underline white")
    t.append("   FE: ", style="dim white")
    t.append(fe_url, style=f"link {fe_url} underline bright_cyan")
    t.append(f"   |  {model}", style="dim cyan")
    t.append(f"   |  up {uptime}", style="dim white")
    return Panel(t, style="bright_cyan", padding=(1, 2))


def _render_metrics():
    from rich.panel import Panel
    from rich.table import Table
    from rich.columns import Columns
    from rich.text import Text

    m = _metrics_data
    ks = _status_data

    def _mini(title: str, color: str) -> Table:
        tbl = Table(box=None, show_header=False, padding=(0, 1), expand=True)
        tbl.add_column(style=f"bold {color}", no_wrap=True)
        tbl.add_column(style="white", no_wrap=True)
        tbl.add_row(f"[bold {color}]{title}[/]", "")
        return tbl

    # REQUESTS
    rt = _mini("REQUESTS", "yellow")
    if m and "overview" in m:
        ov = m["overview"]
        rt.add_row("total", str(ov.get("total_requests", 0)))
        rt.add_row("errors", f"{ov.get('error_rate_pct', 0):.1f}%")
        rt.add_row("window", ov.get("window", "-"))
    else:
        rt.add_row("total", "0")
        rt.add_row("errors", "-")
        rt.add_row("window", "starting...")

    # LATENCY
    lt = _mini("LATENCY", "magenta")
    if m and "latency_ms" in m:
        lat = m["latency_ms"]
        for lbl in ("avg", "p50", "p95", "p99"):
            lt.add_row(lbl, f"{lat.get(lbl, 0):.0f} ms")
    else:
        for lbl in ("avg", "p50", "p95", "p99"):
            lt.add_row(lbl, "-")

    # TOKENS / RAG
    tt = _mini("TOKENS / RAG", "blue")
    if m and "tokens" in m:
        tok = m["tokens"]
        tt.add_row("avg in", f"{tok.get('avg_input_per_req', 0):.0f}")
        tt.add_row("avg out", f"{tok.get('avg_output_per_req', 0):.0f}")
        rag = m.get("rag") or {}
        embed = rag.get("embedding_latency_ms") or {}
        score = rag.get("relevance_score") or {}
        tt.add_row("embed", f"{(embed.get('avg') or 0):.0f} ms")
        tt.add_row("score", f"{(score.get('avg') or 0):.3f}")
    else:
        for lbl in ("avg in", "avg out", "embed", "score"):
            tt.add_row(lbl, "-")

    # API KEYS
    kt = _mini("API KEYS", "green")
    keys = ks.get("keys", []) if ks else []
    _STATE_STYLE = {"READY": "green", "COOLING": "yellow", "INVALID": "red"}
    if keys:
        for k in keys:
            state = k["state"]
            label = f"COOLING {k['eta_seconds']}s" if state == "COOLING" else state
            kt.add_row(
                f"KEY-{k['index']}",
                Text(f"{label} x{k['usage']}", style=_STATE_STYLE.get(state, "white")),
            )
    elif ks:
        kt.add_row("ready", str(ks.get("available_keys", "-")))
        kt.add_row("cooling", str(ks.get("rate_limited_keys", "-")))
        kt.add_row("invalid", str(ks.get("bad_keys", "-")))
    else:
        kt.add_row("-", Text("starting...", style="dim"))

    return Panel(
        Columns([rt, lt, tt, kt], equal=True, expand=True),
        title="[bold white]Metrics[/bold white]",
        style="bright_black",
    )


def _render_log_panel(buf: deque, title: str):
    from rich.panel import Panel
    from rich.text import Text

    lines = list(buf)
    body = Text(overflow="fold", no_wrap=False)
    for line, color in lines:
        body.append(line + "\n", style=color)

    if not lines:
        body.append("waiting for output...", style="dim italic")

    return Panel(
        body,
        title=f"[bold white]{title}[/bold white]",
        style="bright_black",
        subtitle=f"[dim]{len(lines)} lines[/dim]",
    )


# -- Run modes -----------------------------------------------------------------

def run_no_tui() -> None:
    """Start both servers with inherited terminal -- raw output."""
    be = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app",
         "--host", "0.0.0.0", "--port", str(_BACKEND_PORT)],
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
        cwd=str(_ROOT),
    )
    fe = subprocess.Popen([_NPM, "run", "dev"], cwd=str(_FRONTEND_DIR))
    try:
        be.wait()
    except KeyboardInterrupt:
        pass
    finally:
        be.terminate()
        fe.terminate()


def run_tui() -> None:
    from rich.live import Live
    from rich.layout import Layout

    be_proc = _start_backend()
    fe_proc = _start_frontend()
    _procs.extend([be_proc, fe_proc])

    threading.Thread(target=_poll_metrics, daemon=True).start()

    start = time.time()

    layout = Layout()
    layout.split_column(
        Layout(name="header", size=5),
        Layout(name="metrics", size=11),
        Layout(name="logs"),
    )
    layout["logs"].split_row(
        Layout(name="be_logs"),
        Layout(name="fe_logs"),
    )

    def _uptime() -> str:
        s = int(time.time() - start)
        h, r = divmod(s, 3600)
        m, sec = divmod(r, 60)
        return f"{h:02d}:{m:02d}:{sec:02d}"

    def _refresh() -> None:
        layout["header"].update(_render_header(_uptime()))
        layout["metrics"].update(_render_metrics())
        be_title = "Backend"
        fe_title = "Frontend"
        if be_proc.poll() is not None:
            if not getattr(be_proc, "_logged_exit", False):
                _backend_logs.append((f"[PROCESS EXITED code={be_proc.returncode}]", "bold red"))
                be_proc._logged_exit = True
            be_title = "Backend [DEAD]"
        if fe_proc.poll() is not None:
            if not getattr(fe_proc, "_logged_exit", False):
                _frontend_logs.append((f"[PROCESS EXITED code={fe_proc.returncode}]", "bold red"))
                fe_proc._logged_exit = True
            fe_title = "Frontend [DEAD]"
        layout["be_logs"].update(_render_log_panel(_backend_logs, be_title))
        layout["fe_logs"].update(_render_log_panel(_frontend_logs, fe_title))

    try:
        with Live(layout, screen=True, refresh_per_second=4):
            while True:
                _refresh()
                time.sleep(0.25)
    except KeyboardInterrupt:
        pass
    finally:
        _stop_all()


# -- Entry point ---------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="StayBot Launcher")
    parser.add_argument("--no-tui", action="store_true", help="Plain output, no TUI dashboard")
    args = parser.parse_args()

    if args.no_tui:
        run_no_tui()
    else:
        run_tui()
