"""Check Bangkok price ranges in the database."""
import sys
sys.path.insert(0, ".")
from backend.database import search_listings

print("=== Top 5 Bangkok listings by rating ===")
results = search_listings(city="Bangkok", limit=5)
for r in results:
    name = r["name"][:40]
    price = r["price_per_night"]
    guests = r["max_guests"]
    print(f"  ${price}/night | {guests} guests | {name}")

print()
cheap = search_listings(city="Bangkok", max_price=100, limit=10)
print(f"Bangkok listings under $100: {len(cheap)}")
for r in cheap[:5]:
    print(f"  ${r['price_per_night']}/night | guests: {r['max_guests']} | {r['name'][:40]}")

print()
cheap2 = search_listings(city="Bangkok", max_price=100, guests=2, limit=10)
print(f"Bangkok under $100 with 2+ guests: {len(cheap2)}")

print()
print("=== Price distribution for Bangkok ===")
all_bkk = search_listings(city="Bangkok", limit=150)
prices = sorted([r["price_per_night"] for r in all_bkk if r["price_per_night"]])
if prices:
    print(f"  Min: ${min(prices):.0f} | Max: ${max(prices):.0f} | Avg: ${sum(prices)/len(prices):.0f}")
    under_100 = [p for p in prices if p <= 100]
    print(f"  Under $100: {len(under_100)} listings")
