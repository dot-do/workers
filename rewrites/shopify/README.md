# shopify.do

> E-commerce. AI-native. Your store, your rules.

Shopify powers millions of stores, taking a cut of every transaction. 2.9% + $0.30 on every sale. Mandatory payment processing. App store fees on top. A successful store pays Shopify $50K-500K+ annually.

**shopify.do** is the open-source alternative. Deploy your own e-commerce platform. Choose your payment processor. AI that actually sells for you.

## The workers.do Way

You built a brand people love. You've got product-market fit. But every sale, Shopify takes nearly 3%. At scale, that's hundreds of thousands of dollars - money that should go into inventory, marketing, or your own pocket.

**workers.do** gives you AI that actually sells:

```typescript
import { shopify, mark } from 'workers.do'

// Natural language for commerce
const orders = await shopify`find orders from ${campaign} this week`
const inventory = await shopify`which SKUs are below reorder point`
const customers = await shopify`show VIP customers who haven't ordered in 60 days`
```

Promise pipelining for order fulfillment - one network round trip:

```typescript
// Campaign to customer delight
const delighted = await shopify`find orders from ${campaign}`
  .map(order => shopify`fulfill ${order} with expedited shipping`)
  .map(fulfilled => mark`send thank you to ${fulfilled.customer}`)
  .map(thanked => shopify`add ${thanked.customer} to VIP segment`)
```

AI agents that grow your store:

```typescript
import { priya, ralph, sally } from 'agents.do'

// E-commerce intelligence
await priya`analyze cart abandonment and recommend recovery flow`
await ralph`optimize product page for ${sku} based on conversion data`
await sally`draft win-back email sequence for churned subscribers`
```

## The Problem

Shopify democratized e-commerce, then monetized it aggressively:

- **2.9% + $0.30 per transaction** - On $1M/year GMV, that's $30K+ to Shopify
- **$29-399/month platform fees** - Before you sell anything
- **Payment processor lock-in** - 0.5-2% penalty for not using Shopify Payments
- **App tax** - 15-30% of app revenue goes to Shopify
- **Theme lock-in** - Liquid templates don't work anywhere else
- **"AI" features** - Shopify Magic is marketing, not transformation

A store doing $5M/year? **$150K+ annually** to Shopify. That's a full-time employee or significant marketing budget.

## The Solution

**shopify.do** returns value to merchants:

```
Shopify                         shopify.do
-----------------------------------------------------------------
2.9% + $0.30/transaction        Your processor, your rates
$29-399/month                   $0 - run your own
Shopify Payments required       Stripe, Adyen, any processor
Liquid templates                React/Next.js (portable skills)
15-30% app store tax            Open ecosystem
AI as marketing                 AI-native commerce
Hosted on Shopify               Your infrastructure
```

## One-Click Deploy

```bash
npx create-dotdo shopify
```

Your own e-commerce platform. With AI that actually sells.

## Features

### Storefront

Beautiful, fast, customizable:

```typescript
import { store } from 'shopify.do'

// Configure your store
await store.configure({
  name: 'Acme Co',
  domain: 'shop.acme.com',
  currency: 'USD',
  theme: 'minimal', // or 'bold', 'classic', or custom
  features: {
    multiCurrency: true,
    multilingual: ['en', 'es', 'fr'],
    subscriptions: true,
    b2b: false,
  },
})
```

### Products

Rich catalog management:

```typescript
// Create product
await store.products.create({
  title: 'Premium Wireless Headphones',
  handle: 'premium-wireless-headphones',
  description: 'Crystal-clear audio with 30-hour battery life...',
  vendor: 'Acme Audio',
  type: 'Electronics',
  tags: ['wireless', 'bluetooth', 'audio', 'premium'],
  variants: [
    {
      title: 'Midnight Black',
      sku: 'AWH-001-BLK',
      price: 299.99,
      compareAtPrice: 349.99,
      inventory: 150,
      weight: 0.5,
      weightUnit: 'lb',
    },
    {
      title: 'Pearl White',
      sku: 'AWH-001-WHT',
      price: 299.99,
      inventory: 75,
      weight: 0.5,
      weightUnit: 'lb',
    },
  ],
  images: [
    { url: 'https://...', alt: 'Headphones front view' },
    { url: 'https://...', alt: 'Headphones side view' },
  ],
  seo: {
    title: 'Premium Wireless Headphones | Acme Co',
    description: 'Experience crystal-clear audio...',
  },
})

// Create collection
await store.collections.create({
  title: 'Audio Equipment',
  handle: 'audio',
  rules: [
    { field: 'type', relation: 'equals', value: 'Electronics' },
    { field: 'tags', relation: 'contains', value: 'audio' },
  ],
  sortOrder: 'best-selling',
})
```

### Checkout

Conversion-optimized, flexible:

```typescript
// Create checkout
const checkout = await store.checkout.create({
  lineItems: [
    { variantId: 'AWH-001-BLK', quantity: 1 },
    { variantId: 'CASE-001', quantity: 1 },
  ],
  email: 'customer@example.com',
})

