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
import sys
import tempfile
import time
from collections.abc import Sequence
from pathlib import Path
from types import SimpleNamespace
from typing import Any

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
from rag.compliance.ingestion import CorpusDocument, parse_manifest
from rag.compliance.retrieve import (
    RetrievedChunk,
    hybrid,
    refuse_by_dense_top1,
)
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
MANIFEST_PATH = _REPO / "rag" / "corpus_manifest.md"

# Pre-registered configuration constants
DEFAULT_MODEL_ID = "gemini-2.5-flash"
ANSWER_PROMPT_VERSION = "compliance-answer-v2"
VALIDATION_PROMPT_VERSION = "compliance-grounding-v1"
RETRIEVAL_MODEL_ID = "intfloat/multilingual-e5-base"
PRIMARY_ABSTENTION_THRESHOLD = 0.8428
PRIMARY_TOP_K = 5
RRF_K = 60
DEFAULT_CACHE_DIR = Path.home() / ".founders_carnet" / "llm_cache"

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Corpus manifest and evaluation passage adapters
# ---------------------------------------------------------------------------

def load_manifest_documents() -> dict[str, CorpusDocument]:
    """Load corpus manifest indexed by file name."""
    if not MANIFEST_PATH.exists():
        return {}
    return {
        doc.file: doc
        for doc in parse_manifest(MANIFEST_PATH.read_text(encoding="utf-8"))
    }


class EvaluationDocument:
    """Document metadata presented to LLM Gateway and ComplianceAnswerService."""

    def __init__(
        self,
        *,
        title: str,
        issuing_body: str = "",
        effective_date: str | None = None,
        source_url: str | None = None,
        consolidation_date: str | None = None,
        retrieved_at: str | None = None,
        file: str | None = None,
        file_name: str | None = None,
        document_type: str | None = None,
        content_sha256: str | None = None,
        scope_note: str | None = None,
        is_active: bool = True,
    ) -> None:
        self.title = title
        self.document_title = title
        self.issuing_body = issuing_body
        self.effective_date = effective_date
        self.source_url = source_url
        self.consolidation_date = consolidation_date
        self.retrieved_at = retrieved_at
        file_val = file or file_name or ""
        self.file = file_val
        self.file_name = file_val
        self.document_type = document_type or ""
        self.content_sha256 = content_sha256 or ""
        self.scope_note = scope_note or ""
        self.is_active = is_active


class EvaluationChunk:
    """Chunk metadata presenting exact attributes expected by gateway and answer service."""

    def __init__(
        self,
        *,
        chunk_id: str,
        text: str,
        section: str | None,
        page_number: int,
        heading_path: tuple[str, ...],
        effective_date: str | None,
        document: EvaluationDocument,
        id: int | str | None = None,
        source_url: str | None = None,
        document_file: str | None = None,
        embedding: Sequence[float] | None = None,
    ) -> None:
        # Strip continuation suffix for citation
        self.chunk_id = canonical_id(str(chunk_id))
        self.text = text
        self.section = section
        self.page_number = int(page_number)
        self.page = int(page_number)
        self.heading_path = tuple(heading_path)
        self.effective_date = effective_date or document.effective_date
        self.document = document
        self.id = id if id is not None else self.chunk_id
        self.source_url = source_url or document.source_url
        self.document_file = document_file or document.file
        self.embedding = embedding


