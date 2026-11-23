# Decisions log

## 2026-11-24: Mentor dashboard architecture, typed fixtures, and role consistency

**Context:** The mentor dashboard (/mentor/dashboard) needed implementation to match DESIGN.md v3.9.2, the design reference `mentor_dashboard_asad_khan`, and cross-screen consistency with the founder and talent dashboards.

**Decision:**
1. Built `/mentor/dashboard` with shared UI components (`Button`, `Card`, `Badge`, `Dialog`, `EmptyState`) and canonical Tailwind tokens, replacing the legacy CSS module implementation.
2. Created `src/fixtures/mentor-dashboard.ts` using Asad Khan's profile ("Mentor, Ex-VP Product Finja", B2B SaaS and Product ops tags) matching his mentor card on the founder dashboard.
3. Used purely fictional startup names (Munshi Books, Mehran Works, Chenab Pay, Indus Logistics, Ravi Health, Korangi Tech, Bolan Commerce) with zero real company names, and zero raw contact details (emails or phone numbers).
4. Counts on the operational summary monolith derive strictly from fixture arrays with no invented statistics, cohort labels, or growth deltas.
5. Added `mentor: 'Asad Khan'` to `MOCK_DISPLAY_NAMES` in `src/lib/auth.ts`.
6. Office hours scheduling was omitted because scheduling is not part of the active feature scope.


## 2026-11-22: Change backend default embedding model to intfloat/multilingual-e5-base

**Context:** Backend default embedding model (compliance_chunks, ecosystem_profiles) must match the evaluated primary config (FR-8, NFR-11 to NFR-14).

**What we tried:** Pre-registered evaluation used intfloat/multilingual-e5-base with hybrid retrieval and a dense top-1 cosine refusal threshold of 0.8428. The backend defaulted to sentence-transformers/paraphrase-multilingual-mpnet-base-v2 (provisional since 2026-10-17), causing a mismatch between the served and evaluated configurations.

**Decision:** Change `_DEFAULT_EMBEDDING_MODEL` in `backend/app/config.py` to `intfloat/multilingual-e5-base`. The encoder (`rag.compliance.embeddings.SentenceTransformerEncoder`) already applies `query: ` and `passage: ` prefixes correctly for E5 models in both the compliance query path and the ecosystem profile matching path. No schema migration is needed because both MPNet and E5-base produce 768-dimensional vectors and the pgvector column has no fixed dimension constraint.

Re-embedding is required on any existing database. Two separate steps:

1. **Compliance chunks:** Re-run the corpus indexer (`cd backend; python -m app.services.corpus_indexer`). The indexer calls `encoder.prepare_chunks()`, which correctly splits the 53 of 240 chunks that exceed E5's 512-token limit into continuation passages (producing 301 passages total, matching the evaluated config). The indexer is idempotent for text that has not changed: it re-embeds only rows whose `embedding_model` differs from the configured model. `backend/scripts/reembed_all.py` handles `ecosystem_profiles` only and explicitly refuses `compliance_chunks` with an error directing operators to the indexer instead.

2. **Ecosystem profiles:** Run `python backend/scripts/reembed_all.py`. Profile texts are symmetric (both sides use `encoder.encode()` with the `passage: ` prefix). The matching query in `backend/app/routes/intelligence.py` filters candidates by `EcosystemProfile.embedding_model == embedding_model`, so existing MPNet-encoded profiles are invisible to E5 queries and must be re-embedded. The script is **untested on a live pgvector database** and must be verified on a database snapshot or staging environment first.

**Parity verification and passage splitting:**
- Fast parity test: `test_e5_query_parity_with_evaluation_path` imports and calls the real `rag.evaluation.run_e2e.encode_query` alongside `SentenceTransformerEncoder.encode_query` on a recording fake model, asserting exact element-by-element equality.
- Slow parity test: `test_e5_query_parity_with_real_weights` (marked slow) loads real cached weights of `intfloat/multilingual-e5-base` and asserts exact numerical parity (within 1e-6) between the backend encoder and the evaluation encoder; it skips cleanly if the model is not in the local cache.
- Passage splitting (301 passages from 240 chunks) is handled exclusively by the corpus indexer via `prepare_chunks()`. `reembed_all.py` refuses `compliance_chunks` to eliminate the risk of silent chunk truncation.

**ruff format status:** `ruff check .` passes on the backend. `ruff format --check .` reports 30 pre-existing files that would be reformatted; none were introduced by this branch. Whether CI enforces format checking should be confirmed before merging.

**Why:** Aligns the production serving path with the evaluated design. The refusal gate threshold 0.8428 was tuned specifically on E5 cosine scores. Using MPNet at serving time while the threshold was tuned on E5 would invalidate the abstention calibration.

**Follow-ups:** Run `backend/scripts/reembed_all.py` on any existing database before deploying. Update `docs/ai_rag_and_model_training_playbook.md` Section 4.1. Profile embeddings in `ecosystem_profiles` must also be regenerated since the matching query in `backend/app/routes/intelligence.py` filters candidates by `EcosystemProfile.embedding_model == embedding_model`; existing MPNet-encoded profiles will not be returned.

## 2026-11-21: Shared dense top-1 cosine refusal gate and hybrid ranking alignment

**Context:** Compliance RAG system retrieval pipeline and abstention gating (FR-8, NFR-11 to NFR-14, Section 4.4 and Section 4.5 of the report). Synchronizing the deployed service refusal logic with the pre-registered evaluation design.

**What we tried:** The previous hybrid retrieval path applied `minimum_score` directly to dense rows, BM25 rows, and the fused reciprocal rank fusion (RRF) score `min(1.0, score * (rrf_k + 1) / 2.0)`.

**What we found:** A candidate chunk present in only one ranking receives an RRF contribution of at most 1/(60+1) = 0.5 under the fused score formula. When `minimum_similarity = 0.8` was configured, hybrid retrieval filtered out all candidate passages unless BM25 also produced a score >= 0.8, which theoretical upper-bound normalized BM25 rarely assigns. This caused `ComplianceAnswerService` to refuse virtually all queries and broke backend test suites (`test_supported_answer_is_saved_with_its_citation`, `test_gemini_error_is_logged_and_failed_query_is_recorded`, `test_gateway_generation_failure_is_logged_once_and_failed_query_is_saved`).

**Decision:**
1. Decouple retrieval ranking from the refusal gate: for `method="hybrid"`, fetch active candidates of the configured model without a distance filter in the database query.
2. Evaluate refusal against the candidate set using a shared function `refuse_by_dense_top1(dense_top1_cosine, threshold)` in `rag/compliance/retrieve.py`, used identically in `backend/app/services/compliance_retrieval.py` and `rag/evaluation/run_e2e.py`.
3. If not refused, call `hybrid_retrieve` with `minimum_score=0.0` over the unfiltered candidates to rank passages, matching the evaluation pipeline.
4. Add `compliance_refusal_threshold: float = 0.8428` to backend config, matching the pre-registered dev-tuned threshold on 3 negative examples.

**Why:** Aligns the deployed service with the pre-registered evaluation protocol where hybrid provides cross-lingual ranking while dense top-1 cosine serves as the refusal gate.

**Follow-ups:** Update `docs/pending-report-changes.md` and `docs/build-log.md`. If the backend default embedding model changes to `intfloat/multilingual-e5-base`, stored chunks in `compliance_chunks` and ecosystem profiles in `ecosystem_profiles` must be regenerated.

## 2026-11-20: Pre-registered compliance evaluation configuration and test guard policy

**Context:** Compliance RAG system evaluation (FR-8, NFR-11 to NFR-14, Research Question 2, Section 4.5 of the project report and playbook). Establishing the primary deployed retrieval pipeline, refusal gate threshold, and the protocol for the single held-out test split evaluation.

**What we tried:** Benchmarked dense, BM25, and hybrid (RRF k=60) retrieval on the 12 development questions (9 answerable, 3 unanswerable) across MPNet and multilingual-e5-base. Tuned the abstention threshold on the 3 unanswerable dev questions and evaluated default (0.4) vs tuned thresholds.

**What we found:** On the development split (n=9 answerable questions), MPNet hybrid and E5 hybrid both achieved 8/9 Recall@5 hits (88.9%, Wilson 95% interval [0.565, 0.980]), and E5 BM25 also scored 8/9 hits. With n=9, confidence intervals are broad and dev results do not statistically separate the configurations. However, BM25 alone cannot match across English queries and Urdu or mixed-language statutory texts, which is a core project requirement. On the 3 unanswerable dev questions, E5 dense top-1 cosine scores separated negatives from positives with an optimal threshold of 0.8428 (tied range 0.842750 to 0.842938).

**Decision:**
1. Primary retrieval configuration: intfloat/multilingual-e5-base with hybrid retrieval (BM25 + Dense RRF, k=60, top 5). This is a principled design choice for cross-lingual coverage rather than an empirical dev win.
2. Refusal gate: Questions whose E5 dense top-1 cosine similarity falls below 0.8428 are refused immediately before generation. This threshold rests on 3 negative dev examples. Downstream rule checks (citation membership, numeric/date claim fidelity, effective date presence) and the LLM grounding validator (compliance-grounding-v1) remain active.
3. Test split retrieval evaluation: All six configurations (MPNet and E5 across dense, BM25, hybrid) will be evaluated once on the 14-question test split under strict guard enforcement (clean working tree for code, lock file, explicit --confirm-test-run flag). Test metrics will be recorded in retrieval.csv and retrieval_summary.csv but will never be used to alter configuration choices.
4. End-to-end evaluation: Run exclusively for the primary configuration against a no-retrieval baseline (gemini-2.5-flash, temperature 0.0). Results are recorded in e2e.csv with human labels (citation_correct, unsupported_claim, date_correct) left for subsequent manual audit.

