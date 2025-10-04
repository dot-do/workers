# Integration Testing Guide

**Status:** Ready for Testing
**Date:** 2025-10-03

## Overview

This guide covers integration testing across all 7 microservices:
1. **Gateway** - API routing and traffic management
2. **Database** - Data access layer (PostgreSQL + ClickHouse)
3. **Auth** - Authentication and authorization (WorkOS + JWT)
4. **Schedule** - Cron jobs and scheduled tasks
5. **Webhooks** - External webhook processing
6. **Email** - Transactional email delivery
7. **MCP** - Model Context Protocol server for AI

## Prerequisites

Before running integration tests, ensure:

### 1. All Services Deployed

```bash
# Deploy in dependency order
cd /Users/nathanclevenger/Projects/.do/workers

# Option A: Deploy individually
cd db && pnpm deploy
cd ../auth && pnpm deploy
cd ../schedule && pnpm deploy
cd ../webhooks && pnpm deploy
cd ../email && pnpm deploy
cd ../mcp && pnpm deploy
cd ../gateway && pnpm deploy

# Option B: Use automated script
./scripts/deploy-all.sh
```

### 2. Secrets Configured

```bash
# Database (in db/)
wrangler secret put DATABASE_URL
# PostgreSQL connection string from Neon

# Auth (in auth/)
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
wrangler secret put WORKOS_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put JWT_REFRESH_SECRET

# Email (in email/)
wrangler secret put RESEND_API_KEY
wrangler secret put WORKOS_API_KEY  # For magic links

# MCP (in mcp/)
wrangler secret put GITHUB_TOKEN

# Webhooks (in webhooks/)
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put WORKOS_WEBHOOK_SECRET
wrangler secret put GITHUB_WEBHOOK_SECRET
wrangler secret put RESEND_WEBHOOK_SECRET
```

### 3. KV Namespaces Created

```bash
# Gateway rate limiting
cd gateway
wrangler kv:namespace create "GATEWAY_KV"
# Update wrangler.jsonc with the ID

# Auth sessions and rate limiting
cd ../auth
wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "SESSIONS_KV"
# Update wrangler.jsonc with the IDs

# MCP memory store
cd ../mcp
wrangler kv:namespace create "KV"
# Update wrangler.jsonc with the ID
```

### 4. Service Bindings Verified

Run the verification script:

```bash
cd /Users/nathanclevenger/Projects/.do/workers
pnpm tsx scripts/verify-deployment.ts
```

This checks:
- Service names match convention (do-*)
- Service bindings are correct
- No placeholder KV IDs
- Dependencies are resolved

## End-to-End Test Flows

### Flow 1: Authentication + Database

**Objective:** Verify Gateway → Auth → DB flow

```bash
# 1. Get health status (no auth required)
curl https://gateway.YOUR_SUBDOMAIN.workers.dev/health

# Expected: {"status":"healthy","timestamp":"...","services":[...]}

# 2. Create API key (requires admin session - setup via WorkOS first)
curl -X POST https://gateway.YOUR_SUBDOMAIN.workers.dev/auth/apikeys \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Integration Test Key"}'

# Expected: {"apiKey":"sk_live_...","id":"...","name":"Integration Test Key"}

# 3. Test API key authentication
curl https://gateway.YOUR_SUBDOMAIN.workers.dev/db/stats \
  -H "Authorization: Bearer sk_live_YOUR_KEY"

# Expected: {"tables":{...},"total_records":...}

# 4. Test invalid API key (should fail)
curl https://gateway.YOUR_SUBDOMAIN.workers.dev/db/stats \
  -H "Authorization: Bearer sk_live_invalid"

# Expected: {"error":"Invalid API key","code":"INVALID_API_KEY"}
```

**Success Criteria:**
- ✅ Health check returns 200
- ✅ Valid API key can access protected routes
- ✅ Invalid API key returns 401
- ✅ Database stats are returned
- ✅ Total latency < 50ms (p95)

### Flow 2: Rate Limiting

**Objective:** Verify Gateway rate limiting works

```bash
# Send 70 requests rapidly
for i in {1..70}; do
  curl -s https://gateway.YOUR_SUBDOMAIN.workers.dev/health
done

# After ~60 requests, should get:
# {"error":"Too many requests","code":"RATE_LIMIT_EXCEEDED","retryAfter":...}
```

