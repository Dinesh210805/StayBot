# Product Requirements Document
## StayBot — AI-Powered Airbnb Assistant Chatbot
**Version:** 1.0  
**Author:** Dinesh Kumar C  
**Date:** May 2026  
**Status:** Draft

---

## 1. Product Overview

### 1.1 Vision
StayBot is a conversational AI assistant built on top of a mock/real Airbnb-style dataset that helps users discover listings, plan trips, get personalized stay recommendations, and resolve booking-related queries — all through natural multi-turn dialogue.

### 1.2 Problem Statement
Current Airbnb-style platforms require users to manually filter through hundreds of listings using static search filters. Users cannot express nuanced preferences like *"a cozy cabin near a lake for 4 people with a fireplace under ₹5000/night"* in a single query. There is no intelligent assistant that understands context, remembers preferences across a conversation, and proactively suggests the best options.

### 1.3 Goals
- Build a production-quality RAG + LLM chatbot that understands natural language queries about Airbnb-style listings
- Support multi-turn conversations with memory of previous messages
- Deliver personalized, context-aware recommendations
- Showcase advanced GenAI skills: RAG, tool calling, LLM orchestration, structured output

### 1.4 Non-Goals
- Real Airbnb API integration (mock dataset is sufficient)
- Real payment processing
- Mobile app

---

## 2. User Personas

### Persona 1 — The Leisure Traveller
- Name: Priya, 26, software engineer
- Wants quick recommendations for weekend trips
- Prefers typing natural queries over using filters
- Values honest reviews and pricing transparency

### Persona 2 — The Group Trip Planner
- Name: Arjun, 30, organizing a team offsite
- Needs listings for 8–12 people with specific amenities
- Wants to compare 3–4 properties side by side
- Cares about location and cancellation policies

### Persona 3 — The Budget Traveller
- Name: Sara, 22, college student
- Strict budget constraints
- Wants to know hidden charges upfront
- Values proximity to public transport

---

## 3. Core Features (MVP)

### F1 — Natural Language Listing Search
**Description:** User can describe their ideal stay in plain text and the bot returns matching listings from the dataset.

**Inputs accepted:**
- Location (city, neighbourhood, landmark proximity)
- Dates (check-in / check-out)
- Guest count
- Budget per night
- Property type (apartment, villa, cabin, hostel)
- Amenities (WiFi, pool, kitchen, pet-friendly, parking)

**Expected behaviour:**
- Returns top 3–5 matching listings with name, price, rating, key amenities
- Asks clarifying questions if query is too vague
- Handles partial information gracefully ("I'll search Goa for now — do you have a budget in mind?")

**Example:**
> User: "Find me a beachfront villa in Goa for 4 people under ₹8000 a night"  
> Bot: Returns 3 matching listings with brief summaries and key highlights

---

### F2 — Multi-Turn Conversation with Memory
**Description:** Bot remembers context from earlier in the conversation without the user repeating themselves.

**Behaviour:**
- Remembers location, dates, and guest count set earlier
- Supports follow-up refinements: "Make it cheaper" / "Show me only ones with a pool"
- Supports reference by position: "Tell me more about the second one"
- Maintains session history using LangChain ConversationBufferMemory

