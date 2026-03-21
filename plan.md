# Multi-User Authentication Implementation Plan

## Overview

Replace the single `x-api-key` auth with per-user email/password authentication using JWT tokens. Each user owns their own sessions and records, with full data isolation.

---

## Phase 1: Backend — Users Table + Auth Service

### 1.1 New DynamoDB Table: `Users`

**infra/template.yaml** — add `UsersTable`:
- Partition key: `id` (String, UUID)
- GSI `email-index`: partition key `email` (String) — for login lookups
- PAY_PER_REQUEST billing
- Add `USERS_TABLE` env var to Lambda function

### 1.2 New Dependencies

**backend/package.json** — add:
- `bcryptjs` (password hashing, pure JS — works in Lambda without native binaries)
- `jsonwebtoken` (JWT creation/verification)
- `@types/bcryptjs` and `@types/jsonwebtoken` (dev)

### 1.3 New Types

**backend/src/types.ts** — add:
```ts
interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthPayload {       // JWT payload
  userId: string;
  email: string;
}

interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: { id: string; email: string; displayName: string };
}
```

### 1.4 New Service: `backend/src/services/users.ts`

Functions:
- `createUser(input: RegisterInput)` → `User`
  - Check email uniqueness via GSI query
  - Hash password with bcrypt (10 rounds)
  - Generate UUID, store in Users table
- `getUserByEmail(email: string)` → `User | null`
  - Query GSI `email-index`
- `getUserById(id: string)` → `User | null`
  - GetCommand by primary key
- `verifyPassword(plaintext: string, hash: string)` → `boolean`
  - bcrypt.compare

### 1.5 New Service: `backend/src/services/auth.ts`

Functions:
- `generateToken(user: User)` → `string`
  - Sign JWT with `{ userId: user.id, email: user.email }`, secret from env `JWT_SECRET`, expiry `7d`
- `verifyToken(token: string)` → `AuthPayload`
  - Verify and decode JWT; throw on invalid/expired

### 1.6 Replace Auth Middleware

**backend/src/middleware/auth.ts** — replace `apiKeyAuth`:
- New `jwtAuth` middleware:
  - Extract `Authorization: Bearer <token>` header
  - Call `verifyToken(token)`
  - Attach `req.user = { userId, email }` to request
  - 401 if missing/invalid/expired
- Add TypeScript augmentation for `req.user`:
  ```ts
  declare global {
    namespace Express {
      interface Request {
        user?: AuthPayload;
      }
    }
  }
  ```

### 1.7 New Routes: `backend/src/routes/auth.ts`

- **POST `/api/auth/register`** (no auth required)
  - Validate email format, password min 8 chars, displayName non-empty
  - Call `createUser`, `generateToken`
  - Return `AuthResponse` (201)
  - 409 if email already exists

- **POST `/api/auth/login`** (no auth required)
  - Call `getUserByEmail`, `verifyPassword`
  - Call `generateToken`
  - Return `AuthResponse` (200)
  - 401 if invalid credentials

- **GET `/api/auth/me`** (auth required)
  - Return current user profile (id, email, displayName)

---

## Phase 2: Backend — Data Isolation by User

### 2.1 Schema Changes

Both `WorkoutSessions` and `ManualRecords` tables get:
- New attribute: `userId` (String) on every item
- New GSI `userId-date-index`:
  - Partition key: `userId`
  - Sort key: `date`
  - This replaces full-table scans with efficient per-user queries

**infra/template.yaml** — add GSI definitions to both tables.

### 2.2 Update `backend/src/services/dynamodb.ts`

Every function receives `userId` parameter:

- `createSession(userId, input)` — store `userId` on item
- `getSession(userId, id)` — get by id, then verify `item.userId === userId` (or 404)
- `updateSession(userId, id, input)` — verify ownership before update
- `deleteSession(userId, id)` — verify ownership before delete
- `listSessions(userId, startDate?, endDate?)` — **Query** GSI `userId-date-index` instead of Scan
  - Use `KeyConditionExpression: 'userId = :uid'`
  - Add `ScanIndexForward: false` for descending date order
  - Filter by date range in key condition when provided

### 2.3 Update `backend/src/services/manualRecords.ts`

Same pattern — every function receives `userId`:

- `createManualStrengthPR(userId, input)` — store `userId`
- `createManualWodRecord(userId, input)` — store `userId`
- `getManualRecord(userId, id)` — verify ownership
- `deleteManualRecord(userId, id)` — verify ownership
- `listManualRecords(userId, type?)` — **Query** GSI `userId-date-index`

### 2.4 Update `backend/src/services/records.ts`

- `getStrengthPRs(userId)` — pass userId to listSessions
- `getWodRecords(userId)` — pass userId to listSessions

### 2.5 Update All Route Handlers

Every route handler extracts `req.user!.userId` and passes it to service calls:

- **sessions.ts**: `req.user!.userId` → all service calls
- **records.ts**: `req.user!.userId` → getStrengthPRs, getWodRecords
- **manualRecords.ts**: `req.user!.userId` → all service calls

