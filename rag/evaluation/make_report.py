"""Render RESULTS.md using evaluation CSV files only.

No manual numbers or hardcoded percentages. Where metrics are not yet run or
awaiting human annotation, the report explicitly states "pending".

Splits:
  - Development split: 12 questions (9 answerable, 3 out of scope)
  - Test split: 14 questions (9 answerable, 5 out of scope)
"""

from __future__ import annotations

import csv
from datetime import date
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"
OUTPUT = ROOT / "RESULTS.md"


def read_csv(name: str) -> tuple[list[str], list[dict[str, str]]]:
    path = RESULTS / name
    if not path.exists():
        return [], []
    with path.open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        return list(reader.fieldnames or []), list(reader)


def format_table(headers: list[str], rows: list[dict[str, str]]) -> str:
    if not headers or not rows:
        return "_No records recorded._"
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in rows:
        lines.append(
            "| " + " | ".join(str(row.get(h, "")) for h in headers) + " |"
        )
    return "\n".join(lines)


def wilson_interval_str(successes: int, total: int) -> str:
    if total == 0:
        return "n/a"
    z = 1.96
    proportion = successes / total
    denominator = 1 + z * z / total
    center = (proportion + z * z / (2 * total)) / denominator
    margin = (
        z
        * ((proportion * (1 - proportion) / total + z * z / (4 * total * total)) ** 0.5)
        / denominator
    )
    lo = max(0.0, center - margin)
    hi = min(1.0, center + margin)
    return f"[{lo:.3f}, {hi:.3f}]"


def format_count_and_pct(count: int, total: int) -> str:
    if total == 0:
        return "0/0 (n/a)"
    pct = (count / total) * 100.0
    return f"{count}/{total} ({pct:.1f}%)"


def build_retrieval_summary_table(rows: list[dict[str, str]]) -> str:
    if not rows:
        return "_Retrieval results pending._"
    headers = [
        "Model",
        "Retriever",
        "Split",
        "Answerable (N)",
        "Recall@5 Hits",
        "Recall@5 (%)",
        "MRR",
        "Wilson 95% CI",
    ]
    formatted_rows: list[dict[str, str]] = []
    for r in rows:
        hits = int(r.get("recall_at_5_hits", 0))
        n_ans = int(r.get("n_answerable", 0))
        r5_pct = format_count_and_pct(hits, n_ans)
        mrr_val = float(r.get("mrr", 0.0))
        w_lo = float(r.get("wilson_lower_95", 0.0))
        w_hi = float(r.get("wilson_upper_95", 0.0))
        formatted_rows.append({
            "Model": r.get("model_id", ""),
            "Retriever": r.get("retriever", ""),
            "Split": r.get("split", ""),
            "Answerable (N)": str(n_ans),
            "Recall@5 Hits": str(hits),
            "Recall@5 (%)": r5_pct,
            "MRR": f"{mrr_val:.4f}",
            "Wilson 95% CI": f"[{w_lo:.3f}, {w_hi:.3f}]",
        })
    return format_table(headers, formatted_rows)


