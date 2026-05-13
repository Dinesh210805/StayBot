# StayBot — Observability Guide

Two layers of metrics keep your app observable:

1. **LangSmith** — traces every AI call (what the agent thought, token usage, latency per step)
2. **Persistent metrics in Neon DB** — request history, error rates, RAG scores that survive server restarts

---

## Part 1 — LangSmith (AI Traces)

### What it is

LangSmith is a cloud dashboard made by the LangChain team. Every time your agent runs, it automatically records:

- The full conversation sent to the LLM
- The LLM's response
- Which tools were called and why
- Token counts (input + output)
- Latency broken down per step
- Whether anything errored

You get a timeline view of each "run" — you can click into any chat message your users sent and see exactly what the AI did step by step. It's free for personal/small projects.

### Step 1 — Create an account

Go to https://smith.langchain.com and sign up with your Google or GitHub account.

### Step 2 — Get your API key

1. After signing in, click your profile icon (top right)
2. Click **Settings**
3. Click **API Keys** in the left sidebar
4. Click **Create API Key**
5. Name it `staybot` and copy the key — it starts with `lsv2_pt_...`

### Step 3 — Create a project

1. In LangSmith, click **Projects** in the left sidebar
2. Click **New Project**
3. Name it `staybot`

### Step 4 — Update your .env

Open `.env` and uncomment the three LangSmith lines. Replace the placeholder with your real key:

```
# Before (commented out):
# LANGCHAIN_TRACING_V2=true
# LANGCHAIN_API_KEY=lsv2_your_key_here
# LANGCHAIN_PROJECT=staybot

# After (uncommented + real key):
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_your_actual_key_here
LANGCHAIN_PROJECT=staybot
```

### Step 5 — Restart your backend

No code changes needed. Restart the backend:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Step 6 — Send a test message

Go to the frontend, send any message in the chat (e.g. "Show me listings in Paris").

Then go to https://smith.langchain.com → Projects → staybot. You should see your first trace appear within a few seconds.

### What you will see in LangSmith

```
Run: "Show me listings in Paris"
  ├── LLM Call #1         150ms   tokens: 820 in / 45 out
  │     Input:  [system prompt + user message]
  │     Output: "I should use the search tool"
  ├── Tool: semantic_search  320ms
  │     Input:  "listings in Paris"
  │     Output: [5 results with scores]
  └── LLM Call #2         280ms   tokens: 1200 in / 180 out
        Input:  [system + results + user message]
        Output: "Here are some great options in Paris..."
```

This is how you debug "why did the AI give a bad answer" — you read the trace.

---

## Part 2 — Persistent Metrics in Neon DB

### The problem with the current setup

Right now `MetricsStore` keeps the last 1000 requests in memory. When the server restarts, all metrics are gone. You cannot query history or track performance over time.

### How devs solve this

The standard approach: write each completed request to a database table. Then you can:

- Query "what was my average latency last week?"
- See if error rates increased after a code change
- Prove to stakeholders the app is performing well with real numbers

### What to add

A `request_metrics` table in your existing Neon (PostgreSQL) database:

```sql
CREATE TABLE request_metrics (
    id          SERIAL PRIMARY KEY,
    request_id  TEXT NOT NULL,
    session_id  TEXT NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL,
    latency_ms  FLOAT NOT NULL,
    input_tokens  INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    rag_embedding_ms  FLOAT,
    rag_avg_score     FLOAT,
    rag_results_count INT DEFAULT 0,
    tool_calls  TEXT[],   -- array of tool names used
    retries     INT DEFAULT 0,
    error       BOOLEAN DEFAULT FALSE
);
```

Each time a request finishes (in `observability.py`), one row is inserted. The in-memory store still works for the live dashboard (fast reads), and the DB is the permanent record.

### Useful queries once data is there

```sql
-- Average latency over the last 7 days
SELECT DATE(timestamp), ROUND(AVG(latency_ms)::numeric, 0) AS avg_ms
FROM request_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY 1;

-- Error rate per day
SELECT DATE(timestamp),
       COUNT(*) FILTER (WHERE error) * 100.0 / COUNT(*) AS error_pct
FROM request_metrics
GROUP BY DATE(timestamp)
ORDER BY 1;

-- Most used tools
SELECT UNNEST(tool_calls) AS tool, COUNT(*) AS uses
FROM request_metrics
GROUP BY tool
ORDER BY uses DESC;

-- Slowest requests
SELECT request_id, latency_ms, tool_calls, timestamp
FROM request_metrics
ORDER BY latency_ms DESC
LIMIT 10;
```

### To implement this

Run `/implement-persistent-metrics` or just ask: "implement persistent metrics in Neon DB". The change touches two files:

- `backend/observability.py` — add async DB write in `MetricsStore.record()`
- `backend/database.py` — add the `request_metrics` table model

The in-memory dashboard (TUI, `/api/metrics`) keeps working exactly as before — the DB write is fire-and-forget in the background.

---

## Summary

| What | Where | Survives restart? | Best for |
|------|-------|-------------------|----------|
| AI traces | LangSmith dashboard | Yes (cloud) | Debugging agent behaviour, token cost tracking |
| Live metrics | `/api/metrics` endpoint | No (in-memory) | Real-time TUI dashboard |
| Historical metrics | Neon DB table | Yes (cloud) | Proving performance, trend analysis |

Start with LangSmith — it takes 5 minutes and gives you the most insight immediately.
