# Customer Portal

This document covers self-service customer portal patterns, session management, and secure access inspired by Polar's implementation.

## Overview

The customer portal allows customers to self-manage their billing without contacting support. Common self-service actions:

- View and download invoices
- Update payment methods
- Upgrade/downgrade subscriptions
- Cancel subscriptions
- View usage and credits
- Update billing information

## Portal Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your Application                              │
│  ┌─────────────────┐                                                │
│  │  User Dashboard │──────▶ "Manage Billing" button                 │
│  └─────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Create Portal Session       │
                    │   POST /portal/sessions       │
                    └───────────────────────────────┘
                                    │
                                    ▼ Returns URL
                    ┌───────────────────────────────┐
                    │   Redirect to Portal          │
                    │   https://portal.payments.do  │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Customer Self-Service       │
                    │   - View invoices             │
                    │   - Update payment            │
                    │   - Manage subscription       │
                    └───────────────────────────────┘
                                    │
                                    ▼ Done
                    ┌───────────────────────────────┐
                    │   Return to Your App          │
                    │   returnUrl parameter         │
                    └───────────────────────────────┘
```

## Portal Sessions

### Creating a Session

```typescript
import { payments } from 'payments.do'

// Create portal session
const session = await payments.portal.createSession({
  customer: 'cus_123',
  returnUrl: 'https://app.example.com/dashboard'
})

// Redirect customer to portal
redirect(session.url)
// https://portal.payments.do/session/ps_abc123...
```

### Session Options

```typescript
interface PortalSessionOptions {
  // Required: Customer to create session for
  customer: string

  // Where to redirect after portal actions
  returnUrl: string

  // Limit what the customer can do (optional)
  configuration?: PortalConfiguration

  // Pre-select a specific subscription (optional)
  subscription?: string

  // Flow-specific options (optional)
  flowData?: {
    type: 'subscription_cancel' | 'subscription_update' | 'payment_method_update'
    subscriptionId?: string
    priceId?: string
  }
}
```

### Flow-Specific Sessions

```typescript
// Direct to cancellation flow
const cancelSession = await payments.portal.createSession({
  customer: 'cus_123',
  returnUrl: 'https://app.example.com/goodbye',
  flowData: {
    type: 'subscription_cancel',
    subscriptionId: 'sub_abc'
  }
})

// Direct to upgrade flow
const upgradeSession = await payments.portal.createSession({
  customer: 'cus_123',
  returnUrl: 'https://app.example.com/thanks',
  flowData: {
    type: 'subscription_update',
    subscriptionId: 'sub_abc',
    priceId: 'price_enterprise'
  }
})

// Direct to payment method update
const paymentSession = await payments.portal.createSession({
  customer: 'cus_123',
  returnUrl: 'https://app.example.com/dashboard',
  flowData: {
    type: 'payment_method_update'
  }
})
```

## Portal Configuration

### Configuring Portal Features

```typescript
// Create a portal configuration
const config = await payments.portal.configurations.create({
  name: 'Default Portal',

  features: {
    // Invoice history
    invoiceHistory: {
      enabled: true
    },

    // Payment method management
    paymentMethodUpdate: {
      enabled: true
    },

    // Subscription management
    subscriptionUpdate: {
      enabled: true,
      products: ['prod_pro', 'prod_enterprise'], // Allowed products
      prorationBehavior: 'create_prorations'
    },

    // Cancellation
    subscriptionCancel: {
      enabled: true,
      mode: 'at_period_end', // or 'immediately'
      cancellationReason: {
        enabled: true,
        options: [
          'too_expensive',
          'missing_features',
          'switched_service',
          'unused',
          'other'
        ]
      }
    },

    // Subscription pausing
    subscriptionPause: {
      enabled: true,
      maxDuration: 90 // days
    },

    // Customer info update
    customerUpdate: {
      enabled: true,
      allowedUpdates: ['email', 'address', 'tax_id']
    }
  },

  // Branding
  branding: {
    primaryColor: '#5469d4',
    logo: 'https://example.com/logo.png'
  },

  // Terms and privacy
  termsOfServiceUrl: 'https://example.com/terms',
  privacyPolicyUrl: 'https://example.com/privacy'
})

// Use configuration in session
const session = await payments.portal.createSession({
  customer: 'cus_123',
  returnUrl: 'https://app.example.com/dashboard',
  configuration: config.id
})
```

### Product-Specific Configurations

```typescript
// Different portal experience per product tier
const starterConfig = await payments.portal.configurations.create({
  name: 'Starter Portal',
  features: {
    subscriptionUpdate: {
      enabled: true,
      products: ['prod_starter', 'prod_pro', 'prod_enterprise'] // Can upgrade
    },
    subscriptionCancel: {
      enabled: true,
      mode: 'at_period_end'
    }
  }
})

