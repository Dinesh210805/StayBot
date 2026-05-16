"""Pytest-compatible API tests for StayBot backend.

These tests assume the dev server is running at http://localhost:8000.
"""
import json
import requests
import pytest

BASE = "http://localhost:8000"


def test_health():
    r = requests.get(f"{BASE}/api/health")
    data = r.json()
    assert data.get("status") == "healthy"


def test_listings():
    r = requests.get(f"{BASE}/api/listings?per_page=5")
    data = r.json()
    assert data.get("total", 0) > 0


@pytest.fixture(scope="session")
def listing_id():
    r = requests.get(f"{BASE}/api/listings?per_page=5")
    data = r.json()
    listings = data.get("listings", [])
    assert listings, "No listings available for tests"
    return listings[0]["id"]


def test_listing_detail(listing_id):
    r = requests.get(f"{BASE}/api/listings/{listing_id}")
    assert r.status_code == 200
    data = r.json()
    assert "name" in data and "city" in data


@pytest.fixture(scope="session")
def session_id():
    r = requests.post(f"{BASE}/api/sessions")
    data = r.json()
    sid = data.get("session_id")
    assert sid, "Failed to create session for tests"
    return sid


def test_chat(session_id):
    queries = [
        "Hi! What cities do you have listings in?",
        "Find me apartments in Bangkok under $100 per night for 2 guests",
    ]
    for q in queries:
        r = requests.post(f"{BASE}/api/chat", json={"session_id": session_id, "message": q}, timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert "response" in data

