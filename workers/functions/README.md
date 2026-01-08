# @dotdo/functions

AI-powered function definition and execution platform.

## Overview

`workers/functions` is the unified entry point for defining and invoking functions. It auto-classifies functions into four types and delegates execution to specialized workers.

**Binding:** `env.FUNCTIONS`

## Installation

```bash
pnpm add @dotdo/functions
```

## Architecture

```
workers/functions (this worker)
    ├── workers/eval     → Code functions (env.EVAL)
    ├── workers/ai       → Generative functions (env.AI)
    ├── workers/agents   → Agentic functions (env.AGENTS)
    └── workers/humans   → Human functions (env.HUMANS)
```

## Function Types

| Type | Description | Worker | Example |
|------|-------------|--------|---------|
| **Code** | Pure computation, data transformation | workers/eval | `fibonacci(10)` |
| **Generative** | AI text/object generation, single-step | workers/ai | `summarize(text)` |
| **Agentic** | Multi-step AI with tools and memory | workers/agents | `researchCompetitor(name)` |
| **Human** | Requires human approval/input | workers/humans | `approveExpense(amount)` |

## Usage

### Auto-Classification

The simplest way - AI determines the function type:

```typescript
// AI analyzes name and args to determine type
const fn = await env.FUNCTIONS.define('summarizeArticle', {
  text: 'Long article content...'
})
// → Classified as 'generative', stored, ready to invoke

const result = await env.FUNCTIONS.invoke('summarizeArticle', {
  text: actualArticle
})
```

### Explicit Type Definition

For precise control, specify the type:

```typescript
// Code function - pure computation
await env.FUNCTIONS.define.code({
  name: 'calculateTax',
  code: `export default ({ income, rate }) => income * rate`
})

// Generative function - AI generation
await env.FUNCTIONS.define.generative({
  name: 'writeEmail',
  prompt: 'Write a professional email: {{subject}}',
  output: { subject: 'string', body: 'string' }
})

// Agentic function - multi-step AI with tools
await env.FUNCTIONS.define.agentic({
  name: 'planTrip',
  goal: 'Create a complete travel itinerary',
  tools: ['flights', 'hotels', 'maps', 'weather']
})

// Human function - requires human input
await env.FUNCTIONS.define.human({
  name: 'approveRefund',
  channel: 'slack',
  assignee: '@finance-team',
  timeout: '24h'
})
```

### Invocation

All function types are invoked the same way:

```typescript
const result = await env.FUNCTIONS.invoke('functionName', params)
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    { "binding": "FUNCTIONS", "service": "worker-functions" },
    { "binding": "EVAL", "service": "worker-eval" },
    { "binding": "AI", "service": "worker-ai" },
    { "binding": "AGENTS", "service": "worker-agents" },
    { "binding": "HUMANS", "service": "worker-humans" }
  ]
}
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.FUNCTIONS.invoke(name, params)` |
| REST | `POST /api/functions/:name/invoke` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'invoke', params: [...] }` |

## Core Methods

### define(name, exampleArgs?)

Define a function with auto-classification.

```typescript
await env.FUNCTIONS.define('analyzeData', { data: [1, 2, 3] })
```

### define.code(options)

Define a code function.

```typescript
await env.FUNCTIONS.define.code({
  name: 'processArray',
  code: 'export default (arr) => arr.map(x => x * 2)',
  runtime: 'v8'
})
```

### define.generative(options)

Define a generative function.

```typescript
await env.FUNCTIONS.define.generative({
  name: 'generateBio',
  prompt: 'Write a professional bio for {{name}} who works as {{role}}',
  output: 'string'
})
```

### define.agentic(options)

Define an agentic function.

```typescript
await env.FUNCTIONS.define.agentic({
  name: 'researchTopic',
  goal: 'Comprehensive research report',
  tools: ['web-search', 'summarize', 'cite'],
  memory: true
})
```

### define.human(options)

Define a human function.

```typescript
await env.FUNCTIONS.define.human({
  name: 'reviewContract',
  channel: 'email',
  assignee: 'legal@company.com',
  timeout: '48h',
  escalation: 'ceo@company.com'
})
```

### invoke(name, params)

Invoke any function by name.

```typescript
const result = await env.FUNCTIONS.invoke('functionName', {
  param1: 'value1'
})
```

### list(options?)

List defined functions.

```typescript
const fns = await env.FUNCTIONS.list({ type: 'generative' })
```

### get(name)

Get function definition.

```typescript
const fn = await env.FUNCTIONS.get('myFunction')
```

### delete(name)

Delete a function.

```typescript
await env.FUNCTIONS.delete('oldFunction')
```

## Classification Logic

When using `define()` without explicit type, AI analyzes:

1. **Function name** - Semantic meaning
2. **Example arguments** - Data structure and content
3. **Inferred intent** - What operation is needed

Classification rules:
- **Code**: Pure data transformation, math, no AI needed
- **Generative**: Single AI call for content generation
- **Agentic**: Multiple steps, tools, web access, memory
- **Human**: Approval, review, decision, sensitive operations

## Testing

```bash
pnpm test
```

## License

MIT
