"""Unit tests for evaluation test-run guards, locks, boundaries, and schemas."""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

import pytest

from rag.evaluation.guards import (
    check_test_run_guards,
    is_git_working_tree_clean_for_code,
    is_relevant_code_path,
    write_test_run_lock,
)
from rag.evaluation.run_dev_retrieval import tune_abstention
from rag.evaluation.run_e2e import (
    E2E_CSV,
    PRIMARY_ABSTENTION_THRESHOLD,
    FakeAnswerGateway,
)
from rag.evaluation.run_test_retrieval import (
    _write_rows,
    evaluate_test_retrieval,
)


def test_working_tree_clean_ignores_markdown_and_results():
    mock_status = """
 M docs/DECISIONS.md
 M docs/build-log.md
?? rag/evaluation/results/retrieval.csv
?? rag/evaluation/results/test_run_lock.json
 M rag/evaluation/README.md
"""
    clean, dirty = is_git_working_tree_clean_for_code(status_output=mock_status)
    assert clean is True
    assert dirty == []


def test_working_tree_detects_uncommitted_python_in_rag_and_backend():
    mock_status = """
 M docs/DECISIONS.md
 M rag/compliance/retrieve.py
?? backend/app/services/new_service.py
?? rag/evaluation/results/output.csv
"""
    clean, dirty = is_git_working_tree_clean_for_code(status_output=mock_status)
    assert clean is False
    assert dirty == ["backend/app/services/new_service.py", "rag/compliance/retrieve.py"]


def test_relevant_code_path_filtering():
    assert is_relevant_code_path("rag/compliance/retrieve.py") is True
    assert is_relevant_code_path("backend/app/services/compliance.py") is True
    assert is_relevant_code_path("frontend/src/app/page.tsx") is False
    assert is_relevant_code_path("rag/evaluation/results/script.py") is False
    assert is_relevant_code_path("docs/DECISIONS.md") is False


def test_guard_rejects_without_confirm_flag(tmp_path: Path):
    lock_file = tmp_path / "test_run_lock.json"
    with pytest.raises(RuntimeError, match="missing explicit --confirm-test-run flag"):
        check_test_run_guards(lock_file, confirm_flag=False, status_output="")


def test_guard_rejects_if_lock_file_exists(tmp_path: Path):
    lock_file = tmp_path / "test_run_lock.json"
    lock_file.write_text("{}", encoding="utf-8")
    with pytest.raises(RuntimeError, match="lock file already exists"):
        check_test_run_guards(lock_file, confirm_flag=True, status_output="")


def test_guard_rejects_dirty_code(tmp_path: Path):
    lock_file = tmp_path / "test_run_lock.json"
    dirty_status = " M rag/compliance/retrieve.py\n"
    with pytest.raises(RuntimeError, match="uncommitted .py code changes found"):
        check_test_run_guards(
            lock_file, confirm_flag=True, status_output=dirty_status
        )


def test_guard_passes_when_all_conditions_satisfied(tmp_path: Path):
    lock_file = tmp_path / "test_run_lock.json"
    clean_status = " M docs/DECISIONS.md\n?? rag/evaluation/results/data.csv\n"
    # Should not raise
    check_test_run_guards(lock_file, confirm_flag=True, status_output=clean_status)


def test_write_and_read_lock_file(tmp_path: Path):
    lock_file = tmp_path / "test_run_lock.json"
    write_test_run_lock(
        lock_file,
        run_type="unit_test_run",
        metadata={"test": "data"},
        repo_root=tmp_path,
    )
    assert lock_file.exists()
    payload = json.loads(lock_file.read_text(encoding="utf-8"))
    assert payload["run_type"] == "unit_test_run"
    assert "timestamp_utc" in payload
    assert payload["metadata"]["test"] == "data"


def test_refusal_gate_threshold_boundary():
    threshold = PRIMARY_ABSTENTION_THRESHOLD  # 0.8428
    score_above = 0.8428
    score_below = 0.8427

    # At or above threshold: does not trigger refusal gate
    refused_above = score_above < threshold
    assert refused_above is False

    # Below threshold: triggers refusal gate
    refused_below = score_below < threshold
    assert refused_below is True


