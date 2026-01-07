# startup.games

> Gamified entrepreneurship - test business models, compete, and learn startup skills

Part of the [workers.do](https://workers.do) Autonomous Startup platform.

## Overview

startup.games brings gamification to entrepreneurship. Simulate business models, make strategic decisions, compete on leaderboards, and develop real startup skills in a risk-free environment.

**Why gamify startups?**
- **Learn by doing** - Experience the startup journey without the financial risk
- **Test hypotheses** - Validate business models before committing real resources
- **Build intuition** - Develop pattern recognition for market dynamics
- **Compete & collaborate** - Learn from a community of aspiring founders

## Installation

```bash
npm install startup.games
```

## Quick Start

```typescript
import { games } from 'startup.games'

// Start a SaaS business simulation
const sim = await games.simulate({
  model: 'saas-b2b',
  market: 'developer-tools',
  initialCapital: 50000,
  difficulty: 'normal'
})

// Make decisions
await sim.decide({ action: 'hire', role: 'engineer', salary: 120000 })
await sim.decide({ action: 'build', feature: 'api-v2' })
await sim.decide({ action: 'market', channel: 'content', budget: 5000 })

// Advance time and see results
const results = await sim.advance({ months: 3 })
console.log(`MRR: $${results.state.revenue}`)
console.log(`Customers: ${results.state.customers}`)
console.log(`Score: ${results.score}`)
```

## Features

### Business Simulations

Realistic simulations based on real startup data:

```typescript
// Get available business models
const models = await games.models()
// ['saas-b2b', 'saas-b2c', 'marketplace', 'ecommerce', 'agency', ...]

// Each model has different dynamics
const saas = models.find(m => m.type === 'saas')
console.log(saas.metrics)
// { cac: 500, ltv: 6000, churn: 0.05, margins: 0.8, payback: 6 }
```

### Strategic Decisions

Make the decisions real founders face:

```typescript
// Hiring
await sim.decide({ action: 'hire', role: 'engineer' })
await sim.decide({ action: 'hire', role: 'sales' })

// Product
await sim.decide({ action: 'build', feature: 'integrations' })
await sim.decide({ action: 'launch', feature: 'api-v2' })

// Growth
await sim.decide({ action: 'market', channel: 'paid', budget: 10000 })
await sim.decide({ action: 'market', channel: 'content' })

// Fundraising
await sim.decide({ action: 'raise', amount: 1000000, dilution: 0.15 })

// Pivots
await sim.decide({ action: 'pivot', from: 'b2c', to: 'b2b' })
```

### Dynamic Events

Random events add realism and challenge:

```typescript
const results = await sim.advance({ months: 1 })

for (const event of results.events) {
  if (event.type === 'opportunity') {
    console.log(`Opportunity: ${event.title}`)
    // "A large enterprise wants to become your customer..."
  }

  if (event.type === 'crisis') {
    console.log(`Crisis: ${event.title}`)
    // "Your main competitor just raised $50M..."
  }
}
```

### Challenges & Achievements

Structured learning through challenges:

```typescript
// Get available challenges
const challenges = await games.challenges()

// Attempt a challenge
const result = await games.attemptChallenge('first-100-customers')
if (result.success) {
  console.log(`Earned: ${result.rewards.map(r => r.item).join(', ')}`)
}

// View achievements
const achievements = await games.achievements()
for (const a of achievements) {
  console.log(`${a.icon} ${a.name} - ${a.description}`)
}
```

### Leaderboards

Compete with other aspiring founders:

```typescript
const leaderboard = await games.leaderboard({ period: 'weekly', limit: 10 })

for (const entry of leaderboard.entries) {
  console.log(`#${entry.rank} ${entry.username} - ${entry.score} (${entry.startupName})`)
}
```

## API Reference

### `games.simulate(config)`

Start a new simulation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | `string` | Business model type |
| `market` | `string` | Target market |
| `initialCapital` | `number` | Starting capital (default: 10000) |
| `difficulty` | `string` | 'easy' \| 'normal' \| 'hard' \| 'nightmare' |

### `sim.decide(decision)`

Make a strategic decision.

### `sim.advance({ months })`

Advance the simulation by N months.

### `sim.getMetrics()`

Get current business metrics.

### `games.challenges()`

List available challenges.

### `games.leaderboard(options)`

Get leaderboard rankings.

### `games.achievements(userId?)`

Get achievements for a user.

## Configuration

```typescript
import { Games } from 'startup.games'

const client = Games({
  apiKey: process.env.DO_API_KEY,
  timeout: 60000, // Longer timeout for simulations
})
```

## Part of the Startup Journey

startup.games is part of the workers.do Autonomous Startup platform:

1. **[startups.new](https://startups.new)** - Launch your Autonomous Startup
2. **[startups.studio](https://startups.studio)** - Build and manage your startup
3. **[startup.games](https://startup.games)** - Learn and practice startup skills

## License

MIT
