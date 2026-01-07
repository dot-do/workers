# agent.do

## **AI Agents That Actually Remember**

Your agents forget everything. Every conversation. Every mistake. Every lesson learned.

You deploy an AI agent on Monday. By Friday, it has made the same error 47 times.

**It does not have to be this way.**

---

## The Problem

AI agents today are brilliant amnesics:

- **Every session starts at zero.** Customers repeat themselves. Context vanishes. Relationships reset.

- **Mistakes compound endlessly.** The same error triggers the same support ticket. Again. And again.

- **Learning is impossible.** Feedback goes nowhere. Improvements never stick. Your agents stay permanently dumb.

- **Goals drift into oblivion.** Complex multi-step tasks collapse. Progress tracking does not exist.

- **You are blind.** What did the agent do? Why? How do you make it better? Nobody knows.

You are not building intelligent agents. You are building goldfish with LLM access.

---

## The Solution

**agent.do** gives your AI agents a persistent brain.

Built on Cloudflare Durable Objects, each agent instance maintains:

| Capability | What It Means |
|------------|---------------|
| **Permanent Memory** | Store and recall experiences with importance scoring |
| **Full Conversation History** | Every interaction preserved across sessions |
| **Action Tracking** | Complete audit trail with feedback loops |
| **Goal Management** | Set, track, and achieve multi-step objectives |
| **Learning System** | Agents improve from errors, feedback, and reflection |

Your agents remember. Your agents learn. Your agents get smarter.

---

## 3 Simple Steps to Persistent AI Agents

### Step 1: Define Your Agent

```typescript
import { Agent } from 'agent.do'

export class SupportAgent extends Agent {
  async init() {
    await super.init()

    // Configure personality
    await this.setPersonality({
      name: 'Alex',
      role: 'Customer Support',
      traits: ['helpful', 'patient'],
      style: 'friendly'
    })

    // Register capabilities
    this.registerAction('resolve', {
      description: 'Resolve customer issues',
      handler: async ({ issue }) => this.resolve(issue)
    })
  }

  private async resolve(issue: string) {
    // Recall relevant past interactions
    const context = await this.getRelevantMemories(issue)

    // Think with full context
    const solution = await this.think(issue, context)

    // Remember for next time
    await this.remember({
      type: 'resolution',
      content: { issue, solution },
      importance: 0.8
    })

    return solution
  }
}
```

### Step 2: Configure the Durable Object

```toml
# wrangler.toml
[[durable_objects.bindings]]
name = "AGENT"
class_name = "SupportAgent"

[[migrations]]
tag = "v1"
new_classes = ["SupportAgent"]
```

### Step 3: Deploy

```typescript
export default {
  async fetch(request: Request, env: Env) {
    // Each customer gets their own persistent agent
    const customerId = getCustomerId(request)
    const id = env.AGENT.idFromName(customerId)
    const agent = env.AGENT.get(id)

    // Agent remembers everything about this customer
    return agent.fetch(request)
  }
}
```

That is it. Your agent now has permanent memory.

---

## Before & After

### Before: Stateless Agent

```typescript
class SupportBot {
  async handle(message: string) {
    // No memory
    // No learning
    // No context
    // Just raw LLM calls

    const response = await llm.complete({
      prompt: `You are a support bot. User says: ${message}`
    })

    return response
    // Everything forgotten. Repeat forever.
  }
}
```

**Result:** Customer asks the same question three times. Gets three different answers. Escalates to human support.

---

### After: Persistent Agent

```typescript
class SupportAgent extends Agent {
  async handle(message: string) {
    // Recall past interactions with this customer
    const memories = await this.getRelevantMemories(message)

    // Apply learnings from feedback
    const learnings = await this.getLearnings({ validOnly: true })

    // Continue the conversation
    const conversation = await this.getActiveConversation()

    // Think with full context
    const response = await this.think(message, memories)

    // Remember this interaction
    await this.remember({
      type: 'interaction',
      content: { message, response },
      importance: 0.6
    })

    return response
    // Context preserved. Learning enabled. Always improving.
  }
}
```

