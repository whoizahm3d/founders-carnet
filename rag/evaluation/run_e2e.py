"""End-to-end evaluation harness for the primary compliance configuration.

Compares:
  1. Full pipeline:
     - Primary retrieval: intfloat/multilingual-e5-base, hybrid (RRF k=60), top 5.
     - Refusal gate: Cosine similarity threshold of 0.8428 on E5 dense top-1 score.
     - Grounded generation via LLM Gateway (compliance-answer-v2, temperature 0.0).
     - Rule checks: valid citation within retrieved set, numeric/date claims supported,
       and effective date presence.
     - LLM grounding validator (compliance-grounding-v1).
  2. No-retrieval baseline:
     - Same generator model at temperature 0.0 without retrieved passages.

Outputs:
  rag/evaluation/results/e2e.csv
  Columns:
    id, system, answer_text, cited_chunk_ids, refused, rule_check_result,
    validator_result, latency_ms, citation_correct, unsupported_claim,
    date_correct, failure_cause, status

Guards enforced on --split test:
  1. Git working tree clean for .py code under rag/ and backend/.
  2. rag/evaluation/results/e2e_test_run_lock.json must not exist.
  3. --confirm-test-run flag must be explicitly passed.

Usage:
  python rag/evaluation/run_e2e.py --split dev --provider fake
  python rag/evaluation/run_e2e.py --split test --provider fake --confirm-test-run
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import re
import sys
import tempfile
import time
from collections.abc import Sequence
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import numpy as np

# Add repository root and backend to sys.path
_REPO = Path(__file__).resolve().parents[2]
if str(_REPO) not in sys.path:
    sys.path.insert(0, str(_REPO))
_BACKEND = _REPO / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.services.compliance_assistant import (
    AnswerDraft,
    GroundingValidation,
    _numeric_claims_are_supported,
)
from rag.compliance.chunking import split_chunks_for_model
from rag.compliance.retrieve import RetrievedChunk, bm25, hybrid
from rag.evaluation.guards import check_test_run_guards, write_test_run_lock
from rag.evaluation.run_dev_retrieval import (
    canonical_id,
    chunk_token_limit,
    encode_passages,
    encode_query,
    load_corpus_chunks,
    load_model,
    numpy_dense,
)

RESULTS = Path(__file__).resolve().parent / "results"
RESULTS.mkdir(parents=True, exist_ok=True)
E2E_LOCK_FILE = RESULTS / "e2e_test_run_lock.json"
E2E_CSV = RESULTS / "e2e.csv"

# Pre-registered configuration constants
DEFAULT_MODEL_ID = "gemini-2.5-flash"
ANSWER_PROMPT_VERSION = "compliance-answer-v2"
VALIDATION_PROMPT_VERSION = "compliance-grounding-v1"
RETRIEVAL_MODEL_ID = "intfloat/multilingual-e5-base"
PRIMARY_ABSTENTION_THRESHOLD = 0.8428
PRIMARY_TOP_K = 5
RRF_K = 60

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------

class FakeAnswerGateway:
    """Deterministic, local test gateway with no network dependencies."""

    def __init__(
        self,
        *,
        prompt_version: str = f"{ANSWER_PROMPT_VERSION}+{VALIDATION_PROMPT_VERSION}",
    ) -> None:
        self.prompt_version = prompt_version

    def generate_answer(
        self,
        question: str,
        passages: Sequence[RetrievedChunk],
    ) -> AnswerDraft:
        if not passages:
            return AnswerDraft(
                answer=(
                    "According to parametric knowledge, business registrations and tax filings "
                    "in Pakistan are administered through SECP and FBR."
                ),
                citation_chunk_ids=[],
                abstain=False,
            )

        top_passage = passages[0]
        chunk_text = top_passage.chunk.text.strip().replace("\n", " ")
        cid = getattr(top_passage.chunk, "chunk_id", getattr(top_passage.chunk, "id", ""))
        # Build answer referencing top passage content
        sample_words = chunk_text[:200]
        answer_text = f"Based on official documentation: {sample_words}"
        return AnswerDraft(
            answer=answer_text,
            citation_chunk_ids=[cid] if cid else [],
            abstain=False,
        )

    def validate_answer(
        self,
        question: str,
        answer: str,
        passages: Sequence[RetrievedChunk],
    ) -> GroundingValidation:
        # Fake validator considers generated grounded answers supported
        return GroundingValidation(is_supported=True, unsupported_claims=[])


class GeminiAnswerGatewayWrapper:
    """Wrapper around GeminiGateway enforcing strict quota and error policies."""

    def __init__(
        self,
        *,
        model_name: str,
        cache_dir: Path,
    ) -> None:
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is required when using --provider gemini."
            )

        from backend.app.services.llm_cache import StructuredResponseDiskCache
        from backend.app.services.llm_gateway import GeminiGateway

        disk_cache = StructuredResponseDiskCache(cache_dir=cache_dir)
        # Note: fallback_model is strictly None to prevent silent model switching.
        self._gateway = GeminiGateway(
            api_key=api_key,
            model_name=model_name,
            fallback_model=None,
            cache=disk_cache,
        )
        self.prompt_version = self._gateway.prompt_version

    def generate_answer(
        self,
        question: str,
        passages: Sequence[RetrievedChunk],
    ) -> AnswerDraft:
        try:
            return self._gateway.generate_answer(question, passages)
        except Exception as exc:
            msg = str(exc).lower()
            if "429" in msg or "quota" in msg or "resource_exhausted" in msg:
                raise RuntimeError(
                    f"Gemini API quota exhausted during answer generation: {exc}. "
                    "Stopping run without silent fallback."
                ) from exc
            raise

    def validate_answer(
        self,
        question: str,
        answer: str,
        passages: Sequence[RetrievedChunk],
    ) -> GroundingValidation:
        try:
            return self._gateway.validate_answer(question, answer, passages)
        except Exception as exc:
            msg = str(exc).lower()
            if "429" in msg or "quota" in msg or "resource_exhausted" in msg:
                raise RuntimeError(
                    f"Gemini API quota exhausted during answer validation: {exc}. "
                    "Stopping run without silent fallback."
                ) from exc
            raise


# ---------------------------------------------------------------------------
# Question and data loading
# ---------------------------------------------------------------------------

def load_questions_by_split(split_name: str) -> list[dict]:
    path = Path(__file__).parent / "gold_questions.jsonl"
    questions = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        q = json.loads(line)
        if q.get("split") == split_name:
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
                "split": split_name,
            })
    return questions


# ---------------------------------------------------------------------------
# Pipeline execution
# ---------------------------------------------------------------------------

def run_evaluation(
    *,
    split_name: str,
    provider: str,
    confirm_test_run: bool,
    model_id: str,
    answer_prompt_version: str,
    validation_prompt_version: str,
    abstention_threshold: float,
    top_k: int,
    out_dir: Path | None = None,
) -> list[dict[str, Any]]:
    # 1. Enforce test guard if running test split
    if split_name == "test":
        check_test_run_guards(E2E_LOCK_FILE, confirm_test_run, repo_root=_REPO)

    # 2. Initialize provider gateway
    if provider == "fake":
        gateway = FakeAnswerGateway(
            prompt_version=f"{answer_prompt_version}+{validation_prompt_version}"
        )
    elif provider == "gemini":
        cache_path = _REPO / "rag" / "cache" / "llm"
        gateway = GeminiAnswerGatewayWrapper(
            model_name=model_id,
            cache_dir=cache_path,
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")

    # 3. Load questions and corpus
    questions = load_questions_by_split(split_name)
    if split_name == "dev" and len(questions) != 12:
        raise ValueError(f"Expected 12 dev questions, got {len(questions)}")
    if split_name == "test" and len(questions) != 14:
        raise ValueError(f"Expected 14 test questions, got {len(questions)}")

    print(
        f"Starting e2e run: split={split_name}, provider={provider}, "
        f"model={model_id}, threshold={abstention_threshold}, questions={len(questions)}"
    )

    # 4. Load retrieval components
    base_chunks = load_corpus_chunks()
    model = load_model(RETRIEVAL_MODEL_ID)
    limit = chunk_token_limit(RETRIEVAL_MODEL_ID, model)
    passages = split_chunks_for_model(base_chunks, model.tokenizer, limit)
    passage_texts = [p.text for p in passages]
    passage_embeddings = encode_passages(model, RETRIEVAL_MODEL_ID, passage_texts)

    embedded = tuple(
        SimpleNamespace(
            id=i,
            chunk_id=p.chunk_id,
            text=p.text,
            embedding=emb,
            section=getattr(p, "section", None),
            document=getattr(p, "document", None),
            effective_date=getattr(p, "effective_date", None),
        )
        for i, (p, emb) in enumerate(zip(passages, passage_embeddings))
    )

    query_texts = [q["question"] for q in questions]
    query_vectors = encode_query(model, RETRIEVAL_MODEL_ID, query_texts)

    results: list[dict[str, Any]] = []

    for q, qvec in zip(questions, query_vectors):
        q_id = q["id"]
        question_text = q["question"]

        # -------------------------------------------------------------------
        # System 1: full_pipeline
        # -------------------------------------------------------------------
        pipe_start = time.perf_counter()

        # Compute dense similarity for refusal gate
        dense_results = numpy_dense(qvec, embedded, top_k=1)
        top_dense_cosine = dense_results[0].score if dense_results else 0.0

        if top_dense_cosine < abstention_threshold:
            # Refusal gate triggers before generation
            pipe_latency_ms = int((time.perf_counter() - pipe_start) * 1000)
            results.append({
                "id": q_id,
                "system": "full_pipeline",
                "answer_text": "I do not have a supported answer in the indexed corpus.",
                "cited_chunk_ids": "",
                "refused": "true",
                "rule_check_result": "refused_at_gate",
                "validator_result": "refused_at_gate",
                "latency_ms": str(pipe_latency_ms),
                "citation_correct": "",
                "unsupported_claim": "",
                "date_correct": "",
                "failure_cause": "low_similarity_gate",
                "status": "abstained",
            })
        else:
            # Run hybrid retrieval
            retrieved = hybrid(
                question_text,
                qvec,
                embedded,
                top_k=top_k,
                rrf_k=RRF_K,
                dense_retriever=numpy_dense,
            )

            # Generate answer
            draft = gateway.generate_answer(question_text, retrieved)

            if draft.abstain or not draft.answer.strip():
                pipe_latency_ms = int((time.perf_counter() - pipe_start) * 1000)
                results.append({
                    "id": q_id,
                    "system": "full_pipeline",
                    "answer_text": draft.answer or "",
                    "cited_chunk_ids": "",
                    "refused": "true",
                    "rule_check_result": "not_run",
                    "validator_result": "not_run",
                    "latency_ms": str(pipe_latency_ms),
                    "citation_correct": "",
                    "unsupported_claim": "",
                    "date_correct": "",
                    "failure_cause": "model_abstained",
                    "status": "abstained",
                })
            else:
                # Check citations
                retrieved_by_id = {
                    r.chunk.chunk_id: r for r in retrieved if hasattr(r.chunk, "chunk_id")
                }
                retrieved_by_canonical = {
                    canonical_id(r.chunk.chunk_id): r
                    for r in retrieved
                    if hasattr(r.chunk, "chunk_id")
                }

                raw_cited_ids = tuple(dict.fromkeys(draft.citation_chunk_ids))
                valid_cited_passages: list[RetrievedChunk] = []
                citation_valid = bool(raw_cited_ids)

                for cid in raw_cited_ids:
                    if cid in retrieved_by_id:
                        valid_cited_passages.append(retrieved_by_id[cid])
                    elif cid in retrieved_by_canonical:
                        valid_cited_passages.append(retrieved_by_canonical[cid])
                    else:
                        citation_valid = False
                        break

                parent_cited_ids = tuple(
                    dict.fromkeys(canonical_id(cid) for cid in raw_cited_ids)
                )

                if not citation_valid:
                    pipe_latency_ms = int((time.perf_counter() - pipe_start) * 1000)
                    results.append({
                        "id": q_id,
                        "system": "full_pipeline",
                        "answer_text": draft.answer,
                        "cited_chunk_ids": ";".join(parent_cited_ids),
                        "refused": "true",
                        "rule_check_result": "invalid_citation",
                        "validator_result": "not_run",
                        "latency_ms": str(pipe_latency_ms),
                        "citation_correct": "",
                        "unsupported_claim": "",
                        "date_correct": "",
                        "failure_cause": "invalid_citation",
                        "status": "abstained",
                    })
                elif not _numeric_claims_are_supported(draft.answer, valid_cited_passages):
                    pipe_latency_ms = int((time.perf_counter() - pipe_start) * 1000)
                    results.append({
                        "id": q_id,
                        "system": "full_pipeline",
                        "answer_text": draft.answer,
                        "cited_chunk_ids": ";".join(parent_cited_ids),
                        "refused": "true",
                        "rule_check_result": "unsupported_number_or_date",
                        "validator_result": "not_run",
                        "latency_ms": str(pipe_latency_ms),
                        "citation_correct": "",
                        "unsupported_claim": "",
                        "date_correct": "",
                        "failure_cause": "unsupported_number_or_date",
                        "status": "abstained",
                    })
                elif any(
                    not (
                        getattr(p.chunk, "effective_date", None)
                        or getattr(getattr(p.chunk, "document", None), "effective_date", None)
                    )
                    for p in valid_cited_passages
                ):
                    pipe_latency_ms = int((time.perf_counter() - pipe_start) * 1000)
                    results.append({
                        "id": q_id,
                        "system": "full_pipeline",
                        "answer_text": draft.answer,
                        "cited_chunk_ids": ";".join(parent_cited_ids),
                        "refused": "true",
                        "rule_check_result": "missing_effective_date",
                        "validator_result": "not_run",
                        "latency_ms": str(pipe_latency_ms),
                        "citation_correct": "",
                        "unsupported_claim": "",
                        "date_correct": "",
                        "failure_cause": "missing_effective_date",
                        "status": "abstained",
                    })
                else:
                    # Rule checks passed, execute grounding validation
                    validation = gateway.validate_answer(
                        question_text, draft.answer, valid_cited_passages
                    )
                    pipe_latency_ms = int((time.perf_counter() - pipe_start) * 1000)

                    if not validation.is_supported:
                        results.append({
                            "id": q_id,
                            "system": "full_pipeline",
                            "answer_text": draft.answer,
                            "cited_chunk_ids": ";".join(parent_cited_ids),
                            "refused": "true",
                            "rule_check_result": "passed",
                            "validator_result": "validation_failed",
                            "latency_ms": str(pipe_latency_ms),
                            "citation_correct": "",
                            "unsupported_claim": "",
                            "date_correct": "",
                            "failure_cause": "validation_failed",
                            "status": "abstained",
                        })
                    else:
                        results.append({
                            "id": q_id,
                            "system": "full_pipeline",
                            "answer_text": draft.answer,
                            "cited_chunk_ids": ";".join(parent_cited_ids),
                            "refused": "false",
                            "rule_check_result": "passed",
                            "validator_result": "passed",
                            "latency_ms": str(pipe_latency_ms),
                            "citation_correct": "",
                            "unsupported_claim": "",
                            "date_correct": "",
                            "failure_cause": "",
                            "status": "answered",
                        })

        # -------------------------------------------------------------------
        # System 2: no_retrieval_baseline
        # -------------------------------------------------------------------
        base_start = time.perf_counter()
        base_draft = gateway.generate_answer(question_text, ())
        base_latency_ms = int((time.perf_counter() - base_start) * 1000)

        results.append({
            "id": q_id,
            "system": "no_retrieval_baseline",
            "answer_text": base_draft.answer,
            "cited_chunk_ids": "",
            "refused": str(base_draft.abstain).lower(),
            "rule_check_result": "no_context",
            "validator_result": "no_context",
            "latency_ms": str(base_latency_ms),
            "citation_correct": "",
            "unsupported_claim": "",
            "date_correct": "",
            "failure_cause": "model_abstained" if base_draft.abstain else "",
            "status": "abstained" if base_draft.abstain else "answered",
        })

    # 5. Determine output CSV path.
    # Fake provider: never write to results/. Use out_dir if given, else a temp dir.
    # Real provider (gemini): write to results/ (or out_dir if given).
    if provider == "fake":
        if out_dir is not None:
            csv_dir = Path(out_dir)
            csv_dir.mkdir(parents=True, exist_ok=True)
        else:
            csv_dir = Path(tempfile.mkdtemp(prefix="run_e2e_fake_"))
            print(f"Fake provider: writing output to temp dir {csv_dir}")
        out_csv = csv_dir / "e2e.csv"
    else:
        if out_dir is not None:
            csv_dir = Path(out_dir)
            csv_dir.mkdir(parents=True, exist_ok=True)
            out_csv = csv_dir / "e2e.csv"
        else:
            out_csv = E2E_CSV

    fieldnames = [
        "id",
        "system",
        "answer_text",
        "cited_chunk_ids",
        "refused",
        "rule_check_result",
        "validator_result",
        "latency_ms",
        "citation_correct",
        "unsupported_claim",
        "date_correct",
        "failure_cause",
        "status",
    ]

    with out_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in results:
            writer.writerow(row)

    print(f"Wrote {len(results)} rows to {out_csv}")

    # 6. If test split was run, write lock file
    if split_name == "test":
        write_test_run_lock(
            E2E_LOCK_FILE,
            run_type="e2e_evaluation",
            metadata={
                "n_questions": len(questions),
                "model_id": model_id,
                "provider": provider,
                "answer_prompt_version": answer_prompt_version,
                "validation_prompt_version": validation_prompt_version,
                "abstention_threshold": abstention_threshold,
            },
            repo_root=_REPO,
        )
        print(f"Wrote test run lock file to {E2E_LOCK_FILE}")

    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run end-to-end compliance evaluation and baseline comparison."
    )
    parser.add_argument(
        "--split",
        default="dev",
        choices=["dev", "test"],
        help="Evaluation split to run (dev or test).",
    )
    parser.add_argument(
        "--provider",
        default="fake",
        choices=["fake", "gemini"],
        help="LLM provider: fake (local, default) or gemini (API key required).",
    )
    parser.add_argument(
        "--confirm-test-run",
        action="store_true",
        help="Explicit confirmation required to run the held-out test split.",
    )
    parser.add_argument(
        "--model-id",
        default=DEFAULT_MODEL_ID,
        help=f"LLM model ID (default: {DEFAULT_MODEL_ID}).",
    )
    parser.add_argument(
        "--answer-prompt-version",
        default=ANSWER_PROMPT_VERSION,
        help=f"Answer prompt version (default: {ANSWER_PROMPT_VERSION}).",
    )
    parser.add_argument(
        "--validation-prompt-version",
        default=VALIDATION_PROMPT_VERSION,
        help=f"Validation prompt version (default: {VALIDATION_PROMPT_VERSION}).",
    )
    parser.add_argument(
        "--abstention-threshold",
        type=float,
        default=PRIMARY_ABSTENTION_THRESHOLD,
        help=f"Dense cosine similarity refusal threshold (default: {PRIMARY_ABSTENTION_THRESHOLD}).",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=PRIMARY_TOP_K,
        help=f"Number of retrieved passages (default: {PRIMARY_TOP_K}).",
    )
    parser.add_argument(
        "--out-dir",
        default=None,
        help=(
            "Directory to write e2e.csv into. "
            "For --provider fake this defaults to a temp directory. "
            "For --provider gemini this defaults to rag/evaluation/results/."
        ),
    )
    args = parser.parse_args()

    run_evaluation(
        split_name=args.split,
        provider=args.provider,
        confirm_test_run=args.confirm_test_run,
        model_id=args.model_id,
        answer_prompt_version=args.answer_prompt_version,
        validation_prompt_version=args.validation_prompt_version,
        abstention_threshold=args.abstention_threshold,
        top_k=args.top_k,
        out_dir=Path(args.out_dir) if args.out_dir else None,
    )


if __name__ == "__main__":
    main()
