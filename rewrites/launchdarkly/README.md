# launchdarkly.do

> Feature Flags and Experiments. Edge-Native. Natural Language. AI-First.

LaunchDarkly charges $1M+ annually for feature flags. Evaluations happen in their data centers. Experiments require a PhD to analyze. Configuration sprawls across dashboards.

**launchdarkly.do** is the open-source alternative. Sub-millisecond evaluation at the edge. Natural language flag definitions. AI-powered experiment analysis. Deploy in minutes, not months.

## AI-Native API

```typescript
import { flags } from 'launchdarkly.do'       // Full SDK
import { flags } from 'launchdarkly.do/tiny'  // Minimal client
import { experiments } from 'experiments.do'   // Experiments only
```

Natural language for feature flags:

```typescript
import { flags, experiments } from 'launchdarkly.do'

// Talk to it like a colleague
const enabled = await flags`dark mode for ${user}`
const variant = await flags`checkout flow for pro users`
const config = await flags`pricing tier for enterprise`

// Experiments as questions
const results = await experiments`checkout redesign winning?`
const analysis = await experiments`which button color converts better?`

// Chain like sentences
await flags`new onboarding for trial users`
  .track(`completed signup`)
  .analyze()
```

## The Problem

LaunchDarkly dominates feature flag management:

| What LaunchDarkly Charges | The Reality |
|---------------------------|-------------|
| **Enterprise Plan** | $1M+/year |
| **Per MAU** | $0.02-0.10 per user |
| **Experimentation** | Additional premium |
| **Evaluation Latency** | 50-200ms from their DC |
| **Configuration** | Complex JSON rules |
| **Analysis** | Stats degree required |

### The Latency Tax

Every feature flag evaluation:
- Request leaves the edge
- Travels to LaunchDarkly's data center
- Gets evaluated against rules
- Returns to your application

50-200ms per flag. Multiply by flags per request. Multiply by requests per second. That's your latency tax.

### The Configuration Sprawl

```json
{
  "key": "new-checkout",
  "rules": [{
    "clauses": [{
      "attribute": "plan",
      "op": "in",
      "values": ["pro", "enterprise"]
    }],
    "variation": 1
  }]
}
```

This should be: `pro and enterprise users get new checkout`

### The Analysis Gap

Experiment results come as p-values and confidence intervals. PMs don't know if 0.03 is good. Engineers don't know when to call it.

## The Solution

**launchdarkly.do** reimagines feature flags:

```
LaunchDarkly                        launchdarkly.do
-----------------------------------------------------------------
$1M+/year                           $0 - run your own
50-200ms latency                    <1ms at edge
Complex JSON rules                  Natural language
Stats PhD required                  AI explains results
Dashboard sprawl                    Code-first
Central evaluation                  Edge-native
```

## One-Click Deploy

```bash
npx create-dotdo launchdarkly
```

Feature flags at the edge. Running on infrastructure you control.

```typescript
import { LaunchDarkly } from 'launchdarkly.do'

export default LaunchDarkly({
  name: 'my-app',
  domain: 'flags.my-app.com',
})
```

## Features

### Boolean Flags

```typescript
// Just ask
const enabled = await flags`dark mode for ${user}`
const beta = await flags`beta features enabled?`
const premium = await flags`is premium user?`

// AI infers what you need
await flags`dark mode`              // returns boolean
await flags`dark mode for ${user}`  // evaluates for user
await flags`who has dark mode?`     // returns user list
```

### Multivariate Flags

```typescript
// Variations as natural language
const flow = await flags`checkout flow version for ${user}`
const tier = await flags`pricing tier for enterprise`
const layout = await flags`dashboard layout for mobile`

// AI returns the right type
// String: 'single-page' | 'multi-step' | 'express'
// Config: { columns: 2, showSidebar: true }
```

### Targeting

```typescript
// Natural as describing who gets what
await flags`new checkout for pro and enterprise users`
await flags`dark mode for US and Canada`
await flags`beta features for @corp.com emails`

// Percentage rollouts
await flags`new onboarding for 50% of trial users`
await flags`gradual rollout: 10% today, 50% next week, 100% in March`

// Segments read like descriptions
await flags`power users get advanced dashboard`
await flags`churning users get retention offer`
```

### Experiments

```typescript
// Run experiments as questions
const variant = await experiments`checkout redesign for ${user}`
  .track(`completed purchase`)

// Ask for results naturally
const results = await experiments`is checkout redesign winning?`
// "Treatment is winning with 92% confidence. 20% uplift in conversions."

// AI explains what the stats mean
const analysis = await experiments`explain checkout redesign results`
// "The new checkout increased conversions from 3% to 3.6%.
//  We're 92% confident this is real, not random chance.
//  Expected revenue impact: $45,000/month."

// Compare anything
await experiments`which button color converts better: red or blue?`
await experiments`single-page vs multi-step checkout?`
```

### Metrics

```typescript
// Track events naturally
await flags`dark mode for ${user}`
  .track(`clicked settings`)
  .track(`toggled theme`)

// Conversion tracking
await experiments`checkout redesign for ${user}`
  .track(`viewed cart`)
  .track(`started checkout`)
  .track(`completed purchase`, { value: 99.99 })

// Funnel analysis
await experiments`checkout funnel for redesign experiment`
// Returns drop-off at each step with significance
```

