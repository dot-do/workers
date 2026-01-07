# human.do

# Human Intelligence, On Demand

> The AI knows when it doesn't know. Your system should too.

You've built incredible AI that automates the impossible. But every AI has blind spots. Edge cases. Moments of uncertainty. The question isn't *if* your AI will need help - it's whether you'll know when it does.

**human.do** gives your AI the superpower of knowing when to ask a human.

---

## The Problem

Your AI is making decisions right now. Some of them are wrong.

**Fully automated systems fail in predictable ways:**

- A payment processor approves a fraudulent $50,000 transaction because the pattern was *slightly* different from training data
- A content moderation AI removes a legitimate post, alienating your best customer
- A customer service bot confidently gives incorrect information, creating a PR nightmare
- A hiring algorithm rejects qualified candidates based on subtle biases no one caught

**The manual workaround is worse:**

- Slack channels flooded with "can someone approve this?"
- Email requests that sit for days (or forever)
- No audit trail, no SLAs, no accountability
- Tasks that fall through the cracks when someone's on vacation
- Engineers building brittle approval queues instead of shipping features

**The result?** You either move fast and break things, or you move slow and break your team.

---

## The Solution

**human.do** is production-ready human-in-the-loop infrastructure that works the way AI workflows actually work.

```typescript
import { Human } from 'human.do'

// Your AI detects uncertainty
const aiDecision = await ai.analyze(transaction)

if (aiDecision.confidence < 0.9) {
  // Route to human with full context
  const task = await human.createTask({
    type: 'approval',
    title: `Review flagged transaction: $${transaction.amount}`,
    context: {
      transaction,
      aiConfidence: aiDecision.confidence,
      riskFactors: aiDecision.flags,
    },
    assignee: 'fraud-team@company.com',
    priority: transaction.amount > 10000 ? 'urgent' : 'normal',
  })

  // Your workflow pauses intelligently
  // Human responds via dashboard, Slack, or API
  // Callback fires, workflow resumes
}
```

**That's it.** Your AI now has human backup.

---

## 3 Simple Steps to Human Oversight

### Step 1: Create a Task

When your AI needs human judgment, create a task with full context:

```typescript
const task = await human.createTask({
  type: 'approval',           // What kind of decision?
  title: 'Approve contract',  // What needs doing?
  context: { ... },           // All the details
  assignee: 'legal@co.com',   // Who should handle it?
  priority: 'high',           // How urgent?
})
```

### Step 2: Human Responds

Humans respond through their preferred channel - dashboard, Slack, email, or API:

```typescript
// Via SDK
await human.approve(task._id, 'Looks good, proceed')

// Via REST API
POST /api/tasks/:id/approve
{ "comment": "Approved after review" }

// Via webhook from your UI
// Via Slack integration
// Via mobile app
```

### Step 3: Continue Your Workflow

Get notified instantly and continue with confidence:

```typescript
// Webhook callback fires
// Or poll for completion
const result = await human.getTask(task._id)

if (result.response?.decision === 'approve') {
  await executeTransaction(transaction)
} else {
  await flagForReview(transaction, result.response?.comment)
}
```

---

## Before & After

### Before: Fully Automated Chaos

```typescript
async function processPayment(payment) {
  // AI makes the call alone
  const risk = await ai.assessRisk(payment)

  if (risk.score > 0.7) {
    // Send email into the void
    await sendEmail('finance@company.com', 'Please review this payment')
    // No tracking. No SLA. No escalation.
    // What if they're on vacation?
    // What if it goes to spam?
    // What if they just... forget?

    // Eventually, someone asks: "Whatever happened to that payment?"
    // Answer: Nobody knows.
  }

  // Execute and pray
  await executePayment(payment)
}
```

**Outcome:** $50,000 fraudulent payment approved. CFO finds out via bank statement.

---

### After: Human-AI Collaboration

```typescript
import { Human } from 'human.do'

async function processPayment(payment, human: Human) {
  const risk = await ai.assessRisk(payment)

  if (risk.score > 0.7) {
    const task = await human.createTask({
      type: 'approval',
      title: `Review $${payment.amount} payment to ${payment.vendor}`,
      context: {
        payment,
        riskScore: risk.score,
        riskFactors: risk.factors,
        vendorHistory: await getVendorHistory(payment.vendor),
      },
      priority: payment.amount > 50000 ? 'urgent' : 'high',
      sla: {
        targetResponseMs: 2 * 60 * 60 * 1000,  // 2 hour target
        maxResponseMs: 8 * 60 * 60 * 1000,     // 8 hour max
        onBreach: 'escalate',
      },
      escalationChain: [
        { level: 0, assignees: ['finance@company.com'], timeoutMs: 4 * 60 * 60 * 1000 },
        { level: 1, assignees: ['cfo@company.com'], timeoutMs: 2 * 60 * 60 * 1000 },
      ],
    })

    // Workflow pauses. Humans are notified. SLA ticks.
    // If finance doesn't respond in 4 hours, CFO gets pinged.
    // Nothing falls through the cracks.

    return { status: 'pending_approval', taskId: task._id }
  }

  return await executePayment(payment)
}
```

