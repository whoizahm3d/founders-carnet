# Frontend Map

Generated 2026-11-15. Updated 2026-11-16. Source of truth for routes, components, tokens, and decisions.

---

## Routes and Page Sources

| Route | File |
|---|---|
| `/` | `src/app/(public)/page.tsx` |
| `/login` | `src/app/(auth)/login/page.tsx` |
| `/register` | `src/app/(auth)/register/page.tsx` |
| `/privacy` | `src/app/(public)/privacy/page.tsx` |
| `/terms` | `src/app/(public)/terms/page.tsx` |
| `/founder/dashboard` | `src/app/(dashboard)/founder/dashboard/page.tsx` |
| `/founder/profile` | `src/app/(dashboard)/founder/profile/page.tsx` |
| `/founder/readiness` | `src/app/(dashboard)/founder/readiness/page.tsx` |
| `/founder/pitch` | `src/app/(dashboard)/founder/pitch/page.tsx` |
| `/founder/feedback` | `src/app/(dashboard)/founder/feedback/page.tsx` |
| `/founder/matches` | `src/app/(dashboard)/founder/matches/page.tsx` |
| `/talent/dashboard` | `src/app/(dashboard)/talent/dashboard/page.tsx` |
| `/talent/*` | `src/app/(dashboard)/talent/` (profile, resume, jobs, matches) |
| `/mentor/dashboard` | `src/app/(dashboard)/mentor/dashboard/page.tsx` |
| `/mentor/*` | `src/app/(dashboard)/mentor/` (profile, sessions, startups, feedback) |
| `/investor/dashboard` | `src/app/(dashboard)/investor/dashboard/page.tsx` |
| `/investor/*` | `src/app/(dashboard)/investor/` (profile, pipeline, matches) |
| `/admin/*` | `src/app/(dashboard)/admin/` (dashboard, users, analytics) |

---

## UI Components (`src/components/ui/`)

- **Button** `Button.tsx`: variants: `primary` `secondary` `ghost`; sizes: `sm` `md` `lg`; props: `onDark` `hasBadge` `loading` `leftIcon` `rightIcon`; absolute badge slides from left to right end on hover or focus; symmetric padding keeps label centered
- **Input** `Input.tsx`: props: `label` `hint` `error` `leftIcon` `rightIcon`
- **Textarea** `Input.tsx`: props: `label` `hint` `error`
- **Select** `Input.tsx`: props: `label` `hint` `error` `placeholder` `options`
- **Badge** `Badge.tsx`: variants: `default` `accent` `success` `warning` `error` `dark` `outlined`; props: `icon`
- **Card** `Card.tsx`: variants: `white` `ink` `glass`; padding: `default` `featured` `compact` `flush`; props: `hoverable`
- **StatCard** `StatCard.tsx`: variants: `ink` `white`; props: `label` `value` `subtext` `badge`
- **MatchCard** `MatchCard.tsx`: props: `id` `name` `role` `matchScore` `tags` `explanation` `onConnect` `onDismiss` `actionLabel`
- **ProgressBar** `ProgressBar.tsx`: props: `value` (0-100) `label` `className`
- **EmptyState** `EmptyState.tsx`: props: `title` `description` `action`
- **Dialog** `Dialog.tsx`: props: `open` `onOpenChange` `title` `description` `children`
- **Drawer** `Drawer.tsx`: props: `open` `onOpenChange` `title` `subtitle` `side` (`right`|`left`)
- **Tabs** `Tabs.tsx`: props: `items` (`{id, label, count}[]`) `activeId` `onChange`
- **Spinner** `Spinner.tsx`: variants: `default` `white`; sizes: `small` `medium` `large`
- **ConsentBox** `ConsentBox.tsx`: props: `checked` `onChange` `label` `error` `disabled`
- **Logo** `Logo.tsx`: props: `size` `inverted` `showWordmark` `href`
- **Icons** `icons/index.tsx`: ArrowRight, ArrowLeft, ArrowUpRight, Check, Close, ChevronDown, ChevronUp, ChevronRight, Clock, User, LogOut, Menu, Search, Filter, AlertCircle, Info, Lock, Eye, EyeOff, LinkedIn, Google, GitHub, Document

