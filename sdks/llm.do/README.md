# llm.do

**Use any AI model. Pay one bill. Sleep at night.**

```bash
npm install llm.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { llm } from 'llm.do'

// Or use the factory for custom config
import { LLM } from 'llm.do'
const llm = LLM({ baseURL: 'https://custom.example.com' })
```

---

## AI Is Eating Your Budget (And Your Time)

You want to build with AI. You know it's the future.

But every provider has different APIs. Different rate limits. Different pricing. Different quirks.

So now you're:
- Juggling API keys for OpenAI, Anthropic, Google, and whoever's hot this week
- Getting surprise bills because you couldn't track usage in real-time
- Hitting rate limits right when your demo goes viral
- Writing adapter code instead of product code
- Explaining to your CFO why AI costs tripled last month

**You started a startup. Not an AI infrastructure company.**

## What If Every AI Model Was One API Call Away?

```typescript
import { llm } from 'llm.do'

const response = await llm.complete({
  model: 'claude-3-opus',
  prompt: 'Write a haiku about shipping fast'
})

// Switch models with one line
const gptResponse = await llm.complete({
  model: 'gpt-4-turbo',
  prompt: 'Write a haiku about shipping fast'
})

// Same API. Same billing. Same peace of mind.
```

**llm.do** is your AI gateway:
- **One API** for Claude, GPT-4, Gemini, and open-source models
- **One bill** with real-time usage tracking
- **One integration** that never changes, no matter what models come next
- **Automatic retries** when providers have issues
- **Built-in rate limiting** so you never get cut off

## Get Started in 3 Steps

### 1. Install

```bash
npm install llm.do
```

### 2. Call Any Model

```typescript
import { llm } from 'llm.do'

// Simple prompt
const result = await llm.complete({
  model: 'claude-3-opus',
  prompt: 'Explain quantum computing to a 5-year-old'
})

// Chat messages
const chat = await llm.chat([
  { role: 'system', content: 'You are a helpful startup advisor.' },
  { role: 'user', content: 'How do I find product-market fit?' }
], { model: 'gpt-4' })
```

### 3. Know Exactly What You're Spending

```typescript
const usage = await llm.usage('my-org', {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
})

console.log(`Total tokens: ${usage.totalTokens}`)
console.log(`Total cost: $${usage.totalCost}`)
console.log(`By model:`, usage.byModel)
// { 'claude-3-opus': { tokens: 50000, cost: 2.50 }, ... }
```

## The Difference Is Night and Day

**Without llm.do:**
- Different SDK for every provider
- Surprise $10K bills at month end
- Rate limited during your biggest demo
- Rewriting code every time you switch models
- No idea which model is actually cost-effective

**With llm.do:**
- One SDK, every model
- Real-time cost tracking with alerts
- Automatic failover when providers hiccup
- Switch models in one line of code
- Analytics showing cost per feature, per user, per anything

## Built for Production

```typescript
import { llm, LLM } from 'llm.do'

// Stream responses for real-time UX
const stream = await llm.stream({
  model: 'claude-3-sonnet',
  prompt: 'Write me a business plan...',
  stream: true
})

for await (const chunk of stream) {
  process.stdout.write(chunk)
}

// Custom configuration for enterprise needs
const myLLM = LLM({
  timeout: 60000,
  retry: {
    attempts: 5,
    delay: 2000,
    backoff: 'exponential'
  }
})
// API key resolved automatically via rpc.do/env

// See what models are available
const models = await llm.models()
// ['claude-3-opus', 'claude-3-sonnet', 'gpt-4', 'gpt-4-turbo', 'gemini-pro', ...]
```

## Error Handling

Handle errors gracefully with typed exceptions:

```typescript
import { llm } from 'llm.do'
import { RPCError } from 'rpc.do'

try {
  const result = await llm.complete({
    model: 'claude-3-opus',
    prompt: 'Generate a response'
  })
} catch (error) {
  if (error instanceof RPCError) {
    switch (error.code) {
      case 401:
        console.error('Invalid API key')
        break
      case 429:
        console.error('Rate limited - try again later')
        break
      case 503:
        console.error('Model temporarily unavailable')
        break
      default:
        console.error(`LLM error ${error.code}: ${error.message}`)
    }
  }
  throw error
}
```

### Common Error Codes

| Code | Meaning | What to Do |
|------|---------|------------|
| 400 | Invalid request | Check your prompt and parameters |
| 401 | Authentication failed | Verify your API key is correct |
| 403 | Access denied | Check your plan supports this model |
| 429 | Rate limited | Wait and retry with exponential backoff |
| 500 | Server error | Retry after a brief delay |
| 503 | Model unavailable | Try a different model or retry later |

### Graceful Degradation

```typescript
import { llm } from 'llm.do'
import { RPCError } from 'rpc.do'

async function generateWithFallback(prompt: string) {
  const models = ['claude-3-opus', 'gpt-4', 'claude-3-sonnet']

  for (const model of models) {
    try {
      return await llm.complete({ model, prompt })
    } catch (error) {
      if (error instanceof RPCError && error.code === 503) {
        console.log(`${model} unavailable, trying next...`)
        continue
      }
      throw error
    }
  }
  throw new Error('All models unavailable')
}
```

### Retry Configuration

```typescript
import { LLM } from 'llm.do'

const llm = LLM({
  retry: {
    attempts: 5,        // Max retry attempts
    delay: 1000,        // Initial delay in ms
    backoff: 'exponential'  // 1s, 2s, 4s, 8s, 16s
  },
  timeout: 60000  // Request timeout in ms
})
```

## Your AI Strategy, Simplified

New models launch every week. Pricing changes constantly. Providers have outages.

**You shouldn't have to rewrite your app every time the AI landscape shifts.**

With llm.do, you're model-agnostic by default. When the next breakthrough model drops, you're one config change away from using it. When a provider has issues, we route around them automatically.

**Focus on building your product. We'll handle the AI plumbing.**

```bash
npm install llm.do
```

[Start building at llm.do](https://llm.do)

---

MIT License
