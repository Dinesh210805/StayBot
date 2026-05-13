"""
Weather Forecast Tool for StayBot.

Uses the Open-Meteo API (100% free, no API key required) to fetch
7-day weather forecasts for any location using latitude/longitude.
"""

import requests
from langchain_core.tools import tool

from backend.database import SessionLocal, Listing

# Weather code to description mapping (WMO standard)
_WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}

# City coordinates for direct city-name lookups
_CITY_COORDS = {
    "bangkok": (13.7563, 100.5018),
    "london": (51.5074, -0.1278),
    "cape town": (-33.9249, 18.4241),
    "istanbul": (41.0082, 28.9784),
}


@tool
def get_weather_forecast(city: str = "", listing_id: int = 0) -> str:
    """Get a 7-day weather forecast for a destination. Use this tool when the user
    asks about weather, climate, or temperature at a destination. You can provide
    either a city name or a listing ID to get location-specific weather.

    Args:
        city: City name (supports Bangkok, London, Cape Town, Istanbul)
        listing_id: Optional listing ID to get weather for that listing's exact location

    Returns:
        7-day weather forecast with temperatures and conditions
    """
    lat, lon = None, None
    location_name = ""

    # Try listing-based lookup first (more precise)
    if listing_id:
        session = SessionLocal()
        try:
            listing = session.query(Listing).filter(Listing.id == listing_id).first()
            if listing and listing.latitude and listing.longitude:
                lat = listing.latitude
                lon = listing.longitude
                location_name = f"{listing.name} ({listing.city})"
        finally:
            session.close()

    # Fall back to city lookup
    if lat is None and city:
        city_lower = city.lower().strip()
        if city_lower in _CITY_COORDS:
            lat, lon = _CITY_COORDS[city_lower]
            location_name = city.title()
        else:
            return (
                f"I don't have coordinates for '{city}'. "
                f"I can check weather for Bangkok, London, Cape Town, or Istanbul. "
                f"Or provide a listing ID for exact location weather."
            )

    if lat is None:
        return "Please provide a city name or listing ID to check the weather."

    # Call Open-Meteo API
    try:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
            "timezone": "auto",
            "forecast_days": 7,
        }
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        daily = data.get("daily", {})
        dates = daily.get("time", [])
        max_temps = daily.get("temperature_2m_max", [])
        min_temps = daily.get("temperature_2m_min", [])
        precip_probs = daily.get("precipitation_probability_max", [])
        weather_codes = daily.get("weather_code", [])

        if not dates:
            return "Could not retrieve forecast data. Please try again."

        lines = [f"7-Day Weather Forecast for {location_name}:\n"]
        for i in range(len(dates)):
            code = weather_codes[i] if i < len(weather_codes) else 0
            desc = _WEATHER_CODES.get(code, "Unknown")
            high = max_temps[i] if i < len(max_temps) else "?"
            low = min_temps[i] if i < len(min_temps) else "?"
            precip = precip_probs[i] if i < len(precip_probs) else 0

            lines.append(
                f"  {dates[i]}: {desc} | High: {high}C, Low: {low}C | "
                f"Rain: {precip}%"
            )

        lines.append(
            f"\nBest days for outdoor activities: "
            + ", ".join(
                dates[i]
                for i in range(len(dates))
                if (precip_probs[i] if i < len(precip_probs) else 100) < 30
            )[:100]
            or "Check daily — rain chances are moderate throughout."
        )

        return "\n".join(lines)

    except requests.RequestException as e:
        return f"Could not fetch weather data: {str(e)[:100]}. Please try again."
