# site

# Site Worker - MDX Website Hosting

Runtime MDX compilation and static site hosting service for .do domains with in-browser rendering.

## Overview

The Site worker provides MDX-based website hosting with runtime compilation, allowing developers to embed MDX content directly in HTML and render it client-side. Supports multiple rendering strategies, component libraries, and integrations with shadcn/ui and mdxui.org.

## Features

- ✅ **Runtime MDX Compilation** - In-browser MDX compilation using @mdx-js/mdx
- ✅ **Multiple Frameworks** - React, Preact, and Vue support
- ✅ **Component Libraries** - shadcn/ui, mdxui.org integration
- ✅ **Template Engine** - Pre-built site templates
- ✅ **R2 Storage** - Static asset hosting
- ✅ **KV Caching** - Fast template and component delivery
- ✅ **Schema.org Support** - Structured data via JSON-LD
- ✅ **MDXLD Format** - MDX with Linked Data ($type, $id)
- ✅ **Hot Reload** - Development mode with live updates
- ✅ **CDN Integration** - Tailwind, ESM modules via CDN

## Architecture

```
┌─────────────┐
│   Browser   │  ◄── Loads HTML with inert MDX
│   (Client)  │      Runtime compiles and renders
└──────┬──────┘
       │
       │ HTTPS
       │
       ▼
┌──────────────┐
│   site/      │  ◄── This Worker
│   Worker     │      - Serves HTML templates
└──────┬───────┘      - Provides MDX content
       │              - Manages R2/KV cache
       │
       │ Bindings
       │
       ├─────────────┬──────────────┬───────────┐
       ▼             ▼              ▼           ▼
   ┌────────┐   ┌────────┐    ┌────────┐  ┌────────┐
   │   DB   │   │ Storage│    │  R2    │  │   KV   │
   │Service │   │Service │    │  Sites │  │  Cache │
   └────────┘   └────────┘    └────────┘  └────────┘
```

**Service Dependencies:**
- **DB Service** (binding: `DB`) - Site metadata and analytics
- **Storage Service** (binding: `STORAGE`) - Asset management
- **R2 Bucket** (binding: `SITES`) - Static file hosting
- **KV Namespace** (binding: `SITE_CACHE`) - Template caching (1hr TTL)

## API Endpoints

### Site Rendering

```bash
GET /:domain                     # Serve site homepage
GET /:domain/:path               # Serve site page
GET /:domain/assets/*            # Serve static assets
```

### Site Management

```bash
POST /api/sites                  # Create new site
PUT /api/sites/:id               # Update site
DELETE /api/sites/:id            # Delete site
GET /api/sites/:id               # Get site details
GET /api/sites                   # List all sites
```

### Template Management

```bash
GET /api/templates               # List available templates
GET /api/templates/:id           # Get template details
POST /api/templates/:id/deploy   # Deploy template to site
```

### Component Library

```bash
GET /api/components              # List available components
GET /api/components/:name        # Get component source
GET /api/components/bundle       # Get component bundle
```

## MDX Embedding Strategies

### Strategy 1: Script Tag (Inert Payload)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My MDX Site</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Welcome to MDX",
    "datePublished": "2025-10-04"
  }
  </script>
</head>
<body>
  <!-- Inert MDX content -->
  <script id="content" type="text/mdx">
---
$type: https://schema.org.ai/LandingPage
title: Hello World
---

# Hello, **MDX**

> Renders right in the browser 🎉

export const Note = () => <aside style={{color:'tomato'}}>A JSX component.</aside>

<Note />
  </script>

  <div id="root"></div>

  <!-- Runtime compiler -->
  <script type="module">
    import React from "https://esm.sh/react@18?bundle"
    import ReactDOM from "https://esm.sh/react-dom@18?bundle"
    import { compile } from "https://esm.sh/@mdx-js/mdx@3?bundle"

    const mdxContent = document.getElementById("content").textContent

    const compiled = await compile(mdxContent, {
      jsx: true,
      outputFormat: "function-body",
      providerImportSource: "@mdx-js/react"
    })

    const { default: MDXContent } = await import(
      `data:text/javascript;base64,${btoa(String(compiled))}`
    )

    ReactDOM.render(
      React.createElement(MDXContent, { components: {} }),
      document.getElementById("root")
    )
  </script>
</body>
</html>
```

### Strategy 2: Pre Tag (Visible Content)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My MDX Site</title>
</head>
<body>
  <!-- Visible MDX before JS loads -->
  <pre id="mdx-source" style="display:none">
# Hello World

Welcome to the future

<Footer />
  </pre>

  <div id="app"></div>

  <script type="module">
    // Same compilation logic...
  </script>
</body>
</html>
```

### Strategy 3: Preact (Lightweight)

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Tailwind with typography plugin -->
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
</head>
<body>
  <script id="content" type="text/ld+mdx">
---
$type: https://schema.org.ai/LandingPage
---

# Hello, **Preact + MDX**

<Note />

