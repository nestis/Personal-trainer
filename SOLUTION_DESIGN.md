# Solution Design — Personal Trainer

## 1. Overview

Personal Trainer is a single-user, serverless workout tracking application designed for CrossFit and functional fitness athletes. It supports planning workout sessions, logging results, automatically computing personal records, and integrating with Claude for AI-powered coaching insights.

The system is structured as a monorepo with three independently deployable modules: a React SPA frontend, an Express.js API backend running on AWS Lambda, and a Cloudflare Workers MCP server for Claude.ai integration.

## 2. Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Frontend** | React | 18.3 | Component-based SPA with hooks |
| **Frontend routing** | React Router | 6.22 | Client-side routing with protected routes |
| **Frontend build** | Vite | 5.4 | Fast HMR, native ESM, simple config |
| **Frontend language** | TypeScript | 5.3 | Strict mode for type safety |
| **Backend** | Express.js | 4.18 | Lightweight, Lambda-compatible via serverless-http |
| **Backend language** | TypeScript | 5.3 | Strict mode, shared type patterns with frontend |
| **Database** | DynamoDB | - | Serverless, pay-per-request, single-digit ms latency |
| **Auth** | Password-based Bearer token | - | Simple single-user auth, no user management overhead |
| **Compute** | AWS Lambda | Node.js 22.x | Zero idle cost, auto-scaling |
| **API Gateway** | AWS API Gateway (REST) | - | Request routing, throttling, managed TLS |
| **CDN** | CloudFront | - | Global edge caching, SPA routing, HTTPS |
| **Static hosting** | S3 | - | Frontend asset storage |
| **MCP Server** | Cloudflare Workers | - | Free tier (100K req/day), edge compute, built-in OAuth |
| **MCP Protocol** | MCP SDK | 1.12 | Streamable HTTP transport for Claude.ai |
| **MCP Auth** | workers-oauth-provider | 0.0.5 | OAuth 2.1 with PKCE, DCR, token management |
| **IaC** | AWS SAM | - | CloudFormation-based, Lambda-native deployment |
| **CI/CD** | GitHub Actions | - | Automated type-check, build, deploy pipelines |

## 3. Architecture

```
                           ┌──────────────────────────┐
                           │       Claude.ai          │
                           │   (MCP Client)           │
                           └────────────┬─────────────┘
                                        │ OAuth 2.1 + Streamable HTTP
                                        ▼
                           ┌──────────────────────────┐
                           │   Cloudflare Workers      │
                           │   MCP Server              │
                           │   ┌────────────────────┐  │
                           │   │ OAuth Provider     │  │
                           │   │ Durable Object     │  │
                           │   │ 10 MCP Tools       │  │
                           │   │ ApiClient          │──┼───┐
                           │   └────────────────────┘  │   │
                           │   KV: OAuth tokens        │   │
                           └──────────────────────────┘   │
                                                          │ Bearer token
┌──────────────┐         ┌──────────────────┐            │
│   Browser    │         │   CloudFront     │            │
│   React SPA  │────────▶│   Distribution   │            │
│              │         │                  │            │
│  localStorage│         │  /       → S3    │            │
│  (password)  │         │  /api/*  → APIGW │            │
└──────────────┘         └────────┬─────────┘            │
                                  │                      │
                                  ▼                      ▼
                         ┌──────────────────┐
                         │  API Gateway     │
                         │  (REST, throttled)│
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────────────────────┐
                         │  Lambda Function                  │
                         │  ┌──────────────────────────────┐│
                         │  │  Express.js App              ││
                         │  │  ┌─────────┐  ┌───────────┐ ││
                         │  │  │ Helmet  │  │ CORS      │ ││
                         │  │  │ RateLimit│  │ Validator │ ││
                         │  │  └─────────┘  └───────────┘ ││
                         │  │  ┌──────────────────────────┐││
                         │  │  │ Routes                   │││
                         │  │  │  /api/sessions           │││
                         │  │  │  /api/records            │││
                         │  │  │  /api/manual-records     │││
                         │  │  │  /api/auth/verify        │││
                         │  │  └────────────┬─────────────┘││
                         │  │               ▼              ││
                         │  │  ┌──────────────────────────┐││
                         │  │  │ Service Layer            │││
                         │  │  │  dynamodb.ts (sessions)  │││
                         │  │  │  records.ts (computed)   │││
                         │  │  │  manualRecords.ts        │││
                         │  │  └────────────┬─────────────┘││
                         │  └───────────────┼──────────────┘│
                         └──────────────────┼───────────────┘
                                            │
                                            ▼
                         ┌──────────────────────────────────┐
                         │  DynamoDB                         │
                         │  ┌──────────────┐ ┌────────────┐ │
                         │  │WorkoutSessions│ │ManualRecords│ │
                         │  │ PK: id       │ │ PK: id     │ │
                         │  │ GSI: userId- │ │ GSI: userId-│ │
                         │  │   date-index │ │   date-index│ │
                         │  └──────────────┘ └────────────┘ │
                         └──────────────────────────────────┘
```