**Success Criteria:**
- ✅ First 60 requests succeed
- ✅ Subsequent requests return 429
- ✅ Rate limit resets after time window

### Flow 3: Scheduled Tasks

**Objective:** Verify Schedule → DB flow

```bash
# 1. List all scheduled tasks
curl https://schedule.YOUR_SUBDOMAIN.workers.dev/tasks

# Expected: {"tasks":[{"name":"cleanup-expired-sessions",...},...]}

# 2. Execute task manually
curl -X POST https://schedule.YOUR_SUBDOMAIN.workers.dev/tasks/cleanup-expired-sessions/execute

# Expected: {"status":"success","task":"cleanup-expired-sessions","executionTime":...}

# 3. Get execution history
curl https://schedule.YOUR_SUBDOMAIN.workers.dev/tasks/cleanup-expired-sessions/history

# Expected: {"history":[{"timestamp":"...","status":"success",...}]}
```

**Success Criteria:**
- ✅ All 8 tasks are registered
- ✅ Manual execution succeeds
- ✅ Execution logged to database
- ✅ History is retrievable

### Flow 4: Webhook Processing

**Objective:** Verify Webhooks → DB flow

```bash
# Test Stripe webhook (use Stripe CLI for real signature)
curl -X POST https://do-webhooks.YOUR_SUBDOMAIN.workers.dev/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: STRIPE_SIGNATURE" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test123",
        "amount": 1000,
        "currency": "usd"
      }
    }
  }'

# Expected: {"status":"success","eventId":"..."}

# Verify event was stored
curl https://do-db.YOUR_SUBDOMAIN.workers.dev/query \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -d '{"query":"SELECT * FROM webhook_events WHERE provider = $1","params":["stripe"]}'

# Expected: {"results":[{"id":"...","provider":"stripe","type":"payment_intent.succeeded",...}]}
```

**Success Criteria:**
- ✅ Valid signature accepted
- ✅ Invalid signature rejected (403)
- ✅ Event stored in database
- ✅ Idempotency prevents duplicates
- ✅ Response time < 5s

### Flow 5: Email Delivery

**Objective:** Verify Email → DB flow

```bash
# Send welcome email
curl -X POST https://do-email.YOUR_SUBDOMAIN.workers.dev/templates/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_YOUR_KEY" \
  -d '{
    "to": "test@example.com",
    "data": {
      "name": "Test User",
      "loginUrl": "https://app.example.com/login"
    }
  }'

# Expected: {"status":"sent","emailId":"..."}

# Get email status
curl https://do-email.YOUR_SUBDOMAIN.workers.dev/status/EMAIL_ID \
  -H "Authorization: Bearer sk_live_YOUR_KEY"

# Expected: {"status":"sent","recipient":"test@example.com",...}

# List sent emails
curl https://do-email.YOUR_SUBDOMAIN.workers.dev/history?userId=USER_ID \
  -H "Authorization: Bearer sk_live_YOUR_KEY"

# Expected: {"emails":[...],"total":...}
```

**Success Criteria:**
- ✅ Email sent via Resend
- ✅ Email logged to database
- ✅ Status is retrievable
- ✅ History shows all sent emails
- ✅ Template rendering works

### Flow 6: MCP AI Integration

**Objective:** Verify MCP → Services flow

```bash
# List available MCP servers
curl https://mcp.YOUR_SUBDOMAIN.workers.dev/servers

# Expected: {"servers":["context7","deepwiki","memory","slack","github",...]}

# Get GitHub tools
curl https://mcp.YOUR_SUBDOMAIN.workers.dev/github/tools

# Expected: {"tools":[{"name":"github_search_repositories",...},...]}

# Execute GitHub search
curl -X POST https://mcp.YOUR_SUBDOMAIN.workers.dev/github/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "github_search_repositories",
    "args": {"query": "cloudflare workers"}
  }'

# Expected: {"result":{"items":[...]}}

# Test memory store
curl -X POST https://mcp.YOUR_SUBDOMAIN.workers.dev/memory/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "create_entities",
    "args": {
      "entities": [
        {"name": "Test Entity", "entityType": "test", "observations": ["Test observation"]}
      ]
    }
  }'

# Expected: {"result":"Entities created successfully"}
```

**Success Criteria:**
- ✅ All servers listed
- ✅ GitHub integration works
- ✅ Memory store persists to KV
- ✅ Search works across graph

## Performance Benchmarks

### Latency Targets

