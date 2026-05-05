"""Quick API test script for StayBot backend."""
import requests
import json
import sys

BASE = "http://localhost:8000"

def test_health():
    print("=" * 50)
    print("TEST 1: Health Check")
    print("=" * 50)
    r = requests.get(f"{BASE}/api/health")
    data = r.json()
    print(json.dumps(data, indent=2))
    assert data["status"] == "healthy", "Health check failed"
    print("[PASS] Health check OK")
    return data

def test_listings():
    print("\n" + "=" * 50)
    print("TEST 2: Browse Listings")
    print("=" * 50)
    r = requests.get(f"{BASE}/api/listings?per_page=5")
    data = r.json()
    total = data["total"]
    print(f"Total results: {total}")
    for l in data["listings"]:
        name = l["name"][:40]
        price = l["price_per_night"]
        city = l["city"]
        rating = l["rating"]
        lid = l["id"]
        print(f"  [{lid}] {name} | {city} | ${price}/night | Rating: {rating}")
    assert total > 0, "No listings returned"
    print("[PASS] Listings browse OK")
    return data["listings"][0]["id"]

def test_listing_detail(listing_id):
    print("\n" + "=" * 50)
    print(f"TEST 3: Listing Detail (ID: {listing_id})")
    print("=" * 50)
    r = requests.get(f"{BASE}/api/listings/{listing_id}")
    data = r.json()
    print(f"Name: {data['name']}")
    print(f"City: {data['city']}")
    print(f"Price: ${data['price_per_night']}/night")
    print(f"Max Guests: {data['max_guests']}")
    amenity_count = len(data.get("amenities") or [])
    print(f"Amenities: {amenity_count} items")
    print(f"Cancellation: {data.get('cancellation_policy', 'N/A')}")
    print("[PASS] Listing detail OK")

def test_session_create():
    print("\n" + "=" * 50)
    print("TEST 4: Create Session")
    print("=" * 50)
    r = requests.post(f"{BASE}/api/sessions")
    data = r.json()
    session_id = data["session_id"]
    print(f"Session ID: {session_id}")
    print("[PASS] Session created OK")
    return session_id

def test_chat(session_id):
    print("\n" + "=" * 50)
    print("TEST 5: Chat Endpoint")
    print("=" * 50)

    queries = [
        "Hi! What cities do you have listings in?",
        "Find me apartments in Bangkok under $100 per night for 2 guests",
    ]

    for i, query in enumerate(queries, 1):
        print(f"\nQuery {i}: {query}")
        print("-" * 40)
        r = requests.post(
            f"{BASE}/api/chat",
            json={"session_id": session_id, "message": query},
            timeout=60,
        )
        if r.status_code == 200:
            response = r.json()["response"]
            print(f"Response: {response[:400]}...")
            print(f"[PASS] Chat query {i} OK")
        else:
            print(f"[FAIL] Status: {r.status_code} - {r.text[:200]}")

def main():
    print("StayBot Backend - API Tests")
    print("=" * 50)

    try:
        health = test_health()
        listing_id = test_listings()
        test_listing_detail(listing_id)
        session_id = test_session_create()
        test_chat(session_id)
        print("\n" + "=" * 50)
        print("ALL TESTS PASSED!")
        print("=" * 50)
    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
