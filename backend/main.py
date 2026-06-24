"""
FastAPI application for StayBot.

Provides REST API endpoints for chat, listing browsing, and session management.
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.logger import get_logger
from backend.schemas import (
    ChatRequest,
    ChatResponse,
    SessionResponse,
    ListingBrief,
    ListingDetail,
    ListingsResponse,
    ReviewResponse,
    HealthResponse,
)
from backend.memory import memory_store
from backend.database import init_db, search_listings, get_listing_by_id, get_all_cities, get_listing_reviews, SessionLocal
from backend.database import Listing, BlockedDate

CITY_TO_COUNTRY: dict[str, str] = {
    "Bangkok": "Thailand",
    "London": "United Kingdom",
    "Cape Town": "South Africa",
    "Istanbul": "Turkey",
}
import time

# Simple in-memory cache for nearby queries to reduce Overpass load
# Keyed by rounded lat/lon + types + radius + limit
NEARBY_CACHE: dict = {}
NEARBY_CACHE_TTL = int(os.getenv("NEARBY_CACHE_TTL", "300"))  # seconds

log = get_logger("main")

# ── Rate Limiter ───────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)


# ── Lifespan ───────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup.begin")
    init_db()

    # Pre-warm the sentence-transformer model so the first semantic search
    # doesn't incur the cold-start penalty (~2-3s on first request).
    try:
        from backend.tools.search_tool import _get_model, _get_index
        _get_model()
        _get_index()
        log.info("startup.warmup.done", model="all-MiniLM-L6-v2")
    except Exception as exc:
        log.warning("startup.warmup.failed", error=str(exc))

    log.info("startup.ready")
    yield
    log.info("shutdown")


# ── App Setup ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="StayBot API",
    description="AI-Powered Airbnb Assistant Chatbot Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — configurable origins for security
_allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ───────────────────────────────────────────────────────────────


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Check API health and connectivity to all dependencies."""
    cities: list[str] = []
    total = 0
    db_ok = False
    pinecone_ok = False

    try:
        cities = get_all_cities()
        session = SessionLocal()
        try:
            total = session.query(Listing).count()
            db_ok = True
        finally:
            session.close()
    except Exception as exc:
        log.warning("health.db.failed", error=str(exc))

    try:
        from backend.tools.search_tool import _get_index
        idx = _get_index()
        idx.describe_index_stats()
        pinecone_ok = True
    except Exception as exc:
        log.warning("health.pinecone.failed", error=str(exc))

    status = "healthy" if db_ok and pinecone_ok else "degraded"
    return HealthResponse(
        status=status,
        version="1.0.0",
        cities=cities,
        total_listings=total,
    )


@app.get("/api/agent/status", tags=["System"], include_in_schema=False)
async def agent_status(token: str = Query(..., description="Admin token")):
    """Returns the current API key rotation status. Protected by admin token."""
    admin_token = os.getenv("ADMIN_TOKEN", "")
    if not admin_token or token != admin_token:
        raise HTTPException(status_code=403, detail="Forbidden")
    from backend.agent import get_key_status
    return get_key_status()


@app.get("/api/metrics", tags=["System"])
async def get_metrics(token: str = Query(..., description="Admin token")):
    """
    Returns aggregated request metrics including:
    - Latency percentiles (p50 / p75 / p95 / p99)
    - Token usage (input / output, per-request averages)
    - Tool call distribution
    - RAG pipeline breakdown (embedding ms, retrieval ms, relevance scores)
    - Error rate and recent request log
    """
    admin_token = os.getenv("ADMIN_TOKEN", "")
    if not admin_token or token != admin_token:
        raise HTTPException(status_code=403, detail="Forbidden")
    from backend.observability import metrics_store
    from backend.agent import GROQ_MODEL
    summary = metrics_store.summary()
    summary["model"] = GROQ_MODEL
    return summary


