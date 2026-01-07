# waitlist.as

**Turn anticipation into your unfair advantage.**

```bash
npm install waitlist.as
```

---

## You're Not Ready to Launch. But You Need to Start Now.

Your product isn't finished. But you know it will be great.

The worst thing you could do? Build in silence and hope people show up on launch day.

The best thing you could do? **Start building your audience today.**

But building a waitlist from scratch means:
- Setting up forms and databases
- Building referral tracking
- Managing email notifications
- Creating shareable landing pages
- Analyzing who's actually interested

**Or you could do it in 5 minutes.**

## Turn Waiting Into Wanting

```typescript
import { waitlist } from 'waitlist.as'

const list = await waitlist.create({
  name: 'my-launch',
  title: 'Be the first to try the future of [X]',
  referralBonus: 5  // Move up 5 spots per referral
})

// Someone signs up
const entry = await waitlist.join('my-launch', {
  email: 'eager@customer.com'
})

console.log(`You're #${entry.position}! Share ${entry.referralCode} to move up.`)
```

**waitlist.as** gives you:
- Viral referral mechanics built in
- Beautiful, hosted signup pages
- Real-time position tracking
- Automated email notifications
- Analytics on your future customers

## Build Your Launch List in 3 Steps

### 1. Create Your Waitlist

```typescript
import { waitlist } from 'waitlist.as'

const list = await waitlist.create({
  name: 'product-launch',
  title: 'Join 2,000+ founders waiting for [Product]',
  description: 'Be first to access the tool that will 10x your productivity',
  referralBonus: 10,
  notifications: {
    welcome: true,
    positionUpdate: true,
    invited: true
  }
})

console.log(`Signup page: ${list.url}`)
```

### 2. Watch It Grow

```typescript
// Check your waitlist growth
const metrics = await waitlist.metrics('product-launch')
console.log(`${metrics.totalSignups} signups`)
console.log(`${metrics.referralRate}% came from referrals`)

// See your top advocates
for (const referrer of metrics.topReferrers) {
  console.log(`${referrer.email}: ${referrer.count} referrals`)
}
```

### 3. Launch to Your True Fans

```typescript
// Invite your most engaged users first
const invited = await waitlist.invite('product-launch', {
  count: 100,
  minReferrals: 3  // Invite people who brought friends
})

// They're your best customers before they've even paid
```

## Why Waitlists Win

**Without a waitlist:**
- Launch to crickets
- No validation until it's too late
- Zero buzz, zero momentum
- Customers who've never heard of you

**With waitlist.as:**
- Thousands eager for launch day
- Early signal on product-market fit
- Built-in viral growth
- Customers who feel invested in your success

## Everything You Need to Build Anticipation

```typescript
// Custom fields for segmentation
await waitlist.create({
  name: 'beta',
  fields: [
    { name: 'role', type: 'select', options: ['Developer', 'Designer', 'Founder'] },
    { name: 'company', type: 'text' }
  ]
})

// Check where someone is
const position = await waitlist.position('beta', 'user@example.com')

// Export for your launch campaign
const csv = await waitlist.export('beta', 'csv')

// Close when you're ready
await waitlist.close('beta')
```

## Your Launch Starts Before Your Product

The best launches aren't luck. They're engineered.

**Start building your audience today. Launch to fans, not strangers.**

```bash
npm install waitlist.as
```

[Start your waitlist at waitlist.as](https://waitlist.as)

---

MIT License
