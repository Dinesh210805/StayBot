# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StayBot is an AI-powered Airbnb-style assistant with a FastAPI backend and Next.js 16 frontend. It uses a LangGraph ReAct agent backed by Groq LLMs with multi-key round-robin rotation, Pinecone for semantic search (RAG), and SQLite/PostgreSQL for structured listing data.

## Commands

### Running the App

```bash
# Start both frontend + backend with the Rich TUI dashboard (recommended)
python run.py

# Start without the TUI (plain logs)
python run.py --no-tui

# Backend only
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend only
cd frontend && npm run dev
```

### Frontend

```bash
cd frontend
npm run dev        # Dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
```

### Backend

```bash
# Activate venv first (Windows)
venv\Scripts\activate

pip install -r requirements.txt
```

### Data Setup

```bash
# Download and process listing CSVs into data/
python scripts/download_and_process.py

# Ingest listings into Pinecone (run once after downloading data)
python scripts/ingest_data.py

# Seed calendar (blocked dates for booking simulation)
python scripts/seed_calendar.py

# Migrate to cloud Postgres (optional)
python scripts/cloud_migration.py
```

### Evaluation

```bash
# Start the backend first, then run RAGAS evaluation
python -m eval.ragas_eval
python -m eval.ragas_eval --api-url http://localhost:8000 --out eval/results.json
```

## Architecture

### Backend (`backend/`)

- **`main.py`** — FastAPI app. Defines all REST endpoints: `/api/chat`, `/api/sessions`, `/api/listings`, `/api/nearby`, `/api/metrics`, `/api/agent/status`.
- **`agent.py`** — Core LangGraph ReAct agent. Handles:
  - Multi-key round-robin Groq API rotation (`KeyManager`)
  - Per-request tool selection (`_select_tool_names`) to keep tool schemas small per turn
  - Prompt injection detection and input sanitization
  - Observability collection (`RequestContext` → `metrics_store`)
- **`database.py`** — SQLAlchemy ORM. SQLite by default; switches to PostgreSQL when `DATABASE_URL` env var is set. Tables: `listings`, `reviews`, `users`, `bookings`, `blocked_dates`.
- **`memory.py`** — Thread-safe in-memory session store (`SessionMemory`). Sessions expire after 1 hour, max 500 concurrent.
- **`prompts.py`** — System prompt for the agent.
- **`observability.py`** — Request metrics collection (latency percentiles, tokens, RAG scores).
- **`logger.py`** — Structured logging via `structlog`.
- **`schemas.py`** — Pydantic request/response models.

### Tools (`backend/tools/`)

Each tool is a `@tool`-decorated LangChain function:

| Tool | Purpose |
|------|---------|
| `search_tool.py` | Semantic search via Pinecone (`all-MiniLM-L6-v2` embeddings) |
| `sql_tool.py` | Structured filter queries against SQLite/PostgreSQL |
| `detail_tool.py` | Fetch full listing details by ID |
| `compare_tool.py` | Side-by-side comparison of two listings |
| `price_tool.py` | Price breakdown calculation |
| `faq_tool.py` | FAQ keyword search |
| `booking_tool.py` | Availability check + booking creation |
| `memory_tool.py` | Persistent user preferences (DB-backed) |
| `weather_tool.py` | Weather forecast lookup |
| `places_tool.py` | Nearby POI search via Overpass/OSM |
| `web_search_tool.py` | Live web search via Tavily |

### Frontend (`frontend/src/`)

Next.js 16 (App Router) with Tailwind CSS v4, Framer Motion, GSAP, and Three.js.

- **`app/`** — Route segments: `/` (home), `/chat`, `/explore`, `/destinations`, `/booking`
- **`components/home/`** — Landing page sections (FilmStrip, ChatPreview, ThreadIllustration)
- **`components/fx/`** — Visual effects (Cursor, Marquee, Reveal, VideoBackground, WelcomeLoader)
- **`components/map/`** — Map components using Leaflet and Google Maps
- **`components/three/`** — Three.js particle effects
- **`lib/api.ts`** — All backend API calls centralized here
- **`lib/destinations.ts`** — Static destination data

> **Important:** This project uses Next.js 16 with breaking API changes. See `frontend/AGENTS.md` before writing any frontend code.

## Environment Variables

Required in `.env`:

```
GROQ_API_KEY_1=...        # Primary Groq key (supports _1 through _9 for rotation)
GROQ_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=staybot
DATABASE_URL=...           # Optional; defaults to SQLite at data/staybot.db
ADMIN_TOKEN=...            # Protects /api/metrics and /api/agent/status
LANGSMITH_API_KEY=...      # Optional LangSmith tracing
TAVILY_API_KEY=...         # Required for web_search tool
HF_TOKEN=...               # Optional for authenticated HF model downloads
ALLOWED_ORIGINS=*          # CORS origins
NEARBY_CACHE_TTL=300       # Overpass cache TTL in seconds
```

## Key Design Decisions

- **Dynamic tool selection per request** (`_select_tool_names` in `agent.py`): the agent only receives 3–5 relevant tools per turn to improve Groq function-calling reliability. Adding new tools requires updating this selector.
- **Agent caching**: LangGraph agents are cached by `(api_key, strict_tool_mode, tool_names)` tuple to avoid rebuilding on every request.
- **Dual database**: SQLite for local dev, PostgreSQL for production. Switching is automatic via `DATABASE_URL`.
- **Nearby places** use the free Overpass API (OpenStreetMap) with an in-memory TTL cache and fallback mirrors — no Google Maps API key needed for this endpoint.
- **Rate limiting**: `slowapi` enforces 10/min on session creation, 20/min on chat.
- **Supported cities**: Bangkok, London, Cape Town, Istanbul (listing data must be ingested via scripts before the agent can answer questions about them).