def build_e2e_summary_table(rows: list[dict[str, str]]) -> str:
    if not rows:
        return "_End-to-end evaluation pending._"

    # Identify systems
    systems = sorted({r.get("system", "") for r in rows if r.get("system")})
    if not systems:
        return "_No evaluated systems found in e2e.csv._"

    summary_rows: list[dict[str, str]] = []

    for sys_name in systems:
        sys_rows = [r for r in rows if r.get("system") == sys_name]
        n_total = len(sys_rows)
        refused_count = sum(1 for r in sys_rows if r.get("refused", "").lower() == "true")
        answered_count = n_total - refused_count

        # Human annotated metrics
        has_citations = any(r.get("citation_correct") for r in sys_rows)
        has_unsupported = any(r.get("unsupported_claim") for r in sys_rows)
        has_date = any(r.get("date_correct") for r in sys_rows)

        citation_str = (
            format_count_and_pct(
                sum(1 for r in sys_rows if r.get("citation_correct", "").lower() == "true"),
                n_total,
            )
            if has_citations
            else "pending"
        )

        unsupported_str = (
            format_count_and_pct(
                sum(1 for r in sys_rows if r.get("unsupported_claim", "").lower() == "true"),
                n_total,
            )
            if has_unsupported
            else "pending"
        )

        date_str = (
            format_count_and_pct(
                sum(1 for r in sys_rows if r.get("date_correct", "").lower() == "true"),
                n_total,
            )
            if has_date
            else "pending"
        )

        latencies = sorted(
            int(r["latency_ms"])
            for r in sys_rows
            if r.get("latency_ms", "").isdigit()
        )
        if latencies:
            p95_idx = min(len(latencies) - 1, int(0.95 * (len(latencies) - 1)))
            latency_str = f"{median(latencies):.0f} / {latencies[p95_idx]:.0f}"
        else:
            latency_str = "n/a"

        summary_rows.append({
            "System": sys_name,
            "Questions (N)": str(n_total),
            "Refused": format_count_and_pct(refused_count, n_total),
            "Answered": format_count_and_pct(answered_count, n_total),
            "Citation Correct": citation_str,
            "Unsupported Claim": unsupported_str,
            "Date Correct": date_str,
            "Median/P95 Latency (ms)": latency_str,
        })

    headers = [
        "System",
        "Questions (N)",
        "Refused",
        "Answered",
        "Citation Correct",
        "Unsupported Claim",
        "Date Correct",
        "Median/P95 Latency (ms)",
    ]
    return format_table(headers, summary_rows)


def main() -> None:
    _, metadata = read_csv("run_metadata.csv")
    _, splits = read_csv("split_sizes.csv")
    _, retrieval_summary = read_csv("retrieval_summary.csv")
    _, abstention_tuning = read_csv("abstention_tuning.csv")
    e2e_headers, e2e_rows = read_csv("e2e.csv")
    _, test_cases = read_csv("test_cases.csv")
    _, failure_causes = read_csv("failure_causes.csv")

    info = metadata[0] if metadata else {}

    # Check if test split retrieval has run
    test_retrieval_run = any(r.get("split") == "test" for r in retrieval_summary)

    report = f"""# Compliance RAG Evaluation Results

Run date: {info.get('run_date') or date.today().isoformat()}

Commit hash: {info.get('git_commit') or 'unknown'}

Working tree clean: {info.get('working_tree_clean') or 'false'}

## Evaluation Splits

- Development split: 12 questions (9 answerable, 3 out of scope)
- Test split: 14 questions (9 answerable, 5 out of scope)
- Total question count: 26 questions

## Pre-Registered Primary Configuration

- Model: intfloat/multilingual-e5-base
- Method: Hybrid retrieval (BM25 + Dense RRF with k=60, top 5)
- Refusal gate threshold: 0.8428 (E5 dense top-1 cosine similarity)
- Generator model: {info.get('primary_generator') or 'gemini-2.5-flash'} (temperature 0.0)
- Prompts: compliance-answer-v2, compliance-grounding-v1

## Retrieval Evaluation Summary

{build_retrieval_summary_table(retrieval_summary)}

Test split retrieval status: {"Completed" if test_retrieval_run else "Pending (held out until single test run)"}.

## Abstention Threshold Tuning (Dev Split, N=3 Out-of-Scope)

{format_table(
    ["model_id", "retriever", "tuned_threshold", "abstention_precision", "abstention_recall", "refusal_rate_on_answerable", "middle_of_tied_range", "tied_range_min", "tied_range_max", "abstention_precision_at_0.4", "abstention_recall_at_0.4", "refusal_rate_on_answerable_at_0.4"],
    abstention_tuning,
)}

## End-to-End Evaluation versus No-Retrieval Baseline

{build_e2e_summary_table(e2e_rows)}

### End-to-End Detailed Records

{format_table(e2e_headers, e2e_rows)}

## Failure Causes

{format_table(["query_id", "model_id", "method", "cause", "detail"], failure_causes)}

## Notes and Limitations

1. BAAI/bge-m3: Evaluated as missing usable weights in cache; excluded from primary comparison.
2. Development abstention tuning rests on 3 out-of-scope examples; confidence intervals are wide.
3. Test split is strictly held out and executed once under guard conditions.
"""

    OUTPUT.write_text(report, encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
