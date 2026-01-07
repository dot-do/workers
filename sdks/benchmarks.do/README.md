# benchmarks.do

**Measure what matters. Objectively.**

```bash
npm install benchmarks.do
```

---

## AI Claims Are Everywhere. Proof Isn't.

Every AI model claims to be "state of the art." Every press release touts "breakthrough performance." Every vendor says they're the best.

But when you try to compare:
- Marketing numbers don't match reality
- Different models tested on different subsets
- Results from six months ago are already stale
- No way to verify claims on your actual use case
- Benchmark confusion: MMLU vs MMLU-Pro vs MMLU-Redux?

**You're making million-dollar decisions based on vibes and press releases.**

## What If You Could Just Know?

```typescript
import benchmarks from 'benchmarks.do'

// Describe what you want to compare
const results = await benchmarks.do`
  Compare Claude, GPT-4, and Gemini on
  coding, math, and reasoning tasks
`

// Or run specific benchmarks
const humaneval = await benchmarks.run('HumanEval', {
  model: 'claude-3-opus',
})

// Get the definitive leaderboard
const leaders = await benchmarks.leaderboard('MMLU')
```

**benchmarks.do** gives you:
- Industry-standard benchmarks you can trust
- Real-time evaluation on any model
- Apples-to-apples comparisons
- Verified, reproducible results
- Custom benchmarks for your domain

## Compare in 3 Steps

### 1. Choose Your Benchmark

```typescript
import benchmarks from 'benchmarks.do'

// List all available benchmarks
const all = await benchmarks.list()

// Filter by category
const coding = await benchmarks.list({ category: 'coding' })
// HumanEval, HumanEval+, MBPP, SWE-Bench, LiveCodeBench

const math = await benchmarks.list({ category: 'math' })
// GSM8K, MATH, AIME

const reasoning = await benchmarks.list({ category: 'reasoning' })
// MMLU, ARC-Challenge, HellaSwag, BIG-Bench-Hard
```

### 2. Run Your Model

```typescript
// Run a single benchmark
const run = await benchmarks.run('HumanEval', {
  model: 'claude-3-opus',
  temperature: 0,
})

// Check progress
const status = await benchmarks.status(run.id)
console.log(`${status.progress.percentage}% complete`)

// Get results when done
const results = await benchmarks.results(run.id)
console.log(`Pass@1: ${results.scores[0].value}`)
```

### 3. Compare Results

```typescript
// Compare across models
const comparison = await benchmarks.compare(
  ['claude-3-opus', 'gpt-4-turbo', 'gemini-ultra'],
  ['HumanEval', 'MMLU', 'GSM8K']
)

for (const result of comparison) {
  console.log(`\n${result.benchmark} (${result.metric}):`)
  for (const model of result.models) {
    console.log(`  ${model.rank}. ${model.model}: ${model.score}`)
  }
}

// Or check the leaderboard
const leaders = await benchmarks.leaderboard('HumanEval', {
  limit: 10,
  verified: true,
})
```

## The Difference

**Without benchmarks.do:**
- Trust vendor marketing
- Compare incompatible numbers
- Test on toy examples
- Make decisions on gut feel
- Discover problems in production
- Regret your model choice

**With benchmarks.do:**
- Trust verified results
- Compare apples to apples
- Test on industry standards
- Make decisions on data
- Discover capabilities before deploying
- Choose the right model for the job

## Available Benchmarks

| Benchmark | Category | What It Measures |
|-----------|----------|------------------|
| `MMLU` | Knowledge | General knowledge across 57 subjects |
| `MMLU-Pro` | Knowledge | Harder MMLU with expert-level questions |
| `HumanEval` | Coding | Python code generation (164 problems) |
| `HumanEval+` | Coding | Extended HumanEval with more tests |
| `MBPP` | Coding | Mostly Basic Python Problems |
| `SWE-Bench` | Coding | Real-world software engineering |
| `GSM8K` | Math | Grade school math word problems |
| `MATH` | Math | Competition-level math |
| `AIME` | Math | Math olympiad problems |
| `ARC-Challenge` | Reasoning | Science reasoning (hard) |
| `HellaSwag` | Reasoning | Commonsense reasoning |
| `BIG-Bench-Hard` | Reasoning | Challenging diverse tasks |
| `TruthfulQA` | Safety | Truthfulness and factuality |
| `MT-Bench` | Chat | Multi-turn conversation quality |
| `AlpacaEval` | Chat | Instruction following |

## Custom Benchmarks

Create benchmarks for your specific domain:

```typescript
const myBench = await benchmarks.create({
  name: 'LegalQA',
  description: 'Legal reasoning benchmark',
  category: 'knowledge',
  tasks: [
    {
      prompt: 'What is the statute of limitations for breach of contract in California?',
      expectedOutput: '4 years under CCP 337',
    },
    {
      prompt: 'Define consideration in contract law',
      expectedOutput: 'Bargained-for exchange of value...',
    },
    // ... more tasks
  ],
  metrics: ['accuracy', 'f1'],
})

// Run your custom benchmark
const run = await benchmarks.run('LegalQA', {
  model: 'claude-3-opus',
})
```

## Real-Time Streaming

Watch benchmark runs in real-time:

```typescript
const run = await benchmarks.run('MMLU', { model: 'gpt-4-turbo' })

for await (const event of benchmarks.stream(run.id)) {
  switch (event.type) {
    case 'progress':
      console.log(`Progress: ${event.data.percentage}%`)
      break
    case 'task':
      console.log(`Completed: ${event.data.taskId}`)
      break
    case 'score':
      console.log(`Score update: ${event.data.metric} = ${event.data.value}`)
      break
    case 'complete':
      console.log('Benchmark complete!')
      break
  }
}
```

## Configuration

```typescript
import { Benchmarks } from 'benchmarks.do'

const benchmarks = Benchmarks({
  apiKey: process.env.BENCHMARKS_API_KEY,
})
```

Or set `BENCHMARKS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Guessing. Start Measuring.

The AI landscape changes weekly. Don't rely on outdated benchmarks or marketing claims. Run real evaluations, get real numbers, make real decisions.

**Your model choice is too important to leave to chance.**

```bash
npm install benchmarks.do
```

[Start measuring at benchmarks.do](https://benchmarks.do)

---

MIT License
