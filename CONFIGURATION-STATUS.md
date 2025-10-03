# Configuration Status

**Last Checked:** 2025-10-03
**Status:** 4% Complete (1/24 checks passing)

## 📊 Current Status

### ✅ Completed (1/24)

- MCP KV namespace configured

### ❌ Needs Configuration (23/24)

#### KV Namespaces (3 missing)
- ❌ Gateway: GATEWAY_KV (placeholder ID)
- ❌ Auth: RATE_LIMIT_KV (placeholder ID)
- ❌ Auth: SESSIONS_KV (placeholder ID)

#### Secrets (13 missing)
**Database:**
- ❌ DATABASE_URL

**Auth:**
- ❌ WORKOS_API_KEY
- ❌ WORKOS_CLIENT_ID
- ❌ WORKOS_CLIENT_SECRET
- ❌ JWT_SECRET
- ❌ JWT_REFRESH_SECRET

**Email:**
- ❌ RESEND_API_KEY
- ❌ WORKOS_API_KEY

**MCP:**
- ❌ GITHUB_TOKEN

**Webhooks (Optional):**
- ❌ STRIPE_WEBHOOK_SECRET
- ❌ WORKOS_WEBHOOK_SECRET
- ❌ GITHUB_WEBHOOK_SECRET
- ❌ RESEND_WEBHOOK_SECRET

#### Deployments (7 missing)
- ❌ do-db
- ❌ do-auth
- ❌ do-schedule
- ❌ do-webhooks
- ❌ do-email
- ❌ do-mcp
- ❌ do-gateway

## 🚀 Quick Configuration

### Option A: Automated Wizard (Recommended)

Run the interactive configuration wizard:

```bash
cd /Users/nathanclevenger/Projects/.do/workers
./scripts/configure.sh
```

This will guide you through:
1. Creating all KV namespaces
2. Setting all required secrets
3. Updating wrangler.jsonc files automatically

### Option B: Manual Setup

Follow the step-by-step guide in [QUICK-START.md](./QUICK-START.md).

### Check Status

Run the status checker anytime:

```bash
./scripts/check-status.sh
```

## 📋 Required Credentials

### You'll Need

1. **PostgreSQL Database**
   - Get connection string from [Neon](https://console.neon.tech)
   - Format: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname`

2. **WorkOS Account**
   - Create account at [WorkOS](https://dashboard.workos.com)
   - Get: API Key, Client ID, Client Secret
   - Used for: OAuth, SSO, Directory Sync

3. **Resend Account**
   - Create account at [Resend](https://resend.com)
   - Get: API Key
   - Used for: Transactional emails

4. **GitHub Token**
   - Create at [GitHub](https://github.com/settings/tokens)
   - Permissions: `repo`, `read:org`
   - Used for: MCP GitHub integration

5. **Webhook Secrets (Optional)**
   - Stripe: From Stripe Dashboard
   - WorkOS: From WorkOS Dashboard
   - GitHub: From Repository Settings
   - Resend: From Resend Dashboard

### Generate JWT Secrets

```bash
# JWT Secret
openssl rand -base64 32

# JWT Refresh Secret (use different value)
openssl rand -base64 32
```

## 📝 Configuration Steps

### Step 1: Create KV Namespaces

#### Gateway
```bash
cd gateway
wrangler kv:namespace create "GATEWAY_KV"
# Copy the ID and update wrangler.jsonc line 62
```

#### Auth
```bash
cd auth
wrangler kv:namespace create "RATE_LIMIT_KV"
# Copy ID, update wrangler.jsonc line 19

wrangler kv:namespace create "SESSIONS_KV"
# Copy ID, update wrangler.jsonc line 24
```

### Step 2: Set Secrets

#### Database
```bash
cd db
wrangler secret put DATABASE_URL
# Paste your Neon PostgreSQL connection string
```

#### Auth
```bash
cd auth
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
wrangler secret put WORKOS_CLIENT_SECRET
wrangler secret put JWT_SECRET          # openssl rand -base64 32
wrangler secret put JWT_REFRESH_SECRET  # openssl rand -base64 32
```

#### Email
```bash
cd email
wrangler secret put RESEND_API_KEY
wrangler secret put WORKOS_API_KEY  # Same as Auth
```

#### MCP
```bash
cd mcp
wrangler secret put GITHUB_TOKEN
```

#### Webhooks (Optional)
```bash
cd webhooks
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put WORKOS_WEBHOOK_SECRET
wrangler secret put GITHUB_WEBHOOK_SECRET
wrangler secret put RESEND_WEBHOOK_SECRET
```

### Step 3: Verify Configuration

```bash
./scripts/check-status.sh
# Should show 100% complete
```

### Step 4: Deploy Services

```bash
./scripts/deploy-all.sh
```

Or deploy individually:

```bash
cd db && pnpm deploy && cd ..
cd auth && pnpm deploy && cd ..
cd schedule && pnpm deploy && cd ..
cd webhooks && pnpm deploy && cd ..
cd email && pnpm deploy && cd ..
cd mcp && pnpm deploy && cd ..
cd gateway && pnpm deploy && cd ..
```

### Step 5: Verify Deployments

```bash
# Check all services are healthy
curl https://do-gateway.YOUR_SUBDOMAIN.workers.dev/health
curl https://do-db.YOUR_SUBDOMAIN.workers.dev/health
curl https://do-auth.YOUR_SUBDOMAIN.workers.dev/health
```

## 🔍 Troubleshooting

### Can't Create KV Namespace

**Error:** `Authentication error`

**Solution:** Run `wrangler login` first

### Can't Set Secret

**Error:** `No such service`

**Solution:** Make sure you're in the correct service directory

### Wrangler.jsonc Not Updating

**Solution:** Manually edit the file and replace placeholder IDs with actual KV namespace IDs

### Check Current Secrets

```bash
cd <service>
wrangler secret list
```

### Delete and Recreate Secret

```bash
wrangler secret delete SECRET_NAME
wrangler secret put SECRET_NAME
```

## 📚 Documentation

- [QUICK-START.md](./QUICK-START.md) - 5-minute setup guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [INTEGRATION.md](./INTEGRATION.md) - Integration testing
- [STATUS.md](./STATUS.md) - Implementation status

## 🎯 Success Criteria

Configuration is complete when:

- ✅ All KV namespaces created (4 total)
- ✅ All required secrets set (13 minimum, 17 with webhooks)
- ✅ All services deployed (7 services)
- ✅ Health checks return 200 for all services
- ✅ Status checker shows 100% complete

## ⏭️ Next Steps

After configuration is complete:

1. Run integration tests (see [INTEGRATION.md](./INTEGRATION.md))
2. Verify performance benchmarks
3. Configure custom domains (optional)
4. Set up monitoring and alerts

---

**Last Updated:** 2025-10-03
**Run:** `./scripts/check-status.sh` to update this status
