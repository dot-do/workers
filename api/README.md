# API Worker - Single HTTP Entry Point

The API worker is the **only** worker with public HTTP access. All other workers are accessed via RPC (service bindings).

## Architecture

```
External Request → Cloudflare DNS → API Worker → Service Binding (RPC) → Target Worker
```

All workers have `workers.dev` disabled and no direct routes. Only the API worker handles HTTP traffic.

## Current Configuration

**Deployed:** https://api.drivly.workers.dev

**Service Bindings:**
- `DB_SERVICE` → db
- `AUTH_SERVICE` → auth
- `AGENT_SERVICE` → agent
- `FN_SERVICE` → fn
- `GATEWAY_SERVICE` → gateway

## Routing Strategy

The API worker uses **three routing layers**:

### 1. Special Domain Routing (Highest Priority)

**Subdomain Routing (*.apis.do):**
- `agents.apis.do` → agent service
- `db.apis.do` → db service
- `fn.apis.do` → fn service
- `auth.apis.do` → auth service
- `gateway.apis.do` → gateway service

**Path Routing (sites.do):**
- `sites.do/api.management` → gateway service (path metadata)
- `api.management.sites.do` → gateway service (subdomain metadata)

### 2. Path-Based Routing

- `/api/db/*` → db service
- `/api/auth/*` → auth service
- `/api/agents/*` → agents service
- `/api/workflows/*` → workflows service
- `/mcp/*` → mcp service

### 3. Domain-Based Routing (domain-routes.json)

1,273 domain mappings stored in `assets/domain-routes.json`:

```json
{
  "domain": "agent.do",
  "service": "agent",
  "binding": "AGENT_SERVICE",
  "requiresAuth": false
}
```

## Adding Domains

### Method 1: Zone Routes (Cloudflare Dashboard)

1. Go to Cloudflare Dashboard → Zone → DNS
2. Add CNAME record: `@ → api.drivly.workers.dev`
3. Go to Workers & Pages → api → Triggers → Routes
4. Add route: `yourdomain.com/*` (zone: yourdomain.com)

### Method 2: Custom Domains for SaaS

1. Go to Cloudflare Dashboard → SSL/TLS → Custom Hostnames
2. Add custom hostname: `customer.yourdomain.com`
3. Point to: `api.drivly.workers.dev`
4. No wrangler.jsonc changes needed

### Method 3: DNS CNAME

For domains already in your Cloudflare account:

1. Add CNAME record: `subdomain → api.drivly.workers.dev`
2. No additional configuration needed
3. API worker automatically routes based on domain-routes.json

## Testing Routes

```bash
# Test via workers.dev URL
curl -s https://api.drivly.workers.dev/health

# Test subdomain routing (*.apis.do)
curl -s https://agents.apis.do/health

# Test sites.do path routing
curl -s https://sites.do/api.management

# Test custom domain (after DNS setup)
curl -s https://yourdomain.com/health
```

## Adding Service Bindings

To add a new service:

1. Deploy the service worker
2. Add binding to `wrangler.jsonc`:
   ```jsonc
   "services": [
     { "binding": "NEW_SERVICE", "service": "new-service" }
   ]
   ```
3. Update routing logic in `src/index.ts` (if needed)
4. Redeploy: `npx wrangler deploy`

## Domain Routing Configuration

Add domains to `assets/domain-routes.json`:

```json
{
  "domain": "newservice.do",
  "service": "newservice",
  "binding": "NEWSERVICE_SERVICE",
  "requiresAuth": false,
  "requiresAdmin": false,
  "metadata": {
    "description": "New service description",
    "category": "Service"
  },
  "updatedAt": "2025-10-04T20:00:00.000Z"
}
```

Changes to domain-routes.json are cached with SWR (10s refresh).

## Development

```bash
# Local development
pnpm dev

# Deploy
npx wrangler deploy

# View logs
npx wrangler tail api --format pretty

# Check deployments
npx wrangler deployments list
```

## Architecture Benefits

✅ **Single Entry Point** - One worker handles all HTTP traffic
✅ **Flexible Routing** - DNS, zones, or custom domains
✅ **No Route Limits** - No wrangler.jsonc route limits
✅ **Dynamic Configuration** - domain-routes.json updates without redeploy
✅ **Custom Domains for SaaS** - Easy tenant-specific domains

## Related Documentation

- [workers/CLAUDE.md](../CLAUDE.md) - Workers architecture
- [Root CLAUDE.md](../../CLAUDE.md) - Multi-repo structure
- `assets/domain-routes.json` - Domain mappings (1,273 domains)
- `src/index.ts` - Routing logic