// Apply discount
await checkout.applyDiscount('SAVE20')

// Calculate shipping
const rates = await checkout.shippingRates({
  address: {
    country: 'US',
    state: 'CA',
    zip: '94102',
  },
})

// Complete with any processor
await checkout.complete({
  paymentMethod: 'stripe',
  token: 'tok_...',
  shippingRate: rates[0].id,
})
```

### Orders

Full lifecycle management:

```typescript
// Order created automatically from checkout
const order = await store.orders.get('ORD-1001')

// Fulfill order
await order.fulfill({
  lineItems: [{ id: 'line-1', quantity: 1 }],
  tracking: {
    company: 'UPS',
    number: '1Z999AA10123456784',
    url: 'https://ups.com/track/...',
  },
  notifyCustomer: true,
})

// Handle return
await order.return({
  lineItems: [{ id: 'line-1', quantity: 1, reason: 'Defective' }],
  refund: {
    amount: 299.99,
    method: 'original', // or 'store_credit'
  },
})
```

### Subscriptions

Recurring revenue built-in:

```typescript
// Create subscription product
await store.products.create({
  title: 'Coffee Subscription',
  type: 'Subscription',
  variants: [
    {
      title: '12oz Monthly',
      price: 24.99,
      subscription: {
        interval: 'month',
        intervalCount: 1,
      },
    },
    {
      title: '12oz Weekly',
      price: 19.99,
      subscription: {
        interval: 'week',
        intervalCount: 1,
      },
    },
  ],
})

// Manage subscription
await store.subscriptions.pause('SUB-1001')
await store.subscriptions.changeFrequency('SUB-1001', 'week', 2)
await store.subscriptions.cancel('SUB-1001', { reason: 'Too much coffee' })
```

### Inventory

Real-time stock management:

```typescript
// Configure locations
await store.inventory.locations([
  { name: 'Main Warehouse', type: 'warehouse', address: {...} },
  { name: 'NYC Store', type: 'retail', address: {...} },
  { name: 'LA Store', type: 'retail', address: {...} },
])

// Set inventory by location
await store.inventory.set({
  sku: 'AWH-001-BLK',
  location: 'Main Warehouse',
  quantity: 500,
})

// Reserve for order
await store.inventory.reserve({
  sku: 'AWH-001-BLK',
  location: 'Main Warehouse',
  quantity: 1,
  orderId: 'ORD-1001',
})

// Transfer between locations
await store.inventory.transfer({
  sku: 'AWH-001-BLK',
  from: 'Main Warehouse',
  to: 'NYC Store',
  quantity: 50,
})
```

### Discounts & Promotions

Flexible pricing rules:

```typescript
// Percentage discount
await store.discounts.create({
  code: 'SAVE20',
  type: 'percentage',
  value: 20,
  appliesTo: 'all',
  usageLimit: 1000,
  startsAt: '2025-01-01',
  endsAt: '2025-01-31',
})

// Buy X get Y
await store.discounts.create({
  type: 'buyXgetY',
  rules: {
    buy: { quantity: 2, collection: 'shirts' },
    get: { quantity: 1, collection: 'shirts', discount: 100 },
  },
})

// Automatic discount
await store.discounts.create({
  type: 'automatic',
  name: 'Free shipping over $100',
  rules: {
    cartMinimum: 100,
    discount: { type: 'shipping', value: 100 },
  },
})
```

### Shipping

Carrier-agnostic rate calculation:

```typescript
// Configure shipping zones
await store.shipping.zones([
  {
    name: 'US Domestic',
    countries: ['US'],
    rates: [
      { name: 'Standard', price: 7.99, deliveryDays: '5-7' },
      { name: 'Express', price: 14.99, deliveryDays: '2-3' },
      { name: 'Overnight', price: 29.99, deliveryDays: '1' },
    ],
  },
  {
    name: 'International',
    countries: ['*'],
    exclude: ['US'],
    rates: [
      { name: 'International', price: 24.99, deliveryDays: '7-14' },
    ],
  },
])

// Or use carrier rates
await store.shipping.carriers({
  ups: { accountNumber: '...', enabled: true },
  fedex: { accountNumber: '...', enabled: true },
  usps: { enabled: true },
})
```

## AI-Native Commerce

This is where shopify.do transforms e-commerce.

### AI Product Generation

```typescript
import { mark } from 'agents.do'

// Generate product descriptions
await mark`
  Write a compelling product description for these headphones:
  - 30-hour battery
  - Active noise cancellation
  - Bluetooth 5.2
  - Memory foam ear cushions

  Make it benefit-focused, not feature-focused.
  Target audience: work-from-home professionals.
`

