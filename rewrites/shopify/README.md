# shopify.do

> E-commerce. AI-native. Your store, your rules.

Shopify powers millions of stores, taking a cut of every transaction. 2.9% + $0.30 on every sale. Mandatory payment processing. App store fees on top. A successful store pays Shopify $50K-500K+ annually.

**shopify.do** is the open-source alternative. Deploy your own e-commerce platform. Choose your payment processor. AI that actually sells for you.

## AI-Native API

```typescript
import { shopify } from 'shopify.do'           // Full SDK
import { shopify } from 'shopify.do/tiny'      // Minimal client
import { shopify } from 'shopify.do/storefront' // Storefront-only
```

Natural language for commerce:

```typescript
import { shopify } from 'shopify.do'

// Talk to it like a colleague
const sales = await shopify`best selling products this month`
const inventory = await shopify`SKUs below reorder point`
const vips = await shopify`VIP customers who haven't ordered in 60 days`

// Chain like sentences
await shopify`orders from Black Friday campaign`
  .map(order => shopify`fulfill ${order} with tracking`)
  .map(fulfilled => shopify`send thank you to ${fulfilled.customer}`)

// Products document themselves
await shopify`create product "Premium Headphones" - Black $299, White $299`
await shopify`add to Audio collection`
await shopify`feature on homepage`
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

### Products

```typescript
// Create products naturally
await shopify`create product "Premium Headphones" - Black $299, White $299`
await shopify`add "Coffee Subscription" - 12oz monthly $24.99, weekly $19.99`

// AI infers what you need
await shopify`headphones`                    // returns product
await shopify`headphones inventory`          // returns stock levels
await shopify`headphones sales this month`   // returns analytics

// Collections just work
await shopify`create "Audio Equipment" collection from electronics tagged audio`
await shopify`best sellers this quarter`
await shopify`products under $50 with low stock`
```

### Checkout

```typescript
// Checkout is just a sentence
await shopify`checkout ${cart} with SAVE20 discount`
await shopify`complete order for sarah@example.com express shipping`

// Or let AI handle it
await shopify`process abandoned carts from today`
  .map(cart => shopify`send recovery email to ${cart.customer}`)
```

### Orders

```typescript
// Natural order management
await shopify`orders from Black Friday`
await shopify`unfulfilled orders over $500`
await shopify`Sarah Chen's order history`

// Fulfill in bulk with pipelining
await shopify`orders ready to ship`
  .map(order => shopify`fulfill ${order} with tracking`)
  .map(fulfilled => shopify`notify ${fulfilled.customer}`)

// Returns are just as simple
await shopify`return headphones from order 1001 - defective`
await shopify`refund $299 to original payment method`
```

### Subscriptions

```typescript
// Manage subscriptions naturally
await shopify`pause Sarah's coffee subscription`
await shopify`change John to bi-weekly delivery`
await shopify`cancel subscription 1001 - too much coffee`

// Subscription analytics
await shopify`churned subscribers this month`
await shopify`subscriptions renewing tomorrow`
await shopify`MRR trend last 6 months`
```

### Inventory

```typescript
// Query inventory naturally
await shopify`headphones stock across all locations`
await shopify`what's below reorder point`
await shopify`NYC store inventory`

// Manage stock
await shopify`add 500 black headphones to warehouse`
await shopify`transfer 50 headphones from warehouse to NYC store`
await shopify`reserve 10 units for order 1001`

// AI inventory alerts
await shopify`SKUs that will stockout this week`
  .map(sku => shopify`create PO for ${sku}`)
```

### Discounts & Promotions

```typescript
// Create discounts naturally
await shopify`create SAVE20 for 20% off everything, limit 1000 uses, expires Jan 31`
await shopify`buy 2 shirts get 1 free`
await shopify`free shipping over $100`

// Query promotions
await shopify`active discount codes`
await shopify`most used promos this quarter`
await shopify`revenue impact of Black Friday sale`
```

### Shipping

```typescript
// Shipping rates in plain English
await shopify`standard shipping $7.99 for US, 5-7 days`
await shopify`express $14.99, 2-3 days`
await shopify`international $24.99, 7-14 days`

