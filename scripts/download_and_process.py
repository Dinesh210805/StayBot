"""
Download and process Inside Airbnb data for StayBot.

Downloads detailed listings and reviews from Inside Airbnb for selected cities,
processes them into a unified format, and enriches with synthetic fields
that the PRD requires but Inside Airbnb doesn't provide.

Cities: Bangkok, London, Cape Town, Istanbul
"""

import os
import io
import gzip
import random
import json
import requests
import pandas as pd
import numpy as np

# ── Configuration ──────────────────────────────────────────────────────────────

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")

CITIES = {
    "Bangkok": {
        "listings": "https://data.insideairbnb.com/thailand/central-thailand/bangkok/2025-09-26/data/listings.csv.gz",
        "reviews": "https://data.insideairbnb.com/thailand/central-thailand/bangkok/2025-09-26/data/reviews.csv.gz",
    },
    "London": {
        "listings": "https://data.insideairbnb.com/united-kingdom/england/london/2025-09-14/data/listings.csv.gz",
        "reviews": "https://data.insideairbnb.com/united-kingdom/england/london/2025-09-14/data/reviews.csv.gz",
    },
    "Cape Town": {
        "listings": "https://data.insideairbnb.com/south-africa/wc/cape-town/2025-09-28/data/listings.csv.gz",
        "reviews": "https://data.insideairbnb.com/south-africa/wc/cape-town/2025-09-28/data/reviews.csv.gz",
    },
    "Istanbul": {
        "listings": "https://data.insideairbnb.com/turkey/marmara/istanbul/2025-09-29/data/listings.csv.gz",
        "reviews": "https://data.insideairbnb.com/turkey/marmara/istanbul/2025-09-29/data/reviews.csv.gz",
    },
}

# Currency conversion to USD (approximate rates)
# Inside Airbnb stores prices in local currency
CURRENCY_TO_USD = {
    "Bangkok": 1 / 35.0,     # THB -> USD  (1 USD ~ 35 THB)
    "London": 1.27,           # GBP -> USD  (1 GBP ~ 1.27 USD)
    "Cape Town": 1 / 18.5,   # ZAR -> USD  (1 USD ~ 18.5 ZAR)
    "Istanbul": 1 / 40.0,     # TRY -> USD  (1 USD ~ 40 TRY)
}

# How many listings to sample per city (to keep dataset manageable)
LISTINGS_PER_CITY = 150

# How many reviews to keep per listing (max)
REVIEWS_PER_LISTING = 10



# ── Download Helpers ───────────────────────────────────────────────────────────

def download_gz_csv(url: str, city: str, file_type: str) -> pd.DataFrame:
    """Download a gzipped CSV from Inside Airbnb and return as DataFrame."""
    cache_path = os.path.join(RAW_DIR, f"{city.lower().replace(' ', '_')}_{file_type}.csv.gz")

    if os.path.exists(cache_path):
        print(f"  [CACHE] Using cached {file_type} for {city}")
        with gzip.open(cache_path, "rt", encoding="utf-8") as f:
            return pd.read_csv(f, low_memory=False)

    print(f"  [DOWNLOAD] Downloading {file_type} for {city}...")
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    os.makedirs(RAW_DIR, exist_ok=True)
    with open(cache_path, "wb") as f:
        f.write(response.content)

    with gzip.open(io.BytesIO(response.content), "rt", encoding="utf-8") as f:
        return pd.read_csv(f, low_memory=False)


def download_csv(url: str, city: str, file_type: str) -> pd.DataFrame:
    """Download a plain CSV and return as DataFrame."""
    cache_path = os.path.join(RAW_DIR, f"{city.lower().replace(' ', '_')}_{file_type}.csv")

    if os.path.exists(cache_path):
        print(f"  [CACHE] Using cached {file_type} for {city}")
        return pd.read_csv(cache_path, low_memory=False)

    print(f"  [DOWNLOAD] Downloading {file_type} for {city}...")
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    os.makedirs(RAW_DIR, exist_ok=True)
    with open(cache_path, "wb") as f:
        f.write(response.content)

    return pd.read_csv(io.BytesIO(response.content), low_memory=False)


