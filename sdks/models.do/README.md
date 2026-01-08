# models.do

**Pick the right model. Every time.**

```bash
npm install models.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { models } from 'models.do'

// Or use the factory for custom config
import { Models } from 'models.do'
const models = Models({ baseURL: 'https://custom.example.com' })
```

---

## Lost in a Sea of LLMs

There are hundreds of models now. GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, Mistral Large, Llama 3.1, DeepSeek... and more every week.

Choosing the right one means:
- Hunting through scattered documentation for pricing
- Running your own benchmarks to compare quality
- Guessing at latency and performance characteristics
- No way to know which model fits your specific use case
- Pricing that changes constantly and varies wildly

**You shouldn't need a PhD to pick a model.**

## What If Model Selection Was Simple?

```typescript
import models from 'models.do'

// Just describe what you need
const recommendation = await models.do`
  I need a model for code generation that's fast and affordable
`

// Get instant recommendations
console.log(recommendation.model.id)     // 'claude-3-5-sonnet'
console.log(recommendation.reason)       // 'Best balance of code quality, speed, and cost'
console.log(recommendation.alternatives) // [{ model: 'gpt-4o-mini', ... }]
```

**models.do** gives you:
- Complete catalog of every major LLM
- Real-time pricing from all providers
- Performance benchmarks and comparisons
- AI-powered recommendations for your use case
- Usage tracking and cost estimation

## Find the Perfect Model in 3 Steps

### 1. Browse Models

```typescript
import models from 'models.do'

// Get all models
const all = await models.list()

// Filter by provider
const anthropic = await models.list({ provider: 'anthropic' })

// Filter by use case
const codeModels = await models.list({ task: 'code-generation' })

// Filter by price
const affordable = await models.list({ maxPricePerMillion: 5 })
```

### 2. Compare Options

```typescript
// Side-by-side comparison
const comparison = await models.compare([
  'gpt-4o',
  'claude-3-5-sonnet',
  'gemini-1.5-pro'
])

console.log(comparison.pricing)
// [
//   { modelId: 'gpt-4o', inputPerMillion: 2.50, outputPerMillion: 10.00 },
//   { modelId: 'claude-3-5-sonnet', inputPerMillion: 3.00, outputPerMillion: 15.00 },
//   { modelId: 'gemini-1.5-pro', inputPerMillion: 1.25, outputPerMillion: 5.00 }
// ]

console.log(comparison.benchmarks)
// [
//   { benchmark: 'HumanEval', scores: [...] },
//   { benchmark: 'MMLU', scores: [...] }
// ]
```

### 3. Choose with Confidence

```typescript
// Get a recommendation based on your requirements
const rec = await models.recommend({
  task: 'code-generation',
  budget: 'medium',
  latency: 'low',
  capabilities: ['function-calling', 'streaming']
})

console.log(rec.model.name)    // 'Claude 3.5 Sonnet'
console.log(rec.score)         // 94
console.log(rec.reason)        // 'Excellent code quality with fast response times...'
console.log(rec.tradeoffs)     // ['Slightly higher cost than GPT-4o-mini']
```

## The Difference

**Without models.do:**
- Hours researching pricing across provider websites
- No standardized benchmark comparisons
- Guessing which model fits your use case
- Surprised by costs at the end of the month
- Stuck with the wrong model too long
- Manual tracking of model updates and deprecations

**With models.do:**
- All pricing in one place, always current
- Standardized benchmarks across all models
- AI-powered recommendations for your specific needs
- Accurate cost estimation before you start
- Easy migration when better options emerge
- Automatic notifications for deprecations

## Everything You Need

```typescript
// Get detailed model info
const model = await models.get('claude-3-5-sonnet')
console.log(model.contextWindow)      // { maxInput: 200000, maxOutput: 8192 }
console.log(model.pricing)            // { inputPerMillion: 3.00, outputPerMillion: 15.00 }
console.log(model.capabilities)       // [{ name: 'vision', supported: true }, ...]

// Check pricing for your usage
const pricing = await models.pricing('gpt-4o', {
  inputTokens: 1000000,
  outputTokens: 500000
})
console.log(pricing.estimatedCost)    // 7.50

// Get performance metrics
const perf = await models.performance('claude-3-5-sonnet')
console.log(perf.tokensPerSecond)     // 85
console.log(perf.timeToFirstToken)    // 450

// Track your usage
const usage = await models.usage('gpt-4o', { period: 'month' })
console.log(usage.totalCost)          // 142.50
console.log(usage.requests)           // 15234

// Estimate costs before you commit
const estimate = await models.estimateCost({
  modelId: 'claude-3-opus',
  inputTokens: 10000000,
  outputTokens: 5000000,
  requests: 10000
})
console.log(estimate.totalCost)       // 225.00
console.log(estimate.costPerRequest)  // 0.0225
```

## Supported Providers

| Provider | Models | Highlights |
|----------|--------|------------|
| OpenAI | GPT-4o, GPT-4, GPT-3.5, o1 | Industry standard |
| Anthropic | Claude 3 Opus, Sonnet, Haiku | Best for code |
| Google | Gemini 1.5 Pro, Flash | Long context |
| Mistral | Large, Medium, Small | Open weights |
| Meta | Llama 3.1 405B, 70B, 8B | Fully open |
| Cohere | Command R+ | Enterprise RAG |
| Amazon | Nova, Titan | AWS integration |
| DeepSeek | V2, Coder | Code specialist |
| Groq | LPU inference | Ultra-fast |
| xAI | Grok | Real-time data |

## Configuration

```typescript
// Workers - import env adapter for automatic env resolution
import 'rpc.do/env'
import { models } from 'models.do'

// Or use factory with custom config
import { Models } from 'models.do'
const customModels = Models({
  baseURL: 'https://custom.example.com'
})
// API key resolved automatically from MODELS_API_KEY or DO_API_KEY
```

Set `MODELS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Guessing. Start Shipping.

The model you pick matters. It affects cost, speed, quality, and user experience. Stop leaving it to chance.

**Every model, one API. Real-time data. Confident decisions.**

```bash
npm install models.do
```

[Browse the catalog at models.do](https://models.do)

---

MIT License