### 2.6 Update `backend/src/app.ts`

- Mount `/api/auth` routes **without** auth middleware
- Replace `apiKeyAuth` with `jwtAuth` on all `/api/sessions`, `/api/records`, `/api/manual-records` routes

---

## Phase 3: Frontend — Auth Flow

### 3.1 New Types

**frontend/src/types.ts** — add:
```ts
interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}
```

### 3.2 Update API Client

**frontend/src/services/api.ts**:
- Store JWT in `localStorage` under key `auth_token`
- Replace `x-api-key` header with `Authorization: Bearer <token>`
- Add `api.register(email, password, displayName)` → `AuthResponse`
- Add `api.login(email, password)` → `AuthResponse`
- Add `api.getMe()` → `AuthUser`
- Add `api.logout()` — clear localStorage token
- Add response interceptor: on 401, clear token and redirect to `/login`

### 3.3 New Hook: `frontend/src/hooks/useAuth.ts`

Auth context + provider:
```ts
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}
```

- On mount: check localStorage for token → call `api.getMe()` to validate
- `login`: call api.login, store token, set user state
- `register`: call api.register, store token, set user state
- `logout`: call api.logout, clear user state, navigate to `/login`

### 3.4 New Pages

**frontend/src/pages/Login.tsx**:
- Email + password fields
- "Log In" button
- Link to Register page
- Error display for invalid credentials
- Redirect to `/` on success

**frontend/src/pages/Register.tsx**:
- Display name + email + password + confirm password fields
- Client-side validation (email format, password >= 8 chars, passwords match)
- "Create Account" button
- Link to Login page
- Redirect to `/` on success

### 3.5 Update App.tsx

- Wrap app with `AuthProvider`
- Add `/login` and `/register` routes (public)
- Protected route wrapper: redirect to `/login` if not authenticated
- Show loading spinner while auth state initializes

### 3.6 Update Header

- Show user display name / initial avatar
- Add logout action (either button or dropdown)

---

## Phase 4: Infrastructure

### 4.1 `infra/template.yaml` Changes

1. **New `UsersTable`** resource:
   - Partition key: `id` (S)
   - GSI `email-index`: partition key `email` (S)

2. **GSI on `WorkoutSessionsTable`**:
   - `userId-date-index`: partition `userId` (S), sort `date` (S)

3. **GSI on `ManualRecordsTable`**:
   - `userId-date-index`: partition `userId` (S), sort `date` (S)

4. **Lambda environment variables** — add:
   - `USERS_TABLE: !Ref UsersTable`
   - `JWT_SECRET` (from parameter or Secrets Manager)

5. **API Gateway** — remove API key requirement (JWT handles auth now)

### 4.2 Environment Variables

**backend/.env.example** — add:
```
USERS_TABLE=Users-dev
JWT_SECRET=your-secret-here
```

**frontend/.env.example** — remove `VITE_API_KEY` (no longer needed)

---

## Migration Strategy

For existing data (if any production data exists):
1. Deploy tables with new GSIs first (additive, non-breaking)
2. Run a one-time migration script that adds `userId` to all existing items, assigning them to a default "migrated" user account
3. Deploy new backend code
4. Deploy new frontend

For fresh/dev environments: no migration needed — just deploy everything together.

---

## File Change Summary

### New Files (10)
| File | Description |
|------|-------------|
| `backend/src/services/users.ts` | User CRUD + password verification |
| `backend/src/services/auth.ts` | JWT generation + verification |
| `backend/src/routes/auth.ts` | Register, login, me endpoints |
| `frontend/src/pages/Login.tsx` | Login page |
| `frontend/src/pages/Register.tsx` | Registration page |
| `frontend/src/hooks/useAuth.ts` | Auth context + provider |

### Modified Files (13)
| File | Changes |
|------|---------|
| `backend/package.json` | Add bcryptjs, jsonwebtoken |
| `backend/src/types.ts` | Add User, Auth types |
| `backend/src/middleware/auth.ts` | Replace apiKeyAuth → jwtAuth |
| `backend/src/app.ts` | Mount auth routes, swap middleware |
| `backend/src/services/dynamodb.ts` | Add userId to all operations, query GSI |
| `backend/src/services/manualRecords.ts` | Add userId to all operations, query GSI |
| `backend/src/services/records.ts` | Pass userId through |
| `backend/src/routes/sessions.ts` | Extract userId from req.user |
| `backend/src/routes/records.ts` | Extract userId from req.user |
| `backend/src/routes/manualRecords.ts` | Extract userId from req.user |
| `frontend/src/types.ts` | Add AuthUser, AuthResponse |
| `frontend/src/services/api.ts` | JWT storage, auth endpoints, 401 handling |
| `frontend/src/App.tsx` | AuthProvider, protected routes, login/register routes |
| `frontend/src/components/Header.tsx` | User display + logout |
| `infra/template.yaml` | UsersTable, GSIs, env vars |
| `backend/.env.example` | Add USERS_TABLE, JWT_SECRET |
| `frontend/.env.example` | Remove VITE_API_KEY |
