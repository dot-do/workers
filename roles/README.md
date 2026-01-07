# roles.do

> Job descriptions for AI agents and humans.

```typescript
import { CEO, CTO, PDM, Dev } from 'roles.do'
```

Roles define what someone can do—their expertise, tools, and responsibilities. Both AI agents and humans implement the same roles.

## Available Roles

### Leadership
| Role | Description |
|------|-------------|
| **CEO** | Vision, strategy, company direction |
| **CTO** | Technical strategy, architecture decisions |
| **CFO** | Financial planning, metrics, runway |
| **CMO** | Brand, marketing strategy, growth |
| **CRO** | Revenue, sales strategy, partnerships |

### Product & Engineering
| Role | Description |
|------|-------------|
| **PDM** | Product specs, prioritization, roadmaps |
| **Architect** | System design, technical decisions |
| **Dev** | Implementation, code, debugging |
| **QA** | Testing, quality, edge cases |
| **Designer** | UI/UX, visual design, prototypes |

### Go-to-Market
| Role | Description |
|------|-------------|
| **BDR** | Business development, outbound |
| **SDR** | Sales development, qualification |
| **AE** | Account executive, closing deals |
| **CSM** | Customer success, retention |

## Anatomy of a Role

```typescript
import { Role } from 'roles.do'

export class PDM extends Role {
  // What this role does
  capabilities = {
    functions: ['plan', 'prioritize', 'spec', 'triage'],
    tools: ['linear', 'notion', 'figma', 'slack'],
  }

  // Who they work with
  relationships = {
    delegatesTo: ['dev', 'designer', 'qa'],
    reportsTo: ['cto', 'ceo'],
  }

  // How they think
  systemPrompt = `You are a Product Manager. You:
    - Write clear specs that engineers love
    - Balance user needs with technical constraints
    - Make data-driven prioritization decisions
    - Ship incrementally, not big-bang releases`
}
```

## Agents Extend Roles

Named agents are roles with personality:

```typescript
import { PDM } from 'roles.do'

export class Priya extends PDM {
  identity = {
    name: 'Priya',
    email: 'priya@agents.do',
  }

  systemPrompt = `${super.systemPrompt}

    Your name is Priya. You're known for:
    - Ruthless prioritization
    - Specs that leave no ambiguity
    - Strong opinions, loosely held`
}
```

## Humans Implement Roles

Real humans also fill roles:

```typescript
import { PDM } from 'roles.do'
import { SlackChannel } from 'humans.do'

export class HumanPDM extends PDM {
  type = 'human'
  channels = [SlackChannel, EmailChannel]
}
```

Same interface. When you call `pdm`approve this spec``, it routes to a human via Slack.

## Custom Roles

Create roles specific to your business:

```typescript
import { Role } from 'roles.do'

export class DataEngineer extends Role {
  capabilities = {
    functions: ['etl', 'pipeline', 'query', 'model'],
    tools: ['dbt', 'snowflake', 'airflow', 'python'],
  }

  relationships = {
    delegatesTo: [],
    reportsTo: ['cto', 'data-lead'],
  }
}
```

## The Graph

Roles form a graph of relationships:

```
        CEO
       / | \
    CTO CMO CRO
    /|   |   |\
  PDM Dev  BDR SDR
   |   |
  QA Designer
```

`delegatesTo` and `reportsTo` define the edges. Work flows down, escalations flow up.

## Why Roles Matter

Roles are the contract between your business and your workers—AI or human.

When you say `engineering`build the feature``, the system knows:
- Which roles can handle this (Dev, QA, Architect)
- What tools they have access to
- Who to escalate to if something goes wrong

Roles make agents and humans interchangeable. Start with AI, bring in humans when needed. The interface stays the same.

---

[roles.do](https://roles.do) · [agents.do](https://agents.do) · [teams.do](https://teams.do) · [humans.do](https://humans.do) · [workflows.do](https://workflows.do)
