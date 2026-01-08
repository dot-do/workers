# directories.as

**Build directories that build audiences.**

```bash
npm install directories.as
```

---

## The Best Marketing Is Owned Traffic

You're spending money on ads. Fighting the algorithm. Renting attention from platforms that don't care about you.

Meanwhile, the smartest founders are building directories.

Product Hunt. Indie Hackers. Hacker News. These aren't just communities—they're traffic machines. SEO goldmines. Audience-building engines.

**What if you could build one for your niche?**

## Directories in Minutes, Not Months

```typescript
import { directories } from 'directories.as'

const directory = await directories.create({
  name: 'ai-tools',
  title: 'AI Tools Directory',
  schema: {
    name: { type: 'text', required: true, searchable: true },
    description: { type: 'textarea', searchable: true },
    category: { type: 'select', options: ['Writing', 'Coding', 'Design'], filterable: true },
    website: { type: 'url' },
    pricing: { type: 'select', options: ['Free', 'Freemium', 'Paid'], filterable: true }
  },
  allowSubmissions: true,
  reviews: true
})

// Live at: directory.url
// Submissions flowing. SEO building. Audience growing.
```

**directories.as** gives you:
- Beautiful, searchable listings
- User submissions with approval flow
- Ratings and reviews
- SEO-optimized pages
- Your own traffic moat

## Build Your Directory in 3 Steps

### 1. Define Your Schema

```typescript
import { directories } from 'directories.as'

const directory = await directories.create({
  name: 'remote-jobs',
  title: 'Remote Developer Jobs',
  schema: {
    title: { type: 'text', required: true, searchable: true },
    company: { type: 'text', required: true, searchable: true },
    salary: { type: 'text', sortable: true },
    location: { type: 'select', options: ['Worldwide', 'US Only', 'EU Only'], filterable: true },
    type: { type: 'select', options: ['Full-time', 'Contract', 'Part-time'], filterable: true },
    description: { type: 'textarea', searchable: true },
    applyUrl: { type: 'url' }
  },
  allowSubmissions: true,
  requireApproval: true
})
```

### 2. Populate and Curate

```typescript
// Add listings programmatically
await directories.add('remote-jobs', {
  title: 'Senior React Developer',
  company: 'Acme Inc',
  salary: '$150k - $200k',
  location: 'Worldwide',
  type: 'Full-time',
  description: 'Join our remote-first team...',
  applyUrl: 'https://acme.com/apply'
})

// Or let users submit
// Approve quality submissions
const pending = await directories.listings('remote-jobs', { status: 'pending' })
for (const listing of pending) {
  await directories.approve('remote-jobs', listing.id)
}
```

### 3. Grow and Monetize

```typescript
// Feature premium listings
await directories.feature('remote-jobs', listingId, true)

// Track growth
const metrics = await directories.metrics('remote-jobs')
console.log(`${metrics.totalViews} page views`)
console.log(`${metrics.submissionsPerDay} new submissions daily`)

// Search brings users
const results = await directories.search('remote-jobs', {
  query: 'react',
  filters: { location: 'Worldwide' }
})
```

## The Directory Advantage

**Paid acquisition:**
- Costs money forever
- Traffic stops when you stop paying
- You're renting someone else's audience

**Directory strategy:**
- SEO compounds over time
- Traffic grows while you sleep
- You own your audience

## Everything for Directory Builders

```typescript
// Powerful search
const results = await directories.search('ai-tools', {
  query: 'writing assistant',
  category: 'Writing',
  sort: 'rating',
  order: 'desc'
})

// User reviews
await directories.review('ai-tools', listingId, {
  rating: 5,
  title: 'Game changer',
  content: 'This tool saved me hours every week'
})

// Import existing data
await directories.import('ai-tools', csvData, 'csv')

// Export for backups
const backup = await directories.export('ai-tools', 'json')
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
import { directories } from 'directories.as'

// Environment is automatically configured
await directories.create({ name, title, schema })
```

### Custom Configuration

```typescript
import { Directories } from 'directories.as'

const client = Directories({
  baseURL: 'https://custom.example.com'
})
```

## Own Your Traffic

Every day you're not building owned audience is a day you're paying rent to platforms that don't care about you.

**Build a directory. Build a moat. Build an audience that's yours.**

```bash
npm install directories.as
```

[Build your directory at directories.as](https://directories.as)

---

MIT License
