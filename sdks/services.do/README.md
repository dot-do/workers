# services.do

**Discover, deploy, and monetize AI services in minutes.**

```bash
npm install services.do
```

---

## The Microservices Nightmare Is Real

You need to build a service-based architecture. Or consume services from a marketplace. Or both.

But the reality of modern service ecosystems is brutal:

- **Service discovery is chaos** - Where's that API? What version? Is it even online?
- **API versioning breaks everything** - Your integration worked yesterday. Not today.
- **Inter-service communication is fragile** - Timeouts, retries, circuit breakers, oh my
- **Service meshes add complexity** - Now you need a PhD in Kubernetes
- **Monitoring distributed systems is a full-time job** - Good luck debugging across 12 services

**What if services just worked?**

## The AI Services Marketplace That Gets It

```typescript
import { services } from 'services.do'

// Discover services instantly
const writers = await services.list({ category: 'content' })

// Subscribe and use - no integration headaches
await services.subscribe('svc_ai-writer', 'cus_456')

// Deploy your own service to the marketplace
await services.deploy({
  name: 'My AI Writer',
  worker: 'my-writer-worker',
  pricing: { type: 'usage', perUnit: 0.01 }
})

// You're live. Getting paid. Zero DevOps.
```

**services.do** is the marketplace where AI services are discovered, deployed, and monetized:

- Unified service registry with automatic discovery
- Version management that doesn't break consumers
- Built-in usage tracking and billing
- Reviews and ratings for quality signals
- Flexible pricing: free, flat, usage-based, or tiered

## Go Live in 3 Steps

### 1. Discover What You Need

```typescript
import { services } from 'services.do'

// Browse the marketplace
const available = await services.list({
  category: 'content',
  query: 'writer'
})

// Get details on a specific service
const service = await services.get('svc_ai-writer')
console.log(`Rating: ${service.rating}/5 (${service.reviewCount} reviews)`)
```

### 2. Subscribe and Use

```typescript
// Subscribe your customer to a service
const subscription = await services.subscribe('svc_ai-writer', 'cus_456')

// Check active subscriptions
const subs = await services.subscriptions('cus_456')

// Usage is tracked automatically
const usage = await services.usageByCustomer('cus_456')
```

### 3. Deploy Your Own

```typescript
// Publish your AI service to the marketplace
const myService = await services.deploy({
  name: 'Smart Summarizer',
  description: 'AI-powered document summarization',
  category: 'content',
  worker: 'summarizer-worker',
  pricing: { type: 'usage', perUnit: 0.005 },
  domain: 'summarize.example.com'
})

// Start earning
const revenue = await services.usage('svc_smart-summarizer')
console.log(`Revenue: $${revenue.cost}`)
```

## The Old Way vs. The services.do Way

**Building without services.do:**

- Weeks setting up service discovery
- Custom versioning logic that breaks anyway
- Building your own billing and metering
- Debugging distributed failures at 2am
- No discoverability for your services

**Building with services.do:**

- Services discovered instantly
- Versioning handled by the platform
- Usage tracking and billing included
- Unified monitoring and logging
- Marketplace exposure from day one

## Everything a Service Platform Needs

```typescript
// Flexible pricing models
await services.deploy({
  name: 'Enterprise AI',
  pricing: { type: 'tiered', tiers: [
    { upTo: 1000, price: 0.02 },
    { upTo: 10000, price: 0.01 },
    { upTo: Infinity, price: 0.005 }
  ]}
})

// Update your service without breaking consumers
await services.update('svc_123', {
  pricing: { type: 'flat', amount: 29.99 }
})

// Reviews build trust
await services.reviews.create('svc_123', {
  rating: 5,
  comment: 'Excellent service, reliable and fast!'
})

// Monitor your business
const usage = await services.usage('svc_123', {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
})
```

## Configuration

Set your API key via environment variable:

```bash
export SERVICES_API_KEY=your_api_key
```

Or configure explicitly:

```typescript
import { createServices } from 'services.do'

const services = createServices({
  apiKey: 'your_api_key'
})
```

## Pricing Models

Services support the pricing model that fits your business:

| Type | Use Case |
|------|----------|
| **free** | Open source, freemium tier |
| **flat** | Fixed monthly/yearly subscription |
| **usage** | Pay per API call or unit |
| **tiered** | Volume discounts at scale |

## Stop Building Plumbing. Start Building Value.

The best AI services shouldn't be buried in someone's internal infrastructure. They should be discoverable, usable, and monetizable by everyone.

**Deploy your service. Find your customers. Get paid. All in one place.**

```bash
npm install services.do
```

[Explore the AI services marketplace at services.do](https://services.do)

---

MIT License