def fill_prices_from_summary(df: pd.DataFrame, summary_df: pd.DataFrame, city: str) -> pd.DataFrame:
    """Use summary listings prices when detailed listings omit price values."""
    if "price" not in df.columns or df["price"].notna().any():
        return df
    if summary_df is None or summary_df.empty or "id" not in summary_df.columns or "price" not in summary_df.columns:
        return df

    print(f"  [PRICE] Filling missing detailed prices from summary listings for {city}")
    summary_prices = summary_df[["id", "price"]].dropna(subset=["price"]).drop_duplicates("id")
    merged = df.merge(summary_prices, on="id", how="left", suffixes=("", "_summary"))
    if "price_summary" in merged.columns:
        merged["price"] = merged["price"].fillna(merged["price_summary"])
        merged.drop(columns=["price_summary"], inplace=True)
    return merged


# ── Processing Functions ───────────────────────────────────────────────────────

def clean_price(price_str):
    """Convert price string like '$150.00' to float."""
    if pd.isna(price_str):
        return None
    return float(str(price_str).replace("$", "").replace(",", ""))


def parse_amenities(amenities_str):
    """Parse amenities from Inside Airbnb format to JSON array."""
    if pd.isna(amenities_str):
        return "[]"
    try:
        # Inside Airbnb stores amenities as JSON array string
        parsed = json.loads(amenities_str)
        if isinstance(parsed, list):
            return json.dumps(parsed)
    except (json.JSONDecodeError, TypeError):
        pass
    return "[]"


def enrich_listing(row):
    """Add synthetic fields that Inside Airbnb doesn't provide."""
    random.seed(hash(str(row.get("id", 0))) % (2**32))

    price = row.get("price_per_night", 100)
    if pd.isna(price) or price <= 0:
        price = 100

    # Cleaning fee: 10-25% of nightly price, rounded
    cleaning_fee = round(price * random.uniform(0.10, 0.25), 2)

    # Service fee: 12-15% of nightly price
    service_fee = round(price * random.uniform(0.12, 0.15), 2)

    # Cancellation policy
    cancellation_policy = random.choice([
        "Flexible — Full refund up to 24 hours before check-in",
        "Moderate — Full refund up to 5 days before check-in",
        "Strict — 50% refund up to 7 days before check-in",
        "Non-refundable — No refund after booking",
    ])

    # Pet policy
    pet_policy = random.choice([
        "Pets allowed",
        "No pets allowed",
        "Pets allowed with prior approval",
        "Small pets only (under 10kg)",
    ])

    # House rules
    smoking_allowed = random.choice([True, False, False, False])  # 25% chance
    party_allowed = random.choice([True, False, False, False, False])  # 20% chance

    # Check-in/out times
    check_in_time = random.choice(["2:00 PM", "3:00 PM", "4:00 PM", "1:00 PM"])
    check_out_time = random.choice(["10:00 AM", "11:00 AM", "12:00 PM"])

    return pd.Series({
        "cleaning_fee": cleaning_fee,
        "service_fee": service_fee,
        "cancellation_policy": cancellation_policy,
        "pet_policy": pet_policy,
        "smoking_allowed": smoking_allowed,
        "party_allowed": party_allowed,
        "check_in_time": check_in_time,
        "check_out_time": check_out_time,
    })


