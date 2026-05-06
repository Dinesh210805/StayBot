"""
FAQ Retrieval Tool for StayBot.

Uses ChromaDB to search through FAQ entries for platform-related questions.
"""

import os
from langchain_core.tools import tool
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

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
def search_faqs(question: str) -> str:
    """Search for answers to general questions about the platform's policies,
    booking process, payments, refunds, cancellations, amenities, and house rules.
    Use this for any question that is NOT about finding a specific listing.

    Args:
        question: The user's question about platform policies or processes

    Returns:
        The most relevant FAQ answer
    """
    model = _get_model()
    index = _get_index()

    query_embedding = model.encode(question).tolist()

    results = index.query(
        namespace="faqs",
        vector=query_embedding,
        top_k=3,
        include_metadata=True,
    )

    if not results or not results.matches:
        return (
            "I don't have a specific answer for that in my FAQ database. "
            "Try rephrasing your question, or ask about: booking, cancellation, "
            "refunds, payments, amenities, check-in/out, or safety."
        )

    # Return the best match, with secondary matches for context
    best_match = results.matches[0]
    best = best_match.metadata
    score = best_match.score

    # If the score is too low, it's probably not relevant (cosine similarity)
    if score < 0.4:
        return (
            "I'm not sure about that specific question. "
            "I can help with: booking process, cancellation policies, refunds, "
            "payments, amenities, pet policies, check-in/out times, and safety. "
            "What would you like to know?"
        )

    response = f"**{best['question']}**\n\n{best['answer']}"

    # Add related questions if they're close enough
    if len(results.matches) > 1 and results.matches[1].score > 0.5:
        related = results.matches[1].metadata
        response += f"\n\n---\n📌 **Related:** {related['question']}"

    return response

