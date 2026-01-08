# algolia.do

> Search-as-a-Service. Edge-Native. AI-First. Natural Language.

Algolia charges $290/month for 100K documents. Typesense Cloud charges $60. algolia.do costs $1. Same features. 100x cheaper. Because search belongs at the edge.

**algolia.do** is search reimagined for AI agents. Natural language queries. No configuration objects. Just say what you want to find.

## AI-Native API

```typescript
import { algolia } from 'algolia.do'           // Full SDK
import { algolia } from 'algolia.do/tiny'      // Minimal client
import { algolia } from 'algolia.do/instant'   // InstantSearch compatible
```

Natural language for search:

```typescript
import { algolia } from 'algolia.do'

// Talk to it like a colleague
const headphones = await algolia`wireless headphones under $200`
const trending = await algolia`best selling products this week`
const similar = await algolia`products similar to AirPods Pro`

// Chain like sentences
await algolia`products needing reviews`
  .notify(`Your review would help other customers`)

// Index without boilerplate
await algolia`index products from catalog`
await algolia`add SKU-12345 to products: Wireless Headphones $99`
await algolia`remove discontinued items from inventory`
```

## The Problem

Algolia dominates search:

| What Algolia Charges | The Reality |
|----------------------|-------------|
| **Search Operations** | $1.50 per 1,000 requests |
| **Records** | $0.40 per 1,000 records/month |
| **Index Replicas** | Each replica costs extra |
| **AI Features** | Premium tier only |
| **Support** | Enterprise pricing for priority |
| **Overages** | Surprise bills when you scale |

### The Hidden Costs

Beyond the pricing page:
- Vendor lock-in (proprietary query syntax)
- Limited semantic search
- AI features gated behind enterprise
- Cold start latency on shared infrastructure
- Per-index pricing kills multi-tenant apps

### What AI Agents Need

AI agents search differently:
- Natural language, not query DSL
- One index per agent or project
- Semantic understanding built-in
- Infinite indexes without infinite cost
- Edge latency, not datacenter latency

## The Solution

**algolia.do** reimagines search for AI:

```
Algolia                          algolia.do
-----------------------------------------------------------------
$290/month for 100K docs         ~$1/month
Proprietary query syntax         Natural language
Shared infrastructure            Your Durable Object
Manual index management          Just describe what you want
AI features = enterprise         AI-first by default
Cold starts                      Sub-10ms edge latency
Per-index pricing                Pay for compute, not indexes
```

## One-Click Deploy

```bash
npx create-dotdo algolia
```

Search infrastructure on your Cloudflare account. Your data. Your control.

```typescript
import { Algolia } from 'algolia.do'

export default Algolia({
  name: 'my-search',
  domain: 'search.myapp.com',
  semantic: true,
})
```

## Features

### Searching

```typescript
// Just say what you want
const results = await algolia`wireless headphones`
const filtered = await algolia`Sony headphones under $150`
const semantic = await algolia`comfortable audio for long flights`

// AI infers what you need
await algolia`headphones`                    // returns products
await algolia`headphones by brand`           // returns faceted results
await algolia`headphones trending`           // returns sorted by popularity
```

### Indexing

```typescript
// Index naturally
await algolia`index products from catalog`
await algolia`add to products: Wireless Earbuds $79 category:audio`
await algolia`update SKU-12345 price to $89`
await algolia`remove out-of-stock items`

// Bulk operations read like instructions
await algolia`
  products index:
  - SKU-001: Wireless Headphones $99
  - SKU-002: Bluetooth Speaker $49
  - SKU-003: USB-C Cable $15
`
```

### Faceting

```typescript
// Natural facet queries
const brands = await algolia`headphones by brand`
const priceRanges = await algolia`headphones grouped by price range`
const categories = await algolia`all product categories with counts`

// Filter like you'd say it
await algolia`Sony or Bose headphones under $200`
await algolia`4+ star products in electronics`
```

### Synonyms and Rules

```typescript
// Configure with natural language
await algolia`synonyms: headphones = earbuds = earphones`
await algolia`synonyms: tv = television = flatscreen`
await algolia`boost: promoted products should rank higher`
await algolia`rule: searches for "cheap" should filter under $50`
```

### Hybrid Search

