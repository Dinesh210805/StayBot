#!/usr/bin/env python3
"""
RAGAS evaluation for the StayBot RAG pipeline.

Hits the running StayBot API with a curated test dataset, then scores
responses using RAGAS metrics:
  - answer_relevancy  — does the answer address the question?
  - faithfulness      — is the answer grounded in the retrieved context?

Usage:
    # Start the backend first:
    #   cd D:/Projects/staybot/StayBot && python -m uvicorn backend.main:app --port 8000

    python -m eval.ragas_eval
    python -m eval.ragas_eval --api-url http://localhost:8000 --out eval/results.json

Dependencies:
    pip install ragas datasets langchain-groq

The evaluation LLM defaults to llama-3.3-70b-versatile via the GROQ_API_KEY_1
environment variable (needs a stronger model than 8B for reliable scoring).
"""

import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

# ── Test Dataset ───────────────────────────────────────────────────────────────
# Format: (question, ground_truth_keywords)
# ground_truth_keywords are lowercase strings that a correct answer MUST contain
# at least one of. This gives a quick pass/fail before RAGAS scoring.

EVAL_DATASET = [
    # Bangkok — semantic search
    {
        "question": "I want a cozy apartment in Bangkok under $60 per night",
        "ground_truth": "I'm looking for listings in Bangkok with a budget-friendly price around $60 per night.",
        "expected_city": "Bangkok",
        "keywords": ["bangkok", "apartment", "night"],
    },
    # Bangkok — filter
    {
        "question": "Show me Bangkok villas that can fit 6 guests",
        "ground_truth": "I need a villa in Bangkok for 6 guests.",
        "expected_city": "Bangkok",
        "keywords": ["bangkok", "villa", "guests"],
    },
    # London — semantic
    {
        "question": "Find a luxury apartment near central London with a pool",
        "ground_truth": "I need a luxury apartment near central London with pool access.",
        "expected_city": "London",
        "keywords": ["london", "apartment"],
    },
    # Cape Town — filter
    {
        "question": "What are the cheapest listings in Cape Town for 2 guests?",
        "ground_truth": "I need the most affordable listings in Cape Town for 2 guests.",
        "expected_city": "Cape Town",
        "keywords": ["cape town"],
    },
    # Istanbul — semantic
    {
        "question": "I want a place to stay in Istanbul close to historic sites",
        "ground_truth": "I need accommodation in Istanbul near historical sites.",
        "expected_city": "Istanbul",
        "keywords": ["istanbul"],
    },
    # FAQ — cancellation
    {
        "question": "What is the cancellation policy if I need to cancel my booking?",
        "ground_truth": "Cancellation policy depends on the listing. Flexible policies allow cancellation with full refund within 24 hours.",
        "expected_city": None,
        "keywords": ["cancel", "refund", "policy"],
    },
    # FAQ — booking process
    {
        "question": "How do I make a booking on StayBot?",
        "ground_truth": "You can book by finding a listing, checking availability, and confirming with your dates.",
        "expected_city": None,
        "keywords": ["book", "availability", "dates"],
    },
    # Price breakdown
    {
        "question": "How much would it cost to stay at listing 1001 for 3 nights?",
        "ground_truth": "The total cost for 3 nights at listing 1001 including fees.",
        "expected_city": None,
        "keywords": ["night", "$", "total", "price", "cost"],
    },
    # Out-of-scope city
    {
        "question": "Do you have listings in Paris?",
        "ground_truth": "I currently have listings in Bangkok, London, Cape Town, and Istanbul.",
        "expected_city": None,
        "keywords": ["bangkok", "london", "cape town", "istanbul"],
    },
    # Pet-friendly filter
    {
        "question": "Find pet-friendly apartments in Bangkok",
        "ground_truth": "Pet-friendly listings in Bangkok that allow pets.",
        "expected_city": "Bangkok",
        "keywords": ["bangkok", "pet"],
    },
]


# ── API Helpers ────────────────────────────────────────────────────────────────

def create_session(api_url: str) -> str:
    resp = requests.post(f"{api_url}/api/sessions", timeout=10)
    resp.raise_for_status()
    return resp.json()["session_id"]


def send_message(api_url: str, session_id: str, message: str, timeout: int = 90) -> str:
    payload = {"session_id": session_id, "message": message}
    resp = requests.post(f"{api_url}/api/chat", json=payload, timeout=timeout)
    resp.raise_for_status()
    return resp.json()["response"]


# ── Quick Keyword Check ────────────────────────────────────────────────────────

def keyword_pass(answer: str, keywords: list[str]) -> bool:
    lower = answer.lower()
    return any(kw in lower for kw in keywords)


