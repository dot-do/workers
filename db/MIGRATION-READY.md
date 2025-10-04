# ClickHouse Graph Schema Migration - READY TO DEPLOY

## Status: ✅ Code Complete, ⏸️  Awaiting Authentication

All migration code is complete and ready. The only blocker is ClickHouse authentication.

## What's Complete

✅ **Optimized Schema** (`schema.graph.sql`)
- 350+ lines of optimized SQL
- Lightweight `graph_things` and `graph_relationships` tables
- Materialized views for auto-population
- Bloom filter indexes for performance
- Sort order optimized for backlink queries

✅ **Migration Script** (`migrate-graph-schema.ts`)
- Automated schema application
- Progress reporting
- Error handling
- Verification steps

✅ **Updated Adapter** (`packages/graph-api/src/adapters/clickhouse.ts`)
- Complete rewrite using @clickhouse/client-web
- Proper named parameter support
- Type inference

✅ **Documentation** (`notes/2025-10-04-clickhouse-graph-optimization.md`)
- 800+ lines of comprehensive documentation
- Architecture diagrams
- Performance expectations
- Sample queries

## The Issue

ClickHouse Cloud at `https://bkkj10mmgz.us-east-1.aws.clickhouse.cloud:8443` requires a password:

```bash
$ curl -u "default:" "https://bkkj10mmgz.us-east-1.aws.clickhouse.cloud:8443/?query=SELECT+1"
Code: 194. DB::Exception: default: Authentication failed: password is incorrect
```

The password is stored as a Wrangler secret (not visible in wrangler.jsonc).

## Solution Options

### Option 1: Get Password from ClickHouse Cloud (Recommended)

1. Visit https://clickhouse.cloud/
2. Navigate to your service settings
3. Copy or reset the password
4. Update `.env` file:
   ```bash
   CLICKHOUSE_PASSWORD=your_actual_password_here
   ```
5. Run migration:
   ```bash
   pnpm tsx db/migrate-graph-schema.ts
   ```

### Option 2: Use Wrangler Secret

If password is stored as wrangler secret:

```bash
# Get the secret value (if you have it)
npx wrangler secret put CLICKHOUSE_PASSWORD

# Then run migration with wrangler dev --remote
cd /Users/nathanclevenger/Projects/.do/workers/db
npx wrangler dev --remote --env production

# In another terminal, trigger migration via the worker
# (requires adding an admin endpoint to db service)
```

### Option 3: Add Admin Endpoint to DB Worker

Add this to `db/src/index.ts`:

```typescript
// Admin routes (restricted)
admin.post('/migrate-graph-schema', async (c) => {
  const { readFileSync } = await import('fs')
  const { join } = await import('path')

  const schemaSQL = readFileSync(join(__dirname, '../schema.graph.sql'), 'utf-8')
  const statements = schemaSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  const results = []
  for (const statement of statements) {
    try {
      await clickhouse.command({
        query: statement,
        clickhouse_settings: {
          enable_json_type: 1,
          allow_experimental_vector_similarity_index: 1,
        },
      })
      results.push({ success: true })
    } catch (error: any) {
      results.push({ success: false, error: error.message })
    }
  }

  return c.json({ results })
})
```

Then call:
```bash
curl -X POST https://db.do/admin/migrate-graph-schema \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Expected Results

Once authentication is resolved, the migration will:

1. Create `graph_things` table
2. Create `graph_relationships` table
3. Create `graph_things_stream` materialized view
4. Create `graph_relationships_stream` materialized view
5. Create helper views:
   - `v_inbound_relationships`
   - `v_outbound_relationships`
   - `v_predicate_stats`
   - `v_type_stats`

## Verification Steps

After successful migration:

```sql
-- Check tables exist
SELECT name FROM system.tables
WHERE database = 'default' AND name LIKE 'graph_%';

-- Check counts
SELECT COUNT(*) FROM graph_things;
SELECT COUNT(*) FROM graph_relationships;

-- Test backlink query
SELECT * FROM graph_relationships
WHERE toNs = 'onet.org'
LIMIT 10;
```

## Performance Expectations

Based on D1 baseline (88-122ms):
- **Inbound queries**: < 50ms (2-3x faster)
- **Outbound queries**: < 100ms (similar)
- **Bulk inserts**: < 50ms/record (2x faster)

## Next Steps

1. ✅ Get ClickHouse password from https://clickhouse.cloud/
2. ⏳ Run migration: `pnpm tsx db/migrate-graph-schema.ts`
3. ⏳ Verify tables created
4. ⏳ Test sample queries
5. ⏳ Run performance benchmarks

---

**Last Updated:** 2025-10-04
**Status:** Code complete, awaiting ClickHouse authentication
**Documentation:** notes/2025-10-04-clickhouse-graph-optimization.md
