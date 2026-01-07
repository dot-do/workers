# zapier.do

Automation that speaks your language. Natural language triggers, actions, and workflows on Cloudflare.

## The Hero

**For startup founders who need automation without the $600/month Zapier bill.**

You're building a startup. You need to connect your apps - Stripe to Slack, GitHub to Notion, webhooks to everywhere. Zapier wants $600/month for 50,000 tasks. You want to focus on your product, not your automation bill.

**zapier.do gives you unlimited automation at edge speed.** No per-task pricing. No vendor lock-in. Just tell it what you want.

## Natural Language Automation

```typescript
import { zapier } from 'zapier.do'

zapier`when new user signs up, add to Salesforce and send welcome email`
zapier`every morning at 9am, sync Stripe charges to Google Sheet`
zapier`when GitHub issue closes, post to Slack #shipped`
```

That's it. No drag-and-drop UI. No JSON configs. Just say what you need.

## Promise Pipelining

Chain automations with `.map()` - one network round trip:

```typescript
const result = await zapier`new order received`
  .map(order => stripe`charge ${order.total}`)
  .map(charge => email`confirm ${charge.customer}`)
  .map(sent => slack`notify #orders ${sent}`)
// One network round trip!
```

Build complex workflows that execute efficiently:

```typescript
const onboarding = await zapier`user signed up`
  .map(user => [
    salesforce`create contact ${user}`,
    hubspot`add to sequence ${user.email}`,
    slack`notify #growth: new signup ${user.name}`
  ])
  .map(results => analytics`track onboarding_started ${results}`)
```

## Agent Integration

Let your AI agents set up automation for you:

```typescript
import { ralph, priya } from 'agents.do'

// Ralph can build automation systems
ralph`set up automation to sync new customers from Stripe to HubSpot`

// Priya can define business workflows
priya`create automation for our lead qualification pipeline`

// Agents use zapier.do under the hood
ralph`when deal closes in Pipedrive, trigger celebration in Slack and update forecast sheet`
```

## AI-Native (MCP Tools)

zapier.do is built for AI agents, not just humans. Full MCP integration means any AI can:

```typescript
// AI agents can discover and execute automations
const tools = await zapier.mcp.listTools()

// Create automations programmatically
await zapier.mcp.call('createAutomation', {
  trigger: 'webhook:order/created',
  actions: ['stripe:charge', 'email:confirm', 'slack:notify']
})

// Execute with context
await zapier.mcp.call('runZap', {
  name: 'orderFlow',
  context: { orderId: '123', customer: 'jane@startup.com' }
})
```

Works with fsx.do and gitx.do for file and version control operations:

```typescript
zapier`when PR merges, write changelog to /docs/changelog.md and commit`
zapier`daily at midnight, export analytics to /reports/daily.jsonl`
```

## The Stakes

**Without zapier.do:**
- $600/month Zapier bill that scales with your success
- Vendor lock-in to proprietary WYSIWYG interface
- Cold starts and latency in critical workflows
- No customization beyond drag-and-drop
- AI agents can't automate for you

**With zapier.do:**
- Unlimited automations on Cloudflare's free tier
- Define in code, version control, deploy anywhere
- Global edge execution, no cold starts
- Full programmatic control
- AI-native from day one

## When You Need Control

For complex conditional logic, use the structured API:

```typescript
import { Zapier } from 'zapier.do'

const zapier = new Zapier({ id: 'my-automation' })