// Generate entire product listing
await mark`
  Create a complete product listing for a new coffee subscription:
  - Origin: Ethiopia Yirgacheffe
  - Roast: Medium
  - Process: Washed
  - Flavor notes: Blueberry, jasmine, citrus

  Include: title, description, SEO metadata, suggested pricing.
`
```

### AI Personal Shopping

```typescript
import { sally } from 'agents.do'

// Customer chatbot that actually sells
await store.ai.configure({
  assistant: sally,
  capabilities: [
    'productRecommendation',
    'sizeAdvice',
    'orderTracking',
    'returnInitiation',
    'discountApplication',
  ],
})

// Customer: "I need running shoes for marathon training"
// Sally: "For marathon training, you'll want shoes with great cushioning
//         and durability. Based on your previous orders (size 10, neutral
//         gait), I'd recommend our CloudStride Pro at $159. It's our
//         best seller for long-distance. Would you like me to add it
//         to your cart with free shipping?"
```

### AI Merchandising

```typescript
import { priya } from 'agents.do'

// Optimize product placement
await priya`
  Analyze our store performance:
  1. Which products should be featured on homepage?
  2. What collections need reordering by conversion rate?
  3. Which products are underperforming vs inventory level?

  Recommend merchandising changes to maximize revenue.
`

// Priya analyzes and acts:
// "Recommending:
// 1. Feature 'Premium Headphones' (high margin, low visibility, good reviews)
// 2. Move 'Accessories' collection up - 3.2% conversion vs 1.8% average
// 3. Discount 'Vintage Speaker' - 180 days inventory, declining views
//
// Shall I implement these changes?"
```

### AI Dynamic Pricing

```typescript
import { ada } from 'shopify.do/agents'

// Configure dynamic pricing
await store.pricing.ai({
  mode: 'optimize-margin', // or 'maximize-volume', 'competitive'
  constraints: {
    minMargin: 30, // Never go below 30% margin
    maxDiscount: 40, // Never discount more than 40%
    priceChangeFrequency: 'daily',
  },
  factors: [
    'inventoryLevel',
    'competitorPricing',
    'demandForecast',
    'customerSegment',
    'timeOfYear',
  ],
})

// Prices adjust automatically based on:
// - Stock levels (low stock = higher price)
// - Competitor monitoring
// - Purchase intent signals
// - Seasonal demand
```

### AI Email Marketing

```typescript
import { mark } from 'agents.do'

// Generate abandoned cart emails
await mark`
  Write an abandoned cart email sequence (3 emails):
  - Email 1: 1 hour after abandonment (gentle reminder)
  - Email 2: 24 hours (address objections)
  - Email 3: 72 hours (urgency/discount)

  Include personalization placeholders.
  Our brand voice is friendly but premium.
`

// Auto-send personalized emails
await store.email.configure({
  automation: {
    abandonedCart: { enabled: true, ai: mark },
    postPurchase: { enabled: true, ai: mark },
    winback: { enabled: true, ai: mark, inactiveDays: 60 },
  },
})
```

### AI Customer Service

```typescript
// 24/7 AI support that actually resolves issues
await store.support.configure({
  ai: {
    enabled: true,
    agent: sally,
    canPerformActions: [
      'lookupOrder',
      'trackShipment',
      'initiateReturn',
      'applyDiscount', // Up to 15%
      'escalateToHuman',
    ],
    escalationRules: {
      refundOver: 100, // Escalate refunds > $100
      angryCustomer: true, // Escalate heated conversations
      complexIssue: true, // Escalate multi-issue tickets
    },
  },
})

// Customer: "Where's my order? It was supposed to arrive yesterday!"
// Sally: "I see your order ORD-1001 is currently in transit with UPS.
//         It looks like there was a weather delay in Memphis. Current
//         estimated delivery is tomorrow by 5pm. I apologize for the
//         inconvenience - would you like a 15% discount code for your
//         next order?"
```

## Storefront API

Build any frontend:

```typescript
import { createStorefrontClient } from 'shopify.do/client'

const client = createStorefrontClient({
  domain: 'shop.acme.com',
  storefrontToken: 'sf_...',
})

// Fetch products (GraphQL-compatible)
const products = await client.products.list({
  first: 10,
  filters: { collection: 'audio' },
})

// Add to cart
const cart = await client.cart.create({
  lines: [{ variantId: 'gid://shopify/ProductVariant/123', quantity: 1 }],
})

// Checkout
const checkout = await client.checkout.create({
  cartId: cart.id,
})
```

### Headless Commerce

Use any frontend framework:

```typescript
// Next.js
// app/products/[handle]/page.tsx
export default async function ProductPage({ params }) {
  const product = await shopify.products.getByHandle(params.handle)
  return <ProductDetail product={product} />
}

