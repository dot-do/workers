# humans.do

> When you need a real person.

```typescript
import { ceo, pdm, legal } from 'humans.do'

await pdm`approve this product spec`
await legal`review this contract`
await ceo`sign off on the partnership`
```

Same interface as agents. But these route to real humans via Slack, email, or chat.

## Why Humans?

AI agents handle most things. But some decisions need human judgment:

- **Approvals** — Sign off on big changes
- **Escalations** — Handle edge cases AI can't solve
- **Legal/Compliance** — Anything requiring human accountability
- **Creative Direction** — Final call on brand, design, tone
- **High-Stakes** — Decisions that can't be undone

## Channels

Humans receive tasks through channels:

```typescript
import { SlackChannel, EmailChannel, ChatChannel } from 'humans.do'

// Configure how to reach your humans
const pdm = Human({
  role: 'pdm',
  channels: [
    SlackChannel({ workspace: 'mycompany', user: '@sarah' }),
    EmailChannel({ to: 'sarah@mycompany.com' }),
  ]
})
```

Channels are tried in order. First response wins.

### Available Channels

| Channel | Description |
|---------|-------------|
| **Slack** | DM or channel message, interactive buttons |
| **Discord** | Server message with reactions |
| **Teams** | Microsoft Teams integration |
| **Email** | Traditional email with reply parsing |
| **Chat** | Web-based chat interface |
| **CLI** | Terminal prompt for developers |

## The Interface

Humans work exactly like agents:

```typescript
// This goes to an AI agent
await tom`review the architecture`

// This goes to a human via Slack
await pdm`approve the architecture`
```

The caller doesn't know (or care) if it's AI or human. The interface is identical.

## Approvals

Built-in approval workflows:

```typescript
import { pdm } from 'humans.do'

const decision = await pdm`approve this feature spec`
// { approved: true, comment: "Ship it!", respondedBy: "sarah@..." }

if (!decision.approved) {
  // Handle rejection
}
```

The human sees a Slack message with Approve/Reject buttons. Their response flows back.

## Escalation

Agents can escalate to humans:

```typescript
import { tom } from 'agents.do'
import { cto } from 'humans.do'

// Tom tries to solve it
const result = await tom`debug this production issue`

if (!result.resolved) {
  // Escalate to human CTO
  await cto`urgent: ${result.summary}`
}
```

## SLA Tracking

Set expectations for response time:

```typescript
const approval = await pdm`approve the release`.within('4 hours')

// If no response in 4 hours:
// - Auto-escalate to next person
// - Or auto-approve (configurable)
// - Or timeout and fail
```

## Human Tasks

For more complex workflows:

```typescript
import { Human } from 'humans.do'

const task = await Human.createTask({
  title: 'Review Q4 Budget',
  assignee: 'cfo@mycompany.com',
  priority: 'high',
  deadline: '2024-01-15',
  context: { spreadsheet: budgetUrl },
})

// Task appears in their queue
// They complete it when ready
// Result flows back to your workflow
```

## Mixed Teams

Combine agents and humans:

```typescript
import { tom, rae, quinn } from 'agents.do'
import { pdm, designer } from 'humans.do'

// AI does the implementation
await tom`build the feature`
await rae`style the components`
await quinn`test everything thoroughly`

// Humans do the review
await designer`approve the visual design`
await pdm`approve for release`
```

## For Founders

You're the human in the loop. At least at first.

```typescript
import { founder } from 'humans.do'

// Route critical decisions to yourself
await founder`approve this pricing change`
await founder`sign off on the investor update`
```

As you grow, delegate to your team:

```typescript
import { cfo, cmo } from 'humans.do'

await cfo`approve this pricing change`
await cmo`sign off on the investor update`
```

Same code. Different humans. The business scales.

---

[humans.do](https://humans.do) · [agents.do](https://agents.do) · [roles.do](https://roles.do) · [teams.do](https://teams.do) · [workflows.do](https://workflows.do)
