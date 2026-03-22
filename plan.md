# Plan: Remote MCP Server for Personal Trainer AI Coach

## Decision: Cloudflare Worker (not Lambda)

Claude.ai requires **OAuth 2.1 with PKCE** for remote MCP servers. Implementing OAuth on Lambda means wiring up Cognito or Auth0 as an authorization server, plus discovery endpoints, Dynamic Client Registration, and token refresh. That's heavy for one user.

**Cloudflare Workers** solve this because:
- `workers-oauth-provider` handles all OAuth 2.1 complexity out of the box (PKCE, DCR, token hashing, refresh)
- Official MCP server templates exist from Cloudflare — battle-tested
- Free tier: 100K requests/day (you'll use ~50/day)
- The Worker calls your **existing deployed API** over HTTPS — no DynamoDB duplication, no code changes to your app
- Uses **Streamable HTTP** transport (the current MCP standard, SSE is deprecated)
- Stateless by nature — perfect fit for Workers

### Cost: $0/month
- Cloudflare Workers free tier
- No new AWS resources
- No API costs (uses your Claude subscription)

---

## Architecture

```
claude.ai (Claude Project with coaching system prompt)
   ↕ (OAuth 2.1 + Streamable HTTP)
Cloudflare Worker (MCP server + OAuth provider)
   ↕ (HTTPS + Bearer auth)
Your existing CloudFront → API Gateway → Lambda → DynamoDB
```

The Worker acts as:
1. **OAuth authorization server** for Claude.ai (via workers-oauth-provider)
2. **MCP tool server** that proxies to your existing API

---

## MCP Tools (what Claude can call)

### Read Tools
| Tool | What it does | Proxies to |
|---|---|---|
| `get_sessions` | List sessions with optional date range | `GET /api/sessions?startDate=&endDate=` |
| `get_session` | Get a single session by ID | `GET /api/sessions/:id` |
| `get_strength_prs` | All strength PRs (computed from sessions) | `GET /api/records/strength` |
| `get_wod_records` | All WOD records with history | `GET /api/records/wods` |
| `get_manual_records` | Manual records (strength or WOD) | `GET /api/manual-records?type=` |
| `get_training_summary` | Aggregated coaching overview for last N weeks | Calls multiple endpoints, computes summary |

### Write Tools
| Tool | What it does | Proxies to |
|---|---|---|
| `create_session` | Create a planned workout | `POST /api/sessions` |
| `update_session` | Update session (mark complete, edit) | `PUT /api/sessions/:id` |
| `create_strength_pr` | Log a manual strength PR | `POST /api/manual-records/strength` |
| `create_wod_record` | Log a manual WOD record | `POST /api/manual-records/wod` |

### The Key Tool: `get_training_summary`
This is what makes the MCP server a coach, not just a data proxy. It calls multiple endpoints and computes:
- Sessions per week trend (last N weeks)
- Volume per exercise (sets x reps x kg) with week-over-week delta
- PR progression timeline per exercise
- WOD time improvements
- Muscle group frequency (inferred from exercise names)
- Rest day patterns and consecutive training days

---

## Implementation Steps

### Step 1: Create project structure
New `mcp-server/` directory at repo root:
```
mcp-server/
├── package.json
├── tsconfig.json
├── wrangler.toml
└── src/
    ├── index.ts          # Worker entry: OAuth + MCP server wiring
    ├── tools.ts          # MCP tool definitions and handlers
    └── api-client.ts     # HTTP client wrapping your existing API
```

### Step 2: Implement OAuth + MCP entry point (`src/index.ts`)
- Use `workers-oauth-provider` to handle all OAuth 2.1 flows
- Use `@modelcontextprotocol/sdk` with Streamable HTTP transport (sessionless mode)
- Register all tools from `tools.ts`
- On each authenticated MCP request, call your API with the stored app password

### Step 3: Implement API client (`src/api-client.ts`)
Simple HTTP client that:
- Takes your CloudFront URL + app password from Worker secrets
- Provides typed methods: `listSessions()`, `getStrengthPRs()`, etc.
- Handles errors and returns clean data to the MCP tools

### Step 4: Implement tools (`src/tools.ts`)
- Define each tool with name, description, input schema (using Zod), and handler
- Each handler calls the API client and returns formatted results
- `get_training_summary` does multi-call aggregation and computes derived metrics

### Step 5: Configure and deploy
```bash
cd mcp-server
npm install
wrangler secret put API_PASSWORD    # your app password
wrangler secret put API_URL         # your CloudFront URL
wrangler deploy
```

### Step 6: Connect to Claude.ai
1. In your Claude Project settings → Integrations → Add MCP Server
2. Enter URL: `https://personal-trainer-mcp.<your-subdomain>.workers.dev/mcp`
3. Claude.ai discovers OAuth, prompts you to authorize (one-time)
4. Tools appear in Claude's toolbox

### Step 7: Set up Claude Project system prompt
Add coaching context to your Claude Project:
```
You are my personal training coach with live access to my workout data via MCP tools.

My profile:
- [Your goals, equipment, schedule, injuries, preferences]

Guidelines:
- Always fetch fresh data before answering — don't rely on conversation history
- Use get_training_summary for overview questions
- Use get_sessions with date ranges for specific periods
- When programming workouts, use create_session to add them directly to my app
- Flag volume concerns, missed muscle groups, or stalled progression
- Suggest deloads after 4-6 weeks of high volume
- Compare WOD times against my previous attempts
```

---

## What Changes in Existing Code?

**Nothing.** The MCP server is a standalone project that calls your existing API. No changes to frontend, backend, or infrastructure.

---

## Summary

| Aspect | Detail |
|---|---|
| Platform | Cloudflare Workers (free tier) |
| Auth | OAuth 2.1 via workers-oauth-provider |
| Transport | Streamable HTTP (sessionless) |
| Data access | Proxies to existing API — no duplication |
| Cost | $0/month |
| Code | ~300 lines TypeScript, 3 source files |
| Changes to existing app | None |
| Client | Claude.ai Projects (browser) |
| Deploy | `wrangler deploy` (seconds) |
