# Routes Worker

A Cloudflare Worker that serves domain inventory as static assets using **Workers Assets**.

## Overview

This worker serves pre-compiled domain data from Workers Assets with zero runtime overhead. All domain MDX files are processed at build time using `mdxdb` and compiled into static JSON and HTML files.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Build Process                         │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  sites/do/*/index.mdx     │
              │  (Domain MDX files)       │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  mdxdb (velite)           │
              │  Parse & validate MDX     │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  build-domain-routes.ts   │
              │  Compile to JSON + HTML   │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  public/domains/*         │
              │  (Static assets)          │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  Workers Assets           │
              │  (Cloudflare CDN)         │
              └───────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Runtime (Worker)                      │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  GET /domains             │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  env.ASSETS.fetch()       │
              │  Serve from Workers Assets│
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │  Response (JSON or HTML)  │
              │  + CORS headers           │
              └───────────────────────────┘
```

## Routes

### HTML Routes

- **`GET /domains`** - Interactive HTML index page with domain grid
  - Shows working/not working/expiring domains
  - Responsive card layout
  - Click-through to live domains
  - Statistics dashboard

### API Routes

- **`GET /domains/index.json`** - All domains as JSON array
  ```json
  [
    {
      "domain": "fetch.do",
      "tld": "do",
      "name": "fetch",
      "httpStatus": 200,
      "httpWorking": true,
      "expectedBehavior": "Proxy/fetch utility",
      ...
    }
  ]
  ```

- **`GET /domains/{domain}/index.json`** - Individual domain details
  ```json
  {
    "domain": "fetch.do",
    "tld": "do",
    "name": "fetch",
    "dnsProvider": "cloudflare",
    "expirationDate": "2026-07-20T10:59:01.530Z",
    "daysUntilExpiration": 289,
    "registrar": "Registrar NIC .DO",
    "httpStatus": 200,
    "httpWorking": true,
    "expectedBehavior": "Proxy/fetch utility",
    "testPath": "/example.com",
    "cloudflareAccountId": "...",
    "activeInCloudflare": true,
    "metadata": { ... }
  }
  ```

- **`GET /domains/stats.json`** - Statistics
  ```json
  {
    "totalDomains": 105,
    "byTld": { "do": 105 },
    "byRegistrar": { "Registrar NIC .DO": 105 },
    "byStatus": {
      "working": 68,
      "notWorking": 37,
      "activeInCloudflare": 102,
      "nameserverMismatch": 3
    },
    "expiringSoon": 5
  }
  ```

## Build Process

### 1. Velite Configuration (`sites/velite.config.ts`)

Defines the schema for domain MDX files:

```typescript
const domainSchema = s.object({
  domain: s.string(),
  tld: s.string(),
  name: s.string(),
  dnsProvider: s.string().optional(),
  httpStatus: s.number().optional(),
  httpWorking: s.boolean().optional(),
  expectedBehavior: s.string().optional(),
  // ... more fields
})
```

### 2. Build Script (`scripts/build-domain-routes.ts`)

1. Initializes `@mdxdb/fs` with velite config
2. Reads all domain MDX files from `sites/do/*/index.mdx`
3. Validates against schema
4. Compiles to static JSON files
5. Generates HTML index page
6. Outputs to `workers/routes/public/domains/`

### 3. Workers Assets

The `public/` directory is automatically uploaded to Cloudflare and served via the global CDN:

```
public/domains/
├── index.html           # Interactive dashboard
├── index.json           # All domains
├── stats.json           # Statistics
├── fetch.do/
│   └── index.json       # fetch.do details
├── extract.do/
│   └── index.json       # extract.do details
└── ... (105 domains)
```

## Development

### Build and Deploy

```bash
# Build domain assets
bun run build

# Test locally
bun run dev
# Visit http://localhost:8787/domains

