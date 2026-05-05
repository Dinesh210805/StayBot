"""
Listing Detail Tool for StayBot.

Retrieves comprehensive details about a specific listing including
amenities, house rules, host info, and recent reviews.
"""

import json
from langchain_core.tools import tool
from backend.database import get_listing_by_id, get_listing_reviews


@tool
def get_listing_details(listing_id: int) -> str:
    """Get full details about a specific listing by its ID. Use this when the user
    asks for more information about a listing, wants to know house rules,
    amenities, host info, or reviews for a specific property.

    Examples:
    - 'Tell me more about listing 12345'
    - 'What are the house rules for that apartment?'
    - 'Show me the full details of the second one' (you should resolve the ID first)

    Args:
        listing_id: The unique ID of the listing

    Returns:
        Comprehensive listing details including amenities, rules, host info, and reviews
    """
    listing = get_listing_by_id(listing_id)

    if not listing:
        return f"No listing found with ID {listing_id}. Please check the ID and try again."

    # Format amenities
    amenities = listing.get("amenities", [])
    if isinstance(amenities, list) and amenities:
        amenities_str = ", ".join(amenities[:20])
        if len(amenities) > 20:
            amenities_str += f" (+{len(amenities) - 20} more)"
    else:
        amenities_str = "Not specified"

    # Build comprehensive detail view
    output = f"""## {listing['name']}
**ID:** {listing['id']}
**City:** {listing['city']}, {listing.get('neighbourhood', 'N/A')}
**Property Type:** {listing['property_type']} — {listing['room_type']}

### 💰 Pricing
- **Nightly Rate:** ${listing['price_per_night']:.2f}
- **Cleaning Fee:** ${listing.get('cleaning_fee', 0):.2f}
- **Service Fee:** ${listing.get('service_fee', 0):.2f}

### 🏠 Space
- **Max Guests:** {listing['max_guests']}
- **Bedrooms:** {listing['bedrooms']}
- **Bathrooms:** {listing.get('bathrooms', 'N/A')}
- **Beds:** {listing.get('beds', 'N/A')}

### ⭐ Ratings
- **Overall:** {listing['rating']}/5 ({listing['review_count']} reviews)
- **Cleanliness:** {listing.get('cleanliness_score', 'N/A')}/5
- **Communication:** {listing.get('communication_score', 'N/A')}/5
- **Location:** {listing.get('location_score', 'N/A')}/5

### 📋 House Rules
- **Check-in:** {listing.get('check_in_time', 'N/A')}
- **Check-out:** {listing.get('check_out_time', 'N/A')}
- **Min Nights:** {listing.get('min_nights', 'N/A')}
- **Max Nights:** {listing.get('max_nights', 'N/A')}
- **Smoking:** {'✅ Allowed' if listing.get('smoking_allowed') else '❌ Not allowed'}
- **Parties:** {'✅ Allowed' if listing.get('party_allowed') else '❌ Not allowed'}
- **Pets:** {listing.get('pet_policy', 'N/A')}
- **Cancellation:** {listing.get('cancellation_policy', 'N/A')}

### 👤 Host
- **Name:** {listing.get('host_name', 'N/A')}
- **Response Rate:** {listing.get('host_response_rate', 'N/A')}
- **Superhost:** {'⭐ Yes' if listing.get('host_is_superhost') == 't' else 'No'}

### 🔑 Amenities
{amenities_str}

### 📝 Description
{listing.get('description', 'No description available.')[:500]}
"""

    # Add recent reviews
    reviews = get_listing_reviews(listing_id, limit=3)
    if reviews:
        output += "\n### 💬 Recent Reviews\n"
        for review in reviews:
            comment = review.get("comment_text", "")[:200]
            if comment:
                reviewer = review.get("reviewer_name", "Anonymous")
                rating = review.get("rating", "N/A")
                output += f"- **{reviewer}** (⭐ {rating}/5): \"{comment}...\"\n"

    return output
