# MDX Multi-Worker Rendering Architecture

## Overview

A distributed architecture for rendering MDX content with different component libraries and styles, using Cloudflare Workers Service Bindings for routing.

## Architecture

```
┌─────────────┐
│   Request   │
│ mdx.do/path │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  Router Worker   │  ◄── Fetches MDX from URL/KV/R2
│  (mdx-router)    │      Parses $type and $style
└────────┬─────────┘      Routes to renderer
         │
         │ Service Bindings
         │
    ┌────┴────┬────────┬─────────┬──────────┐
    │         │        │         │          │
    ▼         ▼        ▼         ▼          ▼
┌─────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐
│WaitList │ │Landing│ │ Blog │ │ Site │ │Directory │
│Tailwind │ │Tailwind│ │Pico  │ │Chakra│ │Tailwind  │
└─────────┘ └──────┘ └──────┘ └──────┘ └──────────┘
```

## Components

### 1. Router Worker (`workers/mdx-router/`)

**Responsibilities:**
- Fetch MDX content from:
  - URL parameters (`?url=https://...`)
  - KV storage (`KV.get(path)`)
  - R2 storage (`R2.get(path)`)
  - Direct body content
- Parse frontmatter to extract `$type` and `$style`
- Route to appropriate renderer worker via Service Binding
- Handle errors and fallbacks

**Frontmatter Example:**
```yaml
---
$type: LandingPage
$style: tailwind
title: My Landing Page
---
```

**Service Bindings:**
```jsonc
{
  "services": [
    { "binding": "WAITLIST_TAILWIND", "service": "mdx-waitlist-tailwind" },
    { "binding": "LANDING_TAILWIND", "service": "mdx-landingpage-tailwind" },
    { "binding": "BLOG_PICO", "service": "mdx-blog-picocss" },
    { "binding": "SITE_CHAKRA", "service": "mdx-site-chakra" },
    { "binding": "DIRECTORY_TAILWIND", "service": "mdx-directory-tailwind" }
  ]
}
```

### 2. Renderer Workers (`workers/mdx-{type}-{style}/`)

**Responsibilities:**
- Pre-bundle type-specific components
- Pre-bundle style-specific components
- Render MDX with @hono/mdx
- Apply component overrides
- Return HTML response

**Naming Convention:**
- `mdx-{type}-{style}`
- Examples:
  - `mdx-waitlist-tailwind`
  - `mdx-landingpage-tailwind`
  - `mdx-blog-picocss`
  - `mdx-site-chakra`
  - `mdx-directory-tailwind`

### 3. Component Libraries

#### Tailwind Components (`packages/mdx-components-tailwind/`)
- Hero
- Features
- Pricing
- FAQ
- CTA
- Form
- Card
- Button
- etc.

#### PicoCSS Components (`packages/mdx-components-pico/`)
- Minimal, semantic HTML
- No custom classes
- Clean typography

#### Chakra Components (`packages/mdx-components-chakra/`)
- Chakra UI-based components
- Accessible by default
- Theme-aware

## Content Types

### WaitList
Components: Hero, Form, EmailCapture, Counter, Features

### LandingPage
Components: Hero, Features, Pricing, Testimonials, FAQ, CTA

### Blog
Components: Article, TOC, Author, RelatedPosts, Comments

### Site
Components: Navigation, Hero, Sections, Footer

### Directory
Components: Listing, Filter, Search, Card, Pagination

## Routing Logic

```typescript
// In router worker
const { $type, $style } = parseFrontmatter(mdx)

const serviceMap = {
  'WaitList:tailwind': env.WAITLIST_TAILWIND,
  'LandingPage:tailwind': env.LANDING_TAILWIND,
  'Blog:picocss': env.BLOG_PICO,
  'Site:chakra': env.SITE_CHAKRA,
  'Directory:tailwind': env.DIRECTORY_TAILWIND,
}

const key = `${$type}:${$style}`
const service = serviceMap[key]

if (!service) {
  throw new Error(`No renderer for ${key}`)
}

// Route via RPC
return service.render(mdx, metadata)
```

## Deployment

Each worker is deployed independently:

```bash
# Deploy router
cd workers/mdx-router && pnpm deploy

# Deploy renderers
cd workers/mdx-waitlist-tailwind && pnpm deploy
cd workers/mdx-landingpage-tailwind && pnpm deploy
cd workers/mdx-blog-picocss && pnpm deploy
```

## Benefits

1. **Code Splitting** - Each worker only bundles its needed components
2. **Independent Scaling** - Scale popular types independently
3. **Style Isolation** - No CSS conflicts between frameworks
4. **Fast Deployment** - Update one renderer without touching others
5. **Easy Extension** - Add new types/styles by adding workers
6. **Type Safety** - TypeScript across all workers

## Usage

### Direct URL
```
https://mdx.do/?url=https://example.com/page.mdx
```

### KV Storage
```
https://mdx.do/pages/landing
→ Fetches from KV: pages/landing.mdx
```

### R2 Storage
```
https://mdx.do/content/blog/post-1
→ Fetches from R2: content/blog/post-1.mdx
```

### POST with body
```bash
curl -X POST https://mdx.do/render \
  -H "Content-Type: text/markdown" \
  -d "---
$type: LandingPage
$style: tailwind
---
# Hello World
"
```

## Next Steps

1. ✅ Create router worker
2. ✅ Create component packages
3. ✅ Create example renderer (landingpage-tailwind)
4. ⏳ Create generator script for new renderers
5. ⏳ Add caching layer
6. ⏳ Add analytics
