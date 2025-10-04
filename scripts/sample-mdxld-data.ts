/**
 * Sample MDXLD Data for R2 SQL Testing
 *
 * Generates realistic MDXLD "things" and "relationships" for testing
 * the R2 SQL graph database with backlink query patterns.
 */

export interface Thing {
  ns: string // Domain (e.g., "github.com")
  id: string // Path (e.g., "/dot-do/api")
  type: string // Thing type (e.g., "Repository", "Documentation", "BlogPost")
  data: Record<string, any> // YAML frontmatter as JSON
  content: string // Full markdown including YAML
}

export interface Relationship {
  fromNs: string
  fromId: string
  fromType: string
  predicate: string // e.g., "links_to", "depends_on", "references"
  toNs: string
  toId: string
  toType: string
  data?: Record<string, any>
  createdAt: string // ISO 8601 timestamp
}

/**
 * Sample GitHub repositories
 */
export const repositories: Thing[] = [
  {
    ns: 'github.com',
    id: '/dot-do/api',
    type: 'Repository',
    data: {
      name: 'API',
      description: 'Core API services for dot-do platform',
      language: 'TypeScript',
      stars: 42,
      topics: ['api', 'cloudflare-workers', 'hono', 'typescript'],
      visibility: 'public',
    },
    content: `---
name: API
description: Core API services for dot-do platform
language: TypeScript
stars: 42
topics: [api, cloudflare-workers, hono, typescript]
visibility: public
---

# API Repository

Core API services for the dot-do platform, built on [Cloudflare Workers](https://github.com/cloudflare/workers-sdk) and [Hono](https://hono.dev).

## Features

- **RPC Interface** - Service-to-service communication
- **HTTP API** - REST endpoints via Hono
- **Database Layer** - Integration with [PostgreSQL](https://github.com/dot-do/db)
- **Authentication** - WorkOS integration

## Links

- [Documentation](https://docs.do/api)
- [Database Layer](https://github.com/dot-do/db)
- [Workers Repository](https://github.com/dot-do/workers)
`,
  },
  {
    ns: 'github.com',
    id: '/dot-do/db',
    type: 'Repository',
    data: {
      name: 'Database',
      description: 'Database layer with Drizzle ORM and PostgreSQL',
      language: 'TypeScript',
      stars: 28,
      topics: ['database', 'drizzle-orm', 'postgresql', 'neon'],
      visibility: 'public',
    },
    content: `---
name: Database
description: Database layer with Drizzle ORM and PostgreSQL
language: TypeScript
stars: 28
topics: [database, drizzle-orm, postgresql, neon]
visibility: public
---

# Database Repository

Database layer using [Drizzle ORM](https://orm.drizzle.team) with PostgreSQL via [Neon](https://neon.tech).

## Schema

- **Things** - Entity storage
- **Relationships** - Graph relationships
- **Users** - Authentication
- **API Keys** - Authorization

## Links

- [API Repository](https://github.com/dot-do/api)
- [Drizzle ORM](https://orm.drizzle.team)
`,
  },
  {
    ns: 'github.com',
    id: '/dot-do/workers',
    type: 'Repository',
    data: {
      name: 'Workers',
      description: 'Microservices architecture with 30+ Cloudflare Workers',
      language: 'TypeScript',
      stars: 56,
      topics: ['cloudflare-workers', 'microservices', 'hono', 'rpc'],
      visibility: 'public',
    },
    content: `---
name: Workers
description: Microservices architecture with 30+ Cloudflare Workers
language: TypeScript
stars: 56
topics: [cloudflare-workers, microservices, hono, rpc]
visibility: public
---

# Workers Repository

Microservices architecture with 30+ specialized [Cloudflare Workers](https://workers.cloudflare.com).

## Core Services

- **gateway** - API routing
- **db** - Database RPC
- **auth** - Authentication
- **schedule** - Cron jobs
- **webhooks** - External webhooks

## Links

- [API Repository](https://github.com/dot-do/api)
- [Database Repository](https://github.com/dot-do/db)
- [Documentation](https://docs.do/workers)
`,
  },
]

/**
 * Sample documentation pages
 */
