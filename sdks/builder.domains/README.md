# builder.domains

**Launch on your own domain. For free.**

```bash
npm install builder.domains
```

---

## You're Ready to Ship. Your Domain Isn't.

You've built something great. Now you need a domain.

But suddenly you're stuck in a maze:
- $15/year here, $50/year there, costs adding up fast
- DNS configuration that reads like hieroglyphics
- SSL certificates that expire at 3am on a Friday
- Custom domains for customers? That's a whole engineering project
- Multi-tenant routing? Now you need a PhD in infrastructure

**You didn't start building to become a domain registrar.**

## What If Domains Were Free and Instant?

```typescript
import { domains } from 'builder.domains'

await domains.claim('my-startup.hq.com.ai')
// That's it. You have a domain. SSL included.
```

**builder.domains** handles everything:
- Free domains on premium-sounding TLDs
- Automatic SSL certificates (forever)
- DNS management built in
- Multi-tenant customer domains
- Routing to any worker or service

## Get Your Domain in 3 Steps

### 1. Claim Your Domain

```typescript
import { domains } from 'builder.domains'

// Check what's available
const { available } = await domains.check('my-startup.hq.com.ai')

// Claim it instantly
const domain = await domains.claim('my-startup.hq.com.ai')
console.log(`Live at: https://${domain.name}`)
```

### 2. Configure Routing

```typescript
await domains.route('my-startup.hq.com.ai', {
  worker: 'my-app',
  paths: {
    '/api': 'api-worker',
    '/docs': 'docs-worker'
  }
})
```

### 3. Launch

Your domain is live. SSL is automatic. DNS is managed. **Go build your product.**

## The Choice Is Clear

**Without builder.domains:**
- Hundreds in domain costs per year
- Hours debugging DNS propagation
- Panic when SSL certificates expire
- Complex infrastructure for customer domains
- Scaling means scaling your domain budget

**With builder.domains:**
- Free domains, unlimited claims
- DNS that just works
- SSL that never expires
- Customer domains in one API call
- Scale your business, not your costs

## Free TLDs for Builders

Claim unlimited domains on these premium patterns:

| Pattern | Purpose |
|---------|---------|
| `*.hq.com.ai` | AI company headquarters |
| `*.app.net.ai` | AI applications |
| `*.api.net.ai` | AI APIs |
| `*.hq.sb` | Startup headquarters |
| `*.io.sb` | Startup projects |
| `*.llc.st` | LLC startups |

```typescript
await domains.claim('acme.hq.com.ai')
await domains.claim('acme-api.api.net.ai')
await domains.claim('acme-app.app.net.ai')
// All free. All instant. All yours.
```

## Built for Multi-Tenant SaaS

Give every customer their own domain:

```typescript
// Your customer signs up
const customerDomain = await domains.claim(`${customer.slug}.app.net.ai`)

// Route to their tenant
await domains.route(customerDomain.name, {
  worker: 'multi-tenant-app',
  headers: { 'X-Tenant-ID': customer.id }
})

// They look professional. You look brilliant.
```

## Full Control When You Need It

```typescript
// List all your domains
const myDomains = await domains.list()

// Configure DNS records
await domains.dns.set('my-startup.hq.com.ai', [
  { type: 'TXT', name: '_dmarc', content: 'v=DMARC1; p=reject' },
  { type: 'MX', name: '@', content: 'mail.example.com' }
])

// Get domain details
const domain = await domains.get('my-startup.hq.com.ai')
console.log(`Status: ${domain.status}`)

// Release when done
await domains.release('old-project.hq.sb')
```

## Your Domain Strategy, Simplified

You have a product to build. Customers to serve. A vision to realize.

**Don't let domain costs and DNS complexity be the thing that slows you down.**

```bash
npm install builder.domains
```

Set your API key:
```typescript
import { createDomains } from 'builder.domains'

const domains = createDomains({
  apiKey: process.env.DOMAINS_API_KEY
})
```

[Get your free domain at builder.domains](https://builder.domains)

---

Part of the [workers.do](https://workers.do) platform for building Autonomous Startups.

MIT License
