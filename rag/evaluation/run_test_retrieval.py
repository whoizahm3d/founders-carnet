"""Held-out test split retrieval evaluation harness.

Runs all six configurations (MPNet and multilingual-e5-base across dense, BM25,
and hybrid RRF k=60) on the held-out test questions (9 answerable, 5 unanswerable).

Normal mode (--split test):
  Appends test rows to rag/evaluation/results/retrieval.csv and summary metrics
  with Wilson 95% confidence intervals to rag/evaluation/results/retrieval_summary.csv.
  Guards enforced:
    1. Git working tree must be clean for .py code under rag/ and backend/.
    2. rag/evaluation/results/test_run_lock.json must not exist.
    3. --confirm-test-run flag must be explicitly passed.

Rehearse mode (--rehearse):
  Runs the exact same code path on the DEV split.
  Writes output to a temporary directory only; never touches results/.
  No lock is created or checked. Safe to run at any time.

Usage:
  python rag/evaluation/run_test_retrieval.py --confirm-test-run
  python rag/evaluation/run_test_retrieval.py --rehearse
"""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
import tempfile
from datetime import date
from pathlib import Path
from types import SimpleNamespace

# Add repository root to sys.path
_REPO = Path(__file__).resolve().parents[2]
if str(_REPO) not in sys.path:
    sys.path.insert(0, str(_REPO))

from rag.compliance.chunking import split_chunks_for_model
from rag.compliance.retrieve import RetrievedChunk, bm25, hybrid
from rag.evaluation.guards import check_test_run_guards, write_test_run_lock
from rag.evaluation.run_dev_retrieval import (
    MODEL_IDS,
    canonical_id,
    compute_summary_rows,
    load_corpus_chunks,
    load_dev_questions,
    recall_mrr,
    run_retrieval_for_model,
    wilson_ci as wilson_interval,
)

RESULTS = Path(__file__).resolve().parent / "results"
LOCK_FILE = RESULTS / "test_run_lock.json"
RETRIEVAL_CSV = RESULTS / "retrieval.csv"
SUMMARY_CSV = RESULTS / "retrieval_summary.csv"


def load_test_questions() -> list[dict]:
    path = Path(__file__).parent / "gold_questions.jsonl"
    questions = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        q = json.loads(line)
        if q.get("split") == "test":
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


