<div align="center">

# 🏠 StayBot

### AI-Powered Travel & Accommodation Assistant

**A production-ready RAG + LLM chatbot for discovering and comparing stays — built with LangGraph, Groq, FastAPI, ChromaDB, and SQLite.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangChain](https://img.shields.io/badge/LangChain-1.2+-1C3C3C?style=flat-square&logo=chainlink&logoColor=white)](https://langchain.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?style=flat-square)](https://groq.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-orange?style=flat-square)](https://trychroma.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [API Docs](#-api-reference) · [Stack](#-tech-stack)

</div>

---

## 📖 Overview

StayBot is a full-stack AI travel assistant that lets users discover, explore, and compare real accommodation listings through natural language conversation. Users can search by vibe, filter by price and amenities, get detailed property information, calculate total stay costs, and compare listings side-by-side — all through a conversational interface.

The backend is built on a **hybrid RAG architecture**:
- **Semantic search** via ChromaDB for natural language queries ("cozy apartment near the beach")
- **Structured SQL filtering** via SQLite for precise queries ("under $80/night for 4 guests")
- **Groq LLaMA 3.3 70B** as the reasoning engine, deciding which tools to call
- **LangGraph ReAct agent** managing the tool-calling loop and multi-turn memory

The dataset is sourced from [Inside Airbnb](https://insideairbnb.com) (CC BY 4.0) — real listings with real reviews — enriched with synthetic fields like cancellation policies, cleaning fees, and house rules.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Semantic Search** | Natural language listing discovery via vector embeddings |
| 🎛️ **Structured Filtering** | Filter by city, price, guests, amenities, rating, and property type |
| 📋 **Listing Details** | Full property info: amenities, house rules, host profile, recent reviews |
| 💰 **Price Breakdown** | Itemized cost: nightly rate × nights + cleaning fee + service fee + taxes |
| 📊 **Listing Comparison** | Side-by-side table of 2–3 listings with category winners |
| 💬 **FAQ Retrieval** | RAG-powered answers to platform questions (booking, cancellation, refunds) |
| 🧠 **Multi-Turn Memory** | Session-based conversation history across tool calls |
| 🌐 **REST API** | Full FastAPI backend with CORS, Pydantic validation, and OpenAPI docs |

---

## 🏙️ Dataset

Real listing data from **Inside Airbnb** (CC BY 4.0 open data license), covering:

| City | Country | Listings | Currency |
|---|---|---|---|
| **Bangkok** | Thailand | 150 | THB → USD (÷35) |
| **London** | United Kingdom | 150 | GBP → USD (×1.27) |
| **Cape Town** | South Africa | 150 | ZAR → USD (÷18.5) |

**Total:** 450 listings · 4,500 reviews · 30 curated FAQs

**Hybrid Enrichment** — Inside Airbnb provides: name, description, amenities, price, location, host info, ratings, and real guest reviews. We synthetically add: cancellation policy, cleaning fee, service fee, pet policy, smoking/party rules, and check-in/out times.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (UI / API)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend                          │
│  POST /api/chat  ·  POST /api/sessions  ·  GET /api/listings   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LangGraph ReAct Agent                        │
│                                                                 │
│   System Prompt + Chat History + User Message                   │
│              │                                                  │
│              ▼                                                  │
│   ┌─────────────────────┐   ┌──────────────────────────────┐   │
│   │   Groq LLaMA 3.3    │──▶│        Tool Selection         │   │
│   │      70B LLM        │   │  (which tool(s) to call?)    │   │
│   └─────────────────────┘   └──────────────┬───────────────┘   │
│                                            │                   │
│              ┌─────────────────────────────┼──────────────┐    │
│              │                             │              │    │
│              ▼                             ▼              ▼    │
│   ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│   │  search_semantic │  │  filter_listings │  │ search_faq │  │
│   │  (ChromaDB RAG)  │  │  (SQLite query)  │  │ (Chroma)   │  │
│   └──────────────────┘  └──────────────────┘  └────────────┘  │
│   ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│   │  get_details     │  │  price_breakdown  │  │  compare   │  │
│   │  (SQLite + ORM)  │  │  (math + SQLite) │  │ (SQLite)   │  │
│   └──────────────────┘  └──────────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    │                    │
         ┌──────────┘                    └──────────┐
         ▼                                          ▼
┌─────────────────┐                     ┌─────────────────────┐
│   ChromaDB      │                     │   SQLite (ORM)      │
│  ─────────────  │                     │  ─────────────────  │
│  listings       │                     │  listings table     │
│  collection     │                     │  reviews table      │
│  faqs           │                     │                     │
│  collection     │                     │  450 rows + 4500    │
│  450 + 30 docs  │                     │  review rows        │
└─────────────────┘                     └─────────────────────┘
         ▲
         │ all-MiniLM-L6-v2
         │ (384-dim embeddings)
┌─────────────────┐
│  Sentence       │
│  Transformers   │
└─────────────────┘
```

### Data Flow (Single Chat Turn)

```
User: "Find me a cozy apartment in London under £100"
  │
  ▼
FastAPI receives POST /api/chat
  │
  ▼
Session memory loads conversation history
  │
  ▼
LangGraph agent receives: [history] + user message
  │
  ▼
Groq LLaMA 3.3 reasons: "user wants filtered results → call filter_listings"
  │
  ▼
filter_listings(city="London", max_price=100) → SQLite query → 5 results
  │
  ▼
Groq formats results into natural language response
  │
  ▼
Memory saves turn → Response returned to client
```

---

## 🛠️ Tech Stack

### Core

| Layer | Technology | Why We Chose It |
|---|---|---|
| **LLM** | [Groq](https://groq.com) · LLaMA 3.3 70B | Fastest inference in the world (~700 tok/s). LLaMA 3.3 70B has excellent tool-calling capabilities and instruction following. Free tier available. |
| **Agent Framework** | [LangGraph](https://langchain-ai.github.io/langgraph/) | Modern ReAct agent with native async support. `create_react_agent` handles the full reasoning→tool-call→observe→respond loop natively, replacing the deprecated AgentExecutor. |
| **Tool Orchestration** | [LangChain Core](https://python.langchain.com) | `@tool` decorator for clean tool definitions. `langchain-groq` for the ChatGroq integration. |
| **API Framework** | [FastAPI](https://fastapi.tiangolo.com) | Async-first, automatic OpenAPI docs, Pydantic validation, CORS middleware out of the box. Best Python API framework for production. |
| **Vector Store** | [ChromaDB](https://trychroma.com) | Persistent local vector database. No external service needed. Supports cosine similarity search. Simple Python API. |
| **Embeddings** | [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) | Fast, lightweight (80MB), 384-dim embeddings. Excellent balance of speed and quality for semantic search. Runs entirely locally. |
| **SQL Database** | [SQLite](https://sqlite.org) + [SQLAlchemy](https://sqlalchemy.org) | Zero-config relational database for structured filtering. SQLAlchemy ORM for type-safe queries. Perfect for the dataset size (450 listings). |
| **Data Processing** | [Pandas](https://pandas.pydata.org) | Industry standard for ETL pipelines. Used for downloading, cleaning, enriching, and saving listings data. |

### Why This Architecture?

**Dual-retrieval (RAG + SQL)** is the key design decision:
- Pure SQL cannot handle "cozy place near the beach" — it has no semantic understanding
- Pure vector search cannot handle "under $80 for 4 guests" — it lacks precision
- **Combining both** gives the agent the right tool for every type of query

**LangGraph over LangChain AgentExecutor** — LangChain 1.x deprecated AgentExecutor in favour of LangGraph's compiled graphs. LangGraph is more explicit, debuggable, and production-ready.

**Groq over OpenAI** — At ~700 tokens/second inference speed vs ~40 tok/s for GPT-4o, Groq makes tool-calling agents feel instant. The free tier (100k tokens/day) is perfect for development.

---

## 📁 Project Structure

```
StayBot/
├── .env                          # API keys (GROQ_API_KEY)
├── .gitignore
├── requirements.txt
│
├── backend/                      # FastAPI + Agent application
│   ├── __init__.py
│   ├── main.py                   # FastAPI app, routes, lifespan
│   ├── agent.py                  # LangGraph ReAct agent
│   ├── database.py               # SQLAlchemy ORM + query helpers
│   ├── memory.py                 # Session-based conversation memory
│   ├── prompts.py                # LLM system prompt
│   ├── schemas.py                # Pydantic request/response models
│   └── tools/
│       ├── __init__.py
│       ├── search_tool.py        # Semantic search (ChromaDB)
│       ├── sql_tool.py           # Structured filter (SQLite)
│       ├── faq_tool.py           # FAQ retrieval (ChromaDB)
│       ├── detail_tool.py        # Listing details + reviews
│       ├── price_tool.py         # Price breakdown calculator
│       └── compare_tool.py       # Side-by-side comparison
│
├── scripts/
│   ├── download_and_process.py   # Data pipeline (Inside Airbnb → CSV)
│   └── ingest_data.py            # ChromaDB ingestion
│
├── data/
│   ├── faqs.json                 # 30 curated FAQ entries
│   ├── listings.csv              # Processed listings (450 rows)
│   ├── reviews.csv               # Processed reviews (4500 rows)
│   ├── staybot.db                # SQLite database (auto-generated)
│   └── raw/                      # Downloaded .csv.gz files (gitignored)
│
├── embeddings/
│   └── chroma_db/                # ChromaDB persistent storage (gitignored)
│
└── tests/
    └── test_api.py               # End-to-end API test script
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- A [Groq API key](https://console.groq.com/keys) (free)

### 1. Clone & Setup

```bash
git clone https://github.com/your-username/staybot.git
cd StayBot

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy the template
cp .env.example .env

# Edit .env and add your Groq API key
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### 3. Download & Process Data

This downloads real listing data from Inside Airbnb (Bangkok, London, Cape Town), converts prices to USD, and enriches with synthetic fields.

```bash
python scripts/download_and_process.py
```

Expected output:
```
Processing Bangkok... [DONE] Kept 150 listings
Processing London...  [DONE] Kept 150 listings
Processing Cape Town... [DONE] Kept 150 listings

DATASET READY
Listings: 450 | Reviews: 4500
```

### 4. Ingest into ChromaDB

Embeds listing descriptions and FAQs using `all-MiniLM-L6-v2` and stores them in ChromaDB.

```bash
python scripts/ingest_data.py
```

Expected output:
```
[INGEST] Embedding 450 listings...  ████████████ 100%
[INGEST] Stored 450 listings in ChromaDB
[INGEST] Stored 30 FAQs in ChromaDB
[DONE] ChromaDB ingestion complete!
```

### 5. Start the Server

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Server is running at:
- **API:** `http://localhost:8000`
- **Interactive Docs (Swagger):** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## 💬 Usage Guide

### Conversational Chat

StayBot understands natural language. Start a session and chat:

**Finding listings:**
> "Find me a cozy apartment in Bangkok with a pool, under $80 a night for 2 people"

> "Show me luxury villas in Cape Town with ocean views, 4+ guests"

> "What's available in London near the city centre?"

**Getting details:**
> "Tell me more about the second listing"

> "What are the house rules for listing 12345?"

> "Does it allow pets?"

**Pricing:**
> "How much would 5 nights cost at that place?"

> "Break down the total cost for a week at listing 67890"

**Comparing:**
> "Compare the first two listings"

> "Which is better between listing 111 and 222?"

**Platform FAQs:**
> "How does cancellation work?"

> "What payment methods do you accept?"

> "Can I book for someone else?"

### API Usage

**Create a session:**
```bash
curl -X POST http://localhost:8000/api/sessions
# Returns: {"session_id": "uuid-here", "message": "..."}
```

**Send a chat message:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "your-session-id",
    "message": "Find apartments in Bangkok under $80"
  }'
```

**Browse listings directly:**
```bash
curl "http://localhost:8000/api/listings?city=Bangkok&max_price=80&guests=2&per_page=10"
```

---

## 🔌 API Reference

Full documentation → see **[API_DOCS.md](./API_DOCS.md)**

### Quick Endpoint Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health, cities, listing count |
| `POST` | `/api/sessions` | Create a new chat session |
| `DELETE` | `/api/sessions/{id}` | Delete/reset a session |
| `POST` | `/api/chat` | Send a message, receive AI response |
| `GET` | `/api/listings` | Browse/filter listings |
| `GET` | `/api/listings/{id}` | Get full listing details |

---

## 🤖 Agent Tools

The LangGraph agent has access to 6 tools. It automatically selects the right one(s) based on the user's message.

| Tool | Trigger | Data Source |
|---|---|---|
| `search_listings_semantic` | Descriptive language, vibes, moods | ChromaDB (vector search) |
| `filter_listings` | Specific criteria: price, city, guests | SQLite (SQL query) |
| `search_faqs` | Platform policy questions | ChromaDB (vector search) |
| `get_listing_details` | "Tell me more about listing X" | SQLite + Reviews |
| `calculate_price_breakdown` | "How much for N nights?" | SQLite + Math |
| `compare_listings` | "Compare listing A and B" | SQLite |

---

## ⚙️ Configuration

All configuration is via `.env`:

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | *(required)* | Your Groq Cloud API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model to use |

**Alternative models for development** (higher rate limits):

| Model | Speed | Quality | Best For |
|---|---|---|---|
| `llama-3.3-70b-versatile` | Fast | Highest | Production |
| `llama-3.1-8b-instant` | Fastest | Good | Development/testing |
| `gemma2-9b-it` | Fast | Good | Development |

---

## 🗄️ Database Schema

### listings table

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Inside Airbnb listing ID |
| `name` | TEXT | Property name |
| `description` | TEXT | Full listing description |
| `city` | TEXT | Bangkok / London / Cape Town |
| `neighbourhood` | TEXT | Local area name |
| `property_type` | TEXT | e.g. "Entire rental unit" |
| `room_type` | TEXT | "Entire home/apt", "Private room" |
| `price_per_night` | FLOAT | Nightly price in USD |
| `cleaning_fee` | FLOAT | One-time fee (synthetic) |
| `service_fee` | FLOAT | Platform fee (synthetic) |
| `max_guests` | INTEGER | Maximum guest capacity |
| `bedrooms` | INTEGER | Number of bedrooms |
| `bathrooms` | FLOAT | Number of bathrooms |
| `amenities` | TEXT | JSON array of amenity strings |
| `rating` | FLOAT | Overall rating (0–5) |
| `review_count` | INTEGER | Total number of reviews |
| `cancellation_policy` | TEXT | Flexible / Moderate / Strict (synthetic) |
| `pet_policy` | TEXT | Pet rules (synthetic) |
| `check_in_time` | TEXT | e.g. "3:00 PM" (synthetic) |
| `check_out_time` | TEXT | e.g. "11:00 AM" (synthetic) |
| `host_name` | TEXT | Host's name |
| `host_is_superhost` | TEXT | "t" or "f" |
| `listing_url` | TEXT | Airbnb listing URL |
| `picture_url` | TEXT | Primary listing image URL |

### reviews table

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Review ID |
| `listing_id` | INTEGER FK | References listings.id |
| `reviewer_name` | TEXT | Guest's name |
| `date` | TEXT | Review date |
| `comment_text` | TEXT | Full review text |
| `rating` | FLOAT | Review rating (synthetic) |
| `sentiment_score` | FLOAT | 0.0–1.0 sentiment score |

---

## 🧪 Running Tests

```bash
# Make sure the server is running first
python -m uvicorn backend.main:app --port 8000

# In a separate terminal:
python tests/test_api.py
```

Tests cover: health check, listing browse, listing detail, session create, and chat.

---

## 🚦 Rate Limits

Groq's **free tier** limits:
- **100,000 tokens/day** for `llama-3.3-70b-versatile`
- **14,400 tokens/minute**

Each chat turn uses ~3,000–5,000 tokens (system prompt + history + tool results). This gives ~20–30 conversations per day on the free tier.

**For development**, switch to `llama-3.1-8b-instant` which has much higher limits:
```
GROQ_MODEL=llama-3.1-8b-instant
```

**For production**, upgrade to Groq's paid Dev Tier for higher daily limits.

---

## 🛣️ Roadmap

- [x] Backend: Data pipeline, RAG tools, agent, REST API
- [ ] Frontend: React/Next.js conversational UI
- [ ] WebSocket: Real-time streaming chat responses
- [ ] Map view: Listing locations on an interactive map
- [ ] Booking flow: Mock booking confirmation UI
- [ ] Multi-language: i18n support for Bangkok/London/Cape Town markets
- [ ] Caching: Redis for session persistence across restarts
- [ ] Auth: JWT-based user authentication

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

Data sourced from [Inside Airbnb](https://insideairbnb.com) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

---

<div align="center">
Built with ❤️ using LangGraph · Groq · FastAPI · ChromaDB
</div>