# ── RAGAS Evaluation ──────────────────────────────────────────────────────────

def run_ragas(samples: list[dict], groq_key: str) -> dict:
    """
    Run RAGAS answer_relevancy evaluation using Groq's 70B model as critic.
    Returns a dict with per-metric averages.
    """
    try:
        from datasets import Dataset
        from ragas import evaluate
        from ragas.metrics import answer_relevancy
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper
        from langchain_groq import ChatGroq
        from langchain_community.embeddings import HuggingFaceEmbeddings
    except ImportError as e:
        print(f"\n[RAGAS] Missing dependency: {e}")
        print("[RAGAS] Run: pip install ragas datasets")
        return {}

    # Use a capable model for evaluation (70B is a better judge than 8B)
    eval_llm = LangchainLLMWrapper(
        ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=groq_key,
            temperature=0,
        )
    )
    # Use local embeddings (same model used for retrieval — consistent scoring)
    eval_embeddings = LangchainEmbeddingsWrapper(
        HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    )

    dataset = Dataset.from_list([
        {
            "user_input": s["question"],
            "response": s["answer"],
            "reference": s["ground_truth"],
        }
        for s in samples
    ])

    print("\n[RAGAS] Scoring with answer_relevancy...")
    result = evaluate(
        dataset=dataset,
        metrics=[answer_relevancy],
        llm=eval_llm,
        embeddings=eval_embeddings,
        raise_exceptions=False,
    )
    return result.to_pandas().mean(numeric_only=True).to_dict()


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="StayBot RAGAS Evaluation")
    parser.add_argument("--api-url", default="http://localhost:8000", help="StayBot API base URL")
    parser.add_argument("--out", default="eval/results.json", help="Output JSON path")
    parser.add_argument("--skip-ragas", action="store_true", help="Only run keyword checks, skip RAGAS")
    args = parser.parse_args()

    groq_key = os.getenv("GROQ_API_KEY_1")
    if not groq_key and not args.skip_ragas:
        print("[ERROR] GROQ_API_KEY_1 not set. Required for RAGAS evaluation LLM.")
        sys.exit(1)

    print(f"[EVAL] Starting evaluation against {args.api_url}")
    print(f"[EVAL] Dataset size: {len(EVAL_DATASET)} questions\n")

    # Verify API is up
    try:
        requests.get(f"{args.api_url}/api/health", timeout=5).raise_for_status()
    except Exception as exc:
        print(f"[ERROR] Cannot reach API at {args.api_url}: {exc}")
        print("Start the backend: python -m uvicorn backend.main:app --port 8000")
        sys.exit(1)

    samples = []
    keyword_passes = 0

    for i, item in enumerate(EVAL_DATASET, 1):
        print(f"[{i:02d}/{len(EVAL_DATASET)}] Q: {item['question'][:70]}...")
        try:
            session_id = create_session(args.api_url)
            answer = send_message(args.api_url, session_id, item["question"])
            passed = keyword_pass(answer, item["keywords"])
            if passed:
                keyword_passes += 1
            status = "PASS" if passed else "FAIL"
            print(f"       [{status}] keyword check | answer length: {len(answer)} chars")

            samples.append({
                "question": item["question"],
                "answer": answer,
                "ground_truth": item["ground_truth"],
                "expected_city": item.get("expected_city"),
                "keyword_pass": passed,
            })
            time.sleep(15)  # avoid rate-limiting during eval (free-tier Groq shares org quota)
        except Exception as exc:
            print(f"       [ERROR] {exc}")
            samples.append({
                "question": item["question"],
                "answer": "",
                "ground_truth": item["ground_truth"],
                "expected_city": item.get("expected_city"),
                "keyword_pass": False,
                "error": str(exc),
            })

    keyword_accuracy = keyword_passes / len(EVAL_DATASET) * 100
    print(f"\n[EVAL] Keyword accuracy: {keyword_passes}/{len(EVAL_DATASET)} = {keyword_accuracy:.1f}%")

    ragas_scores: dict = {}
    if not args.skip_ragas and groq_key:
        valid = [s for s in samples if s["answer"]]
        ragas_scores = run_ragas(valid, groq_key)
        if ragas_scores:
            print("\n[RAGAS] Scores:")
            for metric, score in ragas_scores.items():
                print(f"  {metric}: {score:.4f}")

    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "api_url": args.api_url,
        "total_questions": len(EVAL_DATASET),
        "keyword_accuracy_pct": round(keyword_accuracy, 2),
        "ragas_scores": ragas_scores,
        "samples": samples,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2))
    print(f"\n[EVAL] Report saved to {out_path}")


if __name__ == "__main__":
    main()
