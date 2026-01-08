# customerio.do

> Marketing Automation. Edge-Native. Natural Language. AI-First.

Customer.io charges $150/month for 12,000 profiles. Their API requires configuration objects, event schemas, and workflow builders. Every integration is a developer task.

**customerio.do** is the open-source alternative. Natural language. Deploy in seconds. Talk to it like a marketer.

## AI-Native API

```typescript
import { customerio } from 'customerio.do'           // Full SDK
import { customerio } from 'customerio.do/tiny'      // Minimal client
import { customerio } from 'customerio.do/segments'  // Segments-only
```

Natural language for marketing automation:

```typescript
import { customerio } from 'customerio.do'

// Talk to it like a colleague
await customerio`user-123 signed up from Google Ads`
await customerio`alice@example.com upgraded to Pro`
await customerio`send welcome sequence to users signed up today`

// Chain like sentences
await customerio`users who abandoned cart`
  .notify('Complete your purchase - 10% off!')

// Campaigns that write themselves
await customerio`users inactive for 30 days`
  .map(user => customerio`win back ${user}`)
```

## The Problem

Customer.io dominates marketing automation alongside Braze and Iterable:

| What Customer.io Charges | The Reality |
|--------------------------|-------------|
| **Essentials** | $100/month for 5,000 profiles |
| **Premium** | $1,000+/month |
| **Per-Message** | Overage charges on email/SMS |
| **Enterprise** | Custom pricing (read: expensive) |
| **Integration** | Developers write event tracking |
| **Vendor Lock-in** | Data trapped in their platform |

### The Integration Tax

Every marketing tool requires:

- Schema definitions for events
- Code changes for tracking
- Developer time for campaigns
- Platform-specific syntax

Marketers can't move without engineering help.

### The Configuration Hell

```typescript
// OLD: Customer.io SDK (verbose, developer-only)
await cio.identify('user_123', {
  email: 'alice@example.com',
  name: 'Alice',
  plan: 'pro',
  created_at: Date.now()
})

await cio.track('user_123', 'order_placed', {
  order_id: 'order_456',
  amount: 99.99,
  items: [{ sku: 'widget-1', qty: 2 }]
})
```

Nobody talks like that. A marketer would say: "Alice placed a $100 order."

## The Solution

**customerio.do** reimagines marketing automation:

```
Customer.io                         customerio.do
-----------------------------------------------------------------
$100-1000+/month                    $0 - run your own
Configuration objects               Natural language
Developer-required                  Marketer-friendly
Proprietary workflows               Cloudflare Workflows
Data trapped                        Your Cloudflare account
Weeks to integrate                  Deploy in seconds
```

## One-Click Deploy

```bash
npx create-dotdo customerio
```

A complete marketing automation platform. Running on infrastructure you control.

```typescript
import { CustomerIO } from 'customerio.do'

export default CustomerIO({
  name: 'my-startup',
  domain: 'marketing.my-startup.com',
})
```

## Features

### User Tracking

```typescript
// Just describe what happened
await customerio`user-123 signed up from Google Ads`
await customerio`alice@example.com is on the Pro plan`
await customerio`bob viewed pricing page 3 times today`

// AI infers what you need
await customerio`user-123`               // returns user profile
await customerio`user-123 activity`      // returns event history
await customerio`users from Twitter`     // returns segment
```

### Events

```typescript
// Natural event tracking
await customerio`alice placed a $99 order`
await customerio`bob abandoned cart with 3 items`
await customerio`user-123 used the export feature`

// Batch events read like a log
await customerio`
  alice upgraded to Pro
  bob canceled subscription
  charlie started trial
`
```

### Segments

```typescript
// Query your audience like a database
await customerio`users who signed up this week`
await customerio`Pro users who haven't logged in for 30 days`
await customerio`users from Google Ads with no purchase`

// Segments that update themselves
await customerio`active Pro users`
  .count()  // real-time membership

await customerio`cart abandoners from yesterday`
  .each(user => customerio`remind ${user} about cart`)
```

### Campaigns

```typescript
// Trigger campaigns naturally
await customerio`send welcome email to alice@example.com`
await customerio`start onboarding sequence for new signups`
await customerio`notify Pro users about the new feature`

// Multi-step journeys
await customerio`users who signed up today`
  .notify('Welcome! Here is how to get started...')
  .wait('3 days')
  .notify('Have you tried our export feature?')
  .wait('7 days')
  .notify('Ready to upgrade to Pro?')
```

### Multi-Channel Delivery

```typescript
// Just say what you want
await customerio`email alice about the sale`
await customerio`push notification to mobile users`
await customerio`SMS bob about order shipped`

// Automatic fallback
await customerio`notify alice about new feature`
  // Tries push, falls back to email, then SMS
```

### Templates

```typescript
// AI writes personalized content
await customerio`welcome email for Pro users`
  // Generates context-aware template

// Or preview with data
await customerio`preview welcome email for alice`
```

## Promise Pipelining

Chain operations without waiting:

```typescript
// One network round trip
const campaigns = await customerio`users from Google Ads this week`
  .map(user => customerio`send welcome sequence to ${user}`)
  .map(result => customerio`track ${result} delivery status`)

