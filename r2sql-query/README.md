# R2 SQL Query Worker

Proxy worker for executing R2 SQL queries via Cloudflare API. Enables local testing and production use without needing Wrangler CLI.

## Architecture

This Worker provides:
- **HTTP API** - Query R2 SQL via POST endpoint
- **RPC Interface** - Service-to-service calls via Workers RPC
- **Error Handling** - Graceful fallback and error messages
- **Local Testing** - Works with `wrangler dev --remote`

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Create `.dev.vars` from template:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your R2 SQL auth token:

```bash
R2_SQL_AUTH_TOKEN=your-token-here
```

**Create API Token:**
1. Visit: https://dash.cloudflare.com/profile/api-tokens
2. Create Token → Create Custom Token
3. Permissions: Account → R2 Data Catalog → Read & Write
4. Copy token to `.dev.vars`

### 3. Deploy Secret (Production)

```bash
wrangler secret put R2_SQL_AUTH_TOKEN
# Paste your token when prompted
```

## Development

### Start Development Server

```bash
pnpm dev
```

This runs `wrangler dev --remote` to test against live R2 SQL infrastructure.

### Test Query

```bash
curl -X POST http://localhost:8787/query \
  -H 'Content-Type: application/json' \
  -d '{
    "sql": "SELECT * FROM default.relationships LIMIT 5"
  }'
```

### Test with Custom Warehouse

```bash
curl -X POST http://localhost:8787/query \
  -H 'Content-Type: application/json' \
  -d '{
    "sql": "SELECT fromNs, fromId FROM default.relationships WHERE toNs = '\''github.com'\''",
    "warehouse": "custom-warehouse-name"
  }'
```

## API Reference

### POST /query

Execute an R2 SQL query.

**Request:**
```json
{
  "sql": "SELECT * FROM default.relationships WHERE toNs = 'github.com' LIMIT 10",
  "warehouse": "optional-warehouse-name"
}
```

**Response (Success):**
```json
{
  "results": [
    {
      "fromNs": "docs.do",
      "fromId": "/api",
      "fromType": "Documentation",
      "predicate": "links_to",
      "toNs": "github.com",
      "toId": "/dot-do/api",
      "toType": "Repository",
      "data": "{\"linkText\":\"API service\"}",
      "createdAt": "2025-10-04T15:49:38.906Z"
    }
  ],
  "meta": {
    "rows": 1,
    "duration": 125
  }
}
```

**Response (Error):**
```json
{
  "results": [],
  "meta": {
    "rows": 0,
    "duration": 0
  },
  "error": "R2 SQL direct API not available. Query must be executed via Wrangler CLI: wrangler r2 sql query \"warehouse\" \"SELECT ...\""
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-04T15:49:38.906Z"
}
```

## RPC Interface

Use from other Workers via service binding:

```typescript
// From another worker
const result = await env.R2SQL_QUERY_SERVICE.query(
  'SELECT * FROM default.relationships LIMIT 10',
  'optional-warehouse-name'
)

console.log(result.results) // Query results
console.log(result.meta.rows) // Number of rows
console.log(result.meta.duration) // Query duration (ms)
```

## Deployment

### Deploy to Production

```bash
pnpm deploy
```

### Deploy to Staging

```bash
wrangler deploy --env staging
```

## Notes

### R2 SQL API Availability

As of 2025-10-04, Cloudflare R2 SQL is in Open Beta and does not have a direct HTTP API for queries. This Worker attempts multiple possible API endpoints and falls back to an error message if direct API access is not available.

**Workarounds:**
1. Use Wrangler CLI (current approach)
2. Wait for Cloudflare to release query API
3. Use this Worker as a proxy that shells out to Wrangler (requires special setup)

### Environment Variables

- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID (configured in wrangler.jsonc)
- `R2_WAREHOUSE_NAME` - Default warehouse name (format: `accountId_bucketName`)
- `R2_SQL_AUTH_TOKEN` - API token with R2 Data Catalog permissions (secret)

### Performance

Query latency includes:
- Network roundtrip to Worker
- Worker processing time
- R2 SQL query execution
- Network roundtrip from R2 SQL

Typical latency: Worker overhead (~5-10ms) + R2 SQL execution time

## Troubleshooting

### "R2 SQL direct API not available"

This means the Cloudflare API endpoints for R2 SQL queries are not yet public. Options:

1. **Wait for API release** - Cloudflare may add this in future
2. **Use Wrangler CLI** - Current recommended approach
3. **Contact Cloudflare** - Ask about API availability

### "Unauthorized" or "Invalid token"

Check that:
- `.dev.vars` has correct `R2_SQL_AUTH_TOKEN`
- Token has "R2 Data Catalog Read & Write" permissions
- Token is not expired

### Queries Timing Out

Increase timeout in Worker code or use `wrangler dev --remote` to test against live infrastructure.

## References

- **R2 SQL Docs**: https://developers.cloudflare.com/r2-sql/
- **Deep Dive Blog**: https://blog.cloudflare.com/r2-sql-deep-dive/
- **Wrangler Config**: https://developers.cloudflare.com/workers/wrangler/configuration/

## Related Files

- `scripts/benchmark-backlinks.ts` - Benchmark suite that uses this Worker
- `packages/graph-api/src/adapters/r2sql.ts` - R2 SQL adapter
- `docs/R2-SQL-RESEARCH.md` - Research document

---

**Status:** Ready for testing with `wrangler dev --remote`