// Track shipments
await shopify`where is order 1001`
await shopify`orders stuck in transit`
await shopify`late deliveries this week`
```

## AI-Native Commerce

This is where shopify.do transforms e-commerce.

### AI Product Generation

```typescript
import { mark } from 'agents.do'

// Generate product descriptions naturally
await mark`write description for headphones - 30hr battery, ANC, for remote workers`

// Generate entire listings
await mark`
  create listing for Ethiopian coffee subscription:
  medium roast, washed, notes of blueberry and jasmine
`
```

### AI Personal Shopping

```typescript
import { sally } from 'agents.do'

// Sally handles the conversation
// Customer: "I need running shoes for marathon training"
// Sally: "For marathon training, you'll want shoes with great cushioning.
//         Based on your previous orders (size 10), I'd recommend our
//         CloudStride Pro at $159. Want me to add it to your cart?"

await sally`help ${customer} find running shoes for marathons`
await sally`recommend products based on ${customer}'s purchase history`
```

### AI Merchandising

```typescript
import { priya } from 'agents.do'

// Optimize your store with one line
await priya`which products should be featured on homepage`
await priya`reorder collections by conversion rate`
await priya`find underperforming products with high inventory`

// Chain analysis to action
await priya`products with declining views but good reviews`
  .map(product => shopify`promote ${product} in email campaign`)
```

### AI Dynamic Pricing

```typescript
// Pricing in plain English
await shopify`optimize prices for margin, min 30%, max 40% discount`
await shopify`price headphones competitively vs Amazon`
await shopify`increase price on low-stock items`

// AI adjusts automatically based on:
// - Stock levels (low stock = higher price)
// - Competitor monitoring
// - Purchase intent signals
// - Seasonal demand
```

### AI Email Marketing

```typescript
import { mark } from 'agents.do'

// Generate campaigns naturally
await mark`write abandoned cart sequence - friendly but premium voice`
await mark`win-back email for customers inactive 60 days`

// Automate with pipelining
await shopify`customers who abandoned cart today`
  .map(customer => mark`send recovery email to ${customer}`)

await shopify`VIPs who haven't ordered in 30 days`
  .map(vip => mark`send personalized win-back to ${vip}`)
```

### AI Customer Service

```typescript
import { sally } from 'agents.do'

// Sally handles support naturally
// Customer: "Where's my order? It was supposed to arrive yesterday!"
// Sally: "I see your order is in transit with UPS - weather delay in Memphis.
//         Estimated delivery tomorrow by 5pm. Would you like a 15% discount
//         code for the inconvenience?"

await sally`help ${customer} track order 1001`
await sally`process return request for ${customer}`
await sally`resolve ${ticket} or escalate if needed`
```

## Storefront API

Build any frontend with the same natural syntax:

```typescript
import { shopify } from 'shopify.do'

// Fetch products naturally
const products = await shopify`audio products, first 10`
const featured = await shopify`featured collection`

// Cart operations
await shopify`add headphones to cart`
await shopify`apply SAVE20 to cart`
await shopify`checkout cart with express shipping`
```

### Headless Commerce

Use any frontend framework:

```typescript
// Next.js
export default async function ProductPage({ params }) {
  const product = await shopify`product ${params.handle}`
  return <ProductDetail product={product} />
}

// Remix
export async function loader({ params }) {
  const product = await shopify`product ${params.handle}`
  return json({ product })
}

// Astro
const product = await shopify`product ${Astro.params.handle}`
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

Product pages cached at edge. Cart and checkout run in Durable Objects. Payment processing via any provider. Sub-50ms response times globally.

### Payment Abstraction

```typescript
// Use any processor - just say it
await shopify`use Stripe for payments`
await shopify`enable PayPal checkout`
await shopify`add Apple Pay and Google Pay`
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
await shopify`run storefront at edge, admin at origin`
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
