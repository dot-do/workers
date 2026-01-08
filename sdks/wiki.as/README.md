# wiki.as

**Your knowledge, instantly accessible.**

```bash
npm install wiki.as
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { wiki } from 'wiki.as'

// Or use the factory for custom config
import { Wiki } from 'wiki.as'
const wiki = Wiki({ baseURL: 'https://custom.example.com' })
```

---

## Your Team's Knowledge Is Trapped

It's in Slack threads nobody can find. In docs that are always outdated. In the heads of people who are too busy to answer the same questions again.

Every time someone asks "how does X work?" your best engineers stop building to explain. Again.

**What if your knowledge could answer for itself?**

## Documentation That Actually Works

```typescript
import { wiki } from 'wiki.as'

const docs = await wiki.create({
  name: 'product-docs',
  title: 'Product Documentation',
  ai: {
    search: true,      // AI-powered search
    suggestions: true, // Smart recommendations
    autoLink: true     // Automatic cross-references
  }
})

// Your docs are live, searchable, and intelligent
```

**wiki.as** gives you:
- Beautiful documentation sites in seconds
- AI that answers questions from your docs
- Version history on every page
- Search that actually finds things
- Import from anywhere (Notion, Confluence, Markdown)

## Build Your Knowledge Base in 3 Steps

### 1. Create Your Wiki

```typescript
import { wiki } from 'wiki.as'

const docs = await wiki.create({
  name: 'acme-docs',
  title: 'Acme Documentation',
  visibility: 'public'
})
```

### 2. Add Your Knowledge

```typescript
await wiki.page('acme-docs', {
  slug: 'getting-started',
  title: 'Getting Started',
  content: `
# Welcome to Acme

Let's get you set up in 5 minutes.

## Installation

\`\`\`bash
npm install @acme/sdk
\`\`\`

## Quick Start

\`\`\`typescript
import { acme } from '@acme/sdk'
await acme.init()
\`\`\`
  `
})

// Import existing docs
await wiki.import('acme-docs', notionExport, 'notion')
```

### 3. Let AI Handle Questions

```typescript
// Users can ask questions in natural language
const answer = await wiki.ask('acme-docs', 'How do I authenticate?')

console.log(answer.answer)  // Clear explanation
console.log(answer.sources) // Links to relevant pages
```

## The Documentation Dilemma, Solved

**Traditional docs:**
- Always outdated
- Hard to search
- Nobody reads them
- Questions keep coming

**wiki.as docs:**
- Easy to update
- AI-powered search
- People actually find answers
- Questions answered automatically

## Everything You Need for Great Docs

```typescript
// Organize with navigation
await wiki.setNavigation('acme-docs', [
  { title: 'Getting Started', slug: 'getting-started' },
  { title: 'Guides', children: [
    { title: 'Authentication', slug: 'auth' },
    { title: 'API Reference', slug: 'api' }
  ]}
])

// Search across all docs
const results = await wiki.search('acme-docs', 'rate limiting')

// Track what's working
const metrics = await wiki.metrics('acme-docs')
console.log(`Top page: ${metrics.topPages[0].slug}`)

// Export when needed
const pdf = await wiki.export('acme-docs', 'pdf')
```

## Configuration

### Environment Variables

```bash
# Primary API key (used by default)
export DO_API_KEY="your-api-key"

# Alternative: Organization API key
export ORG_AI_API_KEY="your-org-key"
```

### Cloudflare Workers

```typescript
import 'rpc.do/env'
import { wiki } from 'wiki.as'

// Environment is automatically configured
await wiki.create({ name, title })
```

### Custom Configuration

```typescript
import { Wiki } from 'wiki.as'

const client = Wiki({
  baseURL: 'https://custom.example.com'
})
```

## Stop Repeating Yourself

Every hour your team spends answering questions is an hour they're not building.

**Put your knowledge to work. Let your docs do the talking.**

```bash
npm install wiki.as
```

[Build your wiki at wiki.as](https://wiki.as)

---

MIT License
