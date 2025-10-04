/**
 * Documentation Generator
 *
 * Generates markdown documentation from type definitions
 */

import { ROOT_TYPES, AI_TYPES, DB_TYPES, API_TYPES, ON_TYPES, SEND_TYPES, EVERY_TYPES, DECIDE_TYPES, USER_TYPES } from './types'

/**
 * Documentation registry mapping primitive names to type definitions
 */
const DOCS: Record<string, string> = {
  '$': ROOT_TYPES,
  'ai': AI_TYPES,
  'db': DB_TYPES,
  'api': API_TYPES,
  'on': ON_TYPES,
  'send': SEND_TYPES,
  'every': EVERY_TYPES,
  'decide': DECIDE_TYPES,
  'user': USER_TYPES,
}

/**
 * Get documentation for a specific primitive or the complete runtime
 *
 * @param name - Primitive name ('$', 'ai', 'db', etc.)
 * @returns Markdown documentation string
 * @throws Error if primitive not found
 */
export function generateDocs(name: string): string {
  const docs = DOCS[name]

  if (!docs) {
    throw new Error(`Documentation not found for primitive: ${name}`)
  }

  return docs
}

/**
 * List all available documentation topics
 *
 * @returns Array of available primitive names
 */
export function listDocs(): string[] {
  return Object.keys(DOCS)
}

/**
 * Get complete documentation overview
 *
 * @returns Markdown with links to all primitives
 */
export function generateDocsIndex(): string {
  return `
# Business-as-Code Documentation

Complete documentation for the Business-as-Code runtime ($) and all primitives.

## Overview

The **$ runtime** provides 8 core primitives for building business logic in secure V8 isolates:

- **[$ (Runtime Overview)]($.md)** - Complete $ runtime documentation
- **[ai](ai.md)** - AI operations (generation, embeddings, classification)
- **[db](db.md)** - Database operations (CRUD, queries, bulk operations)
- **[api](api.md)** - HTTP API calls (GET, POST, PUT, DELETE)
- **[on](on.md)** - Event handlers (lifecycle events, custom events)
- **[send](send.md)** - Communication (email, SMS, push, webhooks)
- **[every](every.md)** - Scheduling (cron tasks, collection iteration)
- **[decide](decide.md)** - Decision logic (if/then/else, switch/case, rules)
- **[user](user.md)** - User context (authentication, roles, permissions)

## Quick Start

### Pattern 1: Evaluate Statement

Execute a single statement or expression:

\`\`\`typescript
// AI generation
await ai.generateText('Write a haiku about coding')

// Database queries
await db.users.find({ role: 'admin' })

// Chained operations
await db.forEvery.industry.occupations.tasks.generateService()
\`\`\`

### Pattern 2: Business Module

Define complete business logic as a module:

\`\`\`typescript
export default $ => {
  const { ai, api, db, decide, every, on, send, user } = $

  // Event-driven logic
  on.user.created(async (user) => {
    const welcome = await ai.generateWelcomeEmail(user)
    await send.email(user.email, 'Welcome!', welcome)
  })

  // Scheduled tasks
  every.hour.reviewKPIs()
  every.month.forEvery.user.sendMonthlyReport()

  // Decision logic
  decide.switch(user.tier, {
    free: () => db.usage.limit(user.id, { requests: 100 }),
    pro: () => db.usage.limit(user.id, { requests: 10000 }),
    enterprise: () => db.usage.unlimited(user.id)
  })
}
\`\`\`

## Security

All code runs in secure V8 isolates with:
- ✅ **Automatic rollback** - Failed operations roll back automatically
- ✅ **Non-destructive mutations** - Database changes are versioned
- ✅ **Rate limiting** - Tier-based execution limits
- ✅ **Namespace isolation** - Tenant data is isolated
- ✅ **Timeout protection** - Max 30 seconds execution time

## Code Mode Philosophy

> "LLMs are better at writing code to call MCP, than at calling MCP directly"
>
> — [Cloudflare Code Mode Blog Post](https://blog.cloudflare.com/code-mode/)

Instead of exposing 100+ MCP tools, we provide a single \`do\` tool that accepts TypeScript code. The AI writes code using the $ runtime, which is then executed in a secure V8 isolate.

**Benefits:**
- **Simpler for AI** - One tool instead of dozens
- **More flexible** - Can combine primitives in any way
- **Type-safe** - Full TypeScript intellisense and type checking
- **Secure** - Code runs in isolated sandboxes with automatic rollback

## Getting Started

Visit each primitive's documentation page to learn more:
- [$ Runtime Overview]($.md)
- [ai - AI Operations](ai.md)
- [db - Database Operations](db.md)
- [api - HTTP API Calls](api.md)
- [on - Event Handlers](on.md)
- [send - Communication](send.md)
- [every - Scheduling](every.md)
- [decide - Decision Logic](decide.md)
- [user - User Context](user.md)

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}
**Status:** Production Ready
**Powered By:** Cloudflare Workers, V8 Isolates, Code Mode
`
}
