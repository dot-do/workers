# @dotdo/ai

Generative AI primitives for text and object generation.

## Overview

This worker provides high-level generative AI primitives. Unlike `workers/llm` which handles raw model access and billing, `workers/ai` provides structured operations like extraction, summarization, and list generation.

**Binding:** `env.AI`

## Installation

```bash
pnpm add @dotdo/ai
```

## Usage

Access via service binding:

```typescript
// Generate text
const poem = await env.AI.generate('Write a haiku about TypeScript')

// Generate structured data
const data = await env.AI.extract(text, {
  name: 'string',
  email: 'string',
  company: 'string?'
})

// Generate lists
const ideas = await env.AI.list('5 startup ideas for developer tools')

// Summarize
const summary = await env.AI.summarize(longArticle)

// Boolean classification
const isSpam = await env.AI.is(message, 'spam or promotional content')
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "AI",
      "service": "worker-ai"
    }
  ]
}
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.AI.generate(prompt)` |
| REST | `POST /api/generate` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'generate', params: [...] }` |

## Core Primitives

### generate(prompt, options?)

General text or object generation.

```typescript
// Text generation
const text = await env.AI.generate('Explain TypeScript generics')

// Object generation with schema
const data = await env.AI.generate('A fictional user profile', {
  schema: { name: 'string', age: 'number', bio: 'string' }
})
```

### list<T>(prompt, options?)

Generate arrays of items.

```typescript
const ideas = await env.AI.list<string>('5 marketing taglines for a SaaS product')
// ['Tagline 1', 'Tagline 2', ...]

const users = await env.AI.list<{ name: string; role: string }>(
  '3 example team members',
  { schema: { name: 'string', role: 'string' } }
)
```

### lists<T>(prompt, options?)

Generate multiple named arrays (for destructuring).

```typescript
const { pros, cons } = await env.AI.lists<string>(
  'Pros and cons of microservices architecture'
)
```

### extract<T>(text, schema, options?)

Extract structured data from text.

```typescript
const contact = await env.AI.extract(emailBody, {
  senderName: 'string',
  senderEmail: 'string',
  subject: 'string',
  urgency: 'low | medium | high'
})
```

### summarize(text, options?)

Condense text to key points.

```typescript
const summary = await env.AI.summarize(longDocument, {
  length: 'short',  // 'short' | 'medium' | 'long'
  format: 'bullets' // 'paragraph' | 'bullets'
})
```

### is(value, condition, options?)

Boolean classification.

```typescript
const isSpam = await env.AI.is(message, 'spam or promotional')
const isUrgent = await env.AI.is(ticket, 'requires immediate attention')
const isValid = await env.AI.is(code, 'syntactically correct TypeScript')
```

### diagram(description, options?)

Generate diagrams (mermaid, svg).

```typescript
const flowchart = await env.AI.diagram(
  'User authentication flow with OAuth',
  { format: 'mermaid' }
)
```

### slides(topic, options?)

Generate presentation slides.

```typescript
const deck = await env.AI.slides('Introduction to Workers.do', {
  slideCount: 10,
  audience: 'developers'
})
```

## Options

```typescript
interface AIOptions {
  model?: string        // Model to use (default: workers-ai)
  temperature?: number  // 0-2 (default: 0.7)
  maxTokens?: number    // Max output tokens
  stream?: boolean      // Enable streaming
}
```

## Architecture

`workers/ai` is one of four function execution backends:

```
workers/functions (umbrella)
    ├── workers/eval     → Code functions
    ├── workers/ai       → Generative functions (this worker)
    ├── workers/agents   → Agentic functions
    └── workers/humans   → Human functions
```

## Dependencies

- `env.LLM` - Low-level model access (workers/llm)

## Testing

```bash
pnpm test
```

Tests follow TDD pattern:
- RED: Write failing tests first
- GREEN: Implement to pass tests
- REFACTOR: Improve implementation

## License

MIT
