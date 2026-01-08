# composio.do

> Hands for AI Agents. 150+ Tools. Zero Auth Headaches.

Your agent can think. It can reason. It can plan. But it needs **hands** to act.

"Fix the bug and open a PR" means 5 APIs: GitHub branches, commits, PRs, Slack webhooks, Linear tickets. 40+ hours of OAuth nightmares. 3am token refresh bugs. Rate limit hell.

**composio.do** gives your agents hands. 150+ tools. One line per action.

## AI-Native API

```typescript
import { composio } from 'composio.do'           // Full SDK
import { composio } from 'composio.do/tiny'      // Minimal client
import { composio } from 'composio.do/mcp'       // MCP tools only
```

Natural language for tool integrations:

```typescript
import { composio } from 'composio.do'

// Talk to it like a colleague
await composio`connect GitHub for user-123`
await composio`available actions for Slack`
await composio`execute send-message on Slack #general "Hello team"`

// Chain like sentences
await composio`create GitHub issue ${bug}`
  .then(issue => composio`notify Slack #bugs about ${issue}`)

// Agents get tools automatically
await ralph.with(composio)`fix the login bug and open a PR`
```

## The Problem

Composio (the original) charges for every action:

| What They Charge | The Reality |
|------------------|-------------|
| **Per-Action Pricing** | $0.001-0.01 per tool call adds up fast |
| **Vendor Lock-in** | Your agent's hands belong to them |
| **Latency** | Round trip to their servers per action |
| **Tool Limits** | Quota overages kill your agent mid-task |
| **No Self-Hosting** | Your credentials, their servers |

### The Real Cost

At scale, tool calls explode:
- Simple bug fix: 10-20 tool calls
- Feature implementation: 50-100 tool calls
- Daily agent operations: 1,000+ tool calls

**$100-1,000/month** just for your agent to have hands.

## The Solution

**composio.do** is the open-source alternative:

```
Composio (Original)                 composio.do
-----------------------------------------------------------------
Per-action pricing                  $0 - run your own
Their servers                       Your Cloudflare account
Latency per action                  Edge-native, global
Quota limits                        Unlimited
Vendor lock-in                      Open source, MIT licensed
```

## One-Click Deploy

```bash
npx create-dotdo composio
```

150+ tool integrations. Running on infrastructure you control. Zero per-action costs.

```typescript
import { Composio } from 'composio.do'

export default Composio({
  name: 'my-agent-tools',
  domain: 'tools.myagent.ai',
  apps: ['github', 'slack', 'notion', 'linear'],
})
```

## Features

### Connections

```typescript
// Connect anyone to anything
await composio`connect GitHub for user-123`
await composio`connect Slack for team-acme`
await composio`connect Salesforce for org-enterprise`

// AI infers what you need
await composio`user-123 connections`        // returns all connections
await composio`GitHub status for user-123`  // returns connection health
await composio`refresh tokens for user-123` // refreshes expired tokens
```

### Tool Discovery

```typescript
// Find tools naturally
await composio`what can I do with GitHub?`
await composio`Slack actions for messaging`
await composio`search tools for file management`

// Get tool schemas
await composio`schema for github_create_issue`
await composio`required params for slack_send_message`
```

### Tool Execution

```typescript
// Just say it
await composio`create GitHub issue: Login bug on mobile in acme/webapp`
await composio`send Slack message to #engineering: Deployment complete`
await composio`create Notion page: Sprint 23 Retro in Engineering space`

// AI parses intent, executes the right action
await composio`add label "urgent" to issue #42 on acme/webapp`
await composio`assign @tom to PR #123`
await composio`close Linear ticket ENG-456 as done`
```

### Agent Integration

```typescript
import { ralph } from 'agents.do'

// Ralph gets 150+ tools automatically
await ralph.with(composio)`fix the login bug and open a PR`
// Uses: github_create_branch, github_commit, github_create_pr, slack_send_message

// Ralph doesn't know about OAuth, tokens, or API schemas
// He just acts
```

### Promise Pipelining

```typescript
import { priya, ralph, tom, quinn } from 'agents.do'

// Plan to deploy - one network round trip
const deployment = await priya`plan deployment for v2.0`
  .map(plan => ralph.with(composio)`implement ${plan}`)
  .map(code => tom.with(composio)`review and approve ${code}`)
  .map(approved => composio`notify Slack #releases: ${approved}`)

// Cross-platform workflows
await composio`merge GitHub PR #${prNumber}`
  .map(merge => composio`deploy Vercel production`)
  .map(deploy => composio`create Datadog deployment marker`)
  .map(marker => composio`announce in Slack #releases: ${marker}`)