def build_evaluation_chunk(
    raw_chunk: Any,
    manifest_by_file: dict[str, CorpusDocument] | None = None,
    *,
    index: int | None = None,
    embedding: Sequence[float] | None = None,
) -> EvaluationChunk:
    """Build an EvaluationChunk from raw chunk metadata and manifest."""
    doc_file = (
        getattr(raw_chunk, "document_file", None)
        or getattr(raw_chunk, "file", None)
        or ""
    )
    manifest_doc = manifest_by_file.get(doc_file) if manifest_by_file else None

    raw_doc = getattr(raw_chunk, "document", None)
    title = (
        getattr(raw_chunk, "document_title", None)
        or (manifest_doc.title if manifest_doc else None)
        or (getattr(raw_doc, "title", None) if raw_doc else None)
        or "Unknown Document"
    )
    issuing_body = (
        getattr(raw_chunk, "issuing_body", None)
        or (manifest_doc.issuing_body if manifest_doc else None)
        or (getattr(raw_doc, "issuing_body", None) if raw_doc else None)
        or ""
    )
    effective_date = (
        getattr(raw_chunk, "effective_date", None)
        or (manifest_doc.effective_date if manifest_doc else None)
        or (getattr(raw_doc, "effective_date", None) if raw_doc else None)
    )
    source_url = (
        getattr(raw_chunk, "source_url", None)
        or (manifest_doc.source_url if manifest_doc else None)
        or (getattr(raw_doc, "source_url", None) if raw_doc else None)
    )
    consolidation_date = (
        getattr(raw_chunk, "consolidation_date", None)
        or (manifest_doc.consolidation_date if manifest_doc else None)
        or (getattr(raw_doc, "consolidation_date", None) if raw_doc else None)
    )
    retrieved_at = (
        getattr(raw_chunk, "retrieved_at", None)
        or (manifest_doc.retrieved_at if manifest_doc else None)
        or (getattr(raw_doc, "retrieved_at", None) if raw_doc else None)
    )
    doc_type = (
        getattr(raw_chunk, "document_type", None)
        or (manifest_doc.document_type if manifest_doc else None)
        or (getattr(raw_doc, "document_type", None) if raw_doc else None)
    )
    content_sha256 = (
        getattr(raw_chunk, "source_sha256", None)
        or (manifest_doc.content_sha256 if manifest_doc else None)
        or (getattr(raw_doc, "content_sha256", None) if raw_doc else None)
    )
    scope_note = (
        (manifest_doc.scope_note if manifest_doc else None)
        or (getattr(raw_doc, "scope_note", None) if raw_doc else None)
    )

    doc = EvaluationDocument(
        title=title,
        issuing_body=issuing_body,
        effective_date=effective_date,
        source_url=source_url,
        consolidation_date=consolidation_date,
        retrieved_at=retrieved_at,
        file=doc_file,
        document_type=doc_type,
        content_sha256=content_sha256,
        scope_note=scope_note,
        is_active=manifest_doc.is_active if manifest_doc else True,
    )

    raw_cid = getattr(raw_chunk, "chunk_id", getattr(raw_chunk, "id", "chunk_unknown"))
    text = getattr(raw_chunk, "text", "")
    section = getattr(raw_chunk, "section", None)
    page_num = getattr(raw_chunk, "page_number", getattr(raw_chunk, "page", 1))
    heading_path = getattr(raw_chunk, "heading_path", ()) or ()
    chunk_id_int = index if index is not None else getattr(raw_chunk, "id", raw_cid)
    emb = embedding if embedding is not None else getattr(raw_chunk, "embedding", None)

    return EvaluationChunk(
        chunk_id=raw_cid,
        text=text,
        section=section,
        page_number=page_num,
        heading_path=heading_path,
        effective_date=effective_date,
        document=doc,
        id=chunk_id_int,
        source_url=source_url,
        document_file=doc_file,
        embedding=emb,
    )


def adapt_retrieved_passage(
    passage: RetrievedChunk,
    manifest_by_file: dict[str, CorpusDocument] | None = None,
) -> RetrievedChunk:
    """Adapt a retrieved passage so its chunk presents all attributes expected by the gateway."""
    if isinstance(passage.chunk, EvaluationChunk):
        adapted_chunk = passage.chunk
    else:
        adapted_chunk = build_evaluation_chunk(passage.chunk, manifest_by_file)
    return RetrievedChunk(
        chunk=adapted_chunk,
        similarity=passage.similarity,
        method=passage.method,
    )


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
        cache_dir: Path = DEFAULT_CACHE_DIR,
    ) -> None:
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is required when using --provider gemini."
            )

        from backend.app.services.llm_cache import StructuredResponseDiskCache
        from backend.app.services.llm_gateway import GeminiGateway

        resolved_cache = cache_dir.expanduser().resolve()
        resolved_cache.mkdir(parents=True, exist_ok=True)
        disk_cache = StructuredResponseDiskCache(cache_dir=resolved_cache)
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
    cache_dir: Path = DEFAULT_CACHE_DIR,
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
        resolved_cache = cache_dir.expanduser().resolve()
        resolved_cache.mkdir(parents=True, exist_ok=True)
        gateway = GeminiAnswerGatewayWrapper(
            model_name=model_id,
            cache_dir=resolved_cache,
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
    manifest_by_file = load_manifest_documents()
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
            page_number=getattr(p, "page_number", 1),
            page=getattr(p, "page_number", 1),
            heading_path=getattr(p, "heading_path", ()),
            document_file=getattr(p, "document_file", None),
            source_url=getattr(p, "source_url", None),
            effective_date=getattr(p, "effective_date", None),
            document=build_evaluation_chunk(p, manifest_by_file).document,
            raw_chunk=p,
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

        if refuse_by_dense_top1(top_dense_cosine, abstention_threshold):
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

            # Adapt retrieved passages for gateway prompt builder and answer service
            adapted_retrieved = tuple(
                adapt_retrieved_passage(r, manifest_by_file) for r in retrieved
            )

            # Generate answer
            draft = gateway.generate_answer(question_text, adapted_retrieved)

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
                # Check citations against adapted retrieved passages
                retrieved_by_id = {
                    r.chunk.chunk_id: r
                    for r in adapted_retrieved
                    if hasattr(r.chunk, "chunk_id")
                }
                retrieved_by_canonical = {
                    canonical_id(r.chunk.chunk_id): r
                    for r in adapted_retrieved
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
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=DEFAULT_CACHE_DIR,
        help=f"Private directory for structured LLM response cache (default: {DEFAULT_CACHE_DIR}).",
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
        cache_dir=args.cache_dir,
    )


if __name__ == "__main__":
    main()
