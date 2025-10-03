# Workers Microservices - Quick Start Guide

**Status:** Ready for Deployment
**Services:** 7 production-ready microservices
**Code:** ~13,000 LOC + ~1,700 LOC tests

## 🚀 Quick Deployment (5 Minutes)

### Prerequisites

1. **Cloudflare Account** with Workers enabled
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **PNPM** installed: `npm install -g pnpm`
4. **Authenticated**: `wrangler login`

### Quick Check

Check current configuration status:

```bash
cd /Users/nathanclevenger/Projects/.do/workers
./scripts/check-status.sh
```

### Configuration Options

**Option A - Automated Wizard (Recommended):**

```bash
./scripts/configure.sh
```

This interactive wizard will:
- Create all KV namespaces
- Update wrangler.jsonc files automatically
- Guide you through setting all secrets
- Verify configuration

**Option B - Manual Setup (see below)**

---

## 📝 Manual Configuration

### Step 1: Create KV Namespaces

```bash
cd /Users/nathanclevenger/Projects/.do/workers

# Gateway
cd gateway && wrangler kv:namespace create "GATEWAY_KV"
# Copy the ID, update wrangler.jsonc line 62

# Auth
cd ../auth
wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "SESSIONS_KV"
# Copy IDs, update wrangler.jsonc lines 19 and 24

# MCP
cd ../mcp
wrangler kv:namespace create "KV"
# Copy ID, update wrangler.jsonc

cd ..
```

### Step 2: Set Secrets

**Database Service:**
```bash
cd db
wrangler secret put DATABASE_URL
# Paste your PostgreSQL connection string from Neon
cd ..
```

**Auth Service:**
```bash
cd auth
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
wrangler secret put WORKOS_CLIENT_SECRET
wrangler secret put JWT_SECRET        # Generate with: openssl rand -base64 32
wrangler secret put JWT_REFRESH_SECRET # Generate with: openssl rand -base64 32
cd ..
```

**Email Service:**
```bash
cd email
wrangler secret put RESEND_API_KEY
wrangler secret put WORKOS_API_KEY  # Same as Auth
cd ..
```

**MCP Service:**
```bash
cd mcp
wrangler secret put GITHUB_TOKEN
cd ..
```

**Webhooks Service:**
```bash
cd webhooks
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put WORKOS_WEBHOOK_SECRET
wrangler secret put GITHUB_WEBHOOK_SECRET
wrangler secret put RESEND_WEBHOOK_SECRET
cd ..
```

### Step 3: Deploy Services

**Option A - Automated (Recommended):**
```bash
./scripts/deploy-all.sh
```

**Option B - Manual (if you want control):**
```bash
# Deploy in dependency order
cd db && pnpm deploy && cd ..
cd auth && pnpm deploy && cd ..
cd schedule && pnpm deploy && cd ..
cd webhooks && pnpm deploy && cd ..
cd email && pnpm deploy && cd ..
cd mcp && pnpm deploy && cd ..
cd gateway && pnpm deploy && cd ..
```

### Step 4: Verify Deployment

```bash
# Replace YOUR_SUBDOMAIN with your Cloudflare subdomain

# Check Gateway
curl https://do-gateway.YOUR_SUBDOMAIN.workers.dev/health

# Check Database
curl https://do-db.YOUR_SUBDOMAIN.workers.dev/health

# Check Auth
curl https://do-auth.YOUR_SUBDOMAIN.workers.dev/health

# All should return: {"status":"healthy",...}
```

## 📋 Services Overview

| Service | URL Pattern | Purpose |
|---------|------------|---------|
| **Gateway** | `do-gateway.*.workers.dev` | API routing, auth, rate limiting |
| **Database** | `do-db.*.workers.dev` | PostgreSQL/ClickHouse RPC |
| **Auth** | `do-auth.*.workers.dev` | WorkOS, JWT, API keys, RBAC |
| **Schedule** | `do-schedule.*.workers.dev` | Cron jobs, scheduled tasks |
| **Webhooks** | `do-webhooks.*.workers.dev` | External webhook processing |
| **Email** | `do-email.*.workers.dev` | Transactional email via Resend |
| **MCP** | `do-mcp.*.workers.dev` | AI agent integration |

## 🧪 Quick Tests

### Test Authentication Flow

