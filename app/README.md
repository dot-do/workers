# App Service - Admin CMS Worker

Admin CMS worker that proxies requests to Payload CMS deployed on Cloudflare Pages.

## Overview

This worker provides:
- **HTTP Proxy** - Forwards requests to Payload CMS Pages deployment
- **RPC Interface** - Service-to-service communication
- **Health Checks** - Service health monitoring

## Architecture

```
admin.do → gateway → app worker → Payload Pages (admin-payload.pages.dev)
```

## Configuration

### Environment Variables

```bash
# Payload CMS Pages URL (optional, defaults to admin-payload.pages.dev)
PAYLOAD_URL=https://admin-payload.pages.dev
```

### Secrets

```bash
# Payload secret (required)
wrangler secret put PAYLOAD_SECRET
```

### Service Bindings

- **DB** - Database service for data access
- **AUTH** - Auth service for authentication

### D1 Database

```bash
# Create D1 database
wrangler d1 create admin

# Update wrangler.jsonc with database_id
# "database_id": "actual-d1-database-id"

# Run Payload migrations
cd ../../projects/app
NODE_ENV=production PAYLOAD_SECRET=your-secret pnpm payload migrate
```

### R2 Bucket

```bash
# Create R2 bucket for media storage
wrangler r2 bucket create admin-media
```

## Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test
```

## Deployment

```bash
# Build
pnpm build

# Deploy
pnpm deploy

# Or deploy directly
wrangler deploy
```

## Usage

### HTTP Proxy

All requests are proxied to Payload CMS:

```bash
# Health check (handled by worker)
curl https://admin.do/health

# Payload admin panel
curl https://admin.do/admin

# Payload API
curl https://admin.do/api/users
curl https://admin.do/api/media
```

### RPC Interface

```typescript
// Call from other services
const health = await env.APP.health()
// { status: 'healthy', timestamp: '...' }
```

## Integration with Payload CMS

### Payload Deployment

The Payload CMS app is deployed separately to Cloudflare Pages:

```bash
cd ../../projects/app
pnpm build
pnpm deploy
```

### Domain Routing

The worker expects Payload to be deployed at:
- Production: `https://admin-payload.pages.dev`
- Custom domain: Set `PAYLOAD_URL` environment variable

### Authentication Flow

```
1. User visits admin.do/admin
2. Gateway checks auth (middleware)
3. If not authenticated, redirect to auth.services.do/login
4. After login, redirect back to admin.do/admin
5. Gateway forwards to app worker
6. App worker proxies to Payload Pages
7. Payload renders admin UI
```

## Related Services

- **Payload CMS** - `projects/app/` - Full CMS application
- **Gateway** - `workers/gateway/` - Routes admin.do to this worker
- **Auth** - `workers/auth/` - WorkOS authentication
- **DB** - `workers/db/` - Database access

## Documentation

- [Payload CMS Docs](https://payloadcms.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
- [Cloudflare Pages](https://developers.cloudflare.com/pages)

---

**Status:** Ready for deployment
**Dependencies:** DB service, AUTH service, Payload Pages deployment
**Domain:** admin.do
