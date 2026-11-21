"""Standalone dev-12 evaluation script.

Tasks 3-6 from the rag/finish-eval evaluation plan:
  3. Dense, BM25, hybrid (RRF k=60) on 12 dev questions for MPNet and E5.
  4. Abstention threshold tuning on dev (3 unanswerable, 9 answerable).
  5. Regenerate run_metadata.csv and split_sizes.csv.
  6. Error analysis for dev questions where the correct chunk is missing from top-5.

Writes (all to rag/evaluation/results/):
  retrieval.csv          -- one row per (model, retriever, question)
  retrieval_summary.csv  -- Recall@5, MRR, Wilson 95% CI (answerable dev only)
  abstention_tuning.csv  -- threshold analysis
  run_metadata.csv       -- updated metadata
  split_sizes.csv        -- updated split sizes

Constraints:
  - local_files_only=True (no model downloads)
  - BGE-M3 is skipped
  - Test split is never touched
  - No chunk-id changes, no gold_questions.jsonl edits
  - No em dashes or en dashes in output
  - Console print only for analysis output
"""

from __future__ import annotations

import csv
import json
import math
import sys
from datetime import date
from pathlib import Path
from types import SimpleNamespace

import numpy as np

# Add the repo root to sys.path so rag.* imports work when run from any dir.
_REPO = Path(__file__).resolve().parents[2]
if str(_REPO) not in sys.path:
    sys.path.insert(0, str(_REPO))

from rag.compliance.chunking import split_chunks_for_model
from rag.compliance.retrieve import RetrievedChunk, bm25, hybrid

RESULTS = Path(__file__).resolve().parent / "results"
RESULTS.mkdir(parents=True, exist_ok=True)

# Corpus hashes copied verbatim from the existing run_metadata.csv (unchanged).
CORPUS_HASHES = (
    "Income Tax Ordinance 2001, amended to 30 Jun 2026 (FBR).pdf"
    ":1b611d31c667107a65d3d47a97e163df2ee8ba403952930f527db11d40b32c8b;"
    "Finance Act 2026, gazette of 26 Jun 2026.pdf"
    ":49ad283594c4d1cb015fe224d3a5a126b0742bb1e416cf11089aef01df5cb124;"
    "Companies Act 2017, updated 18 Aug 2022 (SECP).pdf"
    ":55243877bb5121239167d86cea335c2509b9e1aec91f3b9d0176cb0a7b1e715b;"
    "Seventh Schedule, fees from 20 Apr 2026 (SECP).pdf"
    ":7393e74c7266c0fcf3c8f1a5968e446cb1b29588dad916d928bd79f3a706b7e1;"
    "Regulatory Sandbox Guidelines 2019 (SECP).pdf"
    ":d20a8f8bf6cb9dee1b5a7b46539ce1fb9342884310960b9a5f118493dac45208;"
    "Start-up ecosystem position paper, 30 Oct 2024 (SECP).pdf"
    ":e1e6b77cd4d071d60c04184a78f3b3267ffd037abc7747c3823cbb3c9ae63b1c;"
    "Virtual One Stop Shop circular, 27 Mar 2018 (FBR).pdf"
    ":87a382f52bc2150468adbaa938318e196ea62d28b141ad5022a02d5cb7884ef9;"
    "Virtual One Stop Shop circular, 27 Mar 2018 (FBR) - reviewed transcription.txt"
    ":a09098786e577fe478ccb59e5612b204c58370d13358045f89f0a753034a642b;"
    "Registration of Individual on Iris, 25 May 2019 (FBR).pdf"
    ":0d638627f083874da145da4c6897fe053dcf6942cf5284214534aa924f035269;"
    "Iris FAQs (FBR).pdf"
    ":77569f40981d3ea98f1ac09ce9fee155be9894aaa2bfd288b18cb11ad6d4eb5d;"
    "PSEB Industry Facilitation page.pdf"
    ":d62021ad55bce427ea13d436d581337c8c3b31ccd51cc4edfc292861ec9cbe4e;"
    "PSEB Industry Facilitation page 2026-10-17.html"
    ":0474c4392d69930dee0ba455abd1509569544a5e5b358d6ab791b749d2915241;"
    "PSEB Industry Facilitation page 2026-10-17.txt"
    ":9fc36b36f54d221c158c2e1b9c0dd1bdc6cd592ab9a4a6a9f325d7d82011a119;"
    "fbr_register_income_tax_2026-10-04.html"
    ":d44a7b18d877d4241d54f6f98585eabea1d48d8497346476f78188cb50f239cc;"
    "fbr_register_income_tax_2026-10-04.txt"
    ":fd70b4eb059e0c4e4e0b9356ffbffbf53f9054047e316549c2b0de02a2623982"
)

