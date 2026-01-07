# Algolia Rewrite - Agent Instructions

This project reimplements Algolia's search-as-a-service on Cloudflare Durable Objects.

## Project Context

**Package**: `@dotdo/algolia` or `searches.do`
**Location**: `/rewrites/algolia/`
**Pattern**: Follow the supabase.do rewrite architecture

## Architecture Overview

```
algolia/
  src/
    core/
      indexing/      # Object indexing operations
      search/        # Hybrid FTS5 + Vectorize search
      faceting/      # Facet aggregation & caching
      ranking/       # Custom ranking & ML re-ranking
    durable-object/
      IndexDO        # Per-index state (SQLite + Vectorize)
    client/
      algoliasearch  # SDK-compatible client
    mcp/             # AI tool definitions
```

## Key Cloudflare Primitives

| Primitive | Usage |
|-----------|-------|
| **D1 + FTS5** | Full-text keyword search |
| **Vectorize** | Semantic vector search |
| **Workers AI** | Embedding generation (bge models) |
| **KV** | Query/facet caching |
| **Durable Objects** | Per-index isolation |

## TDD Workflow

All work follows strict RED-GREEN-REFACTOR:

1. **[RED]** Write failing tests first
2. **[GREEN]** Implement minimal code to pass
3. **[REFACTOR]** Optimize and clean up

Check blocking dependencies:
```bash
bd blocked   # Shows what's waiting on what
bd ready     # Shows tasks ready to work on
```

## Beads Issue Tracking

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

## API Reference

### Algolia-Compatible Methods

```typescript
// Indexing
index.saveObjects(objects)
index.saveObject(object)
index.partialUpdateObjects(objects)
index.deleteObjects(objectIDs)

// Search
index.search(query, params)
index.searchForFacetValues(facetName, facetQuery)
client.multipleQueries(queries)

// Settings
index.setSettings(settings)
index.getSettings()
```

### Search Parameters

| Parameter | Description |
|-----------|-------------|
| `query` | Search query string |
| `filters` | Filter expression |
| `facetFilters` | Facet filter array |
| `numericFilters` | Numeric filter array |
| `hitsPerPage` | Results per page |
| `page` | Page number (0-indexed) |
| `facets` | Facets to retrieve |
| `attributesToRetrieve` | Fields to return |

## Performance Targets

- P50 search latency: < 10ms
- P99 search latency: < 50ms
- Indexing throughput: > 1000 docs/sec

## Related Documentation

- `/rewrites/search/docs/search-rewrite-scope.md` - Search research
- `/rewrites/supabase/README.md` - Rewrite pattern reference
- `/rewrites/CLAUDE.md` - Rewrite architecture guidelines
