# ExpertLink Security Architecture & OWASP Checklist

This document details the security architecture, threat model mitigations, and OWASP Top 10 compliance measures enforced across the ExpertLink platform.

---

## 1. Authentication & Session Security

### Dual-Token Architecture with Reuse Detection
- **Short-Lived Access Tokens**: Signed with `RS256` or strong `HS256` with a 15-minute expiration (`15m`). Contains only non-sensitive claims (`userId`, `role`).
- **Cryptographic Refresh Tokens**: 30-day UUIDs stored as SHA-256 hashes in PostgreSQL (`RefreshToken` table).
- **Strict Token Rotation**: Every refresh request revokes the previous refresh token and issues a new pair.
- **Replay & Reuse Detection**: If an already-revoked refresh token is presented (indicating a potential stolen credential replay attack), the system immediately revokes **all** active refresh tokens for that user ID, forcing re-authentication across all devices.

### Password Security
- **Bcrypt Hashing**: Passwords are salted with 12 salt rounds before storage (`bcryptjs.hash(password, 12)`).
- **Complexity Requirements**: Enforced by Zod schemas: minimum 8 characters, requiring mixed-case and numbers.

---

## 2. Role-Based Access Control (RBAC)

Three distinct roles are enforced via `authorize('CLIENT' | 'EXPERT' | 'ADMIN')` middleware:
1. **CLIENT**:
   - Can create research queries (`POST /api/queries`).
   - Can trigger matching pipelines on own queries.
   - Can book expert consultation slots.
   - Cannot modify expert profile embeddings or access system analytics.
2. **EXPERT**:
   - Can edit own profile and publish availability slots.
   - Re-indexes 384-dim semantic embedding on profile update.
   - Cannot view or manage other experts' bookings.
3. **ADMIN**:
   - Access to platform overview KPIs (`GET /api/analytics/overview`).
   - Access to BullMQ queue health (`GET /api/jobs/admin/queue-health`).
   - Authority to trigger ML ranker retraining (`POST /api/feedback/admin/retrain-now`).

---

## 3. Defense-in-Depth & Network Hardening

### Idempotency & Concurrency Protection
- **Idempotency-Key Header**: Required on sensitive mutation endpoints like `POST /api/bookings`. Prevents accidental double-charging or duplicate bookings during network retries.
- **Double-Booking Prevention**: Composite unique constraint on `(expertId, scheduledAt)` in PostgreSQL guarantees atomic serialization at the database layer, returning `HTTP 409 Conflict` on overlap.

### Injection Defense
- **SQL Injection**: Handled via Prisma parameterized queries. Raw queries (`$queryRaw`) strictly use tagged template literals.
- **NoSQL Injection**: MongoDB queries use Mongoose schema validation and sanitize user input before passing into query filters.
- **XSS & Security Headers**: Helmet middleware configures `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Strict-Transport-Security`.

### Rate Limiting
- Configurable per-IP rate limiting:
  - Auth routes (`/api/auth/*`): 10 requests per 15 minutes.
  - API general routes: 100 requests per 15 minutes.
  - Return `HTTP 429 Too Many Requests` with `Retry-After` header.

### Request Body Sizing
- Strict 2MB payload ceiling (`express.json({ limit: '2mb' })`) prevents memory exhaustion denial-of-service (DoS) attacks.

---

## 4. OWASP Top 10 Compliance Checklist

| Vulnerability Category | ExpertLink Mitigation | Status |
|---|---|---|
| **A01: Broken Access Control** | Centralized `authenticate` + `authorize(...)` middleware, resource ownership checks (`query.clientId === req.user.id`). | ✅ PASS |
| **A02: Cryptographic Failures** | Bcrypt 12 rounds, JWT HS256, TLS-only cookies/headers, SHA-256 refresh token hashing. | ✅ PASS |
| **A03: Injection** | Prisma parameterized SQL, Zod schema sanitization, Mongoose strict types. | ✅ PASS |
| **A04: Insecure Design** | Idempotency keys, atomic slot collision prevention, token reuse invalidation. | ✅ PASS |
| **A05: Security Misconfiguration** | Helmet headers, disabled `x-powered-by`, explicit CORS origin allowlist. | ✅ PASS |
| **A06: Vulnerable & Outdated Components** | Automated `npm audit` in CI, pinned dependency versions. | ✅ PASS |
| **A07: Identification & Auth Failures** | Token rotation, refresh replay detection, brute-force rate limits on `/api/auth/login`. | ✅ PASS |
| **A08: Software & Data Integrity Failures** | GitHub Actions signed CI, deterministic npm lockfiles (`package-lock.json`). | ✅ PASS |
| **A09: Security Logging & Monitoring** | Pino JSON logger with `requestId`, Prometheus `/metrics`, Grafana dashboards. | ✅ PASS |
| **A10: Server-Side Request Forgery (SSRF)** | ML service and LLM endpoints strictly isolated via internal Docker networks. | ✅ PASS |
