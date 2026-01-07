# CLAUDE.md - AI Assistant Guidance

This file provides context and guidance for AI assistants working on the workers.do codebase.

## The Vision: Workers Work for You

**workers.do** has a double meaning:

1. **Cloudflare Workers** - The serverless runtime that powers everything
2. **Digital Workers** - AI agents and humans that work for you

Both kinds of workers. Working for startup founders who need a team.

### The Core API

```typescript
import { tom, priya, mark } from 'agents.do'

tom`build the authentication system`
priya`plan the Q1 roadmap`
mark`write the launch announcement`
```

Natural language. Tagged templates. Agents as functions. This is the heart of workers.do.

### The Architecture

```
roles/        Base job descriptions (CEO, CTO, PDM, Dev, QA...)
agents/       AI workers with identity (Priya, Tom, Rae, Mark, Sally, Quinn)
humans/       Human workers via channels (Slack, Email, Teams, Discord)
teams/        Groups of workers (Engineering, Product, Sales, Marketing)
workflows/    Orchestrated processes (dev, review, marketing, sales)
```

### Named Agents

| Agent | Role | Expertise |
|-------|------|-----------|
| **Priya** | Product | Specs, prioritization, roadmaps |
| **Tom** | Tech Lead | TypeScript, architecture, code review |
| **Rae** | Frontend | React, UI/UX, accessibility |
| **Mark** | Marketing | Copy, content, MDX documentation |
| **Sally** | Sales | Outreach, demos, closing |
| **Quinn** | QA | Testing, edge cases, quality |

Each agent has real identity: email (`tom@agents.do`), GitHub (`@tom-do`), avatar.

### Key Domains

