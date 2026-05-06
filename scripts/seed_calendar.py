"""
Seed the BlockedDate table with random blocked dates for all listings.

This creates a simulated occupancy calendar so the booking engine
has realistic availability data to work with.
"""

import os
import sys
import random
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from backend.database import engine, Base, SessionLocal, Listing, BlockedDate


def seed_calendar(
    days_ahead: int = 90,
    min_blocked: int = 10,
    max_blocked: int = 30,
):
    """Populate BlockedDate table with random blocked dates for every listing.

    Args:
        days_ahead: How many days into the future to generate dates for
        min_blocked: Minimum number of blocked dates per listing
        max_blocked: Maximum number of blocked dates per listing
    """
    # Ensure tables exist (creates new ones without dropping existing data)
    Base.metadata.create_all(engine)

    session = SessionLocal()
    try:
        # Check if already seeded
        existing = session.query(BlockedDate).count()
        if existing > 0:
            print(f"[SEED] BlockedDate table already has {existing} entries. Clearing and re-seeding...")
            session.query(BlockedDate).delete()
            session.commit()

        # Get all listing IDs
        listing_ids = [row[0] for row in session.query(Listing.id).all()]
        print(f"[SEED] Generating blocked dates for {len(listing_ids)} listings...")

        # Generate date pool (today + days_ahead)
        today = date.today()
        all_dates = [today + timedelta(days=i) for i in range(days_ahead)]

        total_blocked = 0
        batch = []

        for listing_id in listing_ids:
            # Random number of blocked dates for this listing
            num_blocked = random.randint(min_blocked, max_blocked)
            # Pick random dates from the pool
            blocked_dates = random.sample(all_dates, min(num_blocked, len(all_dates)))

            for bd in blocked_dates:
                batch.append(BlockedDate(listing_id=listing_id, blocked_date=bd))
                total_blocked += 1

            # Bulk insert in batches of 500
            if len(batch) >= 500:
                session.bulk_save_objects(batch)
                session.commit()
                batch = []

        # Insert remaining
        if batch:
            session.bulk_save_objects(batch)
            session.commit()

        print(f"[SEED] Done! Created {total_blocked} blocked date entries across {len(listing_ids)} listings.")
        print(f"[SEED] Average blocked dates per listing: {total_blocked / len(listing_ids):.1f}")
        print(f"[SEED] Date range: {today} to {today + timedelta(days=days_ahead)}")

    finally:
        session.close()


if __name__ == "__main__":
    seed_calendar()