---

## Layout Components (`src/components/layout/`)

- **PublicNav** `PublicNav.tsx`: top bar for public routes; logo + anchor links + CTA
- **PublicFooter** `PublicFooter.tsx`: variants: `default` (full ink band) `compact` (used on auth screens); logo, copyright, Privacy / Terms / Contact links
- **LegalPageNav** `LegalPageNav.tsx`: back link + section anchor list for `/privacy` and `/terms`
- **AuthLayout** `src/app/(auth)/layout.tsx`: splits viewport: hero panel left, form card right
- **AuthHeroPanel** `src/components/auth/AuthHeroPanel.tsx`: gradient artwork panel rendered inside AuthLayout
- **PageHeader / FormattedHeading** `PageHeader.tsx`: props: `text` `italicWordsCount` `onGradient`
- **TopNav** `TopNav.tsx`: dashboard top bar; props: `user` `onLogout`; renders ROLE_NAVIGATION items + mobile menu trigger + Karachi time. Nav pills hidden below `xl` (1280 px), mobile hamburger shown below `xl`. Each nav pill and the date pill carry `whitespace-nowrap` to prevent wrapping at any supported viewport.
- **MenuOverlay** `MenuOverlay.tsx`: full-screen mobile menu; props: `isOpen` `onClose` `items` `user` `onLogout`
- **DashboardLayout** `DashboardLayout.tsx`: wraps all role routes; reads `useAuth`, guards unauthenticated users and cross-role routes, renders TopNav + PublicFooter compact variant
- **Sidebar** `Sidebar.tsx`: present but unused in current routing; kept for reference
- **Footer** `Footer.tsx`: reuses PublicFooter compact variant with inverted logo, text-white/70, 48px touch targets and focus-visible rings across all dashboard screens

---

## Auth, Nav and Fixtures

- **`src/lib/auth.ts`**: `loginApi`, `registerApi`, `authStorage`, `buildMockUser`, `nameFromEmail` fallback; mock mode active when `NEXT_PUBLIC_USE_MOCK !== 'false'`
- **`src/lib/navigation.ts`**: `ROLE_NAVIGATION: Record<UserRole, {label, items}>` keyed by `founder` `talent` `mentor` `investor` `admin`; `NavItem: {label, href, icon?}`
- **`src/context/AuthContext.tsx`**: `AuthProvider`, `AuthContext`, `useAuth`
- **`src/fixtures/founder-dashboard.ts`**: `INITIAL_FOUNDER_DASHBOARD_DATA` for `/founder/dashboard` (company meta, 7-dimension readiness rubric, next actions, pitch feedback logs, matches preview, onboarding checklist). `cohortTarget` and `activeCorridors` are optional fields. `hubLocation` is `'Karachi Hub'` (no stage suffix). Match tag ticker ranges use a hyphen separator (not an en dash). Pitch feedback `gainNote` fields use `'Focus area: ...'` format without numeric deltas. Mentor match 2 updated to Asad Khan to prevent namespace collision with talent persona.
- **`src/fixtures/talent-dashboard.ts`**: `INITIAL_TALENT_DASHBOARD_DATA` for `/talent/dashboard` (Hamza Iqbal profile, Lahore, 3 operational counts: applications submitted, introductions accepted, startup matches; recommended roles with PKR salary ranges; tracked applications with Applied/In review/Introduction accepted statuses; founding team matches; resume analysis with mandatory simulation notice; onboarding checklist).
- **`src/fixtures/admin-dashboard.ts`**: `INITIAL_ADMIN_DASHBOARD_DATA` for `/admin/dashboard` (Maryam Siddiqui profile, Karachi, operational counts derived from fixtures: escalated profiles, active appeals, decided today; Munshi Books / Bilal Ahmed and Chenab Pay / Daniyal Shah escalation cards; Nida Farooq talent appeal card; recent determinations audit list; zero contact details).