@app.get("/api/eval", tags=["System"])
async def get_eval():
    """
    Latest offline evaluation summary (RAGAS answer quality + keyword accuracy)
    produced by `python -m eval.ragas_eval`.

    Read-only and non-sensitive, so it is intentionally unauthenticated: the
    concierge live-telemetry pill surfaces answer-quality scores next to the
    runtime metrics. Returns `available: false` when no eval has been run yet.
    """
    import json
    import math
    from pathlib import Path

    empty = {
        "available": False,
        "timestamp": None,
        "total_questions": 0,
        "keyword_accuracy_pct": 0.0,
        "passed": 0,
        "failed": 0,
        "ragas_scores": {},
    }

    results_path = Path(__file__).resolve().parent.parent / "eval" / "results.json"
    if not results_path.exists():
        return empty

    try:
        raw = json.loads(results_path.read_text(encoding="utf-8"))
    except Exception as exc:  # corrupt/partial file — fail soft
        log.warning("eval.read_failed", error=str(exc))
        return empty

    samples = raw.get("samples") or []
    passed = sum(1 for s in samples if s.get("keyword_pass"))

    # json.loads parses bare NaN/Infinity tokens, but JSON.parse in the browser
    # rejects them — coerce any non-finite RAGAS score to null.
    def _finite(value: object) -> float | None:
        if isinstance(value, (int, float)) and math.isfinite(value):
            return round(float(value), 4)
        return None

    ragas_scores = {k: _finite(v) for k, v in (raw.get("ragas_scores") or {}).items()}

    return {
        "available": True,
        "timestamp": raw.get("timestamp"),
        "total_questions": raw.get("total_questions", len(samples)),
        "keyword_accuracy_pct": raw.get("keyword_accuracy_pct", 0.0),
        "passed": passed,
        "failed": len(samples) - passed,
        "ragas_scores": ragas_scores,
    }


# ── Session Management ─────────────────────────────────────────────────────────


@app.post("/api/sessions", response_model=SessionResponse, tags=["Sessions"])
@limiter.limit("10/minute")
async def create_session(request: Request):
    """Create a new chat session."""
    session_id = memory_store.create_session()
    log.info("session.created", session_id=session_id)
    return SessionResponse(
        session_id=session_id,
        message="Session created successfully. Start chatting!",
    )


@app.delete("/api/sessions/{session_id}", response_model=SessionResponse, tags=["Sessions"])
async def delete_session(session_id: str):
    """Clear and delete a chat session."""
    memory_store.delete_session(session_id)
    log.info("session.deleted", session_id=session_id)
    return SessionResponse(
        session_id=session_id,
        message="Session deleted successfully.",
    )


# ── User Profiles & Bookings ───────────────────────────────────────────────────


@app.get("/api/users/{user_name}", tags=["Users"])
async def get_user_profile(user_name: str):
    """Get a user's profile and preferences."""
    session = SessionLocal()
    try:
        from backend.database import User
        import json
        user = session.query(User).filter(User.name == user_name).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        prefs = {}
        if user.preferences:
            try:
                prefs = json.loads(user.preferences)
            except Exception:
                pass

        return {
            "name": user.name,
            "created_at": user.created_at,
            "last_active": user.last_active,
            "preferences": prefs,
        }
    finally:
        session.close()


@app.get("/api/users/{user_name}/bookings", tags=["Users"])
async def get_user_bookings(user_name: str):
    """Get all bookings for a user."""
    session = SessionLocal()
    try:
        from backend.database import Booking, Listing
        bookings = (
            session.query(Booking)
            .filter(Booking.user_name == user_name)
            .order_by(Booking.created_at.desc())
            .all()
        )

        result = []
        for b in bookings:
            listing = session.query(Listing).filter(Listing.id == b.listing_id).first()
            result.append({
                "reference": b.reference,
                "listing_id": b.listing_id,
                "listing_name": listing.name if listing else "Unknown",
                "city": listing.city if listing else "Unknown",
                "check_in": b.check_in,
                "check_out": b.check_out,
                "guests": b.guests,
                "total_price": b.total_price,
                "status": b.status,
                "created_at": b.created_at,
                "picture_url": listing.picture_url if listing else None,
            })
        return {"bookings": result}
    finally:
        session.close()


