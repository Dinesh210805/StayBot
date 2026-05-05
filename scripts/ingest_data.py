"""
ChromaDB ingestion script for StayBot.

Embeds listing descriptions and FAQ entries into ChromaDB collections
using the all-MiniLM-L6-v2 sentence transformer model.
"""

import os
import json
import pandas as pd
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
CHROMA_DIR = os.path.join(BASE_DIR, "embeddings", "chroma_db")

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
LISTINGS_COLLECTION = "listings"
FAQ_COLLECTION = "faqs"


def get_chroma_client():
    """Get a persistent ChromaDB client."""
    os.makedirs(CHROMA_DIR, exist_ok=True)
    return chromadb.PersistentClient(path=CHROMA_DIR)


def build_listing_text(row: pd.Series) -> str:
    """Build a rich text representation of a listing for embedding."""
    parts = []

    if pd.notna(row.get("name")):
        parts.append(f"Name: {row['name']}")
    if pd.notna(row.get("city")):
        parts.append(f"City: {row['city']}")
    if pd.notna(row.get("neighbourhood")):
        parts.append(f"Neighbourhood: {row['neighbourhood']}")
    if pd.notna(row.get("property_type")):
        parts.append(f"Property Type: {row['property_type']}")
    if pd.notna(row.get("room_type")):
        parts.append(f"Room Type: {row['room_type']}")
    if pd.notna(row.get("description")):
        # Truncate long descriptions
        desc = str(row["description"])[:500]
        parts.append(f"Description: {desc}")
    if pd.notna(row.get("neighborhood_overview")):
        overview = str(row["neighborhood_overview"])[:300]
        parts.append(f"Neighborhood: {overview}")
    if pd.notna(row.get("price_per_night")):
        parts.append(f"Price: ${row['price_per_night']:.0f}/night")
    if pd.notna(row.get("max_guests")):
        parts.append(f"Accommodates: {int(row['max_guests'])} guests")
    if pd.notna(row.get("bedrooms")):
        parts.append(f"Bedrooms: {int(row['bedrooms'])}")
    if pd.notna(row.get("rating")) and row["rating"] > 0:
        parts.append(f"Rating: {row['rating']}/5")

    # Parse amenities
    try:
        amenities = json.loads(row.get("amenities", "[]"))
        if amenities:
            # Take top 15 amenities
            parts.append(f"Amenities: {', '.join(amenities[:15])}")
    except (json.JSONDecodeError, TypeError):
        pass

    return "\n".join(parts)


def ingest_listings():
    """Embed and store listing descriptions in ChromaDB."""
    listings_path = os.path.join(DATA_DIR, "listings.csv")
    if not os.path.exists(listings_path):
        print("[INGEST] No listings.csv found. Run scripts/download_and_process.py first.")
        return

    print("[INGEST] Loading embedding model...")
    model = SentenceTransformer(EMBEDDING_MODEL)

    print("[INGEST] Loading listings...")
    df = pd.read_csv(listings_path)

    # Build text representations
    texts = []
    ids = []
    metadatas = []

    for _, row in df.iterrows():
        text = build_listing_text(row)
        listing_id = str(int(row["id"]))

        metadata = {
            "id": int(row["id"]),
            "name": str(row.get("name", "")),
            "city": str(row.get("city", "")),
            "price_per_night": float(row.get("price_per_night", 0)),
            "max_guests": int(row.get("max_guests", 1)) if pd.notna(row.get("max_guests")) else 1,
            "property_type": str(row.get("property_type", "")),
            "room_type": str(row.get("room_type", "")),
            "rating": float(row.get("rating", 0)) if pd.notna(row.get("rating")) else 0,
            "review_count": int(row.get("review_count", 0)) if pd.notna(row.get("review_count")) else 0,
        }

        texts.append(text)
        ids.append(listing_id)
        metadatas.append(metadata)

    # Embed
    print(f"[INGEST] Embedding {len(texts)} listings...")
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=32)

    # Store in ChromaDB
    client = get_chroma_client()

    # Delete existing collection if it exists
    try:
        client.delete_collection(LISTINGS_COLLECTION)
    except Exception:
        pass

    collection = client.create_collection(
        name=LISTINGS_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )

    # Add in batches (ChromaDB has batch size limits)
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        end = min(i + batch_size, len(texts))
        collection.add(
            documents=texts[i:end],
            embeddings=embeddings[i:end].tolist(),
            ids=ids[i:end],
            metadatas=metadatas[i:end],
        )

    print(f"[INGEST] Stored {collection.count()} listings in ChromaDB")


def ingest_faqs():
    """Embed and store FAQ entries in ChromaDB."""
    faqs_path = os.path.join(DATA_DIR, "faqs.json")
    if not os.path.exists(faqs_path):
        print("[INGEST] No faqs.json found.")
        return

    print("[INGEST] Loading FAQs...")
    with open(faqs_path, "r", encoding="utf-8") as f:
        faqs = json.load(f)

    model = SentenceTransformer(EMBEDDING_MODEL)

    texts = []
    ids = []
    metadatas = []

    for faq in faqs:
        # Combine question + answer + keywords for better retrieval
        text = f"Question: {faq['question']}\nAnswer: {faq['answer']}\nKeywords: {', '.join(faq.get('keywords', []))}"
        texts.append(text)
        ids.append(f"faq_{faq['id']}")
        metadatas.append({
            "id": faq["id"],
            "question": faq["question"],
            "answer": faq["answer"],
            "category": faq.get("category", "general"),
        })

    print(f"[INGEST] Embedding {len(texts)} FAQs...")
    embeddings = model.encode(texts, show_progress_bar=True)

    client = get_chroma_client()

    # Delete existing collection if it exists
    try:
        client.delete_collection(FAQ_COLLECTION)
    except Exception:
        pass

    collection = client.create_collection(
        name=FAQ_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )

    collection.add(
        documents=texts,
        embeddings=embeddings.tolist(),
        ids=ids,
        metadatas=metadatas,
    )

    print(f"[INGEST] Stored {collection.count()} FAQs in ChromaDB")


def main():
    print("=" * 60)
    print("StayBot — ChromaDB Ingestion")
    print("=" * 60)

    ingest_listings()
    print()
    ingest_faqs()

    print("\n[DONE] ChromaDB ingestion complete!")
    print(f"[DONE] Data stored at: {CHROMA_DIR}")


if __name__ == "__main__":
    main()
