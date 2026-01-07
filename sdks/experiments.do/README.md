# experiments.do

**Test everything. Know what works.**

```bash
npm install experiments.do
```

---

## You're Shipping Blind

Every feature you launch is a gamble. Every design change is a guess. You ship, you hope, you move on.

But without experimentation:
- You don't know which features actually drive growth
- Design decisions become arguments, not data
- Rollouts are all-or-nothing coin flips
- Feature flags sprawl across your codebase with no cleanup
- You can't prove ROI on anything you build

**Your intuition isn't good enough. Neither is anyone else's.**

## What If You Could Know?

```typescript
import { experiments } from 'experiments.do'

// Describe what you want to test
const exp = await experiments.do`
  Test whether showing social proof "Join 10,000+ users"
  increases signup conversions compared to no social proof
`

// Assign users deterministically
const { variant } = await experiments.assign('social-proof', userId)
if (variant.name === 'with-social-proof') {
  showSocialProof()
}

// Track what matters
await experiments.track('social-proof', userId, 'signed_up')

// Know when you have a winner
const results = await experiments.results('social-proof')
console.log(results.winner)     // 'with-social-proof'
console.log(results.lift)       // 23.5 (percentage improvement)
console.log(results.confidence) // 0.95
```

**experiments.do** gives you:
- Statistical rigor without a PhD
- Deterministic user assignment (same user = same variant)
- Real-time results with significance testing
- Gradual rollouts when you have a winner
- Automatic cleanup when experiments conclude

## Experiment in 3 Steps

### 1. Create Your Experiment

```typescript
import { experiments } from 'experiments.do'

// Natural language for quick tests
const quick = await experiments.do`
  Test green vs blue checkout button for conversion rate
`

// Full control for complex experiments
const detailed = await experiments.create({
  name: 'pricing-page-v2',
  hypothesis: 'Showing annual savings will increase annual plan selection',
  variants: [
    { name: 'control', isControl: true, weight: 50, config: { showSavings: false } },
    { name: 'show-savings', isControl: false, weight: 50, config: { showSavings: true } }
  ],
  primaryMetric: 'annual_plan_selected',
  trafficAllocation: 100
})

// Start the experiment
await experiments.start('pricing-page-v2')
```

### 2. Assign Users and Track Results

```typescript
// Assign user to variant (deterministic - same user always gets same variant)
const { variant } = await experiments.assign('pricing-page-v2', userId, {
  country: user.country,
  plan: user.currentPlan
})

// Use the variant configuration
if (variant.config.showSavings) {
  displayAnnualSavings()
}

// Track conversions
await experiments.track('pricing-page-v2', userId, 'annual_plan_selected', {
  value: 199.99 // For revenue tracking
})

// Batch track for efficiency
await experiments.trackBatch([
  { experiment: 'pricing-page-v2', userId, metric: 'page_viewed' },
  { experiment: 'pricing-page-v2', userId, metric: 'cta_clicked' }
])
```

### 3. Analyze and Roll Out

```typescript
// Get results with statistical analysis
const results = await experiments.results('pricing-page-v2')

console.log(results.isSignificant)      // true
console.log(results.winner)              // 'show-savings'
console.log(results.lift)                // 18.3 (percentage)
console.log(results.confidence)          // 0.97
console.log(results.recommendedAction)   // 'conclude'

// Conclude and record winner
await experiments.conclude('pricing-page-v2', {
  winner: 'show-savings',
  notes: 'Annual savings display increased annual plan selection by 18%'
})

// Gradual rollout to all users
await experiments.rollout('pricing-page-v2', 'show-savings', { percentage: 25 })
await experiments.rollout('pricing-page-v2', 'show-savings', { percentage: 50 })
await experiments.rollout('pricing-page-v2', 'show-savings', { percentage: 100 })
```

## The Difference

**Without experiments.do:**
- Ship features and hope they work
- Design by committee and opinion
- All-or-nothing launches that terrify everyone
- Feature flags everywhere with no way to clean up
- No data to justify roadmap decisions
- Arguments instead of evidence

**With experiments.do:**
- Ship features and know they work
- Design by data and evidence
- Gradual rollouts with instant rollback
- Experiments that auto-conclude and clean up
- Data to prove every decision
- Evidence instead of arguments

## Everything You Need

```typescript
// Segment targeting
await experiments.createSegment({
  name: 'enterprise-users',
  rules: [
    { attribute: 'plan', operator: 'eq', value: 'enterprise' }
  ]
})

const exp = await experiments.create({
  name: 'enterprise-onboarding',
  segments: [{ name: 'enterprise-users', rules: [...] }],
  // ...
})

// Multiple metrics
await experiments.create({
  name: 'checkout-flow',
  primaryMetric: 'purchase_completed',
  metrics: ['purchase_completed', 'revenue', 'cart_abandonment', 'time_to_purchase'],
  // ...
})

// Get detailed metrics
const metrics = await experiments.metrics('checkout-flow', {
  variant: 'streamlined',
  metric: 'revenue'
})

// Check rollout status
const status = await experiments.rolloutStatus('checkout-flow')
console.log(status) // { variant: 'streamlined', percentage: 75 }

// List running experiments
const running = await experiments.list({ status: 'running' })
```

## Experiment States

| Status | Description |
|--------|-------------|
| `draft` | Experiment created but not yet started |
| `running` | Experiment is active and assigning users |
| `paused` | Experiment paused, no new assignments |
| `concluded` | Experiment finished, winner recorded |

## Configuration

```typescript
import { Experiments } from 'experiments.do'

const experiments = Experiments({
  apiKey: process.env.EXPERIMENTS_API_KEY
})
```

Or set `EXPERIMENTS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Guessing

Every feature launch should be an experiment. Every design change should be measured. Every decision should be data-driven.

**The difference between companies that grow and companies that guess is experimentation.**

```bash
npm install experiments.do
```

[Start experimenting at experiments.do](https://experiments.do)

---

MIT License
