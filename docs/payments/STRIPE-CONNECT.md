# Stripe Connect Implementation Guide

> **Express accounts for marketplace payouts**

This document details our Stripe Connect integration for the payments.do platform, enabling organizations to receive payouts from their customers.

## Overview

payments.do uses **Stripe Connect Express** accounts because:

1. **Fastest onboarding** - Stripe hosts the onboarding UI
2. **Compliance handled** - Stripe manages KYC/identity verification
3. **Minimal integration** - We focus on business logic, not compliance
4. **Platform control** - We control when payouts happen

---

## Account Lifecycle

### Status Flow

```
CREATED → ONBOARDING_STARTED → UNDER_REVIEW → ACTIVE
                                    ↓
                                 DENIED
```

### Account Model

```typescript
interface ConnectedAccount {
  id: string
  organizationId: string

  // Stripe references
  stripeAccountId: string

  // Status tracking
  status: AccountStatus
  isDetailsSubmitted: boolean
  isChargesEnabled: boolean
  isPayoutsEnabled: boolean

  // Account details
  country: string           // 2-char ISO code
  currency: string          // Default payout currency
  businessType?: string

  // Billing info (for invoices)
  billingName?: string
  billingAddress?: Address

  // Platform fees (overrides)
  platformFeePercent?: number
  platformFeeFixed?: number
  processorFeesApplicable: boolean

  // Credit system
  creditBalance: number

  createdAt: Date
  modifiedAt: Date
}

type AccountStatus =
  | 'created'
  | 'onboarding_started'
  | 'under_review'
  | 'active'
  | 'denied'
```

---

## Onboarding Flow

### 1. Create Connected Account

```typescript
async function createConnectedAccount(
  stripe: Stripe,
  organizationId: string,
  country: string
): Promise<ConnectedAccount> {
  // Create Stripe Express account
  const stripeAccount = await stripe.accounts.create({
    type: 'express',
    country,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    metadata: {
      organization_id: organizationId
    }
  })

  // Store in our database
  const account = await db.insert('connected_accounts', {
    id: crypto.randomUUID(),
    organizationId,
    stripeAccountId: stripeAccount.id,
    status: 'created',
    country,
    currency: getDefaultCurrency(country),
    isDetailsSubmitted: false,
    isChargesEnabled: false,
    isPayoutsEnabled: false,
    createdAt: new Date()
  })

  return account
}
```

### 2. Generate Onboarding Link

```typescript
async function createOnboardingLink(
  stripe: Stripe,
  account: ConnectedAccount,
  returnUrl: string
): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: account.stripeAccountId,
    refresh_url: `${returnUrl}?refresh=true`,
    return_url: `${returnUrl}?success=true`,
    type: 'account_onboarding'
  })

  // Update status
  await db.update('connected_accounts', account.id, {
    status: 'onboarding_started'
  })

  return accountLink.url
}
```

### 3. Handle Onboarding Completion (Webhook)

```typescript
async function handleAccountUpdated(
  event: Stripe.Event
): Promise<void> {
  const stripeAccount = event.data.object as Stripe.Account

  const account = await db.query(
    'SELECT * FROM connected_accounts WHERE stripe_account_id = ?',
    [stripeAccount.id]
  ).first()

  if (!account) return

  // Determine new status
  let status: AccountStatus = account.status

  if (stripeAccount.details_submitted) {
    if (stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
      status = 'active'
    } else if (
      stripeAccount.requirements?.disabled_reason?.includes('rejected')
    ) {
      status = 'denied'
    } else {
      status = 'under_review'
    }
  }

  // Update our records
  await db.update('connected_accounts', account.id, {
    status,
    isDetailsSubmitted: stripeAccount.details_submitted,
    isChargesEnabled: stripeAccount.charges_enabled,
    isPayoutsEnabled: stripeAccount.payouts_enabled,
    modifiedAt: new Date()
  })
}
```

---

## Payment Collection

### Destination Charges

For customer payments that should be split with connected account:

