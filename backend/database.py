"""
Database layer for StayBot.

Manages SQLite database using SQLAlchemy for structured listing/review queries.
Provides query helpers for filtering by city, price, guests, property type, amenities.
"""

import os
import json
import pandas as pd
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    Float,
    String,
    Boolean,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "staybot.db")
DATA_DIR = os.path.join(BASE_DIR, "data")

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# ── ORM Models ─────────────────────────────────────────────────────────────────


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    neighborhood_overview = Column(Text)
    property_type = Column(String)
    room_type = Column(String)
    city = Column(String, index=True)
    neighbourhood = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    price_per_night = Column(Float, index=True)
    cleaning_fee = Column(Float)
    service_fee = Column(Float)
    max_guests = Column(Integer)
    bedrooms = Column(Integer)
    bathrooms = Column(Float)
    beds = Column(Integer)
    amenities = Column(Text)  # JSON array string
    host_id = Column(Integer)
    host_name = Column(String)
    host_response_rate = Column(String)
    host_is_superhost = Column(String)
    check_in_time = Column(String)
    check_out_time = Column(String)
    min_nights = Column(Integer)
    max_nights = Column(Integer)
    cancellation_policy = Column(String)
    pet_policy = Column(String)
    smoking_allowed = Column(Boolean)
    party_allowed = Column(Boolean)
    rating = Column(Float, index=True)
    cleanliness_score = Column(Float)
    communication_score = Column(Float)
    location_score = Column(Float)
    review_count = Column(Integer)
    listing_url = Column(String)
    picture_url = Column(String)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), index=True)
    reviewer_name = Column(String)
    date = Column(String)
    rating = Column(Float)
    cleanliness = Column(Float)
    communication = Column(Float)
    location = Column(Float)
    comment_text = Column(Text)
    sentiment_score = Column(Float)


# ── Database Initialization ────────────────────────────────────────────────────


def init_db():
    """Create tables and load data from CSV files."""
    Base.metadata.create_all(engine)

    session = SessionLocal()
    try:
        # Check if data is already loaded
        if session.query(Listing).count() > 0:
            print(f"[DB] Database already populated with {session.query(Listing).count()} listings")
            return

        # Load listings CSV
        listings_path = os.path.join(DATA_DIR, "listings.csv")
        if not os.path.exists(listings_path):
            print("[DB] No listings.csv found. Run scripts/download_and_process.py first.")
            return

        print("[DB] Loading listings into SQLite...")
        listings_df = pd.read_csv(listings_path)
        listings_df.to_sql("listings", engine, if_exists="replace", index=False)
        print(f"[DB] Loaded {len(listings_df)} listings")

        # Load reviews CSV
        reviews_path = os.path.join(DATA_DIR, "reviews.csv")
        if os.path.exists(reviews_path):
            print("[DB] Loading reviews into SQLite...")
            reviews_df = pd.read_csv(reviews_path)
            reviews_df.to_sql("reviews", engine, if_exists="replace", index=False)
            print(f"[DB] Loaded {len(reviews_df)} reviews")

    finally:
        session.close()


# ── Query Helpers ──────────────────────────────────────────────────────────────


def _escape_like(value: str) -> str:
    """Escape SQL LIKE wildcard characters in user input to prevent pattern injection."""
    return value.replace("%", "\\%").replace("_", "\\_")


def get_session() -> Session:
    """Get a new database session."""
    return SessionLocal()


def search_listings(
    city: str = None,
    min_price: float = None,
    max_price: float = None,
    guests: int = None,
    property_type: str = None,
    room_type: str = None,
    amenities: list[str] = None,
    min_rating: float = None,
    limit: int = 10,
) -> list[dict]:
    """Search listings with structured filters. Returns list of dicts."""
    # Clamp limit to sane range
    limit = max(1, min(limit, 100))

    session = SessionLocal()
    try:
        query = session.query(Listing)

        if city:
            query = query.filter(Listing.city.ilike(f"%{_escape_like(city)}%"))
        if min_price is not None:
            query = query.filter(Listing.price_per_night >= min_price)
        if max_price is not None:
            query = query.filter(Listing.price_per_night <= max_price)
        if guests is not None:
            query = query.filter(Listing.max_guests >= guests)
        if property_type:
            query = query.filter(Listing.property_type.ilike(f"%{_escape_like(property_type)}%"))
        if room_type:
            query = query.filter(Listing.room_type.ilike(f"%{_escape_like(room_type)}%"))
        if min_rating is not None:
            query = query.filter(Listing.rating >= min_rating)

        # Amenity filtering: check if each amenity exists in the JSON array
        if amenities:
            for amenity in amenities:
                query = query.filter(Listing.amenities.ilike(f"%{_escape_like(amenity)}%"))

        # Order by rating (descending), then by review count
        query = query.order_by(Listing.rating.desc(), Listing.review_count.desc())
        results = query.limit(limit).all()

        return [_listing_to_dict(r) for r in results]
    finally:
        session.close()