---

## Founder Dashboard (`/founder/dashboard`)

**File:** `frontend/src/app/(dashboard)/founder/dashboard/page.tsx`

**Key changes (2026-11-17 fix pass):**
- Breadcrumb: single white/95 glass pill "Founder / Dashboard"; both labels use `text-text` (ink); contrast 17.72:1.
- Verification badge: `text-accent-deep` on white/95 background; shows "Verified profile" only; contrast 5.51:1. "Visible to vetted investors" subline removed.
- "Cohort target" and "SME bookings" block removed (invented content; not in DESIGN.md).
- Decorative gradient divs (absolute glow blobs) removed; both violated DESIGN.md Rule 4.
- Readiness slider fill: `bg-accent` (flat); was `bg-gradient-to-r from-accent via-[...] to-[...]`.
- Scale ruler labels: `hidden sm:inline` on text labels so only numbers show below `sm`.
- Next actions footnote: no numeric delta; plain prose only.
- "investor underwriting" replaced with "strengthen your profile for investors".
- `{pendingActionsCount} pending` pill: `whitespace-nowrap`.
- Matches section heading: "Investor and mentor *matches*" (italic serif on last word); caption: "Contact details stay hidden until both sides accept."
- Match cards: `{match.similarityScore}% similarity` with `profile similarity` sub-label on all cards (no `% match` text).
- Rubric dialog title: `7 core evaluation dimensions` (sentence case).
- Rubric dialog: `Written by a language model simulation` notice added below h3.

**Overflow (confirmed 2026-11-17):** `scrollWidth === innerWidth` at 390, 768, 1024, 1280, and 1440 px.

---

## Talent Dashboard (`/talent/dashboard`)

**File:** `frontend/src/app/(dashboard)/talent/dashboard/page.tsx`
**Reference:** `frontend/design_reference/talent_dashboard_hamza_iqbal/`
**Legacy CSS Module:** `frontend/src/app/(dashboard)/talent/dashboard/TalentDashboard.module.css` (retained on disk, unimported)

**Key architecture and features (2026-11-19):**
- Breadcrumb: single white/95 glass pill "Talent / Dashboard" with `text-text` and `text-ink` labels.
- View mode switcher: `Active dashboard` vs `First-time onboarding` (persists state locally without backend dependency).
- Hero section: "Welcome back, *Hamza*" with Instrument Serif italic on `Hamza` in `text-carnet-yellow` (`#F5C842`). Subtitle: "Backend developer, Lahore. Track your applications, interviews, and roles that match your profile across Pakistan."
- Profile completeness: interactive bar and GitHub link modal triggering instant update to 100%.
- Ink Monolith Card: "Operational summary", counts ledger (3 applications submitted, 1 introductions accepted, 8 startup matches) with active Lahore profile indicator.
- Recommended roles: "Roles that match your *profile*", 4 roles (Munshi Books, Finja, Ravi Health, Mehran Works) with PKR salary ranges, profile similarity label shown once, and "Apply now" button with circular badge.
- Role Details: reusable `Dialog` component displaying role summary, stack alignment, PKR range, and similarity.
- Founding team matches: "Founding team *matches*", Pakistani startups looking for technical co-builders with introduction request actions.
- Tracked applications: "Tracked *applications*", 3 real applications with statuses: `Applied`, `In review`, `Introduction accepted`.
- Resume analysis: structured competencies, refinement bullets, and mandatory attribution notice: *"Written by a language model simulation"*.
- Privacy disclosure: "Contact details stay hidden until both sides accept." on all role cards and match sections. Zero contact details exposed.
- State handling: Empty, loading, and error states supported.

---

## Mentor Dashboard (`/mentor/dashboard`)

**File:** `frontend/src/app/(dashboard)/mentor/dashboard/page.tsx`
**Reference:** `frontend/design_reference/mentor_dashboard_asad_khan/`
**Legacy CSS Module:** `frontend/src/app/(dashboard)/mentor/dashboard/MentorDashboard.module.css` (retained on disk, unimported)

