# Graph Database & ONET Importer - Deployment Guide

Complete guide for deploying the graph database system and ONET importer.

## Overview

This deployment guide covers:
- Graph database setup (D1)
- Graph service deployment
- ONET importer deployment
- Testing and verification
- Production deployment via Workers for Platforms

## Architecture

### Two Storage Backends

The graph database supports **two storage backends** with identical APIs:

**1. D1 Database (Global, Best for Large Datasets)**
```
┌─────────────────┐
│   ONET MDX      │
│     Files       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ONET Importer   │  ◄── RPC/REST/MCP
│   (Parser)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Graph API     │  ◄── Things & Relationships
│  (CRUD Layer)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  D1 Database    │  ◄── Global read replicas
│ (Things + Rels) │      Sub-10ms reads worldwide
└─────────────────┘
```

**2. Durable Object SQLite (Strong Consistency, Per-User/Tenant)**
```
┌─────────────────┐
│   ONET MDX      │
│     Files       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ONET Importer   │  ◄── RPC/REST/MCP
│   (Parser)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Graph API     │  ◄── Things & Relationships
│  (CRUD Layer)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Durable Object │  ◄── Strongly consistent
│  SQLite Storage │      Transactional guarantees
└─────────────────┘      Single-region
```

### Backend Comparison

| Feature | D1 Database | Durable Object SQLite |
|---------|-------------|----------------------|
| **Read Performance** | Sub-10ms globally | Fast within region |
| **Write Performance** | Primary region only | Fast, strongly consistent |
| **Consistency** | Eventual consistency | Strong consistency |
| **Transactions** | Limited | Full ACID |
| **Distribution** | Global read replicas | Single region |
| **Best For** | Large datasets, global apps | Per-user/tenant graphs |
| **Cost** | Storage + operations | Storage + compute |

**Use D1 when:**
- Global user base requiring fast reads worldwide
- Large shared graph database
- Read-heavy workloads
- Eventual consistency is acceptable

**Use Durable Object SQLite when:**
- Per-user or per-tenant isolated graphs
- Strong consistency required
- Transactional guarantees needed
- Small to medium datasets per instance

## Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)
- Node.js 18+ and pnpm

## Step 1: Database Setup

### Create Database

```bash
cd /Users/nathanclevenger/Projects/.do/workers

# Run setup script
./scripts/setup-graph-db.sh
```

**What happens:**
1. Creates D1 database named `graph-db`
2. Applies `things` table schema
3. Applies `relationships` table schema
4. Outputs database ID

**Copy the database_id from the output!**

### Update Configuration

Update `database_id` in:

**workers/graph/wrangler.jsonc:**
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "graph-db",
      "database_id": "YOUR_DATABASE_ID_HERE"  // ← Update this
    }
  ]
}
```

**workers/importers/onet/wrangler.jsonc:**
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "graph-db",
      "database_id": "YOUR_DATABASE_ID_HERE"  // ← Update this
    }
  ]
}
```

### Verify Database

```bash
# List databases
npx wrangler d1 list

# Check tables
npx wrangler d1 execute graph-db --command="SELECT name FROM sqlite_master WHERE type='table'"

# Should show: things, relationships
```

## Step 2: Test Locally

### Run Parser Test

```bash
# Test parser without deploying
npx tsx scripts/test-onet-import.ts
```

**Expected output:**
```
🧪 Testing ONET Import...
📝 Parsing sample ONET data...
   ✅ Parsed 9 things
   ✅ Parsed 13 relationships
```

### Start Local Dev Servers

**Terminal 1 - Graph Service:**
```bash
cd workers/graph
pnpm dev
# Running on http://localhost:8787
```

**Terminal 2 - ONET Importer:**
```bash
cd workers/importers/onet
pnpm dev
# Running on http://localhost:8795
```

**Terminal 3 - Test Endpoints:**
```bash
# Health checks
curl http://localhost:8787/health
curl http://localhost:8795/health

# Query empty database
curl http://localhost:8787/things?ns=onet

# Check status
curl http://localhost:8795/status
```

## Step 3: Deploy Services

### Deploy Graph Service

```bash
cd workers/graph

# Install dependencies
pnpm install

# Run tests
pnpm test

# Deploy
pnpm deploy
```

**Expected output:**
```
✅ Successfully published your script to
   https://graph.your-subdomain.workers.dev
```

### Deploy ONET Importer

```bash
cd workers/importers/onet

# Install dependencies
pnpm install

# Run tests
pnpm test

# Deploy
pnpm deploy
```

**Expected output:**
```
✅ Successfully published your script to
   https://onet-importer.your-subdomain.workers.dev
```

### Verify Deployments

```bash
# Test graph service
curl https://graph.your-subdomain.workers.dev/health

# Test onet-importer
curl https://onet-importer.your-subdomain.workers.dev/health

# Check status
curl https://onet-importer.your-subdomain.workers.dev/status
```

## Step 4: Import Data

### Option A: REST API

```bash
# Create sample data file
cat > sample-onet.json << 'EOF'
[
  {
    "type": "occupation",
    "data": {
      "soc_code": "15-1252.00",
      "title": "Software Developers",
      "description": "Develop software applications",
      "job_zone": 4,
      "bright_outlook": true
    }
  },
  {
    "type": "skill",
    "data": {
      "element_id": "javascript",
      "name": "JavaScript",
      "description": "Programming language for web development",
      "category": "technical"
    }
  }
]
EOF

# Import via REST
curl -X POST https://onet-importer.your-subdomain.workers.dev/import/mdx \
  -H "Content-Type: application/json" \
  -d @sample-onet.json

# Check status
curl https://onet-importer.your-subdomain.workers.dev/status
```

