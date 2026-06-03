# Deploy to Netlify

## Prerequisites

- A [Netlify account](https://netlify.com) (free tier works for initial testing)
- [Node.js 20+](https://nodejs.org) installed locally
- The project builds cleanly: `npm run build`
- Git installed locally

---

## What gets deployed

| Route | Type | Notes |
|---|---|---|
| `/` | SSR Page | React UI |
| `/api/execute` | Serverless Function | SSE stream — NHI 5-step chain |
| `/api/execute-hi` | Serverless Function | SSE stream — HI 5-step chain |
| `/api/auth/login` | Serverless Function | PKCE + redirect to Okta |
| `/api/auth/callback` | Serverless Function | Code exchange + cookie |
| `/api/config` | Serverless Function | Returns non-secret env vars |

> **Timeout note:** The 5-step A2A chain makes 5 sequential Okta token requests. On Netlify's free tier the function timeout is **10 seconds**. Upgrade to a paid plan for the **26-second** limit if you see timeouts.

---

## Option A — Deploy with Netlify CLI

### Step 1 — Install the Netlify CLI

```bash
npm install -g netlify-cli
netlify --version
```

### Step 2 — Authenticate with Netlify

```bash
netlify login
```

A browser window opens. Sign in and authorise the CLI.

### Step 3 — Initialise git (if not already)

```bash
git init
git add .
git commit -m "Initial commit — A2A Identity Chaining"
```

> Make sure `.gitignore` includes `.env` — **never commit real credentials.**

### Step 4 — Create the Netlify site

```bash
netlify init
```

When prompted:
- **What would you like to do?** → `Create & configure a new site`
- **Team** → select your Netlify team
- **Site name** → e.g. `a2a-identity-chaining`
- **Build command** → `npm run build` *(auto-detected from netlify.toml)*
- **Publish directory** → `.next` *(auto-detected)*

### Step 5 — Set environment variables

All secrets must be set in Netlify — they are never read from `.env` in production.

```bash
# Core
netlify env:set OKTA_ORG_URL             "https://your-org.oktapreview.com"

# Step 1 — Service client (NHI)
netlify env:set STEP1_AUTH_SERVER_ID     "your_auth_server_id"
netlify env:set STEP1_CLIENT_ID          "your_client_id"
netlify env:set STEP1_CLIENT_SECRET      "your_client_secret"
netlify env:set STEP1_SCOPE              "agent.invoke"
netlify env:set STEP1_RESOURCE           "https://progear.com/sales"

# Step 2 — ProGearSales Agent (token exchange → id-jag)
netlify env:set STEP2_CLIENT_ID          "your_progear_sales_client_id"
netlify env:set STEP2_AUDIENCE           "https://your-org.oktapreview.com/oauth2/your_inventory_as_id"
netlify env:set STEP2_RESOURCE           "https://progear.com/inventory"
netlify env:set STEP2_SCOPE              "agent.invoke"
netlify env:set STEP2_PRIVATE_KEY_JWK    '{"alg":"RS256","kty":"RSA",...}'

# Step 3 — ProGearSales at ProGearInventory AS (JWT bearer)
netlify env:set STEP3_AUTH_SERVER_ID     "your_inventory_as_id"
netlify env:set STEP3_CLIENT_ID          "your_progear_sales_client_id"
netlify env:set STEP3_PRIVATE_KEY_JWK    '{"alg":"RS256","kty":"RSA",...}'

# Step 4 — ProGearInventory Agent (token exchange → id-jag)
netlify env:set STEP4_CLIENT_ID          "your_progear_inventory_client_id"
netlify env:set STEP4_AUDIENCE           "https://your-org.oktapreview.com/oauth2/your_inventorymcp_as_id"
netlify env:set STEP4_SCOPE              "agent.invoke"
netlify env:set STEP4_PRIVATE_KEY_JWK    '{"alg":"RS256","kty":"RSA",...}'

# Step 5 — ProGearInventory at InventoryMCP AS (JWT bearer)
netlify env:set STEP5_AUTH_SERVER_ID     "your_inventorymcp_as_id"
netlify env:set STEP5_CLIENT_ID          "your_progear_inventory_client_id"
netlify env:set STEP5_PRIVATE_KEY_JWK    '{"alg":"RS256","kty":"RSA",...}'

# HI flow — Web App
# ⚠ Set HI_CALLBACK_URL after Step 7 once you know your Netlify site URL
netlify env:set HI_CLIENT_ID             "your_hi_client_id"
netlify env:set HI_CLIENT_SECRET         "your_hi_client_secret"
netlify env:set HI_AUTH_SERVER_ID        "your_auth_server_id"
netlify env:set HI_SCOPE                 "openid agent.invoke"
netlify env:set HI_RESOURCE              "https://progear.com/sales"
netlify env:set HI_CALLBACK_URL          "https://<your-site>.netlify.app/api/auth/callback"
```

> For JWK values, paste the entire single-line JSON string as the value.

### Step 6 — Deploy to a draft URL

```bash
netlify deploy --build
```

Builds locally and uploads to a draft URL (e.g. `https://64abc123--a2a-identity-chaining.netlify.app`). Test before promoting to production.

### Step 7 — Register the callback URL in Okta

1. **Okta Admin Console** → **Applications** → your HI web app
2. **Sign On** tab → **Redirect URIs**
3. Add: `https://<your-site>.netlify.app/api/auth/callback`
4. Save

### Step 8 — Update HI_CALLBACK_URL

```bash
netlify env:set HI_CALLBACK_URL "https://<your-site>.netlify.app/api/auth/callback"
```

### Step 9 — Promote to production

```bash
netlify deploy --build --prod
```

App is live at `https://<your-site>.netlify.app`.

### Step 10 — Verify

```bash
# App loads
curl -s -o /dev/null -w "%{http_code}" https://<your-site>.netlify.app
# → 200

# Config endpoint returns env vars
curl -s https://<your-site>.netlify.app/api/config | python3 -m json.tool

# NHI SSE stream starts
curl -s -X POST https://<your-site>.netlify.app/api/execute --no-buffer | head -5

# HI login redirects to Okta
curl -sI https://<your-site>.netlify.app/api/auth/login | grep location
```

---

## Option B — Deploy from Netlify UI (via GitHub)

No CLI required. Netlify pulls directly from your GitHub repository and builds on every push.

### Step 1 — Push the project to GitHub

```bash
git init
git add .
git commit -m "Initial commit — A2A Identity Chaining"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

> Make sure `.gitignore` includes `.env` — **never commit real credentials.**

### Step 2 — Create a new site in the Netlify UI

1. Go to **[app.netlify.com](https://app.netlify.com)**
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** as the Git provider and authorise Netlify if prompted
4. Search for and select your repository

### Step 3 — Configure build settings

Netlify auto-detects these from `netlify.toml` — confirm they are correct:

| Setting | Value |
|---|---|
| Branch to deploy | `main` |
| Build command | `npm run build` |
| Publish directory | `.next` |

Click **Deploy site**. The first build will fail if env vars are not yet set — that is expected. Continue to the next step.

### Step 4 — Set environment variables in the Netlify UI

1. In your site dashboard go to **Site configuration** → **Environment variables**
2. Click **Add a variable** → **Add a single variable** for each entry below

| Key | Value |
|---|---|
| `OKTA_ORG_URL` | `https://your-org.oktapreview.com` |
| `STEP1_AUTH_SERVER_ID` | your ProGearSales auth server ID |
| `STEP1_CLIENT_ID` | your service client ID |
| `STEP1_CLIENT_SECRET` | your service client secret |
| `STEP1_SCOPE` | `agent.invoke` |
| `STEP1_RESOURCE` | `https://progear.com/sales` |
| `STEP2_CLIENT_ID` | your ProGearSales agent client ID |
| `STEP2_AUDIENCE` | `https://your-org.oktapreview.com/oauth2/<inventory_as_id>` |
| `STEP2_RESOURCE` | `https://progear.com/inventory` |
| `STEP2_SCOPE` | `agent.invoke` |
| `STEP2_PRIVATE_KEY_JWK` | full single-line JWK JSON |
| `STEP3_AUTH_SERVER_ID` | your ProGearInventory auth server ID |
| `STEP3_CLIENT_ID` | your ProGearSales agent client ID |
| `STEP3_PRIVATE_KEY_JWK` | full single-line JWK JSON |
| `STEP4_CLIENT_ID` | your ProGearInventory agent client ID |
| `STEP4_AUDIENCE` | `https://your-org.oktapreview.com/oauth2/<inventorymcp_as_id>` |
| `STEP4_SCOPE` | `agent.invoke` |
| `STEP4_PRIVATE_KEY_JWK` | full single-line JWK JSON |
| `STEP5_AUTH_SERVER_ID` | your InventoryMCP auth server ID |
| `STEP5_CLIENT_ID` | your ProGearInventory agent client ID |
| `STEP5_PRIVATE_KEY_JWK` | full single-line JWK JSON |
| `HI_CLIENT_ID` | your HI web app client ID |
| `HI_CLIENT_SECRET` | your HI web app client secret |
| `HI_AUTH_SERVER_ID` | your ProGearSales auth server ID |
| `HI_SCOPE` | `openid agent.invoke` |
| `HI_RESOURCE` | `https://progear.com/sales` |
| `HI_CALLBACK_URL` | `https://<your-site>.netlify.app/api/auth/callback` *(set after Step 5)* |

> For JWK values, paste the entire JSON object as a single line in the value field.

### Step 5 — Trigger a new deploy

After setting env vars, redeploy to pick them up:

1. Go to **Deploys** tab in your site dashboard
2. Click **Trigger deploy** → **Deploy site**

Once the build succeeds your site URL will be shown (e.g. `https://a2a-identity-chaining.netlify.app`).

### Step 6 — Register the callback URL in Okta

1. **Okta Admin Console** → **Applications** → your HI web app
2. **Sign On** tab → **Redirect URIs**
3. Add: `https://<your-site>.netlify.app/api/auth/callback`
4. Save

### Step 7 — Update HI_CALLBACK_URL

1. Back in Netlify: **Site configuration** → **Environment variables**
2. Edit `HI_CALLBACK_URL` → set to `https://<your-site>.netlify.app/api/auth/callback`
3. Go to **Deploys** → **Trigger deploy** → **Deploy site** to apply the change

### Step 8 — Verify

Open your site URL in a browser and:
- Click **Execute NHI** — all 5 steps should complete with tokens
- Click **Execute HI** — browser should redirect to Okta login, then return and run the chain

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails: `Cannot find module` | Missing dependency | Run `npm install` locally, commit `package-lock.json` |
| `HTTP 500` on `/api/execute` | Missing env var | Check all `STEP*` vars are set in Netlify dashboard |
| SSE stream cuts off mid-chain | Function timeout (10 s free tier) | Upgrade to Netlify Pro (26 s limit) |
| `Policy evaluation failed` | Okta access policy not configured | Configure access policy rules in Okta Admin Console |
| `invalid_subject_token` | User token rejected by AS | Configure Org AS A2A policy for user tokens |
| HI button callback fails | Okta redirect URI not registered | Complete the Okta step in your chosen option above |
| `mismatched_resource` in HI flow | `resource` missing from `/token` request | Ensure `HI_RESOURCE` env var is set |

---

## Environment variable reference

| Variable | Required for | Secret? |
|---|---|---|
| `OKTA_ORG_URL` | All flows | No |
| `STEP1_AUTH_SERVER_ID` | NHI | No |
| `STEP1_CLIENT_ID` | NHI | No |
| `STEP1_CLIENT_SECRET` | NHI | **Yes** |
| `STEP1_SCOPE` | NHI | No |
| `STEP1_RESOURCE` | NHI | No |
| `STEP2_CLIENT_ID` | NHI | No |
| `STEP2_PRIVATE_KEY_JWK` | NHI | **Yes** |
| `STEP2_AUDIENCE` | NHI | No |
| `STEP2_RESOURCE` | NHI | No |
| `STEP2_SCOPE` | NHI | No |
| `STEP3_AUTH_SERVER_ID` | NHI | No |
| `STEP3_CLIENT_ID` | NHI | No |
| `STEP3_PRIVATE_KEY_JWK` | NHI | **Yes** |
| `STEP4_CLIENT_ID` | NHI | No |
| `STEP4_PRIVATE_KEY_JWK` | NHI | **Yes** |
| `STEP4_AUDIENCE` | NHI | No |
| `STEP4_SCOPE` | NHI | No |
| `STEP5_AUTH_SERVER_ID` | NHI | No |
| `STEP5_CLIENT_ID` | NHI | No |
| `STEP5_PRIVATE_KEY_JWK` | NHI | **Yes** |
| `HI_CLIENT_ID` | HI | No |
| `HI_CLIENT_SECRET` | HI | **Yes** |
| `HI_AUTH_SERVER_ID` | HI | No |
| `HI_SCOPE` | HI | No |
| `HI_RESOURCE` | HI | No |
| `HI_CALLBACK_URL` | HI | No — must match Okta redirect URI exactly |