**Key architecture and features (2026-11-24):**
- Breadcrumb: single white/95 glass pill "Mentor / Dashboard" with `text-text` and `text-ink` labels.
- View mode switcher: `Active dashboard` vs `First-time onboarding` (persists state locally without backend dependency).
- Hero section: "Verified profile" badge, "Welcome back, *Asad*" with Instrument Serif italic on `Asad` in `text-carnet-yellow` (`#F5C842`). Subtitle: "Mentor, Ex-VP Product Finja · Karachi Hub · Review inbound founder requests and manage your active mentees across Pakistan."
- Availability toggle: accessible switch with single label "Open to new mentees" managed via local state.
- Ink Monolith Card: "Operational summary", plain counts derived strictly from fixture arrays (Inbound requests: 3, Active mentees: 4, Advisory matches: 3), with an advisory focus area sub-panel highlighting B2B SaaS, Product ops, Fintech, Unit economics, and Go-to-market.
- Recommended founders: "Recommended *founders*", 3 matches (Indus Logistics, Ravi Health, Korangi Tech) with profile similarity badge (`NN%`) and single `PROFILE SIMILARITY` caption per card, match context with simulation notice *"Written by a language model simulation"*, and "View founder carnet" dialog modal.
- Inbound requests: "Pending *requests*", 3 requests (Munshi Books, Mehran Works, Chenab Pay) with "Accept request", "Decline", and "View details" dialog containing discussion topics, simulation note, and mutual consent disclosure.
- Active mentees: "Active *mentees*", list of ongoing founder engagements with advisory cadence.
- Onboarding guide: 4-step actionable checklist (profile, expertise, availability, requests).
- Privacy disclosure: "Contact details stay hidden until both sides accept." on all request cards, match sections, and dialogs. Zero contact details exposed.
- State handling: Empty, loading, and error states supported.

---

## Investor Dashboard (`/investor/dashboard`)

**File:** `frontend/src/app/(dashboard)/investor/dashboard/page.tsx`
**Reference:** `frontend/design_reference/investor_dashboard_sana_rauf/`
**Legacy CSS Module:** `frontend/src/app/(dashboard)/investor/dashboard/InvestorDashboard.module.css` (retained on disk, unimported)

**Key architecture and features (2026-11-24):**
- Breadcrumb: single white/95 glass pill "Investor / Dashboard" with `text-text` and `text-ink` labels.
- View mode switcher: `Active dashboard` vs `First-time onboarding` (persists state locally without backend dependency).
- Hero section: "Verified profile" badge, "Welcome back, *Sana*" with Instrument Serif italic on `Sana` in `text-carnet-yellow` (`#F5C842`). Subtitle: "Angel Investor, Karachi · Review introduction requests from founders and explore startups aligned with your investment thesis."
- Ink Monolith Card: "Operational summary", plain counts derived strictly from fixture arrays (Inbound requests: 2, Active introductions: 2, Recommended founders: 3), with an investment thesis panel highlighting Fintech, Digital commerce, Pre-seed, and ticket range PKR 2.5M to 10M.
- Recommended founders: "Recommended *founders*", 3 matches (Munshi Books, Chenab Pay, Mehran Works) with profile similarity badge (`NN%`) and single `PROFILE SIMILARITY` caption per card, match context with simulation notice *"Written by a language model simulation"*, "View founder carnet" dialog modal, and "Request introduction" action.
- Inbound requests: "Pending *requests*", 2 requests (Indus Logistics, Ravi Health) with "Accept request", "Decline", and "View details" dialog containing discussion topics, simulation note, and mutual consent disclosure.
- Active introductions: "Active *introductions*", list of active founder engagements.
- Onboarding guide: 4-step actionable checklist (profile, thesis, requests, founders).
- Privacy disclosure: "Contact details stay hidden until both sides accept." on all request cards, match sections, and dialogs. Zero contact details exposed.
- State handling: Empty, loading, and error states supported.