| Flow | Target (p95) | Command |
|------|-------------|---------|
| **Gateway → Service RPC** | <5ms | Time RPC call directly |
| **Gateway → Auth → DB** | <50ms | Auth validation flow |
| **Gateway → DB query** | <10ms | Simple DB get |
| **Gateway → DB search** | <50ms | Full-text search |
| **Webhook processing** | <5s | End-to-end webhook |
| **Email send** | <10s | Template render + send |

### Benchmark Script

```bash
# Install hyperfine for benchmarking
brew install hyperfine  # macOS
# or: apt install hyperfine  # Linux

# Benchmark health check
hyperfine --warmup 3 \
  'curl -s https://gateway.YOUR_SUBDOMAIN.workers.dev/health'

# Benchmark authenticated request
hyperfine --warmup 3 \
  'curl -s https://gateway.YOUR_SUBDOMAIN.workers.dev/db/stats \
   -H "Authorization: Bearer sk_live_YOUR_KEY"'

# Benchmark DB query
hyperfine --warmup 3 \
  'curl -s https://do-db.YOUR_SUBDOMAIN.workers.dev/stats'
```

## Automated Integration Tests

Run the test suite:

```bash
cd /Users/nathanclevenger/Projects/.do/workers
pnpm test tests/integration.test.ts
```

This will:
- Mock service bindings
- Test RPC communication
- Verify error handling
- Check performance thresholds

## Troubleshooting

### Common Issues

**1. Service Binding Error**
```
Error: Worker binding "DB" refers to service "db", but no service is defined
```

**Fix:**
- Verify service is deployed: `wrangler deployments list`
- Check service name in wrangler.jsonc matches deployed name
- Redeploy dependent service

**2. KV Namespace Not Found**
```
Error: KV namespace with ID "placeholder-kv-namespace-id" not found
```

**Fix:**
- Create KV namespace: `wrangler kv:namespace create "GATEWAY_KV"`
- Update wrangler.jsonc with the ID from output
- Redeploy service

**3. Database Connection Failed**
```
Error: Database connection failed
```

**Fix:**
- Verify DATABASE_URL secret is set: `wrangler secret list`
- Test connection string locally
- Check Neon database is running
- Use direct endpoint (not pooler)

**4. WorkOS Authentication Error**
```
Error: WorkOS not configured
```

**Fix:**
- Set all WorkOS secrets: `wrangler secret put WORKOS_API_KEY`
- Verify credentials in WorkOS dashboard
- Check Client ID matches API key

**5. Rate Limit Not Working**
```
Rate limiting allows unlimited requests
```

**Fix:**
- Verify GATEWAY_KV namespace is created and ID is set
- Check KV binding in wrangler.jsonc
- Falls back to memory if KV unavailable (restarts reset)

### Logs and Monitoring

**View Real-Time Logs:**
```bash
# Gateway logs
wrangler tail gateway

# Database logs
wrangler tail do-db

# Auth logs
wrangler tail auth

# Filter for errors only
wrangler tail gateway --status error
```

**Cloudflare Dashboard:**
- Navigate to Workers & Pages → Your Worker → Metrics
- Monitor: Requests, Errors, CPU Time, Subrequests

## Success Criteria

Integration testing is complete when:

- ✅ All 7 services deployed and healthy
- ✅ Service bindings working (RPC latency <5ms)
- ✅ Authentication flow works (API keys + sessions)
- ✅ Rate limiting enforced (60 req/min default)
- ✅ Database queries successful (PostgreSQL + ClickHouse)
- ✅ Scheduled tasks execute on cron
- ✅ Webhooks process and store events
- ✅ Emails send and log delivery
- ✅ MCP tools accessible to AI agents
- ✅ All performance targets met
- ✅ Error handling works across boundaries
- ✅ Logs and monitoring operational

## Next Steps

After integration testing:

1. **Load Testing**
   - Test 100+ concurrent requests
   - Verify no race conditions
   - Benchmark PostgreSQL vs ClickHouse

2. **Production Deployment**
   - Add custom domains
   - Configure DNS
   - Enable production monitoring

3. **Documentation**
   - Update API documentation
   - Create user guides
   - Document common workflows

4. **Migration**
   - Migrate routes from legacy api.services
   - Deprecate old endpoints
   - Monitor traffic patterns

---

**Last Updated:** 2025-10-03
**Status:** Ready for Integration Testing
**Services:** 7 deployed, ~13,000 LOC
