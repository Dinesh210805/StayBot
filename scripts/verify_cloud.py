import os
import psycopg2
from pinecone import Pinecone
from dotenv import load_dotenv

def verify_cloud():
    load_dotenv()
    
    print("\n" + "="*50)
    print("NEON POSTGRESQL VERIFICATION")
    print("="*50)
    try:
        db_url = os.getenv("DATABASE_URL")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM listings;")
        listings_count = cur.fetchone()[0]
        print(f"Total Listings in Database: {listings_count}")
        
        cur.execute("SELECT COUNT(*) FROM reviews;")
        reviews_count = cur.fetchone()[0]
        print(f"Total Reviews in Database: {reviews_count}")
        
        cur.execute("SELECT id, name, city FROM listings LIMIT 3;")
        print("\nSample Listings:")
        for row in cur.fetchall():
            print(f"  - [{row[0]}] {row[1]} ({row[2]})")
            
        conn.close()
    except Exception as e:
        print(f"Error connecting to Neon: {e}")

    print("\n" + "="*50)
    print("PINECONE VECTOR DB VERIFICATION")
    print("="*50)
    try:
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        index_name = os.getenv("PINECONE_INDEX_NAME")
        index = pc.Index(index_name)
        
        stats = index.describe_index_stats()
        print(f"Total Vectors Uploaded: {stats.total_vector_count}")
        print(f"Vector Dimension: {stats.dimension}")
        print("\nNamespaces Breakdown:")
        for ns, ns_info in stats.namespaces.items():
            print(f"  - '{ns}': {ns_info.vector_count} vectors")
            
    except Exception as e:
        print(f"Error connecting to Pinecone: {e}")
        
    print("\n" + "="*50)

if __name__ == "__main__":
    verify_cloud()
