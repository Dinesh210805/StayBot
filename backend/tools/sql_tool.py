"""
SQL Structured Filter Tool for StayBot.

Uses SQLite to perform precise filtering by price, city, guests, property type, etc.
Best for queries with specific numeric constraints.
"""

import json
from typing import Optional
from langchain_core.tools import tool
from backend.database import search_listings


@tool
def filter_listings(
    city: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    guests: Optional[int] = None,
    property_type: Optional[str] = None,
    room_type: Optional[str] = None,
    amenities: Optional[str] = None,
    min_rating: Optional[float] = None,
) -> str:
    """Filter listings using specific criteria like city, price range, number of guests,
    property type, and amenities. Use this tool when the user provides structured
    requirements with specific values.

    Examples of when to use this:
    - 'apartments in Bangkok under $100/night'
    - 'places for 4 guests in Barcelona'
    - 'listings with WiFi and kitchen in Cape Town'

    Args:
        city: City name (e.g., 'Bangkok', 'London', 'Cape Town', 'Istanbul')
        min_price: Minimum price per night in USD
        max_price: Maximum price per night in USD
        guests: Number of guests the listing should accommodate
        property_type: Type like 'Entire home/apt', 'Private room', 'Hotel room'
        room_type: Room type filter
        amenities: Comma-separated list of required amenities (e.g., 'WiFi,Kitchen,Pool')
        min_rating: Minimum rating (0-5)

    Returns:
        Formatted string with matching listings
    """
    # Parse amenities from comma-separated string
    amenities_list = None
    if amenities:
        amenities_list = [a.strip() for a in amenities.split(",") if a.strip()]

    results = search_listings(
        city=city,
        min_price=min_price,
        max_price=max_price,
        guests=guests,
        property_type=property_type,
        room_type=room_type,
        amenities=amenities_list,
        min_rating=min_rating,
        limit=5,
    )

    if not results:
        # Build a helpful message about what was searched
        criteria = []
        if city:
            criteria.append(f"city: {city}")
        if max_price:
            criteria.append(f"under ${max_price}/night")
        if guests:
            criteria.append(f"for {guests} guests")
        criteria_str = ", ".join(criteria) if criteria else "your criteria"
        return (
            f"No listings found matching {criteria_str}. "
            "Try relaxing your filters — increase the budget, reduce guest count, "
            "or try a different city. Available cities: Bangkok, London, Cape Town, Istanbul."
        )

    # Format results
    output_lines = [f"Found {len(results)} listings:\n"]

    for i, listing in enumerate(results, 1):
        amenities_display = listing.get("amenities", [])
        if isinstance(amenities_display, list):
            amenities_str = ", ".join(amenities_display[:8])
        else:
            amenities_str = "N/A"

        output_lines.append(
            f"{i}. **{listing['name']}** (ID: {listing['id']})\n"
            f"   📍 {listing['city']}, {listing.get('neighbourhood', 'N/A')}\n"
            f"   🏠 {listing['property_type']} — {listing['room_type']}\n"
            f"   💰 ${listing['price_per_night']:.0f}/night | ⭐ {listing['rating']}/5\n"
            f"   👥 Up to {listing['max_guests']} guests | 🛏️ {listing['bedrooms']} bedrooms\n"
            f"   🔑 Amenities: {amenities_str}\n"
        )

    output_lines.append(
        "\n💡 Ask about any listing by number or ID for full details!"
    )

    return "\n".join(output_lines)
