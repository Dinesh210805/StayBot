const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Listing {
  id: string;
  name: string;
  city: string;
  country?: string | null;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  room_type: string;
  rating: number;
  review_count: number;
  description: string;
  amenities: string[];
  picture_url: string | null;
  host_name: string;
  host_since?: string | null;
  cancellation_policy: string;
  min_nights: number;
  availability?: boolean | null;
  latitude?: number;
  longitude?: number;
  neighbourhood?: string;
  cleaning_fee?: number;
  service_fee?: number;
}

export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  per_page: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  cities: string[];
  total_listings: number;
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
  reference: string;
  listing_id: string;
  listing_name: string;
  city: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: string;
  picture_url?: string | null;
}

export interface BookingsResponse {
  bookings: Booking[];
}

/**
 * Mirrors the nested shape returned by `MetricsStore.summary()` in
 * backend/observability.py. Keep this in sync with that method — the Rich TUI
 * (run.py) consumes the same payload, so the backend shape is canonical.
 *
 * When no requests have been recorded yet the backend returns only
 * `{ total_requests: 0, note, model }`, so every analytic block is optional.
 */
export interface MetricsSummary {
  overview?: { total_requests: number; error_rate_pct: number; window: string };
  latency_ms?: { p50: number; p75: number; p95: number; p99: number; avg: number; min: number; max: number };
  tokens?: { total_input: number; total_output: number; avg_input_per_req: number; avg_output_per_req: number };
  tool_usage?: Record<string, number>;
  rag?: {
    total_semantic_searches: number;
    embedding_latency_ms: { avg: number | null; p95: number };
    retrieval_latency_ms: { avg: number | null; p95: number };
    relevance_score: { avg: number | null; min: number | null; max: number | null };
  } | null;
  recent_requests?: Array<{
    id: string;
    latency_ms: number;
    tools: string[];
    tokens_in: number;
    tokens_out: number;
    rag: boolean;
    retries: number;
    error: boolean;
  }>;
  model?: string;
  /** Present only in the empty state (no requests recorded yet). */
  total_requests?: number;
  note?: string;
}

/**
 * Offline RAGAS / keyword-accuracy evaluation summary, served by GET /api/eval
 * from the latest eval/results.json. `available` is false when no eval has run.
 */
export interface EvalSummary {
  available: boolean;
  timestamp: string | null;
  total_questions: number;
  keyword_accuracy_pct: number;
  passed: number;
  failed: number;
  ragas_scores: Record<string, number | null>;
}

export interface Review {
  id: number;
  listing_id: number;
  reviewer_name: string | null;
  rating: number | null;
  comment: string | null;
  date: string | null;
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
      per_page?: number;
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

    reviews(id: string, limit = 10): Promise<Review[]> {
      return apiFetch<Review[]>(`/api/listings/${id}/reviews?limit=${limit}`);
    },
  },

  bookings: {
    create(
      listingId: number,
      checkIn: string,
      checkOut: string,
      guests: number,
      sessionId: string,
    ): Promise<ChatResponse> {
      const message = `Book listing ${listingId} from ${checkIn} to ${checkOut} for ${guests} guests`;
      return api.chat.send(message, sessionId);
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
    bookings(name: string): Promise<BookingsResponse> {
      return apiFetch<BookingsResponse>(`/api/users/${name}/bookings`);
    },
  },

  metrics: {
    get(): Promise<MetricsSummary> {
      const token = process.env.NEXT_PUBLIC_METRICS_TOKEN ?? "";
      return apiFetch<MetricsSummary>(`/api/metrics${token ? `?token=${token}` : ""}`);
    },
  },

  eval: {
    get(): Promise<EvalSummary> {
      return apiFetch<EvalSummary>("/api/eval");
    },
  },

  health(): Promise<HealthResponse> {
    return apiFetch<HealthResponse>("/api/health");
  },
};
