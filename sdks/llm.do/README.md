# llm.do

AI Gateway SDK - Multi-model LLM access with metering, billing, and analytics.

## Installation

```bash
npm install llm.do
```

## Quick Start

```typescript
import { llm } from 'llm.do'

// Simple completion
const response = await llm.complete({
  model: 'claude-3-opus',
  prompt: 'Write a haiku about programming'
})

console.log(response.content)
console.log(`Tokens used: ${response.usage.totalTokens}`)
```

## Features

- **Multi-model** - Claude, GPT-4, Gemini, open source models
- **Usage metering** - Per-token billing integrated with Stripe
- **BYOK** - Bring your own API keys
- **Streaming** - Real-time streaming responses
- **Type-safe** - Full TypeScript support

## Usage

### Chat Completions

```typescript
import { llm } from 'llm.do'

const response = await llm.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
], {
  model: 'gpt-4',
  temperature: 0.7
})
```

### Streaming

```typescript
import { llm } from 'llm.do'

const stream = await llm.stream({
  model: 'claude-3-sonnet',
  prompt: 'Write a story...',
  stream: true
})

for await (const chunk of stream) {
  process.stdout.write(chunk)
}
```

### Custom Configuration

```typescript
import { createLLM } from 'llm.do'

const myLLM = createLLM({
  apiKey: 'your-api-key',
  timeout: 60000,
  retry: {
    attempts: 5,
    delay: 2000,
    backoff: 'exponential'
  }
})
```

### Check Usage

```typescript
import { llm } from 'llm.do'

const usage = await llm.usage('customer-123', {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
})

console.log(`Total tokens: ${usage.totalTokens}`)
console.log(`Total cost: $${usage.totalCost}`)
```

### List Available Models

```typescript
import { llm } from 'llm.do'

const models = await llm.models()
// ['claude-3-opus', 'claude-3-sonnet', 'gpt-4', 'gpt-4-turbo', ...]
```

## Authentication

Set your API key via environment variable:

```bash
export LLM_API_KEY=your-api-key
```

Or pass it directly:

```typescript
import { createLLM } from 'llm.do'
const llm = createLLM({ apiKey: 'your-api-key' })
```

## BYOK (Bring Your Own Key)

Use your own provider API keys (stored securely in id.org.ai Vault):

```typescript
import { llm } from 'llm.do'

// Use customer's own OpenAI key
const response = await llm.complete({
  model: 'gpt-4',
  prompt: '...',
  apiKey: 'customer-openai-key' // Retrieved from Vault
})
```

## Transport

The SDK uses HTTP REST by default. For real-time applications, use WebSocket (CapnWeb):

```typescript
import { createLLM } from 'llm.do'

const llm = createLLM({
  transport: 'websocket' // CapnWeb protocol
})
```

## Error Handling

```typescript
import { llm } from 'llm.do'
import { RPCError } from '@dotdo/rpc-client'

try {
  await llm.complete({ model: 'invalid', prompt: 'test' })
} catch (error) {
  if (error instanceof RPCError) {
    console.error(`RPC Error ${error.code}: ${error.message}`)
  }
}
```

## Related

- [workers.do](https://workers.do) - The platform for Autonomous Startups
- [payments.do](https://payments.do) - Stripe Connect integration
- [id.org.ai](https://id.org.ai) - Auth for AI and Humans
- [services.do](https://services.do) - AI Services Marketplace

## License

MIT
