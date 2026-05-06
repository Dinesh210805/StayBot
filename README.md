<div align="center">

# StayBot

### AI-Powered Accommodation Discovery, Trip Planning, and Booking Assistant

StayBot is a full-stack AI travel app for finding real stays in Bangkok, London,
and Cape Town. It combines a FastAPI backend, a LangGraph/Groq tool-calling
agent, SQL listing data, Pinecone semantic search, persistent user memory,
mock booking records, weather, nearby places, live web search, and a Next.js
frontend.

[Features](#features) · [Architecture](#architecture) · [Quick Start](#quick-start) · [API](#api-overview) · [Frontend](#frontend) · [Project Map](#project-map)

</div>

---

## Overview

StayBot helps users discover accommodations through natural language and a
visual web UI. A user can ask for “a quiet pet-friendly apartment in Cape Town
under $150,” compare options, inspect full listing details, check availability,
book a stay, save preferences, ask about the weather, and find nearby cafes or
attractions.

The project has two main parts:

| Area | What It Does |
|---|---|
| `backend/` | FastAPI REST API, SQLAlchemy database layer, LangGraph agent, tool implementations |
| `frontend/` | Next.js app with landing/explore/chat UI, markdown chat rendering, listing interactions |

The canonical backend contract is documented in [API_DOCS.md](./API_DOCS.md).

---

## Current Status

| Capability | Status |
|---|---|
| FastAPI backend | Implemented |
| Next.js frontend | Implemented |
| Chat sessions | Implemented |
| Listing browse/detail API | Implemented |
| Semantic listing search | Implemented with Pinecone |
| FAQ retrieval | Implemented with Pinecone |
| Structured filters | Implemented with SQLAlchemy |
| Price breakdowns and comparisons | Implemented |
| Availability checks and bookings | Implemented as a mock booking engine |
| Persistent user preferences | Implemented through agent tools |
| Weather forecasts | Implemented through Open-Meteo |
| Nearby places | Implemented through OpenStreetMap Overpass |
| Live web search | Implemented through Tavily when `TAVILY_API_KEY` is configured |
| Docker backend deployment | Implemented |

Important implementation note: `GET /api/listings` validates and echoes `page`,
but it currently does not offset results. `per_page` controls the returned count.

---

## Features

| Feature | Description |
|---|---|
| Semantic search | Natural language listing discovery using `all-MiniLM-L6-v2` embeddings and Pinecone |
| Structured filtering | Filter listings by city, price, guests, property type, room type, amenities, and rating |
| Listing details | Full property profile including host info, amenities, rules, scores, URLs, and recent reviews |
| Price breakdown | Calculates nightly total, cleaning fee, service fee, estimated tax, and grand total |
| Comparisons | Side-by-side comparison of 2-3 listings with category winners |
| FAQ answers | Answers booking, cancellation, refund, policy, and platform questions |
| Availability | Checks blocked dates, existing bookings, min nights, max nights, and date validity |
| Booking | Creates confirmed mock reservations with references like `STB-2026-A3X7` |
| User memory | Saves and loads preferences such as budget, pet-friendly, favorite cities, and travel style |
| Weather | 7-day forecasts for supported cities or exact listing coordinates |
| Nearby places | Restaurants, cafes, parks, transit, museums, gyms, pharmacies, beaches, and more around a listing |
| Live travel search | Tavily-powered search for real-time travel info, events, visas, advisories, and transport |
| Frontend app | Next.js UI for the product, explore page, listing detail interactions, and chat |
| Admin monitoring | Hidden `GET /api/agent/status` endpoint for Groq key pool status |

---

## Dataset

StayBot uses real accommodation and review data from Inside Airbnb, enriched
with synthetic fields needed for a complete booking/product experience.

| City | Listings | Notes |
|---|---:|---|
| Bangkok | 150 | Prices normalized from THB to USD |
| London | 150 | Prices normalized from GBP to USD |
| Cape Town | 150 | Prices normalized from ZAR to USD |

Total dataset:

| Data | Count |
|---|---:|
| Listings | 450 |
| Reviews | 4,500 |
| Curated FAQs | 30 |

The generated listing fields include cancellation policy, cleaning fee, service
fee, pet policy, smoking/party rules, and check-in/check-out times.

---

## Architecture

```text
User / Frontend / API Client
        |
        v
FastAPI backend
  - /api/health
  - /api/sessions
  - /api/chat
  - /api/listings
  - /api/users
        |
        v
LangGraph ReAct agent
  - Groq LLaMA model
  - session history
  - prompt-injection sanitization
  - tool selection
        |
        +--> Pinecone semantic search
        |     - listings namespace
        |     - faqs namespace
        |
        +--> SQLAlchemy database
        |     - listings
        |     - reviews
        |     - users
        |     - bookings
        |     - blocked_dates
        |
        +--> External APIs
              - Open-Meteo weather
              - OpenStreetMap Overpass places
              - Tavily web search
```

### How One Chat Turn Works

```text
POST /api/chat
  -> validate session_id and message
  -> load session history
  -> sanitize common prompt-injection phrases
  -> choose next available Groq API key
  -> LangGraph agent decides which tool to call
  -> tool queries Pinecone, SQL, or an external API
  -> agent writes a markdown response
  -> memory saves the user and assistant messages
  -> API returns { session_id, response }
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI, Pydantic, Uvicorn |
| Agent | LangGraph, LangChain Core, Groq ChatGroq |
| LLM | `llama-3.3-70b-versatile` by default |
| Semantic search | Sentence Transformers + Pinecone |
| SQL database | SQLite by default, PostgreSQL/Neon supported through `DATABASE_URL` |
| ORM | SQLAlchemy |
| Data processing | Pandas |
| Weather | Open-Meteo |
| Nearby places | OpenStreetMap Overpass |
| Live web search | Tavily |
| Frontend | Next.js 16, React 19, TypeScript |
| UI dependencies | Tailwind CSS, Radix UI, lucide-react, react-markdown, Framer Motion, GSAP, Three.js |
| Deployment | Docker, Docker Compose |

---

## Project Map

```text
StayBot/
├── API_DOCS.md                    # Full backend API contract for UI/design tools
├── README.md                      # This project overview
├── requirements.txt               # Python backend dependencies
├── Dockerfile                     # Backend container
├── docker-compose.yml             # Backend service definition
├── package.json                   # Root shadcn CLI dependency
├── .env                           # Local secrets and configuration, not committed
│
├── backend/
│   ├── main.py                    # FastAPI app and route definitions
│   ├── agent.py                   # LangGraph agent, Groq key rotation, chat entrypoint
│   ├── database.py                # SQLAlchemy models and query helpers
│   ├── memory.py                  # In-memory chat sessions
│   ├── prompts.py                 # Agent system prompt and behavior rules
│   ├── schemas.py                 # Pydantic request/response schemas
│   └── tools/
│       ├── search_tool.py         # Semantic listing search via Pinecone
│       ├── faq_tool.py            # FAQ search via Pinecone
│       ├── sql_tool.py            # Structured listing filters
│       ├── detail_tool.py         # Listing details and recent reviews
│       ├── price_tool.py          # Price breakdown calculator
│       ├── compare_tool.py        # Listing comparison table
│       ├── booking_tool.py        # Availability and mock booking engine
│       ├── memory_tool.py         # Persistent user profile preferences
│       ├── weather_tool.py        # Open-Meteo forecast tool
│       ├── places_tool.py         # OpenStreetMap nearby places tool
│       └── web_search_tool.py     # Tavily live web search tool
│
├── data/
│   ├── listings.csv               # Processed listing data
│   ├── reviews.csv                # Processed review data
│   └── faqs.json                  # Curated FAQ corpus
│
├── scripts/
│   ├── download_and_process.py    # Inside Airbnb download/clean/enrich pipeline
│   ├── ingest_data.py             # Embedding ingestion to Pinecone
│   ├── seed_calendar.py           # Simulated blocked dates for availability
│   ├── clean_and_upload.py        # Cloud data helper
│   ├── cloud_migration.py         # Cloud migration helper
│   ├── fast_postgres_upload.py    # PostgreSQL upload helper
│   └── verify_cloud.py            # Cloud verification helper
│
├── frontend/
│   ├── package.json               # Next.js dependencies and scripts
│   ├── src/app/                   # App Router pages
│   ├── src/components/            # UI and map components
│   └── src/lib/api.ts             # Frontend API wrapper
│
└── tests/
    ├── test_api.py                # Basic API smoke test script
    ├── test_full.py               # Comprehensive backend flow tests
    └── check_prices.py            # Price/data validation helper
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js/npm for the frontend
- Groq API key
- Pinecone API key and index
- Optional: Tavily API key for live web search
- Optional: PostgreSQL/Neon database URL

### 1. Install Backend Dependencies

```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

On macOS/Linux:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create or update `.env` in the repo root:

```env
GROQ_API_KEY_1=gsk_your_first_key
GROQ_API_KEY_2=gsk_your_second_key
GROQ_API_KEY_3=gsk_your_third_key
GROQ_MODEL=llama-3.3-70b-versatile

PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=staybot

ADMIN_TOKEN=change_this_admin_token
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Optional
TAVILY_API_KEY=your_tavily_key
DATABASE_URL=postgresql://user:password@host/dbname
```

You can also use a single `GROQ_API_KEY` instead of numbered keys. Numbered
keys enable round-robin load balancing and cooldown handling for rate limits.

If `DATABASE_URL` is unset, the backend uses local SQLite at `data/staybot.db`.

### 3. Prepare Data

If `data/listings.csv` and `data/reviews.csv` are already present, the backend
can initialize its SQL tables from them on startup.

To regenerate the data:

```bash
python scripts/download_and_process.py
```

To upload embeddings to Pinecone:

```bash
python scripts/ingest_data.py
```

To create simulated blocked dates for availability testing:

```bash
python scripts/seed_calendar.py
```

### 4. Start Backend

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Backend URLs:

| URL | Purpose |
|---|---|
| `http://localhost:8000/api/health` | Health check |
| `http://localhost:8000/docs` | Swagger docs |
| `http://localhost:8000/redoc` | ReDoc docs |

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` if you need to override the
frontend API base URL.

---

## API Overview

Full API details are in [API_DOCS.md](./API_DOCS.md).

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health, API version, cities, listing count |
| `GET` | `/api/agent/status` | Hidden admin Groq key status endpoint; requires `?token=...` |
| `POST` | `/api/sessions` | Create a chat session |
| `DELETE` | `/api/sessions/{session_id}` | Delete/reset a chat session |
| `GET` | `/api/users/{user_name}` | Read saved user preferences |
| `GET` | `/api/users/{user_name}/bookings` | Read bookings for a user |
| `POST` | `/api/chat` | Send a message to the AI agent |
| `GET` | `/api/listings` | Browse/filter listings |
| `GET` | `/api/listings/{listing_id}` | Get full listing details |

### Minimal API Usage

Create a chat session:

```bash
curl -X POST http://localhost:8000/api/sessions
```

Send a chat message:

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"YOUR_SESSION_ID\",\"message\":\"Find apartments in Bangkok under $80\"}"
```

Browse listings:

```bash
curl "http://localhost:8000/api/listings?city=Bangkok&max_price=80&guests=2&per_page=10"
```

Get a listing:

```bash
curl "http://localhost:8000/api/listings/16155609"
```

Admin agent status:

```bash
curl "http://localhost:8000/api/agent/status?token=YOUR_ADMIN_TOKEN"
```

---

## Agent Tools

The agent chooses from these tools automatically:

| Tool | Trigger | Data Source |
|---|---|---|
| `search_listings_semantic` | Descriptive/vibe-based searches | Pinecone listings namespace |
| `filter_listings` | City, budget, guests, type, amenities, rating | SQL database |
| `search_faqs` | Platform policies and how-to questions | Pinecone FAQs namespace |
| `get_listing_details` | Full details for a listing ID | SQL database and reviews |
| `calculate_price_breakdown` | Total cost for N nights | SQL database and fee math |
| `compare_listings` | Compare 2-3 listing IDs | SQL database |
| `check_availability` | Dates for a listing | SQL bookings and blocked dates |
| `book_listing` | Confirm a reservation | SQL bookings table |
| `save_user_preferences` | Remember user preferences | SQL users table |
| `load_user_preferences` | Returning user personalization | SQL users table |
| `update_memory_summary` | Save conversation summary | SQL users table |
| `get_weather_forecast` | Weather for a city/listing | Open-Meteo |
| `search_nearby_places` | Restaurants, cafes, transit, attractions nearby | OpenStreetMap Overpass |
| `web_search` | Events, visas, advisories, current travel info | Tavily |

---

## Frontend

The frontend is a Next.js app in `frontend/`.

Useful scripts:

```bash
cd frontend
npm run dev
npm run build
npm run start
npm run lint
```

Main frontend areas:

| Path | Purpose |
|---|---|
| `frontend/src/app/page.tsx` | Main product/landing experience |
| `frontend/src/app/explore/page.tsx` | Listing exploration UI |
| `frontend/src/app/chat/page.tsx` | Chat interface |
| `frontend/src/components/Map.tsx` | Map component |
| `frontend/src/lib/api.ts` | API client wrapper |

Known integration notes:

- The backend returns `/api/users/{name}/bookings` as `{ "bookings": [...] }`;
  the frontend API wrapper currently types it as a direct array.
- The backend health endpoint is `/api/health`; the frontend wrapper currently
  calls `/health`.
- The backend listings response uses `per_page`; the frontend type includes
  `limit`.
- The backend listing field is `neighbourhood`; some frontend types use
  `neighborhood`.

These are frontend wrapper/type alignment issues, not backend API gaps.

---

## Configuration Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | Yes, unless numbered keys exist | None | Single Groq key fallback |
| `GROQ_API_KEY_1` ... `GROQ_API_KEY_9` | Recommended | None | Round-robin Groq key pool |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Groq model name |
| `PINECONE_API_KEY` | Yes for semantic/FAQ search | None | Pinecone API key |
| `PINECONE_INDEX_NAME` | No | `staybot` | Pinecone index name |
| `DATABASE_URL` | No | Local SQLite | PostgreSQL/Neon connection string |
| `ADMIN_TOKEN` | Required for admin status | None | Token for `/api/agent/status` |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated CORS origins |
| `TAVILY_API_KEY` | No | None | Enables live web search |
| `NEXT_PUBLIC_API_URL` | Frontend only | `http://localhost:8000` | Frontend API base URL |

---

## Database Schema

Core tables are defined in `backend/database.py`.

| Table | Purpose |
|---|---|
| `listings` | Accommodation records, prices, host fields, rules, scores, images, coordinates |
| `reviews` | Guest reviews, ratings, sentiment, review metadata |
| `users` | Persistent user profiles, preference JSON, memory summaries |
| `bookings` | Mock booking confirmations with dates, guests, total, status |
| `blocked_dates` | Simulated unavailable calendar dates by listing |

---

## Testing

Start the backend first:

```bash
python -m uvicorn backend.main:app --port 8000
```

Run smoke tests:

```bash
python tests/test_api.py
```

Run the broader backend test script:

```bash
python tests/test_full.py
```

The full test suite exercises health, admin status, sessions, listings, listing
details, validation, chat tool flows, memory, key rotation, concurrency, and
security edge cases. Some chat tests require configured Groq and Pinecone keys.

---

## Docker

Build and run the backend with Docker Compose:

```bash
docker-compose up -d --build
docker-compose logs -f
```

Stop it:

```bash
docker-compose down
```

Or use plain Docker:

```bash
docker build -t staybot-backend .
docker run -d -p 8000:8000 --env-file .env --name staybot staybot-backend
```

The Docker setup runs only the backend. Run the frontend separately from
`frontend/` unless you add a frontend service.

---

## Common User Journeys

Search:

```text
"Find me a quiet apartment in Bangkok under $80 for 2 guests"
```

Details:

```text
"Tell me more about listing 16155609"
```

Price:

```text
"How much would 5 nights cost at that place?"
```

Compare:

```text
"Compare listing 16155609 and 31643626"
```

Availability:

```text
"Is listing 16155609 available from 2026-06-15 to 2026-06-20?"
```

Booking:

```text
"Book it for Dinesh, 2 guests"
```

Trip planning:

```text
"What's the weather near that listing?"
"Find cafes within 800 meters"
"Are there events in Cape Town in June 2026?"
```

Memory:

```text
"I'm Dinesh. Remember that I prefer pet-friendly places under $150."
```

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `No Groq API keys found` | No `GROQ_API_KEY` or numbered keys in `.env` | Add `GROQ_API_KEY` or `GROQ_API_KEY_1` |
| Semantic search fails | Missing Pinecone key/index or embeddings not uploaded | Set `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, run `scripts/ingest_data.py` |
| Web search unavailable | `TAVILY_API_KEY` not configured | Add Tavily key or ignore; other tools still work |
| `/api/chat` returns 404 | Session missing or expired | Create a new session with `POST /api/sessions` |
| `/api/agent/status` returns 403 | Missing/wrong `ADMIN_TOKEN` | Set `ADMIN_TOKEN` and pass it as `?token=` |
| Frontend cannot reach backend | Wrong base URL or CORS | Set `NEXT_PUBLIC_API_URL` and `ALLOWED_ORIGINS` |
| Browse pagination repeats results | Backend has no offset pagination yet | Use `per_page` only or implement backend offset logic |

---

## Roadmap

Useful next improvements:

- Align `frontend/src/lib/api.ts` with the live backend response shapes.
- Add true offset pagination to `GET /api/listings`.
- Add booking cancellation endpoints.
- Add authenticated users instead of name-based profiles.
- Add streaming chat responses.
- Add a frontend service to `docker-compose.yml`.
- Add CI for backend tests and frontend lint/build.

---

## License and Data

Data is sourced from Inside Airbnb under CC BY 4.0. Application code is intended
to be MIT-style, but add a `LICENSE` file if this repository will be published.

---

<div align="center">

Built with LangGraph, Groq, FastAPI, Pinecone, SQLAlchemy, and Next.js.

</div>
