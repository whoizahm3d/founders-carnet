# Founder Dashboard: Report Raw Material

> This file is raw material for the project report. It is not part of the report itself.
> Do not hard-code chapter, section, table or figure numbers.

---

## 1. Implementation

The Founder Dashboard is the primary workspace for a verified founder user. The screen is
divided into 5 functional panels. The hero card displays the founder company name,
verification status badge, and an AI-evaluated composite readiness score on a 1.0 to 5.0
ruler, with a dynamic progress bar, a tier landmark ("Early Explorer", "Gaining Momentum",
or "Investment Ready"), and a plain disclaimer that the score is a rubric guide and not a
funding probability. Opening the "Inspect rubric breakdown" dialog presents a read-only
breakdown of 7 evaluation dimensions (Problem Clarity, Market Definition, Differentiation,
Business Model, Traction, Team, and Scalability), each with its score from 1 to 5, a
one-line reasoning statement, and a recommended next action. Per FR-2, scores are assigned
by the language model and are not editable by the founder. A next action checklist panel
lists up to 7 prioritised actions. A pitch feedback panel shows historical pitch diagnostic
sessions with a simulation notice ("Written by a language model simulation") in place of AI
branding. An investor and mentor match preview shows up to 3 candidate cards with contact
information hidden until both parties accept per FR-7 and NFR-6. The screen runs on typed
fixture data defined in `frontend/src/fixtures/founder-dashboard.ts`. The backend endpoints
it would need in production are: `GET /api/v1/founder/profile`,
`GET /api/v1/readiness/assessment`, `GET /api/v1/pitch/sessions`, and
`GET /api/v1/matches/preview`.

---

## 2. Test Case Tables

### FT-01: Founder Role Authentication and Redirect

| Field | Value |
|---|---|
| **Test Case ID** | FT-01 |
| **QA Test Engineer** | Ali Ahmad |
| **Test Case Version** | 1.0 |
| **Reviewed By** | Shahzeb Imran |
| **Test Date** | 2026-11-17 |
| **Use Case Reference(s)** | FR-23 |
| **Revision History** | 1.0 (2026-11-17): Initial version |
| **Objective** | Verify that signing in with a founder account lands on `/founder/dashboard` and that navigating to another role's dashboard URL redirects the founder back to `/founder/dashboard`. |
| **Product / Version / Module** | The Founder's Carnet / 0.1.0 / Authentication and Routing |
| **Environment** | Next.js 16.4.6, Playwright, mock auth (NEXT\_PUBLIC\_USE\_MOCK=true), Chromium headless, Windows 11 |
| **Assumptions** | The mock authentication system is active. The email `founder@carnet.pk` resolves to the founder role. |
| **Pre-Requisite** | Development server running on port 3000. `npm run test:e2e` used (reuseExistingServer). |

**Test Steps**

| Step | Procedure | Expected Result |
|---|---|---|
| 1 | Navigate to `/login`. Fill the email field with `founder@carnet.pk` and the password field with `password`. Submit the form. | The browser navigates to `/founder/dashboard`. The heading "Munshi Books" is visible on the page. |
| 2 | Navigate directly to `/talent/dashboard`. | The browser is redirected to `/founder/dashboard`. |
| 3 | Navigate directly to `/investor/dashboard`. | The browser is redirected to `/founder/dashboard`. |
| 4 | Navigate directly to `/mentor/dashboard`. | The browser is redirected to `/founder/dashboard`. |
| 5 | Navigate directly to `/admin/dashboard`. | The browser is redirected to `/founder/dashboard`. |

**Comments:** The DashboardLayout component (`src/components/layout/DashboardLayout.tsx`) performs role-based redirect using `router.replace`. FT-01 originally produced a strict-mode locator violation because "Munshi Books" appeared in both a `<strong>` and an `<h2>` element; this was fixed by using `.first()`.

