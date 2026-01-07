# startups.studio

**Build a portfolio of startups. Not a mountain of infrastructure.**

```bash
npm install startups.studio
```

---

## You're Not Building One Startup. You're Building Many.

You're a serial entrepreneur. A venture studio. A builder who sees opportunities everywhere.

But every new idea means:
- Rebuilding the same infrastructure from scratch
- Context-switching between a dozen dashboards
- Inconsistent patterns that slow down every launch
- Wasted weeks on plumbing instead of products
- No unified view of your entire portfolio

**What if you could manage all your startups from a single command?**

## Your Venture Studio, Automated

```typescript
import { studio } from 'startups.studio'

// See your entire empire at a glance
const portfolio = await studio.portfolio()
console.log(`Managing ${portfolio.stats.totalStartups} startups`)
console.log(`Total MRR: $${portfolio.stats.totalMRR}`)
console.log(`Portfolio uptime: ${portfolio.stats.avgUptime}%`)

// Deploy to any startup in seconds
await studio.deploy('new-venture', {
  code: latestBuild,
  message: 'Launch v2.0'
})
```

**startups.studio** is the control center for your Autonomous Startup portfolio:
- Unified dashboard across all your ventures
- Deploy, monitor, and scale from one place
- Shared infrastructure, unique businesses
- Portfolio-wide analytics and health checks

## Build Your Empire in 3 Steps

### 1. Connect Your Portfolio

```typescript
import { studio } from 'startups.studio'

const portfolio = await studio.portfolio()

for (const startup of portfolio.startups) {
  console.log(`${startup.name}: $${startup.metrics.mrr} MRR`)
}
```

### 2. Deploy and Manage

```typescript
// Deploy updates to any startup
await studio.deploy('saas-product', {
  code: updatedWorkerCode,
  message: 'Add user dashboard'
})

// Configure with shared services
await studio.configure('saas-product', {
  domain: 'app.saasproduct.com',
  services: [
    { name: 'AI', service: 'llm.do' },
    { name: 'PAYMENTS', service: 'payments.do' }
  ]
})

// Set secrets securely
await studio.setSecret('saas-product', 'STRIPE_KEY', 'sk_live_...')
```

### 3. Monitor Everything

```typescript
// Portfolio-wide health check
const health = await studio.health()
console.log(`Portfolio status: ${health.overall}`)

// Catch issues before customers do
for (const incident of health.incidents) {
  console.log(`[${incident.severity}] ${incident.title}`)
}

// Analytics across all ventures
const analytics = await studio.analytics({ period: 'month' })
console.log(`Total revenue: $${analytics.revenue.total}`)
console.log(`Growth: ${analytics.revenue.growth}%`)
```

## The Difference Is Clear

**Without startups.studio:**
- Separate infrastructure for each venture
- Dozens of dashboards to check daily
- Inconsistent deployment processes
- No portfolio-wide visibility
- Weeks lost to repeated setup

**With startups.studio:**
- One codebase, infinite ventures
- Single dashboard for everything
- Deploy any startup in seconds
- Real-time portfolio health
- Launch new ideas in hours

## Built for Serial Builders

```typescript
// Pause a venture during pivot
await studio.pause('experiment-1')

// Resume when ready
await studio.resume('experiment-1')

// Stream logs for debugging
for await (const log of studio.tailLogs('saas-product')) {
  console.log(`[${log.timestamp}] ${log.message}`)
}

// Rollback instantly if something breaks
await studio.rollback('saas-product', previousDeploymentId)

// Invite collaborators to specific startups
await studio.invite('saas-product', 'cofounder@email.com', 'admin')

// Transfer ownership when you exit
await studio.transfer('acquired-startup', 'new-owner-id')
```

## Your Portfolio Deserves Better

You've built multiple successful ventures. You understand leverage.

**Stop rebuilding infrastructure. Start scaling your studio.**

```bash
npm install startups.studio
```

## Part of the Startup Journey

startups.studio is the management layer in the workers.do Autonomous Startup platform:

1. **[startups.new](https://startups.new)** - Launch your Autonomous Startup
2. **[startups.studio](https://startups.studio)** - Build and manage your portfolio (you are here)
3. **[startup.games](https://startup.games)** - Learn and practice startup skills

## Authentication

```bash
export DO_API_KEY=your_api_key
# or
export ORG_AI_API_KEY=your_api_key
```

[Get started at startups.studio](https://startups.studio)

---

MIT License
