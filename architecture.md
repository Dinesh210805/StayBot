```mermaid
graph TD
    %% --------------------------------------------------------
    %% STYLES & CLASSES
    %% --------------------------------------------------------
    classDef client fill:#f9f9f9,stroke:#333,stroke-width:2px,color:#000
    classDef frontend fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px,color:#000
    classDef backend fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000
    classDef ai fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000
    classDef db fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#000
    classDef tool fill:#ede7f6,stroke:#673ab7,stroke-width:2px,color:#000
    classDef extApi fill:#ffebee,stroke:#f44336,stroke-width:2px,color:#000
    classDef endpoint fill:#eceff1,stroke:#d32f2f,stroke-width:1px,color:#000,shape:rect

    %% --------------------------------------------------------
    %% USER/CLIENT LEVEL
    %% --------------------------------------------------------
    subgraph ClientLayer [1. Client Interface]
        User([User / Browser]):::client
    end

    %% --------------------------------------------------------
    %% FRONTEND LEVEL
    %% --------------------------------------------------------
    subgraph FrontendLayer [2. Frontend Application - Next.js]
        NextApp{Next.js 16 UI}:::frontend
        Pages[Pages: \n- / \n- /chat\n- /booking\n- /explore\n- /destinations]:::frontend
        APIWrapper[API Wrapper lib/api.ts]:::frontend
        
        NextApp --> Pages
        Pages --> APIWrapper
    end

    %% --------------------------------------------------------
    %% BACKEND LEVEL (FastAPI)
    %% --------------------------------------------------------
    subgraph BackendLayer [3. Backend API Gateway - FastAPI]
        FastAPI_App{{FastAPI App main.py}}:::backend
        
        %% Endpoints
        EP_Health([GET /api/health \nHealth & DB Status]):::endpoint
        EP_Sessions([POST/DELETE /api/sessions \nManage Chat Sessions]):::endpoint
        EP_Chat([POST /api/chat \nSend Msg, Get AI Reply]):::endpoint
        EP_Users([GET /api/users/{id} \nProfiles & Bookings]):::endpoint
        EP_Listings([GET /api/listings \nBrowse & Filter Listings]):::endpoint

        FastAPI_App --> EP_Health
        FastAPI_App --> EP_Sessions
        FastAPI_App --> EP_Chat
        FastAPI_App --> EP_Users
        FastAPI_App --> EP_Listings
    end

    %% --------------------------------------------------------
    %% AI / AGENT ENGINE
    %% --------------------------------------------------------
    subgraph AIEngine [4. AI Agent Engine - agent.py]
        LangGraph((LangGraph Agent)):::ai
        LLM[Groq LLM \nLlama-3/Mixtral]:::ai
        Router[Tool Router \nSelects tools dynamically]:::ai
        Memory[Session Memory \nConversation Context]:::ai
        
        EP_Chat -->|ChatRequest \n{session_id, message}| Router
        Router <--> LLM
        Router <--> Memory
        Router -->|Triggers| LangGraph
    end

    %% --------------------------------------------------------
    %% AGENT TOOLS
    %% --------------------------------------------------------
    subgraph AgentTools [5. Agent Tools / Capabilities]
        T_Search[semantic_search \nFinds listings by meaning]:::tool
        T_SQL[filter_listings \nExact exact filters price/amenities]:::tool
        T_FAQ[search_faqs \nAnswers common questions]:::tool
        T_Detail[get_listing_details \nFetches listing by ID]:::tool
        T_Price[calculate_price \nPrice breakdown w/ dates]:::tool
        T_Compare[compare_listings \nCompares IDs]:::tool
        T_Booking[check_availability \nbook_listing]:::tool
        T_Weather[get_weather_forecast \nCheck destination weather]:::tool
        T_Web[web_search \nTavily live web search]:::tool
        T_Places[search_nearby_places \nFind restaurants/attractions]:::tool
        T_Memory[save_user_preferences \nupdate_memory_summary]:::tool

        LangGraph --> T_Search
        LangGraph --> T_SQL
        LangGraph --> T_FAQ
        LangGraph --> T_Detail
        LangGraph --> T_Price
        LangGraph --> T_Compare
        LangGraph --> T_Booking
        LangGraph --> T_Weather
        LangGraph --> T_Web
        LangGraph --> T_Places
        LangGraph --> T_Memory
    end

    %% --------------------------------------------------------
    %% DATA STORAGE (DB & VECTOR DB)
    %% --------------------------------------------------------
    subgraph DataStorage [6. Data Storage & DBs]
        SQL_DB[(Relational DB \nSQLite / Postgres)]:::db
        Vector_DB[(Vector DB \nChroma / Pinecone)]:::db
        Faiss/JSON[Local JSON/CSV \nfaqs.json, reviews.csv]:::db
        
        T_Detail --> SQL_DB
        EP_Listings --> SQL_DB
        EP_Users --> SQL_DB
        T_SQL --> SQL_DB
        T_Compare --> SQL_DB
        T_Search --> Vector_DB
        T_FAQ --> Vector_DB
        T_Booking --> SQL_DB
        T_Memory --> SQL_DB
    end

    %% --------------------------------------------------------
    %% EXTERNAL APIS
    %% --------------------------------------------------------
    subgraph ExternalAPIs [7. External Services]
        Ext_Weather[OpenWeather API]:::extApi
        Ext_Tavily[Tavily Search API]:::extApi
        Ext_Places[Places/Map API]:::extApi
        
        T_Weather --> Ext_Weather
        T_Web --> Ext_Tavily
        T_Places --> Ext_Places
    end

    %% --------------------------------------------------------
    %% PROCESS CONNECTIONS 
    %% --------------------------------------------------------
    User -->|Views / Interacts| NextApp
    APIWrapper -->|HTTP REST| FastAPI_App

    classDef detailedRequest fill:#ffffe0,stroke:#ccc,stroke-width:1px,color:#333
end
```