**Status: Passed** (2026-11-17, `npm run test:e2e`, 12/12 passed)

---

### FT-09 (Dashboard Addition): Founder Dashboard Horizontal Scroll

| Field | Value |
|---|---|
| **Test Case ID** | FT-09 (dashboard) |
| **QA Test Engineer** | Shahzeb Imran |
| **Test Case Version** | 1.0 |
| **Reviewed By** | Taha Nawaz |
| **Test Date** | 2026-11-17 |
| **Use Case Reference(s)** | Usability (NFR-10) |
| **Revision History** | 1.0 (2026-11-17): Initial version. Extends the existing FT-09 mobile viewport test to cover `/founder/dashboard`. |
| **Objective** | Verify that the Founder Dashboard produces no horizontal scroll at 390 px (mobile) and at 1440 px (desktop). |
| **Product / Version / Module** | The Founder's Carnet / 0.1.0 / Founder Dashboard |
| **Environment** | Next.js 16.4.6, Playwright, mock auth (NEXT\_PUBLIC\_USE\_MOCK=true), Chromium headless, Windows 11 |
| **Assumptions** | A founder session is injected via `addInitScript` (localStorage `carnet_token` and `carnet_user`). The page does not redirect if the session is valid. |
| **Pre-Requisite** | Development server running on port 3000. |

**Test Steps**

| Step | Procedure | Expected Result |
|---|---|---|
| 1 | Set Chromium viewport to 390 by 844 px. Inject a founder session via localStorage. Navigate to `/founder/dashboard`. Measure `document.documentElement.scrollWidth` and `window.innerWidth`. | `scrollWidth` is less than or equal to `innerWidth` (no horizontal overflow). |
| 2 | Set Chromium viewport to 1440 by 900 px. Inject a founder session via localStorage. Navigate to `/founder/dashboard`. Measure `document.documentElement.scrollWidth` and `window.innerWidth`. | `scrollWidth` is less than or equal to `innerWidth` (no horizontal overflow). |

**Comments:** The `addInitScript` approach is used rather than a full login flow to keep the test focused on layout only and to avoid server-startup timing issues.

**Status: Passed** (2026-11-17, `npm run test:e2e`, 12/12 passed)

---

### FT-11: Readiness Rubric Dialog Read-Only Validation

| Field | Value |
|---|---|
| **Test Case ID** | FT-11 |
| **QA Test Engineer** | Taha Nawaz |
| **Test Case Version** | 1.0 |
| **Reviewed By** | Ali Ahmad |
| **Test Date** | 2026-11-17 |
| **Use Case Reference(s)** | FR-2 |
| **Revision History** | 1.0 (2026-11-17): Initial version |
| **Objective** | Verify that the readiness rubric breakdown dialog shows exactly 7 evaluation dimensions, each with a numeric score, a reasoning description, and a next action, that no founder-editable score controls are present, and that the dialog is accessible (Escape key and Close button both close it). |
| **Product / Version / Module** | The Founder's Carnet / 0.1.0 / Founder Dashboard / Rubric Breakdown Dialog |
| **Environment** | Next.js 16.4.6, Playwright, mock auth (NEXT\_PUBLIC\_USE\_MOCK=true), Chromium headless, Windows 11 |
| **Assumptions** | A founder session is injected via `addInitScript`. Fixture data contains exactly 7 rubric dimensions. |
| **Pre-Requisite** | Development server running on port 3000. The founder dashboard page is fully loaded before interactions begin. |

**Test Steps**

