"""
Persistent Memory Tool for StayBot.

Provides tools to save and load user preferences across sessions.
Stores data in the Neon PostgreSQL `users` table.
"""

import json
from datetime import datetime
from langchain_core.tools import tool

from backend.database import SessionLocal, User


@tool
def save_user_preferences(
    user_name: str,
    preferences: str,
) -> str:
    """Save or update a user's long-term preferences so the bot can remember them
    across sessions. Use this tool when the user expresses clear preferences like
    favorite cities, budget range, pet requirements, or travel style.

    Args:
        user_name: The user's name (used as unique identifier)
        preferences: JSON string of preferences to save. Example:
            {"favorite_cities": ["Cape Town"], "budget_max": 100, "pet_friendly": true,
             "preferred_property_type": "apartment", "travel_style": "luxury"}

    Returns:
        Confirmation message
    """
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.name == user_name).first()

        # Parse and merge preferences
        try:
            new_prefs = json.loads(preferences)
        except json.JSONDecodeError:
            return "Invalid preferences format. Please provide valid JSON."

        if user:
            # Merge with existing preferences
            try:
                existing = json.loads(user.preferences) if user.preferences else {}
            except json.JSONDecodeError:
                existing = {}
            existing.update(new_prefs)
            user.preferences = json.dumps(existing)
            user.last_active = datetime.utcnow()
        else:
            # Create new user
            user = User(
                name=user_name,
                preferences=json.dumps(new_prefs),
            )
            session.add(user)

        session.commit()
        return (
            f"Preferences saved for {user_name}! "
            f"I'll remember these for your future visits."
        )
    finally:
        session.close()


@tool
def load_user_preferences(user_name: str) -> str:
    """Load a returning user's saved preferences and memory. Use this tool when
    a user identifies themselves or at the start of a conversation to personalize
    the experience.

    Args:
        user_name: The user's name to look up

    Returns:
        User's saved preferences and last visit info, or a message if user is new
    """
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.name == user_name).first()

        if not user:
            return (
                f"No saved profile found for '{user_name}'. "
                f"This appears to be a new user. "
                f"Feel free to ask me anything about stays!"
            )

        prefs = {}
        try:
            prefs = json.loads(user.preferences) if user.preferences else {}
        except json.JSONDecodeError:
            prefs = {}

        last_active = user.last_active.strftime("%B %d, %Y") if user.last_active else "Unknown"
        memory = user.memory_summary or ""

        # Build a human-readable summary
        pref_lines = []
        if prefs.get("favorite_cities"):
            pref_lines.append(f"Favorite cities: {', '.join(prefs['favorite_cities'])}")
        if prefs.get("budget_max"):
            pref_lines.append(f"Budget: up to ${prefs['budget_max']}/night")
        if prefs.get("budget_range"):
            pref_lines.append(f"Budget range: ${prefs['budget_range'][0]}-${prefs['budget_range'][1]}/night")
        if prefs.get("pet_friendly"):
            pref_lines.append("Preference: Pet-friendly properties")
        if prefs.get("preferred_property_type"):
            pref_lines.append(f"Preferred type: {prefs['preferred_property_type']}")
        if prefs.get("travel_style"):
            pref_lines.append(f"Travel style: {prefs['travel_style']}")
        if prefs.get("group_size"):
            pref_lines.append(f"Typical group size: {prefs['group_size']} guests")

        # Include any extra preferences not explicitly handled
        handled_keys = {
            "favorite_cities", "budget_max", "budget_range", "pet_friendly",
            "preferred_property_type", "travel_style", "group_size",
        }
        for key, value in prefs.items():
            if key not in handled_keys:
                pref_lines.append(f"{key.replace('_', ' ').title()}: {value}")

        prefs_str = "\n".join(pref_lines) if pref_lines else "No specific preferences saved yet."

        result = (
            f"Returning user: {user_name}\n"
            f"Last visit: {last_active}\n"
            f"Saved preferences:\n{prefs_str}"
        )
        if memory:
            result += f"\n\nPrevious context: {memory}"

        # Update last active timestamp
        user.last_active = datetime.utcnow()
        session.commit()

        return result
    finally:
        session.close()


@tool
def update_memory_summary(user_name: str, summary: str) -> str:
    """Save a brief summary of the current conversation to the user's long-term memory.
    Use this at the end of a conversation or when the user shares important context
    that should be remembered for next time.

    Args:
        user_name: The user's name
        summary: A brief summary of what was discussed or decided (max 500 chars)

    Returns:
        Confirmation message
    """
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.name == user_name).first()
        if not user:
            user = User(name=user_name, memory_summary=summary[:500])
            session.add(user)
        else:
            user.memory_summary = summary[:500]
            user.last_active = datetime.utcnow()

        session.commit()
        return f"Memory updated for {user_name}."
    finally:
        session.close()
