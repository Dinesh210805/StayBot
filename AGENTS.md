# StayBot Agent Guidelines

## Project Structure
- **Backend**: `backend/` - FastAPI app, LangGraph agent, SQLAlchemy models, tools
- **Frontend**: `frontend/` - Next.js 16 app with TypeScript, Tailwind CSS
- **Data**: `data/` - CSV files for listings/reviews, JSON for FAQs
- **Scripts**: `scripts/` - Data processing, ingestion, and utility scripts
- **Tests**: `tests/` - Backend test scripts

## Key Commands

### Backend Development
- Start dev server: `python -m uvicorn backend.main:app --reload --port 8000`
- Run smoke tests: `python tests/test_api.py`
- Run full test suite: `python tests/test_full.py`
- Build Docker: `docker-compose up -d --build`
- View Docker logs: `docker-compose logs -f`

### Frontend Development
- Install deps: `cd frontend && npm install`
- Start dev server: `cd frontend && npm run dev`
- Build for production: `cd frontend && npm run build`
- Lint: `cd frontend && npm run lint`

### Data & Scripts
- Process raw data: `python scripts/download_and_process.py`
- Upload embeddings to Pinecone: `python scripts/ingest_data.py`
- Seed blocked dates for testing: `python scripts/seed_calendar.py`

## Environment Variables (in .env)
**Required**:
- `GROQ_API_KEY_1`, `GROQ_API_KEY_2`, `GROQ_API_KEY_3` (or single `GROQ_API_KEY`)
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME` (defaults to `staybot`)

**Optional**:
- `DATABASE_URL` (PostgreSQL/Neon, defaults to local SQLite)
- `TAVILY_API_KEY` (enables live web search)
- `ADMIN_TOKEN` (for `/api/agent/status` endpoint)
- `ALLOWED_ORIGINS` (CORS, defaults to `*`)

## Important Notes

### Backend Specifics
- API base URL: `http://localhost:8000`
- Health check: `GET /api/health`
- Admin agent status (hidden): `GET /api/agent/status?token=YOUR_ADMIN_TOKEN`
- Chat endpoint: `POST /api/chat` (requires session_id from `/api/sessions`)
- Listings pagination: Uses `per_page` parameter only (no offset yet)
- SQLite DB location: `data/staybot.db` (when DATABASE_URL not set)

### Frontend Specifics
- Frontend runs on `http://localhost:3000`
- API wrapper in `frontend/src/lib/api.ts` has known mismatches:
  - Users bookings endpoint returns `{ "bookings": [...] }` but wrapper expects array
  - Health endpoint called as `/health` instead of `/api/health`
  - Listings response uses `limit` prop but backend uses `per_page`
  - Neighborhood field spelling differs (`neighbourhood` vs `neighborhood`)

### Testing
- Backend tests require running server first (`python -m uvicorn backend.main:app --port 8000`)
- Some chat tests need configured Groq and Pinecone keys
- Test scripts: `test_api.py` (smoke), `test_full.py` (comprehensive), `check_prices.py` (validation)

### Common Gotchas
1. Numbered Groq keys (`GROQ_API_KEY_1`, etc.) enable round-robin load balancing and cooldown handling
2. Frontend API wrapper needs alignment with actual backend responses
3. No offset pagination in listings endpoint yet - use `per_page` only
4. Docker setup only runs backend; frontend must be started separately
5. Semantic search requires Pinecone index and embeddings uploaded via `ingest_data.py`