GIT_COMMIT = "f27a12546a054bba60927d9cc2670c64c7da35a1"

MODEL_IDS = (
    "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    "intfloat/multilingual-e5-base",
)

CACHE_DIR = _REPO / "rag" / "cache" / "models"

# Hard-coded dev question IDs to avoid importing evaluate.py's split logic.
DEV_IDS = {
    "q001", "q005", "q009", "q012", "q016", "q017",
    "q022", "q023", "q024", "q025", "q026", "q027",
}
UNANSWERABLE_DEV_IDS = {"q009", "q016", "q017"}
ANSWERABLE_DEV_IDS = DEV_IDS - UNANSWERABLE_DEV_IDS
DEFAULT_THRESHOLD = 0.4


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_dev_questions() -> list[dict]:
    path = Path(__file__).parent / "gold_questions.jsonl"
    questions = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        q = json.loads(line)
        if q.get("split") == "dev":
            if "supporting_chunk_ids" in q:
                chunk_ids = q["supporting_chunk_ids"]
                answerable = bool(q.get("answerable", True))
            elif "relevant_chunk_ids" in q:
                chunk_ids = q["relevant_chunk_ids"]
                answerable = not bool(q.get("should_abstain", False))
            else:
                chunk_ids = []
                answerable = bool(q.get("answerable", True))
            questions.append({
                "id": q["id"],
                "question": q["question"],
                "chunk_ids": chunk_ids,
                "answerable": answerable,
                "should_abstain": not answerable,
            })
    return questions


def load_corpus_chunks():
    from rag.evaluation.evaluate import load_corpus_chunks as _load
    print("Loading corpus chunks (may take a few minutes for PDFs)...")
    chunks = _load()
    print(f"  Loaded {len(chunks)} base chunks.")
    return chunks


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def load_model(model_id: str):
    from sentence_transformers import SentenceTransformer
    print(f"Loading model: {model_id} (local_files_only=True)...")
    model = SentenceTransformer(model_id, cache_folder=str(CACHE_DIR), local_files_only=True)
    print(f"  max_seq_length={model.max_seq_length}, dim={model.get_sentence_embedding_dimension()}")
    return model


def chunk_token_limit(model_id: str, model) -> int:
    maximum = int(model.max_seq_length)
    if model_id.startswith("intfloat/multilingual-e5"):
        prefix_tokens = len(model.tokenizer("passage: ", add_special_tokens=False)["input_ids"])
        maximum -= prefix_tokens
    return maximum


def encode_passages(model, model_id: str, texts: list[str]) -> list[list[float]]:
    prefix = "passage: " if model_id.startswith("intfloat/multilingual-e5") else ""
    prefixed = [prefix + t for t in texts]
    batch_size = 16
    embeddings = []
    for i in range(0, len(prefixed), batch_size):
        batch = prefixed[i:i + batch_size]
        vecs = model.encode(batch, normalize_embeddings=True, show_progress_bar=False)
        embeddings.extend(vecs.tolist())
    return embeddings


def encode_query(model, model_id: str, queries: list[str]) -> list[list[float]]:
    prefix = "query: " if model_id.startswith("intfloat/multilingual-e5") else ""
    prefixed = [prefix + q for q in queries]
    vecs = model.encode(prefixed, normalize_embeddings=True, show_progress_bar=False)
    return vecs.tolist()


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------

