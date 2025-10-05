# 2025-10-03-graph-database-graphql

## Idea Summary

Graph database with GraphQL query layer

## Original Location

- **Source**: `cloudflare-data-poc-graph/`
- **Date**: 2025-10-03
- **Type**: Cloudflare Data POC

## Current State

- Node.js project with package.json
- Cloudflare Workers project
- Source code in src/ directory
- Test suite included

## Key Learnings


## Next Steps

### If Validated ✅
- Extract core functionality to appropriate production repo
- Add comprehensive tests and documentation
- Integrate with platform architecture
- Deploy to production environment

### If Needs More Work ⚙️
- Continue iterating on approach
- Add missing features or capabilities
- Benchmark performance
- Document remaining blockers

### If Deprecated ❌
- Document why approach didn't work
- Extract valuable learnings to notes/
- Archive for reference
- Clean up resources

## Related Documentation

- **Root CLAUDE.md**: `../CLAUDE.md` - Multi-repo management
- **Prototypes Guide**: `../tmp/CLAUDE.md` - Experimental sandbox guidelines
- **POC Process**: `../poc/CLAUDE.md` - Formal POC workflow

---

**Created**: {date}
**Consolidated**: {datetime.now().strftime('%Y-%m-%d')}
**Status**: Archived for evaluation

---

## Original README

# Schema.org URI-based Graph Database POC

A comprehensive graph database implementation using **Cloudflare D1** with a **2-table design** optimized for Schema.org entities and SPARQL-like queries.

## Overview

This POC demonstrates how to build a high-performance graph database using Cloudflare's edge infrastructure:

- **Things Table**: URI-based entities with Schema.org types and properties (JSONB)
- **Relationships Table**: Subject-Predicate-Object triples with metadata
- **Graph Queries**: SQL-based graph traversal using recursive CTEs
- **SPARQL-like API**: REST API for graph queries and manipulation
- **MDX Sync**: Bidirectional synchronization with 10 MDX content repositories

## Architecture

```
┌─────────────────────────────────────────┐
│  Cloudflare Workers (Hono API)          │
│  ┌──────────────────────────────────┐   │
│  │  Graph Query Engine              │   │
│  │  - Traverse (n-hop)              │   │
│  │  - Shortest Path                 │   │
│  │  - Subgraph Extraction           │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Schema.org Validation (Zod)     │   │
│  │  - Person, Organization, Product │   │
│  │  - 9+ Schema.org types           │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  MDX Sync Engine                 │   │
│  │  - Frontmatter → Properties      │   │
│  │  - Database → MDX                │   │
│  │  - Webhook Handler               │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Cloudflare D1 (SQLite)                 │
│  ┌──────────────┐   ┌─────────────────┐ │
│  │  Things      │   │  Relationships  │ │
│  ├──────────────┤   ├─────────────────┤ │
│  │ id (URI)     │   │ subject (URI)   │ │
│  │ type         │   │ predicate (URI) │ │
│  │ properties   │   │ object (URI)    │ │
│  │ source       │   │ properties      │ │
│  │ namespace    │   │ namespace       │ │
│  └──────────────┘   └─────────────────┘ │
└─────────────────────────────────────────┘
                  ↓
        ┌─────────────────┐
        │  R2 Backups     │
        │  (Optional)     │
        └─────────────────┘
```

## Database Schema

### Things Table

Stores Schema.org entities as URI-based nodes:

```sql
CREATE TABLE things (
  id TEXT PRIMARY KEY,              -- URI (e.g., https://schema.org/Person/john-doe)
  type TEXT NOT NULL,               -- Schema.org type (Person, Organization, etc.)
  properties TEXT NOT NULL,         -- JSONB with all Schema.org properties
  source TEXT,                      -- MDX repo (apps, brands, etc.)
  namespace TEXT,                   -- Logical grouping
  created_at DATETIME,
  updated_at DATETIME
);
```

**Indexes:**
- `idx_things_type` - Filter by Schema.org type
- `idx_things_source` - Filter by MDX repository
- `idx_things_namespace` - Filter by namespace

### Relationships Table

Stores Subject-Predicate-Object triples:

```sql
CREATE TABLE relationships (
  id INTEGER PRIMARY KEY,
  subject TEXT NOT NULL,            -- Source entity URI
  predicate TEXT NOT NULL,          -- Relationship type URI
  object TEXT NOT NULL,             -- Target entity URI
  properties TEXT NOT NULL,         -- Metadata as JSONB
  namespace TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

**Indexes:**
- `idx_rel_subject` - Forward traversal (outgoing edges)
- `idx_rel_object` - Backward traversal (incoming edges)
- `idx_rel_predicate` - Filter by relationship type
- `idx_rel_subject_object` - Bidirectional queries

## Installation

```bash
# Clone and navigate
cd tmp/cloudflare-data-poc-graph

# Install dependencies
npm install

# Create D1 database
npm run db:create

# Initialize schema
npm run db:init

# Start development server
npm run dev
```

## API Endpoints

### Things (Entities)

```bash
# List things
GET /things?type=Person&source=apps&limit=20