def load_abstention_thresholds() -> dict[tuple[str, str], float]:
    """Load tuned thresholds from dev abstention tuning CSV."""
    tuning_csv = RESULTS / "abstention_tuning.csv"
    thresholds = {}
    if tuning_csv.exists():
        with tuning_csv.open(encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                key = (row["model_id"], row["retriever"])
                thresholds[key] = float(row["tuned_threshold"])
    return thresholds


def evaluate_test_retrieval(
    confirm_test_run: bool = False,
    rehearse: bool = False,
) -> None:
    """Run all six retrieval configurations.

    Parameters
    ----------
    confirm_test_run:
        Must be True when running against the held-out test split.
    rehearse:
        When True, runs against the dev split and writes only to a temp
        directory. No lock is created or checked. Safe to run repeatedly.
    """
    if rehearse and confirm_test_run:
        raise ValueError("--rehearse and --confirm-test-run are mutually exclusive.")

    if rehearse:
        # Dev split: load dev questions, write to temp dir, no guards.
        questions = load_dev_questions()
        split_label = "dev"
        expected_answerable = 9
        expected_unanswerable = 3
        expected_total = 12
        lock_target = None
        out_dir = Path(tempfile.mkdtemp(prefix="run_test_retrieval_rehearse_"))
        print(f"Rehearse mode: running on dev split, output to {out_dir}")
    else:
        # Normal test mode: enforce all guards.
        check_test_run_guards(LOCK_FILE, confirm_test_run, repo_root=_REPO)
        questions = load_test_questions()
        split_label = "test"
        expected_answerable = 9
        expected_unanswerable = 5
        expected_total = 14
        lock_target = LOCK_FILE
        out_dir = None  # will append to production CSVs

    total_found = len(questions)
    if total_found != expected_total:
        raise ValueError(
            f"Expected exactly {expected_total} {split_label} questions, "
            f"found {total_found}"
        )

    base_chunks = load_corpus_chunks()
    thresholds = load_abstention_thresholds()

    retrieval_rows: list[dict] = []

    for model_id in MODEL_IDS:
        print(f"Evaluating {split_label} split on {model_id}...")
        thresh_for_model = {
            r: thresholds.get((model_id, r), 0.4)
            for r in ("dense", "bm25", "hybrid")
        }
        m_rows, _, _ = run_retrieval_for_model(
            model_id=model_id,
            questions=questions,
            base_chunks=base_chunks,
            thresholds=thresh_for_model,
            split=split_label,
            status="rehearse" if rehearse else "test_run",
        )
        retrieval_rows.extend(m_rows)

    summary_rows = compute_summary_rows(retrieval_rows, questions, split=split_label)

    # All six configurations finished. Write output atomically.
    _write_rows(retrieval_rows, summary_rows, rehearse=rehearse, out_dir=out_dir)

    if lock_target is not None:
        write_test_run_lock(
            lock_target,
            run_type="test_retrieval",
            metadata={
                "n_questions": total_found,
                "n_answerable": expected_answerable,
                "n_unanswerable": expected_unanswerable,
                "models": list(MODEL_IDS),
            },
            repo_root=_REPO,
        )

    if rehearse:
        _print_summary_table(summary_rows)
        print(f"Rehearse run complete. Output written to: {out_dir}")
    else:
        print("Test retrieval evaluation completed and lock written.")

    return summary_rows


def _print_summary_table(summary_rows: list[dict]) -> None:
    """Print a formatted summary table to stdout for quick comparison."""
    header = f"{'model':<60} {'retriever':<10} {'Recall@5':<12} {'MRR':<10}"
    print()
    print(header)
    print("-" * len(header))
    for row in summary_rows:
        model = row["model_id"]
        ret = row["retriever"]
        hits = row["recall_at_5_hits"]
        n_ans = row["n_answerable"]
        mrr = f"{float(row['mrr']):.6f}"
        print(f"{model:<60} {ret:<10} {hits}/{n_ans:<10} {mrr:<10}")
    print()


def _write_rows(
    retrieval_rows: list[dict],
    summary_rows: list[dict],
    rehearse: bool,
    out_dir: Path | None,
) -> None:
    """Write retrieval and summary rows.

    In rehearse mode, writes to out_dir exclusively; never touches results/.
    In test mode, appends to production CSVs using a temp-then-move strategy
    so a failure partway through never leaves partial rows in retrieval.csv.
    """
    retrieval_fieldnames = [
        "model_id", "retriever", "split", "query_id", "relevant_count",
        "recall_at_5", "reciprocal_rank", "top_score",
        "abstention_threshold", "abstained", "should_abstain",
        "status", "top5_chunk_ids",
    ]
    summary_fieldnames = [
        "model_id", "retriever", "split", "n_answerable",
        "n_unanswerable", "recall_at_5_hits", "recall_at_5",
        "mrr", "wilson_lower_95", "wilson_upper_95",
    ]

    if rehearse:
        # Write directly to the temp directory. Never touches results/.
        _write_csv(out_dir / "retrieval.csv", retrieval_rows, retrieval_fieldnames, mode="w")
        _write_csv(out_dir / "retrieval_summary.csv", summary_rows, summary_fieldnames, mode="w")
        return

    # Test mode: stage rows in temp files, then move into place atomically.
    # This guarantees that a crash during writing never leaves partial test
    # rows appended to the production CSV.
    tmp_dir = Path(tempfile.mkdtemp(prefix="run_test_retrieval_stage_"))
    try:
        tmp_retrieval = tmp_dir / "retrieval_test_rows.csv"
        tmp_summary = tmp_dir / "retrieval_summary_test_rows.csv"

        _write_csv(tmp_retrieval, retrieval_rows, retrieval_fieldnames, mode="w")
        _write_csv(tmp_summary, summary_rows, summary_fieldnames, mode="w")

        # Append staged rows to production CSVs only after both temp files
        # have been successfully written.
        _append_csv(RETRIEVAL_CSV, tmp_retrieval)
        _append_csv(SUMMARY_CSV, tmp_summary)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _write_csv(path: Path, rows: list[dict], fieldnames: list[str], mode: str) -> None:
    with path.open(mode, encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if mode == "w":
            writer.writeheader()
        for row in rows:
            writer.writerow(row)


def _append_csv(dest: Path, src: Path) -> None:
    """Append every data row from src (skipping its header) to dest."""
    with src.open(encoding="utf-8", newline="") as s:
        reader = csv.reader(s)
        next(reader, None)  # skip header
        rows = list(reader)
    with dest.open("a", encoding="utf-8", newline="") as d:
        writer = csv.writer(d)
        for row in rows:
            writer.writerow(row)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run compliance retrieval evaluation on the held-out test split."
    )
    parser.add_argument(
        "--confirm-test-run",
        action="store_true",
        help="Explicit confirmation required to run the held-out test split.",
    )
    parser.add_argument(
        "--rehearse",
        action="store_true",
        help=(
            "Run the full evaluation code path on the DEV split. "
            "Output is written to a temp directory only. "
            "No lock is created or checked."
        ),
    )
    args = parser.parse_args()

    evaluate_test_retrieval(
        confirm_test_run=args.confirm_test_run,
        rehearse=args.rehearse,
    )


if __name__ == "__main__":
    main()