## 4. Data Model

### WorkoutSessions Table

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | String (UUID) | Partition key |
| `userId` | String | Always `"owner"` (single-user) |
| `date` | String (YYYY-MM-DD) | Workout date |
| `status` | String | `"planned"` or `"completed"` |
| `strength` | List | Array of Exercise objects |
| `wod` | Map | Workout of the Day |
| `notes` | String | Optional free-text |
| `createdAt` | String (ISO 8601) | Creation timestamp |
| `updatedAt` | String (ISO 8601) | Last update timestamp |

**GSI:** `userId-date-index` (hash: userId, range: date) — enables listing sessions by date range for a user.

#### Exercise (nested)

```
{ id: string, name: string, sets: ExerciseSet[] }
```

#### ExerciseSet (nested)

```
{ setNumber: number, reps: number, kilos: number, completed: boolean }
```

#### WOD (nested)

```
{ name?: string, description: string, timeSeconds?: number,
  totalReps?: number, avgHeartRate?: number, maxHeartRate?: number }
```

### ManualRecords Table

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | String (UUID) | Partition key |
| `userId` | String | Always `"owner"` |
| `type` | String | `"strength"` or `"wod"` |
| `date` | String (YYYY-MM-DD) | Record date |
| `exercise` | String | Strength only: exercise name |
| `reps` | Number | Strength only |
| `kilos` | Number | Strength only |
| `estimated1RM` | Number | Computed via Epley formula |
| `name` | String | WOD only: workout name |
| `description` | String | WOD only |
| `timeSeconds` | Number | WOD only: completion time |
| `totalReps` | Number | WOD only: AMRAP total |
| `avgHeartRate` | Number | Optional |
| `maxHeartRate` | Number | Optional |
| `notes` | String | Optional |
| `createdAt` | String | ISO 8601 |
| `updatedAt` | String | ISO 8601 |

**GSI:** `userId-date-index` (hash: userId, range: date)

### Access Patterns

| Pattern | Table | Method |
|---------|-------|--------|
| Get session by ID | WorkoutSessions | GetItem (PK: id) + userId check |
| List sessions by date range | WorkoutSessions | Query on GSI (userId + date range) |
| Create/update/delete session | WorkoutSessions | PutItem/DeleteItem with userId condition |
| Compute strength PRs | WorkoutSessions | Query all completed sessions, aggregate in memory |
| Compute WOD records | WorkoutSessions | Query all completed sessions, aggregate in memory |
| CRUD manual records | ManualRecords | GetItem/PutItem/UpdateItem/DeleteItem with userId condition |
| List manual records | ManualRecords | Query on GSI (userId) + optional type filter |

## 5. Authentication & Authorization

### Browser → API

Single-user password-based auth. The password is set via `APP_PASSWORD` environment variable.

1. User enters password in the Login page
2. Frontend calls `POST /api/auth/verify` with `Authorization: Bearer <password>`
3. On success, password is stored in `localStorage`
4. All subsequent requests include `Authorization: Bearer <password>`
5. Backend middleware validates the Bearer token against `APP_PASSWORD`
6. On match, sets `req.userId = 'owner'` for all downstream handlers

**Security controls:**
- Rate limiting on `/api/auth/verify`: 10 attempts per 15 minutes per IP
- API Gateway throttling: 5 req/s sustained, 10 req/s burst
- Helmet security headers
- CORS restricted to the CloudFront distribution URL

### Claude.ai → MCP Server

OAuth 2.1 with PKCE via Cloudflare Workers OAuth Provider.