# Get thing by ID
GET /things/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe

# Create thing
POST /things
{
  "id": "https://schema.org/Person/john-doe",
  "type": "Person",
  "properties": {
    "name": "John Doe",
    "email": "john@example.com",
    "jobTitle": "Software Engineer"
  },
  "source": "apps",
  "namespace": "default"
}

# Update thing
PUT /things/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe
{
  "properties": {
    "jobTitle": "Senior Software Engineer"
  }
}

# Upsert thing (insert or update)
POST /things/upsert
{
  "id": "https://schema.org/Person/john-doe",
  "type": "Person",
  "properties": { ... }
}

# Delete thing
DELETE /things/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe

# Search things
GET /things/search?q=engineer&type=Person&limit=10

# Count by type
GET /things/stats/by-type?namespace=default
```

### Relationships (Edges)

```bash
# List relationships
GET /relationships?subject=https://schema.org/Person/john-doe

# Get relationship by ID
GET /relationships/123

# Create relationship
POST /relationships
{
  "subject": "https://schema.org/Person/john-doe",
  "predicate": "https://schema.org/worksFor",
  "object": "https://schema.org/Organization/acme-corp",
  "properties": {
    "since": "2020-01-01"
  }
}

# Update relationship
PUT /relationships/123
{
  "properties": {
    "role": "lead developer"
  }
}

# Upsert relationship
POST /relationships/upsert
{
  "subject": "...",
  "predicate": "...",
  "object": "..."
}

# Delete relationship
DELETE /relationships/123

# Get outgoing relationships
GET /relationships/outgoing/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe

# Get incoming relationships
GET /relationships/incoming/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe

# Count by predicate
GET /relationships/stats/by-predicate
```

### Graph Queries

```bash
# Traverse graph (n-hop)
GET /query/traverse/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe?depth=2&direction=both

# Shortest path between two nodes
GET /query/shortest-path?from=https://schema.org/Person/john-doe&to=https://schema.org/Product/task-manager

# Find all paths
GET /query/all-paths?from=...&to=...&depth=3&limit=10

# Extract subgraph (n-hop neighborhood)
GET /query/subgraph/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe?radius=2

# Find common neighbors
GET /query/common-neighbors?id1=...&id2=...

# Get node degree (connection count)
GET /query/degree/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe

# Graph statistics
GET /query/stats?namespace=default
```

### MDX Sync

```bash
# Webhook for MDX repository changes
POST /mdx/webhook
{
  "repository": "apps",
  "files": [
    {
      "slug": "task-manager",
      "frontmatter": { ... },
      "content": "..."
    }
  ]
}

# Sync single MDX file
POST /mdx/sync
{
  "slug": "task-manager",
  "frontmatter": { ... },
  "content": "...",
  "source": "apps"
}

# Export repository to MDX
GET /mdx/export/apps

# Generate MDX for a thing
GET /mdx/generate/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe
```

## Graph Query Patterns

### 1-Hop Traversal (Immediate Neighbors)

```typescript
const response = await fetch('/query/traverse/https://schema.org/Person/john-doe?depth=1')
const { nodes, edges } = await response.json()

// Returns all directly connected entities
```

### N-Hop Traversal (Deeper Exploration)

```typescript
// Get 2-hop neighborhood
const response = await fetch('/query/traverse/https://schema.org/Person/john-doe?depth=2&direction=both')
const { nodes, edges } = await response.json()

// Returns all entities within 2 hops
```

### Shortest Path (Path Finding)

```typescript
const response = await fetch(
  '/query/shortest-path?' +
  'from=https://schema.org/Person/john-doe&' +
  'to=https://schema.org/Product/task-manager&' +
  'depth=5'
)
const path = await response.json()

// Returns: { nodes: [...], edges: [...], length: 2 }
```

### Subgraph Extraction

```typescript
// Extract local neighborhood
const response = await fetch('/query/subgraph/https://schema.org/Person/john-doe?radius=2')
const { nodes, edges } = await response.json()