```typescript
async function createDestinationCharge(
  stripe: Stripe,
  options: {
    amount: number
    currency: string
    customerId: string
    connectedAccountId: string
    applicationFeeAmount: number
    metadata?: Record<string, string>
  }
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: options.amount,
    currency: options.currency,
    customer: options.customerId,
    application_fee_amount: options.applicationFeeAmount,
    transfer_data: {
      destination: options.connectedAccountId
    },
    metadata: options.metadata
  })
}
```

### Direct Charges (On-Behalf-Of)

For charges made directly on connected account:

```typescript
async function createDirectCharge(
  stripe: Stripe,
  connectedAccountId: string,
  options: {
    amount: number
    currency: string
    paymentMethodId: string
    applicationFeeAmount: number
  }
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: options.amount,
    currency: options.currency,
    payment_method: options.paymentMethodId,
    application_fee_amount: options.applicationFeeAmount,
    confirm: true
  }, {
    stripeAccount: connectedAccountId
  })
}
```

---

## Payout System

### Two-Step Payout Process

Following Polar's pattern for safety and reliability:

```
Step 1: Transfer (Platform → Connected Account)
        ↓
        [Wait for balance to settle - 24h minimum]
        ↓
Step 2: Payout (Connected Account → Bank)
```

### Payout Model

```typescript
interface Payout {
  id: string
  accountId: string

  // Status
  status: 'pending' | 'in_transit' | 'succeeded' | 'failed'
  paidAt?: Date

  // Platform perspective (USD)
  currency: string
  amount: number
  feesAmount: number

  // Account perspective (may differ)
  accountCurrency: string
  accountAmount: number

  // Stripe references
  transferId?: string
  processorId?: string      // Stripe payout ID

  // Invoice
  invoiceNumber: string
  invoicePath?: string

  createdAt: Date
  modifiedAt: Date
}
```

### Step 1: Create Payout & Transfer

```typescript
async function createPayout(
  env: Env,
  accountId: string
): Promise<Payout> {
  // Acquire distributed lock
  const lockDO = env.PAYOUT_LOCK.get(env.PAYOUT_LOCK.idFromName(accountId))
  const acquired = await lockDO.fetch(
    new Request('https://lock/acquire', {
      method: 'POST',
      body: JSON.stringify({ timeout: 60000 })
    })
  ).then(r => r.json())

  if (!acquired.success) {
    throw new Error('Payout already in progress')
  }

  try {
    // Verify account eligibility
    const account = await db.query(
      'SELECT * FROM connected_accounts WHERE id = ?',
      [accountId]
    ).first()

    if (account.status !== 'active' || !account.isPayoutsEnabled) {
      throw new Error('Account not ready for payouts')
    }

    // Calculate balance
    const balance = await getAccountBalance(env.DB, accountId)
    const minPayout = getMinimumPayout(account.currency)

    if (balance < minPayout) {
      throw new Error(`Insufficient balance. Minimum: ${minPayout}`)
    }

    // Calculate fees
    const fees = calculatePayoutFees(balance, account.country)
    const netAmount = balance - fees.total

    // Create payout record
    const payoutId = crypto.randomUUID()
    const invoiceNumber = await getNextInvoiceNumber(env.DB, accountId)

    await db.insert('payouts', {
      id: payoutId,
      accountId,
      status: 'pending',
      currency: 'usd',
      amount: netAmount,
      feesAmount: fees.total,
      accountCurrency: account.currency,
      accountAmount: netAmount, // Updated after transfer
      invoiceNumber,
      createdAt: new Date()
    })

    // Create fee transactions (ledger entries)
    await createFeeTransactions(env.DB, payoutId, accountId, fees)

    // Queue async transfer
    await env.PAYOUT_QUEUE.send({
      type: 'payout.transfer',
      payoutId,
      accountId,
      stripeAccountId: account.stripeAccountId,
      amount: netAmount
    })

    return await db.query(
      'SELECT * FROM payouts WHERE id = ?',
      [payoutId]
    ).first()

  } finally {
    // Release lock
    await lockDO.fetch(
      new Request('https://lock/release', { method: 'POST' })
    )
  }
}
```

### Step 1b: Execute Transfer (Async)

