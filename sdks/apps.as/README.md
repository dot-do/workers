# apps.as

**Ship your app today. Not next month.**

```bash
npm install apps.as
```

---

## You've Built Something Great

You've written the code. You've tested the features. Your app is ready.

But now comes the part nobody warned you about: deployment.

Suddenly you're drowning in infrastructure decisions. Docker configs. CI/CD pipelines. SSL certificates. Load balancers. Monitoring. Logging. Scaling.

**You didn't start building to become a DevOps engineer.**

## What If Deployment Was One Line?

```typescript
import { apps } from 'apps.as'

await apps.deploy({
  name: 'my-app',
  source: './dist'
})
// That's it. You're live.
```

**apps.as** handles everything else:
- Automatic SSL certificates
- Global edge deployment
- Zero-downtime updates
- Built-in monitoring
- Instant rollbacks

## Get Your App Live in 3 Steps

### 1. Install

```bash
npm install apps.as
```

### 2. Deploy

```typescript
import 'rpc.do/env'
import { apps } from 'apps.as'

const deployment = await apps.deploy({
  name: 'my-startup',
  source: './dist',
  env: { DATABASE_URL: 'your-database-url' }
})

console.log(`Live at: ${deployment.url}`)
```

### 3. Sleep Well

Your app is running on Cloudflare's global network. It scales automatically. It heals itself. You can focus on what matters: **building your product**.

## The Choice Is Clear

**Without apps.as:**
- Weeks configuring infrastructure
- Midnight pages when servers crash
- Scaling panic during launch day
- Money bleeding to idle servers

**With apps.as:**
- Deploy in seconds
- Sleep through traffic spikes
- Pay only for what you use
- Focus on your customers

## Built for Builders

```typescript
// Check your app's health
const status = await apps.status('my-startup')

// Scale when you're ready
await apps.scale('my-startup', { instances: 3 })

// Roll back instantly if needed
await apps.rollback('my-startup', previousDeploymentId)

// Stream logs in real-time
for await (const log of apps.logs('my-startup', { follow: true })) {
  console.log(log)
}
```

## Your Launch Day, Simplified

You have customers waiting. Investors watching. A vision to realize.

**Don't let infrastructure be the thing that slows you down.**

```bash
npm install apps.as
```

[Get started at apps.as](https://apps.as)

---

MIT License