// Remix
// app/routes/products.$handle.tsx
export async function loader({ params }) {
  const product = await shopify.products.getByHandle(params.handle)
  return json({ product })
}

// Astro
// src/pages/products/[handle].astro
const product = await shopify.products.getByHandle(Astro.params.handle)
```

## Architecture

### Durable Object per Store

Complete tenant isolation:

```
StoreDO (config, settings, theme)
  |
  +-- CatalogDO (products, collections, inventory)
  |     |-- SQLite: Product data, variants
  |     +-- R2: Product images, videos
  |
  +-- OrdersDO (orders, fulfillments, returns)
  |     |-- SQLite: Active orders
  |     +-- R2: Order history, documents
  |
  +-- CustomersDO (accounts, addresses, history)
  |     |-- SQLite: Customer data
  |     +-- R2: Customer files
  |
  +-- AnalyticsDO (traffic, conversion, revenue)
        |-- SQLite: Aggregated metrics
        +-- R2: Event data warehouse
```

### Edge Commerce

```
Customer Browser              Cloudflare Edge              Origin
       |                            |                        |
       |---[Product Page]---------->|                        |
       |                      [Cache HIT]                    |
       |<--[Instant Response]-------|                        |
       |                            |                        |
       |---[Add to Cart]----------->|                        |
       |                      [Edge DO]                      |
       |<--[Updated Cart]-----------|                        |
       |                            |                        |
       |---[Checkout]-------------->|                        |
       |                      [Edge DO]---[Payment]--------->|
       |<--[Confirmation]-----------|<--[Webhook]------------|
```

### Payment Abstraction

```typescript
// Unified payment interface
interface PaymentProcessor {
  createPaymentIntent(amount: number, currency: string): Promise<PaymentIntent>
  confirmPayment(intentId: string, token: string): Promise<PaymentResult>
  refund(chargeId: string, amount?: number): Promise<RefundResult>
}

// Implementations for every major processor
const stripe = new StripeProcessor({ apiKey: '...' })
const adyen = new AdyenProcessor({ apiKey: '...', merchantAccount: '...' })
const square = new SquareProcessor({ accessToken: '...' })
const paypal = new PayPalProcessor({ clientId: '...', clientSecret: '...' })

// Use any processor
await store.payments.configure({ processor: stripe })
```

## Why Open Source E-commerce?

**1. WooCommerce Proved the Market**

40% of e-commerce runs on WooCommerce (open source). The demand exists. shopify.do brings modern architecture to open source e-commerce.

**2. Transaction Fees Are Extractive**

2.9% + $0.30 per transaction is not the cost of processing payments. It's a tax on success. Stripe charges 2.6% + $0.10. The difference is pure margin extraction.

**3. AI Changes Everything**

When AI can:
- Generate product listings
- Write marketing copy
- Handle customer service
- Optimize pricing
- Personalize shopping

...the platform should enable this, not charge extra for it.

**4. Portability Matters**

Your store, your data, your code. If you want to switch platforms, migrate to another provider, or sell your business - you should be able to.

## Deployment

### Cloudflare Workers

```bash
npx create-dotdo shopify
# Global edge deployment
# Fast everywhere in the world
```

### Self-Hosted

```bash
# Docker
docker run -p 8787:8787 dotdo/shopify

# Kubernetes
kubectl apply -f shopify-do-deployment.yaml
```

### Hybrid

```typescript
// Edge for storefront, origin for admin
await store.config.hybrid({
  edge: ['storefront', 'cart', 'checkout'],
  origin: ['admin', 'reporting', 'inventory'],
})
```

## Roadmap

### Core
- [x] Products & Variants
- [x] Collections
- [x] Checkout
- [x] Orders
- [x] Customers
- [x] Discounts
- [x] Shipping
- [ ] Gift Cards
- [ ] Multi-currency
- [ ] Multi-language

### Commerce
- [x] Subscriptions
- [x] Inventory Management
- [ ] B2B/Wholesale
- [ ] Marketplaces
- [ ] Dropshipping

### AI
- [x] Product Generation
- [x] AI Shopping Assistant
- [x] Dynamic Pricing
- [x] Email Marketing
- [ ] Visual Search
- [ ] Fraud Detection

### Integrations
- [x] Stripe
- [x] PayPal
- [ ] ShipStation
- [ ] Klaviyo
- [ ] Google Shopping

## Contributing

shopify.do is open source under the MIT license.

We welcome contributions from:
- E-commerce developers
- Merchants
- Payment industry experts
- Marketing technologists

```bash
git clone https://github.com/dotdo/shopify.do
cd shopify.do
npm install
npm test
```

## License

MIT License - Your store, your rules.

---

<p align="center">
  <strong>shopify.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://shopify.do">Website</a> | <a href="https://docs.shopify.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
