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

> **CORS:** All origins are currently allowed (`*`). No authentication token needed.

---

## Response Envelope

All responses follow standard HTTP status codes:

| Code | Meaning |
|---|---|
| `200` | Success |
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

### 2. `POST /api/sessions`

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

### 3. `DELETE /api/sessions/{session_id}`

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

---

### 4. `POST /api/chat` ⭐ Primary Endpoint

**Send a user message and receive an AI response.**
This is the core of the application. The AI agent:
1. Reads conversation history
2. Decides which tool(s) to call (search, filter, FAQ, etc.)
3. Executes tools against real data
4. Returns a natural language response with listing info

> **Response time:** 3–10 seconds (depends on tool calls needed + Groq speed).
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

> **Important for UI:** The `response` field contains **Markdown**. You must render it with a markdown parser (e.g. `react-markdown`). It may contain:
> - `**bold**` text for listing names
> - Numbered lists for search results
> - Tables for comparisons and price breakdowns
> - Emoji characters (📍 🏠 💰 ⭐ 👥)
> - Listing IDs like `(ID: 9075590)` for follow-up actions

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

### 5. `GET /api/listings`

**Browse/filter listings directly.** Returns paginated listing results.
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
| `page` | integer | Current page number |
| `per_page` | integer | Results per page |

#### UI Usage
- Use for a grid/card-based "Explore" or "Browse" page
- Each card shows: `picture_url`, `name`, `city`, `neighbourhood`, `price_per_night`, `rating`, `review_count`, `max_guests`, `room_type`
- Filter controls: city dropdown, price range slider, guest count stepper, property type dropdown
- `picture_url` is a real Airbnb CDN URL — use directly as `<img src={picture_url} />`

---

### 6. `GET /api/listings/{listing_id}`

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

**Loading states:**
- Show a typing indicator / skeleton while waiting for chat response
- Typical response time: 3–10 seconds
- Set `timeout` to at least 60 seconds for fetch calls

**Session management:**
- Create a session on first chat open
- Persist `session_id` in `localStorage` or `sessionStorage`
- Offer a "New Chat" button that calls `DELETE /api/sessions/{id}` + creates a new one

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
| Empty message | `422` | Pydantic validation error with field details |
| Server error | `500` | `{"detail": "An error occurred..."}` |
| Groq rate limit hit | `200` | `{"response": "I'm experiencing high demand..."}` |
| Invalid API key | `200` | `{"response": "There is a configuration issue..."}` |

> **Note:** Chat errors (`/api/chat`) always return HTTP `200` — the error is in the `response` field text. Design the UI to detect error phrases if needed.

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
1. GET /api/listings (no params) → show all 450 listings as cards
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

---

*StayBot API v1.0.0 — Backend by FastAPI + LangGraph + Groq*
