# frontend

Next.js (React) client. Dashboards for the founder, talent, mentor, investor, and admin roles. It talks only to the backend API gateway.

## Environment variables

Copy `.env.example` from the repository root to `.env.local` inside this directory (or to the root `.env`) and fill in real values. All `NEXT_PUBLIC_` variables are visible in the browser; never put secrets there.

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the backend API gateway |
| `NEXT_PUBLIC_USE_MOCK` | `true` | When `true`, all auth calls use a local mock instead of the real API |
| `NEXT_PUBLIC_HIDE_MOCK_BANNER` | `false` | When `true`, hides the info banner on `/login` and `/register`; mock behavior is unchanged |

### Mock mode

When `NEXT_PUBLIC_USE_MOCK` is `true`:

- Role is derived from the email prefix before `@`. Supported prefixes: `founder`, `talent`, `mentor`, `investor`, `admin`. Default is `founder` when the prefix does not match.
- Any password of 8 or more characters is accepted.
- Example: `talent@example.com` with password `password123` logs in as a Talent user.

The real API path (`NEXT_PUBLIC_USE_MOCK=false`) is not affected by any of the mock logic.
