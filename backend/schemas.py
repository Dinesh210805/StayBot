"""
Pydantic schemas for StayBot API request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Chat ───────────────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    session_id: str = Field(
        ...,
        description="Conversation session ID (UUID format)",
        pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    )
    message: str = Field(..., min_length=1, max_length=2000, description="User message")


class ChatResponse(BaseModel):
    session_id: str
    response: str
    

# ── Session ────────────────────────────────────────────────────────────────────


class SessionCreate(BaseModel):
    pass


class SessionResponse(BaseModel):
    session_id: str
    message: str


# ── Listings ───────────────────────────────────────────────────────────────────


class ListingBrief(BaseModel):
    id: int
    name: str
    city: str
    neighbourhood: Optional[str] = None
    property_type: Optional[str] = None
    room_type: Optional[str] = None
    price_per_night: Optional[float] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    max_guests: Optional[int] = None
    picture_url: Optional[str] = None
    country: Optional[str] = None


class ListingDetail(ListingBrief):
    description: Optional[str] = None
    neighborhood_overview: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cleaning_fee: Optional[float] = None
    service_fee: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    beds: Optional[int] = None
    amenities: Optional[list] = None
    host_id: Optional[int] = None
    host_name: Optional[str] = None
    host_response_rate: Optional[str] = None
    host_is_superhost: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    min_nights: Optional[int] = None
    max_nights: Optional[int] = None
    cancellation_policy: Optional[str] = None
    pet_policy: Optional[str] = None
    smoking_allowed: Optional[bool] = None
    party_allowed: Optional[bool] = None
    cleanliness_score: Optional[float] = None
    communication_score: Optional[float] = None
    location_score: Optional[float] = None
    listing_url: Optional[str] = None
    host_since: Optional[str] = None
    availability: Optional[bool] = None


class ReviewResponse(BaseModel):
    id: int
    listing_id: int
    reviewer_name: Optional[str] = None
    rating: Optional[float] = None
    comment: Optional[str] = None
    date: Optional[str] = None


class ListingsResponse(BaseModel):
    listings: list[ListingBrief]
    total: int
    page: int
    per_page: int


# ── Health ─────────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    version: str
    cities: list[str]
    total_listings: int
