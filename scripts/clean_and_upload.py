import os
import pandas as pd
import psycopg2
from dotenv import load_dotenv
import csv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

def clean_and_upload():
    # Ensure tables are created first!
    import sys
    sys.path.append(BASE_DIR)
    from backend.database import engine, Base
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    
    db_url = os.getenv("DATABASE_URL")
    print(f"Connecting to: {db_url.split('@')[1]}")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # --- LISTINGS ---
    listings_path = os.path.join(DATA_DIR, "listings.csv")
    temp_listings_path = os.path.join(DATA_DIR, "temp_listings.csv")
    
    if os.path.exists(listings_path):
        print("Cleaning listings data...")
        df = pd.read_csv(listings_path)
        
        # Convert float columns that are supposed to be integers
        int_cols = ['bedrooms', 'bathrooms', 'beds', 'host_id', 'min_nights', 'max_nights', 'review_count']
        for col in int_cols:
            if col in df.columns:
                df[col] = df[col].fillna(0).astype(int)
                
        # Fill NA for strings
        df = df.fillna("")
        
        # Save temp CSV
        df.to_csv(temp_listings_path, index=False, quoting=csv.QUOTE_MINIMAL)
        
        print("Emptying listings table...")
        cur.execute("TRUNCATE TABLE listings CASCADE;")
        
        print("Uploading cleaned listings via COPY...")
        with open(temp_listings_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader)
            columns = ", ".join([f'"{h}"' for h in headers])
            f.seek(0)
            cur.copy_expert(f"COPY listings ({columns}) FROM STDIN WITH CSV HEADER", f)
            
        print("Listings uploaded successfully!")
        os.remove(temp_listings_path)
        
    # --- REVIEWS ---
    reviews_path = os.path.join(DATA_DIR, "reviews.csv")
    temp_reviews_path = os.path.join(DATA_DIR, "temp_reviews.csv")
    
    if os.path.exists(reviews_path):
        print("Cleaning reviews data...")
        df = pd.read_csv(reviews_path)
        
        int_cols = ['listing_id', 'id', 'reviewer_id']
        for col in int_cols:
            if col in df.columns:
                df[col] = df[col].fillna(0).astype(int)
        
        df = df.fillna("")
        df.to_csv(temp_reviews_path, index=False, quoting=csv.QUOTE_MINIMAL)
        
        print("Emptying reviews table...")
        cur.execute("TRUNCATE TABLE reviews CASCADE;")
        
        print("Uploading cleaned reviews via COPY...")
        with open(temp_reviews_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader)
            columns = ", ".join([f'"{h}"' for h in headers])
            f.seek(0)
            cur.copy_expert(f"COPY reviews ({columns}) FROM STDIN WITH CSV HEADER", f)
            
        print("Reviews uploaded successfully!")
        os.remove(temp_reviews_path)

    conn.commit()
    cur.close()
    conn.close()
    print("All done!")

if __name__ == "__main__":
    clean_and_upload()
