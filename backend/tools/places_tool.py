"""
Nearby Places Tool for StayBot.

Uses the Overpass API (OpenStreetMap) — 100% free, no API key required —
to find restaurants, cafes, attractions, and other amenities near a listing.
"""

import requests
from langchain_core.tools import tool

from backend.database import SessionLocal, Listing

# Overpass API endpoint (public, free)
OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def _haversine_distance(lat1, lon1, lat2, lon2) -> float:
    """Calculate distance in meters between two lat/lon points."""
    import math
    R = 6371000  # Earth's radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@tool
def search_nearby_places(
    listing_id: int,
    place_type: str = "restaurant",
    radius: int = 500,
    limit: int = 5,
) -> str:
    """Find nearby places (restaurants, cafes, attractions, etc.) around a listing.
    Use this tool when the user asks about what's nearby, restaurants, cafes,
    things to do, or local attractions around a specific listing.

    Args:
        listing_id: The listing ID to search around
        place_type: Type of place to search for. Options:
            'restaurant', 'cafe', 'bar', 'supermarket', 'pharmacy',
            'museum', 'park', 'gym', 'hospital', 'atm', 'bus_station',
            'train_station', 'beach'
        radius: Search radius in meters (default 500, max 2000)
        limit: Maximum results to return (default 5, max 10)

    Returns:
        List of nearby places with names, types, and distances
    """
    radius = min(max(radius, 100), 2000)
    limit = min(max(limit, 1), 10)

    # Get listing coordinates
    session = SessionLocal()
    try:
        listing = session.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            return f"Listing ID {listing_id} not found."
        if not listing.latitude or not listing.longitude:
            return f"No coordinates available for listing {listing_id}."

        lat = listing.latitude
        lon = listing.longitude
        listing_name = listing.name
        listing_city = listing.city
    finally:
        session.close()

    # Map user-friendly types to OSM tags
    osm_tags = {
        "restaurant": 'amenity=restaurant',
        "cafe": 'amenity=cafe',
        "bar": 'amenity=bar',
        "supermarket": 'shop=supermarket',
        "pharmacy": 'amenity=pharmacy',
        "museum": 'tourism=museum',
        "park": 'leisure=park',
        "gym": 'leisure=fitness_centre',
        "hospital": 'amenity=hospital',
        "atm": 'amenity=atm',
        "bus_station": 'amenity=bus_station',
        "train_station": 'railway=station',
        "beach": 'natural=beach',
    }

    tag = osm_tags.get(place_type.lower(), f'amenity={place_type}')
    tag_key, tag_value = tag.split("=")

    # Build Overpass query
    query = f"""
    [out:json][timeout:10];
    (
      node["{tag_key}"="{tag_value}"](around:{radius},{lat},{lon});
      way["{tag_key}"="{tag_value}"](around:{radius},{lat},{lon});
    );
    out center body;
    """

    try:
        response = requests.post(OVERPASS_URL, data={"data": query}, timeout=15)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        return f"Could not search for nearby places: {str(e)[:100]}. Please try again."

    elements = data.get("elements", [])
    if not elements:
        return (
            f"No {place_type}s found within {radius}m of {listing_name}. "
            f"Try increasing the search radius or a different category."
        )

    # Extract and sort by distance
    places = []
    for el in elements:
        name = el.get("tags", {}).get("name", "")
        if not name:
            continue

        # Get coordinates (nodes have lat/lon directly, ways have center)
        p_lat = el.get("lat") or el.get("center", {}).get("lat")
        p_lon = el.get("lon") or el.get("center", {}).get("lon")

        if p_lat and p_lon:
            dist = _haversine_distance(lat, lon, p_lat, p_lon)
            cuisine = el.get("tags", {}).get("cuisine", "")
            opening = el.get("tags", {}).get("opening_hours", "")
            places.append({
                "name": name,
                "distance": round(dist),
                "cuisine": cuisine,
                "hours": opening,
                "lat": round(p_lat, 5),
                "lon": round(p_lon, 5),
            })

    # Sort by distance and limit
    places.sort(key=lambda x: x["distance"])
    places = places[:limit]

    if not places:
        return (
            f"Found {place_type} locations nearby but none had names. "
            f"Try a different category or larger radius."
        )

    # Format output
    lines = [
        f"Found {len(places)} {place_type}(s) near {listing_name} ({listing_city}):\n"
    ]
    for i, p in enumerate(places, 1):
        line = f"{i}. **{p['name']}** — {p['distance']}m away"
        if p["cuisine"]:
            line += f" | Cuisine: {p['cuisine']}"
        if p["hours"]:
            line += f" | Hours: {p['hours']}"
        line += f"\n   Coordinates: ({p['lat']}, {p['lon']})"
        lines.append(line)

    lines.append(
        f"\nAll locations are within {radius}m of the listing. "
        f"Ask me about a different category (cafe, bar, museum, park, gym, etc.)!"
    )

    return "\n".join(lines)