1. Claude.ai initiates OAuth authorization request
2. MCP server renders a login form at `/authorize`
3. User enters the same `APP_PASSWORD`
4. On match, MCP server completes OAuth flow, issues tokens via workers-oauth-provider
5. Claude.ai uses Bearer tokens for subsequent MCP tool calls
6. MCP server proxies to the backend API using the stored `API_PASSWORD`

**Security controls:**
- HMAC-signed OAuth state (SHA-256) to prevent tampering
- Constant-time HMAC verification
- OAuth token storage in KV
- XSS prevention via `escapeHtml()` on all rendered values

## 6. Computed Records

Strength PRs and WOD records are computed at read time from completed sessions — they are not stored separately.

### Strength PRs

For each exercise, the system finds the best weight lifted at each rep count across all completed sessions:

```
For each completed session:
  For each exercise:
    For each completed set:
      Track max kilos at that rep count
      Compute estimated 1RM using Epley formula: weight * (1 + reps/30)
```

Results are grouped by exercise name (case-insensitive) and sorted alphabetically.

### WOD Records

For each named WOD, the system finds the best (lowest) completion time and builds a history of all attempts:

```
For each completed session:
  If WOD has a name and timeSeconds:
    Track best time, heart rate data, and all attempts
```

### Manual Records

Users can also enter PRs manually (for records achieved outside tracked sessions). These are stored in the ManualRecords table and returned alongside computed records.

## 7. MCP Server Design

The MCP server runs on Cloudflare Workers and acts as a bridge between Claude.ai and the backend API.

### Why Cloudflare Workers (not Lambda)

- Claude.ai requires OAuth 2.1 with PKCE — `workers-oauth-provider` handles this out of the box
- Free tier: 100K requests/day (more than sufficient)
- No new AWS infrastructure needed
- Edge deployment for low latency
- Built-in Durable Objects for MCP session state

### Tools (10)

| Tool | Description |
|------|-------------|
| `get_sessions` | List sessions with date range filter |
| `get_session` | Get single session by ID |
| `create_session` | Create a planned workout session |
| `update_session` | Update session (mark complete, edit) |
| `get_strength_prs` | All computed strength PRs |
| `get_wod_records` | All WOD records with history |
| `get_manual_records` | Manual records with type filter |
| `create_strength_pr` | Log a manual strength PR |
| `create_wod_record` | Log a manual WOD record |
| `get_training_summary` | Aggregated coaching analysis |

### Training Summary

The `get_training_summary` tool is the primary coaching analysis tool. It fetches N weeks of data and computes:

- Sessions per week (trend)
- Average sessions per week
- Volume by exercise (sets, total reps, total kg)
- Current strength PRs with estimated 1RM
- WOD records with attempt counts
- Recovery analysis (max consecutive training days, average rest gaps)

Output is formatted as markdown for Claude to interpret and provide coaching advice.

## 8. Frontend Architecture

### Routing

```
/login              → Login (public only, redirects if authenticated)
/                   → SessionList (protected)
/new                → SessionForm — create (protected)
/session/:id        → SessionDetail (protected)
/session/:id/edit   → SessionForm — edit (protected)
/records            → Records (protected)
```

`ProtectedRoute` redirects to `/login` if no password in localStorage.
`PublicOnlyRoute` redirects to `/` if password exists.

### State Management

- **Auth state:** React Context (`useAuth` hook) backed by localStorage
- **Page data:** Local state via `useState` + `useEffect` fetching from API
- **No global state library** — data is fetched per-page, not cached across routes

### Styling

All styles use inline CSS via typed objects:

```typescript
const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 800, margin: '0 auto', padding: 20 },
  heading: { fontSize: 24, fontWeight: 'bold' },
};
```

No CSS framework, CSS modules, or CSS-in-JS library.

### Key Components

- **Calendar** — Month view showing workout sessions as colored dots (planned=blue, completed=green)
- **ExerciseEditor** — Dynamic form for adding/removing exercises and sets
- **WodEditor** — Form for WOD details (name, description, time/reps, heart rate)
- **Records** — Tabbed view showing strength PRs, WOD records, and manual entries

## 9. Infrastructure

### AWS Resources (SAM template)