| Step | Procedure | Expected Result |
|---|---|---|
| 1 | Inject a founder session via localStorage. Navigate to `/founder/dashboard`. | Page loads. The hero card shows the composite readiness score. |
| 2 | Click the button labelled "Inspect rubric breakdown". | A dialog appears. The heading "Core Evaluation Dimensions" is visible. |
| 3 | Count the dimension rows inside the scrollable container (`div.divide-y > div`). | Exactly 7 rows are found. |
| 4 | For each of the 7 rows, verify that a score element containing "/ 5" is present, that a description paragraph is present, and that a paragraph beginning with "Next action:" is present. | All 7 rows pass the check. |
| 5 | Assert that no button with text matching "Reset to baseline" or "Apply to dashboard" exists in the dialog. | No such buttons are found. |
| 6 | Assert that no input, select, or range element exists inside the dialog. | No editable controls are found. |
| 7 | Press the Escape key. | The dialog closes. The dialog element is no longer visible. |
| 8 | Re-open the dialog by clicking "Inspect rubric breakdown" again. Click the button labelled "Close". | The dialog closes. The dialog element is no longer visible. |

**Comments:** The score banner at the top of the dialog also contains a "/ 5.0" span for the composite score. Assertions scoped to `div.divide-y > div` rows prevent a spurious count of 8. The button text in the page is "Inspect rubric breakdown" (confirmed from the Playwright ARIA snapshot); the initially guessed text "View rubric breakdown" was corrected.

**Status: Passed** (2026-11-17, `npm run test:e2e`, 12/12 passed)

---

### FT-12: Pitch Feedback Simulation Notice and Match Contact Privacy

| Field | Value |
|---|---|
| **Test Case ID** | FT-12 |
| **QA Test Engineer** | Ali Ahmad |
| **Test Case Version** | 1.0 |
| **Reviewed By** | Shahzeb Imran |
| **Test Date** | 2026-11-17 |
| **Use Case Reference(s)** | FR-7, NFR-6 |
| **Revision History** | 1.0 (2026-11-17): Initial version |
| **Objective** | Verify that the pitch feedback panel carries a plain language model simulation notice and no AI branding, and that no match card in the investor and mentor matches section exposes an email address or telephone number. |
| **Product / Version / Module** | The Founder's Carnet / 0.1.0 / Founder Dashboard / Pitch Feedback and Match Preview |
| **Environment** | Next.js 16.4.6, Playwright, mock auth (NEXT\_PUBLIC\_USE\_MOCK=true), Chromium headless, Windows 11 |
| **Assumptions** | A founder session is injected via `addInitScript`. Fixture data contains 3 match candidates and at least 1 pitch feedback entry. |
| **Pre-Requisite** | Development server running on port 3000. |

**Test Steps**

| Step | Procedure | Expected Result |
|---|---|---|
| 1 | Inject a founder session via localStorage. Navigate to `/founder/dashboard`. | Page loads successfully. |
| 2 | Search the page for the text "Written by a language model simulation". | The text is found at least once in the pitch feedback panel. |
| 3 | Search the page for the text "powered by ai" (case-insensitive). | The text is not found anywhere on the page. |
| 4 | Locate the section with the accessible label "Investor and Mentor Matches". Verify that the names "Ayesha Qureshi", "Hamza Iqbal", and "Sana Rauf" are visible. | All 3 names are visible. |
| 5 | Verify that the text "Contact revealed upon mutual accept" or "Locked until accepted" is visible within the matches section. | At least 1 contact-locked notice is visible. |
| 6 | Extract the full text content of the matches section. Apply an email address regular expression (`/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/`). | 0 matches are found. |
| 7 | Apply a telephone number regular expression (`/(\+92|0)[0-9\s\-]{9,}/`) to the same section text. | 0 matches are found. |

**Comments:** The section heading in the rendered HTML is "Investor and Mentor matches" (mixed case); the ARIA label on the `<section>` element is "Investor and Mentor Matches". The locator `page.locator('section', { hasText: 'Investor and Mentor matches' })` is used because the initially guessed heading text "Matches ready for introduction" did not match the rendered output.

**Status: Passed** (2026-11-17, `npm run test:e2e`, 12/12 passed)

---

## 3. Test Metrics

The metrics below cover all test cases executed across the full `npm run test:e2e` run on
2026-11-17.