```typescript
async function executeTransfer(
  env: Env,
  payoutId: string
): Promise<void> {
  const payout = await db.query(
    'SELECT p.*, a.stripe_account_id FROM payouts p
     JOIN connected_accounts a ON p.account_id = a.id
     WHERE p.id = ?',
    [payoutId]
  ).first()

  const stripe = new Stripe(env.STRIPE_SECRET_KEY)

  // Create transfer with idempotency key
  const transfer = await stripe.transfers.create({
    amount: payout.amount,
    currency: payout.currency,
    destination: payout.stripeAccountId,
    metadata: {
      payout_id: payoutId
    }
  }, {
    idempotencyKey: `payout-transfer-${payoutId}`
  })

  // Handle currency conversion
  let accountAmount = payout.amount

  if (payout.currency !== payout.accountCurrency) {
    // Get actual converted amount from Stripe
    const destinationCharge = await stripe.charges.retrieve(
      transfer.destination_payment as string,
      { expand: ['balance_transaction'] },
      { stripeAccount: payout.stripeAccountId }
    )

    if (destinationCharge.balance_transaction) {
      const bt = destinationCharge.balance_transaction as Stripe.BalanceTransaction
      accountAmount = bt.amount
    }
  }

  // Update payout with transfer details
  await db.update('payouts', payoutId, {
    transferId: transfer.id,
    accountAmount,
    modifiedAt: new Date()
  })
}
```

### Step 2: Trigger Payout (Scheduled)

```typescript
// Runs every 15 minutes via cron trigger
async function triggerPendingPayouts(env: Env): Promise<void> {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY)

  // Find pending payouts older than 24h (balance settlement time)
  const payoutDelay = 24 * 60 * 60 * 1000 // 24 hours
  const cutoff = new Date(Date.now() - payoutDelay)

  const pendingPayouts = await db.query(`
    SELECT p.*, a.stripe_account_id
    FROM payouts p
    JOIN connected_accounts a ON p.account_id = a.id
    WHERE p.status = 'pending'
      AND p.transfer_id IS NOT NULL
      AND p.processor_id IS NULL
      AND p.created_at < ?
    ORDER BY p.created_at ASC
    LIMIT 100
  `, [cutoff.toISOString()]).all()

  for (const payout of pendingPayouts.results) {
    try {
      // Check connected account balance
      const balance = await stripe.balance.retrieve({
        stripeAccount: payout.stripeAccountId
      })

      const available = balance.available.find(
        b => b.currency === payout.accountCurrency.toLowerCase()
      )

      if (!available || available.amount < payout.accountAmount) {
        console.log(`Insufficient balance for payout ${payout.id}`)
        continue
      }

      // Create the actual payout
      const stripePayout = await stripe.payouts.create({
        amount: payout.accountAmount,
        currency: payout.accountCurrency,
        metadata: {
          payout_id: payout.id
        }
      }, {
        stripeAccount: payout.stripeAccountId,
        idempotencyKey: `payout-${payout.id}`
      })

      // Update status
      await db.update('payouts', payout.id, {
        processorId: stripePayout.id,
        status: 'in_transit',
        modifiedAt: new Date()
      })

    } catch (error) {
      console.error(`Failed to trigger payout ${payout.id}:`, error)
    }
  }
}
```

### Handle Payout Webhook

```typescript
async function handlePayoutPaid(
  event: Stripe.Event
): Promise<void> {
  const stripePayout = event.data.object as Stripe.Payout

  const payout = await db.query(
    'SELECT * FROM payouts WHERE processor_id = ?',
    [stripePayout.id]
  ).first()

  if (!payout) return

  await db.update('payouts', payout.id, {
    status: stripePayout.status === 'paid' ? 'succeeded' : 'failed',
    paidAt: stripePayout.arrival_date
      ? new Date(stripePayout.arrival_date * 1000)
      : null,
    modifiedAt: new Date()
  })

  // Emit webhook event
  await emitWebhookEvent(payout.accountId, 'payout.paid', payout)
}
```

---

## Fee Calculation

### Fee Structure

