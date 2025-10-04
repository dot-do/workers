# Workers Scripts

Utility scripts for development, testing, and deployment.

## Database Setup

### setup-graph-db.sh

Creates and initializes the graph database (D1) with Things & Relationships schemas.

```bash
# Run from workers/ directory
chmod +x scripts/setup-graph-db.sh
./scripts/setup-graph-db.sh
```

**What it does:**
1. Creates D1 database named `graph-db`
2. Applies `things` table schema
3. Applies `relationships` table schema
4. Outputs database ID for wrangler.jsonc configs

**Required updates after running:**
- `workers/graph/wrangler.jsonc` - Set `database_id`
- `workers/importers/onet/wrangler.jsonc` - Set `database_id`

## Testing

### test-onet-import.ts

End-to-end test of ONET importer with sample data. Validates parser and graph API without requiring deployed services.

```bash
# Run from workers/ directory
npx tsx scripts/test-onet-import.ts
```

**What it tests:**
1. Parser transforms ONET MDX → Things & Relationships
2. Correct number of entities created
3. Relationships properly formed
4. Sample data structure

**Sample output:**
```
🧪 Testing ONET Import...

📝 Parsing sample ONET data...
   ✅ Parsed 9 things
   ✅ Parsed 11 relationships

📊 Things by type:
   - occupation: 2
   - skill: 7

🔗 Relationships by predicate:
   - requires_skill: 9
   - related_to: 2
```

## Deployment

### Deploy Order

Services must be deployed in dependency order:

```bash
# 1. Core infrastructure
cd workers/graph && pnpm deploy

# 2. Importers
cd workers/importers/onet && pnpm deploy

# 3. Test endpoints
curl https://graph.your-subdomain.workers.dev/health
curl https://onet-importer.your-subdomain.workers.dev/health
```

### Deploy via Workers for Platforms

For production deployments using dispatch namespaces:

```bash
# Deploy via Deploy API
cd workers/graph
pnpm build

SCRIPT_B64=$(cat dist/index.js | base64)

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

## Development Workflow

### Complete Setup (First Time)

```bash
# 1. Install dependencies
pnpm install

# 2. Setup database
./scripts/setup-graph-db.sh

# 3. Update wrangler.jsonc files with database_id

# 4. Test parser locally
npx tsx scripts/test-onet-import.ts

# 5. Deploy services
cd workers/graph && pnpm deploy
cd workers/importers/onet && pnpm deploy

# 6. Import real data (via RPC, REST, or MCP)
```

### Local Development

```bash
# Start graph service locally
cd workers/graph
pnpm dev
# Running on http://localhost:8787

# Start onet-importer locally
cd workers/importers/onet
pnpm dev
# Running on http://localhost:8795

# Test locally
curl http://localhost:8787/health
curl http://localhost:8795/health
```

### Testing Changes

```bash
# Run parser test
npx tsx scripts/test-onet-import.ts

# Run unit tests
cd workers/graph && pnpm test
cd workers/importers/onet && pnpm test

# Type check
pnpm typecheck
```

## Troubleshooting

### Database not found

```bash
# List databases
npx wrangler d1 list

# Re-run setup if needed
./scripts/setup-graph-db.sh
```

### Schema errors

```bash
# Drop and recreate tables
npx wrangler d1 execute graph-db --command="DROP TABLE IF EXISTS relationships"
npx wrangler d1 execute graph-db --command="DROP TABLE IF EXISTS things"

# Re-apply schemas
./scripts/setup-graph-db.sh
```

### Import errors

```bash
# Check parser output
npx tsx scripts/test-onet-import.ts

# Check service logs
npx wrangler tail graph
npx wrangler tail onet-importer
```

### Type errors

```bash
# Rebuild packages
pnpm install
cd packages/graph-types && pnpm build
cd packages/graph-api && pnpm build
```

## Next Scripts (Planned)

- `seed-sample-data.ts` - Import sample ONET data to deployed service
- `benchmark-import.ts` - Performance testing with large datasets
- `compare-databases.ts` - Benchmark D1 vs R2 SQL vs ClickHouse
- `validate-graph.ts` - Validate graph integrity and relationships
- `migrate-importers.ts` - Migrate legacy import scripts to graph API

## Related Documentation

- [Graph API README](../packages/graph-api/README.md)
- [Graph Service README](../graph/README.md)
- [ONET Importer README](../importers/onet/README.md)
- [Workers CLAUDE.md](../CLAUDE.md)
