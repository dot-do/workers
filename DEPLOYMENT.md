# Workers Deployment Guide

**Status:** Ready for Production Testing
**Date:** 2025-10-02

## Quick Start

Deploy all 3 core services in order:

```bash
# 1. Database service (no dependencies)
cd /Users/nathanclevenger/Projects/.do/workers/db
pnpm deploy

# 2. Auth service (depends on DB)
cd /Users/nathanclevenger/Projects/.do/workers/auth
pnpm deploy

# 3. Gateway service (depends on DB + Auth)
cd /Users/nathanclevenger/Projects/.do/workers/gateway
pnpm deploy
```

## Prerequisites

### 1. Database Setup (PostgreSQL/Neon)

```bash
# Set database URL as secret
cd /Users/nathanclevenger/Projects/.do/workers/db
wrangler secret put DATABASE_URL
# Paste your Neon connection string (NOT pooler endpoint)
```

**Get Neon URL:**
1. Go to https://console.neon.tech
2. Select your project
3. Copy **Connection String** (not pooler)
4. Format: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname`

### 2. ClickHouse Setup (Optional)

```bash
cd /Users/nathanclevenger/Projects/.do/workers/db
wrangler secret put CLICKHOUSE_URL
wrangler secret put CLICKHOUSE_USERNAME
wrangler secret put CLICKHOUSE_PASSWORD
wrangler secret put CLICKHOUSE_DATABASE
```

### 3. WorkOS Setup (for Auth)

```bash
cd /Users/nathanclevenger/Projects/.do/workers/auth
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
wrangler secret put WORKOS_CLIENT_SECRET
```

**Get WorkOS Credentials:**
1. Go to https://dashboard.workos.com
2. Navigate to API Keys
3. Copy API Key, Client ID, Client Secret

### 4. JWT Secrets (for Auth)

```bash
cd /Users/nathanclevenger/Projects/.do/workers/auth
wrangler secret put JWT_SECRET
# Generate a random string: openssl rand -base64 32
wrangler secret put JWT_REFRESH_SECRET
# Generate a different random string
```

### 5. KV Namespaces (for Gateway rate limiting)

```bash
cd /Users/nathanclevenger/Projects/.do/workers/gateway
wrangler kv:namespace create "GATEWAY_KV"
# Copy the ID from output

# Update wrangler.jsonc:
# "kv_namespaces": [
#   { "binding": "GATEWAY_KV", "id": "YOUR_KV_ID_HERE" }
# ]
```

## Deployment Order

### Step 1: Deploy Database Service

```bash
cd /Users/nathanclevenger/Projects/.do/workers/db

# Set secrets
wrangler secret put DATABASE_URL

# Deploy
pnpm deploy

# Test
curl https://do-db.YOUR_SUBDOMAIN.workers.dev/health
# Should return: {"status":"healthy","databases":{"postgres":"connected","clickhouse":"not_configured"}}
```

### Step 2: Deploy Auth Service

```bash
cd /Users/nathanclevenger/Projects/.do/workers/auth

# Set secrets
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
wrangler secret put WORKOS_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put JWT_REFRESH_SECRET

# Deploy
pnpm deploy

# Test
curl https://auth.YOUR_SUBDOMAIN.workers.dev/health
# Should return: {"status":"healthy","workos":"connected","db":"connected"}
```

### Step 3: Deploy Gateway Service

```bash
cd /Users/nathanclevenger/Projects/.do/workers/gateway

# Create KV namespace
wrangler kv:namespace create "GATEWAY_KV"

# Update wrangler.jsonc with KV ID

# Deploy
pnpm deploy

# Test
curl https://gateway.YOUR_SUBDOMAIN.workers.dev/health
# Should return: {"status":"healthy","timestamp":"...","services":[...]}
```

## Service Bindings

The gateway needs bindings to DB and Auth services. Update `gateway/wrangler.jsonc`:

```jsonc
{
  "name": "gateway",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",
  "services": [
    { "binding": "DB", "service": "db" },
    { "binding": "AUTH", "service": "auth" }
  ],
  "kv_namespaces": [
    { "binding": "GATEWAY_KV", "id": "YOUR_KV_ID" }
  ]
}
```

Auth service needs binding to DB:

```jsonc
{
  "name": "auth",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",
  "services": [
    { "binding": "DB", "service": "db" }
  ]
}
```

## Testing the Deployment

### 1. Health Checks

```bash
# Database
curl https://do-db.YOUR_SUBDOMAIN.workers.dev/health