const enterpriseConfig = await payments.portal.configurations.create({
  name: 'Enterprise Portal',
  features: {
    subscriptionUpdate: {
      enabled: false // Must contact sales
    },
    subscriptionCancel: {
      enabled: false // Must contact support
    },
    invoiceHistory: {
      enabled: true
    }
  }
})
```

## Customer Portal Tokens

For embedded portal experiences or API access, use scoped customer tokens.

### Token Types

| Token Type | Prefix | Use Case | TTL |
|------------|--------|----------|-----|
| Portal Session | `ps_` | One-time portal access | 24 hours |
| Customer Token | `cst_` | API access on behalf of customer | Configurable |

### Creating Customer Tokens

```typescript
// Create scoped customer token
const token = await payments.customers.createToken('cus_123', {
  scopes: ['subscriptions:read', 'invoices:read', 'payment_methods:write'],
  expiresIn: 3600 // 1 hour
})

// token.secret: cst_abc123...
// Customer can use this to call API directly
```

### Token Scopes

| Scope | Permission |
|-------|------------|
| `subscriptions:read` | View subscription details |
| `subscriptions:write` | Update/cancel subscriptions |
| `invoices:read` | View and download invoices |
| `payment_methods:read` | View saved payment methods |
| `payment_methods:write` | Add/remove payment methods |
| `usage:read` | View current usage |
| `credits:read` | View credit balance |
| `customer:read` | View customer info |
| `customer:write` | Update customer info |

### Using Customer Tokens

```typescript
// Client-side: Use customer token for embedded UI
const response = await fetch('https://api.payments.do/subscriptions', {
  headers: {
    'Authorization': `Bearer ${customerToken}`
  }
})

// Server validates token and returns only this customer's data
```

## Embedded Portal Components

### React Components

```tsx
import { PaymentsPortal, usePaymentsPortal } from 'payments.do/react'

function BillingPage() {
  const { createSession, isLoading } = usePaymentsPortal()

  const handleManageBilling = async () => {
    const session = await createSession({
      customer: customerId,
      returnUrl: window.location.href
    })
    window.location.href = session.url
  }

  return (
    <button onClick={handleManageBilling} disabled={isLoading}>
      Manage Billing
    </button>
  )
}

// Or use pre-built components
function EmbeddedPortal() {
  return (
    <PaymentsPortal
      customerId={customerId}
      features={['invoices', 'payment_method', 'subscription']}
    />
  )
}
```

### Inline Invoice List

```tsx
import { InvoiceList } from 'payments.do/react'

function InvoicesPage() {
  return (
    <InvoiceList
      customerId={customerId}
      limit={10}
      renderInvoice={(invoice) => (
        <div key={invoice.id}>
          <span>{invoice.number}</span>
          <span>{formatCurrency(invoice.amount)}</span>
          <a href={invoice.pdfUrl}>Download</a>
        </div>
      )}
    />
  )
}
```

### Inline Payment Method Manager

```tsx
import { PaymentMethodManager } from 'payments.do/react'

function PaymentMethodsPage() {
  return (
    <PaymentMethodManager
      customerId={customerId}
      onPaymentMethodAdded={(pm) => console.log('Added:', pm)}
      onPaymentMethodRemoved={(pm) => console.log('Removed:', pm)}
    />
  )
}
```

## Custom Portal Implementation

For complete control, build your own portal using the API.

### Invoice Management

```typescript
// List customer's invoices
const invoices = await payments.invoices.list(customerId)

// Get PDF download URL
const invoice = await payments.invoices.get(invoiceId)
const pdfUrl = invoice.pdfUrl

// Pay open invoice
await payments.invoices.pay(invoiceId)
```

### Payment Method Management

```typescript
// List payment methods
const methods = await payments.paymentMethods.list(customerId)

// Set default payment method
await payments.customers.update(customerId, {
  defaultPaymentMethod: 'pm_card_abc'
})

// Remove payment method
await payments.paymentMethods.detach('pm_card_abc')

// Add new payment method (requires client-side elements)
// See Stripe.js or Elements integration
```

### Subscription Management

```typescript
// Get current subscription
const subscriptions = await payments.subscriptions.list(customerId)
const currentSub = subscriptions[0]

// Preview upgrade
const preview = await payments.subscriptions.previewUpdate(currentSub.id, {
  price: 'price_enterprise'
})
console.log('Upgrade cost:', preview.prorationAmount)

// Apply upgrade
await payments.subscriptions.update(currentSub.id, {
  price: 'price_enterprise'
})

// Cancel at period end
await payments.subscriptions.update(currentSub.id, {
  cancelAtPeriodEnd: true
})

