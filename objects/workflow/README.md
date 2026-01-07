# Workflows That Never Lose State

**Your multi-step processes are a ticking time bomb.**

Right now, somewhere in your codebase, an order is stuck between "payment validated" and "card charged." A customer is waiting. Your data is inconsistent. And you're about to get paged at 2am.

**workflow.do** is durable workflow orchestration that survives crashes, restarts, and deployments. Every step is recorded. Every failure is recoverable. Every workflow picks up exactly where it left off.

```bash
npm install workflow.do
```

---

## The Villain: Fragile Multi-Step Processes

You've seen this movie before:

```typescript
async function processOrder(order) {
  await validatePayment(order)     // succeeds
  await reserveInventory(order)    // succeeds
  await chargeCard(order)          // FAILS - network timeout
  await sendConfirmation(order)    // never runs

  // Payment validated. Inventory reserved. Card never charged.
  // Customer confused. Support tickets incoming. Your weekend: gone.
}
```

**The pattern is always the same:**
- Network timeout at step 3 of 7
- Deployment during an active workflow
- Downstream service returns 500
- Lambda cold start kills the connection

You try to fix it with retry loops. Then you add logging. Then state tracking. Then you realize you've built half a workflow engine, poorly.

---

## The Guide: 3 Simple Steps to Durability

### Step 1: Define Your Workflow

```typescript
import { Workflow } from 'workflow.do'

class OrderWorkflow extends Workflow {
  async setup() {
    await this.register({
      id: 'order-processing',
      name: 'Process Customer Order',
      steps: [
        { id: 'validate', action: 'validatePayment' },
        { id: 'reserve', action: 'reserveInventory', dependsOn: ['validate'] },
        { id: 'charge', action: 'chargeCard', dependsOn: ['reserve'], maxRetries: 3 },
        { id: 'fulfill', action: 'fulfillOrder', dependsOn: ['charge'] },
        { id: 'notify', action: 'sendConfirmation', dependsOn: ['fulfill'] }
      ]
    })
  }

  async validatePayment(params: { orderId: string }) {
    return await this.env.PAYMENTS.validate(params.orderId)
  }

  async chargeCard(params: { orderId: string }, state: Record<string, unknown>) {
    return await this.env.STRIPE.charges.create({
      amount: state.validate.total,
      source: state.validate.paymentMethod
    })
  }

  // ... remaining actions
}
```

### Step 2: Start Executions

```typescript
const execution = await workflow.start('order-processing', {
  orderId: 'ord_123',
  customerId: 'cus_456'
})

// That's it. State is persisted. Retries are automatic. History is complete.
```

### Step 3: Handle Failures Gracefully

```typescript
const status = await workflow.status(execution.id)

if (status.status === 'failed') {
  // See exactly what happened
  console.log(status.stepResults)
  // {
  //   validate: { status: 'completed', output: {...} },
  //   reserve: { status: 'completed', output: {...} },
  //   charge: { status: 'failed', error: 'Card declined', retries: 3 }
  // }

  // Retry from the failed step - not from the beginning
  await workflow.retry(execution.id)
}
```

---

## Before and After: The Transformation

### BEFORE: 50 Lines of Fragile Chaos

```typescript
async function processOrder(order) {
  const log = []
  let state = {}

  try {
    log.push({ step: 'validate', time: Date.now() })
    state.payment = await validatePayment(order)

    log.push({ step: 'reserve', time: Date.now() })
    state.inventory = await reserveInventory(order)

    for (let i = 0; i < 3; i++) {
      try {
        log.push({ step: 'charge', attempt: i, time: Date.now() })
        state.charge = await chargeCard(order)
        break
      } catch (e) {
        if (i === 2) throw e
        await new Promise(r => setTimeout(r, 1000 * (i + 1)))
      }
    }

    // ... 30 more lines of manual tracking
  } catch (error) {
    console.error('Failed somewhere', { log, state, error })
    // Manual cleanup? Rollback? Good luck.
  }
}
```

**Problems:** State lost on crash. No resume capability. Debugging is archaeology.

### AFTER: 15 Lines of Declarative Durability

```typescript
await workflow.register({
  id: 'order-processing',
  steps: [
    { id: 'validate', action: 'validatePayment' },
    { id: 'reserve', action: 'reserveInventory', dependsOn: ['validate'] },
    { id: 'charge', action: 'chargeCard', dependsOn: ['reserve'], maxRetries: 3 },
    { id: 'fulfill', action: 'fulfillOrder', dependsOn: ['charge'] },
    { id: 'notify', action: 'sendConfirmation', dependsOn: ['fulfill'] }
  ]
})

const execution = await workflow.start('order-processing', order)
```

**Result:** State persisted automatically. Retries configured declaratively. Resume from any point. Debug with full history.

---

## Why Teams Choose workflow.do