## API Endpoint Details & Examples

### 1. `POST /api/chat`
*The core brain of the platform. Used to converse with StayBot.*

**Request:**
```json
{
  "session_id": "sess-1234-abcd",
  "message": "I want a beachfront villa in Barcelona under $200 per night for 4 guests next weekend."
}
```
**Process:**
1. The backend finds `session_id` in memory.
2. The LLM Router analyzes the user's intent.
3. The LLM decides it needs the SQL filtering tool (`filter_listings`) + Semantic search for "beachfront" (`search_listings_semantic`).
4. Tools query the DB and Vector DB.
5. The LLM gets the tool outputs, crafts a human-readable response, and returns it.

**Output (Response):**
```json
{
  "session_id": "sess-1234-abcd",
  "response": "I found 3 gorgeous beachfront villas in Barcelona under $200! \n\n1. **Villa del Mar** ($180/night) - Right on the beach, fits 5 guests.\n2. **Oceanview Paradise** ($150/night)... \n\nWould you like a price breakdown for your specific dates?"
}
```

### 2. `GET /api/listings`
*A standard REST browsing endpoint used by the UI's Explore page to show listings without chat.*

**Request Example:**
`GET /api/listings?city=Barcelona&min_price=50&max_price=200&guests=4&per_page=10`

**Output (Response):**
```json
{
  "total": 54,
  "page": 1,
  "per_page": 10,
  "listings": [
    {
      "id": 12,
      "name": "Cozy Beach Apartment",
      "city": "Barcelona",
      "property_type": "Apartment",
      "price_per_night": 95.0,
      "rating": 4.8,
      "max_guests": 4,
      "picture_url": "https://..."
    }
  ]
}
```

### 3. `POST /api/sessions`
*Used to initialize a new conversation history thread.*

**Request:** `{}` *(Empty Body)*

**Output (Response):**
```json
{
  "session_id": "787c8808-0130-4e5c-a5b6-xyz123",
  "message": "Session created successfully. Start chatting!"
}
```

### 4. `GET /api/users/{user_name}/bookings`
*Allows a user to see their previous and future stays.*

**Request Example:** `GET /api/users/JohnDoe/bookings`

**Output (Response):**
```json
{
  "bookings": [
    {
      "reference": "BOOK-987-XYZ",
      "listing_id": 45,
      "listing_name": "Modern Loft in Gracia",
      "check_in": "2026-06-10",
      "check_out": "2026-06-15",
      "guests": 2,
      "total_price": 540.00,
      "status": "confirmed"
    }
  ]
}
```

## How the Entire Flow Works (Step-by-Step)
1. **User Enters URL**: The user visits the frontend (Next.js 16). The UI creates a new conversation by sending `POST /api/sessions`. Note: The UI is beautifully crafted with Tailwind CSS and interactive UI animations.
2. **User Chats**: User types "Is there a pool?" and hits send. The frontend wrapper (`lib/api.ts`) hits `POST /api/chat`.
3. **Agent Analyzes**: The backend delegates the text to `langgraph_agent`. The agent pulls prior conversation memory (understanding what property the user is looking at based on prior turns).
4. **Tool Execution**: The LLM queries `search_faqs` or `get_listing_details`. The specific tool talks to the SQLite/PostgreSQL Database or Pinecone/Chroma.
5. **Response Generation**: The LLM takes the exact pool details, synthesizes it, and sends it back to the FASTAPI backend, which relays it to the UI.
6. **Book Flow**: If the user desires to trigger a booking, the LLM calls `book_listing` causing an insertion into the Relational `Booking` table. The user can then query `GET /api/users/JohnDoe/bookings` to see it. 

*If there are any additional concepts you want fleshed out (like the prompt schemas, or the exact vectors in Chroma/Pinecone), just ask!*