// Reactivate canceled subscription
await payments.subscriptions.update(currentSub.id, {
  cancelAtPeriodEnd: false
})
```

### Usage Dashboard

```typescript
// Get current period usage
const usage = await payments.usage.get(customerId)

// Get usage timeline for charts
const timeline = await payments.usage.timeline(customerId, {
  meter: 'api_calls',
  granularity: 'day',
  start: subDays(new Date(), 30),
  end: new Date()
})

// Get credit balance
const credits = await payments.credits.balance(customerId)
```

## Cancellation Flow

### Retention Offers

```typescript
// When customer initiates cancellation, offer retention
async function handleCancellationRequest(subscriptionId: string) {
  const subscription = await payments.subscriptions.get(subscriptionId)

  // Check eligibility for discount
  if (subscription.metadata.hasUsedDiscount !== 'true') {
    // Offer 50% off for 3 months
    return {
      type: 'offer',
      offer: {
        discount: 50,
        duration: 3,
        message: 'Stay with us! Get 50% off for the next 3 months.'
      }
    }
  }

  // Offer pause instead
  return {
    type: 'offer',
    offer: {
      pause: true,
      duration: 90,
      message: 'Need a break? Pause your subscription for up to 90 days.'
    }
  }
}

// Apply retention offer
async function applyRetentionOffer(subscriptionId: string, offerId: string) {
  const subscription = await payments.subscriptions.get(subscriptionId)

  // Apply coupon
  await payments.subscriptions.update(subscriptionId, {
    coupon: 'cou_retention_50off_3mo'
  })

  // Mark as used
  await payments.subscriptions.update(subscriptionId, {
    metadata: { hasUsedDiscount: 'true' }
  })
}
```

### Exit Survey

```typescript
interface CancellationSurvey {
  reason: string
  feedback?: string
  wouldRecommend?: number
}

async function processCancellation(
  subscriptionId: string,
  survey: CancellationSurvey
) {
  // Store feedback
  await analytics.track('subscription_cancellation', {
    subscriptionId,
    reason: survey.reason,
    feedback: survey.feedback,
    nps: survey.wouldRecommend
  })

  // Cancel subscription
  await payments.subscriptions.update(subscriptionId, {
    cancelAtPeriodEnd: true,
    metadata: {
      cancellationReason: survey.reason,
      cancellationFeedback: survey.feedback
    }
  })

  // Send confirmation email
  await sendCancellationConfirmation(subscriptionId)
}
```

## Security Considerations

### Session Security

```typescript
// Sessions are single-use and time-limited
const session = await payments.portal.createSession({
  customer: 'cus_123',
  returnUrl: 'https://app.example.com/dashboard'
})

// Session expires after:
// - First use
// - 24 hours (configurable)
// - Customer logout

// Verify session hasn't been tampered with
// (done automatically by portal)
```

### Token Security

```typescript
// Customer tokens have limited scope
const token = await payments.customers.createToken('cus_123', {
  scopes: ['invoices:read'], // Minimal scope
  expiresIn: 300 // 5 minutes - as short as possible
})

// Tokens are revocable
await payments.customers.revokeToken(tokenId)

// Tokens are tied to customer
// Cannot be used to access other customers' data
```

### Preventing Unauthorized Access

```typescript
// Always verify customer ownership before creating session
async function createPortalSession(userId: string) {
  // Get customer ID from your database
  const user = await db.users.get(userId)
  if (!user?.stripeCustomerId) {
    throw new Error('No billing account')
  }

  // Verify this user owns this customer
  const customer = await payments.customers.get(user.stripeCustomerId)
  if (customer.metadata.userId !== userId) {
    throw new Error('Unauthorized')
  }

  return payments.portal.createSession({
    customer: user.stripeCustomerId,
    returnUrl: 'https://app.example.com/dashboard'
  })
}
```

## Implementation Checklist

### Portal Sessions

- [ ] Create session endpoint
- [ ] Configure portal features
- [ ] Handle return URL
- [ ] Implement flow-specific sessions

### Self-Service Features

- [ ] Invoice history and downloads
- [ ] Payment method management
- [ ] Subscription upgrades/downgrades
- [ ] Subscription cancellation with survey
- [ ] Usage dashboard
- [ ] Credit balance view

### Security

- [ ] Verify customer ownership
- [ ] Use minimal token scopes
- [ ] Implement session expiration
- [ ] Log all portal actions

### Analytics

- [ ] Track portal usage
- [ ] Monitor cancellation reasons
- [ ] Measure retention offer effectiveness
- [ ] A/B test cancellation flows

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall payments architecture
- [SUBSCRIPTIONS.md](./SUBSCRIPTIONS.md) - Subscription billing
- [WEBHOOKS.md](./WEBHOOKS.md) - Event handling patterns
- [METERED-BILLING.md](./METERED-BILLING.md) - Usage-based billing