```typescript
const US_FEES = {
  payoutFeePercent: 0.25,   // 0.25%
  payoutFeeFlat: 25,        // $0.25
  transferFeePercent: 0     // No cross-border for US
}

const COUNTRY_FEES: Record<string, typeof US_FEES> = {
  US: US_FEES,
  CA: { ...US_FEES, transferFeePercent: 0.25 },
  GB: { ...US_FEES, transferFeePercent: 0.25 },
  EU: { ...US_FEES, transferFeePercent: 0.25 },
  // ... other countries
}
```

### Reverse Fee Calculation

Given a target payout amount, calculate what fees are needed:

```typescript
function calculatePayoutFees(
  amount: number,
  country: string
): { transferFee: number; payoutFee: number; total: number } {
  const fees = COUNTRY_FEES[country] || COUNTRY_FEES.US

  const p1 = fees.transferFeePercent / 100
  const p2 = US_FEES.payoutFeePercent / 100
  const f2 = US_FEES.payoutFeeFlat

  // Reverse calculation formula
  // x + (x * p1) + (x - (x * p1)) * p2 + f2 = target
  // Solving for x:
  const reversedAmount = Math.floor(
    (f2 - amount) / (p2 * p1 - p1 - p2 - 1)
  )

  if (reversedAmount <= 0) {
    throw new Error('Amount too low for payout after fees')
  }

  const transferFee = Math.ceil(reversedAmount * p1)
  const payoutFee = amount - reversedAmount - transferFee

  return {
    transferFee,
    payoutFee,
    total: transferFee + payoutFee
  }
}
```

### Fee Override System

Accounts can have custom fee structures:

```typescript
function getAccountFees(account: ConnectedAccount): FeeConfig {
  return {
    platformFeePercent: account.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT,
    platformFeeFixed: account.platformFeeFixed ?? DEFAULT_PLATFORM_FEE_FIXED,
    processorFeesApplicable: account.processorFeesApplicable
  }
}
```

---

## Balance & Transaction Ledger

### Transaction Types

```typescript
type TransactionType =
  | 'payment'           // Customer payment received
  | 'processor_fee'     // Stripe processing fee
  | 'platform_fee'      // Our platform fee
  | 'refund'           // Refund to customer
  | 'dispute'          // Chargeback
  | 'balance'          // Balance transfer (paired entries)
  | 'payout'           // Payout to connected account
```

### Balance Calculation

```typescript
async function getAccountBalance(
  db: D1Database,
  accountId: string
): Promise<number> {
  const result = await db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as balance
    FROM transactions
    WHERE account_id = ?
      AND type != 'payout'
  `).bind(accountId).first<{ balance: number }>()

  return result?.balance ?? 0
}
```

### Creating Fee Transactions

```typescript
async function createFeeTransactions(
  db: D1Database,
  payoutId: string,
  accountId: string,
  fees: { transferFee: number; payoutFee: number }
): Promise<void> {
  const correlationKey = crypto.randomUUID()

  // Transfer fee transaction (debit from account)
  if (fees.transferFee > 0) {
    await db.insert('transactions', {
      id: crypto.randomUUID(),
      accountId,
      type: 'balance',
      platformFeeType: 'transfer',
      amount: -fees.transferFee,
      currency: 'usd',
      payoutId,
      balanceCorrelationKey: correlationKey,
      createdAt: new Date()
    })
  }

  // Payout fee transaction (debit from account)
  if (fees.payoutFee > 0) {
    await db.insert('transactions', {
      id: crypto.randomUUID(),
      accountId,
      type: 'balance',
      platformFeeType: 'payout',
      amount: -fees.payoutFee,
      currency: 'usd',
      payoutId,
      balanceCorrelationKey: correlationKey,
      createdAt: new Date()
    })
  }
}
```

---

## Webhook Handling

### Required Webhooks

Configure these Stripe webhook events:

**Standard Webhooks (Platform):**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.succeeded`
- `charge.failed`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

**Connect Webhooks (Connected Accounts):**
- `account.updated`
- `payout.paid`
- `payout.failed`

### Webhook Endpoint

