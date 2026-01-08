# marketplace.as

**Build the next Airbnb. This weekend.**

```bash
npm install marketplace.as
```

---

## You See the Marketplace Opportunity

You've found a niche. Sellers on one side, buyers on the other. Value waiting to be unlocked.

But building a marketplace from scratch means:
- Complex payment splitting
- Escrow and trust systems
- Dispute resolution workflows
- Seller onboarding and verification
- Review systems that prevent fraud
- Compliance with payment regulations

**That's not a weekend project. That's a year of your life.**

## Marketplaces Without the Complexity

```typescript
import { marketplace } from 'marketplace.as'

const mp = await marketplace.create({
  name: 'dev-services',
  title: 'Developer Services Marketplace',
  type: 'services',
  commission: 10,  // You earn 10%
  escrow: true     // Payments held until delivery
})

// You have a marketplace. Payments work. Trust is built in.
```

**marketplace.as** gives you:
- Two-sided payments via Stripe Connect
- Automatic escrow and release
- Built-in review systems
- Dispute resolution
- Seller dashboards
- Platform analytics

## Launch Your Marketplace in 3 Steps

### 1. Define Your Market

```typescript
import { marketplace } from 'marketplace.as'

const mp = await marketplace.create({
  name: 'design-talent',
  title: 'Design Talent Marketplace',
  type: 'talent',
  commission: 15,
  categories: ['Logo Design', 'UI/UX', 'Branding', 'Illustration'],
  escrow: true,
  disputes: true
})
```

### 2. Onboard Sellers

```typescript
// Register sellers
const seller = await marketplace.registerSeller('design-talent', {
  name: 'Jane Designer',
  email: 'jane@design.co',
  stripeAccountId: 'acct_xxx'  // Stripe Connect
})

// They create listings
await marketplace.createListing('design-talent', {
  title: 'Professional Logo Design',
  description: 'Custom logo with unlimited revisions',
  price: 500,
  unit: 'project',
  category: 'Logo Design',
  sellerId: seller.id,
  images: ['https://...']
})
```

### 3. Facilitate Transactions

```typescript
// Buyer places order
const order = await marketplace.createOrder('design-talent', {
  listingId: 'listing-123',
  buyerId: 'buyer-456'
})
// Payment captured, funds held in escrow

// Work delivered, buyer confirms
await marketplace.completeOrder('design-talent', order.id)
// Escrow released: seller gets 85%, you get 15%

// Buyer leaves review
await marketplace.addReview('design-talent', {
  orderId: order.id,
  rating: 5,
  content: 'Amazing work, fast delivery!'
})
```

## The Hard Parts, Handled

**Without marketplace.as:**
- Months building payment infrastructure
- Legal complexity around money transmission
- Trust problems kill your marketplace
- Disputes become your full-time job

**With marketplace.as:**
- Payments work day one
- Stripe handles compliance
- Escrow builds trust automatically
- Disputes have a system

## Everything for Marketplace Builders

```typescript
// Search and discovery
const results = await marketplace.searchListings('design-talent', {
  query: 'logo',
  category: 'Logo Design',
  minPrice: 100,
  maxPrice: 1000,
  sort: 'rating'
})

// Track your platform
const metrics = await marketplace.metrics('design-talent')
console.log(`Total volume: $${metrics.totalVolume}`)
console.log(`Your commission: $${metrics.totalCommission}`)
console.log(`Active sellers: ${metrics.activeSellers}`)

// Handle disputes fairly
const disputes = await marketplace.openDispute('design-talent', orderId,
  'Work not delivered as described'
)

// Generate payout reports
const payouts = await marketplace.payoutReport('design-talent', '2024-01')
```

## Configuration

### Environment Variables

```bash
# Primary API key (used by default)
export DO_API_KEY="your-api-key"

# Alternative: Organization API key
export ORG_AI_API_KEY="your-org-key"
```

### Cloudflare Workers

```typescript
import 'rpc.do/env'
import { marketplace } from 'marketplace.as'

// Environment is automatically configured
await marketplace.create({ name, title, type })
```

### Custom Configuration

```typescript
import { Marketplace } from 'marketplace.as'

const client = Marketplace({
  baseURL: 'https://custom.example.com'
})
```

## Your Platform. Your Network Effect.

The best businesses are platforms. Platforms are winner-take-all. The earlier you start, the stronger your moat.

**Don't let infrastructure be the reason you're not building your marketplace.**

```bash
npm install marketplace.as
```

[Build your marketplace at marketplace.as](https://marketplace.as)

---

MIT License
