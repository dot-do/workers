# page.as

**Ship landing pages in minutes. Not sprints.**

```bash
npm install page.as
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { page } from 'page.as'

// Or use the factory for custom config
import { Page } from 'page.as'
const page = Page({ baseURL: 'https://custom.example.com' })
```

---

## Your Launch Is Waiting on a Landing Page

You have the product. You have the pitch. You have the moment.

But between you and your launch is... a landing page.

And suddenly you're:
- Debating design decisions for days
- Fighting with CSS at 2am
- Waiting on designers who are overbooked
- Missing your launch window

**Your idea deserves better.**

## Landing Pages at the Speed of Thought

```typescript
import { page } from 'page.as'

const landing = await page.create({
  slug: 'my-product',
  title: 'The Future of [X]',
  template: 'startup',
  sections: [
    { type: 'hero', headline: 'Build faster. Ship sooner.', cta: 'Get Early Access' },
    { type: 'features', items: [...] },
    { type: 'pricing', plans: [...] },
    { type: 'cta', headline: 'Ready to start?' }
  ]
})

await page.publish('my-product')
// Live. Beautiful. Done.
```

**page.as** gives you:
- Professional templates that convert
- Drag-and-drop sections
- Built-in analytics
- A/B testing included
- AI-powered page generation

## Launch Your Page in 3 Steps

### 1. Choose Your Sections

```typescript
import { page } from 'page.as'

const landing = await page.create({
  slug: 'acme-launch',
  title: 'Acme - Build Without Limits',
  sections: [
    {
      type: 'hero',
      headline: 'Ship products 10x faster',
      subheadline: 'The platform that handles everything but your idea',
      cta: 'Start Free',
      ctaUrl: '/signup'
    },
    {
      type: 'features',
      items: [
        { icon: 'zap', title: 'Lightning Fast', description: 'Deploy in seconds' },
        { icon: 'shield', title: 'Secure by Default', description: 'Enterprise-grade security' },
        { icon: 'scale', title: 'Infinite Scale', description: 'From 0 to millions' }
      ]
    },
    {
      type: 'testimonials',
      items: [...]
    },
    {
      type: 'pricing',
      plans: [...]
    }
  ]
})
```

### 2. Customize and Preview

```typescript
// Update any section
await page.updateSection('acme-launch', 'hero', {
  headline: 'Ship products 100x faster'  // Even better
})

// Reorder sections
await page.reorderSections('acme-launch', ['hero', 'testimonials', 'features', 'pricing'])
```

### 3. Publish and Optimize

```typescript
await page.publish('acme-launch')

// Track performance
const metrics = await page.metrics('acme-launch')
console.log(`${metrics.views} views, ${metrics.conversionRate}% conversion`)

// A/B test your headlines
await page.createTest('acme-launch', {
  name: 'headline-test',
  variants: [
    { name: 'A', sections: [{ type: 'hero', headline: 'Ship 10x faster' }] },
    { name: 'B', sections: [{ type: 'hero', headline: 'Build without limits' }] }
  ],
  metric: 'signups'
})
```

## Stop Waiting, Start Launching

**The old way:**
- 2 weeks of design
- 1 week of development
- Endless revision cycles
- Launch window: missed

**The page.as way:**
- Pick a template
- Add your content
- Publish
- Launch window: today

## Everything for High-Converting Pages

```typescript
// Let AI generate your page
const generated = await page.generate(
  'A landing page for a developer tool that helps teams ship faster'
)

// Export as HTML if needed
const html = await page.export('acme-launch')

// Duplicate for campaigns
await page.duplicate('acme-launch', 'acme-launch-ph')

// Track what's working
const results = await page.testResults(testId)
console.log(`Winner: ${results.winner}`)
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
import { page } from 'page.as'

// Environment is automatically configured
await page.create({ slug, title, sections })
```

### Custom Configuration

```typescript
import { Page } from 'page.as'

const client = Page({
  baseURL: 'https://custom.example.com'
})
```

## Your Launch Shouldn't Wait

Ideas have expiration dates. Momentum matters. Every day without a landing page is a day of lost opportunity.

**Ship your page today. Launch your product tomorrow.**

```bash
npm install page.as
```

[Build your page at page.as](https://page.as)

---

MIT License