**Why:** Pre-registering the primary configuration and locking test evaluation prevents post-hoc selection, overfitting to the test split, and metric p-hacking.

**Follow-ups:** Enforced through rag/evaluation/guards.py in run_test_retrieval.py and run_e2e.py. Update docs/build-log.md, docs/pending-report-changes.md, and rag/evaluation/README.md.

## 2026-11-20: BM25 score normalization fix and dev-12 re-run

**Context:** The BM25 retriever in `rag/compliance/retrieve.py` is used in the hybrid retrieval pipeline and its top score drives abstention threshold tuning. The score feeds directly into the hybrid RRF signal and determines whether a question is abstained on.

**What we tried:** Inspected the original `bm25()` function in `rag/compliance/retrieve.py`. The old normalization divided each BM25Plus raw score by `max(scores)`, which forces the top result of every query to score exactly 1.0 regardless of actual match quality.

**What we found:** Scores normalized to the query-specific maximum are not comparable across queries. Every query's top result gets 1.0, so the abstention threshold cannot distinguish a strong match from a weak one. After the fix, the BM25 top score for a question like q017 (outside corpus) is visibly lower than for q001 (strong lexical match). The old retrieval results show all BM25 top scores as 1.0, confirming the bug.

**Decision:** Replace the in-query maximum normalization with a theoretical upper bound: `sum(IDF(token) * (k1 + 1 + delta) for token in unique_query_tokens)`. This bound is the maximum score any single document could receive for the query given the corpus IDF values, so scores are calibrated and cross-query comparable. All returned scores are still clamped to [0, 1].

**Why:** Cross-query comparable BM25 scores are required for the hybrid abstention threshold to generalize. With the old normalization the threshold had no signal from BM25 top scores.

**Follow-ups:** Dev-12 re-run results (retrieval.csv, retrieval_summary.csv, abstention_tuning.csv) supersede the dev-6 results archived as `retrieval_dev6_superseded.csv`. The report must reflect the new BM25 normalization method and the tuned abstention threshold from the dev-12 run. Update pending-report-changes.md.

## 2026-11-19: Expand the compliance evaluation development split

**Context:** The compliance RAG evaluation uses a fixed development and test split. The first development retrieval run used 6 development questions and 14 held-out test questions.

**What we tried:** We ran dense, BM25 and hybrid retrieval on the original 6-question development split using MPNet and multilingual E5. The test split was not run.

**What we found:** Six new answerable questions were written after that first development run. Adding them grows the development split from 6 to 12 questions. The test split remains unchanged at 14 questions.

**Decision:** Add the six new answerable questions to the development split only. Re-run the development retrieval evaluation and tune abstention thresholds again before relying on any development metrics. Do not change or run the test split.

**Why:** The prior development metrics and tuned thresholds were based on six questions, so they do not measure the expanded development set. Preserving the test split protects its held-out status.

**Follow-ups:** Confirm each proposed chunk mapping against its source PDF, re-run the development retrieval comparison without downloading models, regenerate the evaluation result files and RESULTS.md, and state in the report that the original development figures and thresholds were superseded.

## 2026-11-15: Social auth options (LinkedIn, Google, GitHub) and demographic field handling in /login and /register

**Context:** The report specifies FR-22 (social sign in via LinkedIn and email) and omits Google and GitHub, while prototype reference screens show Google and GitHub options. Furthermore, the backend registration schema requires `full_name`, but the prototype and DESIGN.md v3.9 intentionally omit Full Name, Profession, and Age fields from the auth cards.

**What was tried:** Evaluated adding live OAuth integrations versus rendering visible disabled options. Evaluated adding a full name input versus deriving an initial name fallback.

**Decision:**
- Render "Continue with LinkedIn" as a full-width outlined pill, and "Google" and "GitHub" as half-width outlined pills side by side below it, with monochrome glyphs (no blue) and a visible `(Not available yet)` caption.
- In `src/lib/auth.ts`, provide a fallback `nameFromEmail(email)` when registering so the backend `UserRegisterRequest` validation passes without requiring a demographic field on the registration card.
- Log missing backend endpoints for LinkedIn, Google, and GitHub in `docs/api_gaps.md` and document the scope disparity in `docs/pending-report-changes.md` (noting the report is finalized).

**Why:** Respects DESIGN.md visual hierarchy and prototype expectations while remaining strictly honest about backend capabilities and preserving backend validation integrity.

## 2026-11-14: Adopt Tailwind CSS, shadcn/ui component primitives, and DESIGN.md v3.8 tokens for frontend rebuild

**Context:** The report states Tailwind CSS and shadcn/ui in its software stack, while the initial wireframe-driven prototype used CSS Modules. Rebuilding against accepted Stitch prototypes and DESIGN.md requires a unified styling foundation, explicit design tokens, and removal of sidebar navigation in favor of a floating pill top navigation.

**What was tried:** Evaluated keeping CSS Modules vs installing Tailwind CSS and restyled shadcn/ui primitives. Approved minimal package set: `tailwindcss@^3.4.17`, `postcss`, `autoprefixer`, `clsx`, `tailwind-merge`, and `class-variance-authority`. No icon packages installed; inline SVG icons strictly used in `src/components/ui/icons/`.

