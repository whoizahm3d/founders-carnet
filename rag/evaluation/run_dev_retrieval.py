"""Development-set retrieval evaluation and threshold tuning harness.

This script evaluates dense, BM25, and hybrid (RRF k=60) retrieval on the
12 development questions from gold_questions.jsonl across configured embedding
models (MPNet and multilingual-e5-base).

It computes:
  - Top-5 retrieval accuracy, reciprocal rank, and hit rates for answerable questions.
  - Abstention threshold tuning on the 3 unanswerable development questions.
  - Metrics at the default 0.4 threshold vs. tuned thresholds.
  - Sequence truncation and chunk splitting statistics per model.

The test split (14 questions) is strictly held out and cannot be run by this script.

Usage:
  python rag/evaluation/run_dev_retrieval.py --split dev
  python rag/evaluation/run_dev_retrieval.py --regenerate-metadata-only
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import subprocess
import sys
from datetime import date
from pathlib import Path
from types import SimpleNamespace

import numpy as np

# Add repository root to sys.path so rag.* imports resolve cleanly.
_REPO = Path(__file__).resolve().parents[2]
if str(_REPO) not in sys.path:
    sys.path.insert(0, str(_REPO))

from rag.compliance.chunking import split_chunks_for_model
from rag.compliance.retrieve import RetrievedChunk, bm25, hybrid

RESULTS = Path(__file__).resolve().parent / "results"
RESULTS.mkdir(parents=True, exist_ok=True)

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

MODEL_IDS = (
    "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    "intfloat/multilingual-e5-base",
)

CACHE_DIR = _REPO / "rag" / "cache" / "models"
DEFAULT_THRESHOLD = 0.4


# ---------------------------------------------------------------------------
# Git metadata helpers
# ---------------------------------------------------------------------------

def get_git_commit_hash() -> str:
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=_REPO,
            capture_output=True,
            text=True,
            check=True,
        )
        return proc.stdout.strip()
    except (subprocess.SubprocessError, OSError):
        return "f27a12546a054bba60927d9cc2670c64c7da35a1"


def is_working_tree_clean() -> bool:
    try:
        proc = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=_REPO,
            capture_output=True,
            text=True,
            check=True,
        )
        # Tree is clean if git status output is empty
        return len(proc.stdout.strip()) == 0
    except (subprocess.SubprocessError, OSError):
        return False


# ---------------------------------------------------------------------------
# Question and corpus loading
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
    return _load()


# ---------------------------------------------------------------------------
# Model and encoding helpers
# ---------------------------------------------------------------------------

def load_model(model_id: str):
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(
        model_id, cache_folder=str(CACHE_DIR), local_files_only=True
    )


def chunk_token_limit(model_id: str, model) -> int:
    maximum = int(model.max_seq_length)
    if model_id.startswith("intfloat/multilingual-e5"):
        prefix_tokens = len(
            model.tokenizer("passage: ", add_special_tokens=False)["input_ids"]
        )
        maximum -= prefix_tokens
    return maximum


def count_exceeding_chunks(model_id: str, model, base_chunks) -> int:
    maximum = int(model.max_seq_length)
    tokenizer = model.tokenizer
    prefix = "passage: " if model_id.startswith("intfloat/multilingual-e5") else ""
    return sum(
        len(
            tokenizer(
                prefix + chunk.text, add_special_tokens=True, truncation=False
            )["input_ids"]
        )
        > maximum
        for chunk in base_chunks
    )


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
# Retrieval implementations
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


def recall_mrr(ranked_ids: list[str], relevant_ids: tuple[str, ...], k: int = 5):
    if not relevant_ids:
        raise ValueError("No relevant chunk IDs")
    relevant = set(relevant_ids)
    top = ranked_ids[:k]
    recall = len(relevant.intersection(top)) / len(relevant)
    rr = next(
        (1.0 / rank for rank, item in enumerate(ranked_ids, 1) if item in relevant),
        0.0,
    )
    return recall, rr


def wilson_ci(hits: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    p = hits / n
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    spread = (z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / denom
    return max(0.0, center - spread), min(1.0, center + spread)


# ---------------------------------------------------------------------------
# Abstention tuning with 0.4 baseline metrics
# ---------------------------------------------------------------------------

def tune_abstention(
    scores: dict[str, float],
    should_abstain: dict[str, bool],
) -> tuple[float, dict]:
    positives = sum(1 for v in should_abstain.values() if not v)   # 9 answerable
    negatives = sum(1 for v in should_abstain.values() if v)        # 3 unanswerable

    # Metrics at default threshold 0.4
    unans_ref_04 = sum(1 for qid, sa in should_abstain.items() if sa and scores[qid] < DEFAULT_THRESHOLD)
    ans_ref_04 = sum(1 for qid, sa in should_abstain.items() if not sa and scores[qid] < DEFAULT_THRESHOLD)
    tot_ref_04 = unans_ref_04 + ans_ref_04

    recall_04 = unans_ref_04 / negatives if negatives else 0.0
    precision_04 = unans_ref_04 / tot_ref_04 if tot_ref_04 else 0.0
    refusal_rate_ans_04 = ans_ref_04 / positives if positives else 0.0

    # Grid search candidate thresholds
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

        if sensitivity == 1.0 and specificity == 1.0:
            perfect_sep.append(threshold)

        if balanced > best_metric:
            best_metric = balanced
            best_thresholds = [threshold]
        elif balanced == best_metric:
            best_thresholds.append(threshold)

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

    true_pos_abstain = sum(1 for qid, sa in should_abstain.items() if sa and scores[qid] < chosen)
    false_pos_abstain = sum(1 for qid, sa in should_abstain.items() if not sa and scores[qid] < chosen)

    abstain_recall = true_pos_abstain / negatives if negatives else 0.0
    abstain_precision = (
        true_pos_abstain / (true_pos_abstain + false_pos_abstain)
        if (true_pos_abstain + false_pos_abstain) > 0
        else "n/a"
    )

    precision_04_value = (
        precision_04 if tot_ref_04 > 0 else "n/a"
    )

    tuning_info = {
        "default_threshold_0.4": DEFAULT_THRESHOLD,
        "abstention_precision_at_0.4": precision_04_value if isinstance(precision_04_value, str) else round(precision_04_value, 6),
        "abstention_recall_at_0.4": round(recall_04, 6),
        "refusal_rate_on_answerable_at_0.4": round(refusal_rate_ans_04, 6),
        "tuned_threshold": round(chosen, 6),
        "selection_note": note,
        "perfect_separation_thresholds": perfect_sep,
        "best_balanced_accuracy": round(best_metric, 6),
        "abstention_precision_on_unanswerable": abstain_precision if isinstance(abstain_precision, str) else round(abstain_precision, 6),
        "abstention_recall_on_unanswerable": round(abstain_recall, 6),
        "n_unanswerable_dev": negatives,
        "n_answerable_dev": positives,
    }
    return round(chosen, 6), tuning_info


# ---------------------------------------------------------------------------
# CSV outputs
# ---------------------------------------------------------------------------

def write_abstention_tuning_csv(all_tuning: dict[tuple, dict]) -> None:
    path = RESULTS / "abstention_tuning.csv"
    fieldnames = [
        "model_id",
        "retriever",
        "default_threshold_0.4",
        "abstention_precision_at_0.4",
        "abstention_recall_at_0.4",
        "refusal_rate_on_answerable_at_0.4",
        "tuned_threshold",
        "selection_note",
        "perfect_separation_thresholds",
        "best_balanced_accuracy",
        "abstention_precision_on_unanswerable",
        "abstention_recall_on_unanswerable",
        "n_unanswerable_dev",
        "n_answerable_dev",
    ]
    rows = []
    for (model_id, retriever), info in sorted(all_tuning.items()):
        rows.append({
            "model_id": model_id,
            "retriever": retriever,
            "default_threshold_0.4": info["default_threshold_0.4"],
            "abstention_precision_at_0.4": info["abstention_precision_at_0.4"],
            "abstention_recall_at_0.4": info["abstention_recall_at_0.4"],
            "refusal_rate_on_answerable_at_0.4": info["refusal_rate_on_answerable_at_0.4"],
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


def write_run_metadata(model_stats: dict[str, dict]) -> None:
    path = RESULTS / "run_metadata.csv"
    model_ids_str = ";".join(MODEL_IDS)
    commit = get_git_commit_hash()
    clean = is_working_tree_clean()

    notes = []
    for mid, stats in model_stats.items():
        label = "MPNet" if "mpnet" in mid else "E5"
        notes.append(
            f"{label}: max_seq_length={stats['max_seq']}, "
            f"dim={stats['dim']}, "
            f"{stats['n_exceeding']}/240 original chunks exceed max_seq_length, "
            f"{stats['n_passages']} passages result after splitting"
        )
    notes.append(
        "BGE-M3 skipped: no usable weight file in cache; incomplete blob only"
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
        "BM25 normalization: theoretical upper bound (sum of IDF*(k1+1+delta) over unique query tokens)."
    )
    not_run_reason = " | ".join(notes)

    fieldnames = [
        "run_date",
        "corpus_hashes",
        "model_ids",
        "git_commit",
        "working_tree_clean",
        "status",
        "not_run_reason",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerow({
            "run_date": date.today().isoformat(),
            "corpus_hashes": CORPUS_HASHES,
            "model_ids": model_ids_str,
            "git_commit": commit,
            "working_tree_clean": "true" if clean else "false",
            "status": "dev12_complete",
            "not_run_reason": not_run_reason,
        })
    print(f"Wrote run_metadata.csv (status=dev12_complete, git_commit={commit}, clean={clean})")


# ---------------------------------------------------------------------------
# Metadata-only regeneration from existing retrieval.csv
# ---------------------------------------------------------------------------

def regenerate_metadata_and_tuning_only() -> None:
    print("Regenerating run_metadata.csv and abstention_tuning.csv from existing evaluation results...")
    retrieval_path = RESULTS / "retrieval.csv"
    if not retrieval_path.exists():
        sys.exit(f"Error: {retrieval_path} not found. Run full dev evaluation first.")

    with retrieval_path.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    base_chunks = load_corpus_chunks()
    model_stats = {}

    for model_id in MODEL_IDS:
        model = load_model(model_id)
        limit = chunk_token_limit(model_id, model)
        exceeding = count_exceeding_chunks(model_id, model, base_chunks)
        model_chunks = split_chunks_for_model(base_chunks, model.tokenizer, limit)
        model_stats[model_id] = {
            "max_seq": int(model.max_seq_length),
            "dim": model.get_sentence_embedding_dimension(),
            "n_exceeding": exceeding,
            "n_passages": len(model_chunks),
        }

    # Group scores by (model_id, retriever)
    grouped: dict[tuple, list[dict]] = {}
    for r in rows:
        key = (r["model_id"], r["retriever"])
        grouped.setdefault(key, []).append(r)

    all_tuning = {}
    for key, items in grouped.items():
        scores = {it["query_id"]: float(it["top_score"]) for it in items}
        should_abstain = {it["query_id"]: it["should_abstain"] == "True" for it in items}
        _, tuning_info = tune_abstention(scores, should_abstain)
        all_tuning[key] = tuning_info

    write_abstention_tuning_csv(all_tuning)
    write_run_metadata(model_stats)
    print("Regeneration complete.")


# ---------------------------------------------------------------------------
# Retrieval execution for a single model
# ---------------------------------------------------------------------------

def run_retrieval_for_model(
    model_id: str,
    questions: list[dict],
    base_chunks: list,
    thresholds: dict[str, float] | None = None,
    split: str = "dev",
    status: str = "dev12_threshold_tuning",
    model=None,
) -> tuple[list[dict], dict, dict]:
    """Run dense, bm25, and hybrid retrieval for a single model on questions.

    Parameters
    ----------
    model_id:
        HuggingFace model ID.
    questions:
        List of question dictionaries.
    base_chunks:
        Corpus base chunks.
    thresholds:
        Optional dictionary of retriever_name -> threshold. If None,
        thresholds are tuned against questions (dev split behavior).
    split:
        Split name label for rows.
    status:
        Status string for rows.
    model:
        Optional pre-loaded SentenceTransformer instance.

    Returns
    -------
    tuple of (retrieval_rows, tuning_dict, model_stats)
    """
    if model is None:
        model = load_model(model_id)
    max_seq = int(model.max_seq_length)
    dim = model.get_sentence_embedding_dimension()
    limit = chunk_token_limit(model_id, model)

    exceeding = count_exceeding_chunks(model_id, model, base_chunks)
    model_chunks = split_chunks_for_model(base_chunks, model.tokenizer, limit)
    n_passages = len(model_chunks)

    model_stats = {
        "max_seq": max_seq,
        "dim": dim,
        "n_exceeding": exceeding,
        "n_passages": n_passages,
    }

    print(f"  {exceeding}/240 base chunks exceed max_seq_length; {n_passages} passages after split.")
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

    per_retriever_scores: dict[str, dict[str, float]] = {
        "dense": {}, "bm25": {}, "hybrid": {}
    }
    per_retriever_ranked: dict[str, dict[str, tuple]] = {
        "dense": {}, "bm25": {}, "hybrid": {}
    }

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

    abstention_thresholds = {}
    tuning_dict = {}
    if thresholds is None:
        for retriever_name in ("dense", "bm25", "hybrid"):
            scores = per_retriever_scores[retriever_name]
            should_abstain = {q["id"]: q["should_abstain"] for q in questions}
            threshold, tuning_info = tune_abstention(scores, should_abstain)
            abstention_thresholds[retriever_name] = threshold
            tuning_dict[(model_id, retriever_name)] = tuning_info
    else:
        abstention_thresholds = thresholds

    retrieval_rows = []
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

            retrieval_rows.append({
                "model_id": model_id,
                "retriever": retriever_name,
                "split": split,
                "query_id": q["id"],
                "relevant_count": len(set(relevant)),
                "recall_at_5": recall,
                "reciprocal_rank": rr,
                "top_score": round(top_score, 6),
                "abstention_threshold": round(threshold, 6),
                "abstained": top_score < threshold,
                "should_abstain": q["should_abstain"],
                "status": status,
                "top5_chunk_ids": "|".join(top5_ids),
            })

    return retrieval_rows, tuning_dict, model_stats


# ---------------------------------------------------------------------------
# Full development evaluation
# ---------------------------------------------------------------------------

def run_dev_evaluation() -> None:
    questions = load_dev_questions()
    base_chunks = load_corpus_chunks()

    all_rows = []
    all_tuning = {}
    model_stats = {}

    for model_id in MODEL_IDS:
        print(f"\nEvaluating model: {model_id}")
        m_rows, m_tuning, m_stats = run_retrieval_for_model(
            model_id=model_id,
            questions=questions,
            base_chunks=base_chunks,
            thresholds=None,
            split="dev",
            status="dev12_threshold_tuning",
        )
        all_rows.extend(m_rows)
        all_tuning.update(m_tuning)
        model_stats[model_id] = m_stats

    # Write retrieval.csv
    fieldnames = [
        "model_id", "retriever", "split", "query_id",
        "relevant_count", "recall_at_5", "reciprocal_rank",
        "top_score", "abstention_threshold", "abstained",
        "should_abstain", "status", "top5_chunk_ids",
    ]
    with (RESULTS / "retrieval.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    # Write retrieval_summary.csv
    write_retrieval_summary(all_rows, questions, split="dev")
    write_abstention_tuning_csv(all_tuning)
    write_run_metadata(model_stats)


def compute_summary_rows(
    all_rows: list[dict],
    questions: list[dict],
    split: str = "dev",
) -> list[dict]:
    """Compute summary metrics with Wilson 95% confidence intervals."""
    answerable_ids = {q["id"] for q in questions if q["answerable"]}
    groups: dict[tuple, list[dict]] = {}
    for row in all_rows:
        key = (row["model_id"], row["retriever"])
        groups.setdefault(key, []).append(row)

    rows = []
    for (model_id, retriever), group_rows in sorted(groups.items()):
        answerable_rows = [r for r in group_rows if r["query_id"] in answerable_ids]
        n_answerable = len(answerable_rows)
        n_unanswerable = len(group_rows) - n_answerable
        hits = sum(
            1 for r in answerable_rows
            if r["recall_at_5"] != "" and float(r["recall_at_5"]) > 0
        )
        total_recall = sum(
            float(r["recall_at_5"]) for r in answerable_rows
            if r["recall_at_5"] != ""
        )
        total_rr = sum(
            float(r["reciprocal_rank"]) for r in answerable_rows
            if r["reciprocal_rank"] != ""
        )
        recall_at_5 = total_recall / n_answerable if n_answerable else 0.0
        mrr = total_rr / n_answerable if n_answerable else 0.0
        lo, hi = wilson_ci(hits, n_answerable)
        rows.append({
            "model_id": model_id,
            "retriever": retriever,
            "split": split,
            "n_answerable": n_answerable,
            "n_unanswerable": n_unanswerable,
            "recall_at_5_hits": hits,
            "recall_at_5": round(recall_at_5, 6),
            "mrr": round(mrr, 6),
            "wilson_lower_95": round(lo, 6),
            "wilson_upper_95": round(hi, 6),
        })
    return rows


def write_retrieval_summary(
    all_rows: list[dict],
    questions: list[dict],
    split: str = "dev",
) -> None:
    path = RESULTS / "retrieval_summary.csv"
    fieldnames = [
        "model_id", "retriever", "split",
        "n_answerable", "n_unanswerable",
        "recall_at_5_hits", "recall_at_5", "mrr",
        "wilson_lower_95", "wilson_upper_95",
    ]
    rows = compute_summary_rows(all_rows, questions, split=split)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run compliance development-set retrieval evaluation."
    )
    parser.add_argument(
        "--split",
        choices=["dev", "test"],
        default="dev",
        help="Evaluation split to run. Must be 'dev'. The 'test' split is held out.",
    )
    parser.add_argument(
        "--regenerate-metadata-only",
        action="store_true",
        help="Regenerate run_metadata.csv and abstention_tuning.csv without re-encoding.",
    )
    args = parser.parse_args()

    if args.split == "test":
        sys.exit("Error: test split is strictly held out; refusing to run test split.")

    if args.regenerate_metadata_only:
        regenerate_metadata_and_tuning_only()
        return

    run_dev_evaluation()


if __name__ == "__main__":
    main()