```

## 150+ Tools, Zero Config

| Category | Apps | Example Commands |
|----------|------|------------------|
| **Developer** | GitHub, GitLab, Linear, Jira | `create issue`, `open PR`, `merge branch` |
| **Communication** | Slack, Discord, Teams, Email | `send message`, `create channel`, `notify team` |
| **Productivity** | Notion, Asana, Monday, Trello | `create task`, `update page`, `move card` |
| **CRM** | Salesforce, HubSpot, Pipedrive | `create contact`, `log activity`, `update deal` |
| **Storage** | Google Drive, Dropbox, Box | `upload file`, `share folder`, `create doc` |
| **Analytics** | Datadog, Mixpanel, Amplitude | `track event`, `create dashboard`, `query metric` |
| **AI/ML** | OpenAI, Anthropic, Cohere | `generate text`, `create embedding`, `analyze` |

```typescript
// All tools, one interface
await composio`create GitHub issue: ${bug}`
await composio`send Slack message: ${notification}`
await composio`create Notion page: ${doc}`
await composio`log Salesforce activity: ${call}`
await composio`upload to Drive: ${file}`
await composio`track Mixpanel event: ${action}`
```

## MCP Native

Every tool is an MCP tool. Claude uses them directly:

```typescript
// Expose tools to Claude
await composio`serve MCP for user-123 with github slack notion`

// Claude sees:
// - github_create_issue
// - github_create_pr
// - slack_send_message
// - notion_create_page
// ... 150+ tools
```

## Framework Adapters

```typescript
// Works with every framework
// But really, just use agents.do

import { ralph } from 'agents.do'
await ralph.with(composio)`do the thing`  // This is the way
```

## Auth Made Invisible

The hardest part of integrations is auth. Just say it:

```typescript
// OAuth - one line
await composio`connect Salesforce for user-123`

// API Keys - stored securely
await composio`connect OpenAI for user-123 with ${apiKey}`

// Check connection status
await composio`status for user-123 connections`

// Disconnect
await composio`disconnect GitHub for user-123`

// Token refresh - automatic
// Rate limits - managed
// Error retry - built in
```

Each user gets isolated credentials. Per-entity Durable Objects. No cross-contamination.

## Architecture

### Durable Object per Entity

```
ComposioDO (config, apps, schemas)
  |
  +-- ConnectionDO (per user - OAuth tokens, API keys)
  |     |-- SQLite: Credentials (encrypted)
  |     +-- R2: Connection metadata
  |
  +-- ExecutionDO (sandboxed tool execution)
  |     |-- Rate limiting per entity
  |     +-- Audit logging
  |
  +-- WebhookDO (inbound events from apps)
        |-- GitHub webhooks
        +-- Slack events
```

**Key insight**: Each user entity gets its own ConnectionDO for credential isolation. Tool execution happens in sandboxed ExecutionDO instances with rate limiting per entity.

### Storage Tiers

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active connections, recent executions | <10ms |
| **Warm** | R2 + Index | Historical logs, audit trails | <100ms |
| **Cold** | R2 Archive | Compliance retention | <1s |

### Encryption

Per-entity encryption for credentials. AES-256-GCM. Automatic key rotation. Immutable audit logs.

## vs Composio (Original)

| Feature | Composio (Original) | composio.do |
|---------|---------------------|-------------|
| **Pricing** | Per-action fees | $0 - run your own |
| **Data Location** | Their servers | Your Cloudflare account |
| **Latency** | Centralized | Edge-native, global |
| **Quotas** | Monthly limits | Unlimited |
| **Customization** | Limited | Full source access |
| **Lock-in** | Vendor dependency | MIT licensed |
| **MCP** | Partial support | Native |

## Use Cases

### AI Coding Agents

```typescript
// Agent that ships code
await ralph.with(composio)`
  fix the login bug in auth.ts,
  create a branch,
  commit the fix,
  open a PR,
  notify #engineering on Slack
`
```

### Workflow Automation

```typescript
// When issue created, assign and notify
await composio`watch GitHub issues on acme/webapp`
  .on('created', issue => composio`
    assign @tom to ${issue},
    add label "triage",
    notify #support: New issue ${issue.title}
  `)
```

### Multi-App Orchestration

```typescript
// Sales flow across apps
await composio`new contact ${lead} in HubSpot`
  .map(contact => composio`create task in Asana: Follow up with ${contact}`)
  .map(task => composio`schedule calendar meeting for ${task.due}`)
  .map(meeting => composio`send Slack reminder: ${meeting}`)
```

## Deployment Options

### Cloudflare Workers

```bash
npx create-dotdo composio
# Your account, your data
```

### Private Cloud

```bash
# Docker deployment
docker run -p 8787:8787 dotdo/composio

# Kubernetes
kubectl apply -f composio-do.yaml
```

## Contributing

composio.do is open source under the MIT license.

```bash
git clone https://github.com/dotdo/composio.do
cd composio.do
pnpm install
pnpm test
```

## License

MIT License - Give your agents hands.

---

<p align="center">
  <strong>Per-action pricing ends here.</strong>
  <br />
  150+ tools. Zero cost. Your infrastructure.
  <br /><br />
  <a href="https://composio.do">Website</a> |
  <a href="https://docs.composio.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/composio.do">GitHub</a>
</p>