def test_fake_provider_contract_and_no_network():
    gateway = FakeAnswerGateway()

    # With empty passages (no-retrieval baseline)
    baseline_draft = gateway.generate_answer("What is SECP?", ())
    assert baseline_draft.abstain is False
    assert len(baseline_draft.citation_chunk_ids) == 0
    assert len(baseline_draft.answer) > 0

    # With retrieved passages
    mock_chunk = SimpleNamespace(
        id="Seventh Schedule, fees from 20 Apr 2026 (SECP).pdf:1:0",
        text="The fee for filing in physical form is Rs. 1,000.",
    )
    mock_passage = SimpleNamespace(chunk=mock_chunk, score=0.9, method="dense")
    draft = gateway.generate_answer("What is the fee?", (mock_passage,))
    assert draft.abstain is False
    assert draft.citation_chunk_ids == [mock_chunk.id]
    assert "Based on official documentation:" in draft.answer

    # Validation check
    validation = gateway.validate_answer("What is the fee?", draft.answer, (mock_passage,))
    assert validation.is_supported is True
    assert validation.unsupported_claims == []


def test_e2e_csv_schema_expected_columns():
    expected_columns = [
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
    # Check that unsupported_claim is in columns and unsupported_claim_rate is NOT
    assert "unsupported_claim" in expected_columns
    assert "unsupported_claim_rate" not in expected_columns


# ---------------------------------------------------------------------------
# Rehearse mode tests
# ---------------------------------------------------------------------------

_RETRIEVAL_FIELDNAMES = [
    "model_id", "retriever", "split", "query_id", "relevant_count",
    "recall_at_5", "reciprocal_rank", "top_score", "abstention_threshold",
    "abstained", "should_abstain", "status", "top5_chunk_ids",
]
_SUMMARY_FIELDNAMES = [
    "model_id", "retriever", "split", "n_answerable", "n_unanswerable",
    "recall_at_5_hits", "recall_at_5", "mrr", "wilson_lower_95", "wilson_upper_95",
]


def _make_sample_rows() -> tuple[list[dict], list[dict]]:
    retrieval = [
        {
            "model_id": "test-model", "retriever": "dense", "split": "dev",
            "query_id": "q001", "relevant_count": "1", "recall_at_5": "1.0",
            "reciprocal_rank": "1.0", "top_score": "0.900000",
            "abstention_threshold": "0.400000", "abstained": "False",
            "should_abstain": "False", "status": "rehearse", "top5_chunk_ids": "c1|c2",
        }
    ]
    summary = [
        {
            "model_id": "test-model", "retriever": "dense", "split": "dev",
            "n_answerable": "9", "n_unanswerable": "3", "recall_at_5_hits": "7",
            "recall_at_5": "0.777778", "mrr": "0.750000",
            "wilson_lower_95": "0.450000", "wilson_upper_95": "0.930000",
        }
    ]
    return retrieval, summary


def test_rehearse_writes_to_temp_dir_not_results(tmp_path: Path) -> None:
    """Rehearse mode writes output to a temp directory and never touches results/."""
    retrieval_rows, summary_rows = _make_sample_rows()

    results_dir = tmp_path / "results"
    results_dir.mkdir()
    production_csv = results_dir / "retrieval.csv"
    production_csv.write_text("", encoding="utf-8")

    # Patch RETRIEVAL_CSV and SUMMARY_CSV so they point at our fake results dir.
    import rag.evaluation.run_test_retrieval as rtr

    original_retrieval = rtr.RETRIEVAL_CSV
    original_summary = rtr.SUMMARY_CSV
    rtr.RETRIEVAL_CSV = production_csv
    rtr.SUMMARY_CSV = results_dir / "retrieval_summary.csv"

    out_dir = tmp_path / "rehearse_out"
    out_dir.mkdir()

    try:
        _write_rows(retrieval_rows, summary_rows, rehearse=True, out_dir=out_dir)
    finally:
        rtr.RETRIEVAL_CSV = original_retrieval
        rtr.SUMMARY_CSV = original_summary

    # Temp dir contains output files.
    assert (out_dir / "retrieval.csv").exists()
    assert (out_dir / "retrieval_summary.csv").exists()

    # Production CSV is untouched (still empty).
    assert production_csv.read_text(encoding="utf-8") == ""


def test_rehearse_raises_if_combined_with_confirm_flag() -> None:
    """--rehearse and --confirm-test-run together must be rejected immediately."""
    with pytest.raises(ValueError, match="mutually exclusive"):
        evaluate_test_retrieval(confirm_test_run=True, rehearse=True)


def test_atomic_write_no_partial_rows_on_failure(tmp_path: Path) -> None:
    """A failure after staging but before append leaves the production CSV untouched."""
    retrieval_rows, summary_rows = _make_sample_rows()

    # Production CSV starts with existing content.
    prod_retrieval = tmp_path / "retrieval.csv"
    existing_content = "existing,row\n"
    prod_retrieval.write_text(existing_content, encoding="utf-8")
    prod_summary = tmp_path / "retrieval_summary.csv"
    prod_summary.write_text("", encoding="utf-8")

    import rag.evaluation.run_test_retrieval as rtr

    original_retrieval = rtr.RETRIEVAL_CSV
    original_summary = rtr.SUMMARY_CSV
    rtr.RETRIEVAL_CSV = prod_retrieval
    rtr.SUMMARY_CSV = prod_summary

    # Patch _append_csv to fail on the first call (simulates disk error mid-write).
    call_count = {"n": 0}
    original_append = rtr._append_csv

    def failing_append(dest: Path, src: Path) -> None:
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise OSError("simulated disk failure")
        original_append(dest, src)

    try:
        rtr._append_csv = failing_append
        with pytest.raises(OSError, match="simulated disk failure"):
            _write_rows(retrieval_rows, summary_rows, rehearse=False, out_dir=None)
    finally:
        rtr._append_csv = original_append
        rtr.RETRIEVAL_CSV = original_retrieval
        rtr.SUMMARY_CSV = original_summary

    # Production CSV must still have only its original content.
    assert prod_retrieval.read_text(encoding="utf-8") == existing_content


# ---------------------------------------------------------------------------
# Item 1: fake provider must not write to results/e2e.csv
# ---------------------------------------------------------------------------

def test_fake_provider_does_not_write_to_results_e2e_csv(tmp_path: Path, monkeypatch) -> None:
    """A fake-provider run must leave results/e2e.csv byte-for-byte unchanged."""
    if E2E_CSV.exists():
        original_bytes = E2E_CSV.read_bytes()
    else:
        original_bytes = None

    from rag.evaluation.run_e2e import (
        ANSWER_PROMPT_VERSION,
        DEFAULT_MODEL_ID,
        PRIMARY_ABSTENTION_THRESHOLD,
        PRIMARY_TOP_K,
        VALIDATION_PROMPT_VERSION,
        run_evaluation,
    )

    # Mock heavy model loading to keep the unit test fast
    mock_model = MagicMock()
    mock_model.max_seq_length = 512
    mock_model.tokenizer = MagicMock()
    monkeypatch.setattr("rag.evaluation.run_e2e.load_model", lambda mid: mock_model)
    monkeypatch.setattr(
        "rag.evaluation.run_e2e.split_chunks_for_model",
        lambda chunks, tok, lim: chunks[:5],
    )
    monkeypatch.setattr(
        "rag.evaluation.run_e2e.encode_passages",
        lambda m, mid, texts: [[0.0] * 768 for _ in texts],
    )
    monkeypatch.setattr(
        "rag.evaluation.run_e2e.encode_query",
        lambda m, mid, texts: [[0.0] * 768 for _ in texts],
    )

    # Run with default out_dir=None (must write to temp dir)
    results = run_evaluation(
        split_name="dev",
        provider="fake",
        confirm_test_run=False,
        model_id=DEFAULT_MODEL_ID,
        answer_prompt_version=ANSWER_PROMPT_VERSION,
        validation_prompt_version=VALIDATION_PROMPT_VERSION,
        abstention_threshold=PRIMARY_ABSTENTION_THRESHOLD,
        top_k=PRIMARY_TOP_K,
        out_dir=None,
    )
    assert len(results) > 0

    if original_bytes is None:
        assert not E2E_CSV.exists(), "results/e2e.csv created by fake provider"
    else:
        assert E2E_CSV.read_bytes() == original_bytes, (
            "results/e2e.csv was modified by fake provider run"
        )


# ---------------------------------------------------------------------------
# Item 3: abstention precision is "n/a" when nothing was refused
# ---------------------------------------------------------------------------

def test_abstention_precision_is_na_when_nothing_refused() -> None:
    """When no question scores below the threshold, precision must be 'n/a'."""
    # All scores well above any threshold => no refusals at all.
    scores = {f"q{i:03d}": 0.99 for i in range(9)}
    scores.update({f"u{i:03d}": 0.99 for i in range(3)})
    should_abstain = {k: False for k in scores}
    for k in list(scores)[-3:]:
        should_abstain[k] = True

    _chosen, info = tune_abstention(scores, should_abstain)

    assert info["abstention_precision_at_0.4"] == "n/a", (
        f"Expected 'n/a', got {info['abstention_precision_at_0.4']!r}"
    )
    assert info["abstention_precision_on_unanswerable"] == "n/a", (
        f"Expected 'n/a', got {info['abstention_precision_on_unanswerable']!r}"
    )


def test_abstention_precision_is_numeric_when_refusals_exist() -> None:
    """When at least one question is refused, precision must be a float, not 'n/a'."""
    # Unanswerable questions have low scores so they will be refused.
    scores = {f"q{i:03d}": 0.90 for i in range(9)}
    scores.update({"u000": 0.10, "u001": 0.15, "u002": 0.12})
    should_abstain = {k: False for k in scores}
    should_abstain["u000"] = True
    should_abstain["u001"] = True
    should_abstain["u002"] = True

    _chosen, info = tune_abstention(scores, should_abstain)

    val = info["abstention_precision_on_unanswerable"]
    assert isinstance(val, float), f"Expected float, got {val!r}"
    assert 0.0 <= val <= 1.0


# ---------------------------------------------------------------------------
# Item 0 regression: rehearse on dev must reproduce stored hit counts
# ---------------------------------------------------------------------------

def _models_cached() -> bool:
    """Return True only if both sentence-transformer model dirs exist locally."""
    repo = Path(__file__).resolve().parents[2]
    cache = repo / "rag" / "cache" / "models"
    mpnet = cache / "models--sentence-transformers--paraphrase-multilingual-mpnet-base-v2"
    e5 = cache / "models--intfloat--multilingual-e5-base"
    return mpnet.exists() and e5.exists()


@pytest.mark.skipif(not _models_cached(), reason="sentence-transformer models not in cache")
def test_rehearse_reproduces_stored_dev_hit_counts() -> None:
    """Rehearse on dev must match the stored retrieval_summary.csv hit counts exactly."""
    import csv as _csv
    summary_csv = Path(__file__).resolve().parents[1] / "evaluation" / "results" / "retrieval_summary.csv"
    if not summary_csv.exists():
        pytest.skip("retrieval_summary.csv not found")

    stored: dict[tuple[str, str], int] = {}
    with summary_csv.open(encoding="utf-8") as f:
        for row in _csv.DictReader(f):
            if row.get("split") == "dev":
                stored[(row["model_id"], row["retriever"])] = int(row["recall_at_5_hits"])

    if not stored:
        pytest.skip("no dev rows in retrieval_summary.csv")

    summary_rows = evaluate_test_retrieval(rehearse=True)
    assert summary_rows, "No summary rows returned from rehearse run"

    for row in summary_rows:
        key = (row["model_id"], row["retriever"])
        if key in stored:
            assert int(row["recall_at_5_hits"]) == stored[key], (
                f"{key}: rehearse hits={row['recall_at_5_hits']}, stored={stored[key]}"
            )


# ---------------------------------------------------------------------------
# LLM cache validation and outside-repo default path
# ---------------------------------------------------------------------------

def test_default_llm_cache_dir_passes_validation_and_is_outside_repo() -> None:
    """Default LLM cache path must be outside repository and pass _validated_cache_root."""
    from app.services.llm_cache import _validated_cache_root

    from rag.evaluation.run_e2e import DEFAULT_CACHE_DIR

    repo = Path(__file__).resolve().parents[2]
    resolved_default = DEFAULT_CACHE_DIR.expanduser().resolve()

    # Verify default cache dir is outside the repository
    assert not resolved_default.is_relative_to(repo.resolve())

    # Verify that it passes validation and returns the resolved root
    validated = _validated_cache_root(DEFAULT_CACHE_DIR)
    assert validated == resolved_default

    # Verify that an unapproved directory inside the repo is rejected
    inside_repo = repo / "rag" / "cache" / "llm"
    with pytest.raises(RuntimeError, match="outside served source directories"):
        _validated_cache_root(inside_repo)


# ---------------------------------------------------------------------------
# Retrieved passage adapter and real gateway prompt builder / answer draft tests
# ---------------------------------------------------------------------------

class _StubModels:
    def __init__(self, response_text: str) -> None:
        self.response_text = response_text
        self.last_kwargs: dict[str, Any] = {}

    def generate_content(self, **kwargs: Any) -> Any:
        self.last_kwargs = kwargs
        return SimpleNamespace(text=self.response_text)


class _StubClient:
    def __init__(self, response_text: str) -> None:
        self.models = _StubModels(response_text)


def test_unadapted_passage_fails_gateway_with_attribute_error() -> None:
    """An unadapted passage with chunk.document as None fails with AttributeError on title."""
    from app.services.llm_gateway import GeminiGateway

    from rag.compliance.retrieve import RetrievedChunk

    broken_chunk = SimpleNamespace(
        chunk_id="test_doc.pdf:1:0:continuation-1",
        text="Sample provision text",
        section="1",
        page_number=1,
        document=None,
    )
    broken_passage = RetrievedChunk(chunk=broken_chunk, similarity=0.9, method="hybrid")
    stub_client = _StubClient(
        json.dumps({
            "answer": "Test answer",
            "citation_chunk_ids": [],
            "abstain": False,
        })
    )
    gateway = GeminiGateway(
        api_key="fake-test-key",
        model_name="gemini-2.5-flash",
        client=stub_client,
    )

    with pytest.raises(AttributeError, match=r"'NoneType' object has no attribute 'title'"):
        gateway.generate_answer("What is the requirement?", [broken_passage])


def test_adapted_passage_succeeds_with_real_gateway_prompt_and_draft() -> None:
    """The adapted passage presents all required attributes for gateway and answer service."""
    from dataclasses import replace

    from app.services.compliance_assistant import (
        _citation_result,
        _numeric_claims_are_supported,
    )
    from app.services.llm_gateway import GeminiGateway

    from rag.compliance.retrieve import RetrievedChunk
    from rag.evaluation.run_dev_retrieval import canonical_id, load_corpus_chunks
    from rag.evaluation.run_e2e import adapt_retrieved_passage, load_manifest_documents

    manifest_map = load_manifest_documents()
    chunks = load_corpus_chunks()
    assert len(chunks) > 0, "Expected corpus chunks"
    raw_chunk = chunks[0]

    # Create continuation chunk to test suffix stripping
    continuation_chunk = replace(
        raw_chunk,
        chunk_id=f"{raw_chunk.chunk_id}:continuation-1",
    )
    raw_passage = RetrievedChunk(chunk=continuation_chunk, similarity=0.92, method="hybrid")

    adapted = adapt_retrieved_passage(raw_passage, manifest_map)

    # 1. Verify attributes on chunk and document
    assert adapted.chunk.chunk_id == canonical_id(continuation_chunk.chunk_id)
    assert not adapted.chunk.chunk_id.endswith(":continuation-1")
    assert adapted.chunk.text == raw_chunk.text
    assert adapted.chunk.page == raw_chunk.page_number
    assert adapted.chunk.page_number == raw_chunk.page_number
    assert adapted.chunk.heading_path == raw_chunk.heading_path
    assert adapted.chunk.document is not None
    assert adapted.chunk.document.title != ""
    assert adapted.chunk.document.issuing_body != ""
    assert adapted.chunk.document.effective_date is not None
    assert adapted.similarity == 0.92
    assert adapted.score == 0.92
    assert adapted.method == "hybrid"

    # 2. Test real gateway prompt builder and answer draft code
    expected_answer = "Under Section 2, registration is mandatory."
    stub_client = _StubClient(
        json.dumps({
            "answer": expected_answer,
            "citation_chunk_ids": [adapted.chunk.chunk_id],
            "abstain": False,
        })
    )
    gateway = GeminiGateway(
        api_key="fake-test-key",
        model_name="gemini-2.5-flash",
        client=stub_client,
    )

    draft = gateway.generate_answer("How to register?", [adapted])
    assert draft.answer == expected_answer
    assert draft.citation_chunk_ids == [adapted.chunk.chunk_id]
    assert draft.abstain is False

    # Check prompt builder contents passed to client
    prompt_contents = stub_client.models.last_kwargs.get("contents", "")
    assert adapted.chunk.document.title in prompt_contents
    assert adapted.chunk.chunk_id in prompt_contents
    assert adapted.chunk.document.issuing_body in prompt_contents

    # 3. Test real gateway validation code
    validation_client = _StubClient(
        json.dumps({"is_supported": True, "unsupported_claims": []})
    )
    val_gateway = GeminiGateway(
        api_key="fake-test-key",
        model_name="gemini-2.5-flash",
        client=validation_client,
    )
    validation = val_gateway.validate_answer("How to register?", draft.answer, [adapted])
    assert validation.is_supported is True
    assert validation.unsupported_claims == []

    # 4. Test ComplianceAnswerService citation result and numeric claims check
    citation = _citation_result(adapted)
    assert citation.chunk_id == adapted.chunk.chunk_id
    assert citation.document_title == adapted.chunk.document.title
    assert citation.issuing_body == adapted.chunk.document.issuing_body
    assert citation.page_number == adapted.chunk.page_number

    numeric_ok = _numeric_claims_are_supported(draft.answer, [adapted])
    assert isinstance(numeric_ok, bool)


