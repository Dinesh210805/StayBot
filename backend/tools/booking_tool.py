"""
Mock Booking Engine for StayBot.

Provides stateful tools for checking listing availability and making reservations.
Uses the BlockedDate and Booking tables in Neon PostgreSQL.
"""

import random
import string
from datetime import date, datetime, timedelta
from langchain_core.tools import tool

from backend.database import SessionLocal, Listing, Booking, BlockedDate


def _generate_reference() -> str:
    """Generate a unique booking reference like STB-2026-A3X7."""
    year = datetime.utcnow().year
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"STB-{year}-{suffix}"


@tool
def check_availability(listing_id: int, check_in: str, check_out: str) -> str:
    """Check if a listing is available for the given date range.
    Use this tool when the user wants to know if a place is free for specific dates,
    or before making a booking.

    Args:
        listing_id: The ID of the listing to check
        check_in: Check-in date in YYYY-MM-DD format
        check_out: Check-out date in YYYY-MM-DD format

    Returns:
        Availability status with details about any conflicts
    """
    session = SessionLocal()
    try:
        # Validate listing exists
        listing = session.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            return f"Listing ID {listing_id} not found. Please check the ID and try again."

        # Parse dates
        try:
            cin = datetime.strptime(check_in, "%Y-%m-%d").date()
            cout = datetime.strptime(check_out, "%Y-%m-%d").date()
        except ValueError:
            return "Invalid date format. Please use YYYY-MM-DD (e.g., 2026-06-15)."

        if cin >= cout:
            return "Check-out date must be after check-in date."

        if cin < date.today():
            return "Check-in date cannot be in the past."

        nights = (cout - cin).days

        # Check minimum/maximum nights
        if listing.min_nights and nights < listing.min_nights:
            return (
                f"This listing requires a minimum stay of {listing.min_nights} nights. "
                f"Your request is for {nights} nights."
            )
        if listing.max_nights and nights > listing.max_nights:
            return (
                f"This listing allows a maximum stay of {listing.max_nights} nights. "
                f"Your request is for {nights} nights."
            )

        # Generate all dates in the range
        requested_dates = [cin + timedelta(days=i) for i in range(nights)]

        # Check for blocked dates (simulated calendar)
        blocked = (
            session.query(BlockedDate.blocked_date)
            .filter(
                BlockedDate.listing_id == listing_id,
                BlockedDate.blocked_date.in_(requested_dates),
            )
            .all()
        )

        # Check for existing bookings that overlap
        overlapping = (
            session.query(Booking)
            .filter(
                Booking.listing_id == listing_id,
                Booking.status == "confirmed",
                Booking.check_in < cout,
                Booking.check_out > cin,
            )
            .all()
        )

        if blocked or overlapping:
            blocked_strs = [d[0].strftime("%Y-%m-%d") for d in blocked]
            booked_strs = [
                f"{b.check_in} to {b.check_out}" for b in overlapping
            ]
            conflicts = []
            if blocked_strs:
                conflicts.append(f"Blocked dates: {', '.join(blocked_strs[:5])}")
            if booked_strs:
                conflicts.append(f"Existing bookings: {', '.join(booked_strs[:3])}")

            return (
                f"**{listing.name}** is NOT available for {check_in} to {check_out}.\n"
                f"Conflicts: {'; '.join(conflicts)}\n"
                f"Try different dates or ask me to find similar listings!"
            )

        # Available!
        nightly = listing.price_per_night or 0
        cleaning = listing.cleaning_fee or 0
        service = listing.service_fee or 0
        total = (nightly * nights) + cleaning + service

        return (
            f"**{listing.name}** is AVAILABLE for {check_in} to {check_out}!\n\n"
            f"Nights: {nights}\n"
            f"Nightly rate: ${nightly:.2f}\n"
            f"Cleaning fee: ${cleaning:.2f}\n"
            f"Service fee: ${service:.2f}\n"
            f"**Total: ${total:.2f}**\n\n"
            f"Would you like me to book this? Just say 'book it' or "
            f"'book listing {listing_id} from {check_in} to {check_out}'!"
        )
    finally:
        session.close()


@tool
def book_listing(
    listing_id: int,
    check_in: str,
    check_out: str,
    guest_name: str,
    guests: int = 1,
) -> str:
    """Book a listing for the given dates. Use this tool when the user confirms
    they want to make a reservation. Always check availability first.

    Args:
        listing_id: The ID of the listing to book
        check_in: Check-in date in YYYY-MM-DD format
        check_out: Check-out date in YYYY-MM-DD format
        guest_name: Name of the guest making the booking
        guests: Number of guests (default 1)

    Returns:
        Booking confirmation with reference number and price breakdown
    """
    session = SessionLocal()
    try:
        listing = session.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            return f"Listing ID {listing_id} not found."

        try:
            cin = datetime.strptime(check_in, "%Y-%m-%d").date()
            cout = datetime.strptime(check_out, "%Y-%m-%d").date()
        except ValueError:
            return "Invalid date format. Please use YYYY-MM-DD."

        if cin >= cout:
            return "Check-out must be after check-in."

        nights = (cout - cin).days
        requested_dates = [cin + timedelta(days=i) for i in range(nights)]

        # Double-check availability
        blocked = (
            session.query(BlockedDate)
            .filter(
                BlockedDate.listing_id == listing_id,
                BlockedDate.blocked_date.in_(requested_dates),
            )
            .count()
        )
        overlapping = (
            session.query(Booking)
            .filter(
                Booking.listing_id == listing_id,
                Booking.status == "confirmed",
                Booking.check_in < cout,
                Booking.check_out > cin,
            )
            .count()
        )

        if blocked > 0 or overlapping > 0:
            return (
                f"Sorry, {listing.name} is no longer available for those dates. "
                "Please check availability again or try different dates."
            )

        # Check guest capacity
        if listing.max_guests and guests > listing.max_guests:
            return (
                f"This listing accommodates up to {listing.max_guests} guests. "
                f"You requested {guests}."
            )

        # Calculate pricing
        nightly = listing.price_per_night or 0
        cleaning = listing.cleaning_fee or 0
        service = listing.service_fee or 0
        total = (nightly * nights) + cleaning + service

        # Create booking
        ref = _generate_reference()
        booking = Booking(
            reference=ref,
            user_name=guest_name,
            listing_id=listing_id,
            check_in=cin,
            check_out=cout,
            guests=guests,
            total_price=total,
            status="confirmed",
        )
        session.add(booking)
        session.commit()

        return (
            f"BOOKING CONFIRMED!\n\n"
            f"Reference: **{ref}**\n"
            f"Property: {listing.name}\n"
            f"Location: {listing.city}\n"
            f"Check-in: {check_in} ({listing.check_in_time or 'TBD'})\n"
            f"Check-out: {check_out} ({listing.check_out_time or 'TBD'})\n"
            f"Guests: {guests}\n\n"
            f"--- Price Breakdown ---\n"
            f"Nightly rate: ${nightly:.2f} x {nights} nights = ${nightly * nights:.2f}\n"
            f"Cleaning fee: ${cleaning:.2f}\n"
            f"Service fee: ${service:.2f}\n"
            f"**TOTAL: ${total:.2f}**\n\n"
            f"Cancellation policy: {listing.cancellation_policy or 'Standard'}\n"
            f"Pet policy: {listing.pet_policy or 'Check with host'}\n\n"
            f"Save your reference number: {ref}"
        )
    finally:
        session.close()
