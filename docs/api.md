# ExpertLink REST API Reference

The ExpertLink API is served at `http://localhost:4000/api`. Interactive OpenAPI / Swagger UI documentation is available at `http://localhost:4000/api/docs`.

---

## Global Headers

| Header | Description |
|---|---|
| `Authorization` | `Bearer <accessToken>` (JWT) |
| `Content-Type` | `application/json` |
| `X-Request-Id` | Optional correlation UUID (generated automatically if omitted) |
| `Idempotency-Key` | UUID string to guarantee idempotent execution for POST `/api/bookings` |

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new user (`CLIENT` or `EXPERT`). |
| `POST` | `/api/auth/login` | Public | Authenticate user, receive JWT access token + refresh token. |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token and issue new token pair. |
| `GET` | `/api/auth/me` | Authenticated | Get current authenticated user profile. |
| `POST` | `/api/auth/logout` | Authenticated | Revoke refresh token and invalidate session. |

---

## 2. Experts (`/api/experts`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/experts` | Public | List experts with pagination and filtering (`industry`, `search`). |
| `GET` | `/api/experts/:id` | Public | Fetch expert profile by user ID. |
| `PUT` | `/api/experts/me` | `EXPERT` | Update own expert profile; triggers vector re-indexing. |
| `GET` | `/api/experts/search/hybrid` | Public | Hybrid search (keyword + semantic vector) with RRF and facets. |

---

## 3. Research Queries (`/api/queries`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/queries` | `CLIENT` | Post a new research query. |
| `GET` | `/api/queries` | `CLIENT` | List own research queries. |
| `GET` | `/api/queries/:id` | `CLIENT`, `ADMIN` | Fetch query details with persisted matches. |
| `POST` | `/api/queries/:id/match` | `CLIENT` | Trigger ML matching (returns `202 Accepted` with `jobId`). |

---

## 4. Bookings & Availability (`/api/bookings`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | `CLIENT` | Create consultation booking (requires `Idempotency-Key`). |
| `GET` | `/api/bookings` | Authenticated | List bookings for current user. |
| `PATCH` | `/api/bookings/:id/status` | Authenticated | Update status (`CONFIRMED`, `COMPLETED`, `CANCELLED`). |
| `POST` | `/api/bookings/availability` | `EXPERT` | Publish availability slots. |
| `GET` | `/api/bookings/availability/:expertId` | Public | Get open availability slots for an expert. |
| `POST` | `/api/bookings/admin/expire-pending` | `ADMIN` | Clean up expired pending bookings (> 24 hours). |

---

## 5. Feedback Loop & Retraining (`/api/feedback`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/feedback/suggestion` | `CLIENT` | Submit relevance feedback on match suggestions. |
| `POST` | `/api/feedback/consultation` | `CLIENT` | Submit 1-5 star review and notes for a completed session. |
| `POST` | `/api/feedback/admin/retrain-now` | `ADMIN` | Trigger BullMQ model retrain and hot-reload in ML service. |

---

## 6. AI Assistant Copilot (`/api/assistant`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/assistant/structure-query` | Authenticated | Convert vague problem draft into structured query & questions. |
| `POST` | `/api/assistant/expert-brief` | Authenticated | Generate pre-call executive brief, 45-min agenda, and pitfalls. |

---

## 7. Background Jobs (`/api/jobs`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/jobs/:id` | Authenticated | Check status of async background job (`match-queue`). |
| `GET` | `/api/jobs/admin/queue-health` | `ADMIN` | Monitor BullMQ queue counts (waiting, active, failed). |

---

## 8. Observability & Health

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Comprehensive health check (PostgreSQL, MongoDB, Redis, ML). |
| `GET` | `/api/health/liveness` | Public | Kubernetes/Docker liveness probe (`200 OK`). |
| `GET` | `/api/health/readiness` | Public | Kubernetes/Docker readiness probe (`200 OK`). |
| `GET` | `/metrics` | Public | Prometheus scrape endpoint (HTTP request durations, counters). |
| `GET` | `/api/docs/spec.json` | Public | Raw OpenAPI 3.0 specification in JSON format. |
| `GET` | `/api/docs/` | Public | Interactive Swagger UI API explorer. |
