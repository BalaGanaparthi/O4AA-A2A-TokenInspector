# CLAUDE.md — A2A Identity Chaining

## What this project is

A Next.js 15 demo application that visualises **Okta Agent-to-Agent (A2A) identity chaining** — a pattern where a chain of AI agents propagates an identity (human or machine) across service boundaries using OAuth 2.0 token exchanges.

It is a single-page UI with a live step-by-step token flow, JWT inspector, and config panel. It is deployed to Netlify.

---

## Two scenarios

| Button | Scenario key | Flow |
|--------|-------------|------|
| **Execute NHI** | `'nhi'` | Non-Human Identity — service client authenticates with `client_credentials` grant; produces a pure M2M access token (T1) |
| **Execute HI** | `'hi'` | Human Identity — user signs in to Okta via Authorization Code + PKCE; produces a user access token (T1) |

Both scenarios then run the same 4 downstream steps (T2–T5) to propagate identity through the agent chain.

---

## 5-step token chain

```
Step 1  T1  Service client creds OR user PKCE login  →  access token for ProGearSales Agent
Step 2  T2  Token exchange at Org AS (T1 → id-jag)   →  id-jag targeting ProGearInventory AS
Step 3  T3  JWT bearer grant at ProGearInventory AS   →  A2A access token for ProGearInventory Agent
Step 4  T4  Token exchange at Org AS (T3 → id-jag)   →  id-jag targeting InventoryMCP AS
Step 5  T5  JWT bearer grant at InventoryMCP AS       →  final access token for InventoryMCP API
```

Steps 2 & 4 use RFC 8693 token exchange (`urn:ietf:params:oauth:grant-type:token-exchange`).
Steps 3 & 5 use JWT bearer grant (`urn:ietf:params:oauth:grant-type:jwt-bearer`).
Steps 2–5 authenticate the caller with a signed RS256 `client_assertion` JWT.

---

## Project structure

```
app/
  page.tsx                    # Entry point — renders <A2ADemo />
  api/
    execute/route.ts          # POST — NHI SSE stream (steps 1–5)
    execute-hi/route.ts       # POST — HI SSE stream (steps 1–5, reads hi_access_token cookie)
    auth/
      login/route.ts          # GET  — builds Okta PKCE authorize URL, sets cookies, redirects
      callback/route.ts       # GET  — receives auth code, exchanges for token, sets cookie, redirects
    config/route.ts           # GET  — exposes non-secret env config to the UI as JSON

components/
  A2ADemo.tsx                 # Root client component; owns all state and SSE logic
  FlowPanel.tsx               # Left panel — 3 agent blocks + token step rows
  AgentBlock.tsx              # Individual agent card with collapsible sub-steps
  TokenInspector.tsx          # Centre panel — raw + decoded JWT tabs
  ConfigPanel.tsx             # Right panel — Okta config values, highlights active fields

lib/
  token-steps.ts              # executeStep1–5 — server-side OAuth calls
  jwt-utils.ts                # createClientAssertion — signs RS256 client_assertion JWTs

types/index.ts                # Shared types: StepStatus, TokenData, SSEEvent, AppConfig
```

---

## Key state in A2ADemo

| State | Type | Purpose |
|-------|------|---------|
| `scenario` | `'nhi' \| 'hi'` | Controls UI labels and which API endpoint to call |
| `stepStatuses` | `Record<1-5, StepStatus>` | Per-step idle/running/success/error |
| `tokens` | `Record<'T1'-'T5', TokenData>` | Decoded JWTs for the inspector |
| `running` | `boolean` | Disables buttons during execution |
| `fatalError` | `string \| null` | Top-level error message |

The header title reflects the scenario: `"NHI : A2A Identity Chaining"` or `"Human : A2A Identity Chaining"`.

---

## HI flow details

1. User clicks **Execute HI** → browser follows `<a href="/api/auth/login">` (full navigation, not fetch)
2. `/api/auth/login` generates PKCE verifier/challenge + CSRF state, stores them in httpOnly cookies, and 307-redirects to Okta
3. Okta redirects to `/api/auth/callback?code=...&state=...`
4. Callback validates CSRF state, exchanges code for access token, stores token in `hi_access_token` httpOnly cookie (5-min TTL), redirects to `/?hi=ready`
5. `A2ADemo` detects `?hi=ready` in the URL, sets `scenario = 'hi'`, and `startSSEFlow('/api/execute-hi')` fires automatically
6. `/api/execute-hi` reads `hi_access_token` cookie as T1 and runs steps 2–5; clears cookie after use

---

## SSE protocol

Both `/api/execute` and `/api/execute-hi` stream newline-delimited JSON events:

```
data: {"step":1,"status":"running"}
data: {"step":1,"status":"success","token":"<jwt>"}
data: {"step":2,"status":"running"}
...
data: {"type":"complete"}
```

On error: `{"step":N,"status":"error","error":"..."}` or `{"type":"error","message":"..."}`.

---

## Environment variables

See `.env.example` for the full list. Key groupings:

| Prefix | Purpose |
|--------|---------|
| `OKTA_ORG_URL` | Base URL of the Okta org |
| `HI_*` | Human Identity — PKCE web app client |
| `STEP1_*` | Service client credentials (NHI T1) |
| `STEP2_*` | ProGearSales Agent — token exchange (T2) |
| `STEP3_*` | ProGearSales Agent — JWT bearer grant (T3) |
| `STEP4_*` | ProGearInventory Agent — token exchange (T4) |
| `STEP5_*` | ProGearInventory Agent — JWT bearer grant (T5) |

Steps 2–5 require an RSA private key JWK (`*_PRIVATE_KEY_JWK`) for signing client assertions.

---

## Local development

```bash
./start.sh        # checks .env, installs deps if needed, runs next dev
# OR
npm run dev
```

App runs at **http://localhost:3000**.

For the HI flow, register `http://localhost:3000/api/auth/callback` as a redirect URI on your Okta app.

---

## Deployment

Netlify via `netlify.toml`. Uses `@netlify/plugin-nextjs` for SSR and SSE support. Serverless function timeout is set to 26 s (Pro tier) to accommodate sequential Okta API calls.

Build: `npm run build` → publishes `.next`.

---

## Patterns to preserve

- **SSE streams** must use `force-dynamic` and the `X-Accel-Buffering: no` header.
- **HI login** must use a plain `<a>` tag (not `fetch` or Next.js router) so the browser follows the 307 redirect to Okta correctly.
- **PKCE verifier and state** are stored in httpOnly cookies scoped to 10 minutes; `hi_access_token` is single-use (cleared after `/api/execute-hi` reads it).
- The `scenario` state in `A2ADemo` is the single source of truth for NHI vs HI — all UI labels, descriptions, and API endpoints derive from it.