---

## Admin Dashboard (`/admin/dashboard`)

**File:** `frontend/src/app/(dashboard)/admin/dashboard/page.tsx`
**Reference:** `frontend/design_reference/admin_console/`
**Legacy CSS Modules:** `frontend/src/app/(dashboard)/admin/dashboard/AdminQueue.module.css`, `frontend/src/components/layout/Dashboard.module.css` (retained on disk, unimported)

**Key architecture and features (2026-11-25):**
- Breadcrumb: single white/95 glass pill "Admin / Dashboard" with `text-text` and `text-ink` labels.
- View mode switcher: `Active queue` vs `Appeals review` (persists state locally without backend dependency).
- Hero section: "Admin console" badge, "Welcome back, *Maryam*" with Instrument Serif italic on `Maryam` in `text-carnet-yellow` (`#F5C842`). Subtitle: "Platform Administrator · Karachi · Review escalated profiles and appeals. Rejection is final."
- Ink Monolith Card: "Operational summary", plain counts derived strictly from fixture arrays (Escalated profiles, Appeals, Decided today), with a review protocol panel stating review rules strictly from existing page.
- Escalation cards: "Active human *escalations*", cards for Munshi Books (Bilal Ahmed) and Chenab Pay (Daniyal Shah) with signals (LinkedIn, Link check, Completeness, SECP registration with plain Provided label), readiness score with caption "A rubric guide, not a funding probability", simulation notice *"Written by a language model simulation"*, reason input, inspect details dialog, and reject/approve actions with confirmation dialog.
- Appeals adjudication: "Appeals *adjudication*", single appeal review for Nida Farooq (Talent profile, Karachi) with appeal statement, evidence files, signals, reason input, and uphold/approve actions.
- Recent determinations: "Recent determinations", audit log of decisions made today.
- Finality wording: strictly consistent ("Rejection is final." and "Rejection is final. The user cannot appeal.").
- Privacy disclosure: "Contact details stay hidden until both sides accept." on all review cards, dialogs, and sections. Zero contact details exposed.
- State handling: Local confirmation dialog for determinations, inspect details modal.

---

## Design Tokens (defined in `globals.css` and `tailwind.config.ts`)

Colors: `ink` `cream` `amber` `fire` `rust` `dark-end` `surface-*` `state-*`
Gradients: `--gradient-artwork` (single shared page gradient token)
Typography: `font-sans` (Hanken Grotesk) `font-mono` (JetBrains Mono)
Spacing / radius / shadow: `radius-pill` `shadow-card` `shadow-glass`
Backdrop: `backdrop-blur-glass`

---

## Decisions

- **Mock mode role from email prefix**: role determined from email prefix (`founder@`, `talent@`, `mentor@`, `investor@`, `admin@`) inside mock branch of `auth.ts`
- **`NEXT_PUBLIC_HIDE_MOCK_BANNER`**: hides mock banner on `/login` and `/register` when true; mock behavior unchanged
- **Gradient token**: single `--gradient-artwork` radial gradient in `globals.css`; all screens inherit via `.bg-page-gradient`; no second gradient definition allowed
- **No social login**: LinkedIn / Google / GitHub buttons rendered as disabled with `(Not available yet)` captions
- **Shared PublicNav and PublicFooter**: used across all public routes including `/login` and `/register`
- **Founder Dashboard**: rebuilt from `founder_dashboard_bilal_ahmed` prototype; features interactive rubric evaluation dialog, active vs onboarding toggle, and plain language model marks without AI badges or sparkles

---

## Known Gaps (see `docs/api_gaps.md`)

- Real auth endpoints not yet integrated; `loginApi` and `registerApi` fall back to mock
- Match data is static placeholder; `/*/matches` pages use seeded mock objects
- Readiness and pitch scoring endpoints not built; `PlaceholderPage` stands in
- File upload for resume not wired; `talent/resume` page is a shell
- Admin analytics endpoint absent; `/admin/analytics` renders empty state
