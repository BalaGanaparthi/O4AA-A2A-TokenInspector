# Deploying to Netlify

## Prerequisites

- A [Netlify account](https://netlify.com) (free tier works for initial testing)
- [Node.js 20+](https://nodejs.org) installed locally
- The project builds cleanly: `npm run build`
- Git installed locally

---

## Overview of what gets deployed

| Route | Type | Notes |
|---|---|---|
| `/` | SSR Page | React UI |
| `/api/execute` | Serverless Function | SSE stream — NHI 5-step chain |
| `/api/execute-hi` | Serverless Function | SSE stream — HI 5-step chain |
| `/api/auth/login` | Serverless Function | PKCE + redirect to Okta |
| `/api/auth/callback` | Serverless Function | Code exchange + cookie |
| `/api/config` | Serverless Function | Returns non-secret env vars |

> **Timeout note:** The 5-step A2A chain makes 5 sequential Okta token requests. On Netlify's free tier the function timeout is **10 seconds** — sufficient for fast Okta orgs. Upgrade to a paid plan for the **26-second** limit if you see timeouts.

---

## Step 1 — Install the Netlify CLI

```bash
npm install -g netlify-cli
netlify --version   # should print netlify-cli/x.x.x
```

---

## Step 2 — Authenticate with Netlify

```bash
netlify login
```

A browser window opens. Sign in to your Netlify account and authorise the CLI.

---

## Step 3 — Initialise git (if not already)

Netlify deploys from a git repository. If the project is not yet in git:

```bash
cd /Users/balaganaparthi/Documents/Projects/Okta/A2A

git init
git add .
git commit -m "Initial commit — A2A Identity Chaining"
```

> Make sure `.gitignore` includes `.env` and `.env.local` (already set). **Never commit real credentials.**

---

## Step 4 — Create a Netlify site

```bash
netlify init
```

When prompted:
- **What would you like to do?** → `Create & configure a new site`
- **Team** → select your Netlify team
- **Site name** → e.g. `a2a-identity-chaining` (or leave blank for auto-generated name)
- **Build command** → `npm run build` *(auto-detected from netlify.toml)*
- **Publish directory** → `.next` *(auto-detected)*

This creates the site and links it to your local project.

---

## Step 5 — Set environment variables

All secrets **must** be set in Netlify — they are never read from `.env` in production.

### Option A — Netlify CLI (recommended)

Run each command individually. For long JSON values (JWK keys), paste the entire single-line JSON:

```bash
# Core
netlify env:set OKTA_ORG_URL "https://bala-secures-ai.oktapreview.com"

# Step 1 — Service client (NHI)
netlify env:set STEP1_AUTH_SERVER_ID "auszakltaaxuEH0s71d7"
netlify env:set STEP1_CLIENT_ID      "0oazakcme19yZ44th1d7"
netlify env:set STEP1_CLIENT_SECRET  "<your-client-secret>"
netlify env:set STEP1_SCOPE          "agent.invoke"
netlify env:set STEP1_RESOURCE       "https://progear.com/sales"

# Step 2 — ProGearSales Agent
netlify env:set STEP2_CLIENT_ID    "wlpzamsn8ruzX9RiH1d7"
netlify env:set STEP2_AUDIENCE     "https://bala-secures-ai.oktapreview.com/oauth2/auszalb8rzrFTrhPa1d7"
netlify env:set STEP2_RESOURCE     "https://progear.com/inventory"
netlify env:set STEP2_SCOPE        "agent.invoke"
netlify env:set STEP2_PRIVATE_KEY_JWK '<paste full JWK JSON on one line>'

# Step 3 — ProGearSales at ProGearInventory AS
netlify env:set STEP3_AUTH_SERVER_ID  "auszalb8rzrFTrhPa1d7"
netlify env:set STEP3_CLIENT_ID       "wlpzamsn8ruzX9RiH1d7"
netlify env:set STEP3_PRIVATE_KEY_JWK '<paste full JWK JSON on one line>'

# Step 4 — ProGearInventory Agent
netlify env:set STEP4_CLIENT_ID       "wlpzantdeiOQGRrpF1d7"
netlify env:set STEP4_AUDIENCE        "https://bala-secures-ai.oktapreview.com/oauth2/auszam0ov23cgv2Kd1d7"
netlify env:set STEP4_SCOPE           "agent.invoke"
netlify env:set STEP4_PRIVATE_KEY_JWK '<paste full JWK JSON on one line>'

# Step 5 — ProGearInventory at InventoryMCP AS
netlify env:set STEP5_AUTH_SERVER_ID  "auszam0ov23cgv2Kd1d7"
netlify env:set STEP5_CLIENT_ID       "wlpzantdeiOQGRrpF1d7"
netlify env:set STEP5_PRIVATE_KEY_JWK '<paste full JWK JSON on one line>'

# HI flow — Web App
netlify env:set HI_CLIENT_ID     "0oazektoz797Aaq0L1d7"
netlify env:set HI_CLIENT_SECRET "<your-hi-client-secret>"
netlify env:set HI_AUTH_SERVER_ID "auszakltaaxuEH0s71d7"
netlify env:set HI_SCOPE         "openid agent.invoke"
netlify env:set HI_RESOURCE      "https://progear.com/sales"
# ⚠ Set this AFTER Step 7 once you know your Netlify URL
netlify env:set HI_CALLBACK_URL  "https://<your-site>.netlify.app/api/auth/callback"
```

### Option B — Netlify Dashboard UI

1. Go to **[app.netlify.com](https://app.netlify.com)** → your site
2. **Site configuration** → **Environment variables** → **Add a variable**
3. Add each key/value from the list above
4. For JWK values, paste the entire single-line JSON string as the value

---

## Step 6 — First deployment

```bash
netlify deploy --build
```

This runs `npm run build` locally and uploads the result to a **draft URL** (e.g. `https://deploy-preview-1--a2a-identity-chaining.netlify.app`). Test the draft before promoting to production.

> If the build succeeds, you'll see output like:
> ```
> Website Draft URL: https://64abc123--a2a-identity-chaining.netlify.app
> ```

---

## Step 7 — Update Okta redirect URI

The HI OAuth callback URL must be registered in Okta **before** the HI flow will work in production.

1. **Okta Admin Console** → **Applications** → `ProGearSalesAgent UserSignOn Web App` (`0oazektoz797Aaq0L1d7`)
2. **Sign On** tab → **Redirect URIs**
3. Add: `https://<your-site>.netlify.app/api/auth/callback`
4. Save

---

## Step 8 — Update HI_CALLBACK_URL in Netlify

Now that you have your real Netlify URL, update the env var:

```bash
netlify env:set HI_CALLBACK_URL "https://<your-site>.netlify.app/api/auth/callback"
```

Or update it in the Netlify Dashboard under **Site configuration → Environment variables**.

---

## Step 9 — Promote to production

Once the draft URL tests correctly:

```bash
netlify deploy --build --prod
```

Your app is now live at `https://<your-site>.netlify.app`.

---

## Step 10 — Verify the deployment

```bash
# Check the app loads
curl -s -o /dev/null -w "%{http_code}" https://<your-site>.netlify.app
# → 200

# Check the config endpoint returns your env vars
curl -s https://<your-site>.netlify.app/api/config | python3 -m json.tool

# Smoke test NHI execute (should start streaming SSE events)
curl -s -X POST https://<your-site>.netlify.app/api/execute --no-buffer | head -5

# Check login redirect (should redirect to Okta)
curl -sI https://<your-site>.netlify.app/api/auth/login | grep location
```

---

## CI/CD — Auto-deploy from GitHub (optional)

1. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. In Netlify Dashboard → **Site configuration** → **Build & deploy** → **Link repository**
3. Select your GitHub repo and branch (`main`)
4. Every push to `main` now triggers an automatic production deploy

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails: `Cannot find module` | Missing dependency | Run `npm install` locally, commit `package-lock.json` |
| `HTTP 500` on `/api/execute` | Missing env var | Check all `STEP*` vars are set in Netlify dashboard |
| SSE stream cuts off mid-chain | Function timeout (10 s free tier) | Upgrade to Netlify Pro (26 s limit) or optimise Okta latency |
| `Policy evaluation failed` | Okta access policy not set | See README — configure access policy in Okta Admin Console |
| `invalid_subject_token` | User token rejected by AS | See README — configure Org AS A2A policy for user tokens |
| HI button redirects but callback fails | Okta redirect URI not registered | Complete Step 7 above |
| `mismatched_resource` in HI flow | `resource` missing from `/token` request | Already fixed in code — ensure `HI_RESOURCE` env var is set |

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
| `HI_CALLBACK_URL` | HI | No — but must match Okta redirect URI exactly |