// Returns complete subgraph with all interconnections
```

### Type-Filtered Traversal

```typescript
// Find all Organizations within 3 hops
const response = await fetch(
  '/query/traverse/https://schema.org/Person/john-doe?' +
  'depth=3&' +
  'typeFilter=Organization'
)
```

### Predicate-Filtered Traversal

```typescript
// Follow only "worksFor" relationships
const response = await fetch(
  '/query/traverse/https://schema.org/Person/john-doe?' +
  'depth=2&' +
  'predicateFilter=https://schema.org/worksFor'
)
```

## Schema.org Types

The POC includes Zod schemas for these Schema.org types:

1. **Thing** - Base type for all entities
2. **Person** - Individual people
3. **Organization** - Companies, institutions, teams
4. **Product** - Products, goods, services
5. **CreativeWork** - Articles, books, content
6. **SoftwareApplication** - Software, apps, tools
7. **Place** - Locations, addresses, venues
8. **Event** - Events, meetings, conferences
9. **Offer** - Offers, deals, pricing

### Common Predicates (Relationships)

```typescript
const predicates = {
  // Person relationships
  worksFor: 'https://schema.org/worksFor',
  knows: 'https://schema.org/knows',
  alumniOf: 'https://schema.org/alumniOf',

  // Organization relationships
  parentOrganization: 'https://schema.org/parentOrganization',
  subOrganization: 'https://schema.org/subOrganization',
  member: 'https://schema.org/member',

  // Creative work relationships
  author: 'https://schema.org/author',
  creator: 'https://schema.org/creator',
  publisher: 'https://schema.org/publisher',

  // Product relationships
  manufacturer: 'https://schema.org/manufacturer',
  brand: 'https://schema.org/brand',
  offers: 'https://schema.org/offers',

  // Generic relationships
  relatedTo: 'https://schema.org/relatedTo',
  partOf: 'https://schema.org/isPartOf',
  hasPart: 'https://schema.org/hasPart',
}
```

## MDX Integration

### MDX Repository Mapping

The POC syncs with 10 MDX content repositories:

| Repository | Schema.org Type | Example |
|------------|-----------------|---------|
| apps | SoftwareApplication | Task management apps |
| brands | Organization | Companies, brands |
| functions | SoftwareSourceCode | Code functions |
| integrations | WebAPI | API integrations |
| schemas | Dataset | Data schemas |
| services | Service | Services, APIs |
| sources | DataFeed | Data sources |
| workflows | Action | Workflow patterns |
| agents | SoftwareAgent | AI agents |
| business | Organization | Business entities |

### Frontmatter → Properties Mapping

**Apps Example:**

```yaml
---
title: Task Manager Pro
description: Professional task management
platform: web
url: https://tasks.example.com
techStack:
  - React
  - TypeScript
features:
  - Real-time collaboration
  - Team workspaces
---
```

**Converts to:**

```json
{
  "name": "Task Manager Pro",
  "description": "Professional task management",
  "operatingSystem": "web",
  "url": "https://tasks.example.com",
  "programmingLanguage": ["React", "TypeScript"],
  "featureList": ["Real-time collaboration", "Team workspaces"]
}
```

### Webhook Setup

Configure GitHub webhook in your MDX repositories:

```
URL: https://your-worker.workers.dev/mdx/webhook
Events: push
Secret: your-webhook-secret
```

## Performance Optimization

### Query Optimization

1. **Graph Traversal (1-hop):**
   - Uses `idx_rel_subject` for forward traversal
   - Uses `idx_rel_object` for backward traversal
   - O(1) index lookup + O(n) scan

2. **Graph Traversal (n-hop):**
   - Uses recursive CTEs
   - Limit depth to 2-3 for production
   - Consider caching for frequently accessed paths

3. **Subgraph Extraction:**
   - Combines forward + backward traversal
   - Uses UNION for bidirectional queries
   - Keep radius small (1-2 hops)

4. **Type Filtering:**
   - Uses `idx_things_type`
   - Combine with graph traversal for typed queries

### Caching Strategy

```typescript
// Cache frequently accessed subgraphs
const cache = new Map<string, Subgraph>()

async function getCachedSubgraph(id: string, radius: number) {
  const key = `${id}:${radius}`
  if (cache.has(key)) return cache.get(key)

  const subgraph = await extractSubgraph(db, id, radius)
  cache.set(key, subgraph)
  return subgraph
}
```

### Limitations

- **D1 Constraints:**
  - No native JSON indexing
  - Basic full-text search (LIKE-based)
  - No vector similarity (use external service)

- **Graph Complexity:**
  - Keep graphs shallow (2-3 hops max)
  - Use pagination for large result sets
  - Consider external graph DB for complex algorithms

- **Scaling:**
  - D1 has per-database limits
  - Use multiple databases for horizontal scaling
  - Consider sharding by namespace

## Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Run migrations on production
npm run db:migrate

# Monitor logs
wrangler tail
```

## Testing

```bash
# Run tests
npm test

# Type checking
npm run typecheck

# Format code
npm run format
```

## Examples

See the `examples/` directory for:

- **Sample data** - Person, Organization, Product entities
- **Example queries** - Common graph query patterns
- **MDX files** - Sample MDX frontmatter
- **Use cases** - Real-world scenarios

## Future Enhancements

1. **Vector Embeddings** - Add semantic search using Cloudflare Vectorize
2. **Full-text Search** - Integrate with Cloudflare Workers AI for better search
3. **Graph Algorithms** - PageRank, community detection, centrality measures
4. **Visualization** - Graph visualization API (D3.js, Cytoscape.js)
5. **SPARQL Endpoint** - Full SPARQL 1.1 compliance
6. **GraphQL API** - Alternative query interface
7. **Real-time Updates** - WebSocket support for live graph changes
8. **Analytics Dashboard** - Metrics, insights, graph statistics

## License

MIT

## Resources

- [Schema.org Documentation](https://schema.org)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Hono Framework](https://hono.dev)
- [Zod Validation](https://zod.dev)

