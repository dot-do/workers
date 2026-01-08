# evals.do

**Know if your AI is actually good.**

```bash
npm install evals.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { evals } from 'evals.do'

// Or use the factory for custom config
import { Evals } from 'evals.do'
const evals = Evals({ baseURL: 'https://custom.example.com' })
```

---

## AI Quality Is a Black Box

You shipped AI features. Users are complaining. But you have no idea what's actually wrong.

Every day you're dealing with:
- Guessing whether outputs are "good enough"
- Regressions slipping through without notice
- No systematic way to test AI behavior
- Anecdotal feedback instead of data
- Fear of changing prompts because you can't measure the impact

**You wouldn't ship code without tests. Why ship AI without evals?**

## What If You Could Measure AI Quality?

```typescript
import { evals } from 'evals.do'

// Describe your quality criteria in plain English
const supportEval = await evals.do`
  Evaluate customer support responses for:
  - Helpfulness (was the question actually answered?)
  - Tone (friendly and professional?)
  - Accuracy (factually correct information?)
`

// Run evaluation on any AI output
const result = await evals.run(supportEval.id, {
  input: 'How do I reset my password?',
  output: 'Click the "Forgot Password" link on the login page...'
})

console.log(`Score: ${result.aggregateScore}/5`)
console.log(`Passed: ${result.passed}`)

// Track quality over time
const report = await evals.report('customer-support', { days: 30 })
console.log(`Pass rate: ${report.passRate * 100}%`)
```

**evals.do** gives you:
- LLM-as-judge evaluation with custom criteria
- Head-to-head comparisons between outputs
- Quality tracking and regression detection
- Systematic testing for AI behavior

## Measure Quality in 3 Steps

### 1. Define Criteria

```typescript
import { evals } from 'evals.do'

// Natural language for quick setup
const eval = await evals.do`
  Evaluate code review comments for:
  - Identifies real bugs (catches actual issues)
  - Constructive tone (helpful, not harsh)
  - Actionable feedback (specific suggestions)
`

// Full control for production
const eval = await evals.create({
  name: 'code-review-quality',
  rubric: {
    scale: { min: 1, max: 5, labels: { 1: 'Poor', 5: 'Excellent' } },
    criteria: [
      { name: 'Bug Detection', description: 'Identifies real issues in the code', weight: 0.4 },
      { name: 'Tone', description: 'Constructive and professional', weight: 0.3 },
      { name: 'Actionability', description: 'Provides specific improvement suggestions', weight: 0.3 }
    ]
  },
  judge: {
    model: 'claude-3-opus',
    reasoning: true
  },
  passThreshold: 3.5
})
```

### 2. Run Evals

```typescript
// Single evaluation
const result = await evals.run('code-review-quality', {
  input: { code: pullRequest.diff, description: pullRequest.body },
  output: aiReviewComment
})

if (!result.passed) {
  console.log('Quality issue:', result.reasoning)
  // Don't post low-quality reviews
}

// Batch evaluation
const batch = await evals.batch('code-review-quality', {
  dataset: testCases,
  parallel: true
})

console.log(`${batch.summary.passed}/${batch.summary.total} passed`)

// Compare models head-to-head
const comparison = await evals.compare('code-review-quality', {
  input: pullRequest,
  outputA: gpt4Response,
  outputB: claudeResponse
})

console.log(`Winner: ${comparison.winner}`)
```

### 3. Track Quality

```typescript
// Generate quality report
const report = await evals.report('code-review-quality', {
  days: 30,
  groupBy: 'day'
})

console.log(`Average score: ${report.averageScore}`)
console.log(`Pass rate: ${(report.passRate * 100).toFixed(1)}%`)

// Check for regressions
if (report.regressions.length > 0) {
  console.log('Quality regressions detected:')
  for (const regression of report.regressions) {
    console.log(`  ${regression.criterionId}: ${regression.changePercent}% drop`)
  }
}

// Per-criterion breakdown
for (const criterion of report.criteriaAverages) {
  console.log(`${criterion.criterionName}: ${criterion.average} (${criterion.trend})`)
}
```

## The Difference

**Without evals.do:**
- "I think the AI is getting worse?"
- Ship prompt changes and pray
- User complaints are your only signal
- No idea which criteria are failing
- Regressions discovered in production
- Quality is vibes, not metrics

**With evals.do:**
- Quantified quality scores
- Test changes before shipping
- Data-driven quality tracking
- Per-criterion breakdown
- Regressions caught in CI
- Quality is measured, not guessed

## Everything You Need

```typescript
// Custom judge configuration
const judge = await evals.judge('strict-reviewer', {
  model: 'claude-3-opus',
  systemPrompt: 'You are a strict but fair quality evaluator...',
  reasoning: true,
  temperature: 0
})

// Reusable rubrics
const rubric = await evals.rubric('5-star-quality', {
  scale: { min: 1, max: 5, labels: { 1: 'Poor', 3: 'Acceptable', 5: 'Excellent' } },
  criteria: [
    {
      name: 'Accuracy',
      description: 'Factually correct and reliable',
      weight: 0.5,
      examples: [
        { score: 1, text: 'Contains false information', explanation: 'Made up facts' },
        { score: 5, text: 'All claims are verifiable', explanation: 'Accurate and sourced' }
      ]
    }
  ]
})

// Stream results in real-time
for await (const result of evals.stream('nightly-eval-run')) {
  console.log(`${result.id}: ${result.passed ? 'PASS' : 'FAIL'} (${result.aggregateScore})`)
}

// Filter and analyze results
const failures = await evals.results('customer-support', {
  passed: false,
  days: 7,
  limit: 100
})
```

## Score Scale

| Score | Label | Description |
|-------|-------|-------------|
| 5 | Excellent | Exceeds expectations in every way |
| 4 | Good | Meets expectations with minor issues |
| 3 | Acceptable | Meets minimum requirements |
| 2 | Poor | Below expectations, needs improvement |
| 1 | Failing | Does not meet requirements |

## Configuration

```typescript
// Workers - import env adapter for automatic env resolution
import 'rpc.do/env'
import { evals } from 'evals.do'

// Or use factory with custom config
import { Evals } from 'evals.do'
const customEvals = Evals({
  baseURL: 'https://custom.example.com'
})
// API key resolved automatically from EVALS_API_KEY or DO_API_KEY
```

Set `EVALS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Guessing About AI Quality

You measure everything else. Response times. Error rates. Conversion. Why leave AI quality to chance?

**Test your AI like you test your code.**

```bash
npm install evals.do
```

[Start measuring at evals.do](https://evals.do)

---

MIT License