# Auth
curl https://auth.YOUR_SUBDOMAIN.workers.dev/health

# Gateway
curl https://gateway.YOUR_SUBDOMAIN.workers.dev/health
```

### 2. Database Operations

```bash
# Via Gateway
curl https://gateway.YOUR_SUBDOMAIN.workers.dev/db/stats

# Direct to DB
curl https://do-db.YOUR_SUBDOMAIN.workers.dev/stats
```

### 3. Authentication Flow

```bash
# Create API key (need admin session first)
curl -X POST https://gateway.YOUR_SUBDOMAIN.workers.dev/auth/apikeys \
  -H "Cookie: session=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Key"}'

# Response: {"apiKey":"sk_live_...","id":"..."}

# Test API key
curl https://gateway.YOUR_SUBDOMAIN.workers.dev/db/stats \
  -H "Authorization: Bearer sk_live_..."
```

### 4. Rate Limiting

```bash
# Send 70 requests rapidly to trigger rate limit
for i in {1..70}; do
  curl https://gateway.YOUR_SUBDOMAIN.workers.dev/health
done

# Should get 429 after 60 requests
```

## Monitoring

### View Logs

```bash
# Database logs
wrangler tail do-db

# Auth logs
wrangler tail auth

# Gateway logs
wrangler tail gateway
```

### Metrics

Go to Cloudflare Dashboard → Workers & Pages → Your Worker → Metrics

Monitor:
- **Requests** - Total requests per service
- **Errors** - Error rate (target: <1%)
- **CPU Time** - Execution time (target: <50ms p95)
- **Subrequests** - RPC calls to other services

## Troubleshooting

### Database Not Connected

**Error:** `{"error":"Database connection failed"}`

**Fix:**
1. Verify `DATABASE_URL` is set: `wrangler secret list`
2. Test connection string locally
3. Check Neon database is running
4. Ensure using direct endpoint (not pooler)

### Auth Service Error

**Error:** `{"error":"WorkOS not configured"}`

**Fix:**
1. Verify secrets: `wrangler secret list`
2. Check WorkOS dashboard for valid credentials
3. Ensure Client ID matches API key

### Gateway 502 Error

**Error:** `{"error":"Service error","service":"db"}`

**Fix:**
1. Check DB service is deployed and healthy
2. Verify service binding in `wrangler.jsonc`
3. Check DB service logs: `wrangler tail do-db`

### Rate Limit Issues

**Error:** KV rate limiting not working

**Fix:**
1. Verify KV namespace created and ID in config
2. Check KV binding: `wrangler kv:namespace list`
3. Falls back to memory if KV unavailable

## Rollback

If deployment fails:

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback --message "Rollback to stable version"
```

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Database RPC** | <10ms (p95) | get/list operations |
| **Auth Validation** | <5ms (p95) | Token/API key check |
| **Gateway Routing** | <5ms (p95) | RPC to service |
| **End-to-End** | <50ms (p95) | Gateway → Service → DB |

## Next Steps

1. **Deploy all 3 services** ✅
2. **Test health checks** ✅
3. **Create first user** via WorkOS OAuth
4. **Generate API key** for testing
5. **Test end-to-end request flow**
6. **Monitor metrics** in Cloudflare dashboard
7. **Deploy remaining services** (AI, Queue, etc.)
8. **Migrate routes** from legacy api.services

## Custom Domains

To use custom domains:

```bash
# Add route in wrangler.jsonc
{
  "routes": [
    { "pattern": "api.services.do/*", "zone_name": "services.do" },
    { "pattern": "db.services.do/*", "zone_name": "services.do" }
  ]
}
```

Then deploy: `pnpm deploy`

---

**Last Updated:** 2025-10-02
**Services Ready:** Gateway, Database, Auth
**Status:** Production Testing Phase