**Decision:**
- Adopt Tailwind CSS with tokens locked to `DESIGN.md` (canvas, ink, accent #B15F2C, radii, spacing, hairlines, and status pairs).
- Set page background globally to fixed radial gradient: `radial-gradient(circle at 85% 15%, #F5C842 0%, #FF8A2B 30%, #C4451A 55%, #3A1206 100%) fixed`.
- Configure Google Fonts (`next/font/google`): Hanken Grotesk (body/headlines), Instrument Serif italic (last words of headings), JetBrains Mono (labels/nav/status).
- Replace sidebar layout with floating `TopNav` (glass pill, Karachi local time chip, initials avatar) and full-screen mobile `MenuOverlay`.
- Existing CSS Modules are preserved until each page is rebuilt, then deleted. Built `/styleguide` page to demonstrate all foundation tokens and component states.

**Why:** Aligns the implementation with the project report and `DESIGN.md`, simplifies layout conversion from prototype visual specs, and ensures consistent accessibility, responsiveness, and contrast ratios without external design bloat.

## 2026-11-13: Keep compliance embedding default provisional; reuse the existing chunks table

**Context:** Three multilingual embedding models were requested for comparison, and citations require heading paths, effective dates and corpus versions. The repository already has a `compliance_chunks` table.

**What we tried:** Installed pinned CPU embedding dependencies and attempted the MPNet download. Its weight file remained incomplete, so the sequential loader did not reach multilingual-E5 or BGE-M3 and no model comparison or corpus indexing could run. The existing table has a compatible pgvector embedding column.

**Decision and reason:** Keep `paraphrase-multilingual-mpnet-base-v2` as the provisional configured default; do not select a new default without dev measurements and one test confirmation. Extend `compliance_chunks` with metadata in Alembic revision 0005 instead of adding a table. This preserves existing document/chunk relationships and avoids duplicating the retrieval corpus.

**Report difference:** The implemented schema and incomplete model evaluation need to be reflected in the report's implementation/evaluation sections. See the pending-report row.

## 2026-11-13: Narrow Finance Act retrieval scope to founder-facing provisions

**Context:** The report describes amendments effective from 1 July 2026, but the Finance Act also amends vehicle taxation, customs, sales tax and excise.

**What we found:** The reviewed Finance Act has section 5 amendments to the Income Tax Ordinance and no Companies Act or SECP fee amendment. Keeping that section yields 32 chunks, above the approved five-chunk minimum.

**Decision and reason:** Retrieve the Income Tax Ordinance amendments and any Companies Act/SECP fee amendments only. This keeps the founder compliance corpus focused and excludes unrelated Finance Act material. No Companies Act/SECP fee amendments were present in the 2026 Act.

**Report difference:** `main.tex` and `docs/context/corpus.md` currently state the broader amendment scope. The matching pending-report row records what to update.

Dated entries, newest first. Each entry has the context, what was tried, what was found, what was decided, and why. Add an entry every time the code or the report is changed so the two agree.

## 2026-11-13: Normalize line endings when verifying text corpus hashes

**Context:** Git is configured with `core.autocrlf=true`, so Windows checkouts convert LF text to CRLF. The three initially mismatched VOSS/PSEB entries in the manifest are LF hashes. The two older FBR registration-page entries are raw CRLF hashes, so the manifest has a mixed text-hash convention.

**What we tried:** Compared raw-byte hashes and CRLF-to-LF hashes for the VOSS transcription and PSEB HTML and reviewed-text captures.

**What we found:** The three initially mismatched working copies use CRLF and have no UTF-8 BOM; their LF-normalized SHA-256 hashes match the manifest. The two FBR registration-page files also use CRLF, but their raw SHA-256 hashes match their manifest entries. No source bytes or manifest hashes were changed.

**Decision:** For `.txt` and `.html`, verify the CRLF-to-LF SHA-256 first and accept an exact raw-byte SHA-256 only when the normalized hash does not match. Hash PDFs and all other file types as raw bytes. Do not change the manifest hashes or corpus files.

**Why:** This preserves the LF hashes used for the three VOSS/PSEB entries, while retaining exact verification for the two existing FBR rows whose manifest hashes were recorded from CRLF bytes after Git's Windows checkout conversion.

## 2026-11-12: Keep PostgreSQL 17 and include Redis/Celery in step 1

**Context:** The report architecture summary names PostgreSQL 16 and places Docker Compose after the first services run. The approved implementation plan uses the existing PostgreSQL 17 Compose image and needs Redis/Celery for the backend queue foundation.

**Decision:** Keep PostgreSQL 17 in Compose. Add Redis and a Celery worker in step 1, with the API and worker sharing the existing backend image. Do not change the CI workflow in this step.

**Why:** PostgreSQL 17 is already the working local database configuration, and Redis/Celery are required foundations for the queue behavior described by NFR-2 and NFR-21. The report's PostgreSQL 16 reference is recorded as a report mismatch rather than silently changing the working database.

**Follow-ups:** Update the report's PostgreSQL version and background-service description through the pending report-change process. Add actual background tasks only in step 9.

## 2026-11-12: Admin verification queue and appeal decision record

**Context:** FR-21 requires a final reviewer decision on a one-time appeal, and FR-26 requires an admin console with escalated profiles, signals, scores, and reviewer-attributed decisions. The report file `main.tex` is not present in this checkout, so this comparison uses `docs/context/requirements.md`.

**What we tried:** Extended the existing Step 5 routes and tests to cover the approved queue and decision contract. The first tests showed that the queue returned only signal outcomes and that decision reasons were limited to ten characters.

**What we found:** Persisted signal rows already contain each signal's score, outcome, input snapshot, and reason. The decision table already supports append-only reviewer attribution, and the appeal row has reviewer, outcome, reason, and decision timestamp fields; no new table or migration is needed.

**Decision:** Keep the two admin-only endpoints at `/api/v1/admin/verification/review-queue` and `/api/v1/admin/verification/{verification_id}/decision`. Return persisted signal details in the queue. Accept any decision reason that is non-empty after trimming, record the final decision with the reviewer ID, and finalize appeal metadata in the existing row.

**Why:** This supplies the FR-21/FR-26 console contract using the current schema while preserving the report's final-review and audit requirements.

**Follow-ups:** Add the route paths, per-signal fields, and appeal finalization fields to the report's FR-21/FR-26 description and API documentation. See `docs/pending-report-changes.md`.

## 2026-11-11: Manual SECP identity cross-check in profile verification

**Context:** The verification plan requires a LinkedIn OAuth or SECP cross-check, but no LinkedIn OAuth app is approved and the report does not define an automated SECP lookup method.

**Decision:** Use a human reviewer to check the user's submitted SECP entity name and registration number against official SECP records. Do not scrape social profiles or automate registry access. Treat the check as pending until the administrative review feature records a reviewer decision. LinkedIn OAuth is cut for this slice. Store configurable score thresholds; use defaults of 0.85 high and 0.50 low as pilot values, not calibrated parameters.

**Why:** This follows the coding plan's allowed LinkedIn OAuth cut, preserves FR-12's SECP cross-check, and avoids unapproved account integration or unsupported claims of automated identity verification.

**Follow-ups:** The admin review console must record the SECP check and final reviewer decision. Calibrate thresholds on the team's consented pilot profiles before treating auto bands as validated.
## 2026-11-02 (later): Master document synced with the report; two cross-references fixed

**Context:** The master .md and .docx had drifted from the report (F26-090 plus the 2 November main.tex). A comparison found that the report cites three works the master did not list, states numbers the master lacked, and has a Chapter 4 and 5 level of detail (31 FRs, 23 numbered NFRs, 17 features, 19 risks, 10 use cases, 14 assumptions, 12 GUI screens, 41 tables) that the master held only in summary form. Two cross-references in the master were also wrong.

**What we tried:** A script compared the bib keys, the appendix sources and the numbers in the report's prose against the master, then patched the master from main.tex.

**What we found:** Missing references: Liu et al. 2022, Butt, Varanasi and Neumann 2025, Mustafa et al. 2026 (P5), and the Rozee.pk, Indeed and Glassdoor sources (A7 to A9). Missing facts: 0.747 versus 0.743, ObliQA 27,869, Butt BM25 0.0846 and mT5 0.1903, 19.64% duplicates, 4.5:1 contrast, 41 tables and 264 attributes, about one shared vCPU with 512 MB to 1 GB, Python 3.11. Wrong cross-references: Section 7 said Section 15 (it is Section 18) and Section 9 said Section 14 (it is Section 20).

**Decision:** Fix both cross-references. Add the three references, the appendix sources and a map of the report's 32 Appendix A codes. Replace the master's objectives with the report's nine, and label the third SDG as supported but not targeted. Add Section 11.5 (six services, seven strategies, policies), FR-22 to FR-31, NFR-1 to NFR-23, assumptions, ten use cases, hardware and software, GUI, database design (16.4 to 16.8), the R-1 to R-19 register (19.1) and the FYP-2 plan. Rebuild the .docx (64 pages, 15 diagram placeholders).

**Why:** The master is the source of truth, so the report must not state anything it lacks. FR rows 22 to 31 show the actors from the report, because the report does not assign them modules.

**Follow-ups:** Ali replaces the master .md and .docx in the Project and the local copy (the tool cannot write the 210 KB file). Diagram images still need inserting into the .docx from the diagram files.

## 2026-11-02: Chapter 3 summary tables back to four columns; spelling and wording pass

**Context:** On 2026-10-21 the Chapter 3 tables were shortened for the submitted report (F26-090, 89 pages). Only the cell text was meant to shrink, but the Method and Results columns merged into one "Finding" cell. The literature tables then had three header cells on a four-column spec and printed narrower than the page. On 2026-10-22 Ali said every Chapter 3 table has four columns, and the team planned to restore them after the mid evaluation. The mid evaluation is done.

**What we tried:** Compared the submitted `main.tex` with the 2026-10-19 version (Author, Method, Results, Limitations; Application, Features, Relevance, Limitations). Split each shortened "Finding" cell back into Method and Results and kept the 2026-10-21 wording. Read the whole file for spelling and wording, ran a spell check, and checked cite keys, labels and table rows by script.

**What we found:** The (V), (A) and (P) basis marks were also missing from the related applications table, although its caption still explains them. The corpus table had been a five-column table (with Size) cut to three, and the datasets table had lost its Contents column and its license information. There was one real typo ("tarined") and several broken sentences in Chapter 6 and in the Chapter 2 Problem Domain Overview ("Only English is taught in FYP-1"). Some wording broke standing rules: "small cohorts" (no source), and platform claims stated flatly ("No platform had Urdu or Roman Urdu support", IFDP features). `fypbib.bib` needed no change.

**Decision:**

- Literature tables: Author, Method, Results, Limitations, widths 3.0, 4.0, 2.8 and 4.0 cm as before. Related applications: Application, Features, Relevance, Limitations, with the (V), (A), (P) marks back. Corpus table: Document, Issuer, Version or date, Scope in the corpus (the Size column is not restored). Datasets table: Dataset, Contents as loaded, Role, License and main limitation.
- Wording: "competitive cohorts" instead of "small cohorts"; "We saw no Urdu or Roman Urdu support on the platforms we reviewed"; "On its public pages, the Investor Founder Discovery Platform shows no mentor profile, compliance feature or AI ranking"; "No AI seen" for PakStartups.org; FR-3 says "defensibility of numbers" (the four-area pitch rubric). The Chapter 6 legal-sources sentence now says what Chapter 3 found: a PSEB page against the Ordinance, and two FBR sources on company registration.
- Left as they are on Ali's instruction: the Section 2.6 team-roles sentence, and Stakeholders Summary as Section 2.7.1 under Business Opportunity.
- The master document (`.md` and `.docx`) was synced with the wording rules above. Its scope, design and references did not change.

**Why:** The four columns are what the department template and the earlier version had, and the cell text was already short. The wording rules protect claims that the team cannot back with a dated source.

**Follow-ups:** Ali compiles the new `main.tex` and checks the table widths and page count. The submitted PDF is not touched. Two master-document cross-references are known to be wrong and were not changed (Section 7 says Section 15 for legal exposure, which is Section 18; Section 9 says Section 14 for the anchor partner, which is Section 20). Logged in `pending-report-changes.md`.

## 2026-10-21: Supervisor approves the supporting classifiers and the dataset plan

**Context:** The 2026-10-19 entry adopted three supporting classifiers (resume role, startup outcome, follow-on funding) with the supervisor's approval pending. Ms. Khaleel has since answered.

**What we found:** She approved the classifier plan. On datasets she said there are many links and we may use whatever seems fine for training initially.

**Decision:** The three classifiers stay as planned, as offline FYP-2 studies. The re-ranker is still the only model that ships. We keep the seven FINAL datasets and treat the rest as reference only. Column names, split sizes and the Investments label rule are still set when the training scripts are written, and logged then.

**Why:** Her answer settles the open approval and removes the need for a fallback plan.

**Follow-ups:** `datasets.md`, the master document (sections 9 and 13.9, objective 8) and the pending-changes table now say "approved". `main.tex` carried no "approval pending" wording, so it needed no change.

## 2026-10-21: Roman-Urdu-Parl overlap resolved; remaining preprocessing results

**Context:** The 2026-10-17 entry recorded that our Parl files did not match the Hugging Face card, and the 2026-10-19 pending table asked for a recount and an overlap test before the report was submitted. The Gemini preprocessing run finished and the results were checked against its CSV.

**What we found:**

- The train file holds 6,365,808 rows, and 32,460 of them are validation or test pairs. The earlier claim that the splits do not overlap was wrong for our copy.
- Removing those pairs leaves 6,333,348 train rows. The card gives 6,333,218. The 130-row gap equals the number of fully blank rows. That is my arithmetic, not something the run confirmed.
- Card figures: train 6,333,218, validation 20,719, test 20,741, validation plus test 41,460, total 6,374,678. Our files total 6,407,268. After cleaning, our total is 6,374,808.
- In the train file, 37.1% of the pairs are exact repeats. In a validation sample, 76.8% of the Urdu column is in Arabic script. The Apache 2.0 licence is on the split card only, and the sentences come from informal online sources.
- Success/Fail: the 1990-2015 founded_at filter keeps 49,766 of 66,368 rows. 15,221 rows have no usable founding date. 8.0% of the kept startups are closed.
- Haider: exact-text deduplication of the 6,000 tech resumes leaves 4,170. Java Developers is the smallest category at 447.
- Job Market: the tech share is at least 26.8% in the earlier raw run and 27.4% (1,469 of 5,368) after cleaning. Both are reported.
- Not used: the Gemini under-3-word count (67,669), its strict phone-pattern counts and its "strict subsets" claim, because they did not agree with its own CSV.

**Decision:** Remove the 32,460 overlapping pairs from the Parl train file. Report the file numbers, the overlap, the 6,333,348 result and the card figures side by side. This supersedes the "keep as FAIL" decision in the 2026-10-17 Parl entry and the "zero pair overlap" reason in `datasets.md`.

**Why:** Training or testing on pairs that sit in both splits would inflate any result. Reporting the card numbers next to ours lets a reader check the difference.

**Follow-ups:** Applied to `main.tex` (Section 3.3.3, Table 3.11 and the dataset limitations list), `datasets.md` and the master document. The three 2026-10-19 rows for the Parl recount, the card facts and the remaining preprocessing are closed in `pending-report-changes.md`.

## 2026-10-21: Bibliography cut from 103 to 35 entries; non-paper sources move to Appendix A

**Context:** The reference list was much longer than a report of this size needs, and many entries were web pages, datasets and official documents rather than papers.

**What we found:** `bib_trim_plan_2026-10-19.md` (v2) sorted the 103 entries into 34 papers to keep, 34 non-paper sources for an appendix and 35 to cut. After reading each paper's citation context, four plan "keeps" went (Tahir 2025 KICS benchmark, Giuggioli 2025, Spigel 2017, Rysman 2009) and four plan "cuts" stayed (Peng 2025, Niu 2024, G-Eval, Caillaud 2003). The SECP position paper stays in References.

**Decision:** `fypbib.bib` has 35 entries (34 papers plus the SECP position paper). Appendix A, "Data and Web Sources", lists 32 non-paper sources: P1 to P5, A1 to A9, D1 to D7 and R1 to R11. The body cites them with `\src{P1}`, `\src{A1}`, `\src{D1}` and `\src{R1}`. Every `\cite` key in `main.tex` resolves, and no bib entry is uncited. In `Chapter3_Source_Register_v2.md`, the papers cut from the report stay as evidence, marked "not cited in the report", and the sources moved to the appendix are marked "moved to Appendix A".

**Why:** A shorter list of papers the report actually relies on is easier to defend, and web, dataset and regulatory sources fit better in an appendix than among the references.

**Follow-ups:** Ali adds the P5 access date (18 Oct) by hand. A stray extra closing brace after the Gulati entry in `fypbib.bib` was removed on 2026-10-21; it would have broken BibTeX.

## 2026-10-21: Gulati et al. citation verified against Springer

**Context:** The 2026-10-18 pending row followed the arXiv author order because the Springer page was not checked.

**Decision:** The published citation is Gulati, Kumar, Agarwal and Sharma (2026), "Weak Links in LinkedIn: Enhancing Fake Profile Detection in the Age of LLMs", in An, Cuzzocrea and Hu (eds), Social Networks Analysis and Mining, ASONAM 2025, Lecture Notes in Computer Science vol. 16323, Springer, Cham, DOI 10.1007/978-3-032-13821-7_31. The order matches arXiv. The `\cite` key `ref:gulati2025` is unchanged.

**Why:** The report should cite the published version, not the preprint.

## 2026-10-19: Supporting classifiers trained on three FINAL datasets; matching-data wording; preprocessing results

**Context:** The seven FINAL datasets were chosen for profiling and schema design, and the plan said none of them trains a model. The team wants some real supervised training on the final data. Preprocessing of the seven datasets also finished (`preprocessing_summary.csv`). Touches Chapter 3 (datasets), Chapter 4 (features) and the slides. Adopted by the team on 2026-10-19; the supervisor has been sent a one-page overview. Update 2026-10-21: she approved it (see the entry above).

**What we tried:** Checked each FINAL dataset for a label that can be defended, and checked each feature for whether training would help or only add risk.

**What we found:** Three datasets carry usable labels: Haider resumes (6 tech categories), Startup Success/Fail (status) and StartUp Investments (funding rounds). The compliance assistant needs cited official text, and resume rewriting, pitch feedback and readiness explanations are prompted LLM calls, so training on external data would not improve them. We found no public labeled dataset for Pakistani founder-mentor or investor matching, so the re-ranker can only use our own labeled pairs. Preprocessing passed for all seven datasets and the counts match `datasets.md`, except: Success/Fail still needs the 1990-2015 founded_at filter, Haider still has its 30.5% duplicates in the cleaned file, and the Job Market tech share is 27.4% (1,469 of 5,368) on the cleaned file.

**Decision:**

- Train three supporting classifiers: a resume role classifier on Haider (R1; Bhawal IT and Engineering as an external check, with no per-class accuracy claim), a startup outcome classifier on Success/Fail (R4; closed against survived or exited), and a follow-on funding classifier on Investments (R4; label is "raised a follow-on round"). Rules: deduplicate before splitting, drop funding columns and post-outcome fields from the outcome classifier, drop round-count and total-funding columns from the funding classifier, macro-F1 where classes are small. Full detail is in `docs/datasets.md`.
- The matching re-ranker stays trained only on the team's own 150 to 300 labeled pairs in FYP-2, with a cosine-similarity baseline in FYP-1 and NDCG@K, Precision@K and Recall@K as metrics. The compliance assistant and the prompted LLM features are not trained.
- Optional in FYP-2: fine-tune a Roman Urdu embedding on Roman-Urdu-Parl, only if the R5 benchmark shows a gap.
- Wording: write "we found no public labeled dataset for Pakistani founder-mentor or investor matching" in the report and slides. Do not write "confirmed absent". The three-layer matching design stays: public data fills profiles, retrieval uses filters and cosine similarity, the FYP-2 re-ranker trains on our own pairs.
- Apply the 1990-2015 filter and deduplicate Haider in the training scripts. Correct the Job Market tech share to 27.4% on the cleaned file wherever it is reported.

**Why:** Gives the final datasets a real modelling role without claiming accuracy that no data can support, and keeps trained models limited to places where labels exist.

**Follow-ups:** Update `docs/context/*`, `CLAUDE.md`, `AGENTS.md`, `docs/pending-report-changes.md`, the master document markdown and `main.tex` (Chapter 3 datasets text and table, Chapter 4 features, Chapter 6 limitations). Fix the exact column names, split ratios and the Investments label rule when the scripts are written, and log them here. This entry supersedes earlier wording that says no FINAL dataset trains any model; entries before it are left as history. The supervisor approved the plan, so no change is needed (2026-10-21).

## 2026-10-17: Configure a provisional multilingual embedding default

**Context:** Compliance settings were loaded from `.env` relative to the process working directory. Starting FastAPI from `backend/` therefore missed a repository-root `.env`. The embedding model was also unset, so the compliance service returned 503.

**What we tried:** Compared the report's multilingual sentence-transformer candidates and checked that the encoder accepts a model ID from configuration. The report-named `paraphrase-multilingual-mpnet-base-v2` candidate works with the encoder's existing raw-text input interface.

**Decision:** Load the repository-root `.env` by absolute path, map the documented JWT environment names, ignore frontend-only variables, and rewrite a bare PostgreSQL URL to the installed psycopg 3 driver. Use `sentence-transformers/paraphrase-multilingual-mpnet-base-v2` as the provisional default. `EMBEDDING_MODEL_NAME` can override it, but one model ID must be used consistently for indexing and queries. The model has not been benchmarked on the project's gold set, so this default is operational only, not a validated model choice.

**Why:** This fixes the working-directory mismatch and gives local setup a concrete model setting, while preserving the report's requirement to evaluate embeddings before making quality claims.

**Follow-ups:** Set `GEMINI_API_KEY` in the repository-root `.env`, use PostgreSQL with pgvector, index the approved corpus, then run the gold-question evaluation before reporting compliance performance.

## 2026-10-17: Use a current, scope-filtered PSEB page snapshot

**Context:** The report's corpus table specifies the PSEB Industry Facilitation web page, last modified 19 August 2026 and accessed 4 October 2026, scoped to registration documents, fees, and renewal. The workspace contained a PDF copy instead, and the dated HTML capture was unavailable.

**What we tried:** Retrieved the official page on 17 October 2026 and checked its modified-date metadata. Reviewed the page text and isolated its registration, renewal, fees, payment, and processing sections. The page also contains unrelated FAQs, including tax topics.

**What we found:** The current page still reports a last-modified date of 19 August 2026. The October 4 capture was not present, so it could not be used or recreated honestly. The live page includes material beyond the corpus scope.

**Decision:** Keep the complete October 17 HTML capture for provenance, index a reviewed text extract of registration documents, fees, renewal, and processing only, and mark the old PDF inactive while retaining it. Do not index the page's FAQ or tax material. Update the report's access date to 17 October 2026.

**Why:** This uses the report-designated official source and scope, records the true retrieval date, preserves the captured source, and prevents unrelated page content from entering retrieval.

**Follow-ups:** Update the access date in `docs/report/main.tex` Table `tab:corpus`; `docs/pending-report-changes.md` tracks this. The corpus summary now matches the report's 11 logical documents.

## 2026-10-17: Use Alembic for backend migrations

**Context:** NFR-22 requires every schema change to be versioned and the database to rebuild from migration history. The coding plan left the migration tool undecided.

**What we tried:** Added an Alembic environment and tested an empty SQLite database upgrade through the initial users migration and the compliance tables migration.

**What we found:** The migration history creates the declared ORM schema without relying on application startup `create_all`. The test uses in-memory SQLite; PostgreSQL with pgvector has not yet been exercised.

**Decision:** Use Alembic for backend schema migrations.

**Why:** It records schema changes as ordered revisions and supports rebuilding a fresh database, which directly meets NFR-22.

**Follow-ups:** Apply migrations to the configured PostgreSQL 16 database and verify the pgvector extension and vector column there before corpus indexing.

## 2026-10-18: Pitch simulator uses one four-area rubric everywhere

**Context:** Prototype review (12 screens, 2026-10-18) found three conflicting pitch rubrics: master document section 13.2 and the prototypes use four areas (clarity, market understanding, defensibility of numbers, handling pushback); FR-3 in the master document says "clarity, confidence, and content"; the approved data dictionary `pitch_feedback.feedback_area` lists five values (clarity, problem_framing, traction, ask, delivery).

**What we tried:** Compared the three against the prototypes and the pipeline description in section 13.2.

**What we found:** The prototypes and section 13.2 already agree, and the four areas are what a prompted rubric can score from a transcript. "Confidence" and "delivery" need audio or video, which is out of scope until Phase 2 (video pitch upload).

**Decision:** The rubric is four areas: clarity, market understanding, defensibility of numbers, handling pushback. Stored values for `pitch_feedback.feedback_area`: `clarity`, `market_understanding`, `number_defensibility`, `pushback_handling`. FR-3 wording changes to match. Applied to the master document markdown and the data dictionary markdown only; the master `.docx`, `data_dictionary_section.tex` and `main.tex` follow later.

**Why:** One rubric means the prototype, the prompt, the stored data and the report describe the same thing.

**Follow-ups:** Rebuild the master `.docx`; update Chapter 4 FR-3 text, Section 4.8 and the data dictionary table in `main.tex` (see `docs/pending-report-changes.md`); tell Shahzeb to use the same four labels on the pitch feedback screen.

## 2026-10-18: The match action is called "Request match" on every screen

**Context:** Prototype investor screens say "Request intro"; founder and talent screens say "Request match"; Section 4.8 text and the use case say "Request match". `SPEC_NAV_fig07-11.md` used "Request intro" for the investor figure.

**Decision:** Use "Request match" everywhere (buttons, navigation edge labels, captions, report text). Figure 10 now reads "Request match" and "Match requests"; the caption says "match requests".

**Why:** Matches the use case and FR-7 (contact revealed only on mutual acceptance). "Intro" suggests a warm introduction by a person, which the platform does not make.

**Follow-ups:** Shahzeb changes the investor screens; `Section_4_8_GUI.tex` already uses "Request match".

## 2026-10-18: Final dataset selection and classification of statuses (analysis run 2026-10-17)

**Context:** External dataset profiling and validation for Chapter 3 (Section 3.3.3 and the datasets table (\label{tab:datasets})) supporting matching, discovery, readiness, and multilingual baselines.

**What we tried:** Ran comprehensive dataset claim checks across 18 folders (14 full, 4 reference) in `ml/notebooks/dataset_claim_checks_v2.ipynb` to evaluate size, duplicate rates, tech relevance, missingness, PII risks, and licensing clarity.

**What we found:** Seven datasets satisfy core requirements for final adoption: Roman-Urdu-Parl (6,407,268 pairs), Pakistan Startup Census (433 usable rows), Pakistan's Job Market (6,680 rows), Crunchbase Startup Success/Fail (66,368 rows), Crunchbase Investments (49,438 usable rows), snehaanbhawal Resume Dataset (2,484 rows), and haider Resume Dataset (6,000 tech rows). Seven datasets are retained as reference benchmarks or negative controls (LinkedIn, ATS, IterateCV, MS MARCO, retrieval-queries, finance-qa, Rozee). Four datasets failed quality and safety gates (Hafiz Hassaan Saeed, RUEmoCorp, Inferencelab, Urdu-Multi-Domain-Benchmark) and are dropped. Earlier candidates (HSE Hackathon, Resume PDF, Maaz, Rankistan, Pakistani Startups Hub, ERUPD) remain excluded.

**Decision:** Formally adopt the 7 FINAL datasets as primary platform design and evaluation inputs. Classify the remaining datasets into REFERENCE ONLY, DROPPED, and EXCLUDED EARLIER. Update `docs/datasets.md`, `docs/dataset-links.md`, and the datasets table (\label{tab:datasets}).

**Why:** Establishes disciplined data governance and ensures no unvetted, unconsented, or non-tech datasets leak into model evaluation.

**Follow-ups:** Update Chapter 3 Section 3.3.3 and the datasets table (\label{tab:datasets}) in the report pull request.

## 2026-10-18: Tech-only filtering rules and conservative title matcher (analysis run 2026-10-17)

**Context:** Project scope discipline restricting the platform exclusively to tech startups and technical talent. Touches Chapter 3 methodology and data quality sections.

**What we tried:** Tested loose substring keyword matching against a compiled word-boundary regex (`\b`) on job titles and resume titles across Rozee, Pakistan's Job Market, and ATS datasets. Evaluated Crunchbase pipe-separated category lists.

**What we found:** Loose keyword matching inflated technical shares (for example, IterateCV showed 100% tech share, likely caused by short tokens such as 'it' and 'ai'; the strict-matcher rerun on IterateCV did not complete). The strict word-boundary regex eliminates false positives on non-tech roles like "Sales Associate" or "Accountant", but misses specific tool names like "Php", "Laravel", "Java", or "React". Crunchbase category-list filtering identifies 28,695 tech rows (45.4% of rows with a category) in Startup Success/Fail and 20,542 tech rows (45.2%) in Investments.

**Decision:** Standardize on two explicit tech filters: (1) Crunchbase category-list filter for venture records; (2) compiled strict word-boundary title matcher for job titles and resumes. State in the report that reported title tech shares are "at least" lower bounds.

**Why:** Prevents artificial inflation of tech shares while maintaining strict scope boundaries for the Pakistani tech ecosystem.

**Follow-ups:** Add filter keyword lists to `docs/datasets.md` and document the "at least" lower-bound wording in `main.tex`.

## 2026-10-18: Dataset exclusions and quality gate drop decisions (analysis run 2026-10-17)

**Context:** Quality, safety, and ethical screening of candidate multilingual and emotional text corpora for Chapter 3.

**What we tried:** Profiled candidate corpora for toxic language, exposed personal identifiers (PII), schema integrity, and licensing restrictions.

**What we found:** Hafiz Hassaan Saeed corpus contained an 18.0% toxic content rate with profanity and an unpopulated metadata card. RUEmoCorp and Inferencelab have labels; reason = no emotion or sentiment feature in the project, and some person names remain in rows. Urdu-Multi-Domain-Benchmark contained 26 fragmented per-domain licences, executable rebuild scripts, and offensive content instances.

**Decision:** Drop Hafiz Hassaan Saeed, RUEmoCorp, Inferencelab, and Urdu-Multi-Domain-Benchmark from the active project registry. Confirm earlier exclusions: HSE Hackathon (Russian language and geographic mismatch); Resume PDF (0 of 30 sampled files had text); Maaz (no licence listed, partly AI-generated, skipped by the team); Rankistan (named personal profiles and GitHub-versus-LinkedIn source leakage); Pakistani Startups Hub (self-described demo build with composite quotes); ERUPD (75,146 sentence pairs per the paper; no data release or licence seen).

**Why:** Excludes datasets that lack project feature alignment, have unvetted toxicity, or expose named personal profiles.

**Follow-ups:** Record dropped statuses in `docs/datasets.md` and `docs/dataset-links.md`.

## 2026-10-18: ATS dataset exclusion reversed to reference-only smoke test (analysis run 2026-10-17)

**Context:** Test input selection for resume parsing and optimizer pipelines (R1, R2) in Chapter 3 and Chapter 4.

**What we tried:** Evaluated `ats_resume_dataset_elite_v3.csv` (6,000 rows, 17 columns) for realism, schema structure, and text length distributions.

**What we found:** Resume text median is 377 characters and job description median is 131 characters, with near-uniform experience and education distributions consistent with synthetic generation. However, the dataset contains zero duplicates and clean structured schema fields.

**Decision:** Reverse the previous full exclusion of the ATS dataset to REFERENCE ONLY. Use it strictly as a synthetic smoke test; never training or accuracy claims.

**Why:** Provides a safe synthetic tabular test fixture for automated testing without risking exposure of real candidate resumes.

**Follow-ups:** Update the datasets table (\label{tab:datasets}) in `main.tex` and entry in `docs/datasets.md`.

## 2026-10-18: LinkedIn dataset retained as aggregate structure reference; Gulati profiles deferred to FYP-2 (analysis run 2026-10-17)

**Context:** Mentor and investor profile verification (FR-12 to FR-21) and fake profile structural indicators in Chapter 3 and Chapter 4.

**What we tried:** Examined Ayoobi et al. pickle dataset (3,600 rows x 39 columns) using a safe restricted unpickler. Reviewed recent fake profile detection literature by Gulati et al. (arXiv:2507.16860).

**What we found:** Ayoobi et al. contains 1,800 legitimate, 600 fake, and 1,200 ChatGPT-generated profiles. It includes a Full Name column. We found no public Pakistani labeled real/fake LinkedIn-style dataset. Gulati et al. demonstrated that detectors not retrained on specific LLM profiles fail, but retraining on GPT profiles restores false accept rate (FAR) to 1 to 7%; their study is English-only with one LLM family.

**Decision:** Retain Ayoobi LinkedIn dataset as REFERENCE ONLY for aggregate profile structure statistics. Strictly forbid printing, logging, or storing personal name fields. Defer Gulati et al. 600 GPT-4 Turbo profiles to FYP-2 as an optional extension. Maintain rule-based profile verification checks for FYP-1.

**Why:** Complies with strict privacy constraints while utilizing structural insights on legitimate versus synthetic profiles.

**Follow-ups:** Note aggregate-only role and Pakistani data limitation in Chapter 3 and Chapter 4.

## 2026-10-18: Resume optimizer test plan and pair feasibility evaluation rules (analysis run 2026-10-17)

**Context:** Evaluation protocol for resume optimization (R1) and candidate-job matching (R2) in Chapter 4 and Chapter 6.

**What we tried:** Planned a cross-product feasibility pairing between public technical resumes (Haider, Snehaan Bhawal) and Pakistani job descriptions (Rozee, Job Market). The pair-feasibility cell (Step 3) crashed in the fixed rerun, so no pair statistics are reported.

**What we found:** Public datasets come from disparate sources; artificial cross-product pairs lack ground-truth suitability labels. True candidate-job application decisions in Pakistan are proprietary and unavailable publicly.

**Decision:** Test the resume optimizer exclusively on the team's own and consented resumes in a controlled pilot of tens of cases. Make no match-accuracy claims from artificially constructed pairs.

**Why:** Preserves academic rigor and prevents misleading accuracy claims derived from ungrounded synthetic pairings.

**Follow-ups:** Document pilot evaluation protocol in Chapter 4 methodology and Chapter 6 test plan.

## 2026-10-18: Evaluator framing and baseline dataset freeze (analysis run 2026-10-17)

**Context:** Dataset versioning, benchmarking discipline, and evaluator protocol across all project sprints.

**What we tried:** Surveyed external datasets across Kaggle, Hugging Face, and Open Data Pakistan.

**What we found:** Ad-hoc dataset substitutions introduce moving evaluation baselines and risk invalidating earlier profiling.

**Decision:** Freeze the current set of 7 FINAL and 7 REFERENCE datasets as the official project baseline. A new dataset is adopted only if it strictly beats the baseline on formal selection criteria (tech niche, Pakistani relevance, licensing clarity, and privacy compliance) with an explicit DECISIONS entry and report update.

**Why:** Guarantees reproducibility and maintains stable benchmarks for thesis evaluation.

**Follow-ups:** Enforce freeze across all future model testing and report documentation.

## 2026-10-17: CI ruff pinned to 0.17.1; notebooks excluded from ruff

**Context:** The CI job "Python (rag)" failed on ruff in `rag/corpus_profile/profile_corpus.py`, and "Python (ml)" fails on the two notebooks in `ml/notebooks/`. `.github/workflows/ci.yml` installed ruff with no version (`pip install ruff pytest`) and the repo has no ruff config. This touches NFR-23 (linting on every pull request).

**What we tried:** Ran ruff 0.17.1 with `uvx` in `rag/`, `ml/` and the repo root, and read the settings it resolved.

**What we found:** With no config, ruff 0.17.1 enables 407 rules by default, including BLE001, FURB167, PLE0704, S112, RUF046 and SIM115, and it lints `.ipynb` and `.md` files too. `rag/` had one F541 and four deliberate broad excepts (BLE001). `ml/` had 30 errors, all in the two notebooks. The repo root had 280, of which 246 are in `.claude/skills/`, 3 in `.claude/hooks/guard.py` and 1 in `scripts/backup.py`. CI only lints inside `backend/`, `rag/` and `ml/`.

**Decision:**

- CI installs `ruff==0.17.1` (`ci.yml`, the install step). An unpinned install meant the default rules could change under us on any ruff release.
- Notebooks are excluded from ruff with `ml/ruff.toml` (`extend-exclude = ["*.ipynb"]`), because they are analysis scratch work. `.py` files stay linted.
- `rag/corpus_profile/profile_corpus.py`: removed the extra `f` prefix. The four broad excepts are deliberate (the profiler must record a bad file and keep going), so each carries `# noqa: BLE001` with a reason.
- `ml/notebooks/dataset_claim_checks.ipynb`: the bare `raise` in `read_csv_chunks` now raises a `ValueError` that names the file. Nothing else in the notebook changed.
- The repo root and `.claude/` are not linted by CI. No root ruff config was added, and `.claude/skills/`, `.claude/hooks/guard.py` and `scripts/backup.py` were not changed.

**Why:** A pinned version keeps CI results the same until we choose to upgrade. Notebooks are for exploration, not shipped code, so linting them adds noise.

**Follow-ups:** To upgrade ruff, change the pin on purpose and re-run the folders. Anything in `ml/` that ships moves into a `.py` module with tests, where ruff applies. The `.claude/hooks/guard.py` and `scripts/backup.py` findings are left for the team to decide.

## 2026-10-17: Skills install finished; what is and is not installed

**Context:** The install run against the "Final install list" in `THIRD_PARTY.md`. It touches `.claude/skills/`, `.claude/references/` and `scripts/sync_agent_skills.py`. It corrects the 2026-10-16 entry "Skills and plugins install list fixed", which says spec-kit, graphify, awesome-design-md and rea are installed. That entry is left as it was, as history.

**What we tried:** Cloned each source repo into a scratch folder outside the repo, read the skills, checked licenses, pinned commits, and copied only what the list allows.

**What we found:** `frontend-design`, `claude-api` (trimmed), `git-workflow-and-versioning`, `shipping-and-launch`, `ci-cd-and-automation`, `performance-optimization`, `observability-and-instrumentation`, `web-design-guidelines` (rules file saved locally, no live download) and four `ponytail` skills went into `.claude/skills/`. The upstream `references/` checklists went into `.claude/references/`, because the new and the older skills link to `../../references/`. Codex and Antigravity could not follow those links, because the sync script copied only the skills.

**Decision:**

- spec-kit is per person and not installed yet. Each person runs `uv tool install specify-cli==<version>` on their own laptop. Nothing is copied into the repo, and `specify init` needs its own OK.
- graphify is skipped until `backend/` or `frontend/` has code.
- `DESIGN.md` is not installed because the brand is undecided.
- caveman was reviewed and skipped: its own README calls the gain "inside the noise", and most of its skills use the hosted Caveman Cloud gateway or rewrite `CLAUDE.md`-style files.
- gstack was reviewed and skipped: it is not skills-only. It needs a runtime install, has hooks and a telemetry step, and some skills commit, push and deploy.
- `scripts/sync_agent_skills.py` now also copies `.claude/references/` to `.agents/references/` (copy only, never deletes). `.agents/references/` is in `.gitignore` next to `.agents/skills/`. `SETUP.md`, `AGENTS.md`, `CLAUDE.md` and `THIRD_PARTY.md` say so.

**Why:** Keep to the rules in `CLAUDE.md`: no hooks that run on their own, no tool that commits, pushes or deploys for us, and no hosted gateway between us and the model. Codex and Antigravity users should see the same skills and the same checklists as Claude Code.

**Follow-ups:** Choose the `DESIGN.md` brand. Each person installs spec-kit when they want it. Run graphify once there is code. Read career-ops, financial-services and replica-skill before deciding on them. Do the per-person installs (docx, pdf, pptx, xlsx, the code-review plugin, rea, the no-license repos).

## 2026-10-17: Roman-Urdu-Parl split numbers discrepancy between files and report

**Context:** The report (Chapter 3, Table of external datasets) states Roman-Urdu-Parl has 6,374,678 pairs (6,333,218 train, 20,719 validation, 20,741 test).

**What we tried:** Checked the dataset files using `ml/notebooks/dataset_claim_checks.ipynb`.

**What we found:** In the local files, validation (20,719) and test (20,741) match the report exactly. However, the train split has 6,365,808 rows (which matches the original paper's headline figure), versus 6,333,218 in the report. The total count in the files is 6,407,268 versus 6,374,678 in the report.

**Decision:** Treat the unlabeled split in the files as train and keep the claim check as FAIL. State that the source of 6,333,218 is unknown. Do not claim it is wrong until the Hugging Face dataset card is checked.

**Why:** The files and the report disagree. Keeping the claim as FAIL ensures the mismatch is tracked honestly and logged for resolution.

**Update 2026-10-21:** Resolved. The train file contains 32,460 validation and test pairs; they are removed (see the 2026-10-21 Parl entry).

**Follow-ups:** Check the Hugging Face dataset card for `Mavkif/Roman-Urdu-Parl-split`. Update the report to the file numbers (6,365,808 train; 6,407,268 total) unless a source for 6,333,218 is found. Logged in `docs/pending-report-changes.md`.

## 2026-10-17: Tech-niche focus and dataset search/swap rules

**Context:** The Crunchbase datasets cover companies across all sectors. The platform targets the Pakistani tech startup niche.

**What we decided:**

1. **Tech filter:** When using Crunchbase data for schema design or profiling, filter rows to tech categories using the `category_list` column. LinkedIn and HSE have no equivalent tech filter; use them as-is with awareness of that limitation.

2. **Dataset search rule:** The team may look for better or more Pakistan-specific datasets on Kaggle and Hugging Face after the D2 or mid-term milestone. Before any new dataset is used, it must have an entry in `docs/datasets.md` (what it contains, why it was chosen, which user input it serves) and a reason logged here in `docs/DECISIONS.md`. If it replaces one of the five kept datasets, add a row to `docs/pending-report-changes.md` so the report's dataset table is updated.

**Why:** Scope discipline. The report targets one niche; the datasets must match.

## 2026-10-16: All 12 FYP-1 features are attempted, with cut lines

**Context:** The report lists 12 features for FYP-1 and a fallback order if work falls behind. The coding window is Oct 19 to Nov 8 (Sprints 6 to 8) and the report is due Nov 11.

**What we tried:** Read the Chapter 4 feature table, the Delivery Priority section, and the Chapter 6 plan to see what a smaller FYP-1 would have to drop.

**What we found:** The report does not drop any of the 12. It only says that items lower in the fallback list are dropped first. Not in the report: where verification, the admin console, consent and usage guides sit in that order, who the readiness reviewers are, and how the SECP cross-check works.

**Decision:** We attempt all 12. Each has a minimum slice and a cut line in `docs/context/coding-plan.md`. Foundations and the compliance assistant are never cut. What is unfinished on Nov 8 is listed in the Chapter 6 limitations and moves to FYP-2.

**Why:** It follows the report's fallback list and keeps every claim in the report honest.

**Also settled (2026-10-16):** the proposed build order for verification, admin console, consent and guides is accepted as an internal plan and is not added to the report. Undecided for now: the readiness reviewers, the SECP cross-check method, the migration tool.

**Follow-ups:** Update the Chapter 6 objectives table ("Main flows in FYP-2") and the limitations list once we know what was cut (see `docs/pending-report-changes.md`). Decide the "not in report" items listed in the coding plan.

## 2026-10-16: Compliance corpus is 11 documents, committed in rag/data/ with a manifest

**Context:** The report fixes the corpus. The files are large (the Finance Act PDF is 42 MB; about 59 MB in total).

**What we tried:** Collected the 10 PDFs and one page snapshot into `rag/data/` and compared each file's SHA-256 with `rag/corpus_profile/profile_report.md`.

**What we found:** The hashes match (the `.txt` copy of the FBR page is not in the profile report). The Seventh Schedule URL slug says 2023, but the file is the 20 Apr 2026 version.

**Decision:** The 11 files are committed in `rag/data/`, so Taha and Shahzeb get them on clone and the evaluation can be reproduced. This is an exception to the raw-data rule: they are public official documents, not datasets. `rag/corpus_manifest.md` is committed too and mirrors the `corpus_document` table. `docs/context/corpus.md` holds the indexing rules.

**Why:** Easier for the team and for evaluation. A committed file stays in git history, so a replaced version adds size; update a file only for a reason that is logged here.

**Follow-ups:** Load the manifest into `corpus_document`. Decide OCR or hand transcription for the VOSS scanned page. The Sprint 4 corpus list in `SPRINT_PLAN.md` (5 documents) is stale.

## 2026-10-16: Skills and plugins install list fixed; Codex and Antigravity supported

**Context:** The team has one Claude Code seat. Taha and Shahzeb mostly use Codex and Antigravity, which do not read `.claude/skills/`.

**What we tried:** Read the install and skills documentation of both tools and the README of each candidate repo.

**What we found:** Codex reads skills from `<repo>/.agents/skills`. Antigravity reads workspace skills from `<project>/.agents/skills/` and rules from `AGENTS.md` or `GEMINI.md`. Which of the two wins when both exist is not documented.

**Decision:** The final install list is in `THIRD_PARTY.md`. Not installed: codebase-memory-mcp, claude-swarm, screenshot-to-code, AgentForge. awesome-design-md, spec-kit, graphify and rea are installed. `scripts/sync_agent_skills.py` copies `.claude/skills/*` to `.agents/skills/` (gitignored). `GEMINI.md` points to `AGENTS.md`.

**Why:** One source of skills, no hooks that run on their own, and the same rules for every tool.

**Follow-ups:** Choose one `DESIGN.md` brand. Fill in commit hashes and licenses in `THIRD_PARTY.md` after the install. Read career-ops, financial-services and replica-skill before deciding on them.

## 2026-10-16: Report updated to Node 24 and four top-level folders

**Context:** The report said Node.js 20 and described three top-level directories. The repo uses Node 24 and has four folders: `frontend/`, `backend/`, `rag/`, `ml/`.

**What we tried:** Compared `main.tex` and the master document with `CLAUDE.md` and the two 2026-10-15 entries below.

**What we found:** `main.tex` named Node 20 in the technology list, and described "three top-level directories" in the source control section and "frontend, backend, and retrieval and machine learning directories" in the quality attributes table. The master document had no Node version in its tech table and no folder count. Python 3.11 was already correct in both.

**Decision:** Changed the report to match the code. `main.tex` now says Node.js 24 and lists four directories (frontend, backend, retrieval (rag), machine learning (ml)). The master document tech table now says "React / Next.js (TypeScript) on Node.js 24".

**Why:** The code and the report must agree (see `CLAUDE.md`, Source of truth).

**Follow-ups:** Remove the Node row from `docs/pending-report-changes.md`. Rebuild the report PDF and the master document docx before they are shared.

**Also settled on 2026-10-16:**

- Hosting: `main.tex` said "Railway" while the master document and `CLAUDE.md` said "Railway or Render". `main.tex` now says "Railway or Render" in the budget text, the tools list, and the deployment text. The choice between the two is still open until we deploy.
- Docker: the report and master document specify Docker Compose, and `CLAUDE.md` said Docker is deferred. These do not conflict, because deferred means not set up yet. Docker stays in the report. `CLAUDE.md` now says the report specifies it, we add it after the first services run, and the code must stay containerizable.
- Lint tool: the report names none and `CLAUDE.md` plans `ruff`. No change. If the team picks a different tool, change `CLAUDE.md`, and add the tool to the report if it should name one.

## 2026-10-15: Move from Node 20 to Node 24

**Context:** Node.js version used in the frontend, CI, and all development machines.

**What we tried:** Installed Node 24 on the frontend, CI, and all three machines to meet GSD Core's requirement of Node 24 or newer.

**What we found:** Node 20 reached end of life on 2026-04-30. GSD Core declares `engines.node >= 24.0.0` in its package.json. Not yet verified: a full `npm run build` of the Next.js app on Node 24 (there is no frontend code yet).

**Decision:** The report still says Node 20 and must be updated to Node 24 wherever it names the Node version.

**Why:** Node 20 is end-of-life and the planning tool requires Node 24 as a minimum.

**Follow-ups:** Update main.tex and the master document to name Node 24 in the stack and tools text, any technology table, and deployment diagram. No team member needs to act separately.

## 2026-10-15: Python 3.11 only, in every folder

**Context:** Python version used in backend, RAG, and ML folders, each with its own `.venv`.

**What we tried:** Installed Python 3.11.9 (the last 3.11 release with a Windows installer) on all three machines. Python 3.14 was removed from the lead machine.

**What we found:** Each folder uses Python 3.11 in its own virtual environment. One version avoids "works on my machine" differences between three laptops, and CI uses the same version.

**Decision:** The report must name Python 3.11 wherever it names a Python version (stack and tools text, any technology table, the ML and RAG environment description).

**Why:** A single version prevents environmental drift across the team.

**Follow-ups:** Update main.tex and the master document. No team member needs to act separately.

## 2026-10-15: GSD Core's `.planning/` folder stays out of git

**Context:** GSD Core (planning tool) keeps its plans, roadmap, and state in the `.planning/` folder.

**What we tried:** GSD Core's default is to commit those files on its own. Its config.json can hold API keys in plain text, and each person's `.planning/` copy changes constantly.

**What we found:** Committing `.planning/` would cause merge conflicts between three people and expose secrets. We added `.planning/` to `.gitignore` and turned off GSD's `commit_docs` setting.

**Decision:** Decisions the team needs to track go into `docs/DECISIONS.md` and the report by hand. No report change is needed.

**Why:** Avoids merge conflicts on personal state and reduces the risk of committing secrets.

**Follow-ups:** Revisit this decision if more than one person starts using GSD for shared planning across the team.

## 2026-10-17: Page snapshots in rag/corpus_profile/snapshots/

**Decision:** Commit the techdestination.com industry facilitation page snapshot (html and txt, saved 2026-10-04 by rag/corpus_profile/profile_corpus.py).

**Reason:** It is the evidence for the Chapter 3 corpus profiling (profile_report.md). It is a public page, about 2 MB.

**Note:** These are profiling copies, not corpus files. They are not in rag/corpus_manifest.md. Do not index them without a manifest row and a reason here.

## 2026-10-17: Hand-transcribe the VOSS circular for indexing

**Context:** The FBR VOSS circular is a one-page scanned PDF and cannot be indexed by the current text extractor.

**Decision:** Keep the scanned PDF in the corpus as inactive provenance and add a reviewed hand transcription as the active indexable source. The transcription records normalized punctuation and the omitted serial number, signature and distribution list.

**Why:** This follows the corpus rule to OCR or transcribe the source while retaining the official scan for review. It adds no new logical corpus document.

**Follow-ups:** Check the transcription against the scan during the corpus review; rerun manifest/hash verification before indexing.

## 2026-10-17: Matching baseline weights and blend (implementation default)

**Context:** The report and coding plan name cosine similarity and five matching factors, but do not give numeric weights.

**Implementation default:** Use factor weights of sector 0.25, stage 0.20, skill overlap 0.25, availability 0.15, and ticket fit 0.15. Normalize cosine similarity to the 0–1 range and combine it equally with the weighted factor score.

**Why:** This keeps the FYP-1 ranking deterministic, makes the factor contribution visible, and leaves the trained re-ranker for FYP-2. All weights and the blend are centralized so the team can change them without changing the API or stored factor explanations.

**Follow-ups:** Review these pilot defaults against a seeded demo set and state the final weights in the evaluation notes. They are not validated model parameters.

## 2026-11-10: Sector and stage remain weighted matching factors

**Context:** The report describes sector, stage, and geography as candidate hard filters, while `docs/context/coding-plan.md` specifies sector and stage as two of the five weighted factors. The matching implementation needs a single rule for candidate ranking.

**Decision:** Keep sector and stage as weighted scoring factors, as specified in the coding plan. Apply geography, role, account status, mentor availability, and the investor verification/readiness requirements as eligibility filters.

**Why:** Hard-filtering sector and stage would make their named match factors constant among results and prevent the ranking from expressing partial fit. Keeping them weighted allows compatible profiles to rank higher while still returning relevant matches across sectors or stages.

**Follow-ups:** Update the report's matching description to distinguish weighted sector/stage scoring from eligibility filters; evaluate the pilot weights on the seeded demo set.

## 2026-11-12: Registration consent, role transport, and fake LinkedIn boundary

**Context:** FR-17 moves consent into registration, FR-22 permits email/password or LinkedIn sign-in, and the safety rules prohibit reading roles from request bodies. Earlier coding-plan text had cut LinkedIn OAuth for the slice.

**Decision:** Require explicit registration consent, move password-registration role selection to a validated path parameter, and allow only founder, talent, mentor, and investor. Add a provider interface with a deterministic fake LinkedIn provider; no real OAuth credentials or network calls are used. Store consent and OAuth identity mappings in dedicated tables. Account deletion disables the account immediately and stores a 30-day purge schedule on `users`; the purge remains step 9.

**Why:** This satisfies the approved feature scope while preventing public admin selection, keeping provider access behind an interface, and preserving an auditable consent record without storing provider tokens.

**Follow-ups:** Replace the fake provider only after a separately approved real OAuth integration. Update the report to reflect that LinkedIn is implemented behind a fake provider in the current slice.

## 2026-11-12: Full verification for talent and manual SECP boundary

**Context:** Step 4 requires a talent profile with an optional GitHub link and a five-signal verification score. The approved SECP approach is a manual reviewer comparison against official records, without automated registry access or social-profile scraping.

**Decision:** Talent receives the same verification case, status endpoint, score bands, consent checks, and signal audit rows as mentors and investors. Store the optional GitHub URL in `talent_profiles`. Use five versioned signals: LinkedIn identity, manual-SECP state, profile completeness, GitHub-link presence for talent, and portfolio-link consistency. The default SECP fake returns `pending_manual_review`; a high score therefore remains pending until Step 5 records the reviewer result.

**Why:** This implements the approved full-talent-verification scope while keeping legal-identity claims behind a human review boundary and preserving NFR-15 inputs and reasons.

**Follow-ups:** Step 5 must record the reviewer’s SECP result and final decision. GitHub activity metrics beyond link presence remain outside this slice.
## 2026-11-12: Private structured response cache and sanitized gateway call logs

**Context:** Step 6 adds observability for gateway calls and avoids repeat structured generation for identical user-scoped requests. The report architecture describes storing prompts and evidence, which can contain founder profiles, CV content, or compliance material.

**Decision:** Cache only schema-validated non-compliance structured responses on private local disk, scoped by user and keyed by model, operation, prompt version, input, schema, and instructions. Entries expire after 24 hours and are cleared during account deletion. Persist gateway attempt metadata in `llm_gateway_call_logs` without prompts, evidence, inputs, or outputs. Keep queue position in gateway logs and this metadata table; do not add it to API responses. Compliance generation does not use the structured cache.

**Why:** This supports NFR-2 and NFR-19 while keeping private request content out of operational records and honoring the account deletion flow in NFR-11.

**Follow-ups:** Update the report's gateway description to specify sanitized metadata rather than prompt/evidence persistence and describe the 24-hour user-scoped cache and its deletion cleanup.

## 2026-11-22: Verification score bands with manual SECP follow-up

**Context:** The manual SECP checker always reports `pending_manual_review`, so requiring an SECP `verified` outcome made the high band unable to produce `auto_verified`. Defaults also needed to let a complete profile reach the high band without LinkedIn OAuth.

**Decision:** Keep the SECP check manual and keep its pending result in the signal audit. A high aggregate score becomes `auto_verified`; reviewers retain the decision log and can revoke it later. Store the weights and thresholds in versioned `backend/app/verification_config.json` and include the version and active values in `threshold_version`. Talent has no SECP entity and records `not_provided` with score 0.0. Signal rows are copied from the scoring result so their weighted sum matches the saved total.

**Why:** This makes FR-14's high/review/low bands reachable without claiming an automated legal-record check. The signal remains transparent, the manual review boundary remains explicit, and incomplete profiles can stay in the review band.

**Follow-ups:** Update the report's verification decision flow and signal-score defaults; retain manual SECP review as a reviewer follow-up.

## 2026-11-22: Profile block uses the FR-16 review lock

**Context:** FR-16 requires blocked profiles to go to human review and stop rescoring, while existing report state transitions could overwrite appeal or rejected statuses.

**Decision:** Add a public-role block operation recorded in the existing profile report table with `kind=block`. Only verified, auto-verified, and pending-review cases change to `pending_review`; appeal-pending and final rejected states remain visible. Every report or block locks rescoring and appends a decision-log row.

**Why:** This keeps review state auditable and prevents user reports from hiding a final rejection or an appeal already in progress.

**Follow-ups:** Update the report's FR-16 API and status transition description.

## 2026-11-22: Founder startup verification review queue

**Context:** The job board restricts posting to verified startups, but no current founder-facing process could set `Startup.is_verified`, leaving the FR-24 posting path unreachable outside direct database edits.

**Decision:** Add an owner-only startup verification request and an admin-only review queue. Store each request and reviewer decision in `startup_verification_requests`; approval sets `Startup.is_verified`, while rejection leaves it false.

**Why:** This closes the operational path required to use the already implemented verified-founder job board, while keeping the decision auditable and away from public registration or self-verification.

**Follow-ups:** Update the report's FR-24 workflow and backend API description to include startup verification review.


## 2026-11-22: Model-backed data dictionary (Option A)

**Context:** The report schema diagram includes 37 FYP-1 concepts, while the active SQLAlchemy schema has fewer physical tables because several concepts are merged or stored as JSON.

**Decision:** Generate `docs/data_dictionary.md` from the live SQLAlchemy models (Option A), and retain the complete 37-row FYP-1 comparison in `docs/schema_gap_report.md`. Unbuilt concepts remain marked as designed for FYP-2.

**Why:** This keeps physical columns accurate without misrepresenting the report's conceptual schema.

**Follow-ups:** Regenerate the dictionary when model metadata changes.

## 2026-11-22: Idempotent embedding freshness tracking

**Context:** Background profile embeddings could not distinguish unchanged source text from a profile requiring regeneration.

**Decision:** Add nullable `ecosystem_profiles.source_hash` in migration 0015. Embedding tasks compare SHA-256 source text and encoder model before writing, and a batch task repairs missing, stale, or model-mismatched vectors.

**Why:** A nullable migration keeps existing databases upgrade-safe; the batch task fills legacy hashes and is safe to rerun.

**Follow-ups:** Track task outcomes without logging profile content or identifiers.
## 2026-11-17: Remove cohort metrics, stage label, and vetted-investor claim from Founder Dashboard

**Context:** The Founder Dashboard prototype displayed a "Cohort target" stat, an "SME bookings" stat, a "Series Seed" stage label in the breadcrumb, and a "Visible to vetted investors" badge subline. None of these appears in DESIGN.md as a required element, and they all constitute either invented statistics or premature claims about investor access.

**Decision:** Remove the "Cohort target" and "SME bookings" pill block entirely. Simplify the breadcrumb to "Founder / Dashboard" with no stage suffix. Keep only the "Verified profile" text in the verification badge; remove the "Visible to vetted investors" subline. These fields are absent from the production fixture and from the page component.

**Why:** DESIGN.md prohibits invented statistics, cohort labels, and vetted investor claims on the Founder Dashboard. Including them would misrepresent the platform state to the user and to any evaluator reading the report. The report's figure descriptions must match what the screen actually shows.

**Follow-ups:** Update the report figure captions that reference a cohort stat block or a "Series Seed" breadcrumb label. See `docs/pending-report-changes.md` (2026-11-17 entry).

## 2026-11-22: Corpus hashes are LF-normalized
- Context: CI (Linux) failed with a SHA-256 mismatch on fbr_register_income_tax_2026-10-04.txt. Git stores the file with LF, while the Windows working copy is converted to CRLF, and the manifest held the CRLF hash.
- Decision: the manifest stores the SHA-256 of the LF-normalized content. verify_corpus_file normalizes CRLF to LF before hashing, so Windows and Linux agree.
- Scope: only rag/corpus_manifest.md changed (one hash). The text, chunks, question set and dev results are unchanged.
- Note: run_metadata.csv and the constant in run_dev_retrieval.py keep the old CRLF hash as a historical record of the dev run.

## 2026-11-22: Taha's migrations renumbered to 0014-0016
- Context: Taha's backend branch and main both defined revision 0013 (compliance_chunk_metadata on main, startup_verification_requests on his branch), which gave Alembic two heads and failed 3 migration tests.
- Decision: kept main's 0013 unchanged (it may already be applied) and renumbered Taha's unmerged migrations to 0014, 0015 and 0016. The history is now one line.
- Also: his branch had committed merge-conflict markers in 14 files. They were resolved keeping his consent, rate-limit and verification code (HEAD side), the compliance_refusal_threshold setting, and both sides of the docs and .env.example.
- Note: anyone who applied his old 0013 to a local database must reset it.

## 2026-11-22: Answer output limit raised to 4096 tokens
- Context: the first real dev e2e call on gemini-3.6-flash returned truncated JSON (EOF while parsing a string). It is a thinking model, and its hidden reasoning tokens count against max_output_tokens, so the 1200-token limit cut the answer off.
- Decision: raised max_output_tokens from 1200 to 4096 on the shared JSON generation call (_generate_json), the path used for compliance answers. Nothing else changed: temperature stays 0, prompts and prompt versions are unchanged, and retrieval is untouched.
- Scope: this only gives the model room to finish. It does not change what the evaluation measures. It is committed before the test split so that dev and test use the same gateway.
- Open: the final model id is pinned after the dev e2e completes. The free tier allows 20 requests per day per model, so runs resume from the disk cache.
