# StayBot — API & Endpoint Documentation

> **Purpose:** This document is the complete reference for all StayBot backend API endpoints.
> It is intended to give a UI/design tool (Stitch, Figma, v0, etc.) full context
> on what data the backend provides, so the frontend can be designed and built precisely.

---

## Base URL

```
http://localhost:8000
```

In production, this would be your deployed domain, e.g. `https://api.staybot.app`.

---

## Global Headers

| Header | Value | Required |
|---|---|---|
| `Content-Type` | `application/json` | For POST requests |
| `Accept` | `application/json` | Optional, assumed |

> **CORS:** Origins are controlled by the `ALLOWED_ORIGINS` environment variable.
> If it is not set, the backend defaults to `*`. Public UI endpoints do not need
> an authentication token. The admin status endpoint requires a token query parameter.

---

## Response Envelope

All responses follow standard HTTP status codes:

| Code | Meaning |
|---|---|
| `200` | Success |
| `403` | Forbidden / invalid admin token |
| `404` | Resource not found |
| `422` | Validation error (bad request body) |
| `500` | Server error |

---

## Endpoints

---

### 1. `GET /api/health`

**Health check.** Returns system status, available cities, and total listing count.
Use this to show a "connected" status indicator in the UI or for initial data loading.

#### Request
```
GET /api/health
```
No body, no parameters.

#### Response `200 OK`
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "cities": [
    "Bangkok",
    "London",
    "Cape Town"
  ],
  "total_listings": 450
}
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `status` | string | Always `"healthy"` when server is up |
| `version` | string | API version string |
| `cities` | string[] | List of available city names (use to populate city filter dropdowns) |
| `total_listings` | integer | Total number of listings in the database |

#### UI Usage
- On app load: call this to populate city filter dropdown with `cities`
- Show a green "Connected" badge when `status === "healthy"`
- Display total listing count in hero section

---

### 2. `GET /api/agent/status`

**Admin-only agent key rotation status.** Returns Groq API key pool health and
usage counters for backend monitoring. This route is hidden from generated
OpenAPI docs (`include_in_schema=False`) but is implemented in the backend.

#### Request
```
GET /api/agent/status?token=staybot_admin_secret_change_me
```

#### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | Must match the backend `ADMIN_TOKEN` environment variable |

#### Response `200 OK`
```json
{
  "total_keys": 3,
  "bad_keys": 0,
  "rate_limited_keys": 0,
  "available_keys": 3,
  "usage_per_key": {
    "key_1": 12,
    "key_2": 11,
    "key_3": 10
  }
}
```

#### Error Responses

| Status | Scenario |
|---|---|
| `422` | Missing required `token` query parameter |
| `403` | Token is present but does not match `ADMIN_TOKEN`, or `ADMIN_TOKEN` is not configured |

#### UI Usage
- Use only in an internal/admin dashboard, not in the public guest-facing UI
- Can power a small "LLM capacity" or "key pool" operational status view

---

### 3. `POST /api/sessions`

**Create a new chat session.** Must be called before `/api/chat`.
Each session has isolated conversation history.

#### Request
```
POST /api/sessions
Content-Type: application/json

{}
```
Empty body (no fields required).