```typescript
export async function handleStripeWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  const signature = request.headers.get('stripe-signature')
  const body = await request.text()

  const stripe = new Stripe(env.STRIPE_SECRET_KEY)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    return new Response('Invalid signature', { status: 400 })
  }

  // Route to handler
  switch (event.type) {
    case 'account.updated':
      await handleAccountUpdated(event)
      break
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event)
      break
    case 'payout.paid':
      await handlePayoutPaid(event)
      break
    // ... other handlers
  }

  return new Response(JSON.stringify({ received: true }))
}
```

---

## Invoice Generation

### Payout Invoice

```typescript
async function generatePayoutInvoice(
  env: Env,
  payoutId: string
): Promise<string> {
  const payout = await db.query(`
    SELECT p.*, a.billing_name, a.billing_address
    FROM payouts p
    JOIN connected_accounts a ON p.account_id = a.id
    WHERE p.id = ?
  `, [payoutId]).first()

  if (payout.status !== 'succeeded') {
    throw new Error('Can only generate invoice for succeeded payouts')
  }

  // Get fee transactions
  const fees = await db.query(`
    SELECT * FROM transactions
    WHERE payout_id = ? AND platform_fee_type IS NOT NULL
  `, [payoutId]).all()

  // Generate PDF
  const pdf = await generatePDF({
    title: 'Payout Invoice',
    invoiceNumber: payout.invoiceNumber,
    date: payout.paidAt,
    billingDetails: {
      name: payout.billingName,
      address: payout.billingAddress
    },
    items: [
      { description: 'Gross earnings', amount: payout.amount + payout.feesAmount },
      ...fees.results.map(fee => ({
        description: `${fee.platformFeeType} fee`,
        amount: -fee.amount
      })),
      { description: 'Net payout', amount: payout.amount, bold: true }
    ],
    total: payout.amount
  })

  // Store in R2
  const key = `payout-invoices/${payout.accountId}/${payout.id}.pdf`
  await env.INVOICES_BUCKET.put(key, pdf, {
    customMetadata: { payoutId }
  })

  // Update payout record
  await db.update('payouts', payoutId, {
    invoicePath: key,
    modifiedAt: new Date()
  })

  return key
}
```

---

## API Endpoints

### Account Management

```typescript
// Create connected account
POST /v1/accounts
{
  "country": "US"
}

// Get onboarding link
POST /v1/accounts/{id}/onboarding-link
{
  "return_url": "https://app.example.com/settings"
}

// Get dashboard link (for existing accounts)
POST /v1/accounts/{id}/dashboard-link
```

### Payouts

```typescript
// Get payout estimate
GET /v1/payouts/estimate

// Create payout
POST /v1/payouts

// List payouts
GET /v1/payouts

// Get payout details
GET /v1/payouts/{id}

// Get payout invoice
GET /v1/payouts/{id}/invoice

// Generate payout invoice
POST /v1/payouts/{id}/invoice
```

---

## Security Considerations

1. **Idempotency Keys** - All Stripe API calls use idempotency keys to prevent duplicates
2. **Distributed Locking** - Payout creation uses locks to prevent race conditions
3. **Balance Verification** - Always verify balance before payouts
4. **Webhook Signature Verification** - All webhooks verified with Stripe signatures
5. **Account Status Checks** - Only process payouts for active accounts
6. **Payout Delays** - 24h minimum delay ensures balance settlement

---

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `AccountNotActive` | Account not fully onboarded | Complete onboarding |
| `InsufficientBalance` | Balance below minimum | Wait for more earnings |
| `PayoutInProgress` | Another payout being processed | Wait and retry |
| `AccountRestricted` | Stripe restricted account | Contact Stripe support |
| `TransferFailed` | Transfer to connected account failed | Check Stripe dashboard |

### Retry Strategy

```typescript
const PAYOUT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config = PAYOUT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error
  let delay = config.initialDelayMs

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Don't retry on permanent errors
      if (isPermanentError(error)) {
        throw error
      }

      await sleep(delay)
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs)
    }
  }

  throw lastError!
}
```

---

## References

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Express Accounts](https://stripe.com/docs/connect/express-accounts)
- [Stripe Transfers](https://stripe.com/docs/connect/separate-charges-and-transfers)
- [Stripe Payouts](https://stripe.com/docs/connect/payouts)