# Deploy to production
bun run deploy:production
```

### Adding New Domains

1. Add domain MDX file: `sites/do/newdomain/index.mdx`
2. Run enrichment: `bun scripts/enrich-domains.ts`
3. Rebuild routes: `bun run build` (in workers/routes)
4. Deploy: `bun run deploy`

### Updating Existing Domains

1. Modify MDX file or re-run enrichment
2. Rebuild routes
3. Deploy

The worker will automatically serve the updated data.

## Workers Assets Features

### Performance

- **Global CDN**: Assets served from Cloudflare's 300+ edge locations
- **Zero Runtime Overhead**: No database queries, no API calls
- **Instant Responses**: Static files served directly from memory
- **Automatic Caching**: 1-hour cache headers for optimal performance

### Reliability

- **Always Available**: Assets never go down (unlike databases)
- **No Rate Limits**: Serve unlimited requests
- **Instant Rollback**: Git-based deployment history
- **Version Control**: Assets tracked in git

### Cost

- **Free Tier**: 10 million requests/month included
- **No Database Costs**: No PostgreSQL/D1/KV bills
- **Edge Compute**: Minimal CPU usage (just routing)

## Integration Examples

### Fetch All Domains

```typescript
const response = await fetch('https://routes.do/domains/index.json')
const domains = await response.json()

console.log(`Total domains: ${domains.length}`)
const working = domains.filter(d => d.httpWorking)
console.log(`Working domains: ${working.length}`)
```

### Get Specific Domain

```typescript
const response = await fetch('https://routes.do/domains/fetch.do/index.json')
const domain = await response.json()

console.log(`${domain.domain} - ${domain.expectedBehavior}`)
console.log(`Status: ${domain.httpStatus}`)
console.log(`Expires in: ${domain.daysUntilExpiration} days`)
```

### Get Statistics

```typescript
const response = await fetch('https://routes.do/domains/stats.json')
const stats = await response.json()

console.log(`Total: ${stats.totalDomains}`)
console.log(`Working: ${stats.byStatus.working}`)
console.log(`Expiring soon: ${stats.expiringSoon}`)
```

### Use in Dashboard

```html
<!DOCTYPE html>
<html>
<body>
  <div id="domains"></div>
  <script>
    fetch('https://routes.do/domains/index.json')
      .then(r => r.json())
      .then(domains => {
        const html = domains
          .filter(d => d.httpWorking)
          .map(d => `<div>${d.domain} - ${d.expectedBehavior}</div>`)
          .join('')
        document.getElementById('domains').innerHTML = html
      })
  </script>
</body>
</html>
```

## CORS Support

All routes include CORS headers for cross-origin access:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Use from any domain without CORS errors.

## Monitoring

### Worker Analytics

View in Cloudflare dashboard:
- Request volume
- Response times
- Error rates
- Geographic distribution

### Asset Analytics

Track:
- Cache hit rates
- Bandwidth usage
- Popular domains
- API vs HTML traffic

## Future Enhancements

### Planned Features

- [ ] Search API (`GET /domains/search?q=fetch`)
- [ ] Filter by status (`GET /domains?status=working`)
- [ ] RSS feed for expiring domains
- [ ] Webhook notifications
- [ ] Historical data (track changes over time)

### Integration Ideas

- Monitor expiring domains in Slack
- Auto-renew critical domains
- Track HTTP status changes
- Alert on nameserver mismatches
- Domain health dashboard

## Related Documentation

- [Domain Enrichment](../../notes/2025-10-04-domain-enrichment.md)
- [Registrar Fetching](../../notes/2025-10-04-registrar-fetch-implementation.md)
- [GitHub Issue #2](https://github.com/dot-do/.do/issues/2)

## Tech Stack

- **Workers Assets** - Static asset serving
- **mdxdb** - MDX database abstraction
- **velite** - MDX validation and processing
- **TypeScript** - Type-safe worker code
- **Bun** - Fast JavaScript runtime
