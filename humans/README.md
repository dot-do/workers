# humans.do

> You stay in control.

```typescript
import { founder } from 'humans.do'

await founder`approve this pricing change`
await founder`sign off on the partnership`
await founder`review the investor update`
```

Same interface as agents. You decide what needs your attention.

## You're the Hero

You're building something. AI handles most of the work. But some decisions need you:

- **Approvals** - Sign off on what matters
- **Judgment calls** - The decisions only you can make
- **High-stakes** - Things that can't be undone

```typescript
import { tom, ralph } from 'agents.do'
import { founder } from 'humans.do'

// AI builds it
await tom`architect the payment system`
await ralph`implement the integration`

// You approve it
await founder`approve for production`
```

AI does the work. You make the calls.

## Same Interface

Humans and agents work the same way:

```typescript
// This goes to an AI agent
await tom`review the architecture`

// This goes to you
await founder`approve the architecture`
```

Your code doesn't care who handles what. Just say what you need.

## Delegate as You Grow

Start with everything routing to you:

```typescript
import { founder } from 'humans.do'

await founder`approve the pricing change`
await founder`sign off on the marketing campaign`
await founder`review the contract`
```

As you hire, delegate:

```typescript
import { cfo, cmo, legal } from 'humans.do'

await cfo`approve the pricing change`
await cmo`sign off on the marketing campaign`
await legal`review the contract`
```

Same code. Different humans. The business scales.

## Seamless Handoff

Agents escalate to humans when needed:

```typescript
import { tom } from 'agents.do'
import { founder } from 'humans.do'

const result = await tom`debug the production issue`

if (!result.resolved) {
  await founder`urgent: ${result.summary}`
}
```

AI tries first. You step in when it matters.

## Mixed Teams

Combine agents and humans naturally:

```typescript
import { priya, ralph, quinn } from 'agents.do'
import { founder, designer } from 'humans.do'

// AI does the work
await priya`plan the feature`
await ralph`build it`
await quinn`test everything`

// Humans approve
await designer`approve the visual design`
await founder`ship it`
```

## Response Time

Set expectations:

```typescript
const approval = await founder`approve the release`.within('4 hours')

// If no response: escalate, auto-approve, or timeout
```

## Custom Roles

Define your team:

```typescript
import { Human } from 'humans.do'

const sarah = Human({
  role: 'product',
  email: 'sarah@mycompany.com',
})

await sarah`approve the feature spec`
```

---

AI runs the business. You make the decisions.

---

[humans.do](https://humans.do) - [agents.do](https://agents.do) - [roles.do](https://roles.do) - [teams.do](https://teams.do) - [workflows.do](https://workflows.do)
