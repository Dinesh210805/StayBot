<div align="center">

# StayBot

**Full-stack AI travel assistant for accommodation discovery, trip planning, and booking.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi)
![LangGraph](https://img.shields.io/badge/LangGraph-Agent-1f6feb?style=flat-square)
![Groq](https://img.shields.io/badge/Groq-LLM-f55036?style=flat-square)
![Pinecone](https://img.shields.io/badge/Pinecone-Vector_Search-00a67e?style=flat-square)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-d71f00?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker&logoColor=white)

</div>

StayBot helps users find, compare, plan, and book short-term stays through natural language.

It lets a user ask in natural language for stays such as "a quiet apartment in Bangkok under $80", then combines semantic search, structured filters, listing details, reviews, pricing, availability, weather, nearby places, and saved user preferences into one booking flow.

The goal was not to build a chatbot demo. The goal was to build the product layer around an AI assistant: real APIs, real data flow, tool use, memory, observability, fallback handling, and a frontend that feels like an actual travel experience.

## At a Glance

| Product | Engineering | Impact |
|---|---|---|
| AI travel assistant for stays, trip context, and bookings | FastAPI, LangGraph, Groq, Pinecone, SQLAlchemy, Next.js | Turns vague travel intent into a guided, stateful booking workflow |
| 450 listings across Bangkok, London, and Cape Town | RAG for discovery, SQL for filters, tools for actions | Shows practical AI integration beyond a simple chat response |
| Chat, explore, listing detail, map, and booking UI | Metrics, rate limiting, key rotation, prompt sanitization | Built with reliability and debuggability in mind |

## What It Does

| Capability | What it means |
|---|---|
| Natural-language search | Users can describe the stay they want instead of filling out every filter manually. |
| Structured filtering | City, budget, guests, property type, amenities, and rating are handled through SQL-backed queries. |
| Listing intelligence | Details, reviews, fees, price breakdowns, and comparisons are available through agent tools. |
| Booking flow | Availability checks and mock reservations are stored as stateful booking records. |
| User memory | Preferences can be saved and reused across sessions. |
| Trip context | Weather, nearby places, FAQs, and optional live web search help users plan around the stay. |
| Frontend experience | Next.js pages cover landing, exploration, listing detail, chat, map, and booking flows. |
| Admin visibility | Protected status and metrics endpoints expose key health, latency, usage, and RAG signals. |

## Why It Matters

Most AI travel demos stop at "the model gave an answer." StayBot goes further by making the assistant useful inside a real product workflow.

It connects LLM reasoning to reliable tools, validates user input, keeps state, records bookings, tracks latency and token usage, and separates semantic search from structured database queries. That makes the system easier to debug, safer to operate, and more honest about what the AI should and should not decide on its own.

## How It Works

```text
              Next.js frontend
                     |
                     v
              FastAPI backend
                     |
        +------------+-------------+----------------+
        |                          |                |
        v                          v                v
 LangGraph agent             SQLAlchemy DB       Pinecone
 Groq LLM                    listings/reviews    semantic search
 tool selection              users/bookings      FAQ retrieval
 key rotation                blocked dates
 prompt sanitization
        |
        v
 External tools: Open-Meteo, OpenStreetMap Overpass, Tavily
```

One chat request flows through `/api/chat`, loads the session history, sanitizes the message, selects the relevant tools, calls the agent, executes database/vector/API tools as needed, records metrics, saves the conversation, and returns a markdown response.

## Engineering Highlights

| Area | Decision |
|---|---|
| Agent reliability | The agent does not receive every tool on every request. It narrows the tool schema based on intent, which improves function-calling reliability. |
| Retrieval design | Semantic search handles vague user intent, while SQL handles exact filters like price, guests, city, and rating. |
| Resilience | Groq API keys rotate with rate-limit cooldowns and invalid-key detection. |
| Observability | Admin metrics include latency percentiles, token usage, tool distribution, RAG timing, relevance scores, retries, and error rate. |
| Product state | Users, preferences, booking records, blocked dates, reviews, and listing data live behind normal API boundaries. |
| Frontend integration | The Next.js app uses typed API wrappers, listing pages, chat, maps, booking UI, motion, and visual travel assets. |

## Tech Stack

| Area | Stack |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion, GSAP, Three.js |
| Backend | FastAPI, Pydantic, Uvicorn, SlowAPI |
| Agent | LangGraph, LangChain, Groq |
| Search | Pinecone, Sentence Transformers |
| Database | SQLAlchemy, SQLite by default, PostgreSQL/Neon supported |
| Data | Pandas, Inside Airbnb listings and reviews |
| External APIs | Open-Meteo, OpenStreetMap Overpass, Tavily |
| Deployment | Docker, Docker Compose |

## Project Structure

```text
StayBot/
|-- backend/      FastAPI app, agent, database models, tools, observability
|-- frontend/     Next.js app, pages, UI components, API wrapper
|-- data/         Processed listings, reviews, and FAQs
|-- scripts/      Data processing, embedding ingestion, cloud helpers
|-- tests/        Backend smoke and full-flow test scripts
`-- API_DOCS.md   Detailed backend API reference
```

## API Surface

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Backend health, version, cities, listing count |
| `POST` | `/api/sessions` | Create a chat session |
| `DELETE` | `/api/sessions/{session_id}` | Delete a chat session |
| `POST` | `/api/chat` | Send a message to the AI assistant |
| `GET` | `/api/listings` | Browse and filter listings |
| `GET` | `/api/listings/{listing_id}` | Get full listing details |
| `GET` | `/api/listings/{listing_id}/reviews` | Get listing reviews |
| `GET` | `/api/nearby` | Find nearby places from coordinates |
| `GET` | `/api/users/{user_name}` | Read saved user preferences |
| `GET` | `/api/users/{user_name}/bookings` | Read user bookings |
| `GET` | `/api/agent/status` | Admin-only Groq key status |
| `GET` | `/api/metrics` | Admin-only request and RAG metrics |

Full API details are in [API_DOCS.md](./API_DOCS.md).

## Running Locally

> Prerequisites: Python 3.11+, Node.js/npm, Groq key, Pinecone key and index.

### Backend

```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

On macOS/Linux:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

Backend runs at:

```text
http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

## Environment

Create a `.env` file in the repo root:

```env
GROQ_API_KEY_1=your_key
GROQ_API_KEY_2=your_key
GROQ_API_KEY_3=your_key
GROQ_MODEL=llama-3.3-70b-versatile

PINECONE_API_KEY=your_key
PINECONE_INDEX_NAME=staybot

ADMIN_TOKEN=change_this
ALLOWED_ORIGINS=http://localhost:3000

# Optional
DATABASE_URL=postgresql://user:password@host/dbname
TAVILY_API_KEY=your_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

If `DATABASE_URL` is not set, the backend uses SQLite at `data/staybot.db`.

## Data Pipeline

```bash
python scripts/download_and_process.py
python scripts/ingest_data.py
python scripts/seed_calendar.py
```

- `download_and_process.py` prepares listing and review data.
- `ingest_data.py` uploads listing and FAQ embeddings to Pinecone.
- `seed_calendar.py` creates blocked dates for availability testing.

## Testing

Start the backend first:

```bash
python -m uvicorn backend.main:app --port 8000
```

Then run:

```bash
python tests/test_api.py
python tests/test_full.py
```

Some chat and semantic-search tests require Groq and Pinecone credentials.

## Docker

```bash
docker-compose up -d --build
docker-compose logs -f
```

The Docker setup runs the backend. Start the frontend separately from `frontend/`.

## Example Prompts

```text
Find a quiet apartment in Bangkok under $80 for 2 guests.
Compare listings 16155609 and 31643626.
How much would 5 nights cost?
Is this listing available from 2026-06-15 to 2026-06-20?
Book it for Dinesh, 2 guests.
Remember that I prefer pet-friendly stays under $150.
What cafes are nearby?
```

## Current Notes

- `GET /api/listings` supports `page` in the response, but the backend currently uses `per_page` as the result limit without offset pagination.
- Tavily is optional. Without `TAVILY_API_KEY`, live web search is unavailable but the rest of the assistant still works.
- The booking engine is intentionally mock/stateful for product simulation, not payment processing.

## What This Shows

StayBot demonstrates full-stack product engineering around AI: not only calling a model, but giving it bounded tools, useful memory, searchable data, measurable behavior, and a UI that turns the assistant into a real workflow.

<div align="center">

Built with FastAPI, LangGraph, Groq, Pinecone, SQLAlchemy, and Next.js.

</div>