**Result:** Customer returns after 6 months. Agent remembers their preferences, past issues, and communication style. Issue resolved in 30 seconds.

---

## Core Capabilities

### Memory System

```typescript
// Store experiences with importance scoring
await agent.remember({
  type: 'customer-preference',
  content: { timezone: 'PST', language: 'Spanish' },
  importance: 0.9,
  tags: ['preferences']
})

// Query by criteria
const prefs = await agent.getMemories({
  type: 'customer-preference',
  minImportance: 0.5
})

// Get contextually relevant memories
const context = await agent.getRelevantMemories('billing question')
```

### Goal Tracking

```typescript
// Set measurable objectives
const goal = await agent.setGoal({
  description: 'Resolve issues without escalation',
  priority: 1,
  metric: 'resolution_rate',
  target: 0.95
})

// Track progress
await agent.updateGoalProgress(goal.id, 0.87, 'Improved response accuracy')

// Complete when achieved
await agent.completeGoal(goal.id)
```

### Learning System

```typescript
// Learn from feedback
await agent.learn({
  insight: 'Customers prefer step-by-step instructions over doc links',
  category: 'preference',
  confidence: 0.85,
  source: { type: 'feedback', referenceId: executionId }
})

// Auto-reflect on failures
const learnings = await agent.reflect()
```

### Action Tracking

```typescript
// Execute with full audit trail
const execution = await agent.executeTrackedAction('sendEmail', {
  to: 'customer@example.com',
  subject: 'Issue Resolved'
})

// Record feedback for learning
await agent.recordFeedback(execution.id, {
  rating: 0.9,
  comment: 'Customer satisfied'
})
```

---

## Real-World Use Cases

**Customer Support Agent** - Remembers customer history, learns which solutions work, tracks resolution goals.

**Personal Assistant** - Knows your preferences, learns optimal timing, maintains relationship context.

**Research Agent** - Accumulates knowledge across sessions, learns source reliability, tracks findings.

**Sales Agent** - Remembers prospect interactions, learns effective approaches, tracks pipeline.

---

## Installation

```bash
npm install agent.do
```

---

## API Reference

```typescript
class Agent {
  // Memory
  remember(memory): Promise<Memory>
  recall(memoryId): Promise<Memory | null>
  getMemories(options?): Promise<Memory[]>
  getRelevantMemories(query, limit?): Promise<Memory[]>
  forget(memoryId): Promise<boolean>

  // Conversations
  startConversation(title?, tags?): Promise<Conversation>
  addMessage(conversationId, message): Promise<Message>
  getConversation(conversationId): Promise<Conversation | null>
  getConversations(options?): Promise<Conversation[]>
  endConversation(conversationId): Promise<void>

  // Actions
  registerAction(name, definition): void
  executeTrackedAction(name, params?): Promise<ActionExecution>
  recordFeedback(executionId, feedback): Promise<void>
  getExecutions(options?): Promise<ActionExecution[]>

  // Goals
  setGoal(goal): Promise<Goal>
  updateGoalProgress(goalId, progress, notes?): Promise<Goal>
  getGoals(options?): Promise<Goal[]>
  completeGoal(goalId): Promise<void>
  failGoal(goalId, reason?): Promise<void>

  // Learning
  learn(learning): Promise<Learning>
  getLearnings(options?): Promise<Learning[]>
  applyLearning(learningId): Promise<void>
  reflect(): Promise<Learning[]>

  // Configuration
  setPersonality(personality): Promise<void>
  getPersonality(): AgentPersonality | undefined
  getStats(): Promise<AgentStats>

  // Override Points
  think(query, context?): Promise<string>
  plan(goal): Promise<Workflow>
}
```

---

## Start Building

Your agents deserve a brain. Give them one.

```bash
npm install agent.do
```

```typescript
import { Agent } from 'agent.do'

class MyAgent extends Agent {
  // Your persistent, learning, improving agent starts here
}
```

---

Part of the [workers.do](https://workers.do) platform for Autonomous Startups.

MIT License