| Metric | Value |
|---|---|
| Test cases executed | 12 |
| Test cases passed | 12 |
| Test cases failed | 0 |
| Defect density (failed * 100 / executed) | 0.00 % |

For the 4 new test cases introduced in this task (FT-01, FT-09 dashboard, FT-11, FT-12):

| Metric | Value |
|---|---|
| New test cases written | 4 |
| New test cases executed | 4 |
| New test cases passed | 4 |
| New test cases failed | 0 |

---

## 4. Limitations

1. All data displayed on the Founder Dashboard (readiness scores, rubric dimensions, next
   actions, pitch feedback sessions, and match candidates) comes from typed fixture data
   defined in `frontend/src/fixtures/founder-dashboard.ts`. No backend connection is
   present for the dashboard at this stage.

2. The 7 rubric dimension scores are fixture values only. The AI-evaluated readiness
   assessment described in FR-2 (line 601, `docs/report/main.tex`) has not yet been
   implemented in the backend. The dialog correctly shows scores as read-only, but the
   scores themselves are not generated by the system.

3. No component-level tests (Vitest or React Testing Library) exist for the Founder
   Dashboard. These test types have not been approved for this project yet. Only Playwright
   end-to-end tests are in scope.

4. The pitch diagnostic fixture uses a 5-point scale for session scores (clarity,
   confidence, content). The report section that describes pitch scoring (`main.tex`
   around line 1949) refers to "scores for clarity, confidence and content" without
   specifying the number of dimensions. If a later report section defines a different number
   of pitch scoring dimensions, a mismatch between the fixture and the report will need to
   be resolved and tracked in `docs/pending-report-changes.md`.

5. The mutual-acceptance contact-reveal behaviour is UI-only. The backend endpoint that
   implements the FR-7 mutual-acceptance handshake is not built yet. Contact information
   remains hidden by policy text in the fixture, not by an API call.

---

## 5. FR / NFR ID Verification

The following IDs are cited in the dashboard page (`page.tsx`) and fixture (`founder-dashboard.ts`).
Line numbers are from `docs/report/main.tex`.

| ID | main.tex line | Wording in report | How the screen uses it | Match |
|---|---|---|---|---|
| FR-2 | 601 | "The system gives an AI mentor feedback and readiness score per dimension." | Read-only 7-dimension rubric scores evaluated by the language model, shown in the rubric breakdown dialog. | Yes |
| FR-7 | 618 | "The system matches founders with mentors and investors; contact is hidden until both parties accept." | Match preview cards hide contact text ("Contact revealed upon mutual accept") before mutual acceptance. | Yes |
| FR-23 | 594 | "The system gives a signed token at login; each endpoint is limited by role." | DashboardLayout redirects any user whose role does not match the route's target role. | Yes |
| NFR-6 | 662 | "No API response shows contact details until both users accept." | Contact text is replaced with a lock notice in the match card fixture; no raw contact data is exposed. | Yes |
| FR-1 | (line verified in prior step) | "The system shows the founder a next action checklist." | Next action checklist panel in the two-column layout. | Yes |
| FR-3 | (line verified in prior step) | "The system stores pitch session recordings and transcripts." | Pitch feedback panel shows historical pitch diagnostic sessions from fixture. | Yes |
| FR-15 | (line verified in prior step) | "The system shows the founder their verification status." | Verification badge in the hero card. | Yes |

IDs previously used incorrectly and removed:

| ID | main.tex line | Wording in report | Problem | Action |
|---|---|---|---|---|
| FR-11 | 640 | "The system charges a placement fee on hire confirmation." | Used in a comment about matching; FR-11 is about placement fees, not matching. | Removed from page comments in the prior correction step. |
| FR-12 | 626 | "The system verifies mentor and investor accounts via OAuth." | Used in a comment about contact hiding; FR-12 is about OAuth verification, not contact privacy. | Removed from page comments in the prior correction step. |
