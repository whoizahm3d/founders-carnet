# Backend API changes for the frontend

OpenAPI source: [`backend/openapi.json`](../backend/openapi.json). All paths use the `/api/v1` prefix. Bearer authentication is required except where noted.

## Added routes

| Method and path | Role | Request | Success response | Main errors |
|---|---|---|---|---|
| `POST /auth/linkedin/{role}` | Public; role is founder, mentor, investor, or talent | `LinkedInSignInRequest` | 201 for new identity or 200 for returning identity: `{access_token, token_type, user: UserRead}` | 422 invalid role/input; 503 when configured provider is unavailable |
| `POST /founders/me/startups/{startup_id}/verification-request` | Founder, startup owner | `{note}` | 201 `StartupVerificationRequestRead` | 401 unauthenticated; 403 not owner; 404 startup missing; 409 open request exists; 422 invalid input |
| `GET /founders/me/startups/{startup_id}/verification-request` | Founder, startup owner | None | `StartupVerificationRequestRead` (status and reason) | 401; 403 not owner; 404 missing request/startup |
| `GET /admin/startups/verification-queue` | Admin | Optional pagination | List of pending `StartupVerificationRequestRead` | 401; 403 non-admin |
| `POST /admin/startups/{request_id}/decision` | Admin | `{decision: approve|reject, reason}` | `StartupVerificationRequestRead` with reviewer and review time | 401; 403 non-admin; 404 request missing; 409 already decided; 422 missing reason/invalid decision |
| `GET /matching/me/profile` | Mentor, investor, talent | None | `EcosystemProfileRead`; embedding is omitted | 401; 403 wrong role; 404 profile missing |
| `GET /talent/me/profile` | Talent | None | `TalentProfileRead` | 401; 403 wrong role; 404 profile missing |
| `GET /admin/verification/decisions` | Admin | Optional `verification_id`, `reviewer_user_id`, `limit`, `offset` query parameters | Paginated decision records with reviewer, decision, reason, score, band, signals, version, and time | 401; 403 non-admin; 422 invalid pagination |
| `POST /verification/profiles/{profile_user_id}/block` | Authenticated public role | `{reason}` (at least 10 characters) | `ProfileReportRead` | 401; 403 invalid role; 404 target missing; 409 duplicate/self block; 422 short reason |

## Changed routes and processing rules

| Method and path | Role | Request and response | Errors / frontend behavior |
|---|---|---|---|
| `GET /admin/stats` | Admin | No request body; returns `AdminStatsRead` with users by role, pending verification queue, pending appeals, and decisions from the last seven days | 401 unauthenticated; 403 non-admin |
| `POST /users/me/consent/withdraw` | Authenticated user | No body; returns the withdrawn consent record, including a backfilled record when none existed | 401; a later processing request returns 403 `Consent withdrawn` |
| `PUT /matching/me/profile` | Mentor, investor, talent | `EcosystemProfileWrite`; returns `EcosystemProfileRead` | 403 after consent withdrawal; verified status remains for availability-only edits and returns to review after substantive edits |
| `PUT /talent/me/profile` | Talent | `TalentProfileWrite`; returns `TalentProfileRead` | 403 after consent withdrawal |
| `POST /verification/me` and `POST /verification/me/appeals` | Mentor, investor, talent | Existing verification submission and appeal request schemas; existing verification response schemas | 403 after consent withdrawal; talent SECP values are not required |
| `POST /matching/{match_id}/request`, `/accept`, `/decline` | Founder or match candidate | No body; returns `MatchRead` | 403 after consent withdrawal; 404 non-party/missing match; 409 forbidden or repeated transitions, including requester accepting their own request |
| `GET /matching/me` and `GET /matching/startups/{startup_id}` | Authenticated user / startup owner | Existing query pagination and `MatchRead` results | Withdrawn or otherwise ineligible candidates are filtered before pagination/ranking; closed mentors are filtered in SQL |
| `POST /startups/{startup_id}/jobs` | Founder, startup owner | Existing `JobListingWrite`; returns `JobListingRead` | 403 `Startup is not verified` for an owned unverified startup; 404 for missing or non-owned startup |
| `POST /compliance/questions`, `/startups/{startup_id}/readiness`, `/pitch/sessions`, `/pitch/sessions/{session_id}/turns`, `/market-research`, `/resumes/optimize` | Founder; resume route is talent | Existing OpenAPI request/response schemas | 403 after consent withdrawal; 429 generic rate-limit response |
| `POST /auth/login`, registration routes | Public | Existing schemas and response contracts | 429 generic rate-limit response |

Rate limits are 10 requests per minute per IP for login and registration and 20 per minute per IP for AI routes. Limits can be disabled in tests/settings. Error bodies for rate limits are `{"detail":"Rate limit exceeded"}`; unhandled server errors return `{"detail":"Internal server error"}`.
