# Quick Start Guide

Get the Schema.org Graph Database POC running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Cloudflare account (free tier works)
- Wrangler CLI installed (`npm install -g wrangler`)

## Setup Steps

### 1. Install Dependencies

```bash
cd tmp/cloudflare-data-poc-graph
npm install
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create D1 Database

```bash
npm run db:create
```

**Copy the database ID** from the output and update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "graph-db",
    "database_id": "YOUR_DATABASE_ID_HERE"  // ← Paste here
  }
]
```

### 4. Initialize Schema

```bash
npm run db:init
```

This creates the tables, indexes, triggers, views, and sample data.

### 5. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:8787`

## Test the API

### Check Health

```bash
curl http://localhost:8787/health
```

### List Sample Things

```bash
curl http://localhost:8787/things
```

### Get John Doe

```bash
curl "http://localhost:8787/things/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe"
```

### Traverse John's Network

```bash
curl "http://localhost:8787/query/traverse/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe?depth=2"
```

### Find Shortest Path

```bash
curl "http://localhost:8787/query/shortest-path?from=https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe&to=https%3A%2F%2Fschema.org%2FProduct%2Ftask-manager"
```

## Next Steps

1. **Explore Examples** - See `examples/example-queries.md` for more query patterns
2. **Add Your Data** - POST to `/things` and `/relationships`
3. **MDX Integration** - Set up webhooks for your MDX repositories
4. **Deploy** - `npm run deploy` to deploy to Cloudflare Workers

## Common Commands

```bash
# Type checking
npm run typecheck

# Format code
npm run format

# Query database directly
npm run db:query -- "SELECT * FROM things LIMIT 5"

# Deploy to production
npm run deploy

# View logs
wrangler tail
```

## Troubleshooting

### Database ID not found

Make sure you updated `wrangler.jsonc` with your actual database ID from step 3.

### Schema not initialized

Run `npm run db:init` to create tables and sample data.

### Port already in use

Change the port in `wrangler.jsonc`:

```jsonc
"dev": {
  "port": 8788  // ← Change this
}
```

## Resources

- **README.md** - Complete documentation
- **examples/example-queries.md** - Query patterns
- **examples/mdx-examples.md** - MDX integration
- **schema.sql** - Database schema reference