def process_listings(df: pd.DataFrame, city: str) -> pd.DataFrame:
    """Process raw Inside Airbnb listings into our schema."""
    print(f"  [PROCESS] Processing {len(df)} listings for {city}...")
    print(f"  [DEBUG] Available columns: {list(df.columns[:20])}...")

    # Handle price column — different Inside Airbnb versions use different names
    price_col = None
    for candidate in ["price", "price_in_dollar", "price_string"]:
        if candidate in df.columns:
            price_col = candidate
            break
    if price_col is None:
        print(f"  [WARN] No price column found for {city}. Skipping.")
        return pd.DataFrame()

    # Select and rename columns to match our schema
    column_map = {
        "id": "id",
        "name": "name",
        "description": "description",
        "neighborhood_overview": "neighborhood_overview",
        "property_type": "property_type",
        "room_type": "room_type",
        "neighbourhood_cleansed": "neighbourhood",
        "latitude": "latitude",
        "longitude": "longitude",
        price_col: "price_raw",
        "accommodates": "max_guests",
        "bedrooms": "bedrooms",
        "bathrooms_text": "bathrooms",
        "beds": "beds",
        "amenities": "amenities_raw",
        "host_id": "host_id",
        "host_name": "host_name",
        "host_response_rate": "host_response_rate",
        "host_is_superhost": "host_is_superhost",
        "minimum_nights": "min_nights",
        "maximum_nights": "max_nights",
        "review_scores_rating": "rating",
        "review_scores_cleanliness": "cleanliness_score",
        "review_scores_communication": "communication_score",
        "review_scores_location": "location_score",
        "number_of_reviews": "review_count",
        "listing_url": "listing_url",
        "picture_url": "picture_url",
    }

    # Keep only columns that exist
    available_cols = {k: v for k, v in column_map.items() if k in df.columns}
    processed = df[list(available_cols.keys())].rename(columns=available_cols).copy()

    # Add city column
    processed["city"] = city

    # Clean price and convert to USD
    processed["price_per_night"] = processed["price_raw"].apply(clean_price)
    processed.drop(columns=["price_raw"], inplace=True, errors="ignore")

    # Apply currency conversion to USD
    fx_rate = CURRENCY_TO_USD.get(city, 1.0)
    if fx_rate != 1.0:
        print(f"  [FX] Converting prices to USD (rate: {fx_rate:.4f})")
        processed["price_per_night"] = (processed["price_per_night"] * fx_rate).round(2)


    # Parse amenities
    processed["amenities"] = processed["amenities_raw"].apply(parse_amenities)
    processed.drop(columns=["amenities_raw"], inplace=True, errors="ignore")

    # Clean bathrooms (e.g., "2 baths" -> 2.0)
    if "bathrooms" in processed.columns:
        processed["bathrooms"] = processed["bathrooms"].apply(
            lambda x: float(str(x).split()[0]) if pd.notna(x) and str(x).split()[0].replace(".", "").isdigit() else 1.0
        )

    # Filter: only keep listings with valid price and name
    processed = processed[
        processed["price_per_night"].notna()
        & (processed["price_per_night"] > 0)
        & processed["name"].notna()
    ].copy()

    # Filter: prefer listings with reviews and descriptions
    processed["has_reviews"] = processed["review_count"].fillna(0) > 0
    processed["has_description"] = processed["description"].notna()
    processed = processed.sort_values(
        by=["has_reviews", "has_description", "review_count"],
        ascending=[False, False, False],
    )

    # Sample top N listings
    processed = processed.head(LISTINGS_PER_CITY).copy()
    processed.drop(columns=["has_reviews", "has_description"], inplace=True)

    # Enrich with synthetic fields
    enriched = processed.apply(enrich_listing, axis=1)
    processed = pd.concat([processed, enriched], axis=1)

    # Fill NaN values
    processed["description"] = processed["description"].fillna("A lovely stay in " + city)
    processed["neighborhood_overview"] = processed["neighborhood_overview"].fillna("")
    processed["bedrooms"] = processed["bedrooms"].fillna(1)
    processed["beds"] = processed.get("beds", pd.Series([1] * len(processed))).fillna(1)
    processed["rating"] = processed["rating"].fillna(0)
    processed["review_count"] = processed["review_count"].fillna(0).astype(int)
    processed["host_response_rate"] = processed["host_response_rate"].fillna("N/A")
    processed["host_is_superhost"] = processed["host_is_superhost"].fillna("f")

    print(f"  [DONE] Kept {len(processed)} listings for {city}")
    return processed