#### Response `200 OK`
```json
{
  "session_id": "5cb2e1e2-a361-4034-bcfe-c7fc5e090380",
  "message": "Session created successfully. Start chatting!"
}
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `session_id` | string (UUID) | Unique identifier for this conversation. Store in client state. |
| `message` | string | Human-readable confirmation message |

#### UI Usage
- Call this when the user opens the chat for the first time
- Store `session_id` in React state / localStorage
- One session per user tab/browser session

---

### 4. `DELETE /api/sessions/{session_id}`

**Clear/reset a chat session.** Deletes the conversation history for this session.

#### Request
```
DELETE /api/sessions/5cb2e1e2-a361-4034-bcfe-c7fc5e090380
```

#### Response `200 OK`
```json
{
  "session_id": "5cb2e1e2-a361-4034-bcfe-c7fc5e090380",
  "message": "Session deleted successfully."
}
```

#### UI Usage
- Trigger this on a "New Conversation" or "Clear Chat" button click
- After deletion, call `POST /api/sessions` to get a fresh session_id
- Wipe chat message history from the UI
- Deleting a missing/non-existent session is idempotent and still returns `200 OK`

---

### 5. `GET /api/users/{user_name}`

**Get a user's profile and preferences.**
Returns the user's saved preferences from the persistent memory system.

#### Request
```
GET /api/users/Dinesh
```

#### Response `200 OK`
```json
{
  "name": "Dinesh",
  "created_at": "2026-05-05T10:00:00.000000",
  "last_active": "2026-05-05T10:30:00.000000",
  "preferences": {
    "favorite_cities": ["Cape Town"],
    "budget_max": 150,
    "pet_friendly": true,
    "preferred_property_type": "apartment",
    "travel_style": "quiet"
  }
}
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `name` | string | User profile name |
| `created_at` | string (ISO datetime) | When the profile was first saved |
| `last_active` | string (ISO datetime) | Last time preferences/memory were updated or loaded |
| `preferences` | object | Saved long-term preferences as JSON |

#### Response `404 Not Found`
```json
{
  "detail": "User not found"
}
```

#### UI Usage
- Use for a profile/preferences panel after the user identifies themselves
- Profiles are created/updated by the chat agent's memory tools, not by a public REST create/update endpoint

---

### 6. `GET /api/users/{user_name}/bookings`

**Get all bookings for a user.**
Returns a list of reservations made by the AI agent for this user.

#### Request
```
GET /api/users/Dinesh/bookings
```

#### Response `200 OK`
```json
{
  "bookings": [
    {
      "reference": "STB-2026-X9A",
      "listing_id": 16155609,
      "listing_name": "Stunning, Dbl En Suite in Grade II Georgian Home",
      "city": "London",
      "check_in": "2026-06-15",
      "check_out": "2026-06-20",
      "guests": 2,
      "total_price": 750.00,
      "status": "confirmed",
      "created_at": "2026-05-05T10:30:00.000000",
      "picture_url": "https://a0.muscache.com/pictures/..."
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `bookings` | booking[] | Bookings made by the chat agent for this user; returns an empty array if none exist |
| `reference` | string | Booking reference, e.g. `STB-2026-X9A4` |
| `listing_id` | integer | Booked listing ID |
| `listing_name` | string | Listing name at lookup time, or `"Unknown"` if missing |
| `city` | string | Listing city, or `"Unknown"` if the listing was removed |
| `check_in` | string (`YYYY-MM-DD`) | Arrival date |
| `check_out` | string (`YYYY-MM-DD`) | Departure date |
| `guests` | integer | Number of guests |
| `total_price` | float | Booking total in USD before estimated taxes |
| `status` | string | Usually `"confirmed"`; cancelled bookings may use `"cancelled"` |
| `created_at` | string (ISO datetime) | Booking creation timestamp |
| `picture_url` | string/null | Primary listing photo if available |

#### UI Usage
- Use for a user's "My bookings" or reservation history view
- Bookings are created by the chat agent when the user asks to book and provides dates/name

---

### 7. `POST /api/chat` ⭐ Primary Endpoint

**Send a user message and receive an AI response.**
This is the core of the application. The AI agent:
1. Reads conversation history
2. Sanitizes common prompt-injection phrases before sending to the LLM
3. Decides which tool(s) to call (search, filter, FAQ, details, pricing, booking, memory, weather, places, or web search)
4. Executes tools against real listing data and external travel APIs where configured
5. Returns a natural language response with listing info or trip guidance

> **Response time:** 3–10 seconds (depends on tool calls needed + Groq speed).
> Weather/nearby places/web search can take longer because they call external APIs.
> Design a loading/typing indicator in the UI.

#### Request
```
POST /api/chat
Content-Type: application/json
```

#### Request Body

```json
{
  "session_id": "5cb2e1e2-a361-4034-bcfe-c7fc5e090380",
  "message": "Find me apartments in Bangkok under $80 per night for 2 guests"
}
```

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `session_id` | string | ✅ Yes | Valid UUID from `/api/sessions` | Identifies the conversation |
| `message` | string | ✅ Yes | 1–2000 characters | The user's natural language message |

#### Response `200 OK`

```json
{
  "session_id": "5cb2e1e2-a361-4034-bcfe-c7fc5e090380",
  "response": "Found 5 listings:\n\n1. **Cozy Studio near BTS Skytrain** (ID: 9075590)\n   📍 Bangkok, Watthana\n   🏠 Entire rental unit — Entire home/apt\n   💰 $24/night | ⭐ 4.8/5 | 👥 Up to 2 guests\n   🛏️ 1 bedrooms\n   🔑 Amenities: Wifi, Kitchen, Air conditioning, Elevator, Hot water...\n\n2. **Modern Apartment with Pool View** (ID: 1234567)\n   📍 Bangkok, Sukhumvit\n   🏠 Entire rental unit\n   💰 $67/night | ⭐ 4.9/5 | 👥 Up to 3 guests\n\n💡 Ask me about any listing for full details!"
}
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `session_id` | string | Echo of the session ID |
| `response` | string | AI-generated response in **Markdown format** |

