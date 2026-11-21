# Pending report changes

Changes the code or tooling has already made that the report (`main.tex`), the master document and the diagrams do not yet reflect. Fix each one in the report later, add the `docs/DECISIONS.md` entry, then delete the row here.

| Date | What changed | Report says | Now | Where to fix | DECISIONS entry |
| --- | --- | --- | --- | --- | --- |
| 2026-11-21 | Shared dense top-1 cosine refusal gate and hybrid ranking | Section 4.4 and 4.5 state passage counts only if its similarity is at least 0.4 under fused retrieval | Hybrid retrieval ranks unfiltered candidates with minimum_score=0.0 while dense top-1 cosine against threshold 0.8428 serves as the refusal gate shared by service and evaluation | `main.tex` Section 4.4 and Section 4.5 | 2026-11-21 "Shared dense top-1 cosine refusal gate and hybrid ranking alignment" |
| 2026-11-20 | End-to-end evaluation protocol and baseline comparison | Section 4.5 describes comparing all systems end-to-end | Primary configuration (E5 hybrid) evaluated end-to-end against no-retrieval baseline; test split evaluation guarded by single-run lock | `main.tex` Chapter 6 evaluation and RQ2 | 2026-11-20 "Pre-registered compliance evaluation configuration and test guard policy" |
| 2026-11-20 | Pre-registered refusal gate threshold at 0.8428 | Section 4.4 describes abstaining below a dev-tuned threshold | E5 dense top-1 cosine threshold fixed at 0.8428 based on dev split (resting on 3 negative examples); downstream rule checks and validator remain active | `main.tex` Section 4.4 and Section 4.5 | 2026-11-20 "Pre-registered compliance evaluation configuration and test guard policy" |
| 2026-11-20 | Primary compliance retrieval configuration pre-registered | Candidate models (MPNet, E5, BGE-M3) to be selected from empirical dev results | Primary configuration pre-registered as multilingual-e5-base hybrid (RRF k=60, top 5) for cross-lingual requirement; dev split does not statistically separate models | `main.tex` Chapter 3 embedding and Chapter 6 evaluation | 2026-11-20 "Pre-registered compliance evaluation configuration and test guard policy" |
| 2026-11-16 | Founder dashboard fixtures and real-time rubric evaluation | Section 4.8 describes founder dashboard with readiness rubric, next actions, pitch feedback, and matches backed by backend services | Founder dashboard operates on typed fixtures for readiness rubric dimensions, next action completion states, pitch simulation diagnostic logs, and match previews pending backend aggregation endpoints | main.tex Section 4.8 GUI screens and Chapter 5 backend API endpoints | to add |
| 2026-11-15 | Auth social providers scope (Google and GitHub) | Prototype screens show Google and GitHub options; FR-22 lists only email and LinkedIn | Prototype screens show Google and GitHub, but FR-22 lists only email and LinkedIn; report is finalized and will not be changed | `main.tex` Chapter 4 authentication and Section 4.8 GUI screens | to add |
| 2026-11-14 | Auth frontend controls (LinkedIn sign-in, forgot password, remember me) | Prototype displays active LinkedIn button, forgot password link, and remember me checkbox | Controls are rendered in disabled state on `/login` and `/register` with tooltips indicating backend support is absent | `main.tex` Chapter 4/5 frontend & auth flow | to add |
| 2026-11-13 | Compliance chunk metadata and evaluation status | Embedding candidates are to be compared; compliance chunks are described without the added citation metadata | Alembic 0005 extends existing `compliance_chunks` with heading path, effective date and corpus version; model downloads, indexing and measured comparison remain incomplete | `main.tex` implementation and evaluation chapters | 2026-11-13 provisional embedding default and existing chunks table |
| 2026-11-13 | Narrow Finance Act 2026 retrieval scope | All amendments effective from 1 July 2026 | Keep Income Tax Ordinance amendments and Companies Act/SECP fee amendments; current 2026 Act yields 32 ITO amendment chunks and no Companies Act/SECP fee amendments | `main.tex` corpus scope table and answer-source scope; `docs/context/corpus.md` | 2026-11-13 Finance Act scope |
| 2026-11-12 | Private structured-response cache and sanitized gateway call logs | Gateway architecture describes prompt/evidence logging | Gateway persists sanitized per-attempt metadata only; private user-scoped structured cache expires after 24 hours and is cleared on account deletion; queue position is internal, not returned by APIs | `main.tex` Chapter 5 LLM Gateway and privacy description | 2026-11-12 "Private structured response cache and sanitized gateway call logs" |
| 2026-11-12 | Admin verification API and final appeal audit fields | FR-21/FR-26 describe one final appeal decision and an admin console showing escalated profiles, signals, scores, and reviewer-attributed reasons; route paths and appeal audit columns are not specified in the available report summary | Two admin-only endpoints expose the queue with per-signal score, outcome, input, and reason; final decisions retain reviewer ID/reason and appeals retain reviewer, outcome, reason, and decision time | `main.tex` Chapter 4 FR-21/FR-26 and backend API description | 2026-11-12 "Admin verification queue and appeal decision record" |
| 2026-11-12 | PostgreSQL and queue services | Architecture summary names PostgreSQL 16 and does not yet describe Redis/Celery in the local stack | Compose keeps PostgreSQL 17 and now includes Redis, an API container, and a Celery worker | `main.tex` Chapter 5 architecture and technology stack | 2026-11-12 "Keep PostgreSQL 17 and include Redis/Celery in step 1" |
| 2026-11-12 | Registration consent, role path, and fake LinkedIn provider | Earlier plan text cuts LinkedIn OAuth and does not describe registration consent or the new auth endpoints | Registration requires consent; role is a validated path parameter; fake LinkedIn provider, `consent_records`, `oauth_identities`, and immediate deletion disablement are implemented | `main.tex` Chapter 4 authentication and privacy requirements | 2026-11-12 "Registration consent, role transport, and fake LinkedIn boundary" |
| 2026-11-12 | Full talent verification and five signal audit | Report/coding plan does not describe talent verification storage or normalized signal rows | Talent has an optional GitHub profile, full verification status, five versioned signals, and `verification_signals` input/reason rows; SECP remains manual | `main.tex` Chapter 4 profile verification and privacy requirements | 2026-11-12 "Full verification for talent and manual SECP boundary" |
| 2026-11-10 | Matching sector/stage scoring | Sector, stage, and geography are hard candidate filters | Sector and stage contribute weighted fit scores; geography and eligibility rules remain hard filters | `main.tex` matching architecture and ranking description | 2026-11-10 "Sector and stage remain weighted matching factors" |
| 2026-10-17 | Provisional compliance embedding default | Compare multilingual sentence-transformer candidates on the planned benchmark before choosing | The backend defaults to `paraphrase-multilingual-mpnet-base-v2` for local operation; model evaluation remains pending | `main.tex` Chapter 3 embedding method and Chapter 6 evaluation | 2026-10-17 "Configure a provisional multilingual embedding default" |
| 2026-10-17 | PSEB page snapshot retrieval date | Last modified 19 August 2026; accessed 4 October 2026 | Current official snapshot retrieved 17 October 2026; last-modified date remains 19 August 2026 | `main.tex` Table `tab:corpus` | 2026-10-17 "Use a current, scope-filtered PSEB page snapshot" |
| 2026-10-16 | Scope: all 12 FYP-1 features attempted; unfinished work moves to FYP-2 | Chapter 6 objectives table lists "Main flows in FYP-2" | Update after Nov 8 to match what was actually cut | `main.tex` Chapter 6 objectives table (about line 2258) | 2026-10-16 "All 12 FYP-1 features" |
| 2026-10-16 | Limitations | Chapter 6 limitations (about line 2288) | Add every feature that is cut or partial on Nov 8 | `main.tex` Chapter 6 | same |
| 2026-10-16 | Data dictionary FR numbers | Data dictionary (approved 5 Oct) cites FR-1 to FR-6 and FR-22 to FR-26 under an older numbering; its pitch table has 5 feedback areas, FR-3 says clarity, confidence and content | Use the Chapter 4 numbering; reconcile the pitch areas | Data dictionary, before it goes into Chapter 4 or 5 | to add |
| 2026-10-16 | Sprint 4 corpus list | `SPRINT_PLAN.md` lists 5 documents and a stale section number | The corpus is 11 documents (`rag/corpus_manifest.md`) | `SPRINT_PLAN.md` | to add |
| 2026-10-17 | CI (NFR-23): ci.yml not yet confirmed on GitHub | main.tex now says the workflow is written but not yet confirmed on GitHub (hedged 2026-10-18) | `ci.yml` has never run on GitHub; it is untested. Do not claim CI runs on every PR until a test branch confirms it. Once confirmed, close this row. | `main.tex` wherever NFR-23 CI is described | to add |
| 2026-10-17 | Build-order (verification, admin, consent, guides) is internal only | No report text to change | The proposed build order is a team proposal; it stays in `docs/context/coding-plan.md` and is not added to the report. No report edit needed. Close this row once the build is finished and Chapter 6 is written. | `main.tex` Chapter 6 (if it appears there; check before closing) | to add |
| 2026-10-18 | Pitch rubric decided: four areas | main.tex FR-3 now uses the four areas (done 2026-10-18). Data dictionary table (five areas) still old | FR-3 and the `pitch_feedback.feedback_area` row use clarity, market_understanding, number_defensibility, pushback_handling | `data_dictionary_section.tex` | 2026-10-18 pitch rubric |
| 2026-10-18 | Section 4.8 shows the 12 built screens; ten screens are D3 | main.tex Section 4.8 is the figure-grid version (done 2026-10-18) and says ten screens are added in D3 | After D3: swap new images into `Figures/gui/`, update the "ten screens" and uncovered-FR sentences, re-check against `SPEC_NAV_fig07-11.md` | `main.tex` Section 4.8 | 2026-10-18 Request match |
| 2026-10-21 | Bibliography cut from 103 to 35; 32 non-paper sources are in Appendix A | `main.tex` and `fypbib.bib` are in sync (every `\cite` key resolves, no bib entry uncited) | The master document's Section 25 keeps the longer list on purpose. On 2026-11-02 it gained the three works the report cites that it lacked (Liu 2022, Butt 2025, Mustafa 2026) and a map of the report's Appendix A codes. `Chapter3_Source_Register_v2.md` (v2.7, Section G) marks which entries are cut or moved. Decide whether the master list is trimmed to match | Master document Section 25 | 2026-10-21 bibliography entry |
| 2026-10-21 | P5 access date in Appendix A | Left for Ali | Ali adds the 18 Oct access date by hand in `main.tex` | `main.tex` Appendix A | none |
| 2026-11-02 | Chapter 3 tables restored to four columns in `main.tex` (literature tables, related applications, corpus, datasets) plus a spelling and wording pass | The submitted PDF (F26-090, 89 pages) still has the three-column tables | Ali compiles the new `main.tex`, checks the table widths and the page count, and decides when this version replaces the submitted one (evaluation) | `main.tex` | 2026-11-02 "Chapter 3 summary tables back to four columns" |
| 2026-11-02 | Corpus table Size column (pages, words) not restored; it had five columns before the trim | Corpus table has four columns: Document, Issuer, Version or date, Scope in the corpus | Ali says if the Size column should come back as a fifth column | `main.tex` `tab:corpus` | 2026-11-02 |