export function Note() {
  return <aside className="text-fuchsia-600">Preact component!</aside>
}
  </script>

  <div id="root" class="prose mx-auto p-6"></div>

  <script type="module">
    import { render } from "https://esm.sh/preact@10?bundle"
    import { compile } from "https://esm.sh/@mdx-js/mdx@3?bundle"

    const mdx = document.getElementById("content").textContent

    const compiled = await compile(mdx, {
      jsx: true,
      jsxRuntime: "automatic",
      jsxImportSource: "preact",
      outputFormat: "function-body"
    })

    const { default: MDXContent } =
      await import(`data:text/javascript;base64,${btoa(String(compiled))}`)

    render(<MDXContent />, document.getElementById("root"))
  </script>
</body>
</html>
```

## MDXLD Format (MDX + Linked Data)

All MDX files support MDXLD format with `$type` and `$id`:

```mdx
---
$type: https://schema.org.ai/BlogPost
$id: blog/2025-10-04-hello-world
title: Hello World
author: Nathan Clevenger
datePublished: 2025-10-04
---

# Hello World

This is a blog post with structured data!
```

The `$type` field uses schema.org.ai vocabulary for semantic web integration.

## Template System

### Built-in Templates

1. **landing-page** - Single-page marketing site
2. **blog** - Multi-page blog with posts
3. **docs** - Documentation site with sidebar
4. **portfolio** - Personal portfolio site
5. **dashboard** - App dashboard with charts

### Template Structure

```
templates/
├── landing-page/
│   ├── index.mdx          # Homepage
│   ├── components/        # Page components
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   └── CTA.tsx
│   ├── styles/            # Custom styles
│   │   └── tailwind.css
│   └── config.json        # Template config
```

### Deploy Template

```bash
curl -X POST https://site.apis.do/api/templates/landing-page/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "customization": {
      "title": "My Product",
      "hero": {
        "headline": "Build faster",
        "subheadline": "Ship products in hours"
      },
      "cta": {
        "text": "Get Started",
        "url": "/signup"
      }
    }
  }'
```

## Component Library Integration

### shadcn/ui Components



### Custom Components

```javascript
const components = {
  h1: ({ children }) => <h1 className="text-4xl font-bold">{children}</h1>,
  p: ({ children }) => <p className="text-gray-700">{children}</p>,
  Button: ({ children, ...props }) => (
    <button className="bg-blue-500 text-white px-4 py-2" {...props}>
      {children}
    </button>
  )
}
```

## Site Configuration

### Site Metadata

```json
{
  "id": "example-com",
  "domain": "example.com",
  "title": "Example Site",
  "description": "My awesome site",
  "template": "landing-page",
  "theme": {
    "primaryColor": "#3B82F6",
    "font": "system-ui"
  },
  "routes": [
    { "path": "/", "file": "index.mdx" },
    { "path": "/about", "file": "about.mdx" },
    { "path": "/blog/:slug", "file": "blog/[slug].mdx" }
  ],
  "assets": {
    "images": "r2://sites/example-com/images/",
    "fonts": "r2://sites/example-com/fonts/"
  }
}
```

## R2 Storage Structure

```
sites/
├── {domain}/
│   ├── pages/
│   │   ├── index.mdx
│   │   ├── about.mdx
│   │   └── blog/
│   │       ├── post-1.mdx
│   │       └── post-2.mdx
│   ├── components/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── assets/
│   │   ├── images/
│   │   ├── fonts/
│   │   └── styles/
│   └── config.json
```

## Development Mode

```bash
# Start local dev server with hot reload
pnpm dev

# Watch mode for MDX files
pnpm dev:watch

# Build for production
pnpm build
```

## RPC Interface



## Types



## Validation Schemas



## Implementation



## Database Schema

Sites are stored in the `sites` table:

```sql
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  config TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  analytics TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_created_at ON sites(created_at);
```

## Caching Strategy

- **KV Cache**: Templates and components (1hr TTL)
- **R2**: Static assets with immutable URLs
- **Browser Cache**: Assets cached for 1 year

## Usage Examples

### Create Site from Template

```bash
curl -X POST https://site.apis.do/api/templates/landing-page/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "customization": {
      "title": "Acme Inc",
      "hero": {
        "headline": "Build Better Products",
        "subheadline": "Launch in hours, not months"
      },
      "cta": {
        "text": "Start Free Trial",
        "url": "/trial"
      }
    }
  }'
```

### Upload Custom Page

```bash
curl -X POST https://site.apis.do/api/sites/01HQRS9.../pages \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/pricing",
    "content": "---\n$type: Page\n---\n\n# Pricing\n\nOur plans..."
  }'
```

### View Site

```bash
open https://site.apis.do/example.com
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test

# Deploy to production
pnpm deploy
```

## Related Services

- **html/** - Markdown to HTML conversion
- **mdx/** - MDX runtime and compilation
- **storage/** - Asset management

## Tech Stack

- **Hono** - Fast web framework
- **@mdx-js/mdx** - MDX runtime compiler
- **Preact** - Lightweight React alternative
- **Tailwind CSS** - Utility-first styling
- **R2** - Static asset storage
- **KV** - Template caching
- **Zod** - Runtime validation
- **ULID** - Sortable unique IDs
- **TypeScript** - Type-safe development

---

**Generated from:** site.mdx

**Build command:** `pnpm build-mdx site.mdx`

---

**Generated from:** site.mdx

**Build command:** `tsx scripts/build-mdx-worker.ts site.mdx`
