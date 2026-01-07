# @dotdo/app-docs

Documentation site for workers.do, built with Fumadocs.

## Overview

The docs app provides comprehensive documentation for the workers.do platform. It uses Fumadocs for the documentation framework and mdxui for enhanced MDX rendering, enabling rich interactive documentation experiences.

## Route

```
/docs
```

Accessible at `my-site.workers.do/docs` on any workers.do site.

## Features

- Full-text search across documentation
- Syntax-highlighted code blocks
- Interactive API references
- MDX-powered content with live examples
- Table of contents navigation
- Dark/light theme support
- Version selector
- Responsive design

## Tech Stack

- Vite - Build tool and dev server
- React 19 - UI framework
- React Router 7 - Routing
- Tailwind CSS 4 - Styling
- Fumadocs Core - Documentation framework
- Fumadocs UI - Pre-built documentation components
- mdxui - Enhanced MDX rendering and components

## Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Embedding

The docs UI is automatically available at the `/docs` route on any workers.do site:

```
my-site.workers.do/docs      -> documentation home
my-site.workers.do/docs/*    -> documentation pages
```

## Fumadocs Integration

Fumadocs provides:
- File-based routing for MDX content
- Automatic sidebar generation
- Built-in search functionality
- Code block enhancements (copy button, line highlighting)
- Frontmatter-based metadata

## mdxui Integration

mdxui enables:
- Custom component rendering in MDX
- Interactive code playgrounds
- Live examples with editable code
- Consistent styling across documentation

## Content Structure

Documentation content lives in MDX files organized by topic:

```
apps/docs/
├── src/
│   ├── routes/        # React Router routes
│   ├── components/    # Custom doc components
│   └── main.tsx       # Entry point
├── content/           # MDX documentation files
│   ├── getting-started/
│   ├── guides/
│   ├── api/
│   └── reference/
├── vite.config.ts
└── package.json
```

## Writing Documentation

Create MDX files with frontmatter:

```mdx
---
title: Getting Started
description: Quick start guide for workers.do
---

# Getting Started

Your documentation content here...
```