### Option B: RPC (from another worker)

```typescript
// In another worker
const stats = await env.ONET_IMPORTER.importFromMdx(mdxFiles)
console.log(`Imported ${stats.occupations} occupations`)
```

### Option C: MCP (AI agents)

```typescript
// AI agent calls via MCP
POST https://onet-importer.your-subdomain.workers.dev/mcp
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "import_onet_mdx",
    "arguments": {
      "mdxFiles": [...]
    }
  }
}
```

## Step 5: Query Data

### Query Things

```bash
# Get all occupations
curl https://graph.your-subdomain.workers.dev/things?ns=onet&type=occupation

# Get specific occupation
curl https://graph.your-subdomain.workers.dev/things/onet/15-1252.00

# Get all skills
curl https://graph.your-subdomain.workers.dev/things?ns=onet&type=skill
```

### Query Relationships

```bash
# What requires JavaScript skill?
curl https://graph.your-subdomain.workers.dev/relationships/inbound?toNs=onet&toId=javascript

# What skills does Software Developer require?
curl https://graph.your-subdomain.workers.dev/relationships/outbound?fromNs=onet&fromId=15-1252.00&predicate=requires_skill
```

## Step 6: Workers for Platforms Deployment

For production deployments with dispatch namespaces:

### Prerequisites

1. **Create Dispatch Namespaces:**
```bash
npx wrangler dispatch-namespace create dotdo-production
npx wrangler dispatch-namespace create dotdo-staging
```

2. **Deploy Infrastructure:**
```bash
# Deploy API
cd workers/deploy
pnpm deploy

# Dispatcher
cd workers/dispatcher
pnpm deploy
```

3. **Get Deploy API Key:**
```bash
curl -X POST https://auth.do/apikeys \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"GitHub Deploy","permissions":["deploy"]}'
```

### Deploy via Deploy API

```bash
cd workers/graph

# Build
pnpm build

# Base64 encode
SCRIPT_B64=$(cat dist/index.js | base64)

# Deploy
curl -X POST https://deploy.do/deploy \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"service\": \"graph\",
    \"environment\": \"production\",
    \"script\": \"$SCRIPT_B64\",
    \"metadata\": {
      \"commit\": \"$(git rev-parse HEAD)\",
      \"branch\": \"main\"
    }
  }"
```

### Verify Production

```bash
# Test via dispatcher
curl https://graph.do/health

# Query data
curl https://graph.do/things?ns=onet&type=occupation
```

## Troubleshooting

### Database not found

```bash
# List databases
npx wrangler d1 list

# Re-create if needed
npx wrangler d1 create graph-db
```

### Schema errors

```bash
# Drop tables
npx wrangler d1 execute graph-db --command="DROP TABLE IF EXISTS relationships"
npx wrangler d1 execute graph-db --command="DROP TABLE IF EXISTS things"

# Re-apply
npx wrangler d1 execute graph-db --file=workers/graph/schema/things.sql
npx wrangler d1 execute graph-db --file=workers/graph/schema/relationships.sql
```

### Deployment fails

```bash
# Check wrangler version
npx wrangler --version

# Re-login
npx wrangler logout
npx wrangler login

# Check config
cat workers/graph/wrangler.jsonc
```

### Import fails

```bash
# Check logs
npx wrangler tail onet-importer

# Test locally first
cd workers/importers/onet
pnpm dev
```

### Type errors

```bash
# Clean install
rm -rf node_modules
pnpm install

# Rebuild packages
cd packages/graph-types && pnpm build
cd packages/graph-api && pnpm build
```

## Performance

### Expected Performance

**Parser** (1,000 occupations):
- Parse time: ~50ms
- Memory: <10MB

**Bulk Import** (1,000 things):
- Import time: ~200ms
- Database size: ~2MB

**Query** (inbound relationships):
- Query time: <10ms
- Indexed lookups

### Optimization Tips

1. **Use bulk operations** - Import in batches of 100-1000
2. **Index lookups** - Use (ns, id) for Things, (toNs, toId) for Relationships
3. **Pagination** - Limit results to 100 per page
4. **Caching** - Cache frequently accessed Things

## Next Steps

1. **Import Real ONET Data** - Use full ONET database
2. **Performance Testing** - Benchmark with 10,000+ occupations
3. **Database Comparison** - Test D1 vs R2 SQL vs ClickHouse
4. **Migrate Importers** - Update other import scripts to use graph API
5. **Add Monitoring** - Set up logging and alerts

## Related Documentation

- [Graph API README](./packages/graph-api/README.md)
- [Graph Service README](./graph/README.md)
- [ONET Importer README](./importers/onet/README.md)
- [Scripts README](./scripts/README.md)
- [Workers CLAUDE.md](./CLAUDE.md)

## Support

- **Issues:** https://github.com/dot-do/workers/issues
- **Docs:** https://developers.cloudflare.com/workers/
- **Community:** https://discord.gg/cloudflare-devs

---

**Last Updated:** 2025-10-04
**Status:** Ready for Production Testing
**Services:** Graph Database, ONET Importer
