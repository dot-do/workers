# database.do

> AI-native database with cascading generation and natural language queries.

```typescript
import { DB } from 'database.do'

const db = DB({
  Blog: {
    title: 'SEO-optimized blog title',
    topics: ['5 topics to cover ->Topic'],
    posts: ['<-Post'],
  },
  Topic: {
    name: 'PascalCase topic name',
    posts: ['3 post titles ->Post'],
  },
  Post: {
    title: 'SEO title',
    content: 'Markdown content',
  },
})

// One call generates Blog -> 5 Topics -> 15 Posts
const blog = await db.Blog('AI Startups')
```

## Installation

```bash
npm install database.do
```

## The Vision

**database.do** treats your schema as a generation blueprint. Relationships aren't just foreign keys—they're instructions for cascading AI generation.

```typescript
// Traditional database: you create each entity manually
// database.do: one call cascades through the entire graph

const blog = await db.Blog('Services-as-Software', {
  topic: 'How AI-delivered Services will transform the economy',
})

// blog.topics → 5 Topics (auto-generated)
// blog.posts → 15 Posts (auto-generated via Topics)
```

## Relationship Operators

Four operators control how relationships cascade:

| Operator | Direction | Mode | Behavior |
|----------|-----------|------|----------|
| `->Type` | Forward | Exact | Find or create `Type`, link FROM here TO it |
| `~>Type` | Forward | Fuzzy | Semantic search for `Type`, create if no match |
| `<-Type` | Backward | Exact | Collect `Type` entities that link TO here |
| `<~Type` | Backward | Fuzzy | Semantic search for entities linking here |

### Modifiers

- `?` - Optional (may be null)
- `[]` - Array of references

### Examples

```typescript
const db = DB({
  Startup: {
    name: 'Company name',
    founders: ['List founders ->Founder'],      // Forward: creates Founders
    industry: '~>Industry',                      // Fuzzy: matches existing Industry
    investors: ['<-Investment'],                 // Backward: collects Investments
  },
  Founder: {
    name: 'Full name',
    role: 'CEO, CTO, etc.',
    linkedin: 'LinkedIn URL?',                   // Optional field
  },
  Industry: {
    _readOnly: true,                             // Controlled vocabulary
    name: 'Industry name',
    code: 'NAICS code',
  },
  Investment: {
    amount: 'Investment amount',
    round: 'Seed, Series A, etc.',
    startup: '->Startup',                        // Links back to Startup
  },
})
```

## Core Exports

```typescript
import {
  DB,              // Schema-first database factory
  Noun,            // Semantic entity definition
  Verb,            // Action definition with conjugations
  Thing,           // JSON-LD compatible entity
  Relationship,    // Graph edge between entities
} from 'database.do'
```

## Schema Definition

### Simple Fields

```typescript
const db = DB({
  Post: {
    title: 'SEO-optimized title',           // String with AI hint
    views: 'number',                         // Primitive type
    published: 'boolean',
    createdAt: 'datetime',
    content: 'markdown',                     // Rich text
    metadata: 'json',                        // Arbitrary JSON
  },
})
```

### Field Types

| Type | Description |
|------|-------------|
| `string` | Text |
| `number` | Numeric |
| `boolean` | True/false |
| `date` | Date only |
| `datetime` | Date and time |
| `markdown` | Rich text content |
| `json` | Arbitrary JSON |
| `url` | URL string |

### Relationships

```typescript
const db = DB({
  Author: {
    name: 'string',
    posts: ['<-Post'],                        // All Posts by this Author
  },
  Post: {
    title: 'string',
    author: '->Author',                       // Single Author reference
    tags: ['~>Tag'],                          // Fuzzy match Tags
    relatedPosts: ['<~Post[]'],               // Semantically similar Posts
  },
  Tag: {
    name: 'string',
    posts: ['<-Post'],                        // All Posts with this Tag
  },
})
```

## Natural Language Queries

Query your data conversationally:

```typescript
// Tagged template queries
const leads = await db.Lead`ready to close this week`
const posts = await db.Post`most popular about AI`
const users = await db.User`signed up from ProductHunt`

// With context
const qualified = await db.Lead`score above 80 in ${industry}`
```

## Promise Pipelining

Chain operations without intermediate awaits:

```typescript
// Lazy evaluation - nothing executes until await
const qualified = db.Lead.list()
  .filter(l => l.score > 80)
  .sort('score', 'desc')
  .take(10)

// Execute the pipeline
const results = await qualified

// Batch relationship loading (N+1 prevention)
const enriched = await db.Lead.list().map(lead => ({
  name: lead.name,
  company: lead.company,    // Loaded in ONE query
  contacts: lead.contacts,  // Also batched
}))
```

## CRUD Operations

```typescript
// Create
const post = await db.Post.create({
  title: 'Getting Started',
  content: '...',
})

// Read
const post = await db.Post.get('post-123')
const posts = await db.Post.list()
const recent = await db.Post.find({ published: true })

// Update
await db.Post.update('post-123', { title: 'Updated Title' })

// Delete
await db.Post.delete('post-123')

// Upsert
await db.Post.upsert({ id: 'post-123', views: 100 })
```

## Semantic Nouns & Verbs

Define entities with rich semantics:

```typescript
import { Noun, Verb } from 'database.do'

const Post = Noun({
  singular: 'post',
  plural: 'posts',
  properties: {
    title: { type: 'string', required: true },
    content: { type: 'markdown' },
  },
  relationships: {
    author: { type: 'Author', backref: 'posts' },
    tags: { type: 'Tag[]', backref: 'posts' },
  },
  actions: ['create', 'update', 'delete', 'publish', 'archive'],
})

const Publish = Verb({
  infinitive: 'publish',
  pastTense: 'published',
  presentParticiple: 'publishing',
  permissions: ['editor', 'admin'],
})
```

## Events & Actions

### Event Tracking (Append-Only)

```typescript
// Track events
await db.track({
  type: 'Post.published',
  data: { postId: 'post-123', author: 'user-456' },
})

// Query events
const events = await db.events({
  type: 'Post.%',  // Wildcard
  after: new Date('2024-01-01'),
})
```

### Actions (Commands)

```typescript
// Fire and forget
await db.send({ action: 'enrich', object: 'lead-123' })

// Wait for result
const result = await db.do({ action: 'analyze', object: 'post-123' })
```

## ForEach with Durability

Process large datasets with crash recovery:

```typescript
await db.Lead.forEach(async lead => {
  const analysis = await ai`analyze ${lead}`
  await db.Lead.update(lead.id, { analysis })
}, {
  concurrency: 10,
  persist: true,                              // Survive crashes
  maxRetries: 3,
  onProgress: p => console.log(`${p.completed}/${p.total}`),
  onError: err => err.code === 'RATE_LIMIT' ? 'retry' : 'continue',
})
```

## Artifacts

Cache computed results:

```typescript
// Store
await db.storeArtifact({
  key: 'report:2024-01',
  content: reportData,
  ttl: 86400,
})

// Retrieve
const report = await db.getArtifact('report:2024-01')
```

## Configuration

```typescript
import { Database } from 'database.do'

const db = Database({
  apiKey: process.env.DATABASE_DO_API_KEY,
  baseUrl: 'https://database.do',
})
```

Or use environment variables:

- `DO_API_KEY` - API key for authentication
- `DATABASE_DO_API_KEY` - Alternative (takes precedence)
- `DATABASE_URL` - Provider URL (`./content`, `sqlite://./data`, `:memory:`)

## Type Exports

```typescript
import type {
  // Schema
  DatabaseSchema,
  EntitySchema,
  FieldDefinition,

  // Semantic
  Noun,
  Verb,
  Thing,
  Relationship,

  // Operations
  DBPromise,
  QueryOptions,
  ListOptions,

  // Events
  Event,
  Action,
  Artifact,
} from 'database.do'
```

## Links

- [Website](https://database.do)
- [Documentation](https://docs.database.do)
- [GitHub](https://github.com/drivly/workers)