### Real-time Updates

```typescript
// Subscribe to flag changes
await flags`dark mode`.onChange(value => {
  console.log('Dark mode changed:', value)
})

// Or use streams
const stream = await flags`stream all changes`
for await (const change of stream) {
  console.log(`${change.flag} is now ${change.value}`)
}
```

## Architecture

```
                    +-----------------------+
                    |   launchdarkly.do     |
                    |   (Cloudflare Worker) |
                    +-----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | FlagEvaluatorDO  | |   ExperimentDO   | |   StreamingDO    |
    |  SQLite + KV     | |  SQLite + Stats  | |  WebSocket/SSE   |
    +------------------+ +------------------+ +------------------+
```

### Durable Object per Flag Namespace

```
FlagNamespaceDO (config, segments, audit)
  |
  +-- FlagsDO (flag definitions, targeting rules)
  |     |-- SQLite: Flag configs
  |     +-- KV: Hot cache for evaluation
  |
  +-- ExperimentsDO (experiments, exposures, conversions)
  |     |-- SQLite: Assignment log
  |     +-- Analytics: Metrics aggregation
  |
  +-- StreamingDO (real-time distribution)
        |-- WebSocket: Live updates
        +-- SSE: Fallback streaming
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | KV | Active flags, current experiments | <1ms |
| **Warm** | SQLite | Assignment logs, recent metrics | <10ms |
| **Cold** | R2 | Audit history, archived experiments | <100ms |

## vs LaunchDarkly

| Feature | LaunchDarkly | launchdarkly.do |
|---------|--------------|-----------------|
| **Annual Cost** | $1M+ Enterprise | ~$10/month |
| **Evaluation Latency** | 50-200ms | <1ms |
| **Configuration** | JSON rules, dashboards | Natural language |
| **Experiment Analysis** | Stats tables | AI explanations |
| **Data Location** | Their data centers | Your Cloudflare account |
| **Real-time Updates** | Seconds | <100ms |
| **Customization** | Limited SDK hooks | Code it yourself |
| **Lock-in** | Proprietary format | Open source, MIT licensed |

## AI-Native Experimentation

### Natural Language Results

Instead of:
```
p-value: 0.023
confidence interval: [0.012, 0.048]
relative uplift: 20.1%
sample ratio: 0.498
```

You get:
```typescript
await experiments`explain checkout redesign results`
// "The redesign is working. Conversions went from 3% to 3.6%.
//  We're 97.7% confident this is real improvement.
//  If we roll out to everyone, expect ~$45K more revenue monthly.
//  Recommendation: Ship it."
```

### Automatic Stopping

```typescript
// AI knows when to call it
await experiments`checkout redesign`
  .stopWhen(`95% confident`)
  .notify(`results are in`)

// Or ask
await experiments`should we stop the checkout experiment?`
// "Not yet. We're at 87% confidence. Need ~3 more days of data."
```

### Segment Discovery

```typescript
// Find who benefits most
await experiments`who responds best to checkout redesign?`
// "Mobile users on iOS see 40% uplift vs 15% for desktop.
//  Pro users see 25% uplift vs 10% for free users.
//  Recommendation: Prioritize mobile rollout."
```

## Deployment Options

### Cloudflare Workers

```bash
npx create-dotdo launchdarkly
```

### Self-Hosted

```bash
# Docker
docker run -p 8787:8787 dotdo/launchdarkly

# Kubernetes
kubectl apply -f launchdarkly-do.yaml
```

## The Rewrites Ecosystem

launchdarkly.do is part of the rewrites family:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| **launchdarkly.do** | LaunchDarkly | Feature flags for AI |
| [kafka.do](https://kafka.do) | Kafka | Event streaming for AI |

## Why Durable Objects?

1. **Edge Evaluation** - Flags evaluated at nearest PoP, <1ms
2. **Consistent Bucketing** - Deterministic hashing, no race conditions
3. **Real-time Updates** - WebSocket hibernation for efficient streaming
4. **SQLite Storage** - Fast flag lookups, experiment metrics
5. **Global Scale** - Millions of concurrent evaluations

## Roadmap

### Core Flags
- [x] Boolean flags
- [x] Multivariate flags
- [x] Percentage rollouts
- [x] User targeting
- [x] Segment targeting
- [ ] Scheduled flags
- [ ] Flag dependencies

### Experiments
- [x] A/B testing
- [x] Multivariate testing
- [x] Bayesian analysis
- [x] Frequentist analysis
- [x] AI result explanations
- [ ] Multi-armed bandits
- [ ] Automatic stopping rules

### Platform
- [x] Real-time streaming
- [x] Audit logging
- [x] KV caching
- [ ] OpenFeature provider
- [ ] LaunchDarkly migration tool

## License

MIT License - Feature flags for everyone.

---

<p align="center">
  <strong>The $1M/year feature flag ends here.</strong>
  <br />
  Edge-native. Natural language. AI-first.
  <br /><br />
  <a href="https://launchdarkly.do">Website</a> |
  <a href="https://docs.launchdarkly.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/launchdarkly.do">GitHub</a>
</p>