**Outcome:** Fraudulent payment caught by finance team in 23 minutes. AI learns from feedback.

---

## Real-World Use Cases

| Use Case | Task Type | Trigger | Resolution |
|----------|-----------|---------|------------|
| **Fraud Detection** | `approval` | AI confidence < 90% | Human reviews, AI learns |
| **Content Moderation** | `review` | Borderline content flagged | Human decides, policy updates |
| **Customer Escalations** | `escalation` | Sentiment score drops | Human intervenes, saves account |
| **Contract Review** | `decision` | High-value contract detected | Legal approves terms |
| **AI Training** | `validation` | Model output verification | Human corrects, model improves |
| **Compliance Checks** | `approval` | Regulatory threshold exceeded | Compliance signs off |

---

## Automatic Escalation That Actually Works

```typescript
const task = await human.createTask({
  type: 'approval',
  title: 'Production deployment requires approval',
  escalationChain: [
    {
      level: 0,
      assignees: ['oncall@company.com'],
      timeoutMs: 30 * 60 * 1000,  // 30 minutes
      notifyVia: ['slack'],
    },
    {
      level: 1,
      assignees: ['team-lead@company.com'],
      timeoutMs: 60 * 60 * 1000,  // 1 hour
      notifyVia: ['slack', 'email'],
    },
    {
      level: 2,
      assignees: ['cto@company.com'],
      timeoutMs: 2 * 60 * 60 * 1000,  // 2 hours
      notifyVia: ['sms', 'email', 'pagerduty'],
    },
  ],
})

// If on-call doesn't respond in 30 min → team lead gets pinged
// If team lead doesn't respond in 1 hour → CTO gets a text
// Nothing gets dropped. Ever.
```

---

## Close the Feedback Loop

The best AI systems learn from human corrections:

```typescript
// Human corrects an AI mistake
await human.submitFeedback(task._id, {
  type: 'correction',
  content: {
    original: 'AI classified as spam',
    correction: 'Legitimate customer inquiry',
    reason: 'Urgent language was genuine concern, not scam pattern',
  },
  providedBy: 'alice@company.com',
  targetModel: 'spam-classifier-v3',
})

// Later: Use feedback to improve your models
const feedback = await human.getUnprocessedFeedback()
await retrainModel('spam-classifier-v3', feedback)
```

Your AI gets smarter with every human interaction.

---

## Full API Reference

### Task Management

```typescript
await human.createTask(input)      // Create a new task
await human.getTask(taskId)        // Get task details
await human.listTasks(options)     // List with filters
await human.updateTask(id, data)   // Update task
```

### Responses

```typescript
await human.approve(id, comment)   // Quick approve
await human.reject(id, reason)     // Quick reject
await human.defer(id, reason)      // Defer for later
await human.escalate(id, reason)   // Force escalation
await human.respondToTask(id, response)  // Full response
```

### Queue Management

```typescript
await human.getQueue(assignee)     // Get pending tasks
await human.getPendingCount()      // Count pending
await human.getStats()             // SLA metrics, response times
```

### REST API

```
POST /api/tasks                    Create task
GET  /api/tasks/:id                Get task
POST /api/tasks/:id/approve        Approve
POST /api/tasks/:id/reject         Reject
POST /api/tasks/:id/escalate       Escalate
GET  /api/queue                    Get queue
GET  /api/stats                    Get metrics
POST /api/feedback                 Submit feedback
```

---

## Part of the workers.do Ecosystem

**human.do** integrates seamlessly with the platform:

- **llm.do** - AI models that know when to ask for help
- **workflows.do** - Long-running workflows with human checkpoints
- **payments.do** - Payment approvals built in
- **org.ai** - Enterprise SSO for human identity
- **analytics.do** - Track human-AI collaboration metrics

---

## Get Started in 60 Seconds

```bash
npm install human.do
```

```typescript
import { Human } from 'human.do'

export class ApprovalQueue extends Human {
  // Ready for production
}

// Create your first task
const task = await human.createTask({
  type: 'approval',
  title: 'Your AI needs a human',
  context: { reason: 'Because humans are still pretty great' },
})
```

---

## The Best AI Knows When to Ask

Your users don't want fully autonomous AI. They want AI that's *smart enough to know its limits*.

**human.do** gives your AI that wisdom.

[Start Building →](https://human.do/docs) | [View on GitHub](https://github.com/drivly/human.do) | [Join Discord](https://discord.gg/workers-do)

---

*human.do - Human intelligence, on demand.*
