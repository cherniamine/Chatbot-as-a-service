import os
import csv
import argparse
import logging
from typing import List, Dict

# Ensure project imports work when running from repo root or backend/
import sys
CURR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(CURR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_ROOT, ".env"))

# Import the in-process RAG pipeline
from app.services import rag_service


# ---------- LOGGER CONFIG ----------
LOG_FILE = os.path.join(CURR, "evaluation.log")
logging.basicConfig(
    filename=LOG_FILE,
    filemode="w",  # écrase à chaque run, mettre "a" pour append
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)


def read_eval_csv(path: str) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        required = {"question", "ground_truth"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV missing required columns: {', '.join(sorted(missing))}")
        for r in reader:
            rows.append({
                "question": r["question"].strip(),
                "ground_truth": r["ground_truth"].strip(),
            })
    return rows


def collect_answers(rows: List[Dict[str, str]], chatbot_id: str, langs: List[str]) -> List[Dict]:
    data = []
    for i, r in enumerate(rows, 1):
        q = r["question"]
        res = rag_service.query(question=q, chatbot_id=chatbot_id, user_id="eval-user", langs=langs)

        full_context = res.get("context", "")
        contexts = [c.strip() for c in full_context.split("\n\n---\n\n") if c.strip()]
        answer = res.get("answer_fr") or res.get("answer") or ""

        # Evaluation simple : contient la ground_truth ?
        gt = r["ground_truth"].lower()
        is_correct = gt in answer.lower()

        result = {
            "question": q,
            "answer": answer,
            "contexts": contexts,
            "ground_truth": r["ground_truth"],
            "contains_match": is_correct,
        }
        data.append(result)

        # Console + log file
        msg = f"[{i}/{len(rows)}] Q: {q} | GT: {r['ground_truth']} | Answer: {answer[:80]}... | Match={is_correct}"
        print(msg)
        logging.info(msg)

    return data


def evaluate_with_ragas(samples: List[Dict]):
    try:
        from datasets import Dataset
        from ragas.metrics import faithfulness, answer_relevance, context_relevance
        from ragas import evaluate
    except Exception as e:
        print("[WARN] RAGAS or datasets not available. Install dependencies from backend/requirements.txt")
        logging.warning(f"RAGAS not available: {e}")
        return None

    if not os.getenv("OPENAI_API_KEY"):
        print("[WARN] OPENAI_API_KEY not set. RAGAS LLM-based metrics may fail.")
        logging.warning("OPENAI_API_KEY not set.")

    ds = Dataset.from_list(samples)
    report = evaluate(
        ds,
        metrics=[faithfulness, answer_relevance, context_relevance],
    )
    return report


def main():
    parser = argparse.ArgumentParser(description="Evaluate RAG quality using RAGAS")
    parser.add_argument("--chatbot-id", required=True, help="Target chatbot_id to query")
    parser.add_argument("--input", required=True, help="CSV file with columns: question, ground_truth")
    parser.add_argument("--langs", default="fr", help="Comma-separated langs, default 'fr'")
    parser.add_argument("--save-jsonl", default=None, help="Optional path to save collected dataset as JSONL")
    args = parser.parse_args()

    langs = [x.strip() for x in args.langs.split(",") if x.strip()]
    rows = read_eval_csv(args.input)
    print(f"Loaded {len(rows)} evaluation rows from {args.input}")
    logging.info(f"Loaded {len(rows)} evaluation rows from {args.input}")

    samples = collect_answers(rows, chatbot_id=args.chatbot_id, langs=langs)

    if args.save_jsonl:
        import json
        with open(args.save_jsonl, "w", encoding="utf-8") as f:
            for s in samples:
                f.write(json.dumps(s, ensure_ascii=False) + "\n")
        print(f"Saved collected dataset to {args.save_jsonl}")
        logging.info(f"Saved collected dataset to {args.save_jsonl}")

    report = evaluate_with_ragas(samples)
    if report is None:
        print("[INFO] Skipped RAGAS evaluation due to missing deps or API key.")
        logging.info("Skipped RAGAS evaluation due to missing deps or API key.")
        return

    print("\n=== RAGAS Report ===")
    logging.info("=== RAGAS Report ===")
    for k, v in report.items():
        try:
            line = f"{k}: {float(v):.4f}"
        except Exception:
            line = f"{k}: {v}"
        print(line)
        logging.info(line)


if __name__ == "__main__":
    main()