Closed on 2026-11-02: the master `.docx` was rebuilt twice from the master md (old FR-3, FR-10, 15.1 and 15.4 wording is gone) and the master md was synced with the report (references, numbers, FR-22 to FR-31, NFR-1 to NFR-23, assumptions, use cases, GUI, database design, risks R-1 to R-19, FYP-2 plan). The two wrong master cross-references are fixed (Section 7 now says Section 18, Section 9 says Section 20). See the two 2026-11-02 entries in `DECISIONS.md`. The 15 diagrams in the `.docx` are labeled placeholders because the diagram files are not in the Project; insert them from the diagram files, or send them and Claude will embed them.

Left as they are on Ali's instruction (2026-11-02, no action): the Section 2.6 team-roles sentence in `main.tex` and Stakeholders Summary as Section 2.7.1 under Business Opportunity.

Closed on 2026-10-21 (done in `main.tex`, `fypbib.bib`, `datasets.md`, `DECISIONS.md` and the master document): Roman-Urdu-Parl counts and the card mismatch (32,460 overlap removed, 6,333,348 train rows, 130-row gap explained); Parl card facts (37.1% exact repeats, 76.8% Arabic script in a validation sample, Apache 2.0 on the card only, informal sources); preprocessing results (Success/Fail filter 49,766 of 66,368, Haider dedup 4,170 with Java at 447, Job Market 26.8% and 27.4%); supporting classifiers approved by Ms. Khaleel; matching-data wording; Gulati et al. author order and Springer citation; the three dataset URLs (already in the master references) and the Gulati row in `dataset-links.md`.