#### Error Responses

| Status | Scenario |
|---|---|
| `404` | `session_id` is a valid UUID but the session does not exist or expired |
| `422` | Invalid UUID, empty/missing message, or message longer than 2000 characters |
| `500` | Unexpected backend exception outside the agent's graceful error handling |

> **Important for UI:** The `response` field contains **Markdown**. You must render it with a markdown parser (e.g. `react-markdown`). It may contain:
> - `**bold**` text for listing names
> - Numbered lists for search results
> - Tables for comparisons and price breakdowns
> - Emoji characters (📍 🏠 💰 ⭐ 👥)
> - Listing IDs like `(ID: 9075590)` for follow-up actions
> - Booking references like `STB-2026-X9A4`
> - Source URLs from web search results when Tavily is configured

#### Message Types & Expected Responses

The AI automatically selects the right tool based on message content:

##### A. Semantic / Vibe Search
**Trigger:** Descriptive language, moods, adjectives
```json
{ "message": "I want a cozy place near the beach with a pool" }
{ "message": "Find me something romantic for a couple in London" }
{ "message": "Looking for a quiet home office-friendly apartment" }
```
**Response contains:** Numbered listing results with name, city, price, rating, max guests, relevance score.

---

##### B. Structured Filter Search
**Trigger:** Specific numeric constraints or attribute filters
```json
{ "message": "Apartments in Bangkok under $80 per night for 2 guests" }
{ "message": "Listings in Cape Town with WiFi and pool, under $200" }
{ "message": "Private rooms in London with 4.8+ rating" }
```
**Response contains:** Filtered listing results with neighbourhood, property type, amenity highlights.

---

##### C. FAQ / Policy Questions
**Trigger:** Platform how-to questions, policies
```json
{ "message": "How does the cancellation policy work?" }
{ "message": "Are pets allowed in listings?" }
{ "message": "How do I get a refund?" }
{ "message": "What payment methods are accepted?" }
```
**Response contains:** Direct answer in prose format, related question sometimes included.

---

##### D. Listing Detail Request
**Trigger:** "Tell me more", "full details", referencing a listing by ID or position
```json
{ "message": "Tell me more about listing 9075590" }
{ "message": "Show me the house rules for the first result" }
{ "message": "What amenities does that apartment have?" }
```
**Response contains:** Full property profile — space details, pricing, house rules, host info, ratings breakdown, up to 3 recent reviews.

---

##### E. Price Breakdown
**Trigger:** "How much total", "what's the cost for X nights"
```json
{ "message": "How much would 3 nights cost at listing 9075590?" }
{ "message": "What's the total price for a week at that place?" }
```
**Response contains:** Markdown table with line-item breakdown:
- Base price × nights
- Cleaning fee (one-time)
- Service fee
- Tax estimate (12%)
- **Grand total**

---

##### F. Comparison
**Trigger:** "Compare", "which is better", "difference between"
```json
{ "message": "Compare listing 9075590 and 1234567" }
{ "message": "Which is better, the first or second listing?" }
```
**Response contains:** Markdown table comparing key attributes (price, rating, guests, type, cancellation, pets, superhost) + category winners.

