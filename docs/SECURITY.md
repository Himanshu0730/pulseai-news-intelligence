# PulseAI Security Architecture & Data Protection

## 1. Authentication & JWT Hardening
- **Password Security**: Passwords hashed using `bcryptjs` with salt factor 10.
- **JWT Protection**: Tokens signed with server-side `JWT_SECRET` and enforced via `authMiddleware.ts`.
- **Guest Rate-Limiting**: IP and `x-guest-id` rate limiting enforced via `guestLimitMiddleware.ts` to prevent scraping.

## 2. API Key Protection
- **Zero Client Exposure**: Secret keys (`GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`, `NEWS_API_KEY`, `GNEWS_API_KEY`, `DATABASE_URL`) reside strictly on the Node.js server.
- **Client Proxies**: All AI and news requests pass through `/api/v1/` routes.

## 3. Database Isolation
- **PostgreSQL Connection Pool**: Managed via singleton pattern in `server/db/index.ts` to prevent pool exhaustion.
- **Parameterized SQL**: All database queries use parameterized inputs (`$1, $2`) to eliminate SQL injection risks.