def get_listing_by_id(listing_id: int) -> dict | None:
    """Get a single listing by ID."""
    session = SessionLocal()
    try:
        listing = session.query(Listing).filter(Listing.id == listing_id).first()
        return _listing_to_dict(listing) if listing else None
    finally:
        session.close()


def get_listing_reviews(listing_id: int, limit: int = 10) -> list[dict]:
    """Get reviews for a specific listing."""
    session = SessionLocal()
    try:
        reviews = (
            session.query(Review)
            .filter(Review.listing_id == listing_id)
            .order_by(Review.date.desc())
            .limit(limit)
            .all()
        )
        return [_review_to_dict(r) for r in reviews]
    finally:
        session.close()


def get_all_cities() -> list[str]:
    """Get a list of all unique cities in the dataset."""
    session = SessionLocal()
    try:
        cities = session.query(Listing.city).distinct().all()
        return [c[0] for c in cities]
    finally:
        session.close()


def get_listings_by_ids(listing_ids: list[int]) -> list[dict]:
    """Get multiple listings by their IDs."""
    session = SessionLocal()
    try:
        listings = session.query(Listing).filter(Listing.id.in_(listing_ids)).all()
        return [_listing_to_dict(l) for l in listings]
    finally:
        session.close()


# ── Serialization Helpers ──────────────────────────────────────────────────────


def _listing_to_dict(listing: Listing) -> dict:
    """Convert a Listing ORM object to a dictionary."""
    if listing is None:
        return {}

    amenities_list = []
    try:
        amenities_list = json.loads(listing.amenities) if listing.amenities else []
    except (json.JSONDecodeError, TypeError):
        amenities_list = []

    return {
        "id": listing.id,
        "name": listing.name,
        "description": listing.description,
        "neighborhood_overview": listing.neighborhood_overview,
        "property_type": listing.property_type,
        "room_type": listing.room_type,
        "city": listing.city,
        "neighbourhood": listing.neighbourhood,
        "latitude": listing.latitude,
        "longitude": listing.longitude,
        "price_per_night": listing.price_per_night,
        "cleaning_fee": listing.cleaning_fee,
        "service_fee": listing.service_fee,
        "max_guests": listing.max_guests,
        "bedrooms": listing.bedrooms,
        "bathrooms": listing.bathrooms,
        "beds": listing.beds,
        "amenities": amenities_list,
        "host_id": listing.host_id,
        "host_name": listing.host_name,
        "host_response_rate": listing.host_response_rate,
        "host_is_superhost": listing.host_is_superhost,
        "check_in_time": listing.check_in_time,
        "check_out_time": listing.check_out_time,
        "min_nights": listing.min_nights,
        "max_nights": listing.max_nights,
        "cancellation_policy": listing.cancellation_policy,
        "pet_policy": listing.pet_policy,
        "smoking_allowed": listing.smoking_allowed,
        "party_allowed": listing.party_allowed,
        "rating": listing.rating,
        "cleanliness_score": listing.cleanliness_score,
        "communication_score": listing.communication_score,
        "location_score": listing.location_score,
        "review_count": listing.review_count,
        "listing_url": listing.listing_url,
        "picture_url": listing.picture_url,
    }


def _review_to_dict(review: Review) -> dict:
    """Convert a Review ORM object to a dictionary."""
    return {
        "id": review.id,
        "listing_id": review.listing_id,
        "reviewer_name": review.reviewer_name,
        "date": review.date,
        "rating": review.rating,
        "cleanliness": review.cleanliness,
        "communication": review.communication,
        "location": review.location,
        "comment_text": review.comment_text,
        "sentiment_score": review.sentiment_score,
    }