| Resource | Type | Configuration |
|----------|------|---------------|
| SessionsTable | DynamoDB | PAY_PER_REQUEST, PITR, SSE, GSI |
| ManualRecordsTable | DynamoDB | PAY_PER_REQUEST, PITR, SSE, GSI |
| ApiFunction | Lambda | Node.js 22.x, 256MB, 30s timeout, 5 reserved concurrency |
| ServerlessRestApi | API Gateway | 5 req/s rate, 10 burst |
| FrontendBucket | S3 | Private, SSE (AES256), CloudFront OAC access only |
| FrontendDistribution | CloudFront | S3 origin + API Gateway origin, SPA error routing |
| CloudFrontOAC | Origin Access Control | SigV4 signing |

### Cloudflare Resources

| Resource | Type |
|----------|------|
| personal-trainer-mcp | Worker |
| OAUTH_KV | KV Namespace (OAuth tokens) |
| MCP_OBJECT | Durable Object (MCP session state) |

### Cost Estimate (low traffic, single user)

| Service | Estimated Monthly Cost |
|---------|----------------------|
| Lambda | ~$0 (free tier) |
| API Gateway | ~$0 (free tier) |
| DynamoDB | ~$0 (pay-per-request, minimal usage) |
| S3 | ~$0.01 |
| CloudFront | ~$0 (free tier) |
| Cloudflare Workers | $0 (free tier) |
| **Total** | **< $1/month** |

## 10. Security

### Implemented Controls

| Control | Location | Description |
|---------|----------|-------------|
| Helmet | Backend `app.ts` | Security headers (CSP, HSTS, X-Frame-Options, etc.) |
| CORS restriction | Backend `app.ts` | Only allows requests from CloudFront domain |
| Rate limiting | Backend `app.ts` | 10 auth attempts per 15 min per IP |
| API Gateway throttling | SAM template | 5 req/s sustained, 10 burst |
| Input validation | Backend `validate.ts` | Type-checks, length limits, field stripping |
| DynamoDB ownership | Backend services | `userId` in ConditionExpression on all writes/deletes |
| HMAC state signing | MCP `index.ts` | Prevents OAuth state tampering |
| Constant-time comparison | MCP `index.ts` | HMAC verification resistant to timing attacks |
| XSS prevention | MCP `index.ts` | HTML escaping on rendered values |
| Path traversal prevention | MCP `api-client.ts` | `assertSafePathSegment()` rejects `/`, `\`, `..` |
| Body size limit | Backend `app.ts` | 10KB max request body |
| Field length limits | Backend `validate.ts` | 500 chars names, 2000 chars descriptions |
| S3 public access block | SAM template | All four block settings enabled |
| DynamoDB encryption | SAM template | SSE enabled on all tables |
| DynamoDB PITR | SAM template | Point-in-time recovery on all tables |
| Lambda concurrency | SAM template | Reserved at 5 to limit blast radius |
| Error sanitization | MCP `tools.ts` | Tool errors return generic messages, not stack traces |

### Accepted Risks

| Risk | Severity | Rationale |
|------|----------|-----------|
| Password in localStorage | Low | Single-user app. Would need httpOnly cookies + CSRF to fix. |
| Single shared password | Low | Intentional single-user design. No user management needed. |
| No audit logging | Low | CloudWatch logs cover Lambda invocations. |

## 11. CI/CD Pipeline

### AWS Deployment (`deploy.yml`)

```
Push to main
    │
    ├─► typecheck (parallel: backend + frontend)
    │
    ├─► build-backend ──► deploy-backend (SAM) ──┐
    │                                              ├─► verify (health check)
    └─► build-frontend ──► deploy-frontend (S3) ──┘
```

- Type-checks run in parallel matrix
- Backend builds Lambda artifact, frontend builds Vite output
- SAM deploy with `AppPassword` parameter override
- Frontend syncs to S3 with immutable cache headers (except `index.html`)
- CloudFront invalidation after frontend upload
- Health check verification (5 attempts with 10s delay)

### MCP Deployment (`deploy-mcp.yml`)

```
Push to main (mcp-server/** changed)
    │
    ├─► typecheck
    │
    └─► deploy (wrangler deploy) ──► verify (health check)
```

- Only triggers on MCP server file changes
- Requires GitHub environment approval
- Verifies worker health after deployment
