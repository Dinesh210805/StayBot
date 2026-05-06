const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Listing {
  id: string;
  name: string;
  city: string;
  country: string;
  price_per_night: number;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  room_type: string;
  rating: number;
  review_count: number;
  description: string;
  amenities: string[];
  images: string[];
  host_name: string;
  host_since: string;
  cancellation_policy: string;
  min_nights: number;
  availability: boolean;
  latitude?: number;
  longitude?: number;
  neighborhood?: string;
}

export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  limit: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
}

export interface Session {
  session_id: string;
  created_at: string;
}

export interface UserProfile {
  name: string;
  preferences: Record<string, unknown>;
  search_history: string[];
}

export interface Booking {
  id: string;
  listing_id: string;
  listing_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listings: {
    list(params?: {
      city?: string;
      min_price?: number;
      max_price?: number;
      guests?: number;
      property_type?: string;
      page?: number;
      limit?: number;
    }): Promise<ListingsResponse> {
      const qs = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) qs.set(k, String(v));
        });
      }
      const query = qs.toString();
      return apiFetch<ListingsResponse>(`/api/listings${query ? `?${query}` : ""}`);
    },

    get(id: string): Promise<Listing> {
      return apiFetch<Listing>(`/api/listings/${id}`);
    },
  },

  chat: {
    send(message: string, sessionId?: string): Promise<ChatResponse> {
      return apiFetch<ChatResponse>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message, session_id: sessionId }),
      });
    },
  },

  sessions: {
    create(): Promise<Session> {
      return apiFetch<Session>("/api/sessions", { method: "POST" });
    },
    delete(sessionId: string): Promise<void> {
      return apiFetch<void>(`/api/sessions/${sessionId}`, { method: "DELETE" });
    },
  },

  users: {
    get(name: string): Promise<UserProfile> {
      return apiFetch<UserProfile>(`/api/users/${name}`);
    },
    bookings(name: string): Promise<Booking[]> {
      return apiFetch<Booking[]>(`/api/users/${name}/bookings`);
    },
  },

  health(): Promise<{ status: string }> {
    return apiFetch<{ status: string }>("/health");
  },
};