| Your Problem | Manual Code | workflow.do |
|--------------|-------------|-------------|
| Server restarts mid-workflow | Data lost, customers angry | Picks up exactly where it left off |
| Step 4 of 7 fails | Manual retry from step 1 | One-click retry from step 4 |
| "What happened?" | grep through logs | Full visual execution history |
| Wait 3 days then continue | setTimeout? cron? | Native wait states |
| Conditional branching | Nested if/else spaghetti | Declarative expressions |
| Replay a failed workflow | Build it yourself | `workflow.replay(id)` |

---

## Advanced Patterns

### Conditional Branching

```typescript
{
  id: 'fraud-check',
  steps: [
    { id: 'score', action: 'calculateFraudScore' },
    {
      id: 'auto-approve',
      action: 'approveOrder',
      condition: 'score.risk < 0.3',
      dependsOn: ['score']
    },
    {
      id: 'manual-review',
      action: 'queueForReview',
      condition: 'score.risk >= 0.3',
      dependsOn: ['score']
    }
  ]
}
```

### Wait States (Days, Not Milliseconds)

```typescript
{
  id: 'onboarding',
  steps: [
    { id: 'welcome', action: 'sendWelcomeEmail' },
    { id: 'wait', action: 'noop', wait: '3d', dependsOn: ['welcome'] },
    { id: 'tips', action: 'sendOnboardingTips', dependsOn: ['wait'] }
  ]
}
```

### Event-Driven Triggers

```typescript
{
  id: 'customer-lifecycle',
  triggers: [
    { event: 'Customer.created' },
    { event: 'Customer.upgraded', condition: 'plan === "enterprise"' }
  ],
  steps: [...]
}

await workflow.handleEvent('Customer.created', { id: 'cus_123' })
```

### Resilient Error Handling

```typescript
{
  id: 'resilient-workflow',
  steps: [
    {
      id: 'risky-step',
      action: 'callExternalApi',
      onError: 'retry',
      maxRetries: 5,
      retryDelay: '1m'
    },
    {
      id: 'fallback',
      action: 'handleFailure',
      onError: 'branch',
      errorBranch: 'notify-admin'
    }
  ]
}
```

---

## Complete Execution Control

```typescript
// Pause a running workflow
await workflow.pause(executionId)

// Resume when ready
await workflow.resume(executionId)

// Cancel if needed
await workflow.cancel(executionId)

// Get complete execution history
const history = await workflow.history(executionId)

// Replay from the beginning with same inputs
const newExecution = await workflow.replay(executionId)

// List all failed workflows
const failed = await workflow.listExecutions({
  workflowId: 'order-processing',
  status: 'failed',
  limit: 10
})
```

---

## API Reference

### Workflow Class

```typescript
class Workflow extends DO {
  // Definition Management
  register(definition: WorkflowDefinition): Promise<WorkflowDefinition>
  getDefinition(workflowId: string): Promise<WorkflowDefinition | null>
  listDefinitions(): Promise<WorkflowDefinition[]>
  deleteDefinition(workflowId: string): Promise<boolean>

  // Execution
  start(workflowId: string, input?: Record<string, unknown>): Promise<WorkflowExecution>
  status(executionId: string): Promise<WorkflowExecution | null>
  pause(executionId: string): Promise<WorkflowExecution>
  resume(executionId: string): Promise<WorkflowExecution>
  cancel(executionId: string): Promise<WorkflowExecution>
  retry(executionId: string): Promise<WorkflowExecution>
  replay(executionId: string): Promise<WorkflowExecution>
  history(executionId: string): Promise<HistoryEntry[]>
  listExecutions(filters?: ExecutionFilters): Promise<WorkflowExecution[]>

  // Events
  handleEvent(event: string, data: unknown): Promise<WorkflowExecution[]>
}
```

### Types

```typescript
interface WorkflowStep {
  id: string
  name?: string
  action: string
  params?: Record<string, unknown>
  dependsOn?: string[]
  condition?: string
  wait?: string
  onError?: 'fail' | 'continue' | 'retry' | 'branch'
  maxRetries?: number
  retryDelay?: string
  errorBranch?: string
  timeout?: string
}

interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'paused' | 'waiting' | 'completed' | 'failed' | 'cancelled'
  input: Record<string, unknown>
  state: Record<string, unknown>
  output?: unknown
  error?: string
  currentStepIndex: number
  completedSteps: string[]
  stepResults: Record<string, StepResult>
  startedAt: number
  completedAt?: number
  history: HistoryEntry[]
}
```

---

## Stop Debugging at 2am

Your workflows deserve better than hope and prayer.

```bash
npm install workflow.do
```

**[Read the Docs](https://workflow.do)** | **[View on npm](https://npmjs.com/package/workflows.do)** | **[workers.do Platform](https://workers.do)**

---

## License

MIT
