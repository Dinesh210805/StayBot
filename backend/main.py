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
    HealthResponse,
)
from backend.memory import memory_store
from backend.database import init_db, search_listings, get_listing_by_id, get_all_cities, SessionLocal
from backend.database import Listing

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
    return ListingDetail(**listing)


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

    tag = osm_tags.get(type.lower(), f"amenity={type}")
    tag_key, tag_value = tag.split("=", 1)

    query = f"""
    [out:json][timeout:10];
    (
      node["{tag_key}"="{tag_value}"](around:{radius},{lat},{lon});
      way["{tag_key}"="{tag_value}"](around:{radius},{lat},{lon});
    );
    out center body;
    """

    try:
        resp = _requests.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": query},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Places service unavailable: {str(exc)[:100]}")

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
            places.append({
                "name": el_name,
                "distance": round(haversine(lat, lon, p_lat, p_lon)),
                "lat": round(p_lat, 5),
                "lon": round(p_lon, 5),
                "cuisine": el.get("tags", {}).get("cuisine", ""),
                "hours": el.get("tags", {}).get("opening_hours", ""),
            })

    places.sort(key=lambda x: x["distance"])
    return {"places": places[:limit], "total": len(places)}


# ── Run ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
