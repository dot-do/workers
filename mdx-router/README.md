# MDX Router Worker

Routes MDX content to specialized renderer workers based on `$type` and `$style` frontmatter fields.

## Features

- ✅ Fetch MDX from URLs, KV, R2, or POST body
- ✅ Parse frontmatter to extract routing metadata
- ✅ Route to appropriate renderer via Service Bindings
- ✅ Support multiple content types and style frameworks
- ✅ Fallback to defaults if metadata missing

## Supported Combinations

### Content Types
- `WaitList` - Email capture and waitlist landing pages
- `LandingPage` - Full-featured landing pages
- `Blog` - Blog posts and articles
- `Site` - General website pages
- `Directory` - Listings and directories

### Style Frameworks
- `tailwind` - Tailwind CSS components
- `picocss` - Minimal, semantic PicoCSS
- `chakra` - Chakra UI components

## Usage

### Render from URL
```bash
curl "https://mdx.do/render?url=https://example.com/page.mdx"
```

### Render from POST body
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

### Render from KV/R2
```bash
curl "https://mdx.do/pages/landing"
# Looks up: pages/landing.mdx in KV, then R2
```

## Frontmatter

```yaml
---
$type: LandingPage
$style: tailwind
title: My Landing Page
description: A beautiful landing page
---
```

## Service Bindings

The router worker uses Service Bindings to route to renderer workers:

- `WAITLIST_TAILWIND` → `mdx-waitlist-tailwind`
- `LANDING_TAILWIND` → `mdx-landingpage-tailwind`
- `BLOG_PICO` → `mdx-blog-picocss`
- etc.

## Deployment

```bash
pnpm deploy
```

## Development

```bash
pnpm dev
```

## Architecture

```
Request → Router → Parse → Route → Renderer → Response
            ↓        ↓       ↓         ↓
         Fetch    Extract  Service   Render
          MDX    $type/$style Binding  MDX
```