```bash
# 1. Health check (no auth)
curl https://do-gateway.YOUR_SUBDOMAIN.workers.dev/health

# 2. Create API key (requires admin session via WorkOS first)
curl -X POST https://do-gateway.YOUR_SUBDOMAIN.workers.dev/auth/apikeys \
  -H "Cookie: session=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Key"}'

# 3. Test API key
curl https://do-gateway.YOUR_SUBDOMAIN.workers.dev/db/stats \
  -H "Authorization: Bearer sk_live_YOUR_KEY"
```

### Test Email Sending

```bash
curl -X POST https://do-email.YOUR_SUBDOMAIN.workers.dev/templates/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "data": {
      "name": "Test User",
      "loginUrl": "https://app.example.com"
    }
  }'
```

### Test Scheduled Tasks

```bash
# List tasks
curl https://do-schedule.YOUR_SUBDOMAIN.workers.dev/tasks

# Execute task manually
curl -X POST https://do-schedule.YOUR_SUBDOMAIN.workers.dev/tasks/health-check-services/execute
```

### Test MCP Integration

```bash
# List MCP servers
curl https://do-mcp.YOUR_SUBDOMAIN.workers.dev/servers

# Get GitHub tools
curl https://do-mcp.YOUR_SUBDOMAIN.workers.dev/github/tools

# Search GitHub
curl -X POST https://do-mcp.YOUR_SUBDOMAIN.workers.dev/github/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "github_search_repositories",
    "args": {"query": "cloudflare workers"}
  }'
```

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Detailed deployment guide
- **[INTEGRATION.md](./INTEGRATION.md)** - Integration testing guide
- **[STATUS.md](./STATUS.md)** - Current implementation status
- **Service READMEs:**
  - [Gateway](./gateway/README.md)
  - [Database](./db/README.md)
  - [Auth](./auth/README.md)
  - [Schedule](./schedule/README.md)
  - [Webhooks](./webhooks/README.md)
  - [Email](./email/README.md)
  - [MCP](./mcp/README.md)

## 🐛 Troubleshooting

### Service Binding Error
```
Error: Worker binding "DB" refers to service "do-db", but no service is defined
```
**Fix:** Deploy DB service first, then redeploy dependent service

### KV Namespace Not Found
```
Error: KV namespace with ID "placeholder-kv-namespace-id" not found
```
**Fix:** Create KV namespace and update wrangler.jsonc with real ID

### Database Connection Failed
```
Error: Database connection failed
```
**Fix:** Set DATABASE_URL secret, ensure Neon database is running

### WorkOS Authentication Error
```
Error: WorkOS not configured
```
**Fix:** Set all WorkOS secrets (API_KEY, CLIENT_ID, CLIENT_SECRET)

## 📊 Monitoring

### View Logs

```bash
# Real-time logs
wrangler tail do-gateway
wrangler tail do-db
wrangler tail do-auth

# Filter for errors
wrangler tail do-gateway --status error
```

### Cloudflare Dashboard

Navigate to: **Workers & Pages** → **Your Worker** → **Metrics**

Monitor:
- Requests per second
- Error rate (target: <1%)
- CPU time (target: <50ms p95)
- Subrequests (RPC calls)

## 🎯 Performance Targets

| Metric | Target | How to Check |
|--------|--------|--------------|
| Gateway RPC | <5ms (p95) | Cloudflare dashboard |
| Auth validation | <5ms (p95) | Cloudflare dashboard |
| DB query | <10ms (p95) | Cloudflare dashboard |
| End-to-end | <50ms (p95) | Benchmark with curl |
| Webhook processing | <5s | Monitor logs |

## ✅ Success Checklist

- [ ] All 7 services deployed
- [ ] Health checks return 200
- [ ] API key authentication works
- [ ] Rate limiting enforced
- [ ] Database queries successful
- [ ] Scheduled tasks execute
- [ ] Webhooks process events
- [ ] Emails send successfully
- [ ] MCP tools accessible
- [ ] Logs and metrics visible
- [ ] Performance targets met

## 🚀 Next Steps

After successful deployment:

1. **Configure Custom Domains**
   - Add routes in wrangler.jsonc
   - Point DNS to Cloudflare

2. **Load Testing**
   - Test 100+ concurrent requests
   - Verify performance under load

3. **Database Benchmarking**
   - Compare PostgreSQL vs ClickHouse
   - Optimize slow queries

4. **Production Hardening**
   - Enable monitoring alerts
   - Set up error tracking
   - Configure backups

5. **Migration**
   - Migrate routes from legacy api.services
   - Deprecate old endpoints
   - Update client applications

---

**Last Updated:** 2025-10-03
**Status:** Ready for Production Testing
**Total Code:** ~13,000 LOC production + ~1,700 LOC tests
