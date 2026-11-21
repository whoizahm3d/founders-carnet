# FYP-1 schema gap report

Date: 2026-11-22

## Scope and method

This report compares the 37 FYP-1 tables shown in the existing ER diagrams with
the SQLAlchemy metadata and Alembic migrations currently in the backend. The
four grey FYP-2 tables are excluded: `subscription`, `event_listing`,
`resource_link`, and `placement_fee_event`.

The project data dictionary and the referenced Backend Implementation Guide are
not present in this checkout. Therefore, the FYP-1 baseline names come from the
ER diagrams in `docs/report/Figures/`, and the implementation comparison comes
from `backend/app/models.py`, `backend/app/feature_models.py`, route/service
models, and the nine migrations. Column differences below are against the
baseline table intent represented by those diagrams, not against an unavailable
formal data-dictionary column listing.

Status meanings:

- **exists**: the concept is implemented as a dedicated table, even if the
  implementation uses a plural or different physical table name.
- **merged**: the concept is implemented together with another baseline
  concept in one table.
- **partial**: only a subset is implemented, commonly as JSON or inline fields.
- **missing**: no corresponding persisted table or equivalent structure exists;
  these remain designed, not built.

## Summary

| Status | Count |
| --- | ---: |
| exists | 20 |
| merged | 7 |
| partial | 8 |
| missing | 2 |
| **Total FYP-1 tables** | **37** |

The backend currently materializes 27 physical tables (SQLAlchemy metadata and migration head 0015). Several physical tables
cover multiple baseline concepts, so the physical-table count is lower than the
37-table FYP-1 design count.

## Accounts and profiles

| FYP-1 table | Status | Actual implementation | Differing columns or notes |
| --- | --- | --- | --- |
| `user_account` | exists | `users` | Backed by the user account model; includes role, activation, token version and timestamps. |
| `oauth_identity` | exists | `oauth_identities` | Provider and provider subject are unique and linked to users. |
| `founder_profile` | exists | `founder_profiles` | Founder profile with consent and location fields. |
| `startup` | exists | `startups` | Startup details, ownership and verification state. |
| `talent_profile` | exists | `talent_profiles` | Talent profile stores optional GitHub and consent fields. |
| `mentor_profile` | merged | `ecosystem_profiles` | Role-based ecosystem profile stores matching data for mentors. |
| `investor_profile` | merged | `ecosystem_profiles` | Role-based ecosystem profile stores matching data for investors. |
| `mentor_expertise` | partial | `ecosystem_profiles.skills` | Expertise is represented as a JSON skills list; no dedicated junction table. |
| `investor_thesis_sector` | partial | `ecosystem_profiles.sector` | Sector preference is represented by the shared sector field. |
| `consent_record` | exists | `consent_records` | Consent type, version, source and withdrawal timestamp are persisted. |

## Verification and trust

| FYP-1 table | Status | Actual implementation | Differing columns or notes |
| --- | --- | --- | --- |
| `verification_case` | exists | `profile_verifications` | Verification status, score, signals and review state. |
| `verification_signal` | exists | `verification_signals` | One row per signal with input snapshot, score, outcome and reason. |
| `review_decision` | exists | `verification_decisions` | Reviewer, outcome, reason, score, signals and threshold version. |
| `appeal` | exists | `verification_appeals` | Appeal evidence, status and reviewer decision. |
| `report_flag` | exists | `profile_reports` | Report/block kind, reporter, target, reason and time. |
| `audit_log` | missing | ? | Designed for FYP-2; no general immutable audit-event table. |

## Founder services

