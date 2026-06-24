"""
RAG Semantic Search Tool for StayBot.

Uses ChromaDB to perform similarity search over listing descriptions.
Best for natural language queries like "cozy cabin near the beach".
"""

import os
import time
import json
from langchain_core.tools import tool
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

# Propagate HF token so sentence-transformers downloads are authenticated
_hf_token = os.getenv("HF_TOKEN")
if _hf_token:
    os.environ.setdefault("HUGGINGFACE_HUB_TOKEN", _hf_token)

# Lazy-loaded globals
_model = None
_index = None


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _get_index():
    global _index
    if _index is None:
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        _index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "staybot"))
    return _index


@tool
def search_listings_semantic(query: str) -> str:
    """Search for stay listings using natural language. Use this tool when the user
    describes what kind of place they want in free-form text, mentions vibes, moods,
    or uses descriptive language. Examples: 'cozy apartment near the beach',
    'luxury villa with a pool for a group', 'quiet place to work remotely'.

    Args:
        query: Natural language description of the desired stay

    Returns:
        Formatted string with matching listings including name, city, price, rating, and amenities
    """
    n_results = 5

    model = _get_model()
    index = _get_index()

    # Embed the query
    t_embed = time.monotonic()
    query_embedding = model.encode(query).tolist()
    embed_ms = round((time.monotonic() - t_embed) * 1000, 2)

    # Search Pinecone
    t_retr = time.monotonic()
    results = index.query(
        namespace="listings",
        vector=query_embedding,
        top_k=n_results,
        include_metadata=True,
    )
    retr_ms = round((time.monotonic() - t_retr) * 1000, 2)

    if not results or not results.matches:
        return "No matching listings found. Try broadening your search criteria."

    scores = [m.score for m in results.matches]

    # Record RAG timing + scores into the per-request observability context so
    # GET /api/metrics can surface them. This is the primary metrics path —
    # _finalize_metrics in agent.py reads these fields off the RequestContext.
    try:
        from backend.observability import get_request_context
        ctx = get_request_context()
        if ctx is not None:
            # A turn may call search more than once: accumulate scores, sum the
            # timings, and count total retrieved hits.
            ctx.rag_embedding_ms = (ctx.rag_embedding_ms or 0.0) + embed_ms
            ctx.rag_retrieval_ms = (ctx.rag_retrieval_ms or 0.0) + retr_ms
            ctx.rag_scores.extend(scores)
            ctx.rag_results_count += len(scores)
    except Exception:
        pass

    # Also attach to the active LangSmith run when tracing is enabled (optional).
    try:
        from langsmith.run_helpers import get_current_run_tree
        rt = get_current_run_tree()
        if rt:
            rt.metadata.update({
                "rag_embedding_ms": embed_ms,
                "rag_retrieval_ms": retr_ms,
                "rag_results_count": len(scores),
                "rag_avg_score": round(sum(scores) / len(scores), 4),
                "rag_scores": [round(s, 4) for s in scores],
            })
    except Exception:
        pass

    # Format results
    output_lines = [f"Found {len(results.matches)} matching listings:\n"]

    for i, match in enumerate(results.matches, 1):
        metadata = match.metadata
        relevance = max(0, round(match.score * 100, 1))
        name = metadata.get("name", "Unknown")
        city = metadata.get("city", "Unknown")
        price = metadata.get("price_per_night", 0)
        rating = metadata.get("rating", 0)
        guests = metadata.get("max_guests", 1)
        prop_type = metadata.get("property_type", "Unknown")
        listing_id = metadata.get("id", 0)

        output_lines.append(
            f"{i}. **{name}** (ID: {listing_id})\n"
            f"   📍 {city} | 🏠 {prop_type}\n"
            f"   💰 ${price}/night | ⭐ {rating}/5 | 👥 Up to {guests} guests\n"
            f"   🎯 Relevance: {relevance}%\n"
        )

    output_lines.append(
        "\n💡 Ask me about any listing for full details, price breakdown, or to compare them!"
    )

    return "\n".join(output_lines)