---

##### G. Multi-Turn / Follow-Up
The AI remembers context. These work after a previous search:
```json
{ "message": "Show me the first one" }
{ "message": "How much for 2 nights at the second listing?" }
{ "message": "Compare listing 1 and 3 from the results" }
{ "message": "Does it allow pets?" }
```

---

##### H. Availability Check
**Trigger:** Specific listing + check-in/check-out dates, or asking whether a property is free
```json
{ "message": "Is listing 9075590 available from 2026-06-15 to 2026-06-20?" }
{ "message": "Can I stay at the first place next weekend?" }
```
**Response contains:** Availability status, conflicts if blocked/booked, minimum/maximum night warnings, and a pre-tax total when available.

---

##### I. Booking
**Trigger:** User confirms they want to book a listing with dates and guest name
```json
{ "message": "Book listing 9075590 from 2026-06-15 to 2026-06-20 for Dinesh, 2 guests" }
{ "message": "Book it for me" }
```
**Response contains:** Confirmation, booking reference, property, dates, guests, price breakdown, cancellation policy, and pet policy. The booking is saved to the `bookings` table and can be read from `GET /api/users/{user_name}/bookings`.

---

##### J. Persistent Memory
**Trigger:** User shares their name or preferences that should be remembered
```json
{ "message": "I'm Dinesh. Remember that I prefer pet-friendly places under $150." }
{ "message": "What do you remember about me?" }
```
**Response contains:** Confirmation or a saved preference summary. Data is saved to the `users` table and can be read from `GET /api/users/{user_name}`.

Common preference keys saved by the agent include:
`favorite_cities`, `budget_max`, `budget_range`, `pet_friendly`, `preferred_property_type`, `travel_style`, and `group_size`.

---

##### K. Weather Forecast
**Trigger:** User asks about weather, climate, temperature, or trip conditions for a supported city/listing
```json
{ "message": "What's the weather in Cape Town this week?" }
{ "message": "How is the weather near listing 9075590?" }
```
**Response contains:** 7-day forecast with dates, conditions, high/low temperatures in Celsius, rain probability, and suggested outdoor days. Uses Open-Meteo.

---

##### L. Nearby Places
**Trigger:** User asks what is nearby a listing: restaurants, cafes, parks, transit, attractions, etc.
```json
{ "message": "Find cafes within 800 meters of listing 9075590" }
{ "message": "What restaurants are near the first place?" }
```
**Response contains:** Nearby place names, distances in meters, optional cuisine/hours, and coordinates. Uses OpenStreetMap Overpass.

Supported categories include `restaurant`, `cafe`, `bar`, `supermarket`, `pharmacy`, `museum`, `park`, `gym`, `hospital`, `atm`, `bus_station`, `train_station`, and `beach`.

---

##### M. Live Web Search
**Trigger:** User asks about real-time travel info outside the listing database
```json
{ "message": "Are there music festivals in Cape Town in June 2026?" }
{ "message": "Do I need a visa for Thailand?" }
{ "message": "What's the best way from Heathrow to central London?" }
```
**Response contains:** Search result summaries and source URLs. Requires `TAVILY_API_KEY`; otherwise the agent returns a graceful message that web search is unavailable while other tools still work.

---

### 8. `GET /api/listings`

**Browse/filter listings directly.** Returns a limited listing result set for an
Explore/Browse page without using chat.

> **Current backend behavior:** `per_page` controls how many rows are returned,
> and `page` is validated/echoed in the response, but the query currently does
> not apply an offset. In other words, `page=2` returns the same top filtered
> results as `page=1` until backend offset pagination is added.
Use this for a "Browse" or "Explore" page that shows listings without using the chat.

#### Request
```
GET /api/listings
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `city` | string | No | — | Filter by city: `Bangkok`, `London`, `Cape Town` |
| `min_price` | float | No | — | Minimum nightly price in USD |
| `max_price` | float | No | — | Maximum nightly price in USD |
| `guests` | integer | No | — | Minimum guest capacity |
| `property_type` | string | No | — | Filter by property type (partial match) |
| `page` | integer | No | `1` | Page number (≥ 1) |
| `per_page` | integer | No | `20` | Results per page (1–100) |

#### Example Requests

```bash
# All listings
GET /api/listings