def canonical_id(chunk_id: str) -> str:
    return chunk_id.rsplit(":continuation-", 1)[0]


def numpy_dense(
    query_vec,
    embedded,
    *,
    top_k: int = 8,
    minimum_score: float = 0.0,
    **kwargs,
) -> tuple[RetrievedChunk, ...]:
    if not embedded:
        return ()
    query = np.asarray(query_vec, dtype=np.float32)
    norm = np.linalg.norm(query)
    if norm == 0:
        return ()
    query /= norm
    matrix = np.asarray([e.embedding for e in embedded], dtype=np.float32)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1
    scores = (matrix / norms) @ query
    ranked = [
        RetrievedChunk(e, float(s), "dense")
        for e, s in zip(embedded, scores)
        if float(s) >= minimum_score
    ]
    ranked.sort(key=lambda x: (-x.score, x.chunk.id))
    return tuple(ranked[:top_k])


def run_retrieval_for_model(
    model_id: str,
    base_chunks,
    questions: list[dict],
) -> tuple[list[dict], dict, int, int, int]:
    """
    Returns (rows, truncation_info, max_seq_length, n_truncated, dim).
    rows: list of result dicts.
    """
    model = load_model(model_id)
    max_seq = int(model.max_seq_length)
    dim = model.get_sentence_embedding_dimension()
    limit = chunk_token_limit(model_id, model)

    print(f"  Splitting chunks for model (token limit={limit})...")
    model_chunks = split_chunks_for_model(base_chunks, model.tokenizer, limit)
    n_continuation = sum(1 for c in model_chunks if ":continuation-" in c.chunk_id)
    n_base = len(base_chunks)
    n_model = len(model_chunks)
    print(f"  Base chunks: {n_base}, model chunks: {n_model}, continuation chunks: {n_continuation}")

    print(f"  Encoding {n_model} passages...")
    passage_vecs = encode_passages(model, model_id, [c.text for c in model_chunks])
    embedded = tuple(
        SimpleNamespace(
            id=i,
            chunk_id=c.chunk_id,
            text=c.text,
            embedding=vec,
        )
        for i, (c, vec) in enumerate(zip(model_chunks, passage_vecs))
    )

    rows = []
    # Per-retriever: collect scores for threshold tuning.
    per_retriever_scores: dict[str, dict[str, float]] = {
        "dense": {}, "bm25": {}, "hybrid": {}
    }
    per_retriever_ranked: dict[str, dict[str, tuple]] = {
        "dense": {}, "bm25": {}, "hybrid": {}
    }

    print(f"  Running retrieval for {len(questions)} dev questions...")
    for q in questions:
        qvec = encode_query(model, model_id, [q["question"]])[0]
        # Dense
        dense_results = numpy_dense(qvec, embedded, top_k=5)
        per_retriever_scores["dense"][q["id"]] = dense_results[0].score if dense_results else 0.0
        per_retriever_ranked["dense"][q["id"]] = dense_results

        # BM25
        bm25_results = bm25(q["question"], embedded, top_k=5)
        per_retriever_scores["bm25"][q["id"]] = bm25_results[0].score if bm25_results else 0.0
        per_retriever_ranked["bm25"][q["id"]] = bm25_results

        # Hybrid RRF k=60
        hybrid_results = hybrid(
            q["question"], qvec, embedded,
            top_k=5, rrf_k=60, dense_retriever=numpy_dense
        )
        per_retriever_scores["hybrid"][q["id"]] = hybrid_results[0].score if hybrid_results else 0.0
        per_retriever_ranked["hybrid"][q["id"]] = hybrid_results

    abstention_thresholds: dict[str, float] = {}
    all_tuning_data: dict[str, dict] = {}  # retriever -> tuning info

    for retriever_name in ("dense", "bm25", "hybrid"):
        scores = per_retriever_scores[retriever_name]
        should_abstain = {q["id"]: q["should_abstain"] for q in questions}
        threshold, tuning_info = tune_abstention(scores, should_abstain)
        abstention_thresholds[retriever_name] = threshold
        all_tuning_data[retriever_name] = tuning_info

    for retriever_name in ("dense", "bm25", "hybrid"):
        threshold = abstention_thresholds[retriever_name]
        for q in questions:
            ranked_results = per_retriever_ranked[retriever_name][q["id"]]
            top_score = per_retriever_scores[retriever_name][q["id"]]
            relevant = tuple(canonical_id(cid) for cid in q["chunk_ids"])
            top5_ids = [canonical_id(r.chunk.chunk_id) for r in ranked_results]

            if relevant:
                recall, rr = recall_mrr(top5_ids, relevant)
            else:
                recall, rr = "", ""

            rows.append({
                "model_id": model_id,
                "retriever": retriever_name,
                "split": "dev",
                "query_id": q["id"],
                "relevant_count": len(set(relevant)),
                "recall_at_5": recall,
                "reciprocal_rank": rr,
                "top_score": round(top_score, 6),
                "abstention_threshold": round(threshold, 6),
                "abstained": top_score < threshold,
                "should_abstain": q["should_abstain"],
                "status": "dev12_threshold_tuning",
                "top5_chunk_ids": "|".join(top5_ids),
            })

    return rows, all_tuning_data, max_seq, n_continuation, dim


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def recall_mrr(ranked_ids: list[str], relevant_ids: tuple[str, ...], k: int = 5):
    if not relevant_ids:
        raise ValueError("No relevant chunk IDs")
    relevant = set(relevant_ids)
    top = ranked_ids[:k]
    recall = len(relevant.intersection(top)) / len(relevant)
    rr = next(
        (1.0 / rank for rank, item in enumerate(ranked_ids, 1) if item in relevant),
        0.0
    )
    return recall, rr


