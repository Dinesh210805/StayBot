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
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

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


# ── Lifespan ───────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    print("[STARTUP] Initializing database...")
    init_db()
    print("[STARTUP] StayBot API is ready!")
    yield
    print("[SHUTDOWN] StayBot API shutting down.")


# ── App Setup ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="StayBot API",
    description="AI-Powered Airbnb Assistant Chatbot Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — configurable origins for security
# In production, set ALLOWED_ORIGINS env var to comma-separated list
_allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins],
    allow_credentials=False,  # Don't combine credentials with wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ───────────────────────────────────────────────────────────────


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Check API health and system status."""
    try:
        cities = get_all_cities()
        session = SessionLocal()
        try:
            total = session.query(Listing).count()
        finally:
            session.close()
    except Exception:
        cities = []
        total = 0

    return HealthResponse(
        status="healthy",
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


# ── Session Management ─────────────────────────────────────────────────────────


@app.post("/api/sessions", response_model=SessionResponse, tags=["Sessions"])
async def create_session():
    """Create a new chat session."""
    session_id = memory_store.create_session()
    return SessionResponse(
        session_id=session_id,
        message="Session created successfully. Start chatting!",
    )


@app.delete("/api/sessions/{session_id}", response_model=SessionResponse, tags=["Sessions"])
async def delete_session(session_id: str):
    """Clear and delete a chat session."""
    memory_store.delete_session(session_id)
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
            except:
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
        bookings = session.query(Booking).filter(Booking.user_name == user_name).order_by(Booking.created_at.desc()).all()
        
        result = []
        for b in bookings:
            # Get listing details
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
async def chat_endpoint(request: ChatRequest):
    """
    Send a message to StayBot and get a response.

    The agent will:
    1. Understand the user's intent
    2. Select the appropriate tool (search, filter, FAQ, details, price, compare)
    3. Execute the tool and generate a natural language response
    4. Remember context for follow-up questions
    """
    # Lazy import to avoid loading the agent at module level
    from backend.agent import chat

    # Validate session exists
    if not memory_store.session_exists(request.session_id):
        raise HTTPException(status_code=404, detail="Session not found or expired. Create a new session.")

    try:
        response = await chat(request.session_id, request.message)
        return ChatResponse(
            session_id=request.session_id,
            response=response,
        )
    except Exception as e:
        print(f"[CHAT ERROR] {e}")
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


# ── Run ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
