# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

---

## segment.do - Customer Data Platform Rewrite

### Overview

This rewrite implements a Segment-compatible CDP on Cloudflare Workers and Durable Objects.

**Package**: `@dotdo/segment` or `segment.do`
**Domain**: `segment.do`, `cdp.do`, `analytics.do`

### Architecture

```
segment/
  src/
    track/           # Event ingestion (track, page, identify, batch)
    identity/        # IdentityDO - identity resolution with SQLite graph
    destinations/    # Destination adapters (GA4, Mixpanel, webhooks)
    warehouse/       # R2/Parquet export, Iceberg format
    mcp/             # AI tool definitions
  .beads/            # Issue tracking
```

### TDD Workflow

All work follows strict Red-Green-Refactor:

1. **[RED]** Write failing tests that define the API
2. **[GREEN]** Implement minimum code to pass tests (blocked by RED)
3. **[REFACTOR]** Optimize and clean up (blocked by GREEN)

```bash
# Check what's ready (RED tasks should be first)
bd ready

# Start work on a RED task
bd update segment-xxx --status in_progress

# Write failing tests, verify they fail
npm test -- --grep "track API"

# Complete RED, move to GREEN
bd close segment-xxx
bd update segment-yyy --status in_progress

# Implement to pass tests
npm test  # Should pass now

# Complete GREEN, move to REFACTOR
bd close segment-yyy
```

### Key Patterns

**Event Ingestion** (Workers):
- Segment-compatible API (`/v1/track`, `/v1/identify`, `/v1/page`, `/v1/batch`)
- Schema validation against Tracking Plan
- Context enrichment (geo, device, campaign)
- Sub-millisecond response times

**Identity Resolution** (Durable Objects):
- Per-user DO with SQLite identity graph
- Deterministic matching (email, phone, userId)
- Anonymous-to-identified merging
- Trait history tracking

**Destination Routing** (Workers + Queues):
- Queue-based delivery with retry logic
- 50+ destination adapters
- Per-destination transformation rules
- Dead letter queue for failures

**Warehouse Sync** (R2 + Pipelines):
- Real-time CDC to R2 in Parquet/Iceberg format
- Compatible with ClickHouse, Snowflake, BigQuery
- Schema evolution support

### Epics

| Epic | ID | Description |
|------|-----|-------------|
| Core Track API | segment-37l | Event ingestion endpoints |
| Identity Resolution | segment-btl | IdentityDO with SQLite graph |
| Destination Router | segment-0i7 | Queue-based fan-out |
| Warehouse Sync | segment-y1s | R2/Parquet export |

### Dependencies

- Reference `fsx` rewrite for DO + SQLite patterns
- Reference `kafka.do` for queue-based streaming (optional)
- Uses `@dotdo/common` for shared utilities

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/track/track.test.ts

# Watch mode
npm test -- --watch
```