# ── Chat ───────────────────────────────────────────────────────────────────────


@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
@limiter.limit("20/minute")
async def chat_endpoint(request: Request, data: ChatRequest):
    """
    Send a message to StayBot and get a response.

    The agent will:
    1. Understand the user's intent
    2. Select the appropriate tool (search, filter, FAQ, details, price, compare)
    3. Execute the tool and generate a natural language response
    4. Remember context for follow-up questions
    """
    from backend.agent import chat

    if not memory_store.session_exists(data.session_id):
        raise HTTPException(status_code=404, detail="Session not found or expired. Create a new session.")

    try:
        response = await chat(data.session_id, data.message)
        return ChatResponse(
            session_id=data.session_id,
            response=response,
        )
    except Exception as exc:
        log.error("chat.error", session_id=data.session_id, error=str(exc))
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your message. Please try again.",
        )


# ── Listings API ───────────────────────────────────────────────────────────────


@app.get("/api/listings", response_model=ListingsResponse, tags=["Listings"])
async def list_listings(
    city: str = Query(None, description="Filter by city"),
    min_price: float = Query(None, description="Minimum price per night"),
    max_price: float = Query(None, description="Maximum price per night"),
    guests: int = Query(None, description="Minimum guest capacity"),
    property_type: str = Query(None, description="Property type filter"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Results per page"),
):
    """Browse listings with optional filters."""
    results = search_listings(
        city=city,
        min_price=min_price,
        max_price=max_price,
        guests=guests,
        property_type=property_type,
        limit=per_page,
    )

    listings = [
        ListingBrief(
            id=r["id"],
            name=r["name"],
            city=r["city"],
            neighbourhood=r.get("neighbourhood"),
            property_type=r.get("property_type"),
            room_type=r.get("room_type"),
            price_per_night=r.get("price_per_night"),
            rating=r.get("rating"),
            review_count=r.get("review_count"),
            max_guests=r.get("max_guests"),
            picture_url=r.get("picture_url"),
            country=CITY_TO_COUNTRY.get(r.get("city", ""), None),
        )
        for r in results
    ]

    return ListingsResponse(
        listings=listings,
        total=len(listings),
        page=page,
        per_page=per_page,
    )


@app.get("/api/listings/{listing_id}", response_model=ListingDetail, tags=["Listings"])
async def get_listing(listing_id: int):
    """Get full details for a specific listing."""
    listing = get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
    listing["country"] = CITY_TO_COUNTRY.get(listing.get("city", ""), None)
    listing["host_since"] = None
    db = SessionLocal()
    try:
        blocked = db.query(BlockedDate).filter(BlockedDate.listing_id == listing_id).first()
        listing["availability"] = blocked is None
    finally:
        db.close()
    return ListingDetail(**listing)


@app.get("/api/listings/{listing_id}/reviews", response_model=list[ReviewResponse], tags=["Listings"])
async def get_reviews(listing_id: int, limit: int = 10):
    """Get reviews for a specific listing."""
    rows = get_listing_reviews(listing_id, limit)
    return [
        ReviewResponse(
            id=r["id"],
            listing_id=r["listing_id"],
            reviewer_name=r.get("reviewer_name"),
            rating=r.get("rating"),
            comment=r.get("comment_text"),
            date=str(r["date"]) if r.get("date") else None,
        )
        for r in rows
    ]


# ── Nearby Places ─────────────────────────────────────────────────────────────


@app.get("/api/nearby", tags=["Places"])
async def nearby_places(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    type: str = Query("restaurant", description="Place type"),
    radius: int = Query(800, ge=100, le=2000, description="Search radius in metres"),
    limit: int = Query(8, ge=1, le=20, description="Max results"),
):
    """Find nearby places via Overpass API (OpenStreetMap). Free, no API key."""
    import math
    import requests as _requests

    radius = min(max(radius, 100), 2000)
    limit = min(max(limit, 1), 20)

    osm_tags: dict[str, str] = {
        "restaurant": "amenity=restaurant",
        "cafe": "amenity=cafe",
        "bar": "amenity=bar",
        "supermarket": "shop=supermarket",
        "pharmacy": "amenity=pharmacy",
        "museum": "tourism=museum",
        "park": "leisure=park",
        "gym": "leisure=fitness_centre",
        "hospital": "amenity=hospital",
        "atm": "amenity=atm",
        "bus_station": "amenity=bus_station",
        "train_station": "railway=station",
        "beach": "natural=beach",
    }

    # Accept comma-separated types (e.g., "restaurant,cafe,museum")
    types = [t.strip() for t in type.split(",") if t.strip()]
    if not types:
        types = ["restaurant"]

    # Cache key: rounded coords to reduce overly specific cache misses
    key = f"{round(lat,4)}:{round(lon,4)}:{','.join(sorted(types))}:{radius}:{limit}"
    cached = NEARBY_CACHE.get(key)
    if cached and (time.time() - cached[0]) < NEARBY_CACHE_TTL:
        return cached[1]

    # Build Overpass query for multiple types in a single request
    tag_clauses = []
    for t in types:
        tag = osm_tags.get(t.lower(), f"amenity={t}")
        tag_key, tag_value = tag.split("=", 1)
        tag_clauses.append((t, tag_key, tag_value))

    clauses = []
    for tag_key, tag_value in tag_clauses:
        clauses.append(f'node["{tag_key}"="{tag_value}"](around:{radius},{lat},{lon});')
        clauses.append(f'way["{tag_key}"="{tag_value}"](around:{radius},{lat},{lon});')

    query = """
    [out:json][timeout:10];
    (
    """ + "\n      ".join(clauses) + "\n    );\n    out center body;\n    """

    # Try primary Overpass endpoint first, then fall back to mirrors with simple retries
    import time

    overpass_endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.openstreetmap.fr/api/interpreter",
    ]

    data = None
    last_exc: Exception | None = None
    for endpoint in overpass_endpoints:
        for attempt in range(2):
            try:
                resp = _requests.post(endpoint, data={"data": query}, timeout=15)
                resp.raise_for_status()
                data = resp.json()
                break
            except Exception as exc:
                last_exc = exc
                # backoff between attempts
                time.sleep(1 + attempt)
        if data is not None:
            break

    if data is None:
        err_msg = str(last_exc)[:200] if last_exc else "unknown error"
        raise HTTPException(status_code=503, detail=f"Places service unavailable: {err_msg}")

    def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6_371_000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    places = []
    for el in data.get("elements", []):
        el_name = el.get("tags", {}).get("name", "")
        if not el_name:
            continue
        p_lat = el.get("lat") or el.get("center", {}).get("lat")
        p_lon = el.get("lon") or el.get("center", {}).get("lon")
        if p_lat and p_lon:
            # Determine which requested type this element matches (if any)
            el_tags = el.get("tags", {})
            matched_type = None
            for orig_type, tag_key, tag_value in tag_clauses:
                if el_tags.get(tag_key) == tag_value:
                    matched_type = orig_type
                    break

            places.append({
                "name": el_name,
                "type": matched_type or types[0],
                "distance": round(haversine(lat, lon, p_lat, p_lon)),
                "lat": round(p_lat, 5),
                "lon": round(p_lon, 5),
                "cuisine": el_tags.get("cuisine", ""),
                "hours": el_tags.get("opening_hours", ""),
            })

    places.sort(key=lambda x: x["distance"])
    result = {"places": places[:limit], "total": len(places)}
    try:
        NEARBY_CACHE[key] = (time.time(), result)
    except Exception:
        pass
    return result


# ── Run ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
