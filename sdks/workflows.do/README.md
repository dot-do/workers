# workflows.do

**Orchestrate anything. Break nothing.**

```bash
npm install workflows.do
```

---

## Your Business Logic Is Trapped in Chaos

You have complex processes that need to run reliably. Customer onboarding. Order fulfillment. Data pipelines. Approval chains.

But orchestrating multi-step processes means:
- Scattered logic across services that nobody understands
- Silent failures that corrupt your data
- State that lives in your head, not your code
- Debugging production issues at 2am with no visibility
- Building retry logic, rollbacks, and recovery from scratch

**Your workflows deserve better than spaghetti and prayer.**

## What If Workflows Just Worked?

```typescript
import { workflows } from 'workflows.do'

// Describe what you want in plain English
const onboarding = await workflows.do`
  When a customer signs up, send a welcome email,
  wait 3 days, then send onboarding tips,
  wait 7 days, then check if they're active
`

// Or define with full control
const fulfillment = workflows.define($ => {
  $.on.Order.placed(async (order, $) => {
    await $.do('Payment.validate', order)
    await $.do('Inventory.reserve', order.items)
    await $.send('Email.confirmation', { orderId: order.id })
  })
})

// Start and forget - it's durable
await workflows.start('onboarding', { email: 'alice@example.com' })
```

**workflows.do** gives you:
- Durable execution that survives failures and restarts
- Natural language workflow definition
- Event-driven orchestration with `$.on` and `$.every`
- Built-in retries, delays, and error handling
- Full visibility into every step

## Orchestrate in 3 Steps

### 1. Define Your Workflow

```typescript
import { workflows } from 'workflows.do'

// Natural language for simple flows
const simple = await workflows.do`
  When order placed, charge payment,
  reserve inventory, ship product,
  notify customer
`

// Full control for complex logic
const complex = workflows.define($ => {
  $.on.Order.placed(async (order, $) => {
    const payment = await $.do('Payment.charge', order)

    if (payment.failed) {
      await $.send('Email.paymentFailed', order)
      return
    }

    await $.do('Inventory.reserve', order.items)
    await $.do('Shipping.create', order)
    await $.send('Email.confirmation', order)
  })

  $.every('7 days after order')(async ($) => {
    await $.send('Email.reviewRequest', $.state.order)
  })
})
```

### 2. Start Your Workflow

```typescript
// Trigger by name
const run = await workflows.start('order-fulfillment', {
  orderId: '12345',
  customerId: 'cust_abc'
})

// Or send events that trigger workflows
await workflows.send('Order.placed', { orderId: '12345' })
```

### 3. Monitor Everything

```typescript
// Check status anytime
const status = await workflows.status(run.id)
console.log(status.currentStep) // 'Shipping.create'

// See full history
const history = await workflows.history(run.id)
// [{ type: 'step', name: 'Payment.charge', ... }, ...]

// Pause, resume, retry
await workflows.pause(run.id)
await workflows.resume(run.id)
await workflows.retry(run.id)
```

## The Difference

**Without workflows.do:**
- Scattered try/catch blocks everywhere
- Manual state management in databases
- Cron jobs that silently fail
- No idea why production broke
- Weeks building retry logic
- Fear of changing anything

**With workflows.do:**
- One place for all orchestration
- State managed automatically
- Durable execution with built-in delays
- Full visibility into every run
- Retries, rollbacks, recovery included
- Change with confidence

## Everything You Need

```typescript
// Step-based workflows
await workflows.steps('approval-chain', {
  steps: [
    { name: 'requestApproval', action: 'approvals.request' },
    { name: 'waitForManager', action: 'approvals.wait', wait: '48h' },
    { name: 'notifyResult', action: 'email.send' }
  ],
  timeout: '7d'
})

// Conditional logic
$.on.Refund.requested(async (refund, $) => {
  if (refund.amount > 1000) {
    await $.do('Approval.require', { approver: 'manager' })
  }
  await $.do('Payment.refund', refund)
})

// Scheduled workflows
$.every.Monday.at9am(async ($) => {
  await $.send('Report.weekly', { team: $.state.team })
})

// Stream real-time updates
for await (const event of workflows.stream(run.id)) {
  console.log(`${event.type}: ${event.name}`)
}
```

## Workflow States

| Status | Description |
|--------|-------------|
| `pending` | Workflow created but not yet started |
| `running` | Workflow is actively executing steps |
| `waiting` | Workflow is waiting for a delay or event |
| `paused` | Workflow execution is paused |
| `completed` | All steps completed successfully |
| `failed` | Workflow failed due to an error |

## Configuration

```typescript
import { Workflows } from 'workflows.do'

const workflows = Workflows({
  apiKey: process.env.WORKFLOWS_API_KEY
})
```

Or set `WORKFLOWS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Fearing Your Own Code

Complex processes don't have to be complex to manage. Define them once, run them forever, debug them instantly.

**Your workflows should be an asset, not a liability.**

```bash
npm install workflows.do
```

[Start orchestrating at workflows.do](https://workflows.do)

---

MIT License
