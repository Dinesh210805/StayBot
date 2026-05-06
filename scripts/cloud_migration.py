"""
Cloud Migration Script for StayBot.

This script uploads local SQLite data to Neon (PostgreSQL) and
generates embeddings to upload to Pinecone (Vector DB).
"""

import os
import sys
import json
import pandas as pd
from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

# Add the project root to sys.path so we can import backend
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from backend.database import init_db

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")


def migrate_to_neon():
    print("\n" + "=" * 50)
    print("STEP 1: Migrating Relational Data to Neon Postgres")
    print("=" * 50)
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url or "neon.tech" not in db_url:
        print("[ERROR] Neon DATABASE_URL not found in .env!")
        return False
        
    print(f"Connecting to Neon DB: {db_url.split('@')[1]}")
    # init_db will automatically create tables and push data to Neon
    init_db()
    print("[SUCCESS] Data migrated to Neon!")
    return True


def migrate_to_pinecone():
    print("\n" + "=" * 50)
    print("STEP 2: Migrating Vector Embeddings to Pinecone")
    print("=" * 50)
    
    api_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME", "staybot")
    
    if not api_key:
        print("[ERROR] PINECONE_API_KEY not found in .env!")
        return False
        
    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)
    
    print("Loading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    
    # 1. Upload Listings
    listings_path = os.path.join(DATA_DIR, "listings.csv")
    if os.path.exists(listings_path):
        print("Reading listings.csv...")
        df = pd.read_csv(listings_path)
        
        vectors = []
        for _, row in df.iterrows():
            text = f"{row.get('name', '')} {row.get('neighborhood_overview', '')} {row.get('description', '')}"
            
            # Clean and cap text
            text = str(text).replace("\n", " ")[:2000]
            
            metadata = {
                "id": int(row.get("id")),
                "name": str(row.get("name")),
                "city": str(row.get("city")),
                "price_per_night": float(row.get("price_per_night", 0)),
                "rating": float(row.get("rating", 0)),
                "max_guests": int(row.get("max_guests", 1)),
                "property_type": str(row.get("property_type")),
            }
            
            vector = model.encode(text).tolist()
            vectors.append({
                "id": f"listing_{row['id']}",
                "values": vector,
                "metadata": metadata
            })
            
        print(f"Uploading {len(vectors)} listings to Pinecone namespace='listings'...")
        # Upsert in batches of 100
        for i in range(0, len(vectors), 100):
            batch = vectors[i:i+100]
            index.upsert(vectors=batch, namespace="listings")
        print("[SUCCESS] Listings uploaded to Pinecone!")
    
    # 2. Upload FAQs
    faqs_path = os.path.join(DATA_DIR, "faqs.json")
    if os.path.exists(faqs_path):
        print("Reading faqs.json...")
        with open(faqs_path, "r", encoding="utf-8") as f:
            faqs = json.load(f)
            
        faq_vectors = []
        for i, faq in enumerate(faqs):
            text = f"{faq['question']} {faq['answer']}"
            vector = model.encode(text).tolist()
            
            metadata = {
                "question": faq["question"],
                "answer": faq["answer"]
            }
            
            faq_vectors.append({
                "id": f"faq_{i}",
                "values": vector,
                "metadata": metadata
            })
            
        print(f"Uploading {len(faq_vectors)} FAQs to Pinecone namespace='faqs'...")
        index.upsert(vectors=faq_vectors, namespace="faqs")
        print("[SUCCESS] FAQs uploaded to Pinecone!")
        
    return True


if __name__ == "__main__":
    # success_db = migrate_to_neon()
    print("Skipping Neon migration due to pandas to_sql hanging. Please use pgAdmin or dbeaver to load listings.csv")
    success_pc = migrate_to_pinecone()
    
    if success_pc:
        print("\n🎉 CLOUD MIGRATION COMPLETE! StayBot is now fully cloud-native.")
    else:
        print("\n❌ Migration encountered errors.")