export const orderProcessing = zapier.createZap({
  name: 'Order Processing',
  trigger: {
    app: 'webhook',
    event: 'order/created',
    filters: [{ field: 'data.total', condition: 'greater_than', value: 100 }]
  },
  actions: [
    {
      name: 'chargePayment',
      app: 'stripe',
      action: 'createCharge',
      inputs: {
        amount: '{{trigger.data.total}}',
        currency: 'usd'
      }
    },
    {
      name: 'sendConfirmation',
      app: 'email',
      action: 'send',
      inputs: {
        to: '{{trigger.data.email}}',
        template: 'order-confirmation'
      }
    },
    {
      name: 'notifyTeam',
      app: 'slack',
      action: 'postMessage',
      inputs: {
        channel: '#orders',
        text: 'New order: ${{trigger.data.total}} from {{trigger.data.email}}'
      }
    }
  ]
})
```

### Triggers

```typescript
// Webhook - instant
{ app: 'webhook', event: 'incoming', config: { path: '/hooks/orders' } }

// Schedule - cron syntax
{ app: 'schedule', event: 'cron', config: { expression: '0 9 * * *' } }

// Polling - check periodically
{ app: 'poll', event: 'new-item', config: { url: 'https://api.example.com/items', interval: '5m' } }
```

### Filters and Paths

```typescript
export const leadRouting = zapier.createZap({
  name: 'Lead Routing',
  trigger: { app: 'webhook', event: 'lead/created' },
  actions: [
    {
      name: 'filterHighValue',
      app: 'filter',
      action: 'only_continue_if',
      inputs: {
        conditions: [{ field: 'trigger.data.score', condition: 'greater_than', value: 50 }]
      }
    },
    {
      name: 'routeBySize',
      app: 'path',
      action: 'switch',
      inputs: {
        field: 'trigger.data.companySize',
        cases: {
          'enterprise': [{ app: 'slack', action: 'postMessage', inputs: { channel: '#sales-enterprise' } }],
          'startup': [{ app: 'slack', action: 'postMessage', inputs: { channel: '#sales-startup' } }]
        }
      }
    }
  ]
})
```

### Template Expressions

```typescript
'{{trigger.data.email}}'                              // Access trigger data
'{{steps.chargePayment.chargeId}}'                    // Previous step output
'{{formatDate(trigger.timestamp, "YYYY-MM-DD")}}'     // Date formatting
'{{json(trigger.data)}}'                              // JSON serialization
'{{math(trigger.data.price * 0.9)}}'                  // Calculations
```

## Architecture

```
                    +----------------------+
                    |     zapier.do        |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |     TriggerDO    | |     ActionDO     | |    ZapDO         |
    | (event sources)  | | (API execution)  | | (orchestration)  |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +-------+-------+-------+-------+
                      |               |
            +------------------+ +------------------+
            |      fsx.do      | |     gitx.do      |
            |  (file storage)  | | (version control)|
            +------------------+ +------------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent execution. Each Zap run gets its own isolated context with step memoization. Zero cold starts. Global edge distribution.

## Built-in Connectors

| Category | Apps |
|----------|------|
| **CRM** | Salesforce, HubSpot, Pipedrive |
| **Email** | SendGrid, Mailchimp, Gmail |
| **Chat** | Slack, Discord, Teams |
| **Storage** | fsx.do, S3, Google Drive, Dropbox |
| **Code** | gitx.do, GitHub, GitLab |
| **Database** | Supabase, Airtable, Notion |
| **Payments** | Stripe, PayPal |
| **HTTP** | Any REST API |

## Installation

```bash
npm install zapier.do
```

## Why Cloudflare?

1. **Global Edge** - Automations run close to your users
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - No execution timeouts
4. **Built-in Queues** - Reliable step execution
5. **Free Tier** - Most startups pay $0

## The Rewrites Ecosystem

zapier.do is part of the rewrites family - popular services reimplemented on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [inngest.do](https://inngest.do) | Inngest | Workflows/Jobs for AI |
| **zapier.do** | Zapier | Automation for AI |
| [kafka.do](https://kafka.do) | Kafka | Event streaming for AI |

## Related Domains

- **workflows.do** - Workflow orchestration
- **triggers.do** - Event triggers and webhooks
- **inngest.do** - Event-driven durable execution
- **agents.do** - AI agents that use zapier.do

## License

MIT
