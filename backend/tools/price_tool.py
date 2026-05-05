"""
Price Breakdown Tool for StayBot.

Calculates and displays total cost for a stay including all fees and taxes.
"""

from langchain_core.tools import tool
from backend.database import get_listing_by_id

TAX_RATE = 0.12  # 12% estimated tax


@tool
def calculate_price_breakdown(listing_id: int, num_nights: int) -> str:
    """Calculate and display a full price breakdown for a stay at a specific listing.
    Use this when the user asks about total cost, price for X nights, or wants
    to understand all the charges.

    Examples:
    - 'How much will 3 nights cost at listing 12345?'
    - 'What's the total price for a week at that villa?'
    - 'Break down the costs for 2 nights'

    Args:
        listing_id: The unique ID of the listing
        num_nights: Number of nights for the stay

    Returns:
        Detailed price breakdown with all fees, taxes, and total
    """
    if num_nights < 1:
        return "Number of nights must be at least 1."
    if num_nights > 365:
        return "Maximum stay calculation is 365 nights. For longer stays, please contact the host directly."

    listing = get_listing_by_id(listing_id)
    if not listing:
        return f"No listing found with ID {listing_id}. Please check the ID and try again."

    price_per_night = listing.get("price_per_night", 0)
    cleaning_fee = listing.get("cleaning_fee", 0)
    service_fee = listing.get("service_fee", 0)

    # Check minimum nights
    min_nights = listing.get("min_nights", 1) or 1
    if num_nights < min_nights:
        return (
            f"This listing requires a minimum stay of {min_nights} nights. "
            f"Please adjust your stay duration."
        )

    # Calculate
    base_total = price_per_night * num_nights
    subtotal = base_total + cleaning_fee + service_fee
    taxes = round(subtotal * TAX_RATE, 2)
    grand_total = round(subtotal + taxes, 2)

    # Format output
    output = f"""## 💰 Price Breakdown — {listing['name']}

| Item | Amount |
|------|--------|
| Base price: ${price_per_night:.2f} × {num_nights} nights | **${base_total:.2f}** |
| Cleaning fee (one-time) | ${cleaning_fee:.2f} |
| Service fee | ${service_fee:.2f} |
| **Subtotal** | **${subtotal:.2f}** |
| Taxes (estimated {int(TAX_RATE * 100)}%) | ${taxes:.2f} |
| **Total** | **${grand_total:.2f}** |

📍 {listing['city']} | 🏠 {listing['property_type']}
👥 Up to {listing['max_guests']} guests | ⭐ {listing['rating']}/5

💡 Price is in USD. Actual taxes may vary by location.
"""

    # Add cancellation info
    policy = listing.get("cancellation_policy", "")
    if policy:
        output += f"\n📋 **Cancellation Policy:** {policy}"

    return output
