# API Gaps

Endpoints and capabilities required or surfaced by frontend screens that the backend does not currently support.

| Route / Feature | Missing Endpoint / Capability | Current Frontend Handling | Backend Requirement / Gap |
| --- | --- | --- | --- |
| `/login`, `/register` | LinkedIn OAuth (`/auth/linkedin`) | Displayed as visible but disabled button with explanatory tooltip | Real LinkedIn OAuth callback and token exchange endpoint not implemented in backend |
| `/login`, `/register` | Google OAuth (`/auth/google`) | Displayed as visible but disabled button | Google OAuth provider and callback endpoints not implemented in backend |
| `/login`, `/register` | GitHub OAuth (`/auth/github`) | Displayed as visible but disabled button | GitHub OAuth provider and callback endpoints not implemented in backend |
| `/login` | Forgot Password (`/auth/forgot-password`) | Displayed as visible but disabled link with tooltip | Password reset / email token recovery flow not supported by backend |
| `/login` | Remember Me / Persistent Session | Displayed as visible but disabled checkbox with tooltip | Refresh tokens or persistent session expiry flags not supported by backend |
| `/` (Landing page) | Contact Message (`/contact` or `/feedback/inquiry`) | "Send message" button disabled with "(Not available yet)" caption | Public inquiry / contact message submission endpoint not implemented in backend |