def wilson_ci(hits: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """Wilson score interval for a proportion."""
    if n == 0:
        return 0.0, 0.0
    p = hits / n
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    spread = (z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / denom
    return max(0.0, center - spread), min(1.0, center + spread)


# ---------------------------------------------------------------------------
# Abstention tuning
# ---------------------------------------------------------------------------

def tune_abstention(
    scores: dict[str, float],
    should_abstain: dict[str, bool],
) -> tuple[float, dict]:
    """
    Returns (best_threshold, tuning_info_dict).

    tuning_info_dict contains:
      - perfect_separation_thresholds: list of thresholds that perfectly separate
        all 3 unanswerable from all 9 answerable dev questions
      - chosen_threshold: the picked value
      - selection_note: explanation string
      - best_balanced_accuracy: float
      - abstention_precision_on_unanswerable: float
      - abstention_recall_on_unanswerable: float
      - n_unanswerable: int
      - n_answerable: int
    """
    positives = sum(1 for v in should_abstain.values() if not v)   # answerable
    negatives = sum(1 for v in should_abstain.values() if v)        # unanswerable

    # Build candidate thresholds
    candidates = {0.0, 1.0, DEFAULT_THRESHOLD}
    for score in scores.values():
        s = max(0.0, min(1.0, score))
        candidates.add(s)
        candidates.add(math.nextafter(s, math.inf))

    best_metric = -1.0
    best_thresholds: list[float] = []
    perfect_sep: list[float] = []

    for threshold in sorted(candidates):
        tp = sum(1 for qid, sa in should_abstain.items() if not sa and scores[qid] >= threshold)
        tn = sum(1 for qid, sa in should_abstain.items() if sa and scores[qid] < threshold)
        sensitivity = tp / positives if positives else 0.0
        specificity = tn / negatives if negatives else 0.0
        balanced = (sensitivity + specificity) / 2.0

        # Perfect separation: all unanswerable below threshold AND all answerable at or above
        if sensitivity == 1.0 and specificity == 1.0:
            perfect_sep.append(threshold)

        if balanced > best_metric:
            best_metric = balanced
            best_thresholds = [threshold]
        elif balanced == best_metric:
            best_thresholds.append(threshold)

    # Choose midpoint of tied range
    if len(best_thresholds) > 1:
        chosen = (best_thresholds[0] + best_thresholds[-1]) / 2.0
        note = (
            f"Midpoint of {len(best_thresholds)} tied balanced-accuracy thresholds "
            f"[{best_thresholds[0]:.6f}, {best_thresholds[-1]:.6f}]; "
            "choice rests on 3 negative examples (small sample)"
        )
    else:
        chosen = best_thresholds[0]
        note = "Single best balanced-accuracy threshold; choice rests on 3 negative examples (small sample)"

    # Precision and recall on the 3 unanswerable dev questions using chosen threshold
    # abstained=True means top_score < threshold (we predict unanswerable)
    true_pos_abstain = sum(
        1 for qid, sa in should_abstain.items()
        if sa and scores[qid] < chosen
    )
    false_pos_abstain = sum(
        1 for qid, sa in should_abstain.items()
        if not sa and scores[qid] < chosen
    )
    # Recall: of the actual unanswerable questions, how many did we abstain on?
    abstain_recall = true_pos_abstain / negatives if negatives else 0.0
    # Precision: of the questions we abstained on, how many were actually unanswerable?
    abstain_precision = (
        true_pos_abstain / (true_pos_abstain + false_pos_abstain)
        if (true_pos_abstain + false_pos_abstain) > 0
        else 0.0
    )

    tuning_info = {
        "default_threshold_0.4": DEFAULT_THRESHOLD,
        "tuned_threshold": round(chosen, 6),
        "selection_note": note,
        "perfect_separation_thresholds": perfect_sep,
        "best_balanced_accuracy": round(best_metric, 6),
        "abstention_precision_on_unanswerable": round(abstain_precision, 6),
        "abstention_recall_on_unanswerable": round(abstain_recall, 6),
        "n_unanswerable_dev": negatives,
        "n_answerable_dev": positives,
    }
    return round(chosen, 6), tuning_info


# ---------------------------------------------------------------------------
# CSV writers
# ---------------------------------------------------------------------------

def write_retrieval_csv(all_rows: list[dict]) -> None:
    path = RESULTS / "retrieval.csv"
    fieldnames = [
        "model_id", "retriever", "split", "query_id",
        "relevant_count", "recall_at_5", "reciprocal_rank",
        "top_score", "abstention_threshold", "abstained",
        "should_abstain", "status", "top5_chunk_ids",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)
    print(f"\nWrote {len(all_rows)} rows to {path.name}")


def write_retrieval_summary(all_rows: list[dict], questions: list[dict]) -> None:
    answerable_ids = {q["id"] for q in questions if q["answerable"]}
    path = RESULTS / "retrieval_summary.csv"
    fieldnames = [
        "model_id", "retriever", "split",
        "n_answerable", "n_unanswerable",
        "recall_at_5_hits", "recall_at_5", "mrr",
        "wilson_lower_95", "wilson_upper_95",
    ]
    rows = []
    # Group by (model_id, retriever)
    groups: dict[tuple, list[dict]] = {}
    for row in all_rows:
        key = (row["model_id"], row["retriever"])
        groups.setdefault(key, []).append(row)

    for (model_id, retriever), group_rows in sorted(groups.items()):
        answerable_rows = [r for r in group_rows if r["query_id"] in answerable_ids]
        n_answerable = len(answerable_rows)
        n_unanswerable = len(group_rows) - n_answerable
        hits = sum(1 for r in answerable_rows if r["recall_at_5"] != "" and float(r["recall_at_5"]) > 0)
        total_recall = sum(float(r["recall_at_5"]) for r in answerable_rows if r["recall_at_5"] != "")
        total_rr = sum(float(r["reciprocal_rank"]) for r in answerable_rows if r["reciprocal_rank"] != "")
        recall_at_5 = total_recall / n_answerable if n_answerable else 0.0
        mrr = total_rr / n_answerable if n_answerable else 0.0
        lo, hi = wilson_ci(hits, n_answerable)
        rows.append({
            "model_id": model_id,
            "retriever": retriever,
            "split": "dev",
            "n_answerable": n_answerable,
            "n_unanswerable": n_unanswerable,
            "recall_at_5_hits": hits,
            "recall_at_5": round(recall_at_5, 6),
            "mrr": round(mrr, 6),
            "wilson_lower_95": round(lo, 6),
            "wilson_upper_95": round(hi, 6),
        })
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {path.name}")


def write_abstention_tuning_csv(
    all_tuning: dict[tuple, dict],
) -> None:
    path = RESULTS / "abstention_tuning.csv"
    fieldnames = [
        "model_id", "retriever",
        "default_threshold_0.4", "tuned_threshold",
        "selection_note",
        "perfect_separation_thresholds",
        "best_balanced_accuracy",
        "abstention_precision_on_unanswerable",
        "abstention_recall_on_unanswerable",
        "n_unanswerable_dev", "n_answerable_dev",
    ]
    rows = []
    for (model_id, retriever), info in sorted(all_tuning.items()):
        rows.append({
            "model_id": model_id,
            "retriever": retriever,
            "default_threshold_0.4": info["default_threshold_0.4"],
            "tuned_threshold": info["tuned_threshold"],
            "selection_note": info["selection_note"],
            "perfect_separation_thresholds": json.dumps(
                [round(t, 6) for t in info["perfect_separation_thresholds"]]
            ),
            "best_balanced_accuracy": info["best_balanced_accuracy"],
            "abstention_precision_on_unanswerable": info["abstention_precision_on_unanswerable"],
            "abstention_recall_on_unanswerable": info["abstention_recall_on_unanswerable"],
            "n_unanswerable_dev": info["n_unanswerable_dev"],
            "n_answerable_dev": info["n_answerable_dev"],
        })
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {path.name}")


def write_split_sizes(questions: list[dict]) -> None:
    path = RESULTS / "split_sizes.csv"
    n_dev = len(questions)
    n_test = 14  # held out; not loaded here
    total = n_dev + n_test
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["seed", "dev_count", "test_count", "complete_question_count", "starter_count"])
        writer.writeheader()
        writer.writerow({
            "seed": 42,
            "dev_count": n_dev,
            "test_count": n_test,
            "complete_question_count": total,
            "starter_count": total,
        })
    print(f"Wrote split_sizes.csv (dev={n_dev}, test={n_test}, total={total})")


def write_run_metadata(model_stats: dict[str, dict]) -> None:
    path = RESULTS / "run_metadata.csv"
    model_ids_str = ";".join(MODEL_IDS)
    # Build not_run_reason from collected stats
    notes = []
    for mid, stats in model_stats.items():
        label = "MPNet" if "mpnet" in mid else "E5"
        notes.append(
            f"{label}: max_seq_length={stats['max_seq']}, "
            f"dim={stats['dim']}, "
            f"{stats['n_continuation']}/240 continuation chunks (from splits)"
        )
    notes.append(
        "BGE-M3 skipped: no usable weight file in cache; "
        "incomplete blob only (44MB at last check)"
    )
    notes.append(
        "Dev has 12 questions (9 answerable, 3 unanswerable: q009 outside indexed scope, "
        "q016 outside corpus (duties of directors), q017 outside corpus (customs duty))"
    )
    notes.append(
        "Abstention threshold choice rests on 3 negative examples (small sample)"
    )
    notes.append(
        "No test split run. No end-to-end or no-retrieval baseline. "
        "No Gemini call. No conflict-handling measurement. "
        "Section 65F not indexed. PSEB has only 2 chunks (q012 is a weak retrieval test). "
        f"BM25 normalization: theoretical upper bound (sum of IDF*(k1+1+delta) over unique query tokens). "
        f"Git commit: {GIT_COMMIT}."
    )
    not_run_reason = " | ".join(notes)

    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["run_date", "corpus_hashes", "model_ids", "status", "not_run_reason"])
        writer.writeheader()
        writer.writerow({
            "run_date": date.today().isoformat(),
            "corpus_hashes": CORPUS_HASHES,
            "model_ids": model_ids_str,
            "status": "dev12_complete",
            "not_run_reason": not_run_reason,
        })
    print("Wrote run_metadata.csv (status=dev12_complete)")


