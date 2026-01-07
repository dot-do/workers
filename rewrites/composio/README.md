# composio.do

**Hands for AI Agents** - 150+ tool integrations with managed auth on Cloudflare.

## The Hero

You're building AI agents. They can think, reason, plan. But they need **hands** to act.

Your agent wants to "fix the bug and open a PR" - but that means:
- Create a branch on GitHub
- Write the code changes
- Commit with the right message
- Open a PR with context
- Notify the team on Slack

**40+ hours** per integration. OAuth nightmares. 3am token refresh bugs. Rate limit hell.

**composio.do** gives your agents hands. 150+ tools. Zero auth headaches.

```typescript
import { composio } from '@dotdo/composio'

composio`connect user-123 to GitHub`
composio`create issue: Login bug on mobile in acme/webapp`
composio.github`open PR for feature branch`
composio.slack`notify #engineering about deployment`
```

Natural language. Tagged templates. Your agent just talks.

## The Real Power: Agent Integration

The real magic is when agents get tools automatically:

```typescript
import { ralph } from 'agents.do'

// Ralph gets 150+ composio tools automatically
ralph.with(composio)`fix the login bug and open a PR`
// Uses github_create_branch, github_commit, github_create_pr, slack_send_message
```

Ralph doesn't need to know about OAuth, tokens, or API schemas. He just acts.

```typescript
import { priya, ralph, tom, quinn } from 'agents.do'

// Plan to deploy
const deployment = await priya`plan deployment for v2.0`
  .map(plan => ralph.with(composio)`implement ${plan}`)
  .map(code => tom.with(composio.github)`review and approve ${code}`)
  .map(approved => composio.slack`notify #releases: ${approved}`)
// One network round trip!
```

## Promise Pipelining

Chain actions without `Promise.all`. CapnWeb pipelining:

```typescript
const logged = await composio.github`create issue ${bug}`
  .map(issue => composio.slack`notify #bugs: ${issue}`)
  .map(notification => composio.notion`log ${notification}`)
// One network round trip!
```

Cross-platform workflows:

```typescript
const deployed = await composio.github`merge PR #${prNumber}`
  .map(merge => composio.vercel`deploy production`)
  .map(deploy => composio.datadog`create deployment marker`)
  .map(marker => composio.slack`announce deployment in #releases`)
```

## When You Need Control

For structured access, the API is still there:

```typescript
import { Composio } from '@dotdo/composio'

const composio = new Composio({ apiKey: env.COMPOSIO_API_KEY })

// Connect a user to GitHub via OAuth
const connection = await composio.connect({
  userId: 'user-123',
  app: 'github',
  redirectUrl: 'https://myapp.com/callback'
})

// Get tools for an agent framework
const githubTools = await composio.getTools({
  apps: ['github'],
  actions: ['create_issue', 'create_pr', 'list_repos']
})

// Execute an action directly
const result = await composio.execute({
  action: 'github_create_issue',
  params: {
    repo: 'my-org/my-repo',
    title: 'Bug: Login fails on mobile',
    body: 'Steps to reproduce...'
  },
  entityId: 'user-123'
})
```

## 150+ Tools, Zero Config

| Category | Apps | What Your Agent Can Do |
|----------|------|------------------------|
| **Developer** | GitHub, GitLab, Linear, Jira | Create issues, branches, PRs, manage repos |
| **Communication** | Slack, Discord, Teams, Email | Send messages, manage channels, notify teams |
| **Productivity** | Notion, Asana, Monday, Trello | Create tasks, update pages, manage boards |
| **CRM** | Salesforce, HubSpot, Pipedrive | Manage contacts, deals, log activities |
| **Storage** | Google Drive, Dropbox, Box | Upload, download, share files |
| **Analytics** | Datadog, Mixpanel, Amplitude | Track events, create dashboards |
| **AI/ML** | OpenAI, Anthropic, Cohere | Generate text, embeddings, analysis |

Your agent gets all of these. Just `.with(composio)`.

## MCP Native

Every tool is an MCP tool. Claude can use them directly:

```typescript
import { createMCPServer } from '@dotdo/composio/mcp'

const mcpServer = createMCPServer({
  apps: ['github', 'slack', 'notion'],
  entityId: 'user-123'
})

// Tools are automatically exposed
// github_create_issue, slack_send_message, notion_create_page...
```

## Framework Adapters

Works with every agent framework:

```typescript
// LangChain
import { composioTools } from '@dotdo/composio/langchain'
const tools = await composioTools.getTools({ apps: ['github'], entityId: 'user-123' })

// CrewAI
import { composioTools } from '@dotdo/composio/crewai'
const tools = await composioTools.getTools({ apps: ['notion'], entityId: 'user-123' })

// But really, just use agents.do
import { ralph } from 'agents.do'
ralph.with(composio)`do the thing`  // This is the way
```

## Auth Made Invisible

The hardest part of integrations is auth. Composio handles it all:

```typescript
// OAuth - handled
composio`connect user-123 to Salesforce`

// API Keys - stored securely
composio`connect user-123 to OpenAI with ${apiKey}`

// Token refresh - automatic
// Rate limits - managed
// Error retry - built in
```

Each user gets isolated credentials. Per-entity Durable Objects. No cross-contamination.

## Architecture

```
                    +----------------------+
                    |    composio.do       |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |    ToolsDO       | |   ConnectionDO   | |   ExecutionDO    |
    | (tool registry)  | | (OAuth/API keys) | | (action sandbox) |
    +------------------+ +------------------+ +------------------+
```

**Key insight**: Each user entity gets its own ConnectionDO for credential isolation. Tool execution happens in sandboxed ExecutionDO instances with rate limiting per entity.

## Installation

```bash
npm install @dotdo/composio
```

## Quick Start

```typescript
import { composio } from '@dotdo/composio'

// Connect (one-time OAuth)
composio`connect user-123 to GitHub`

// Act
composio.github`create issue: Fix login bug in acme/webapp`
composio.slack`message #dev: Issue created`

// Or let an agent do it all
import { ralph } from 'agents.do'
ralph.with(composio)`fix the login bug, create a PR, notify the team`
```

## The Rewrites Ecosystem

composio.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [inngest.do](https://inngest.do) | Inngest | Workflows/Jobs for AI |
| **composio.do** | Composio | Tool integrations for AI |
| kafka.do | Kafka | Event streaming for AI |
| nats.do | NATS | Messaging for AI |

## Why Cloudflare?

1. **Global Edge** - Tool execution close to your agents
2. **Durable Objects** - Per-entity credential isolation
3. **Workers KV** - Fast tool schema caching
4. **Queues** - Reliable webhook delivery
5. **Zero Cold Starts** - Your agent never waits

## Related Domains

- **agents.do** - AI agents that use these tools
- **tools.do** - Generic tool registry
- **auth.do** - Authentication platform
- **workflows.do** - Workflow orchestration

## License

MIT