**Example:**
> User: "Find apartments in Manali for 2"  
> Bot: [shows results]  
> User: "What's the cancellation policy for the first one?"  
> Bot: [correctly identifies listing #1 from prior results]

---

### F3 — Listing Detail Retrieval
**Description:** User can ask deep questions about a specific listing.

**Supported queries:**
- Full amenity list
- House rules (check-in time, smoking, parties)
- Cancellation policy details
- Host rating and response rate
- Nearby attractions / distance from landmarks
- Recent reviews summary

---

### F4 — Price Breakdown Explainer
**Description:** Bot explains total cost for a stay including all fees.

**Output includes:**
- Base price per night × number of nights
- Cleaning fee
- Service fee (estimated)
- Taxes
- Total before and after taxes

**Example:**
> User: "How much will I pay in total for 3 nights at that villa?"  
> Bot: Breaks down all charges line by line

---

### F5 — Side-by-Side Comparison
**Description:** User can compare 2–3 listings on specific attributes.

**Supported comparisons:**
- Price, rating, amenities, location, cancellation policy
- Output formatted as a clean text table or structured list
- Bot highlights winner in each category

---

### F6 — Conversational FAQ Handling
**Description:** Bot answers general Airbnb-style platform questions using a curated knowledge base via RAG.

**Topics covered:**
- How booking works
- Refund and cancellation policies
- What happens if a host cancels
- Guest verification process
- How to contact a host
- Pet policies, extra guest fees

---

## 4. New / Advanced Features (V2)

### F7 — Mood-Based Recommendation Engine
**Description:** User describes a vibe or mood instead of explicit filters and bot infers the right listing type.

**Examples:**
> "I want somewhere quiet to recharge after a stressful month"  
> → Bot recommends: secluded cottages, low-review-count properties (fewer crowds), nature stays

> "Planning a bachelorette trip — fun, vibey, Instagrammable"  
> → Bot recommends: rooftop pools, stylish interiors, party-allowed properties

**How it works:** Mood-to-attribute mapping table + embedding similarity search on listing descriptions

---

### F8 — Trip Itinerary Assistant
**Description:** After finding a listing, bot helps plan the broader trip.

**Behaviour:**
- Suggests local attractions near the chosen property
- Recommends a rough day-by-day plan
- Answers questions like "Is it walkable to the beach?"
- Uses a static knowledge base of popular destinations

---

### F9 — Budget Optimizer
**Description:** User sets a total trip budget and bot recommends the best allocation.

**Input:** Total budget, number of nights, number of guests  
**Output:** Suggested price-per-night range, estimated remaining budget for food/transport, 3 listing options at different price points (budget / mid / premium)

---

### F10 — Review Sentiment Summarizer
**Description:** Bot summarizes what guests commonly praise or complain about for a listing.

**Output format:**
- "Guests love: location, cleanliness, host responsiveness"
- "Common complaints: slow WiFi, small bathrooms"
- Sentiment score out of 5 derived from review text

**Implementation:** Fine-tune or prompt LLaMA 3 on review text from dataset

---

### F11 — Availability Checker with Date Conflict Detection
**Description:** User asks if a listing is available for specific dates and bot checks against dataset.

**Behaviour:**
- Detects conflicts with already-booked dates
- Suggests closest available alternative dates if blocked
- Handles relative dates: "next weekend", "first week of July"

---

### F12 — Multi-Language Support
**Description:** Bot responds in the language the user writes in.

**Supported languages (initial):** English, Hindi, Tamil, French  
**Implementation:** Detect input language → translate query to English for retrieval → respond in original language using LLM

---

## 5. Technical Architecture

```
User Input (Chat UI)
        │
        ▼
┌──────────────────────┐
│   LangChain Agent    │  ← Orchestrator: routes to tools, manages memory
└──────────┬───────────┘
           │
    ┌──────┴──────────────────────────────┐
    │                                     │
    ▼                                     ▼
┌─────────────┐                  ┌─────────────────┐
│  RAG Tool   │                  │  Structured DB  │
│ (ChromaDB)  │                  │  Tool (SQLite)  │
│             │                  │                 │
│ FAQ answers │                  │ Filter listings │
│ Description │                  │ by price, date, │
│ similarity  │                  │ location, etc.  │
└─────────────┘                  └─────────────────┘
           │                             │
           └──────────┬──────────────────┘
                      ▼
             ┌─────────────────┐
             │   LLaMA 3 LLM   │  ← Response generation
             │  (via Ollama /  │
             │    Groq API)    │
             └─────────────────┘
                      │
                      ▼
              Final Response → Chat UI
```

---

## 6. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| LLM | LLaMA 3 (8B or 70B) via Groq API | Fast inference, free tier |
| Orchestration | LangChain | Memory, tool routing, chains |
| Vector DB | ChromaDB | Local, no setup, fast |
| Embeddings | all-MiniLM-L6-v2 (HuggingFace) | Lightweight, accurate |
| Structured search | SQLite + LangChain SQL Tool | Precise filtering by price/dates |
| Dataset | Mock Airbnb CSV (Inside Airbnb open dataset) | Free, realistic |
| Backend | FastAPI | Clean REST + WebSocket support |
| Frontend | Streamlit (MVP) → React (V2) | Fast prototyping |
| Deployment | Docker + HuggingFace Spaces / Render | Free hosting |

---

## 7. Data Model

### Listing
```
id, name, description, property_type, room_type,
city, neighbourhood, latitude, longitude,
price_per_night, cleaning_fee, service_fee,
max_guests, bedrooms, bathrooms,
amenities (JSON array),
host_id, host_name, host_rating, host_response_rate,
check_in_time, check_out_time, min_nights, max_nights,
cancellation_policy, pet_policy, smoking_allowed, party_allowed,
rating, review_count, availability_calendar (JSON),
images (list of URLs)
```

### Review
```
id, listing_id, reviewer_name, date,
rating, cleanliness, communication, location,
comment_text, sentiment_score
```

### FAQ Entry
```
id, question, answer, category, keywords
```

---

## 8. Conversation Flow

### Happy Path — Listing Search
```
User: "I want a place in Coorg for 2 people next weekend"
Bot:  "Great choice! Coorg has some beautiful stays.
       What's your budget per night? And any must-have amenities?"
User: "Around ₹4000, need WiFi and a kitchen"
Bot:  [Returns top 3 listings with summary cards]
User: "Tell me more about the second one"
Bot:  [Full detail view of listing #2]
User: "What's the total cost for 2 nights?"
Bot:  [Price breakdown]
User: "Okay I'll go with this one. How do I book?"
Bot:  [Explains booking process / redirects to listing URL]
```

### Edge Cases to Handle
- Vague queries → ask clarifying questions (max 2 at a time)
- No matching results → suggest loosening filters
- Out-of-scope queries → politely redirect ("I can only help with stay recommendations")
- Conflicting filters → flag and ask user to prioritize

---

## 9. Evaluation Metrics

| Metric | Target |
|---|---|
| Search relevance (top-3 accuracy) | > 80% |
| Response latency (Groq) | < 3 seconds |
| Multi-turn context retention | 100% within session |
| FAQ answer accuracy | > 90% |
| Hallucination rate | < 5% |

---

## 10. Folder Structure

```
airbnb-chatbot/
├── data/
│   ├── listings.csv
│   ├── reviews.csv
│   └── faqs.json
├── embeddings/
│   └── chroma_db/
├── backend/
│   ├── main.py              ← FastAPI app
│   ├── agent.py             ← LangChain agent setup
│   ├── tools/
│   │   ├── search_tool.py   ← RAG search
│   │   ├── sql_tool.py      ← Structured filter search
│   │   └── faq_tool.py      ← FAQ retrieval
│   ├── memory.py            ← Conversation memory
│   └── prompts.py           ← System prompts
├── frontend/
│   └── app.py               ← Streamlit UI
├── scripts/
│   └── ingest_data.py       ← Embed and store listings
├── tests/
│   └── test_agent.py
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## 11. Milestones

| Phase | Deliverable | Timeline |
|---|---|---|
| Phase 1 | Dataset setup + ChromaDB ingestion | Day 1–2 |
| Phase 2 | Basic RAG search + LLM response | Day 3–4 |
| Phase 3 | LangChain agent + multi-turn memory | Day 5–6 |
| Phase 4 | SQL tool + price breakdown feature | Day 7 |
| Phase 5 | Streamlit UI + all core features | Day 8–10 |
| Phase 6 | V2 features (mood engine, itinerary) | Day 11–14 |
| Phase 7 | Docker + deployment | Day 15 |

---

## 12. Out of Scope (V1)

- Real-time Airbnb API calls
- User authentication / login
- Actual booking transactions
- Push notifications
- Mobile UI
