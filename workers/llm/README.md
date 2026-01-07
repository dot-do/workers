# @dotdo/worker-llm

LLM Gateway with billing and analytics (llm.do).

## Overview

This worker provides unified LLM access with built-in metering, billing, and analytics. It uses Cloudflare AI Gateway for routing, caching, and rate limiting.

## Installation

```bash
pnpm add @dotdo/rpc
```

## Usage

The worker follows the RPC pattern:

```typescript
import { RPC } from 'workers.do/rpc'

const llmAPI = {
  complete: async (options) => { /* AI Gateway routing */ },
  stream: async (options) => { /* Streaming completions */ },
  models: async () => { /* List available models */ },
  usage: async (customerId, period) => { /* Query usage */ }
}

export default RPC(llmAPI)
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "LLM",
      "service": "worker-llm"
    }
  ]
}
```

Access via:

```typescript
this.env.LLM
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.LLM.complete({ model, prompt })` |
| REST | `POST /api/complete` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'complete', params: [...] }` |

## Common Operations

```typescript
// Simple completion - automatically metered and billed
const response = await env.LLM.complete({
  model: 'claude-3-opus',
  prompt: 'Generate a marketing email for...'
})

// Chat completion
const chat = await env.LLM.complete({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ]
})

// Streaming with usage tracking
const stream = await env.LLM.stream({
  model: 'claude-3-sonnet',
  prompt: 'Write a story about...',
  stream: true
})

// Customer brings their own key
const response = await env.LLM.complete({
  model: 'gpt-4',
  prompt: '...',
  apiKey: customer.ownOpenAIKey // Stored in WorkOS Vault or Workers secrets
})

// Get usage for billing
const usage = await env.LLM.usage(customerId, {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
})
```

## Features

### Multi-Model Support

Access all major LLM providers through a unified API:

- **Claude** - claude-3-opus, claude-3-sonnet, claude-3-haiku
- **GPT** - gpt-4, gpt-4-turbo, gpt-3.5-turbo
- **Gemini** - gemini-pro, gemini-ultra
- **Open Source** - Llama, Mistral, etc.

### Usage Metering

Every request is metered and tracked:

```typescript
response.usage = {
  promptTokens: 150,
  completionTokens: 500,
  totalTokens: 650
}
```

Usage is automatically recorded to the analytics pipeline and available in the dashboard.

### Billing Integration

Usage is automatically synced with Stripe:

- Per-token pricing by model
- Usage-based billing records
- Customer invoice integration
- Spend limits and alerts

### BYOK (Bring Your Own Key)

Customers can use their own API keys:

1. Keys stored securely in WorkOS Vault or Workers for Platforms secrets
2. Pass `apiKey` in request to use customer's key
3. Usage still tracked for analytics (but not billed through platform)

### AI Gateway Features

Built on Cloudflare AI Gateway:

- **Caching** - Semantic caching for repeated queries
- **Rate Limiting** - Per-customer rate limits
- **Analytics** - Latency, error rates, model performance
- **Fallbacks** - Automatic model fallbacks on errors

## Analytics Dashboard

The dashboard shows:

- Total tokens by model
- Costs by customer
- Latency percentiles
- Error rates
- Cache hit ratios
- Usage trends over time

## Environment Variables

The worker requires API keys for each provider (platform-level):

- `ANTHROPIC_API_KEY` - Claude access
- `OPENAI_API_KEY` - GPT access
- `GOOGLE_AI_API_KEY` - Gemini access

## Dependencies

- `@dotdo/rpc` workspace:*

## License

MIT
