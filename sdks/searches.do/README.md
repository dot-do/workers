# searches.do

**Find anything. Instantly.**

```bash
npm install searches.do
```

## Quick Start

```typescript
// Cloudflare Workers - import env adapter first
import 'rpc.do/env'
import { searches } from 'searches.do'

// Or use the factory for custom config
import { Searches } from 'searches.do'
const searches = Searches({ baseURL: 'https://custom.example.com' })
```

---

## Your Data Is Buried. Your Users Are Lost.

Your users need to find things. Products. Documents. Support answers. Customer records.

But the data is scattered across:
- Databases that only support exact matches
- APIs that require knowing the exact field names
- Systems that choke on typos and synonyms
- Search engines that need PhD-level tuning
- Separate tools for keyword vs semantic search

**Your users give up. Your support team drowns. Your data sits unused.**

## What If Everything Was Findable?

```typescript
import { searches } from 'searches.do'

// Describe what you're looking for in plain English
const results = await searches.do`
  Find all support tickets about billing issues
  from enterprise customers in the last 30 days
`

// Or search directly with semantic understanding
const docs = await searches.search('knowledge-base', 'how do I reset my password', {
  limit: 10,
  semantic: true
})
// Finds "password recovery" and "account access" docs too

// Instant autocomplete
const suggestions = await searches.suggest('products', 'wire')
// ['wireless headphones', 'wireless speaker', 'wire cutters']
```

**searches.do** gives you:
- AI-powered semantic search out of the box
- Natural language queries that just work
- Typo tolerance and synonym understanding
- Faceted filtering and suggestions
- Works across all your data sources

## Find Anything in 3 Steps

### 1. Index Your Data

```typescript
import { searches } from 'searches.do'

// Index documents with any structure
await searches.index('products', [
  { id: 'p1', title: 'Wireless Headphones', content: 'Premium noise-canceling headphones', price: 299, category: 'audio' },
  { id: 'p2', title: 'Bluetooth Speaker', content: 'Portable speaker with 20-hour battery', price: 99, category: 'audio' },
  { id: 'p3', title: 'USB-C Cable', content: 'Fast charging cable, 6ft braided', price: 15, category: 'accessories' }
])

// Configure for optimal search
await searches.configure('products', {
  semantic: true,
  fields: [
    { name: 'title', type: 'text', searchable: true, boost: 2 },
    { name: 'content', type: 'text', searchable: true },
    { name: 'price', type: 'number', filterable: true, sortable: true },
    { name: 'category', type: 'keyword', filterable: true, facetable: true }
  ]
})
```

### 2. Ask Questions

```typescript
// Natural language search - AI understands intent
const results = await searches.do`
  Find audio products under $200 that are good for travel
`

// Structured search with filters
const filtered = await searches.search('products', 'audio', {
  filters: [{ field: 'price', op: 'lt', value: 200 }],
  facets: ['category'],
  sort: [{ field: 'price', order: 'asc' }]
})

// Get suggestions for search-as-you-type
const suggestions = await searches.suggest('products', 'head')
// ['headphones', 'headsets', 'headphone stand']
```

### 3. Get Results

```typescript
// Rich results with highlights and scores
const { results, total, facets, took } = await searches.search('products', 'wireless audio')

console.log(`Found ${total} results in ${took}ms`)

results.forEach(result => {
  console.log(`${result.title} (${result.score.toFixed(2)})`)
  console.log(`  ${result.highlights?.[0] || result.content}`)
})

// Facets for filtering UI
console.log('Categories:', facets.category)
// [{ value: 'audio', count: 2 }, { value: 'accessories', count: 1 }]
```

## The Difference

**Without searches.do:**
- Users search "reset password", get zero results
- Support answers buried in 10,000 documents
- "Did you mean?" never suggests the right thing
- Weeks configuring Elasticsearch clusters
- Separate systems for text and vector search
- Relevance tuning that never ends

**With searches.do:**
- Users search "forgot my login", find password docs
- AI surfaces the most relevant answer instantly
- Autocomplete that actually helps
- Search working in 5 minutes
- Semantic + keyword search unified
- Relevance that improves automatically

## Everything You Need

```typescript
import { searches } from 'searches.do'

// Natural language queries
const smart = await searches.do`
  Find enterprise customers who mentioned
  churn risk in the last quarter
`

// Autocomplete suggestions
const suggestions = await searches.suggest('docs', 'auth', {
  limit: 5,
  fuzzy: true
})

// Faceted search for filter UIs
const facets = await searches.facets('products', ['category', 'brand', 'priceRange'])

// Get all available filters
const filters = await searches.filters('products')

// Vector search for advanced use cases
const embedding = await searches.embed('comfortable headphones')
const similar = await searches.searchVector('products', embedding, { limit: 5 })

// Batch embeddings for custom pipelines
const embeddings = await searches.embedBatch([
  'First document',
  'Second document'
])

// Reindex when schema changes
await searches.reindex('products')

// Search analytics
const stats = await searches.analytics('products')
console.log('Top queries:', stats.topQueries)
console.log('Zero results:', stats.zeroResultQueries)
```

## Built for RAG

Building an AI assistant? searches.do is your retrieval layer:

```typescript
import { searches } from 'searches.do'
import { llm } from 'llm.do'

// Retrieve relevant context
const context = await searches.search('knowledge-base', userQuestion, {
  limit: 3,
  semantic: true
})

// Feed to your LLM
const answer = await llm.complete({
  prompt: `Based on the following context, answer the user's question.

Context:
${context.results.map(d => d.content).join('\n\n')}

Question: ${userQuestion}

Answer:`
})
```

## Search Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{ field: 'status', op: 'eq', value: 'active' }` |
| `ne` | Not equals | `{ field: 'status', op: 'ne', value: 'deleted' }` |
| `gt` | Greater than | `{ field: 'price', op: 'gt', value: 100 }` |
| `gte` | Greater or equal | `{ field: 'price', op: 'gte', value: 100 }` |
| `lt` | Less than | `{ field: 'price', op: 'lt', value: 100 }` |
| `lte` | Less or equal | `{ field: 'price', op: 'lte', value: 100 }` |
| `in` | In array | `{ field: 'category', op: 'in', value: ['a', 'b'] }` |
| `nin` | Not in array | `{ field: 'category', op: 'nin', value: ['c'] }` |
| `contains` | Contains text | `{ field: 'tags', op: 'contains', value: 'urgent' }` |
| `exists` | Field exists | `{ field: 'metadata', op: 'exists', value: true }` |
| `range` | In range | `{ field: 'price', op: 'range', value: [10, 100] }` |

## Configuration

```typescript
import { Searches } from 'searches.do'

// For Cloudflare Workers, import env adapter first
import 'rpc.do/env'

const searches = Searches({
  // API key is read from SEARCHES_API_KEY or DO_API_KEY environment variables
})
```

Or set `SEARCHES_API_KEY` or `DO_API_KEY` in your environment.

## Stop Losing Users to Bad Search

Every failed search is a lost customer. Every buried document is wasted knowledge. Every "no results found" is a support ticket waiting to happen.

**Your users deserve to find what they need.**

```bash
npm install searches.do
```

[Start finding at searches.do](https://searches.do)

---

Part of the [workers.do](https://workers.do) platform for building Autonomous Startups.

MIT License
