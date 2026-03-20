# Personal Trainer - Workout Tracking App

## Project Structure

Monorepo with three directories:

- `frontend/` — React 18 + TypeScript + Vite SPA
- `backend/` — Express.js + TypeScript API (Lambda-deployable)
- `infra/` — AWS SAM template (Lambda, API Gateway, DynamoDB, S3, CloudFront)

## Commands

### Frontend

```bash
cd frontend
npm run dev          # Dev server on port 3000 (proxies /api to backend)
npm run build        # tsc -b && vite build
```

### Backend

```bash
cd backend
npm run dev          # ts-node-dev with hot reload on port 3001
npm run build        # tsc
npm run lambda       # tsc && cp package.json dist/
```

### Type Checking

```bash
cd backend && npx tsc --noEmit   # Backend type check
cd frontend && npx tsc -b        # Frontend type check
```

There are no tests, linters, or formatters configured.

## Architecture

- **Frontend** serves a React SPA with React Router. Pages live in `frontend/src/pages/`, reusable components in `frontend/src/components/`, API client in `frontend/src/services/api.ts`.
- **Backend** uses Express with a service layer pattern: `routes/` → `services/` → DynamoDB. Auth via `x-api-key` header middleware on all `/api/*` routes. Wrapped with `serverless-http` for Lambda.
- **Database** is DynamoDB with two tables: `WorkoutSessions` and `ManualRecords`. Both use pay-per-request billing.
- **Types** are defined separately in `frontend/src/types.ts` and `backend/src/types.ts` — keep them in sync manually.

## Code Conventions

- Functional React components only, hooks for state
- Inline styles via `const s: Record<string, React.CSSProperties>` objects
- PascalCase for components/pages, camelCase for services/utilities
- Backend uses async/await, try/catch error handling in route handlers
- No default exports except React components
- TypeScript strict mode in both frontend and backend

## Environment Variables

See `frontend/.env.example` and `backend/.env.example`. Key vars:

- `VITE_API_URL` / `VITE_API_KEY` — frontend API config
- `PORT`, `API_KEY`, `AWS_REGION`, `SESSIONS_TABLE`, `RECORDS_TABLE` — backend config
- `DYNAMODB_ENDPOINT` — set to `http://localhost:8000` for local DynamoDB

## Deployment

AWS SAM in `infra/template.yaml`. Region: eu-west-1. Resources: Lambda (Node 20.x, 256MB), API Gateway with API key auth, DynamoDB tables, S3 + CloudFront for frontend.
