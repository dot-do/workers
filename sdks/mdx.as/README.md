# mdx.as

**Write content that does things.**

```bash
npm install mdx.as
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { mdx } from 'mdx.as'

// Or use the factory for custom config
import { MDX } from 'mdx.as'
const mdx = MDX({ baseURL: 'https://custom.example.com' })
```

---

## Static Content Is Dead

Your users expect interactivity. Demos they can play with. Charts that update. Code that runs. Content that responds.

But adding interactivity to content means:
- Complex build pipelines
- Component bundling nightmares
- Hydration mismatches
- SEO trade-offs
- Markdown that stops being simple

**What if your content could just... do things?**

## Content With Superpowers

```typescript
import { mdx } from 'mdx.as'

const result = await mdx.process(`
# Try Our API

Enter your name and see the magic:

<Demo>
  <Input name="userName" placeholder="Your name" />
  <Output>Hello, {userName}!</Output>
</Demo>

## Pricing Calculator

<PricingCalculator
  plans={['starter', 'pro', 'enterprise']}
  interactive={true}
/>

This content is **alive**.
`)

// HTML that works. Components that respond.
```

**mdx.as** gives you:
- MDX compilation as a service
- Interactive components in markdown
- Syntax highlighting built in
- Frontmatter parsing
- Reading time & TOC extraction
- Version history

## Create Interactive Content in 3 Steps

### 1. Write Your Content

```markdown
---
title: Getting Started Guide
author: Jane Developer
---

# Getting Started

Welcome! Let's get you set up in under 5 minutes.

<Callout type="info">
  This guide assumes you have Node.js installed.
</Callout>

## Installation

```bash
npm install @acme/sdk
```

<CodePlayground language="typescript">
import { acme } from '@acme/sdk'

// Try editing this code!
const result = await acme.hello('World')
console.log(result)
</CodePlayground>

## Configuration

<ConfigBuilder
  options={['api_key', 'environment', 'timeout']}
  onGenerate={(config) => console.log(config)}
/>

That's it! You're ready to build.
```

### 2. Compile and Render

```typescript
import { mdx } from 'mdx.as'

const result = await mdx.compile(content, {
  highlight: true,
  theme: 'github-dark',
  components: ['Callout', 'CodePlayground', 'ConfigBuilder']
})

console.log(result.frontmatter)  // { title, author }
console.log(result.headings)     // Table of contents
console.log(result.readingTime)  // 3 min read

// Render to HTML
const html = await mdx.render(result.code, {
  components: {
    Callout: myCalloutComponent,
    CodePlayground: myPlaygroundComponent
  }
})
```

### 3. Publish Anywhere

```typescript
// Create a managed document
const doc = await mdx.create({
  slug: 'getting-started',
  title: 'Getting Started Guide',
  content: mdxContent
})

await mdx.publish('getting-started')

// Search across all docs
const results = await mdx.search('installation')
```

## Why MDX Changes Everything

**Plain Markdown:**
- Static text and images
- No interactivity
- Boring code blocks
- Readers skim and leave

**MDX with mdx.as:**
- Interactive demos
- Live code playgrounds
- Dynamic visualizations
- Readers engage and convert

## Everything for Content Creators

```typescript
// Validate before publishing
const validation = await mdx.validate(content)
if (!validation.valid) {
  console.log(validation.errors)
}

// Extract table of contents
const toc = await mdx.toc(content)

// Register custom components
await mdx.registerComponent({
  name: 'PricingTable',
  props: [
    { name: 'plans', type: 'string[]', required: true },
    { name: 'annual', type: 'boolean', required: false, default: false }
  ],
  source: pricingTableSource
})

// Use templates for consistency
const template = await mdx.createTemplate({
  name: 'Blog Post',
  content: `---
title: {{title}}
date: {{date}}
---

# {{title}}

{{intro}}

## The Problem

{{problem}}

## The Solution

{{solution}}
`,
  variables: ['title', 'date', 'intro', 'problem', 'solution']
})

// Generate from template
const doc = await mdx.fromTemplate(template.id, {
  title: 'Why We Built This',
  date: '2024-01-15',
  intro: 'Let me tell you a story...'
})
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
import { mdx } from 'mdx.as'

// Environment is automatically configured
await mdx.compile(content, options)
```

### Custom Configuration

```typescript
import { MDX } from 'mdx.as'

const client = MDX({
  baseURL: 'https://custom.example.com'
})
```

## Your Content, Alive

Static content gets skipped. Interactive content gets shared.

**Make your content do things. Make your readers stay.**

```bash
npm install mdx.as
```

[Create interactive content at mdx.as](https://mdx.as)

---

MIT License
