# Workers Runbook - Operational Procedures

**Version:** 1.0.0
**Last Updated:** 2025-10-04
**Status:** Production Ready

This runbook provides step-by-step procedures for common operational tasks in the Workers for Platforms architecture.

---

## Table of Contents

1. [Deploying a Service](#deploying-a-service)
2. [Rolling Back a Deployment](#rolling-back-a-deployment)
3. [Checking Deployment Status](#checking-deployment-status)
4. [Troubleshooting Failed Deployments](#troubleshooting-failed-deployments)
5. [Creating a New Service](#creating-a-new-service)
6. [Managing Dispatch Namespaces](#managing-dispatch-namespaces)
7. [Updating Service Bindings](#updating-service-bindings)
8. [Emergency Procedures](#emergency-procedures)
9. [Monitoring and Alerts](#monitoring-and-alerts)
10. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Deploying a Service

### Via Deploy API (Recommended for Production)

**Prerequisites:**
- Service code is tested and ready
- `DEPLOY_API_KEY` environment variable set
- Service bindings configured in `wrangler.jsonc`

**Steps:**

1. **Navigate to service directory:**
```bash
cd workers/<service-name>
```

2. **Run tests:**
```bash
pnpm test
```

3. **Build the service:**
```bash
pnpm build
```

4. **Verify build output:**
```bash
ls -lh dist/index.js
# Should see output like: -rw-r--r-- 1 user staff 42K Oct 4 12:00 dist/index.js
```

5. **Base64 encode the bundle:**
```bash
SCRIPT_B64=$(cat dist/index.js | base64)
echo "Bundle size: $(echo $SCRIPT_B64 | wc -c) bytes"
```

6. **Deploy via API:**
```bash
curl -X POST https://deploy.do/deploy \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"service\": \"<service-name>\",
    \"environment\": \"production\",
    \"script\": \"$SCRIPT_B64\",
    \"bindings\": {
      \"DB_SERVICE\": \"db\",
      \"AUTH_SERVICE\": \"auth\"
    },
    \"metadata\": {
      \"commit\": \"$(git rev-parse HEAD)\",
      \"branch\": \"$(git branch --show-current)\",
      \"author\": \"$(git config user.email)\",
      \"version\": \"v1.0.0\"
    }
  }"
```

7. **Verify deployment:**
```bash
# Check deployment logged
curl https://deploy.do/deployments?service=<service-name>&limit=1 \
  -H "Authorization: Bearer $DEPLOY_API_KEY"

# Test health endpoint
curl https://<service-name>.do/health
```

**Expected Output:**
```json
{
  "success": true,
  "deployment": {
    "id": "deploy_1696348800000_a1b2c3d4",
    "service": "<service-name>",
    "environment": "production",
    "status": "deployed",
    "url": "https://<service-name>.do",
    "version": "v1.0.0"
  }
}
```

### Via Wrangler (Local Testing Only)

**For local testing in development namespace:**

```bash
cd workers/<service-name>
npx wrangler deploy --dispatch-namespace dotdo-development
```

**Note:** Production deployments should always use the Deploy API for audit trails.

---

## Rolling Back a Deployment

### Via Deploy API

**Prerequisites:**
- `DEPLOY_API_KEY` environment variable set
- Previous deployment exists

**Steps:**

1. **Check deployment history:**
```bash
curl https://deploy.do/deployments?service=<service-name>&limit=10 \
  -H "Authorization: Bearer $DEPLOY_API_KEY"
```

2. **Identify version to rollback from:**
```bash
# Look at the current deployment and the previous one
# Note the version numbers and timestamps
```

3. **Initiate rollback:**
```bash
curl -X POST https://deploy.do/rollback \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "<service-name>",
    "environment": "production"
  }'
```

4. **Verify rollback:**
```bash
# Test service endpoint
curl https://<service-name>.do/health

# Check deployment history
curl https://deploy.do/deployments?service=<service-name>&limit=5 \
  -H "Authorization: Bearer $DEPLOY_API_KEY"
```

**Expected Output:**
```json
{
  "success": true,
  "deployment": {
    "id": "deploy_previous",
    "service": "<service-name>",
    "environment": "production",
    "version": "v0.9.0",
    "status": "deployed"
  },
  "message": "Rollback successful"
}
```

**Note:** Current rollback implementation marks deployment as rolled back. For automatic redeployment of previous version, store script bundles in R2.

---

## Checking Deployment Status

### Check Single Service

```bash
curl https://deploy.do/deployments?service=<service-name>&limit=1 \
  -H "Authorization: Bearer $DEPLOY_API_KEY"
```

### Check All Services

```bash
curl https://deploy.do/deployments?limit=50 \
  -H "Authorization: Bearer $DEPLOY_API_KEY"
```

### Check Specific Environment

```bash
curl https://deploy.do/deployments?environment=production&limit=20 \
  -H "Authorization: Bearer $DEPLOY_API_KEY"
```

### Check Service Health

```bash
# Check all core services
for service in gateway db auth schedule webhooks email mcp queue; do
  echo "Testing $service..."
  curl -s https://$service.do/health | jq
done
```

### View Deployment Logs (Cloudflare Dashboard)

1. Go to https://dash.cloudflare.com/
2. Select your account
3. Navigate to **Workers & Pages**
4. Click on the service name
5. Click **Logs** tab
6. Filter by timestamp of deployment

---

## Troubleshooting Failed Deployments

### Deployment Returns 500 Error

**Symptoms:**
```json
{
  "error": "Deployment failed: ...",
  "message": "Internal server error"
}
```

**Common Causes & Solutions:**

1. **Invalid Script Bundle**
   - Verify build succeeded: `ls -lh dist/index.js`
   - Check for syntax errors: `node dist/index.js` (won't run but shows parse errors)
   - Rebuild: `pnpm clean && pnpm build`

2. **Missing Service Bindings**
   - Check `wrangler.jsonc` has correct service bindings
   - Verify referenced services are deployed
   - Example: If binding to `DB_SERVICE`, ensure `db` is deployed

3. **Invalid Namespace**
   - Verify namespace exists: `npx wrangler dispatch-namespace list`
   - Check Deploy API has correct namespace names in vars

4. **Cloudflare API Token Issues**
   - Verify token has correct permissions
   - Check token hasn't expired
   - Test token: `curl -H "Authorization: Bearer $CF_TOKEN" https://api.cloudflare.com/client/v4/accounts/<id>/workers/scripts`

**Debug Steps:**

```bash
# 1. Check Deploy API logs
npx wrangler tail deploy

# 2. Try direct deployment to namespace (bypasses Deploy API)
cd workers/<service-name>
npx wrangler deploy --dispatch-namespace dotdo-development

# 3. Check deployment history for error patterns
curl https://deploy.do/deployments?service=<service-name>&limit=10 \
  -H "Authorization: Bearer $DEPLOY_API_KEY"
```

### Service Deployed but Returns 404

**Symptoms:**
```bash
curl https://gateway.do/health
# 404 Not Found
```

**Common Causes & Solutions:**

1. **Dispatcher Not Deployed**
   - Check: `curl https://dispatcher.drivly.workers.dev/health`
   - Deploy: `cd workers/dispatcher && pnpm deploy`

2. **Routing Not Configured**
   - Verify `dispatcher/wrangler.jsonc` has routes configured
   - Check routes: `npx wrangler routes list`

3. **Worker Not in Namespace**
   - List workers in namespace:
   ```bash
   curl https://api.cloudflare.com/client/v4/accounts/<id>/workers/dispatch/namespaces/dotdo-production/scripts \
     -H "Authorization: Bearer $CF_TOKEN"
   ```

4. **Wrong Namespace**
   - Check dispatcher is using correct namespace (PRODUCTION vs STAGING)
   - Verify `ENVIRONMENT` var in `dispatcher/wrangler.jsonc`

**Debug Steps:**

```bash
# 1. Test dispatcher directly
curl https://dispatcher.drivly.workers.dev/health

# 2. Check dispatcher logs
npx wrangler tail dispatcher

# 3. Test service with direct namespace URL (if available)
curl https://<worker-id>.dotdo-production.workers.dev/health
```

### Service Deployed but Crashes

**Symptoms:**
```bash
curl https://gateway.do/health
# 500 Internal Server Error
```

**Common Causes & Solutions:**

1. **Runtime Error**
   - Check service logs: `npx wrangler tail <service-name>`
   - Look for stack traces
   - Check for missing environment variables

2. **Service Binding Error**
   - Verify all bound services are deployed
   - Check binding names match
   - Test RPC calls: `env.DB_SERVICE.health()`

3. **Database Connection Error**
   - Test DB service directly: `curl https://db.do/health`
   - Check connection string is valid
   - Verify database credentials

**Debug Steps:**

```bash
# 1. Check service logs
npx wrangler tail <service-name>

# 2. Test in development
cd workers/<service-name>
pnpm dev
# Test locally: curl http://localhost:8787/health

# 3. Deploy to development namespace
npx wrangler deploy --dispatch-namespace dotdo-development
# Test: curl https://<service-name>.dev.do/health
```

---

## Creating a New Service

### Using Service Generator

```bash
cd workers

# Create domain service
pnpm create-service --name my-service --type domain

# Create integration service
pnpm create-service --name my-integration --type integration

# Create AI service
pnpm create-service --name my-ai --type ai
```

### Manual Setup

1. **Create directory:**
```bash
cd workers
mkdir my-service
cd my-service
```

2. **Initialize package:**
```bash
pnpm init
```

3. **Create `src/index.ts`:**
```typescript
import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'

interface Env {
  DB_SERVICE: any
  AUTH_SERVICE: any
}

// RPC Interface
export class MyService extends WorkerEntrypoint<Env> {
  async health() {
    return { status: 'ok', service: 'my-service' }
  }
}

// HTTP Interface
const app = new Hono<{ Bindings: Env }>()

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'my-service' })
})

export default app
```

4. **Create `wrangler.jsonc`:**
```jsonc
{
  "name": "my-service",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-01",
  "dispatch_namespace": "dotdo-production",

  "services": [
    { "binding": "DB_SERVICE", "service": "db" },
    { "binding": "AUTH_SERVICE", "service": "auth" }
  ]
}
```

5. **Add scripts to `package.json`:**
```json
{
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler deploy --dry-run --outdir dist",
    "deploy": "wrangler deploy",
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

6. **Create tests:**
```bash
mkdir tests
```

7. **Deploy:**
```bash
pnpm build
# Then use Deploy API as documented above
```

---

## Managing Dispatch Namespaces

### List Namespaces

```bash
npx wrangler dispatch-namespace list
```

### Create Namespace

```bash
npx wrangler dispatch-namespace create <namespace-name>
```

### Get Namespace Info

```bash
npx wrangler dispatch-namespace get <namespace-name>
```

### Delete Namespace (Caution!)

```bash
npx wrangler dispatch-namespace delete <namespace-name>
```

**Warning:** This deletes ALL workers in the namespace. Use with extreme caution.

### Configure Namespace to Trusted Mode

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/<account-id>/workers/dispatch/namespaces/<namespace-name>" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trusted": true
  }'
```

**Trusted Mode Benefits:**
- Access to `request.cf` object
- Shared cache across workers
- Better performance

### List Workers in Namespace

```bash
curl https://api.cloudflare.com/client/v4/accounts/<account-id>/workers/dispatch/namespaces/<namespace-name>/scripts \
  -H "Authorization: Bearer $CF_TOKEN" | jq
```

---

## Updating Service Bindings

### Add New Service Binding

1. **Edit `wrangler.jsonc`:**
```jsonc
{
  "services": [
    { "binding": "DB_SERVICE", "service": "db" },
    { "binding": "AUTH_SERVICE", "service": "auth" },
    { "binding": "NEW_SERVICE", "service": "new-service" }  // Added
  ]
}
```

2. **Update TypeScript types:**
```typescript
interface Env {
  DB_SERVICE: any
  AUTH_SERVICE: any
  NEW_SERVICE: any  // Added
}
```

3. **Rebuild and redeploy:**
```bash
pnpm build
# Deploy via Deploy API
```

### Remove Service Binding

1. **Remove from `wrangler.jsonc`**
2. **Remove from TypeScript interface**
3. **Remove all references in code**
4. **Rebuild and redeploy**

**Note:** Service bindings are immutable once deployed. To change bindings, redeploy the service.

---

## Emergency Procedures

### Service Down - Immediate Rollback

```bash
# 1. Identify affected service
curl https://<service>.do/health
# 500 or timeout

# 2. Rollback immediately
curl -X POST https://deploy.do/rollback \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "<service>",
    "environment": "production"
  }'

# 3. Verify service restored
curl https://<service>.do/health
# Should return 200

# 4. Notify team
# Post in Slack/Discord about rollback

# 5. Investigate root cause
npx wrangler tail <service> --format pretty
```

### Database Connection Lost

```bash
# 1. Check DB service health
curl https://db.do/health

# 2. Check database directly (if accessible)
# Use database client to verify connectivity

# 3. Check service logs
npx wrangler tail db

# 4. If DB service down, rollback
curl -X POST https://deploy.do/rollback \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -d '{"service": "db", "environment": "production"}'

# 5. If database itself down, check Neon/ClickHouse status
# Contact database provider support if needed
```

### Deploy API Down

```bash
# 1. Check Deploy API health
curl https://deploy.do/health

# 2. Check Deploy API logs
npx wrangler tail deploy

# 3. If Deploy API down, deploy directly via wrangler (emergency only)
cd workers/<service>
npx wrangler deploy --dispatch-namespace dotdo-production

# 4. Log manual deployment for audit trail
# Document in incident report
```

### All Services Down (Cascading Failure)

```bash
# 1. Check dispatcher
curl https://dispatcher.drivly.workers.dev/health

# 2. Check namespaces exist
npx wrangler dispatch-namespace list

# 3. If dispatcher down, redeploy
cd workers/dispatcher
pnpm deploy

# 4. If namespaces deleted (rare), recreate
npx wrangler dispatch-namespace create dotdo-production
# Then redeploy all services

# 5. Escalate to Cloudflare support if infrastructure issue
```

---

## Monitoring and Alerts

### Health Check Script

Create `scripts/health-check.sh`:
```bash
#!/bin/bash

SERVICES="gateway db auth schedule webhooks email mcp queue"
FAILED=0

for service in $SERVICES; do
  echo -n "Checking $service... "
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$service.do/health)

  if [ "$STATUS" = "200" ]; then
    echo "✅ OK"
  else
    echo "❌ FAILED (HTTP $STATUS)"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Results: $((${#SERVICES[@]} - FAILED))/${#SERVICES[@]} services healthy"

if [ $FAILED -gt 0 ]; then
  echo "⚠️ Some services are unhealthy!"
  exit 1
fi
```

**Run:**
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### Deployment Status Check

```bash
# Get recent deployments
curl https://deploy.do/deployments?limit=20 \
  -H "Authorization: Bearer $DEPLOY_API_KEY" | jq

# Filter for failures
curl https://deploy.do/deployments?limit=50 \
  -H "Authorization: Bearer $DEPLOY_API_KEY" | \
  jq '.deployments[] | select(.status == "failed")'
```

### Log Monitoring

```bash
# Monitor all services in real-time
for service in gateway db auth schedule webhooks email mcp queue; do
  npx wrangler tail $service &
done

# Kill all tails: pkill -f "wrangler tail"
```

---

## Common Issues and Solutions

### Issue: "Service not found" (404)

**Cause:** Dispatcher can't find service in routing table

**Solution:**
1. Check service name in dispatcher routing logic
2. Add service to dispatcher's valid workers list
3. Redeploy dispatcher

### Issue: "Service not deployed" (404)

**Cause:** Worker not in namespace yet

**Solution:**
1. Deploy service via Deploy API
2. Verify with: `curl https://deploy.do/deployments?service=<name>`

### Issue: "Invalid API key" (401)

**Cause:** API key not valid or missing deploy permission

**Solution:**
1. Create new API key with deploy permission
2. Update `DEPLOY_API_KEY` environment variable
3. Test: `curl https://auth.do/apikeys/validate -H "Authorization: Bearer $KEY"`

### Issue: "Insufficient permissions" (403)

**Cause:** User lacks deploy permission in RBAC

**Solution:**
1. Grant permission: `curl -X POST https://auth.do/permissions -d '{"userId": "<id>", "resource": "deployments", "action": "create"}'`
2. Verify: `curl https://auth.do/permissions/<userId>`

### Issue: Build Fails with Type Errors

**Cause:** TypeScript configuration or missing types

**Solution:**
```bash
# 1. Install dependencies
pnpm install

# 2. Check TypeScript config
cat tsconfig.json

# 3. Run type check
pnpm typecheck

# 4. Fix errors and rebuild
pnpm build
```

### Issue: Tests Fail After Deployment

**Cause:** Service binding mocks incorrect

**Solution:**
```bash
# 1. Check test mocks match production bindings
cat wrangler.jsonc
cat tests/*.test.ts

# 2. Update mocks to match
# 3. Rerun tests
pnpm test

# 4. If tests pass, redeploy
pnpm build && # deploy via API
```

---

## Useful Commands Reference

```bash
# Deploy a service
curl -X POST https://deploy.do/deploy \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -d @deploy-request.json

# Rollback a service
curl -X POST https://deploy.do/rollback \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -d '{"service": "gateway", "environment": "production"}'

# List deployments
curl https://deploy.do/deployments?limit=20 \
  -H "Authorization: Bearer $DEPLOY_API_KEY"

# Check service health
curl https://<service>.do/health

# View service logs
npx wrangler tail <service>

# List namespaces
npx wrangler dispatch-namespace list

# Deploy to namespace directly (testing only)
npx wrangler deploy --dispatch-namespace dotdo-development
```

---

## Additional Resources

- **[Workers CLAUDE.md](./CLAUDE.md)** - Complete architecture and development guide
- **[Deploy API README](./deploy/README.md)** - Deploy service documentation
- **[Dispatcher README](./dispatcher/README.md)** - Dispatcher documentation
- **[Migration Complete Report](/Users/nathanclevenger/Projects/.do/notes/2025-10-04-workers-for-platforms-complete.md)** - Migration status
- **[Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)** - Official documentation
- **[Workers for Platforms Docs](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/)** - Platform documentation

---

**Maintained By:** Platform Team
**Last Updated:** 2025-10-04
**Version:** 1.0.0