| Domain | Package | Purpose |
|--------|---------|---------|
| [agents.do](https://agents.do) | `agents.do` | AI agents |
| [roles.do](https://roles.do) | `roles.do` | Base role classes |
| [humans.do](https://humans.do) | `humans.do` | Human workers |
| [teams.do](https://teams.do) | `teams.do` | Team compositions |
| [workflows.do](https://workflows.do) | `workflows.do` | Workflow definitions |
| [tom.do](https://tom.do) | `tom.do` | Individual agent |
| [priya.do](https://priya.do) | `priya.do` | Individual agent |

### CapnWeb Pipelining

Work chains without `Promise.all`:

```typescript
const implemented = await priya`plan ${feature}`
  .map(issue => tom`implement ${issue}`)
  .map(code => quinn`test ${code}`)
```

One network round trip. Record-replay pipelining.

## Project Overview

workers.do is the platform for building **Autonomous Startups** - businesses that run on AI with human oversight. It provides:

- **Business-as-Code** - Define entire startups in code
- **AI-delivered Services-as-Software** - AI agents deliver services humans used to provide
- **Platform services** - Identity (WorkOS), Payments (Stripe), AI (llm.do) built in
- **Multi-transport RPC** - REST, Workers RPC, CapnWeb, MCP from one definition
- **Tree-shakable packages** - `dotdo`, `dotdo/tiny`, `dotdo/rpc`, `dotdo/auth`
- **Free-tier optimization** - Snippets and Static Assets for 100k+ sites

## Repository Structure

```
agents/         # AI agents (Priya, Tom, Rae, Mark, Sally, Quinn)
roles/          # Base roles (CEO, CTO, PDM, Dev, QA...)
humans/         # Human workers + channels (Slack, Email, Discord...)
teams/          # Team compositions (Engineering, Product, Sales...)
workflows/      # Workflow definitions (dev, review, marketing, sales...)
workers/        # Cloudflare Workers (the runtime kind)
sdks/           # SDK packages (tom.do, priya.do, llm.do...)
objects/        # Durable Objects (Agent, Human, Workflow...)
apps/           # Full applications (Vite + React Router + shadcn)
middleware/     # Hono middleware
snippets/       # Cloudflare Snippets (free tier)
packages/       # npm packages
primitives/     # TypeScript interfaces (submodule)
auth/           # Better Auth integration
plugins/        # Extensibility plugins
```

## Internal vs External Access

**Internal (workers.do platform):** Service bindings in `env`
```typescript
// Inside workers.do
await env.LLM.complete({ model, prompt })
await env.STRIPE.charges.create({ amount })
await env.ORG.sso.getAuthorizationUrl({ organization })
```

**External (customers via SDKs):** CapnWeb RPC clients
```typescript
// Outside workers.do - install the SDK
import { llm } from 'llm.do'
import { payments } from 'payments.do'
import { org } from 'org.ai'

await llm.complete({ model, prompt })
await payments.charges.create({ amount })
await org.sso.getAuthorizationUrl({ organization })
```

**Authentication:** `DO_API_KEY` or `ORG_AI_API_KEY` environment variable

## Key Design Principles

### 1. Natural Language First

Agents are functions you talk to:

```typescript
tom`review the architecture`      // Not tom.review({ type: 'architecture' })
priya`what should we build next?` // Not priya.prioritize({ timeframe: 'next' })
```

The magic proxy interprets intent. No method names, no parameters.

### 2. Objects Over Frameworks

Developers should return data, not responses:

```typescript
// GOOD - just return objects
export default {
  users: {
    list: () => db.query('SELECT * FROM users')
  }
}

// AVOID - framework boilerplate
app.get('/users', (c) => c.json(db.query('SELECT * FROM users')))
```

The system handles serialization to JSON, HTML, WebSocket, etc.

### 3. Convention Over Configuration

Use conventional binding names:
- `this.env.DOMAINS` - Free domains for builders (builder.domains)
- `this.env.ORG` - Auth for AI and Humans (id.org.ai / WorkOS)
- `this.env.LLM` - AI gateway with billing (llm.do)
- `this.env.STRIPE` - Stripe Connect platform (payments.do)
- `this.env.JOSE` - JWT operations
- `this.env.CLOUDFLARE` - Cloudflare API

### 4. Agents and Humans are Interchangeable

Same interface for both:

```typescript
await tom`review the PR`        // AI agent reviews
await cto`approve the release`  // Human approves via Slack
```

The caller doesn't know (or care) if it's AI or human.

### 5. Tree-Shakable Everything

Every package should have multiple entry points:
- `/tiny` - Minimal, no dependencies
- `/rpc` - Expects deps as RPC bindings
- `/auth` - With authentication
- Default - Full featured

### 6. Free Tier First

Maximize Cloudflare free offerings:
- Snippets for routing/caching/auth (<5ms CPU, <32KB)
- Static Assets for multi-tenant hosting (100k files × 25MB)
- Workers for dynamic computation

### 7. SDK Endpoint Format

All SDKs must use full URL format for endpoint specification:

```typescript
// CORRECT - Full URL format
export function MyService(options?: ClientOptions): MyServiceClient {
  return createClient<MyServiceClient>('https://myservice.do', options)
}

// INCORRECT - Service name only (don't do this)
export function MyService(options?: ClientOptions): MyServiceClient {
  return createClient<MyServiceClient>('myservice', options)  // NO!
}
```

Lint check: `npx tsx scripts/lint-sdk-endpoints.ts`

### 8. API Key Resolution

SDKs must NOT directly access `process.env`. Instead, rely on rpc.do's environment system:

```typescript
// CORRECT - Let rpc.do handle env resolution
export const myservice: MyServiceClient = MyService()

// INCORRECT - Direct process.env access (don't do this)
export const myservice = MyService({
  apiKey: process.env.MYSERVICE_API_KEY,  // NO!
})
```

**Lint check:** `npx tsx scripts/lint-sdk-apikey.ts`

## Platform Services

**builder.domains** (workers/domains) - Free Domains:
```typescript
await env.DOMAINS.claim('my-startup.hq.com.ai')
await env.DOMAINS.route('my-startup.hq.com.ai', { worker: 'my-worker' })
```

**llm.do** (workers/llm) - AI Gateway:
```typescript
await env.LLM.complete({ model: 'claude-3-opus', prompt })
await env.LLM.stream({ model: 'gpt-4', messages })
```

**payments.do** (workers/stripe) - Stripe Connect:
```typescript
await env.STRIPE.charges.create({ amount, currency })
await env.STRIPE.subscriptions.create({ customer, price })
```

**id.org.ai** (workers/workos) - Auth for AI and Humans:
```typescript
await env.ORG.sso.getAuthorizationUrl({ organization })
await env.ORG.vault.store(orgId, 'API_KEY', key)
```

## Working with This Codebase

### Package Locations

| What you need | Where to find it |
|---------------|------------------|
| AI Agents | `agents/` |
| Base Roles | `roles/` |
| Human Workers | `humans/` |
| Teams | `teams/` |
| Workflows | `workflows/` |
| Base DO class | `objects/do/` |
| Agent DO | `objects/agent/` |
| Human DO | `objects/human/` |
| Hono middleware | `middleware/*/` |
| Auth integration | `auth/*/` |
| SDKs | `sdks/*/` |

### Creating New Agents

1. Create folder: `agents/myagent/`
2. Extend a role from `roles/`
3. Add identity (name, email, avatar, GitHub)
4. Add to `agents/index.ts` exports
5. Optionally create `sdks/myagent.do/` for individual package

```typescript
// agents/myagent/index.ts
import { DevAgent } from 'roles/dev'

export class MyAgent extends DevAgent {
  readonly identity = {
    name: 'My Agent',
    email: 'myagent@agents.do',
    github: 'myagent-do',
  }
}
```

### Creating New Roles

1. Create folder: `roles/myrole/`
2. Define capabilities, tools, relationships
3. Create both `Agent` and `Human` variants

```typescript
// roles/myrole/index.ts
import { AgentRole, HumanRole } from '../role'

export class MyRoleAgent extends AgentRole {
  readonly roleId = 'myrole'
  readonly capabilities = {
    functions: ['do', 'something'],
    tools: ['tool1', 'tool2'],
  }
}

export class MyRoleHuman extends HumanRole {
  // Same interface, routes to human channels
}
```

### Creating New Workflows

1. Create folder: `workflows/myworkflow/`
2. Define phases with assignees
3. Add human checkpoints where needed

```typescript
// workflows/myworkflow/index.ts
import { Workflow } from 'workflows.do'

export const myworkflow = Workflow({
  name: 'My Workflow',
  phases: {
    start: { assignee: priya, then: 'work' },
    work: { assignee: tom, then: 'review' },
    review: { assignee: quinn, checkpoint: true, then: null },
  },
})
```

## Testing

- Use `vitest` for unit tests
- Use `@cloudflare/vitest-pool-workers` for worker tests
- Test files: `*.test.ts` or `*.spec.ts`

## Dependencies

### Core Dependencies

- `hono` - Web framework
- `drizzle-orm` - ORM for SQLite/D1
- `better-auth` - Authentication
- `zod` - Schema validation
- `capnweb` - CapnWeb RPC with pipelining

### Dev Dependencies

- `vitest` - Testing
- `tsup` - Building
- `wrangler` - Cloudflare CLI
- `typescript` - Type checking

## Beads Issue Tracking

This project uses Beads for issue tracking:

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status=in_progress  # Claim work
bd close <id>         # Complete work
bd sync --from-main   # Sync with main branch
```

## Important READMEs

- `README.md` - Project overview (the vision)
- `agents/README.md` - AI agents documentation
- `roles/README.md` - Roles documentation
- `humans/README.md` - Human workers documentation
- `teams/README.md` - Teams documentation
- `workflows/README.md` - Workflows documentation
- `ARCHITECTURE.md` - Technical deep-dive

## The Hero

Our hero is a **startup founder** at [startups.studio](https://startups.studio) who wants to:

1. Build a business without hiring a full team
2. Define their startup in code ([Business-as-Code](https://agi.do/business-as-code))
3. Have AI agents deliver services ([Services-as-Software](https://services.as/software))
4. Maintain human oversight for important decisions

**workers.do** gives them an AI team that works like real people. Workers work for them.
