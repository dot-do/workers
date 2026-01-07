# startups.studio

> Build and manage your Autonomous Startup portfolio - the venture studio for Business-as-Code

Part of the [workers.do](https://workers.do) Autonomous Startup platform.

## Overview

startups.studio is your workspace for building and managing Autonomous Startups. Deploy code, monitor health, view analytics, and manage your entire startup portfolio from a single interface.

Think of it as the "venture studio" for your Business-as-Code companies.

## Installation

```bash
npm install startups.studio
```

## Quick Start

```typescript
import { studio } from 'startups.studio'

// Get your portfolio overview
const portfolio = await studio.portfolio()
console.log(`Managing ${portfolio.stats.totalStartups} startups`)
console.log(`Total MRR: $${portfolio.stats.totalMRR}`)

// Deploy an update
await studio.deploy('my-startup', {
  code: updatedWorkerCode,
  message: 'Add user dashboard feature'
})

// Check health across all startups
const health = await studio.health()
for (const startup of health.startups) {
  console.log(`${startup.name}: ${startup.status}`)
}
```

## Features

### Portfolio Management

View and manage all your startups:

```typescript
const portfolio = await studio.portfolio()

// Portfolio stats
console.log(portfolio.stats)
// {
//   totalStartups: 5,
//   activeStartups: 4,
//   totalMRR: 15000,
//   totalCustomers: 450,
//   totalRequests: 1200000,
//   avgUptime: 99.95
// }

// Individual startup metrics
for (const startup of portfolio.startups) {
  console.log(`${startup.name}:`)
  console.log(`  MRR: $${startup.metrics.mrr}`)
  console.log(`  Customers: ${startup.metrics.customers}`)
  console.log(`  Health: ${startup.health}`)
}
```

### Deployments

Deploy code and configuration changes:

```typescript
// Deploy new code
const deployment = await studio.deploy('my-startup', {
  code: workerCode,
  message: 'Add API v2 endpoints'
})

console.log(`Deployment ${deployment.id}: ${deployment.status}`)

// Deploy with environment changes
await studio.deploy('my-startup', {
  env: {
    FEATURE_FLAG: 'enabled',
    API_VERSION: 'v2'
  },
  message: 'Enable new feature'
})

// Set secrets securely
await studio.setSecret('my-startup', 'STRIPE_KEY', 'sk_live_...')

// Rollback if needed
await studio.rollback('my-startup', previousDeploymentId)
```

### Health Monitoring

Monitor the health of all your startups:

```typescript
const health = await studio.health()

// Overall status
console.log(`Portfolio health: ${health.overall}`)

// Per-startup health
for (const startup of health.startups) {
  console.log(`${startup.name}:`)
  console.log(`  Status: ${startup.status}`)
  console.log(`  Uptime: ${startup.uptime}%`)
  console.log(`  Latency: p50=${startup.latency.p50}ms, p99=${startup.latency.p99}ms`)
  console.log(`  Error rate: ${startup.errorRate}%`)
}

// Active incidents
for (const incident of health.incidents) {
  console.log(`[${incident.severity}] ${incident.title}`)
}
```

### Analytics

View revenue, traffic, and performance:

```typescript
// Portfolio analytics
const analytics = await studio.analytics({ period: 'month' })

console.log(`Revenue: $${analytics.revenue.total} (${analytics.revenue.growth > 0 ? '+' : ''}${analytics.revenue.growth}%)`)
console.log(`Traffic: ${analytics.traffic.requests} requests`)
console.log(`Performance: ${analytics.performance.avgLatency}ms avg, ${analytics.performance.uptime}% uptime`)

// Per-startup analytics
const startupAnalytics = await studio.analytics({
  startupId: 'my-startup',
  period: 'week'
})
```

### Logs & Debugging

Access logs for debugging:

```typescript
// Get recent logs
const logs = await studio.logs('my-startup', {
  level: 'error',
  limit: 100
})

for (const log of logs) {
  console.log(`[${log.level}] ${log.message}`)
}

// Stream live logs
for await (const log of studio.tailLogs('my-startup')) {
  console.log(`[${log.timestamp}] ${log.message}`)
}
```

### Configuration

Update startup settings:

```typescript
await studio.configure('my-startup', {
  // Custom domain
  domain: 'app.mycompany.com',

  // Environment variables
  env: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info'
  },

  // Service bindings
  services: [
    { name: 'AI', service: 'llm', config: { model: 'claude-3-opus' } },
    { name: 'PAYMENTS', service: 'payments' }
  ],

  // Auto-scaling
  scaling: {
    minInstances: 2,
    maxInstances: 10,
    targetCPU: 70
  },

  // Alerts
  alerting: [
    {
      name: 'High Error Rate',
      condition: 'error_rate',
      threshold: 5,
      channels: ['email', 'slack']
    }
  ]
})
```

### Team Collaboration

Manage access to your startups:

```typescript
// Invite a collaborator
await studio.invite('my-startup', 'alice@company.com', 'developer')

// Transfer ownership
await studio.transfer('my-startup', 'new-owner-id')
```

### Lifecycle Management

Control startup status:

```typescript
// Pause a startup (maintenance mode)
await studio.pause('my-startup')

// Resume
await studio.resume('my-startup')

// Archive (soft delete)
await studio.archive('old-startup')
```

## API Reference

### Portfolio & Startups

| Method | Description |
|--------|-------------|
| `portfolio()` | Get portfolio overview |
| `startup(id)` | Get startup details |
| `activity(options)` | Get recent activity |

### Deployments

| Method | Description |
|--------|-------------|
| `deploy(id, config)` | Deploy updates |
| `deployment(id)` | Get deployment status |
| `deployments(id, options)` | List deployments |
| `rollback(id, deploymentId)` | Rollback to previous |

### Monitoring

| Method | Description |
|--------|-------------|
| `health()` | Portfolio health report |
| `startupHealth(id)` | Startup health details |
| `analytics(options)` | Analytics summary |
| `logs(id, options)` | Get logs |
| `tailLogs(id, options)` | Stream live logs |

### Configuration

| Method | Description |
|--------|-------------|
| `configure(id, config)` | Update configuration |
| `setSecret(id, name, value)` | Set secret |

### Lifecycle

| Method | Description |
|--------|-------------|
| `pause(id)` | Pause startup |
| `resume(id)` | Resume startup |
| `archive(id)` | Archive startup |
| `transfer(id, newOwner)` | Transfer ownership |
| `invite(id, email, role)` | Invite collaborator |

## Configuration

```typescript
import { Studio } from 'startups.studio'

const client = Studio({
  apiKey: process.env.DO_API_KEY,
  timeout: 60000,
})
```

## Part of the Startup Journey

startups.studio is the management layer in the workers.do Autonomous Startup platform:

1. **[startups.new](https://startups.new)** - Launch your Autonomous Startup
2. **[startups.studio](https://startups.studio)** - Build and manage your startup (you are here)
3. **[startup.games](https://startup.games)** - Learn and practice startup skills

## License

MIT
