# algolia.do

Algolia on Cloudflare Durable Objects - Search-as-a-Service for AI agents.

## The Problem

AI agents need fast, typo-tolerant search. Millions of indexes. Each isolated. Each with their own ranking.

Traditional search services were built for humans:
- One shared cluster for many users
- Centralized infrastructure
- Manual scaling
- Expensive per-index

AI agents need the opposite:
- One index per agent (or per project)
- Distributed by default
- Infinite automatic scaling
- Free at the index level, pay for usage

## The Vision

Every AI agent gets their own Algolia.

```typescript
import { tom, ralph, priya } from 'agents.do'
import { Algolia } from 'algolia.do'

// Each agent has their own isolated search index
const tomSearch = Algolia.for(tom)
const ralphSearch = Algolia.for(ralph)
const priyaSearch = Algolia.for(priya)

// Full Algolia API
await tomSearch.initIndex('reviews').saveObjects([
  { objectID: 'pr-123', title: 'Auth refactor', status: 'approved' }
])

const { hits } = await tomSearch.initIndex('reviews').search('auth')
```

Not a shared index with API keys. Not a multi-tenant nightmare. Each agent has their own complete Algolia instance.

## Features

- **Hybrid Search** - FTS5 keyword + Vectorize semantic search
- **Typo Tolerance** - Fuzzy matching out of the box
- **Faceting** - Counts, refinement, hierarchical facets
- **Custom Ranking** - Configure ranking formulas per index
- **InstantSearch Compatible** - Works with Algolia's React/JS libraries
- **Sub-10ms Latency** - Edge-deployed with KV caching
- **MCP Tools** - Model Context Protocol for AI-native search

## Architecture

```
                    +-----------------------+
                    |     algolia.do        |
                    |   (Cloudflare Worker) |
                    +-----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | IndexDO (Tom)    | | IndexDO (Ralph)  | | IndexDO (...)    |
    | SQLite + FTS5    | | SQLite + FTS5    | | SQLite + FTS5    |
    | + Vectorize      | | + Vectorize      | | + Vectorize      |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
                    +-------------------+
                    |    Vectorize      |
                    |  (semantic index) |
                    +-------------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state. Each agent's index is a Durable Object. SQLite FTS5 handles keyword search. Vectorize handles semantic search.

## Installation

```bash
npm install algolia.do
```

## Quick Start

### Basic Search

```typescript
import { algoliasearch } from 'algolia.do'

const client = algoliasearch('your-app-id', 'your-api-key')
const index = client.initIndex('products')

// Index documents
await index.saveObjects([
  { objectID: '1', title: 'Wireless Headphones', price: 99 },
  { objectID: '2', title: 'Bluetooth Speaker', price: 49 }
])

// Search
const { hits } = await index.search('wireless', {
  filters: 'price < 100',
  hitsPerPage: 20
})
```

### Faceted Search

```typescript
const { hits, facets } = await index.search('headphones', {
  facets: ['brand', 'category'],
  facetFilters: [['brand:Sony', 'brand:Bose']]
})

// facets = { brand: { Sony: 15, Bose: 12 }, category: { audio: 27 } }
```

### Hybrid Search

```typescript
const { hits } = await index.search('comfortable travel audio', {
  semantic: true,        // Enable vector search
  hybrid: {
    alpha: 0.7           // 70% semantic, 30% keyword
  }
})
```

### With InstantSearch

```typescript
import { InstantSearch, SearchBox, Hits } from 'react-instantsearch'
import { algoliasearch } from 'algolia.do'

const client = algoliasearch('your-app-id', 'your-api-key')

function App() {
  return (
    <InstantSearch searchClient={client} indexName="products">
      <SearchBox />
      <Hits />
    </InstantSearch>
  )
}
```

## API Reference

### Client

```typescript
algoliasearch(appId: string, apiKey: string): AlgoliaClient
```

### Index Operations

```typescript
// Initialize index
const index = client.initIndex('products')

// Indexing
await index.saveObjects(objects)
await index.saveObject(object)
await index.partialUpdateObjects(objects)
await index.deleteObjects(objectIDs)
await index.clearObjects()

// Search
await index.search(query, params)
await index.searchForFacetValues(facetName, facetQuery, params)

// Settings
await index.setSettings(settings)
await index.getSettings()
```

### Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search query |
| `filters` | string | Filter expression |
| `facetFilters` | array | Facet filter array |
| `numericFilters` | array | Numeric filter array |
| `hitsPerPage` | number | Results per page (default: 20) |
| `page` | number | Page number (0-indexed) |
| `facets` | array | Facets to retrieve |
| `attributesToRetrieve` | array | Fields to return |
| `attributesToHighlight` | array | Fields to highlight |
| `semantic` | boolean | Enable semantic search |
| `hybrid.alpha` | number | Semantic vs keyword weight (0-1) |

## The Rewrites Ecosystem

algolia.do is part of the rewrites family:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| **algolia.do** | Algolia | Search for AI |
| [mongo.do](https://mongo.do) | MongoDB | Document database for AI |
| [kafka.do](https://kafka.do) | Kafka | Event streaming for AI |

## Cost Comparison

### Scenario: 100K documents, 500K searches/month

| Platform | Monthly Cost |
|----------|--------------|
| Algolia | ~$290 |
| Typesense Cloud | ~$60 |
| **algolia.do** | **~$1** |

100x+ cost reduction at scale.

## Why Durable Objects?

1. **Single-threaded consistency** - No race conditions in ranking
2. **Per-index isolation** - Each agent's data is separate
3. **Automatic scaling** - Millions of indexes, zero configuration
4. **Global distribution** - Search at the edge
5. **SQLite FTS5** - Real full-text search, real performance

## License

MIT
