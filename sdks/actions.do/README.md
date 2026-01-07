# actions.do

**Define once. Execute anywhere.**

```bash
npm install actions.do
```

## Quick Start

```typescript
// Cloudflare Workers - import env adapter first
import 'rpc.do/env'
import { actions } from 'actions.do'

// Or use the factory for custom config
import { Actions } from 'actions.do'
const actions = Actions({ baseURL: 'https://custom.example.com' })
```

---

## Your Actions Are Scattered Across Services

You have actions everywhere. Email sending in one service. Payment processing in another. CRM updates in a third. AI agents calling random endpoints.

The chaos compounds:
- No single source of truth for what actions exist
- Every service has its own API format and auth
- No visibility into who executed what and when
- Permission chaos - agents calling things they shouldn't
- Debugging means searching logs across 12 services
- Schema changes break integrations silently

**Your actions should be discoverable, permissioned, and observable.**

## What If Every Action Lived in One Place?

```typescript
import actions from 'actions.do'

// Define what you want in plain English
const sendEmail = await actions.do`
  Send a personalized welcome email
  with the customer's name and signup date
`

// Or define with full control
await actions.define('charge_customer', {
  description: 'Charge a customer payment method',
  parameters: {
    customerId: { type: 'string', required: true },
    amount: { type: 'number', required: true },
    currency: { type: 'string', default: 'usd' }
  },
  permissions: ['payments:charge'],
  handler: 'payments-worker'
})

// Execute from anywhere - same interface
await actions.execute('charge_customer', {
  customerId: 'cust_123',
  amount: 9900
})
```

**actions.do** gives you:
- One registry for all actions across your platform
- Consistent execution interface for AI and humans
- Built-in permissions with scope control
- Full execution history and audit trails
- Schema validation before execution

## Unify Your Actions in 3 Steps

### 1. Define Your Action

```typescript
import actions from 'actions.do'

// Natural language for quick actions
const notify = await actions.do`
  Send a Slack notification when
  a new customer signs up
`

// Full control for production actions
await actions.define('send_email', {
  description: 'Send transactional email to a user',
  parameters: {
    to: { type: 'string', required: true },
    subject: { type: 'string', required: true },
    template: { type: 'string', required: true },
    data: { type: 'object' }
  },
  permissions: ['email:send'],
  handler: 'email-worker',
  timeout: 30000,
  retries: { attempts: 3, delay: '1s' }
})
```

### 2. Set Permissions

```typescript
// Grant to an organization
await actions.permissions.grant('send_email', 'email:send', {
  scope: 'org',
  grantTo: 'org_acme'
})

// Grant to a specific agent
await actions.permissions.grant('charge_customer', 'payments:charge', {
  scope: 'user',
  grantTo: 'agent_billing'
})

// Check before execution
const { allowed, reason } = await actions.permissions.check('charge_customer', {
  executor: { type: 'agent', id: 'agent_support' }
})

if (!allowed) {
  console.log(reason) // 'Missing permission: payments:charge'
}
```

### 3. Execute From Anywhere

```typescript
// Synchronous execution
const result = await actions.execute('send_email', {
  to: 'alice@example.com',
  subject: 'Welcome!',
  template: 'onboarding',
  data: { name: 'Alice' }
})

// Async execution
const { executionId } = await actions.executeAsync('generate_report', {
  customerId: 'cust_123',
  dateRange: '30d'
})

// Check status
const status = await actions.status(executionId)

// Full history
const history = await actions.history('send_email', {
  status: 'failed',
  limit: 50
})
```

## The Difference

**Without actions.do:**
- Actions scattered across 10+ services
- Each with different auth and API formats
- No idea what actions exist in your platform
- Agents calling endpoints they shouldn't
- No audit trail of who did what
- Schema drift breaks integrations silently

**With actions.do:**
- One registry for all actions
- Consistent interface everywhere
- Discoverable action catalog
- Scoped permissions per executor
- Complete execution history
- Validation catches errors before execution

## Everything You Need

```typescript
// Validate before execution
const validation = await actions.validate('charge_customer', {
  customerId: 'cust_123',
  amount: 'not-a-number'
})

if (!validation.valid) {
  console.log(validation.errors)
  // [{ path: 'amount', message: 'Expected number, got string' }]
}

// List all available actions
const allActions = await actions.list()
const paymentActions = await actions.list({ handler: 'payments-worker' })

// Update action definitions
await actions.update('send_email', {
  timeout: 60000,
  retries: { attempts: 5, delay: '2s' }
})

// Stream execution progress
for await (const event of actions.stream(executionId)) {
  console.log(`${event.type}: ${event.data}`)
}

// Manage action lifecycle
await actions.delete('deprecated_action')
```

## Execution States

| Status | Description |
|--------|-------------|
| `pending` | Execution queued but not started |
| `running` | Execution in progress |
| `completed` | Execution finished successfully |
| `failed` | Execution failed with error |
| `cancelled` | Execution was cancelled |

## Configuration

```typescript
import { Actions } from 'actions.do'

// For Cloudflare Workers, import env adapter first
import 'rpc.do/env'

const actions = Actions({
  // API key is read from ACTIONS_API_KEY or DO_API_KEY environment variables
})
```

Or set `ACTIONS_API_KEY` or `DO_API_KEY` in your environment.

## Stop the Action Sprawl

Every action in one place. Every execution tracked. Every permission controlled.

**Your platform deserves a unified action layer.**

```bash
npm install actions.do
```

[Start defining at actions.do](https://actions.do)

---

MIT License
