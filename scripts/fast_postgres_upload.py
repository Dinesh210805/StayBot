import os
import csv
import psycopg2
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

def fast_upload():
    db_url = os.getenv("DATABASE_URL")
    print(f"Connecting to: {db_url.split('@')[1]}")
    
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # Upload Listings
    listings_path = os.path.join(DATA_DIR, "listings.csv")
    if os.path.exists(listings_path):
        print("Emptying listings table...")
        cur.execute("TRUNCATE TABLE listings CASCADE;")
        
        print("Uploading listings.csv via COPY...")
        with open(listings_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader)
            # Create a comma-separated list of column names
            columns = ", ".join([f'"{h}"' for h in headers])
            # Reset file pointer to beginning for copy_expert
            f.seek(0)
            cur.copy_expert(f"COPY listings ({columns}) FROM STDIN WITH CSV HEADER", f)
        print("✅ Listings uploaded successfully!")

    # Upload Reviews
    reviews_path = os.path.join(DATA_DIR, "reviews.csv")
    if os.path.exists(reviews_path):
        print("Emptying reviews table...")
        cur.execute("TRUNCATE TABLE reviews CASCADE;")
        
        print("Uploading reviews.csv via COPY...")
        with open(reviews_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader)
            columns = ", ".join([f'"{h}"' for h in headers])
            f.seek(0)
            cur.copy_expert(f"COPY reviews ({columns}) FROM STDIN WITH CSV HEADER", f)
        print("✅ Reviews uploaded successfully!")

    conn.commit()
    cur.close()
    conn.close()
    print("All done!")

if __name__ == "__main__":
    fast_upload()
