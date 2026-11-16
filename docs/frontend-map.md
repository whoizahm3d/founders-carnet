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
| `/talent/*` | `src/app/(dashboard)/talent/` (dashboard, profile, resume, jobs, matches) |
| `/mentor/*` | `src/app/(dashboard)/mentor/` (dashboard, profile, sessions, startups, feedback) |
| `/investor/*` | `src/app/(dashboard)/investor/` (dashboard, profile, pipeline, matches) |
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
- **TopNav** `TopNav.tsx`: dashboard top bar; props: `user` `onLogout`; renders ROLE_NAVIGATION items + mobile menu trigger + Karachi time
- **MenuOverlay** `MenuOverlay.tsx`: full-screen mobile menu; props: `isOpen` `onClose` `items` `user` `onLogout`
- **DashboardLayout** `DashboardLayout.tsx`: wraps all role routes; reads `useAuth`, guards unauthenticated users and cross-role routes, renders TopNav + Footer
- **Sidebar** `Sidebar.tsx`: present but unused in current routing; kept for reference
- **Footer** `Footer.tsx`: minimal ink band used inside dashboard layouts

---

## Auth, Nav and Fixtures

- **`src/lib/auth.ts`**: `loginApi`, `registerApi`, `authStorage`, `buildMockUser`, `nameFromEmail` fallback; mock mode active when `NEXT_PUBLIC_USE_MOCK !== 'false'`
- **`src/lib/navigation.ts`**: `ROLE_NAVIGATION: Record<UserRole, {label, items}>` keyed by `founder` `talent` `mentor` `investor` `admin`; `NavItem: {label, href, icon?}`
- **`src/context/AuthContext.tsx`**: `AuthProvider`, `AuthContext`, `useAuth`
- **`src/fixtures/founder-dashboard.ts`**: `INITIAL_FOUNDER_DASHBOARD_DATA` for `/founder/dashboard` (company meta, 7-dimension readiness rubric, next actions, pitch feedback logs, matches preview, onboarding checklist)

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
