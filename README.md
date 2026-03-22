# Personal Trainer — Workout Tracking App

Full-stack serverless application for planning and logging CrossFit/functional fitness workouts, tracking personal records, and getting AI-powered coaching via Claude.

## Prerequisites

- **Node.js** 22.x (matches Lambda runtime)
- **npm** 10+
- **AWS CLI** v2 configured with credentials for `eu-west-1`
- **AWS SAM CLI** for infrastructure deployment
- **DynamoDB Local** (optional, for local dev)
- **Wrangler CLI** (`npm i -g wrangler`) for MCP server deployment
- **Cloudflare account** with Workers enabled (free tier)

## Project Structure

```
├── frontend/          React 18 + Vite SPA
├── backend/           Express.js + TypeScript API (Lambda-deployable)
├── mcp-server/        Cloudflare Workers MCP server (Claude.ai integration)
├── infra/             AWS SAM template
└── .github/workflows/ CI/CD pipelines
```

## Local Development

### 1. Backend

```bash
cd backend
cp .env.example .env        # edit APP_PASSWORD and other vars
npm install
npm run dev                  # starts on port 3001 with hot reload
```

Required env vars (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `APP_PASSWORD` | `changeme` | **Change this.** Bearer token password |
| `AWS_REGION` | `eu-west-1` | DynamoDB region |
| `SESSIONS_TABLE` | `WorkoutSessions` | DynamoDB table name |
| `RECORDS_TABLE` | `ManualRecords` | DynamoDB table name |
| `DYNAMODB_ENDPOINT` | `http://localhost:8000` | Set for local DynamoDB |

To use DynamoDB Local:

```bash
docker run -p 8000:8000 amazon/dynamodb-local
# Then create tables matching infra/template.yaml schema
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                  # starts on port 3000, proxies /api → localhost:3001
```

The Vite dev server proxies `/api` requests to the backend automatically.

### 3. MCP Server (local)

```bash
cd mcp-server
npm install
npx wrangler dev             # starts local Cloudflare Worker
```

Requires secrets set via `wrangler secret put` or a `.dev.vars` file:

```
API_URL=http://localhost:3001
API_PASSWORD=changeme
COOKIE_ENCRYPTION_KEY=any-32-character-random-string!!
```

## Type Checking

```bash
cd backend && npx tsc --noEmit
cd frontend && npx tsc -b
cd mcp-server && npx tsc --noEmit
```

No tests, linters, or formatters are configured.

## Building

### Backend (for Lambda)

```bash
cd backend
npm run lambda               # tsc && cp package.json package-lock.json dist/
cd dist && npm ci --omit=dev # install production deps in output
```

Output: `backend/dist/`

### Frontend

```bash
cd frontend
npm run build                # tsc -b && vite build
```

Output: `frontend/dist/`

## Deployment

### AWS (Backend + Frontend + Infra)

Deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`) on push to `main`. It can also be triggered manually with environment selection (dev/prod).

#### Manual SAM deployment:

```bash
# Build backend first
cd backend && npm run lambda && cd dist && npm ci --omit=dev && cd ../..

# Build frontend
cd frontend && npm run build && cd ..

# Deploy infrastructure + Lambda
cd infra
sam build
sam deploy \
  --parameter-overrides AppPassword=YOUR_SECURE_PASSWORD \
  --stack-name workout-tracker-prod \
  --capabilities CAPABILITY_IAM \
  --region eu-west-1 \
  --resolve-s3

# Deploy frontend to S3 + invalidate CloudFront
BUCKET=$(aws cloudformation describe-stacks --stack-name workout-tracker-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text)
CF_ID=$(aws cloudformation describe-stacks --stack-name workout-tracker-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text)

aws s3 sync frontend/dist/ s3://$BUCKET/ \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"
aws s3 cp frontend/dist/index.html s3://$BUCKET/index.html \
  --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"
```

### MCP Server (Cloudflare Workers)

Automated via `.github/workflows/deploy-mcp.yml` on push to `main` when `mcp-server/**` files change.

#### Manual deployment:

```bash
cd mcp-server

# First-time setup: create KV namespace and update wrangler.toml
npx wrangler kv namespace create OAUTH_KV
# Copy the returned ID into wrangler.toml [kv_namespaces] section

# Set secrets
npx wrangler secret put API_URL          # your CloudFront/API Gateway URL
npx wrangler secret put API_PASSWORD     # same password as backend
npx wrangler secret put COOKIE_ENCRYPTION_KEY  # 32-char random string

# Deploy
npx wrangler deploy
```

After deployment, connect from Claude.ai: **Settings → Integrations → Add MCP Server** using the worker URL + `/mcp`.

## CI/CD Pipelines

### `deploy.yml` — AWS deployment

1. Type-checks backend and frontend in parallel
2. Builds backend artifact (Lambda bundle) and frontend (Vite build)
3. Deploys infrastructure via SAM (requires GitHub environment approval)
4. Syncs frontend to S3 and invalidates CloudFront
5. Verifies deployment with health check

### `deploy-mcp.yml` — Cloudflare deployment

1. Type-checks MCP server
2. Deploys via `wrangler deploy` (requires GitHub environment approval)
3. Verifies worker is responding

### Required GitHub Secrets

| Secret | Used by | Description |
|--------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | deploy.yml | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | deploy.yml | AWS credentials |
| `APP_PASSWORD` | deploy.yml | Application password |
| `CLOUDFLARE_API_TOKEN` | deploy-mcp.yml | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | deploy-mcp.yml | Cloudflare account ID |
| `MCP_WORKER_URL` | deploy-mcp.yml | Deployed worker URL for verification |

## API Reference

See [API.md](./API.md) for full REST API documentation.

**Quick overview:**

```
POST   /api/auth/verify              Verify password (rate limited)
GET    /api/sessions                  List sessions
POST   /api/sessions                  Create session
GET    /api/sessions/:id              Get session
PUT    /api/sessions/:id              Update session
DELETE /api/sessions/:id              Delete session
GET    /api/records/strength          Computed strength PRs
GET    /api/records/wods              Computed WOD records
GET    /api/manual-records            List manual records
POST   /api/manual-records/strength   Create manual strength PR
POST   /api/manual-records/wod        Create manual WOD record
PUT    /api/manual-records/wod/:id    Update manual WOD record
DELETE /api/manual-records/:id        Delete manual record
GET    /health                        Health check (no auth)
```

All `/api/*` endpoints require `Authorization: Bearer <password>` header.
