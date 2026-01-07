# startups.new

**From idea to live startup in minutes, not months.**

```bash
npm install startups.new
```

---

## You Have an Idea. It's Dying in Your Head.

Every day you don't launch, someone else might. Every week of "planning," your window shrinks.

But launching a startup traditionally means:
- Weeks setting up infrastructure before writing a line of product code
- Analysis paralysis choosing between 47 frameworks and 200 SaaS tools
- Building features nobody asked for because you haven't talked to customers
- Months to first revenue while your savings (and motivation) drain away

**What if you could skip all that and just... launch?**

## Like docs.new, But for Startups

```typescript
import { launch } from 'startups.new'

const startup = await launch({
  name: 'acme-ai',
  template: 'saas',
  domain: 'acme.hq.com.ai'
})

console.log(startup.urls.app)  // https://acme.hq.com.ai - Live. Now.
```

**startups.new** is instant startup creation:
- AI, payments, auth, analytics - all pre-wired and ready
- Free domains included (*.hq.com.ai, *.app.net.ai, *.hq.sb)
- Describe your idea in plain English, get a running business
- Start talking to customers today, not "after we finish the MVP"

## Launch Your Startup in 3 Steps

### 1. Describe or Pick

```typescript
import { create, launch } from 'startups.new'

// Option A: Just describe it
const startup = await create(`
  A tool that helps developers write better documentation
  with a free tier for open source projects
`)

// Option B: Start from a template
const startup = await launch({
  name: 'docmaster',
  template: 'saas',
  domain: 'docmaster.hq.com.ai'
})
```

### 2. Configure Your Business Model

```typescript
const startup = await launch({
  name: 'docmaster',
  template: 'saas',
  model: {
    type: 'subscription',
    pricing: [
      { name: 'Free', price: 0, features: ['3 projects', 'Community support'] },
      { name: 'Pro', price: 29, interval: 'month', features: ['Unlimited projects', 'Priority support'] },
      { name: 'Team', price: 99, interval: 'month', features: ['Team collaboration', 'Analytics'] }
    ]
  }
})
```

### 3. You're Live

```typescript
console.log(startup.urls.app)       // https://docmaster.hq.com.ai
console.log(startup.urls.api)       // https://api.docmaster.hq.com.ai
console.log(startup.urls.docs)      // https://docs.docmaster.hq.com.ai
console.log(startup.urls.dashboard) // https://dashboard.docmaster.hq.com.ai

// Start getting customers. Today.
```

## The Before and After

**Without startups.new:**
- 3 months to launch
- $10K+ on tools and infrastructure
- 10,000 decisions before your first customer
- Building what you *think* people want
- Exhausted before you even begin

**With startups.new:**
- Live in minutes
- Free tier gets you started
- One decision: what problem are you solving?
- Building based on real customer feedback
- Energy focused on your vision, not your stack

## Everything You Need, Nothing You Don't

### Pick Your Starting Point

| Template | Description | What's Included |
|----------|-------------|-----------------|
| `saas` | Subscription SaaS | Auth, Payments, Analytics |
| `marketplace` | Two-sided marketplace | Auth, Payments (Connect), Search |
| `api` | API-as-a-product | Auth, Usage billing, Docs |
| `agency` | Service agency | Auth, Payments, Workflows |
| `ecommerce` | Online store | Payments, Inventory, Analytics |
| `blank` | Your vision, your way | Add only what you need |

### AI Generates Everything

```typescript
import { create } from 'startups.new'

const result = await create(`
  A platform where indie hackers can find co-founders
  based on complementary skills and timezone overlap.
  Should have a freemium model.
`)

// AI generates:
console.log(result.startup)      // Live startup
console.log(result.code.worker)  // Full source code
console.log(result.code.schema)  // Database schema
console.log(result.suggestions)  // "Consider adding: video intros, skill verification..."
```

### Free Domains Included

No domain shopping. No DNS configuration. Just launch.

```typescript
// Pick any free subdomain
await launch({ name: 'acme', domain: 'acme.hq.com.ai' })
await launch({ name: 'acme', domain: 'acme.app.net.ai' })
await launch({ name: 'acme', domain: 'acme.hq.sb' })

// Or bring your own domain when you're ready
await launch({ name: 'acme', domain: 'acme.com' })
```

### Clone What Works

```typescript
// Found a template you love? Fork it.
const fork = await launch.clone({
  source: 'https://template.startups.new/saas-starter',
  name: 'my-saas'
})

// Iterate on your own startup
const v2 = await launch.clone({
  source: 'my-startup-id',
  name: 'my-startup-v2',
  includeData: false
})
```

## Stop Planning. Start Building.

The best time to launch was 6 months ago. The second best time is right now.

Your idea deserves to exist in the world, not just in your head. Your future customers are waiting for you to solve their problem. Your competitors are launching while you're still deciding on a tech stack.

**Skip the setup. Ship the product. Start today.**

```bash
npm install startups.new
```

```typescript
import { create } from 'startups.new'

// This is it. This is the moment.
const startup = await create('Your idea here')

console.log(startup.urls.app) // You're live.
```

[Launch your startup at startups.new](https://startups.new)

---

## Part of the Startup Journey

startups.new is the creation step in the workers.do Autonomous Startup platform:

1. **[startups.new](https://startups.new)** - Launch your startup (you are here)
2. **[startups.studio](https://startups.studio)** - Build and iterate
3. **[startup.games](https://startup.games)** - Learn and practice

---

MIT License