| FYP-1 table | Status | Actual implementation | Differing columns or notes |
| --- | --- | --- | --- |
| `readiness_assessment` | exists | `readiness_assessments` | Startup-linked rubric result and version. |
| `readiness_dimension_score` | partial | `readiness_assessments.result` | Dimension scores and reasoning are stored in JSON. |
| `pitch_session` | exists | `pitch_sessions` | Session, persona, lifecycle and scores. |
| `pitch_feedback` | partial | `pitch_sessions.scores`, `pitch_turns` | Feedback is represented by session scores and conversation turns. |
| `market_research_request` | merged | `market_research_reports` | Request question and lifecycle share the report row. |
| `market_research_output` | merged | `market_research_reports` | Interpretation and evidence are stored with the request. |
| `resume_document` | merged | `resume_optimizations` | Private storage key and source hash are stored with the optimization. |
| `resume_suggestion` | partial | `resume_optimizations.suggestions` | Suggestions are JSON rather than separate rows. |

## Matching and jobs

| FYP-1 table | Status | Actual implementation | Differing columns or notes |
| --- | --- | --- | --- |
| `match_request` | merged | `match_records` | Requester, state and acceptance flags share the match record. |
| `match_result` | merged | `match_records` | Similarity, factors and score share the match record. |
| `match_factor` | partial | `match_records.factors` | Factor values are JSON rather than separate factor rows. |
| `embedding_record` | partial | `ecosystem_profiles`, `compliance_chunks` | Feature-specific vectors, model names and profile source hash; no generic embedding table. |
| `model_version` | missing | ? | Designed for FYP-2; no reusable model registry table. |
| `job_listing` | exists | `job_listings` | Startup-owned listings and lifecycle. |
| `application` | exists | `job_applications` | Candidate applications with status. |
| `saved_listing` | exists | `job_saves` | User-to-listing saved relation. |

## Compliance tables (regression-only scope)

These rows document the existing frozen compliance schema only. No compliance
code, migrations, tests, indexing, or retrieval behavior is changed by this
step.

| FYP-1 table | Status | Actual implementation | Differing columns or notes |
| --- | --- | --- | --- |
| `corpus_document` | exists | `compliance_documents` | Source metadata, hash, scope and active state. |
| `document_chunk` | exists | `compliance_chunks` | Chunk text, citation metadata and embedding. |
| `compliance_query` | exists | `compliance_queries` | Question, outcome, answer and processing metadata. |
| `compliance_answer` | partial | `compliance_queries.answer_text` | Answer is inline with its query. |
| `answer_citation` | exists | `compliance_citations` | Query-to-chunk citations and rank. |

## Consequences for later steps

- This step makes no schema changes.
- The nine missing tables are designed, not built, and should only be added in
  the feature step that requires them after an approved table design.
- JSON or inline representations should not be treated as equivalent to
  normalized tables when planning verification, matching, audit, or background
  job work.
- The missing Backend Implementation Guide prevents authoritative BT-01..BT-12
  mapping; the test ledger records that limitation instead of inventing IDs.


## Physical tables at migration head 0015

These names and the physical table count are regenerated from SQLAlchemy `Base.metadata`; field-level details are in `docs/data_dictionary.md`.

| Physical table | Status |
| --- | --- |
| `compliance_chunks` | implemented |
| `compliance_citations` | implemented |
| `compliance_documents` | implemented |
| `compliance_queries` | implemented |
| `consent_records` | implemented |
| `ecosystem_profiles` | implemented |
| `founder_profiles` | implemented |
| `job_applications` | implemented |
| `job_listings` | implemented |
| `job_saves` | implemented |
| `llm_gateway_call_logs` | implemented |
| `market_research_reports` | implemented |
| `match_records` | implemented |
| `oauth_identities` | implemented |
| `pitch_sessions` | implemented |
| `pitch_turns` | implemented |
| `profile_reports` | implemented |
| `profile_verifications` | implemented |
| `readiness_assessments` | implemented |
| `resume_optimizations` | implemented |
| `startup_verification_requests` | implemented |
| `startups` | implemented |
| `talent_profiles` | implemented |
| `users` | implemented |
| `verification_appeals` | implemented |
| `verification_decisions` | implemented |
| `verification_signals` | implemented |
