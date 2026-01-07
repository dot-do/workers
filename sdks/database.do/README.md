# database.do

> Data that generates itself.

You define the shape. AI fills it in. One call creates everything.

```typescript
import { DB } from 'database.do'

const db = DB({
  Blog: {
    title: 'SEO-optimized title',
    topics: ['5 topics ->Topic'],
    posts: ['<-Post'],
  },
  Topic: {
    name: 'topic name',
    posts: ['3 posts ->Post'],
  },
  Post: {
    title: 'compelling headline',
    content: 'markdown article',
  },
})

// One call. Blog + 5 Topics + 15 Posts.
const blog = await db.Blog('AI Startups')
```

## Installation

```bash
npm install database.do
```

## The Magic: Cascading Generation

Your schema is a blueprint. Relationships tell AI what to create next.

```typescript
const blog = await db.Blog('Services-as-Software')

// That single call cascades through your entire graph:
// Blog → generates 5 Topics → each Topic generates 3 Posts
// Result: 1 Blog, 5 Topics, 15 Posts—all connected, all coherent
```

No manual entry. No loops. No boilerplate. Just the data you need.

## Relationships That Make Sense

Think of arrows as "creates" or "collects":

| Pattern | Meaning | Example |
|---------|---------|---------|
| `->Type` | Creates and links to | `'5 topics ->Topic'` creates 5 topics |
| `<-Type` | Collects from | `'<-Post'` gathers all posts that link here |
| `~>Type` | Finds similar or creates | `'~>Category'` matches existing or makes new |
| `<~Type` | Finds similar that link here | `'<~Post'` finds related posts |

The arrow points where the data flows. Forward creates. Backward collects.

### The Blog Example

```typescript
const db = DB({
  Blog: {
    title: 'SEO-optimized title',
    topics: ['5 topics ->Topic'],    // Creates 5 topics
    posts: ['<-Post'],               // Collects all posts (via topics)
  },
  Topic: {
    name: 'topic name',
    posts: ['3 posts ->Post'],       // Each topic creates 3 posts
  },
  Post: {
    title: 'compelling headline',
    content: 'markdown article',
    topic: '->Topic',                // Links back to its topic
  },
})

const blog = await db.Blog('Building with AI')
// blog.topics[0].posts[0].content → full article, ready to publish
```

## Ask Questions, Get Answers

Query your data like you're asking a colleague:

```typescript
const leads = await db.Lead`ready to close this week`
const posts = await db.Post`most popular about AI`
const users = await db.User`signed up from ProductHunt`
```

Add context when you need it:

```typescript
const qualified = await db.Lead`score above 80 in ${industry}`
const recent = await db.Post`published in the last ${days} days`
```

## Chain Without Waiting

Build queries naturally. Nothing runs until you await:

```typescript
const topLeads = db.Lead.list()
  .filter(l => l.score > 80)
  .sort('score', 'desc')
  .take(10)

const results = await topLeads
```

Relationships load smart—no N+1 problem:

```typescript
const enriched = await db.Lead.list().map(lead => ({
  name: lead.name,
  company: lead.company,    // All companies load in one query
  contacts: lead.contacts,  // Contacts too
}))
```

## The Basics Still Work

Standard operations when you need them:

```typescript
// Create
const post = await db.Post.create({ title: 'Getting Started', content: '...' })

// Read
const post = await db.Post.get('post-123')
const posts = await db.Post.list()
const published = await db.Post.find({ published: true })

// Update
await db.Post.update('post-123', { title: 'New Title' })

// Delete
await db.Post.delete('post-123')
```

## Process at Scale

Run through thousands of records with built-in recovery:

```typescript
await db.Lead.forEach(async lead => {
  await db.Lead.update(lead.id, {
    analysis: await ai`analyze ${lead}`
  })
}, {
  concurrency: 10,
  persist: true,  // Survives crashes, picks up where it left off
})
```

## Configuration

Set your API key:

```bash
export DO_API_KEY=your-api-key
```

Or configure directly:

```typescript
import { Database } from 'database.do'

const db = Database({ apiKey: 'your-api-key' })
```

## Links

- [Website](https://database.do)
- [Documentation](https://docs.database.do)
- [GitHub](https://github.com/drivly/workers)
