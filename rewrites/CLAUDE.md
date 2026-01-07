# Rewrites - AI Assistant Guidance

This directory contains **rewrites** of popular open-source databases and services, reimplemented on Cloudflare Durable Objects using SQLite and R2.

## Beads Issue Tracking Architecture

### The Two-Level Hierarchy

```
workers/.beads/          <- Strategic epics ONLY (cross-cutting)
  prefix: workers-

rewrites/{package}/.beads/  <- Implementation tasks (package-specific)
  prefix: {package}-
```

### Critical Rules

1. **Parent beads (workers/) = Strategic Epics Only**
   - Cross-cutting work spanning multiple rewrites
   - High-level feature coordination
   - DO NOT create implementation tasks here

2. **Child beads (rewrites/{package}/) = Implementation Tasks**
   - All detailed implementation work
   - TDD red-green-refactor cycles
   - Package-specific bugs and features

3. **Never Use Blocking Dependencies Across Repos**
   ```bash
   # CORRECT: Non-blocking reference
   bd dep relate workers-xxx supabase-yyy

   # WRONG: Hard blocking across repos
   bd dep blocks supabase-yyy workers-xxx  # Don't do this!
   ```

4. **Each Rewrite Has Its Own Namespace**
   | Package | Prefix | Location |
   |---------|--------|----------|
   | supabase | `supabase-` | rewrites/supabase/.beads |
   | fsx | `fsx-` | rewrites/fsx/.beads |
   | gitx | `gitx-` | rewrites/gitx/.beads |
   | mongo | `mongo-` | rewrites/mongo/.beads |
   | kafka | `kafka-` | rewrites/kafka/.beads |
   | firebase | `firebase-` | rewrites/firebase/.beads |
   | redis | `redis-` | rewrites/redis/.beads |
   | neo4j | `neo4j-` | rewrites/neo4j/.beads |
   | nats | `nats-` | rewrites/nats/.beads |
   | convex | `convex-` | rewrites/convex/.beads |
   | turso | `turso-` | rewrites/turso/.beads |

## TDD Red-Green-Refactor Pattern

All implementation work follows strict TDD:

### Issue Structure

```
Epic: "Feature X"
  |
  +-- Task: "[RED] Write failing test for X"
  |     Status: open -> in_progress -> completed
  |
  +-- Task: "[GREEN] Implement X to pass test"
  |     Blocked by: RED task
  |     Status: blocked -> in_progress -> completed
  |
  +-- Task: "[REFACTOR] Clean up X implementation"
        Blocked by: GREEN task
        Status: blocked -> in_progress -> completed
```

### Creating TDD Issues

```bash
cd rewrites/supabase

# Create the epic
bd create --title="Implement query builder" --type=epic

# Create TDD cycle
bd create --title="[RED] Test query builder select syntax" --type=task
bd create --title="[GREEN] Implement select() method" --type=task
bd create --title="[REFACTOR] Extract SQL generation" --type=task

# Set dependencies (GREEN blocked by RED, REFACTOR blocked by GREEN)
bd dep blocks supabase-002 supabase-001
bd dep blocks supabase-003 supabase-002
```

## Reference Architecture: fsx

The `fsx` package is the **gold standard** for how rewrites should be structured:

```
fsx/
  src/
    core/           # Pure business logic
    durable-object/ # DO class with Hono routing
    storage/        # SQLite (hot) + R2 (warm/cold)
    mcp/            # AI tool definitions
  .beads/           # Issue tracking
```

Key patterns:
- `FileSystemDO extends DurableObject<Env>`
- Client (`FSx`) wraps DO stub with HTTP RPC
- Single `/rpc` endpoint + streaming endpoints
- Tiered storage: SQLite hot, R2 warm, archive cold

## Working in a Rewrite

```bash
# Switch context to the rewrite
cd rewrites/supabase

# Set beads context
bd set-context .

# Check what's ready to work on
bd ready

# Claim work
bd update supabase-xxx --status=in_progress

# Complete work
bd close supabase-xxx

# Sync before committing
bd sync --from-main
```

## Session Close Protocol

Before saying "done" in any rewrite:

```bash
cd rewrites/{package}
git status
bd sync --from-main
git add .
git commit -m "..."
```

## Starting a New Rewrite

```bash
cd rewrites/newpackage
bd init --prefix=newpackage
# Creates .beads/ with proper namespace
```
