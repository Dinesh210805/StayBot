"""
FAQ Retrieval Tool for StayBot.

Uses ChromaDB to search through FAQ entries for platform-related questions.
"""

import os
from langchain_core.tools import tool
from sentence_transformers import SentenceTransformer
import chromadb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CHROMA_DIR = os.path.join(BASE_DIR, "embeddings", "chroma_db")

_model = None
_collection = None


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = client.get_collection("faqs")
    return _collection


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
    collection = _get_collection()

    query_embedding = model.encode(question).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=3,
        include=["metadatas", "distances"],
    )

    if not results["metadatas"] or not results["metadatas"][0]:
        return (
            "I don't have a specific answer for that in my FAQ database. "
            "Try rephrasing your question, or ask about: booking, cancellation, "
            "refunds, payments, amenities, check-in/out, or safety."
        )

    # Return the best match, with secondary matches for context
    best = results["metadatas"][0][0]
    distance = results["distances"][0][0]

    # If the best match is too far, it's probably not relevant
    if distance > 1.2:
        return (
            "I'm not sure about that specific question. "
            "I can help with: booking process, cancellation policies, refunds, "
            "payments, amenities, pet policies, check-in/out times, and safety. "
            "What would you like to know?"
        )

    response = f"**{best['question']}**\n\n{best['answer']}"

    # Add related questions if they're close enough
    if len(results["metadatas"][0]) > 1 and results["distances"][0][1] < 1.0:
        related = results["metadatas"][0][1]
        response += f"\n\n---\n📌 **Related:** {related['question']}"

    return response
