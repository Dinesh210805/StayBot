"""
RAG Semantic Search Tool for StayBot.

Uses ChromaDB to perform similarity search over listing descriptions.
Best for natural language queries like "cozy cabin near the beach".
"""

import os
import json
from langchain_core.tools import tool
from sentence_transformers import SentenceTransformer
import chromadb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CHROMA_DIR = os.path.join(BASE_DIR, "embeddings", "chroma_db")

# Lazy-loaded globals
_model = None
_collection = None


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = client.get_collection("listings")
    return _collection


@tool
def search_listings_semantic(query: str, n_results: int = 5) -> str:
    """Search for stay listings using natural language. Use this tool when the user
    describes what kind of place they want in free-form text, mentions vibes, moods,
    or uses descriptive language. Examples: 'cozy apartment near the beach',
    'luxury villa with a pool for a group', 'quiet place to work remotely'.

    Args:
        query: Natural language description of the desired stay
        n_results: Number of results to return (default 5, max 10)

    Returns:
        Formatted string with matching listings including name, city, price, rating, and amenities
    """
    n_results = min(max(n_results, 1), 10)

    model = _get_model()
    collection = _get_collection()

    # Embed the query
    query_embedding = model.encode(query).tolist()

    # Search ChromaDB
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )

    if not results["metadatas"] or not results["metadatas"][0]:
        return "No matching listings found. Try broadening your search criteria."

    # Format results
    output_lines = [f"Found {len(results['metadatas'][0])} matching listings:\n"]

    for i, (metadata, distance) in enumerate(
        zip(results["metadatas"][0], results["distances"][0]), 1
    ):
        relevance = max(0, round((1 - distance) * 100, 1))
        name = metadata.get("name", "Unknown")
        city = metadata.get("city", "Unknown")
        price = metadata.get("price_per_night", 0)
        rating = metadata.get("rating", 0)
        guests = metadata.get("max_guests", 1)
        prop_type = metadata.get("property_type", "Unknown")
        listing_id = metadata.get("id", 0)

        output_lines.append(
            f"{i}. **{name}** (ID: {listing_id})\n"
            f"   📍 {city} | 🏠 {prop_type}\n"
            f"   💰 ${price:.0f}/night | ⭐ {rating}/5 | 👥 Up to {guests} guests\n"
            f"   🎯 Relevance: {relevance}%\n"
        )

    output_lines.append(
        "\n💡 Ask me about any listing for full details, price breakdown, or to compare them!"
    )

    return "\n".join(output_lines)