export const documentation: Thing[] = [
  {
    ns: 'docs.do',
    id: '/api',
    type: 'Documentation',
    data: {
      title: 'API Documentation',
      category: 'Core Concepts',
      version: '1.0',
      lastUpdated: '2025-10-04',
    },
    content: `---
title: API Documentation
category: Core Concepts
version: 1.0
lastUpdated: 2025-10-04
---

# API Documentation

The [API service](https://github.com/dot-do/api) provides the core HTTP and RPC interfaces.

## Architecture

Built on [Hono](https://hono.dev) and deployed to [Cloudflare Workers](https://workers.cloudflare.com).

## Database Access

All database operations go through the [database service](https://github.com/dot-do/db).

## See Also

- [Workers Documentation](https://docs.do/workers)
- [Database Documentation](https://docs.do/database)
`,
  },
  {
    ns: 'docs.do',
    id: '/workers',
    type: 'Documentation',
    data: {
      title: 'Workers Documentation',
      category: 'Core Concepts',
      version: '1.0',
      lastUpdated: '2025-10-04',
    },
    content: `---
title: Workers Documentation
category: Core Concepts
version: 1.0
lastUpdated: 2025-10-04
---

# Workers Documentation

The [workers repository](https://github.com/dot-do/workers) contains 30+ microservices.

## Core Services

See the [API documentation](https://docs.do/api) for HTTP endpoints.

## Links

- [Workers Repository](https://github.com/dot-do/workers)
- [API Repository](https://github.com/dot-do/api)
`,
  },
  {
    ns: 'docs.do',
    id: '/database',
    type: 'Documentation',
    data: {
      title: 'Database Documentation',
      category: 'Core Concepts',
      version: '1.0',
      lastUpdated: '2025-10-04',
    },
    content: `---
title: Database Documentation
category: Core Concepts
version: 1.0
lastUpdated: 2025-10-04
---

# Database Documentation

The [database service](https://github.com/dot-do/db) provides PostgreSQL access via [Drizzle ORM](https://orm.drizzle.team).

## Schema

Includes tables for things, relationships, users, and API keys.

## Links

- [Database Repository](https://github.com/dot-do/db)
- [API Documentation](https://docs.do/api)
`,
  },
]

/**
 * Sample blog posts
 */
export const blogPosts: Thing[] = [
  {
    ns: 'blog.do',
    id: '/2025-10-01-microservices-architecture',
    type: 'BlogPost',
    data: {
      title: 'Building a Microservices Architecture with Cloudflare Workers',
      author: 'Nathan Clevenger',
      publishedAt: '2025-10-01',
      tags: ['architecture', 'cloudflare', 'microservices'],
    },
    content: `---
title: Building a Microservices Architecture with Cloudflare Workers
author: Nathan Clevenger
publishedAt: 2025-10-01
tags: [architecture, cloudflare, microservices]
---

# Building a Microservices Architecture with Cloudflare Workers

We've decomposed our monolithic [API](https://github.com/dot-do/api) into 30+ specialized [workers](https://github.com/dot-do/workers).

## Benefits

- Independent scaling
- Fault isolation
- Developer velocity

## Links

- [Workers Repository](https://github.com/dot-do/workers)
- [API Repository](https://github.com/dot-do/api)
- [Workers Documentation](https://docs.do/workers)
`,
  },
  {
    ns: 'blog.do',
    id: '/2025-10-02-r2-sql-graph-database',
    type: 'BlogPost',
    data: {
      title: 'Using R2 SQL for TB-Scale Graph Queries',
      author: 'Nathan Clevenger',
      publishedAt: '2025-10-02',
      tags: ['database', 'r2-sql', 'graph', 'performance'],
    },
    content: `---
title: Using R2 SQL for TB-Scale Graph Queries
author: Nathan Clevenger
publishedAt: 2025-10-02
tags: [database, r2-sql, graph, performance]
---

# Using R2 SQL for TB-Scale Graph Queries

We're evaluating [Cloudflare R2 SQL](https://developers.cloudflare.com/r2-sql) for our [MDXLD graph database](https://github.com/dot-do/db).

## Query Pattern

Our backlink queries are simple single-table selects, perfect for R2 SQL's capabilities.

## Links

- [Database Repository](https://github.com/dot-do/db)
- [R2 SQL Documentation](https://developers.cloudflare.com/r2-sql)
`,
  },
]

/**
 * Parse markdown content for links and generate relationships
 */
export function extractRelationships(things: Thing[]): Relationship[] {
  const relationships: Relationship[] = []
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

  for (const thing of things) {
    const matches = [...thing.content.matchAll(linkRegex)]

    for (const match of matches) {
      const url = match[2]

      // Skip non-http/https links (e.g., anchors, mailto)
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        continue
      }

      try {
        const parsed = new URL(url)
        const toNs = parsed.hostname
        const toId = parsed.pathname

        // Find the target thing to get its type
        const target = things.find((t) => t.ns === toNs && t.id === toId)

        relationships.push({
          fromNs: thing.ns,
          fromId: thing.id,
          fromType: thing.type,
          predicate: 'links_to',
          toNs,
          toId,
          toType: target?.type || 'Unknown',
          data: {
            linkText: match[1],
            context: match[0],
          },
          createdAt: new Date().toISOString(),
        })
      } catch (error) {
        // Skip invalid URLs
        continue
      }
    }
  }

  return relationships
}

/**
 * Generate complete sample dataset
 */
export function generateSampleData() {
  const allThings = [...repositories, ...documentation, ...blogPosts]
  const relationships = extractRelationships(allThings)

  return {
    things: allThings,
    relationships,
    summary: {
      thingsCount: allThings.length,
      relationshipsCount: relationships.length,
      types: {
        Repository: repositories.length,
        Documentation: documentation.length,
        BlogPost: blogPosts.length,
      },
      namespaces: Array.from(new Set(allThings.map((t) => t.ns))),
    },
  }
}
