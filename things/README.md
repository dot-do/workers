# Things Service

**Status:** ✅ Implementation Complete
**Task:** WS-101 Things Service Extraction
**Date:** 2025-10-02

## Overview

The Things Service provides CRUD operations for entities (things) in the graph database. It enriches entities with relationships and AI-generated content, and supports multiple response formats.

### Key Features

- **CRUD Operations** - Create, Read, Update, Delete things
- **Relationship Enrichment** - Automatically includes related entities
- **AI Generation Enrichment** - Merges AI-generated content
- **Multiple Formats** - JSON, MDX, JSON-LD responses
- **Full-Text Search** - PostgreSQL full-text search
- **RPC Interface** - For service-to-service calls
- **HTTP API** - REST endpoints for external access
- **Type Safety** - Full TypeScript with Zod validation

## Architecture

### Service Interfaces

```typescript
// 1. RPC Interface (WorkerEntrypoint)
export class ThingsService extends WorkerEntrypoint<Env> {
  async getThing(ns: string, id: string, format?: 'json' | 'mdx' | 'json-ld')
  async createThing(data: CreateThingInput)
  async updateThing(ns: string, id: string, updates: UpdateThingInput)
  async deleteThing(ns: string, id: string)
  async listThings(ns: string, options?: ListOptions)
  async searchThings(query: string, ns?: string, limit?: number)
}

// 2. HTTP API (Hono)
GET /health
GET /things/:ns/:id
GET /things/:ns
GET /search?q=query
POST /things
PUT /things/:ns/:id
DELETE /things/:ns/:id
```

### Dependencies

- **@db/ (Database RPC Service)** - Required for all database operations
- **@ai/ (AI Service)** - Optional for generation enrichment

### Response Formats

**JSON (Default):**
```json
{
  "ns": "onet",
  "id": "software-developers",
  "type": "Occupation",
  "data": { "name": "Software Developers" },
  "relationships": [...],
  "generations": [...]
}
```

**MDX:**
```markdown
---
ns: onet
id: software-developers
type: Occupation
---

# Software Developers

Content here...

## Relationships
- skills: programming
```

**JSON-LD:**
```json
{
  "@context": "https://schema.org",
  "@type": "Occupation",
  "@id": "https://onet.do/software-developers",
  "name": "Software Developers"
}
```

## Development

### Setup

```bash
cd /Users/nathanclevenger/Projects/.do/workers/things

# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Local Testing

```bash
# Start local dev server
pnpm dev

# Test endpoints
curl http://localhost:8787/health
curl http://localhost:8787/things/test/test-thing
curl http://localhost:8787/search?q=test
```

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test -- --coverage
```

## Deployment

### Prerequisites

1. **Database Service Deployed** - @db/ must be deployed first
2. **Service Binding Configured** - wrangler.toml has DB binding

### Deploy to Staging

```bash
wrangler deploy --env staging
```

Expected output:
```
✨ Built successfully
✨ Uploaded successfully
✨ Deployment complete
https://things-staging.workers.dev
```

### Deploy to Production

```bash
wrangler deploy
```

### Verify Deployment

```bash
# Check health
curl https://things.workers.dev/health

# Test RPC binding (via gateway)
curl https://api.services/things/onet/software-developers
```

## API Reference

### RPC Methods

**getThing(ns, id, format?)**
- Get thing by namespace and ID
- Optional format: 'json', 'mdx', 'json-ld'
- Returns enriched thing or null

**createThing(data)**
- Create new thing
- Auto-generates ID from name if not provided
- Returns created thing

**updateThing(ns, id, updates)**
- Update existing thing
- Returns updated thing or null

**deleteThing(ns, id)**
- Delete thing
- Returns boolean success

**listThings(ns, options?)**
- List things in namespace
- Options: type, limit, offset, sort
- Returns array of things

**searchThings(query, ns?, limit?)**
- Full-text search
- Optional namespace filter
- Returns array of matching things

### HTTP Endpoints

**GET /health**
- Health check
- Returns: `{ status: 'healthy', service: 'things' }`

**GET /things/:ns/:id**
- Get thing by namespace and ID
- Query params: format (json|mdx|json-ld)
- Returns: Thing object or 404

**GET /things/:ns**
- List things in namespace
- Query params: type, limit, offset, sort
- Returns: `{ things, total, limit, offset }`

**GET /search**
- Search things
- Query params: q (required), ns, limit
- Returns: `{ query, results, total }`

**POST /things**
- Create thing
- Body: `{ ns, id?, type, data, content?, visibility? }`
- Returns: Created thing (201)

**PUT /things/:ns/:id**
- Update thing
- Body: `{ type?, data?, content?, visibility? }`
- Returns: Updated thing or 404

**DELETE /things/:ns/:id**
- Delete thing
- Returns: `{ success: true }` or 404

## Configuration

### wrangler.toml

```toml
name = "things"
main = "src/index.ts"
compatibility_date = "2025-01-10"

[[services]]
binding = "DB"
service = "db"
environment = "production"
```

### Environment Variables

None required - uses service bindings.

## Testing

### Unit Tests

- `tests/service.test.ts` - RPC service tests
- `tests/http.test.ts` - HTTP API tests

### Test Coverage

- ✅ All RPC methods covered
- ✅ All HTTP endpoints covered
- ✅ Validation error handling
- ✅ Response format conversion
- ✅ 404 handling

Target: 80%+ coverage

## Monitoring

### Health Check

```bash
curl https://things.workers.dev/health
```

### Metrics (via Cloudflare Dashboard)

- Request rate
- Error rate
- Latency (p50, p95, p99)
- RPC call counts

## Troubleshooting

### "DB binding not found"

Ensure database service is deployed:
```bash
cd ../db
wrangler deploy
```

### Type errors

Run type check:
```bash
pnpm typecheck
```

### Tests failing

Check mock DB responses match expected interface:
```bash
pnpm test -- --reporter=verbose
```

## Related Services

- **@db/** - Database RPC service (required)
- **@api/** - Gateway service (routes to this service)
- **@ai/** - AI service (optional enrichment)

## Support

- **GitHub:** https://github.com/dot-do/workers
- **Issues:** https://github.com/dot-do/workers/issues
- **Docs:** /docs/services/things.md

---

**Last Updated:** 2025-10-02
**Engineer:** Backend Engineer D
**Status:** ✅ Complete, Ready for Deployment