```typescript
// Semantic search is natural
await algolia`good headphones for noisy offices`
await algolia`something to block out airplane noise`
await algolia`gift for someone who loves music`

// AI understands intent, not just keywords
```

### Real-time Updates

```typescript
// Live search that updates
const search = await algolia`wireless headphones`.live()

search.on('update', (results) => {
  // New products matching query
})

// Or with React
await algolia`trending products`
  .subscribe(products => setProducts(products))
```

## Pipeline Chains

Chain operations without Promise.all:

```typescript
// Find, analyze, act
await algolia`low stock products`
  .map(product => algolia`suppliers for ${product.sku}`)
  .map(suppliers => suppliers.notify(`Restock needed`))

// Search across multiple indexes
await algolia`search all indexes for "wireless"`
  .map(result => result.boost())

// Batch operations
await algolia`products without images`
  .map(product => product.generateImage())
  .map(product => product.save())
```

## Architecture

### Durable Object per Index

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

Each agent, project, or tenant gets their own Durable Object. SQLite FTS5 for keyword search. Vectorize for semantic search. No shared infrastructure.

### Storage Tiers

| Tier | Storage | Use Case | Latency |
|------|---------|----------|---------|
| **Hot** | SQLite FTS5 | Active indexes | <10ms |
| **Warm** | KV Cache | Frequent queries | <5ms |
| **Cold** | R2 | Index snapshots | <100ms |

## vs Algolia

| Feature | Algolia | algolia.do |
|---------|---------|------------|
| **100K docs** | ~$290/month | ~$1/month |
| **Query syntax** | Proprietary DSL | Natural language |
| **Semantic search** | Enterprise only | Built-in |
| **Latency** | 50-100ms | <10ms edge |
| **Multi-tenant** | Expensive | Free (per-DO) |
| **AI features** | Premium tier | Native |
| **Lock-in** | Proprietary | Open source |
| **InstantSearch** | Official | Compatible |

## Use Cases

### E-commerce

```typescript
// Product search
await algolia`red running shoes size 10`
await algolia`gifts under $50 for runners`

// Inventory management
await algolia`low stock items needing reorder`
  .notify(`Restock alert`)
```

### Documentation

```typescript
// Search docs naturally
await algolia`how to configure authentication`
await algolia`examples of rate limiting`
await algolia`errors related to permissions`
```

### AI Agents

```typescript
import { tom, ralph, priya } from 'agents.do'

// Each agent has isolated search
await algolia.for(tom)`my reviewed PRs`
await algolia.for(ralph)`components I built`
await algolia.for(priya)`features in the roadmap`
```

## InstantSearch Compatible

```typescript
import { InstantSearch, SearchBox, Hits } from 'react-instantsearch'
import { algolia } from 'algolia.do'

function App() {
  return (
    <InstantSearch searchClient={algolia.client} indexName="products">
      <SearchBox />
      <Hits />
    </InstantSearch>
  )
}
```

Works with Algolia's React, Vue, Angular, and vanilla JS libraries.

## MCP Tools

AI-native search through Model Context Protocol:

```typescript
// Available as MCP tool
await mcp.search({
  index: 'products',
  query: 'wireless headphones under $200'
})

// Or natural language
await mcp.algolia`find me noise cancelling headphones`
```

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

## Roadmap

### Search
- [x] Full-text search (FTS5)
- [x] Semantic search (Vectorize)
- [x] Hybrid search
- [x] Faceting
- [x] Typo tolerance
- [x] Synonyms
- [ ] Geo search
- [ ] Personalization

### Features
- [x] Natural language queries
- [x] Real-time updates
- [x] InstantSearch compatible
- [x] MCP tools
- [ ] Query suggestions
- [ ] A/B testing
- [ ] Analytics

### AI
- [x] Semantic understanding
- [x] Intent detection
- [ ] Query expansion
- [ ] Result re-ranking
- [ ] Conversational search

## Contributing

algolia.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/algolia.do
cd algolia.do
pnpm install
pnpm test
```

## License

MIT License - Search belongs at the edge.

---

<p align="center">
  <strong>100x cheaper. Natural language. Edge-native.</strong>
  <br />
  Search reimagined for AI.
  <br /><br />
  <a href="https://algolia.do">Website</a> |
  <a href="https://docs.algolia.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/algolia.do">GitHub</a>
</p>