# Bangkok apartments under $100 for 2 guests
GET /api/listings?city=Bangkok&max_price=100&guests=2

# Top 5 London listings
GET /api/listings?city=London&per_page=5

# Entire homes in Cape Town
GET /api/listings?city=Cape+Town&property_type=Entire+rental+unit

# Price range filter
GET /api/listings?min_price=50&max_price=200
```

#### Response `200 OK`

```json
{
  "listings": [
    {
      "id": 16155609,
      "name": "Stunning, Dbl En Suite in Grade II Georgian Home",
      "city": "London",
      "neighbourhood": "Islington",
      "property_type": "Private room in home",
      "room_type": "Private room",
      "price_per_night": 126.0,
      "rating": 5.0,
      "review_count": 487,
      "max_guests": 2,
      "picture_url": "https://a0.muscache.com/pictures/..."
    },
    {
      "id": 31643626,
      "name": "Birdsong — Heated Whirlpool + Outdoor Shower",
      "city": "Cape Town",
      "neighbourhood": "Constantia",
      "property_type": "Entire villa",
      "room_type": "Entire home/apt",
      "price_per_night": 145.19,
      "rating": 4.99,
      "review_count": 312,
      "max_guests": 6,
      "picture_url": "https://a0.muscache.com/pictures/..."
    }
  ],
  "total": 2,
  "page": 1,
  "per_page": 20
}
```

#### Response Fields — Listing Object (Brief)

| Field | Type | Can be null | Description |
|---|---|---|---|
| `id` | integer | No | Unique listing identifier |
| `name` | string | No | Property name |
| `city` | string | No | `Bangkok` / `London` / `Cape Town` |
| `neighbourhood` | string | Yes | Local area / neighbourhood name |
| `property_type` | string | Yes | Full property type string |
| `room_type` | string | Yes | `Entire home/apt`, `Private room`, etc. |
| `price_per_night` | float | Yes | Nightly price in USD |
| `rating` | float | Yes | Overall rating 0.0–5.0 |
| `review_count` | integer | Yes | Total reviews |
| `max_guests` | integer | Yes | Maximum guest capacity |
| `picture_url` | string | Yes | URL to primary listing photo |

#### Pagination Fields

| Field | Type | Description |
|---|---|---|
| `total` | integer | Number of results in this response |
| `page` | integer | Echoed page number; currently does not change query offset |
| `per_page` | integer | Results per page |

#### UI Usage
- Use for a grid/card-based "Explore" or "Browse" page
- Each card shows: `picture_url`, `name`, `city`, `neighbourhood`, `price_per_night`, `rating`, `review_count`, `max_guests`, `room_type`
- Filter controls: city dropdown, price range slider, guest count stepper, property type dropdown
- `picture_url` is a real Airbnb CDN URL — use directly as `<img src={picture_url} />`
- For now, implement "Show more" carefully or wait for backend offset pagination before building numbered pages

---

### 9. `GET /api/listings/{listing_id}`

**Get full details for a specific listing.** Returns every field including amenities, house rules, host info, and scores. Use this for a listing detail page/modal.

#### Request
```
GET /api/listings/16155609
```

#### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `listing_id` | integer | ✅ Yes | The listing's unique ID |

#### Response `200 OK`

```json
{
  "id": 16155609,
  "name": "Stunning, Dbl En Suite in Grade II Georgian Home",
  "city": "London",
  "neighbourhood": "Islington",
  "neighborhood_overview": "Islington is one of London's most vibrant and eclectic boroughs...",
  "property_type": "Private room in home",
  "room_type": "Private room",
  "latitude": 51.5465,
  "longitude": -0.1058,
  "price_per_night": 126.0,
  "cleaning_fee": 22.68,
  "service_fee": 17.01,
  "max_guests": 2,
  "bedrooms": 1,
  "bathrooms": 1.0,
  "beds": 1,
  "amenities": [
    "Wifi",
    "Kitchen",
    "Heating",
    "Hot water",
    "Hangers",
    "Iron",
    "Smoke alarm",
    "First aid kit",
    "Elevator",
    "Washer"
  ],
  "host_id": 37093698,
  "host_name": "Sarah",
  "host_response_rate": "100%",
  "host_is_superhost": "t",
  "check_in_time": "3:00 PM",
  "check_out_time": "11:00 AM",
  "min_nights": 2,
  "max_nights": 365,
  "cancellation_policy": "Moderate — Full refund up to 5 days before check-in",
  "pet_policy": "Pets allowed with prior approval",
  "smoking_allowed": false,
  "party_allowed": false,
  "rating": 5.0,
  "cleanliness_score": 4.95,
  "communication_score": 5.0,
  "location_score": 4.98,
  "review_count": 487,
  "listing_url": "https://www.airbnb.com/rooms/16155609",
  "picture_url": "https://a0.muscache.com/pictures/..."
}
```

#### Response Fields — Listing Detail (Full)

| Field | Type | Can be null | Description |
|---|---|---|---|
| `id` | integer | No | Unique listing ID |
| `name` | string | No | Property name |
| `description` | string | Yes | Full listing description (can be long, 500+ chars) |
| `neighborhood_overview` | string | Yes | Host's description of the area |
| `city` | string | No | `Bangkok` / `London` / `Cape Town` |
| `neighbourhood` | string | Yes | Local neighbourhood name |
| `property_type` | string | Yes | Detailed property type |
| `room_type` | string | Yes | `Entire home/apt`, `Private room`, `Hotel room` |
| `latitude` | float | Yes | GPS latitude |
| `longitude` | float | Yes | GPS longitude |
| `price_per_night` | float | Yes | Nightly rate in USD |
| `cleaning_fee` | float | Yes | One-time cleaning fee in USD |
| `service_fee` | float | Yes | Platform service fee in USD |
| `max_guests` | integer | Yes | Max number of guests |
| `bedrooms` | integer | Yes | Number of bedrooms |
| `bathrooms` | float | Yes | Number of bathrooms (0.5 = shared) |
| `beds` | integer | Yes | Number of beds |
| `amenities` | string[] | Yes | Array of amenity name strings |
| `host_id` | integer | Yes | Host's unique ID |
| `host_name` | string | Yes | Host's first name |
| `host_response_rate` | string | Yes | e.g. `"100%"` or `"N/A"` |
| `host_is_superhost` | string | Yes | `"t"` (true) or `"f"` (false) |
| `check_in_time` | string | Yes | e.g. `"3:00 PM"` |
| `check_out_time` | string | Yes | e.g. `"11:00 AM"` |
| `min_nights` | integer | Yes | Minimum stay in nights |
| `max_nights` | integer | Yes | Maximum stay in nights |
| `cancellation_policy` | string | Yes | Full policy description |
| `pet_policy` | string | Yes | Pet rules description |
| `smoking_allowed` | boolean | Yes | `true` / `false` |
| `party_allowed` | boolean | Yes | `true` / `false` |
| `rating` | float | Yes | Overall rating (0–5) |
| `cleanliness_score` | float | Yes | Cleanliness sub-rating (0–5) |
| `communication_score` | float | Yes | Communication sub-rating (0–5) |
| `location_score` | float | Yes | Location sub-rating (0–5) |
| `review_count` | integer | Yes | Total number of reviews |
| `listing_url` | string | Yes | Full Airbnb URL |
| `picture_url` | string | Yes | Primary photo URL |

#### Response `404 Not Found`
```json
{
  "detail": "Listing 99999 not found"
}
```

#### UI Usage — Listing Detail Page/Modal

Suggested UI layout for the detail view:

```
┌──────────────────────────────────────────────┐
│  [picture_url full-width hero image]         │
├──────────────────────────────────────────────┤
│  name (h1)              ⭐ rating (review_count reviews) │
│  📍 neighbourhood, city                      │
│  🏠 property_type · room_type               │
├──────────────────────────────────────────────┤
│  💰 $price_per_night/night                   │
│  👥 max_guests guests · 🛏️ bedrooms beds    │
├──────────────────────────────────────────────┤
│  Description (expandable)                    │
├──────────────────────────────────────────────┤
│  ✅ Amenities grid (amenities array)         │
├──────────────────────────────────────────────┤
│  📋 House Rules                              │
│     Check-in: check_in_time                  │
│     Check-out: check_out_time                │
│     Smoking: smoking_allowed                 │
│     Pets: pet_policy                         │
│     Parties: party_allowed                   │
│     Cancellation: cancellation_policy        │
├──────────────────────────────────────────────┤
│  👤 Host: host_name · host_is_superhost      │
│     Response rate: host_response_rate        │
├──────────────────────────────────────────────┤
│  📊 Ratings breakdown                        │
│     Cleanliness: cleanliness_score ████      │
│     Communication: communication_score ████  │
│     Location: location_score ████            │
├──────────────────────────────────────────────┤
│  [View on Airbnb →] → listing_url            │
└──────────────────────────────────────────────┘
```

---

## Data Values Reference

### Cities
The backend only has data for these 3 cities. Use exact spelling:
```
"Bangkok"
"London"
"Cape Town"
```

### Property Types (common values)
```
"Entire rental unit"
"Private room in rental unit"
"Entire home"
"Private room in home"
"Entire villa"
"Entire serviced apartment"
"Private room in serviced apartment"
"Entire guest suite"
"Hotel room"
"Shared room in hostel"
```

### Room Types
```
"Entire home/apt"
"Private room"
"Shared room"
"Hotel room"
```

### Cancellation Policies (synthetic)
```
"Flexible — Full refund up to 24 hours before check-in"
"Moderate — Full refund up to 5 days before check-in"
"Strict — 50% refund up to 7 days before check-in"
"Non-refundable — No refund after booking"
```

### Pet Policies (synthetic)
```
"Pets allowed"
"No pets allowed"
"Pets allowed with prior approval"
"Small pets only (under 10kg)"
```

### Booking Statuses
```
"confirmed"
"cancelled"
```

### Nearby Place Categories
Used by the chat agent's nearby places tool:
```
"restaurant"
"cafe"
"bar"
"supermarket"
"pharmacy"
"museum"
"park"
"gym"
"hospital"
"atm"
"bus_station"
"train_station"
"beach"
```

---

## UI Design Guidance

### Chat Interface Requirements

**Message rendering:**
- Render `response` field as **Markdown** (use `react-markdown` or equivalent)
- Support: bold, lists, tables, horizontal rules, emoji
- Code blocks are not used, but tables and numbered lists are common

**Listing ID extraction:**
- Responses often include `(ID: 1234567)` — consider making these clickable
- Clicking an ID should open the listing detail view
- Responses can include booking references like `STB-2026-X9A4` — consider linking these to the user's booking history

**Loading states:**
- Show a typing indicator / skeleton while waiting for chat response
- Typical response time: 3–10 seconds
- Set `timeout` to at least 60–90 seconds for chat fetch calls, especially when weather, places, or web search may run

**Session management:**
- Create a session on first chat open
- Persist `session_id` in `localStorage` or `sessionStorage`
- Offer a "New Chat" button that calls `DELETE /api/sessions/{id}` + creates a new one

**User memory and bookings:**
- If the user gives a name, use it consistently when showing `GET /api/users/{user_name}` or booking history
- A public REST API exists for reading users/bookings, but creation happens through chat tools
- After a booking confirmation, refresh `GET /api/users/{guest_name}/bookings`

### Card Design (Listing Cards)

Each card in browse/search results should display:
```
┌────────────────────────────────┐
│  [picture_url]                 │  ← 16:9 aspect ratio, object-fit: cover
│                    [room_type] │  ← badge top-right
├────────────────────────────────┤
│  name (truncated to 2 lines)   │
│  📍 neighbourhood, city        │
│  ⭐ rating  (review_count)     │
│  👥 max_guests guests          │
│                                │
│  $price_per_night / night      │  ← right-aligned, large
└────────────────────────────────┘
```

### Price Display
- All prices are **USD**
- Display as: `$XX.XX / night`
- For Bangkok: prices are ~$15–$500 (converted from THB)
- For London: prices are ~$40–$700 (converted from GBP)
- For Cape Town: prices are ~$25–$600 (converted from ZAR)

### Rating Display
- Ratings are 0.0–5.0 (float)
- Display as: `⭐ 4.8 (312 reviews)`
- 0 = no rating yet (new listing)

---

## Error Handling

| Scenario | Status | Response |
|---|---|---|
| Listing not found | `404` | `{"detail": "Listing 99999 not found"}` |
| User profile not found | `404` | `{"detail": "User not found"}` |
| Chat session not found/expired | `404` | `{"detail": "Session not found or expired. Create a new session."}` |
| Empty message | `422` | Pydantic validation error with field details |
| Chat `session_id` is not UUID-shaped | `422` | Pydantic validation error with field details |
| Chat message > 2000 chars | `422` | Pydantic validation error with field details |
| `GET /api/listings?page=0` | `422` | Query validation error (`page` must be ≥ 1) |
| `GET /api/listings?per_page=200` | `422` | Query validation error (`per_page` must be 1–100) |
| `GET /api/agent/status` without token | `422` | Missing required query parameter |
| `GET /api/agent/status?token=wrong` | `403` | `{"detail": "Forbidden"}` |
| Server error | `500` | `{"detail": "An error occurred..."}` |
| Groq rate limit hit | `200` | `{"response": "I'm experiencing high demand..."}` |
| Tool-call formatting issue | `200` | `{"response": "I had trouble processing that request..."}` |
| Unexpected agent/tool issue | `200` | `{"response": "I encountered an unexpected issue..."}` |
| Web search unavailable | `200` | `{"response": "Web search is not available (TAVILY_API_KEY not configured)..."}` |

> **Note:** Agent/tool failures inside `/api/chat` usually return HTTP `200` with
> the user-facing problem in the `response` field. Request validation and missing
> sessions still use normal HTTP errors (`422` / `404`).

---

## Sample UI Flows

### Flow 1: First-time user opens chat

```
1. App loads → GET /api/health → populate city dropdown, show "450 listings"
2. User clicks chat → POST /api/sessions → store session_id
3. Show welcome message: "Hi! I'm StayBot. Ask me about stays in Bangkok, London, or Cape Town!"
4. User types message → POST /api/chat → render markdown response
```

### Flow 2: Browse page

```
1. GET /api/listings (no params) → show first 20 top-rated listings as cards
2. User selects city "Bangkok" → GET /api/listings?city=Bangkok
3. User sets max price $100 → GET /api/listings?city=Bangkok&max_price=100
4. User clicks a card → GET /api/listings/9075590 → show detail modal
```

### Flow 3: Chat to detail

```
1. User chats: "Find apartments in London under £200"
2. AI responds with list including listing IDs
3. User clicks on an ID in the chat response
4. App calls GET /api/listings/{id} → opens detail modal
5. User chats: "How much for 4 nights at that one?"
6. AI responds with price breakdown table
```

### Flow 4: Availability and booking

```
1. User chats: "Is listing 9075590 available from 2026-06-15 to 2026-06-20?"
2. AI checks blocked dates and existing bookings
3. If available, AI returns nights, nightly rate, cleaning fee, service fee, and total
4. User chats: "Book it for Dinesh, 2 guests"
5. AI creates a booking and returns a reference like STB-2026-X9A4
6. App refreshes GET /api/users/Dinesh/bookings → show confirmed booking
```

### Flow 5: Trip planning from a listing

```
1. User opens listing 9075590 from chat or browse
2. User asks: "What's the weather there this week?"
3. AI calls weather by listing coordinates and returns a 7-day forecast
4. User asks: "Find cafes within 800m"
5. AI calls nearby places and returns place names, distances, and coordinates
```

### Flow 6: Admin monitoring

```
1. Internal dashboard calls GET /api/agent/status?token={ADMIN_TOKEN}
2. Dashboard shows total_keys, available_keys, rate_limited_keys, bad_keys
3. Do not expose this endpoint in the public guest UI
```

---

*StayBot API v1.0.0 — Backend by FastAPI + LangGraph + Groq*