Closed on 2026-10-18 (done in `main.tex` and `fypbib.bib`, PR #3): final-7 dataset table and intro with licences; Parl licence and informal-source note; "None states a license" sentence removed; StartUp Investments blank rows; Crunchbase impossible dates and missing rates; tech filter wording ("at least"); tech niche in Chapter 2 scope; corpus path and manifest sentence; AI coding tools in Chapter 5; Mustafa et al. cited; Gulati et al. analysis and LinkedIn dataset limits; Roman Urdu critical analysis narrowed with Butt et al.; dataset limitations and resume optimizer pilot wording; ATS and old Resume-Job rows removed. The declaration date is for Ali to change.

The three rows that were here earlier are closed:

- Node.js 20 to 24: `main.tex` and the master document now say Node 24. Logged in `docs/DECISIONS.md` on 2026-10-15 and 2026-10-16.
- Python 3.11: `main.tex` already names Python 3.11. The master document names no Python version. Logged in `docs/DECISIONS.md` on 2026-10-15.
- GSD Core `.planning/` out of git: no report change needed. Logged in `docs/DECISIONS.md` on 2026-10-15.

## Verified facts behind the closed rows

- Node 20 reached end of life on 2026-04-30 (source: the Node.js release schedule, `nodejs/Release`, `schedule.json`).
- Node 24 is supported until 2028-04-30. It moves from active LTS to maintenance on 2026-10-20, which does not matter for this project.
- GSD Core declares `engines.node >= 24.0.0` in its `package.json`.
- Python 3.11.9 is the last 3.11 release with a Windows installer. Later 3.11 releases are source-only and security-fix only.

## Still open (undecided; add a row to this table and a DECISIONS entry once each is decided)

These items need a decision before the report can be finalised. They are listed here so nothing is forgotten.

- **DESIGN.md brand:** brand name, palette and logo not yet in the report.
- **Readiness reviewers:** who the 2 or 3 reviewers are is not stated in the report.
- **SECP cross-check:** how the SECP cross-check works is not described in the report.
- **Migration tool:** Alembic is chosen (DECISIONS 2026-10-17); the report does not name a migration tool.
- **Lint tool:** `CLAUDE.md` plans `ruff`; report names no lint tool. Once confirmed, add one line to the report.
- **Hosting:** report says "Railway or Render" everywhere. Once one is chosen, update `main.tex`, the master document and `CLAUDE.md`, and log it.
- **Feature freeze date:** not stated in the report; log it when confirmed.
- **Supporting classifier details:** approved by Ms. Khaleel. Column names, split sizes and the Investments label rule are set when the training scripts are written. Log them and update the report then.

- Pill buttons: arrow badge shows on hover and focus (always on touch), not at rest. Report prototypes show it at rest.
- Login: no role dropdown. Mock mode picks the role from the email prefix. Mock banner can be hidden with NEXT_PUBLIC_HIDE_MOCK_BANNER.

| 2026-11-17 | Founder Dashboard breadcrumb and stats block | Report says (or figure shows) a stage suffix "Series Seed" in the breadcrumb and a "Cohort target / SME bookings" stats row. | Implementation shows "Founder / Dashboard" with no stage suffix and no stats block. Update any figure caption or prose that references those elements. See DECISIONS.md 2026-11-17 entry. |
| 2026-11-17 | Verification badge subline | Report figure may show "Visible to vetted investors" beneath the badge. | Implementation shows only "Verified profile". Update any caption that references the vetted-investor subline. |
| 2026-11-19 | Talent dashboard fixtures and missing endpoints | Section 4.8 describes talent dashboard with job listings, application tracking, resume feedback, and founding team matches backed by backend endpoints | Talent dashboard operates on typed fixtures (`src/fixtures/talent-dashboard.ts`) pending backend endpoints: `GET /api/v1/talent/dashboard`, `POST /api/v1/talent/applications`, `POST /api/v1/talent/resume/analyze`, and `POST /api/v1/talent/matches/{id}/request` | `main.tex` Section 4.8 and Chapter 5 backend API endpoints | to add |
| 2026-11-20 | BM25 score normalization method changed | Report does not describe a specific BM25 normalization method | BM25 scores are now normalized by theoretical upper bound (sum of IDF*(k1+1+delta) over unique query tokens) rather than query-specific maximum. dev-6 retrieval results are superseded by dev-12 results. | main.tex Chapter 6 retrieval method and results | 2026-11-20 BM25 score normalization fix and dev-12 re-run |
| 2026-11-20 | Dev split size changed from 6 to 12 | Report says or implies 6 development questions | Development split is now 12 questions (9 answerable, 3 unanswerable); test split unchanged at 14. Tuned thresholds from dev-12 supersede preliminary dev-6 values. | main.tex Chapter 6 results and evaluation setup | 2026-11-20 BM25 score normalization fix and dev-12 re-run |

## Chapter 6 rewrite notes (added 2026-11-20, apply after the RAG evaluation finishes)

### Compliance assistant text

- Chunking is 500-token target, section-aware, no overlap, no character cap. A long clause stays whole. Already fixed at main.tex line 1616. Re-search main.tex for 1200, 150 char and 225 after every edit. The corpus is 240 chunks.
- Storage: use "stored with its embedding in a pgvector column of the database" (table compliance_chunks, ComplianceChunk.embedding). On SQLite the column falls back to JSON.
- Retrieval: the pgvector cosine_distance query (compliance_retrieval.py lines 143 to 147) is accurate for PostgreSQL. The Python cosine_similarity is the SQLite test fallback only.
- The pgvector query path has never run on a live PostgreSQL. Tests run on SQLite. The evaluation harness probably ranks in Python, so Recall@5 and MRR measure retrieval logic, not the database query. State this in RESULTS.md and the limitations.
- The 0.4 similarity threshold in the retrieval sentence must be replaced with the threshold tuned on the dev split after the re-run.

### Matching text

- Profile embeddings are stored in a pgvector column, but ranking is done in Python (intelligence.py line 221). Do not say pgvector retrieves candidates. Write that database-side pgvector search with hard filters is planned.

### Test section and status (main.tex around lines 1638 to 2039)

- Counts: replace 67 tests with the real total at rewrite time (last seen 135 backend plus 41 RAG, 176). Re-run pytest and use the real output.
- Playwright frontend tests now exist, so "do not cover the web client" is stale.
- Rebuild the "still open" list from endpoints and tests. Tables already exist for verification, signals, appeals, decisions, profile reports, job listings, saves, applications, resume optimizations and market research. A table is not proof the feature works.
- The SQLite caveat is already in the report. Add that vector search is also untested against PostgreSQL.

### Question set wording

- Replace gold with question set in main.tex: glossary line 322, line 417, phase table line 1622 ("gold set in preparation"), FYP-2 plan line 1659. Update the status to the real one once the set is frozen.
- Repo file names (gold_questions.jsonl, gold_verification.md) stay as they are. Describe them in prose as the question set.

### Results chapter

- Question set: 26 questions, 12 dev and 14 test (9 answerable and 5 out of scope in test). q021 was dropped as a duplicate of q014. Test labels for q013 and q014 were corrected before any test run.
- The first dev figures (6 questions) and thresholds are superseded by the re-run on 12.
- Report counts next to percentages and Wilson intervals. State that the sample is small. Never write a bare percentage.
- Chunks are split per model to fit max_seq_length (MPNet: 143/240 chunks exceed 128 tokens, 718 passages after splitting; E5: 53/240 exceed 510, 301 passages). The two models therefore search different passage sets, so differences between them mix model quality with passage size. Passages are split, not truncated. At n=9 answerable dev questions no model or method is shown to be better.
- BGE-M3 was skipped because no usable weights were available. Say so.
- No accuracy claim without a results CSV.

### Known chunk issues (fix after the evaluation, not before, because chunk ids must stay stable)

- Heading paths are garbled, for example "Subsections (7), (1), (2) ..." on 4:4 and 6:5.
- Encoding artifacts in extracted text (the replacement character, lost parentheticals).

### Whole-report items

- chapter7.tex draft is stale. Rewrite it from the repo, insert as Chapter 6, renumber the conclusion to Chapter 7, then update the abstract, executive summary and conclusion.
- Pitch score 3 versus 4 mismatch note.
- Turnitin reports to the library.
- Run live PostgreSQL with pgvector once (docker compose, Alembic migrations, index the corpus, one end-to-end question) before the demo.
- Create the shared team email for SECURITY.md and CODE_OF_CONDUCT.

### Per-model passage splitting (added 2026-11-20)
- Production and evaluation both split chunks per embedding model (corpus_indexer.py -> prepare_chunks -> split_chunks_for_model). Stored rows are passages (MPNet 718, E5 301), not the 240 chunks.
- main.tex line 1616: after "about 500 tokens" add that passages are split further to fit the embedding model's input limit.
- Check that user-facing citations show the parent section and not "Continuation N/M" or a :continuation-N chunk id.

### To do after the test run (added 2026-11-20)
- Human labels: Ali and Shahzeb independently label the 28 end-to-end answers (14 test questions times 2 systems) for citation correctness, unsupported claims and date correctness. Report agreement (counts and kappa). Do not use the same LLM to judge its own answers.
- Optional multilingual check (exploratory): write Urdu and Roman Urdu versions (two spellings for some) of the 9 answerable DEV questions. Measure E5 dense and hybrid Recall@5 against the same chunks. Dev only, so the test split stays untouched. Label it exploratory in the report.
- Report scope: the question set is English, so the test run measures English retrieval only. Multilingual claims come only from the check above, plus the FYP-2 benchmark.
- Primary configuration is E5 + hybrid, chosen for the multilingual goal and not from dev results. Refusal gate: E5 dense top-1 cosine 0.8428, tuned on 3 negatives. Say both in the results chapter.