// Parallel outreach
await customerio`inactive Pro users`
  .map(user => [
    customerio`email ${user} win-back offer`,
    customerio`push ${user} reminder`,
  ])
```

## Architecture

```
Internet --> Cloudflare Worker --> Durable Object --> SQLite
                  |                     |                |
             Edge Routing          Customer Data     User Profiles
                                   Event History     Segments
                                   Campaign State    Preferences
```

### Durable Object per Workspace

```
CustomerIODO (config, channels, templates)
  |
  +-- UsersDO (profiles, attributes)
  |     |-- SQLite: User records
  |     +-- R2: Profile data
  |
  +-- EventsDO (tracking, history)
  |     |-- SQLite: Event stream
  |     +-- R2: Event archive
  |
  +-- SegmentsDO (audiences, rules)
  |     |-- SQLite: Segment definitions
  |
  +-- CampaignsDO (journeys, workflows)
        |-- SQLite: Campaign state
        +-- CF Workflows: Journey engine
```

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active users, recent events | <10ms |
| **Warm** | R2 + SQLite Index | Historical events (30-90 days) | <100ms |
| **Cold** | R2 Archive | Compliance retention (1+ years) | <1s |

## vs Customer.io

| Feature | Customer.io | customerio.do |
|---------|-------------|---------------|
| **Pricing** | $100-1000+/month | ~$10/month |
| **API Style** | Configuration objects | Natural language |
| **Setup** | Developer required | Marketer-friendly |
| **Workflows** | Proprietary builder | Cloudflare Workflows |
| **Data Location** | Their cloud | Your Cloudflare account |
| **Customization** | Limited | Code it yourself |
| **Lock-in** | Data export fees | MIT licensed |

## Use Cases

### Product-Led Growth

```typescript
// Trial conversion automation
await customerio`users on day 7 of trial who haven't activated`
  .notify('Need help getting started?')
  .wait('3 days')
  .notify('Your trial ends soon - upgrade now for 20% off')

// Feature adoption
await customerio`Pro users who never used export`
  .notify('Did you know you can export your data?')
```

### E-Commerce

```typescript
// Cart recovery
await customerio`cart abandoners in the last hour`
  .wait('1 hour')
  .notify('You left something behind!')
  .wait('24 hours')
  .notify('Still thinking about it? Here is 10% off')

// Post-purchase
await customerio`customers who ordered today`
  .notify('Your order is confirmed!')
  .wait('3 days')
  .notify('How was your experience? Leave a review')
```

### SaaS Onboarding

```typescript
// Welcome sequence
await customerio`new signups`
  .notify('Welcome! Here is how to get started')
  .wait('1 day')
  .notify('Have you completed your first project?')
  .wait('3 days')
  .notify('Meet the features that power users love')

// Re-engagement
await customerio`users inactive for 30 days`
  .notify('We miss you! Here is what is new')
```

## AI-Native Marketing

### Audience Discovery

```typescript
// AI finds your best audiences
await customerio`users most likely to convert`
await customerio`customers at risk of churning`
await customerio`users who would benefit from Pro`
```

### Content Generation

```typescript
// AI writes the copy
await customerio`write win-back email for churned Pro users`
await customerio`generate subject lines for cart abandonment`
await customerio`personalize welcome email for alice`
```

### Campaign Optimization

```typescript
// AI optimizes timing and content
await customerio`best time to email alice`
await customerio`which subject line performs better for Pro users`
await customerio`optimize cart abandonment sequence`
```

## Multi-Agent Marketing

Every AI agent gets their own marketing instance:

```typescript
import { mark, sally } from 'agents.do'
import { customerio } from 'customerio.do'

// Mark handles marketing campaigns
await mark`announce the new feature to Pro users`
  // Uses customerio under the hood

// Sally handles sales outreach
await sally`reach out to trial users about to expire`
  // Different campaigns, same platform
```

## The workers.do Platform

customerio.do is a core service of [workers.do](https://workers.do) - the platform for building Autonomous Startups.

```typescript
import { priya, ralph, tom, mark } from 'agents.do'

// AI agents with marketing built in
await mark`launch announcement for AI Assistant`
await sally`follow up with leads from the webinar`
await priya`notify beta users about the new feature`
```

Both kinds of workers. Working for you.

## Roadmap

### Core Features
- [x] User Profiles
- [x] Event Tracking
- [x] Dynamic Segments
- [x] Multi-Channel Delivery
- [x] Campaign Workflows
- [ ] A/B Testing
- [ ] Predictive Analytics

### Channels
- [x] Email (via Resend/Postmark)
- [x] Push Notifications
- [x] SMS (via Twilio)
- [x] In-App Messages
- [ ] WhatsApp
- [ ] Slack

### AI
- [x] Natural Language Queries
- [x] Content Generation
- [ ] Send Time Optimization
- [ ] Churn Prediction
- [ ] Audience Discovery

## Contributing

customerio.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/customerio.do
cd customerio.do
pnpm install
pnpm test
```

## License

MIT License - Marketing automation for everyone.

---

<p align="center">
  <strong>Talk to your marketing platform.</strong>
  <br />
  Natural language. Edge-native. AI-first.
  <br /><br />
  <a href="https://customerio.do">Website</a> |
  <a href="https://docs.customerio.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/customerio.do">GitHub</a>
</p>