def process_reviews(df: pd.DataFrame, valid_listing_ids: set, city: str) -> pd.DataFrame:
    """Process raw Inside Airbnb reviews into our schema."""
    print(f"  [PROCESS] Processing reviews for {city}...")

    # Filter to only reviews for our selected listings
    df = df[df["listing_id"].isin(valid_listing_ids)].copy()

    # Rename columns
    column_map = {
        "id": "id",
        "listing_id": "listing_id",
        "reviewer_name": "reviewer_name",
        "date": "date",
        "comments": "comment_text",
    }

    available_cols = {k: v for k, v in column_map.items() if k in df.columns}
    processed = df[list(available_cols.keys())].rename(columns=available_cols).copy()

    # Add synthetic review scores (derived from listing averages with variance)
    random.seed(42)
    processed["rating"] = processed.apply(
        lambda _: round(random.uniform(3.0, 5.0), 1), axis=1
    )
    processed["cleanliness"] = processed.apply(
        lambda _: round(random.uniform(3.0, 5.0), 1), axis=1
    )
    processed["communication"] = processed.apply(
        lambda _: round(random.uniform(3.5, 5.0), 1), axis=1
    )
    processed["location"] = processed.apply(
        lambda _: round(random.uniform(3.0, 5.0), 1), axis=1
    )

    # Sentiment score (simple heuristic: higher rating = higher sentiment)
    processed["sentiment_score"] = processed["rating"].apply(
        lambda r: round(r / 5.0, 2)
    )

    # Limit reviews per listing
    processed = (
        processed.groupby("listing_id")
        .head(REVIEWS_PER_LISTING)
        .reset_index(drop=True)
    )

    # Fill NaN
    processed["reviewer_name"] = processed["reviewer_name"].fillna("Anonymous")
    processed["comment_text"] = processed["comment_text"].fillna("")

    print(f"  [DONE] Kept {len(processed)} reviews for {city}")
    return processed


# ── Main Pipeline ──────────────────────────────────────────────────────────────

def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    all_listings = []
    all_reviews = []

    for city, urls in CITIES.items():
        print(f"\n{'='*60}")
        print(f"Processing {city}")
        print(f"{'='*60}")

        # Download
        listings_df = download_gz_csv(urls["listings"], city, "listings")
        if "summary_listings" in urls:
            summary_df = download_csv(urls["summary_listings"], city, "summary_listings")
            listings_df = fill_prices_from_summary(listings_df, summary_df, city)
        reviews_df = download_gz_csv(urls["reviews"], city, "reviews")

        # Process listings
        processed_listings = process_listings(listings_df, city)
        if processed_listings.empty:
            print(f"  [SKIP] No valid listings for {city}, skipping reviews too.")
            continue

        valid_ids = set(processed_listings["id"].values)

        # Process reviews
        processed_reviews = process_reviews(reviews_df, valid_ids, city)

        all_listings.append(processed_listings)
        if not processed_reviews.empty:
            all_reviews.append(processed_reviews)

    if not all_listings:
        print("[ERROR] No listings processed from any city!")
        return

    # Combine all cities
    final_listings = pd.concat(all_listings, ignore_index=True)
    final_reviews = pd.concat(all_reviews, ignore_index=True) if all_reviews else pd.DataFrame()

    # Save
    listings_path = os.path.join(DATA_DIR, "listings.csv")
    reviews_path = os.path.join(DATA_DIR, "reviews.csv")

    final_listings.to_csv(listings_path, index=False)
    final_reviews.to_csv(reviews_path, index=False)

    print(f"\n{'='*60}")
    print(f"DATASET READY")
    print(f"{'='*60}")
    print(f"Listings: {len(final_listings)} saved to {listings_path}")
    print(f"Reviews:  {len(final_reviews)} saved to {reviews_path}")
    print(f"Cities:   {', '.join(CITIES.keys())}")
    print(f"\nColumns in listings: {list(final_listings.columns)}")


if __name__ == "__main__":
    main()
