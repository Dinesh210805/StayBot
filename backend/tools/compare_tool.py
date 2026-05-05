"""
Comparison Tool for StayBot.

Provides side-by-side comparison of 2-3 listings on key attributes.
"""

from langchain_core.tools import tool
from backend.database import get_listings_by_ids


@tool
def compare_listings(listing_ids: str) -> str:
    """Compare 2-3 listings side by side on key attributes like price, rating,
    amenities, location, and cancellation policy. Use this when the user wants
    to compare properties.

    Examples:
    - 'Compare listings 123 and 456'
    - 'Which is better between listing 123, 456, and 789?'
    - 'Compare the first and third listings'

    Args:
        listing_ids: Comma-separated listing IDs to compare (e.g., '123,456,789')

    Returns:
        Formatted comparison table with key attributes and a recommendation
    """
    # Parse IDs
    try:
        ids = [int(id.strip()) for id in listing_ids.split(",") if id.strip()]
    except ValueError:
        return "Please provide valid listing IDs separated by commas (e.g., '123,456')."

    if len(ids) < 2:
        return "Please provide at least 2 listing IDs to compare."
    if len(ids) > 3:
        ids = ids[:3]
        # Silently limit to 3

    listings = get_listings_by_ids(ids)

    if len(listings) < 2:
        return f"Could not find enough listings. Found {len(listings)} out of {len(ids)} requested IDs."

    # Build comparison
    output = "## 📊 Side-by-Side Comparison\n\n"

    # Header row
    header = "| Attribute |"
    separator = "|---|"
    for listing in listings:
        name = listing["name"][:30]
        header += f" **{name}** |"
        separator += "---|"
    output += header + "\n" + separator + "\n"

    # Comparison rows
    attributes = [
        ("ID", lambda l: str(l["id"])),
        ("City", lambda l: l["city"]),
        ("Property Type", lambda l: l["property_type"]),
        ("Price/Night", lambda l: f"${l['price_per_night']:.0f}"),
        ("Rating", lambda l: f"⭐ {l['rating']}/5"),
        ("Reviews", lambda l: str(l["review_count"])),
        ("Max Guests", lambda l: str(l["max_guests"])),
        ("Bedrooms", lambda l: str(l["bedrooms"])),
        ("Cleaning Fee", lambda l: f"${l.get('cleaning_fee', 0):.0f}"),
        ("Cancellation", lambda l: (l.get("cancellation_policy", "N/A") or "N/A").split("—")[0].strip()),
        ("Pets", lambda l: l.get("pet_policy", "N/A")),
        ("Superhost", lambda l: "⭐ Yes" if l.get("host_is_superhost") == "t" else "No"),
    ]

    for attr_name, getter in attributes:
        row = f"| {attr_name} |"
        for listing in listings:
            try:
                value = getter(listing)
            except (KeyError, TypeError):
                value = "N/A"
            row += f" {value} |"
        output += row + "\n"

    # Determine winners
    output += "\n### 🏆 Category Winners\n"

    # Best price
    cheapest = min(listings, key=lambda l: l.get("price_per_night", float("inf")))
    output += f"- **Best Price:** {cheapest['name'][:30]} (${cheapest['price_per_night']:.0f}/night)\n"

    # Best rating
    best_rated = max(listings, key=lambda l: l.get("rating", 0) or 0)
    output += f"- **Highest Rated:** {best_rated['name'][:30]} (⭐ {best_rated['rating']}/5)\n"

    # Most spacious
    most_spacious = max(listings, key=lambda l: l.get("max_guests", 0) or 0)
    output += f"- **Most Spacious:** {most_spacious['name'][:30]} ({most_spacious['max_guests']} guests)\n"

    # Most reviewed
    most_reviewed = max(listings, key=lambda l: l.get("review_count", 0) or 0)
    output += f"- **Most Reviewed:** {most_reviewed['name'][:30]} ({most_reviewed['review_count']} reviews)\n"

    output += "\n💡 Ask me for a price breakdown on any of these listings!"

    return output