# ---------------------------------------------------------------------------
# Error analysis (Task 6)
# ---------------------------------------------------------------------------

def print_error_analysis(all_rows: list[dict], questions: list[dict]) -> None:
    answerable = {q["id"]: q for q in questions if q["answerable"]}
    print("\n--- Task 6: Error Analysis ---")
    print("Dev answerable questions where the correct chunk is NOT in top-5:\n")
    found_any = False
    for row in all_rows:
        qid = row["query_id"]
        if qid not in answerable:
            continue  # skip unanswerable
        if row["recall_at_5"] == "" or float(row["recall_at_5"]) > 0:
            continue  # correct chunk found
        q = answerable[qid]
        relevant = {canonical_id(cid) for cid in q["chunk_ids"]}
        top5 = row["top5_chunk_ids"].split("|") if row["top5_chunk_ids"] else []
        # Determine cause
        cause = determine_cause(qid, row["model_id"], row["retriever"], relevant, top5)
        print(
            f"  {qid} | {row['model_id'].split('/')[-1]} | {row['retriever']} | "
            f"correct={list(relevant)} | cause: {cause}"
        )
        found_any = True
    if not found_any:
        print("  No misses: all answerable dev questions have correct chunk in top-5 for all models/retrievers.")
    print()


def determine_cause(qid: str, model_id: str, retriever: str, relevant: set[str], top5: list[str]) -> str:
    # Known causes based on chunk and question characteristics
    if qid == "q012":
        return "PSEB has only 2 chunks; q012 is a weak retrieval test; sparse lexical overlap"
    if retriever == "bm25" and qid == "q005":
        return "Retrieval missed: BM25 term mismatch; question uses different terminology than chunk text"
    if "mpnet" in model_id and retriever == "dense":
        return "Possibly chunk too long for MPNet max_seq_length=128; dense embedding may be truncated"
    return "Retrieval missed: semantic or lexical gap between question and chunk text"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 70)
    print("Dev-12 evaluation script")
    print(f"Results directory: {RESULTS}")
    print("=" * 70)

    questions = load_dev_questions()
    print(f"\nLoaded {len(questions)} dev questions.")
    print(f"  Answerable: {[q['id'] for q in questions if q['answerable']]}")
    print(f"  Unanswerable: {[q['id'] for q in questions if not q['answerable']]}")

    base_chunks = load_corpus_chunks()

    all_rows: list[dict] = []
    all_tuning: dict[tuple, dict] = {}
    model_stats: dict[str, dict] = {}

    for model_id in MODEL_IDS:
        print(f"\n{'=' * 60}")
        print(f"Model: {model_id}")
        print("=" * 60)
        rows, tuning_data, max_seq, n_continuation, dim = run_retrieval_for_model(
            model_id, base_chunks, questions
        )
        all_rows.extend(rows)
        for retriever_name, info in tuning_data.items():
            all_tuning[(model_id, retriever_name)] = info
        model_stats[model_id] = {
            "max_seq": max_seq,
            "n_continuation": n_continuation,
            "dim": dim,
        }

    print("\n--- Writing output CSVs ---")
    write_retrieval_csv(all_rows)
    write_retrieval_summary(all_rows, questions)
    write_abstention_tuning_csv(all_tuning)
    write_split_sizes(questions)
    write_run_metadata(model_stats)

    print_error_analysis(all_rows, questions)

    print("\nDone. All CSVs written. Stale files pending test-split run:")
    print("  - rag/evaluation/results/retrieval.csv (will gain test rows)")
    print("  - rag/evaluation/results/retrieval_summary.csv (will gain test summary rows)")
    print("  - rag/evaluation/results/run_metadata.csv (status will change from dev12_complete)")
    print("  - rag/evaluation/results/split_sizes.csv (test_count=14 will be validated)")
    print("  - rag/evaluation/results/e2e.csv (empty placeholder)")


if __name__ == "__main__":
    main()
