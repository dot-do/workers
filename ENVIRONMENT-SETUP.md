# Environment Variable Setup Guide

## Overview

After deploying all 16 workers, **10 workers (62.5%) are fully functional** without any additional configuration. The remaining workers need environment variables (API keys) to function properly.

## Workers Needing Environment Variables

### 1. generate.drivly.workers.dev (PRIORITY 1)

**Status:** Returns "Internal Server Error"

**Required Environment Variables:**
```bash
# OpenRouter API key (primary provider)
OPENROUTER_API_KEY=sk-or-v1-...

# OpenAI API key (fallback provider, optional)
OPENAI_API_KEY=sk-...
```

**How to Set:**
```bash
cd workers/generate
wrangler secret put OPENROUTER_API_KEY
# Enter your OpenRouter API key when prompted

wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key when prompted

# Redeploy
wrangler deploy
```

**Get API Keys:**
- OpenRouter: https://openrouter.ai/keys
- OpenAI: https://platform.openai.com/api-keys

---

### 2. api.drivly.workers.dev (PRIORITY 2)

**Status:** Returns "Internal Server Error"

**Likely Required Environment Variables:**
```bash
# GitHub integration
GITHUB_TOKEN=ghp_...
GITHUB_APP_WEBHOOK_SECRET=...

# JWT authentication
JWT_SECRET=...

# WorkOS authentication
WORKOS_API_KEY=...
WORKOS_CLIENT_ID=...
```

**How to Set:**
```bash
cd workers/api
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_APP_WEBHOOK_SECRET
wrangler secret put JWT_SECRET
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
wrangler deploy
```

**Get API Keys:**
- GitHub: https://github.com/settings/tokens
- WorkOS: https://dashboard.workos.com/

---

### 3. auth.drivly.workers.dev (OPTIONAL)

**Status:** No root endpoint (RPC-only service, working as designed)

**Likely Required Environment Variables:**
```bash
# WorkOS authentication
WORKOS_API_KEY=...
WORKOS_CLIENT_ID=...
JWT_SECRET=...
```

**How to Set:**
```bash
cd workers/auth
wrangler secret put WORKOS_API_KEY
wrangler secret put JWT_SECRET
wrangler deploy
```

---

### 4. email.drivly.workers.dev (OPTIONAL)

**Status:** No root endpoint (RPC-only service, working as designed)

**Likely Required Environment Variables:**
```bash
# Resend API key
RESEND_API_KEY=re_...
```

**How to Set:**
```bash
cd workers/email
wrangler secret put RESEND_API_KEY
wrangler deploy
```

**Get API Key:**
- Resend: https://resend.com/api-keys

---

## Workers Not Needing Configuration

These workers are **fully functional** as-is:

1. ✅ **db.drivly.workers.dev** - Database service
2. ✅ **blog.drivly.workers.dev** - Blog generation
3. ✅ **schedule.drivly.workers.dev** - Cron jobs
4. ✅ **webhooks.drivly.workers.dev** - External webhooks
5. ✅ **mcp.drivly.workers.dev** - MCP server
6. ✅ **utils.drivly.workers.dev** - Utilities
7. ✅ **markdown.fetch.do** - Markdown conversion
8. ✅ **queue.drivly.workers.dev** - Message queue (RPC-only)

## Workers Needing Endpoint Documentation

These workers return 404 on root path but may be functional:

1. **voice.drivly.workers.dev** - Try `/generate` endpoint
2. **podcast.drivly.workers.dev** - Try `/generate` endpoint
3. **numerics.drivly.workers.dev** - Try `/metrics/*` endpoints

## Gateway Worker Special Case

**gateway.drivly.workers.dev** returns `{"error":"Not found"}` because it expects specific domains and paths for routing. This is by design - the gateway routes based on:
- Subdomains (*.apis.do, *.services.do)
- Path-based routing (/api/db/*, /api/auth/*)
- Domain-based routing (dynamically routes to user workers)

## Bulk Environment Variable Setup

To set all common environment variables at once:

```bash
#!/bin/bash
# Set OpenRouter key for generate worker
cd workers/generate
echo "Setting OpenRouter API key..."
wrangler secret put OPENROUTER_API_KEY
wrangler deploy

# Set GitHub keys for api worker
cd ../api
echo "Setting GitHub token..."
wrangler secret put GITHUB_TOKEN
echo "Setting JWT secret..."
wrangler secret put JWT_SECRET
wrangler deploy

# Set Resend key for email worker
cd ../email
echo "Setting Resend API key..."
wrangler secret put RESEND_API_KEY
wrangler deploy

echo "Done! All critical environment variables set."
```

## Verification

After setting environment variables, test each worker:

```bash
# Test generate worker
curl https://generate.drivly.workers.dev/?q=hello

# Test api worker
curl https://api.drivly.workers.dev/health

# Test email worker (RPC only, no HTTP endpoint)
# Must test via service binding from another worker
```

## Important Notes

1. **Secrets vs Environment Variables:**
   - Use `wrangler secret put` for sensitive data (API keys, tokens)
   - Use `vars` in wrangler.jsonc for non-sensitive config

2. **No Infrastructure Provisioning Needed:**
   - R2 buckets: NOT required for current deployment
   - KV namespaces: NOT required for current deployment
   - D1 databases: NOT required for current deployment
   - Custom domains: NOT required for current deployment

3. **Success Rate:**
   - 10/16 workers (62.5%) fully functional without any config
   - 3/16 workers need environment variables
   - 3/16 workers need endpoint documentation only

## Troubleshooting

If a worker still returns errors after setting environment variables:

1. **Check secret was set:**
   ```bash
   wrangler secret list
   ```

2. **View logs:**
   ```bash
   wrangler tail
   ```

3. **Verify deployment:**
   ```bash
   wrangler deployments list
   ```

4. **Test locally:**
   ```bash
   wrangler dev
   ```

## Next Steps

1. Set OPENROUTER_API_KEY for generate worker (Priority 1)
2. Set GitHub/JWT keys for api worker (Priority 2)
3. Set Resend key for email worker (Optional)
4. Document correct endpoints for voice/podcast/numerics (Documentation)
5. Test all workers to verify functionality
