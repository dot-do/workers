# verbs.do

**Teach AI what to do. Watch it act.**

```bash
npm install verbs.do
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { verbs } from 'verbs.do'

// Or use the factory for custom config
import { Verbs } from 'verbs.do'
const verbs = Verbs({ baseURL: 'https://custom.example.com' })
```

---

## Your AI Can Talk, But It Can't Act

You've built an impressive AI assistant. It can understand context, reason through problems, and generate brilliant responses.

But when it's time to actually *do* something?

- No way to define what actions are safe
- Permissions scattered across services
- No audit trail of what AI did
- Fear of giving AI real capabilities
- Building action handlers from scratch for every integration

**AI without actions is just expensive autocomplete.**

## What If AI Could Safely Execute?

```typescript
import verbs from 'verbs.do'

// Define what your AI can do
const sendEmail = await verbs.define({
  name: 'sendEmail',
  description: 'Send an email to a recipient',
  parameters: {
    to: { type: 'string', required: true },
    subject: { type: 'string', required: true },
    body: { type: 'string', required: true }
  },
  permissions: ['email:send']
})

// Or describe it naturally
const action = await verbs.do`
  Send an order confirmation email with
  the customer's name and order details
`

// Now AI can execute safely
await verbs.execute('sendEmail', {
  to: 'customer@example.com',
  subject: 'Order Confirmed',
  body: 'Your order #12345 ships tomorrow.'
})
```

**verbs.do** gives you:
- Typed, validated actions AI can execute
- Fine-grained permission control
- Complete audit trail of every execution
- Compose simple verbs into complex workflows
- Rate limiting and timeout protection

## Give AI Power in 3 Steps

### 1. Define Verbs

```typescript
import verbs from 'verbs.do'

// Full control with typed parameters
const createUser = await verbs.define({
  name: 'createUser',
  description: 'Create a new user account',
  parameters: {
    email: { type: 'string', required: true },
    name: { type: 'string', required: true },
    role: { type: 'string', enum: ['admin', 'user'], default: 'user' }
  },
  permissions: ['users:create'],
  rateLimit: { requests: 100, window: '1h' }
})

// Or describe naturally for AI to structure
const verb = await verbs.do`
  Update a customer's subscription plan,
  requiring their customer ID and new plan name
`
```

### 2. Set Permissions

```typescript
// Define what's allowed
await verbs.permissions.set('sendEmail', [
  'email:send',
  'customer:read'
])

// Check before executing
const canExecute = await verbs.permissions.check('sendEmail', 'email:send')

// List all permissions
const allPermissions = await verbs.permissions.list()
```

### 3. Let AI Execute

```typescript
// Execute directly
const result = await verbs.execute('createUser', {
  email: 'alice@example.com',
  name: 'Alice',
  role: 'admin'
})

// View execution history
const history = await verbs.history({
  verbId: 'createUser',
  executedBy: { type: 'ai' },
  limit: 50
})

// Compose into workflows
const onboarding = await verbs.compose({
  name: 'onboardUser',
  steps: [
    { verb: 'createUser', input: { email: '{{email}}', name: '{{name}}' } },
    { verb: 'sendWelcomeEmail', input: { to: '{{email}}' } },
    { verb: 'assignTeam', input: { userId: '{{createUser.id}}' } }
  ]
})
```

## The Difference

**Without verbs.do:**
- AI can only suggest, never act
- No standard way to define actions
- Permissions? What permissions?
- "What did the AI do?" - nobody knows
- Every integration is custom code
- Fear of giving AI real power

**With verbs.do:**
- AI executes real operations safely
- Typed, validated action definitions
- Fine-grained permission control
- Complete audit trail
- Compose verbs into complex flows
- Confidence in AI capabilities

## Everything You Need

```typescript
// List available verbs
const allVerbs = await verbs.list()

// Get a specific verb
const verb = await verbs.get('sendEmail')

// Update a verb
await verbs.update('sendEmail', {
  timeout: '30s',
  retries: 3
})

// Delete a verb
await verbs.delete('legacyAction')

// Execution with options
await verbs.execute('processOrder',
  { orderId: '12345' },
  {
    executedBy: { type: 'ai', id: 'agent-1', name: 'Support Bot' },
    timeout: '5m'
  }
)

// Filter execution history
const recentFailures = await verbs.history({
  status: 'failed',
  since: new Date(Date.now() - 24 * 60 * 60 * 1000)
})
```

## Configuration

```typescript
// Workers - import env adapter to configure from environment
import 'rpc.do/env'
import { Verbs } from 'verbs.do'

const verbs = Verbs()
```

Or use a custom configuration:

```typescript
import { Verbs } from 'verbs.do'

const verbs = Verbs({
  apiKey: 'your-api-key',
  baseURL: 'https://custom.verbs.do'
})
```

Environment variables `VERBS_API_KEY` or `DO_API_KEY` are automatically configured when using `rpc.do/env`.

## Stop Holding AI Back

AI that can't act is AI that can't help. Define the verbs, set the boundaries, and let your AI actually do the work.

**Every action tracked. Every permission enforced. Every execution audited.**

```bash
npm install verbs.do
```

[Start teaching at verbs.do](https://verbs.do)

---

MIT License
