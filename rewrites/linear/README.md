# linear.do

> Modern issue tracking. Blazing fast. Open source. AI-automated.

Linear showed the world what issue tracking could feel like - instant, keyboard-driven, beautifully designed. But at $8-14/user/month with the good features locked behind Plus tier, and no self-hosting option, teams are still paying rent for their workflow.

**linear.do** is Linear reimagined. The same speed and elegance. AI that triages, writes, and ships. Deploy your own. Own your engineering workflow.

## The Problem

Linear's pricing is simpler than Jira, but still adds up:

| Plan | Price | What's Missing |
|------|-------|----------------|
| Free | $0/250 issues | Cycles, roadmaps, triage, SLAs |
| Standard | $8/user/month | Roadmaps, triage, some integrations |
| Plus | $14/user/month | Everything |

**100-person engineering org on Plus?** That's **$16,800/year**.

The hidden friction:
- **No self-hosting** - Your engineering data on their servers
- **Issue limits on free** - 250 issues is nothing
- **Cycles locked** - Basic sprint planning requires paid tier
- **Limited customization** - Opinionated is great until it's not
- **AI as feature** - Not yet fully integrated

## The Solution

**linear.do** is what Linear aspires to be:

```
Traditional Linear            linear.do
-----------------------------------------------------------------
$8-14/user/month              $0 - run your own
Issue limits on free          Unlimited
Their servers                 Your Cloudflare account
Limited AI                    AI-native throughout
Opinionated only              Opinionated + extensible
Closed source                 Open source
```

## One-Click Deploy

```bash
npx create-dotdo linear
```

Your own Linear. Running on Cloudflare. Faster than ever.

```bash
# Or add to existing workers.do project
npx dotdo add linear
```

## The workers.do Way

You're building a product. Your team needs issue tracking that doesn't suck. Linear is beautiful and fast, but it's still $17k/year with no self-hosting option. Your engineering workflow lives on someone else's servers. There's a better way.

**Natural language. Tagged templates. AI agents that work.**

```typescript
import { linear } from 'linear.do'
import { priya, ralph, quinn } from 'agents.do'

// Talk to your issue tracker like a human
const blocked = await linear`what's blocking the release?`
const myWork = await linear`what should I work on today?`
const velocity = await linear`how did we do last cycle?`
```

**Promise pipelining - chain work without Promise.all:**

```typescript
// Release pipeline
const shipped = await linear`find completed issues in ${cycle}`
  .map(issue => mark`write release notes for ${issue}`)
  .map(notes => priya`review ${notes}`)
  .map(notes => linear`publish ${notes}`)

// Triage pipeline
const triaged = await linear`get triage inbox`
  .map(issue => priya`analyze and prioritize ${issue}`)
  .map(issue => ralph`estimate ${issue}`)
  .map(issue => linear`route ${issue} to project`)
```

One network round trip. Record-replay pipelining. Workers working for you.

## Features

### Issues

The core of everything:

```typescript
import { Issue, Project, Cycle } from 'linear.do'

const issue = await Issue.create({
  title: 'Implement WebSocket connection pooling',
  description: `
    ## Problem
    Current implementation creates new connection per request.

    ## Solution
    Implement connection pooling with configurable limits.

    ## Acceptance Criteria
    - [ ] Pool maintains up to 100 connections
    - [ ] Automatic reconnection on failure
    - [ ] Metrics exposed for monitoring
  `,
  team: 'backend',
  priority: 'High',
  labels: ['performance', 'infrastructure'],
  project: 'q1-performance',
  cycle: 'cycle-42',
  estimate: 5,
  assignee: '@alice',
})

// Sub-issues
await issue.createSubIssue({
  title: 'Design connection pool architecture',
  estimate: 2,
})

await issue.createSubIssue({
  title: 'Implement pool manager',
  estimate: 3,
})
```

### The Speed

Linear's signature instant feel, even faster on the edge:

```typescript
// Optimistic updates - UI updates before server confirms
await issue.update({ status: 'In Progress' })
// UI already updated, server catches up

// Keyboard-first
// ⌘K - Command menu
// C - Create issue
// X - Close issue
// A - Assign
// P - Set priority
// L - Add label
// G then I - Go to inbox
// G then M - Go to my issues

// Real-time sync across all clients
issue.subscribe((change) => {
  // Instant updates, no polling
})
```

### Workflows

Customizable issue states:

```typescript
import { Workflow } from 'linear.do'

const engineeringWorkflow = Workflow.create({
  name: 'Engineering',
  states: [
    // Backlog
    { name: 'Backlog', type: 'backlog', color: '#bbb' },
    { name: 'Todo', type: 'unstarted', color: '#e2e2e2' },

    // Started
    { name: 'In Progress', type: 'started', color: '#f2c94c' },
    { name: 'In Review', type: 'started', color: '#bb87fc' },

    // Completed
    { name: 'Done', type: 'completed', color: '#5e6ad2' },

    // Cancelled
    { name: 'Canceled', type: 'canceled', color: '#95a2b3' },
    { name: 'Duplicate', type: 'canceled', color: '#95a2b3' },
  ],
})
```

### Cycles (Sprints)

Time-boxed iterations:

```typescript
import { Cycle } from 'linear.do'

const cycle = await Cycle.create({
  team: 'backend',
  number: 42,
  startsAt: '2025-01-13',
  endsAt: '2025-01-24',
  name: 'Connection Pooling Sprint',
})

// Auto-schedule issues into cycles
await cycle.addIssues(['BACK-101', 'BACK-102', 'BACK-103'])

// Cycle metrics
const metrics = await cycle.getMetrics()
// {
//   totalScope: 34,
//   completed: 21,
//   added: 5,
//   removed: 2,
//   scopeCreep: 0.15,
//   burndownData: [...]
// }
```

### Projects

Group issues into larger initiatives:

```typescript
import { Project, Milestone } from 'linear.do'

const project = await Project.create({
  name: 'Q1 Performance',
  description: 'Improve p99 latency by 50%',
  team: 'backend',
  lead: '@alice',
  startDate: '2025-01-01',
  targetDate: '2025-03-31',
  milestones: [
    Milestone.create({ name: 'Baseline metrics', date: '2025-01-15' }),
    Milestone.create({ name: 'Connection pooling', date: '2025-02-01' }),
    Milestone.create({ name: 'Caching layer', date: '2025-02-15' }),
    Milestone.create({ name: 'Target achieved', date: '2025-03-15' }),
  ],
})

// Project progress auto-calculated from issues
```

### Roadmaps

Visualize the big picture:

```typescript
import { Roadmap } from 'linear.do'

const roadmap = await Roadmap.create({
  name: 'Engineering 2025',
  projects: ['q1-performance', 'q2-scaling', 'mobile-app', 'api-v2'],
  view: 'timeline',  // or 'table', 'board'
  groupBy: 'team',
  dateRange: {
    start: '2025-01-01',
    end: '2025-12-31',
  },
})
```

### Triage

Handle incoming issues efficiently:

```typescript
import { Triage } from 'linear.do'

// Triage inbox for team
const inbox = await Triage.getInbox('backend')
// Returns issues without: project, cycle, or estimate

// Quick triage actions
await inbox[0].triage({
  project: 'q1-performance',
  cycle: 'current',
  priority: 'High',
  estimate: 3,
})

// Or snooze
await inbox[1].snooze('next-week')

// Or decline
await inbox[2].decline('Won\'t fix - out of scope')
```

### Views

Custom filtered views:

```typescript
import { View } from 'linear.do'

const myWork = View.create({
  name: 'My Work',
  filter: {
    assignee: { eq: 'me' },
    status: { notIn: ['Done', 'Canceled'] },
  },
  sort: [
    { field: 'priority', direction: 'desc' },
    { field: 'updatedAt', direction: 'desc' },
  ],
  groupBy: 'project',
})

const blockers = View.create({
  name: 'Blockers',
  filter: {
    labels: { contains: 'blocked' },
    status: { in: ['In Progress', 'In Review'] },
  },
  sort: [{ field: 'priority', direction: 'desc' }],
})
```

## AI-Native Issue Tracking

AI isn't a feature. It's how modern issue tracking works.

### AI Triage

AI handles the triage queue:

```typescript
import { ai } from 'linear.do'

// Enable AI triage for team
await Team.enableAITriage('backend', {
  autoLabel: true,      // AI suggests labels
  autoPriority: true,   // AI suggests priority
  autoAssign: true,     // AI suggests assignee
  autoEstimate: true,   // AI estimates points
  autoProject: true,    // AI suggests project
  duplicateDetection: true,
})

// When issue comes in, AI does:
// 1. Analyzes title and description
// 2. Searches for duplicates
// 3. Suggests labels from content
// 4. Estimates priority from impact/urgency
// 5. Suggests assignee from expertise
// 6. Estimates story points
// 7. Routes to appropriate project

// Human just reviews and accepts/adjusts
```

### AI Issue Writing

AI helps write better issues:

```typescript
// Draft issue from quick thought
const issue = await ai.draftIssue(`
  login page is slow for some users
`)

// AI creates:
{
  title: 'Slow login page performance for subset of users',
  description: `
## Problem
Some users are experiencing slow load times on the login page.

## Investigation Needed
- [ ] Identify which users are affected
- [ ] Check for geographic patterns
- [ ] Review login page performance metrics
- [ ] Check third-party auth provider latency

## Potential Causes
- CDN cache misses
- OAuth provider latency
- Database query performance
- Asset loading

## Metrics to Track
- Login page load time (p50, p95, p99)
- OAuth callback duration
- Time to interactive
  `,
  suggestedLabels: ['performance', 'investigation', 'login'],
  suggestedPriority: 'Medium',
}

// From bug report
const bugIssue = await ai.draftIssue({
  type: 'bug',
  input: 'users seeing 500 error when uploading files larger than 10mb',
})

// AI adds:
// - Steps to reproduce
// - Expected vs actual behavior
// - Suggested severity
// - Related code areas
```

### AI Code Context

AI understands your codebase:

```typescript
// AI analyzes related code when creating issues
const issue = await Issue.create({
  title: 'Add rate limiting to upload endpoint',
  aiContext: {
    codebase: true,  // AI reads relevant code
    history: true,   // AI checks similar past issues
  },
})

// AI automatically adds:
// - Links to relevant files
// - Notes about existing patterns
// - Suggested implementation approach
// - Potential impact areas
```

### AI Estimation

AI estimates story points:

```typescript
const estimate = await ai.estimate(issue, {
  factors: {
    codebase: true,    // Analyze code complexity
    history: true,     // Compare to past issues
    team: 'backend',   // Team velocity context
  },
})

// Returns:
{
  estimate: 5,
  confidence: 0.84,
  reasoning: 'Similar to BACK-234 (5 points, 4 days). Requires changes in 3 files. No external dependencies.',
  comparables: [
    { id: 'BACK-234', points: 5, duration: '4 days', similarity: 0.89 },
    { id: 'BACK-198', points: 3, duration: '2 days', similarity: 0.72 },
  ],
  risks: [
    'Touches auth middleware - needs careful testing',
  ],
}
```

### AI Cycle Planning

AI helps plan sprints:

```typescript
const plan = await ai.planCycle({
  team: 'backend',
  capacity: 40,  // Story points
  constraints: {
    mustInclude: ['BACK-100'],  // Critical issues
    priorities: ['security', 'performance'],
  },
})

// Returns:
{
  suggestedIssues: [
    { id: 'BACK-100', points: 8, reason: 'Critical - requested' },
    { id: 'BACK-105', points: 5, reason: 'Security priority' },
    { id: 'BACK-108', points: 5, reason: 'Unblocks BACK-105' },
    { id: 'BACK-112', points: 8, reason: 'Performance priority' },
    { id: 'BACK-115', points: 5, reason: 'Quick win, low risk' },
    { id: 'BACK-120', points: 8, reason: 'Performance priority' },
  ],
  totalPoints: 39,
  bufferRemaining: 1,
  risks: [
    'BACK-108 has external dependency on API provider',
    'BACK-112 needs design review before start',
  ],
  recommendations: [
    'Start BACK-108 early due to external dependency',
    'Schedule BACK-112 design review in first 2 days',
  ],
}
```

### AI Release Notes

AI writes release notes from completed issues:

```typescript
const releaseNotes = await ai.generateReleaseNotes({
  cycle: 'cycle-42',
  format: 'changelog',  // or 'blog', 'email', 'slack'
})

// Returns:
`
## v2.5.0 (2025-01-24)

### New Features
- **Connection pooling for WebSocket** - Improved performance for high-traffic connections. Connections are now pooled and reused, reducing p99 latency by 40%.
- **Rate limiting for uploads** - Added configurable rate limits to prevent abuse.

### Bug Fixes
- Fixed file upload failures for files larger than 10MB
- Resolved memory leak in long-running connections

### Performance
- Database query optimization for user lookups (2x faster)
- Reduced cold start time by 30%

### Internal
- Upgraded to TypeScript 5.4
- Added comprehensive connection pooling tests
`
```

### Natural Language Queries

Query issues conversationally:

```typescript
const blocked = await ai.query`what's blocking the release?`
const myWork = await ai.query`what should I work on today?`
const velocity = await ai.query`how did we do last cycle compared to average?`
const risk = await ai.query`which issues are at risk of missing the deadline?`
```

## GitHub Integration

Deep GitHub integration built-in:

```typescript
import { GitHub } from 'linear.do/integrations'

// Link issues to PRs
// PRs auto-link when branch includes issue ID (e.g., back-101-connection-pool)

// Auto-transitions
await GitHub.configure({
  onPROpened: Issue.moveTo('In Review'),
  onPRMerged: Issue.moveTo('Done'),
  onPRClosed: Issue.moveTo('In Progress'),
})

// Sync GitHub issues
await GitHub.sync({
  repo: 'company/backend',
  labels: ['linear-sync'],
  targetProject: 'q1-performance',
})
```

## API & Integrations

Full API compatibility:

```typescript
// GraphQL API (like Linear)
POST /graphql

query {
  issues(filter: { team: { key: { eq: "BACK" } } }) {
    nodes {
      id
      title
      state { name }
      assignee { name }
    }
  }
}

mutation {
  issueCreate(input: {
    teamId: "..."
    title: "New issue"
    description: "..."
  }) {
    issue { id identifier }
  }
}
```

Existing Linear SDK works:

```typescript
import { LinearClient } from '@linear/sdk'

const client = new LinearClient({
  apiKey: process.env.LINEAR_TOKEN,
  apiUrl: 'https://your-org.linear.do/graphql',  // Just change URL
})

const issues = await client.issues({
  filter: { team: { key: { eq: 'BACK' } } },
})
```

## Keyboard-First Design

```
Global
⌘K          Command palette
⌘/          Keyboard shortcuts
⌘.          Theme toggle

Navigation
G then I    Go to inbox
G then M    Go to my issues
G then V    Go to views
G then T    Go to team
G then P    Go to projects
G then C    Go to cycles

Issues
C           Create issue
O           Open issue
X           Close/reopen issue
A           Assign
P           Set priority
L           Add label
E           Edit title
D           Edit description
M           Move to project
⌘⇧C         Copy issue link
⌘⇧I         Copy issue ID

Bulk Actions
⌘A          Select all
⇧↑↓         Extend selection
⌘⇧A         Assign selected
⌘⇧P         Set priority for selected
```

## Architecture

### Durable Object per Team

Each team is isolated for performance:

```
WorkspaceDO (users, teams, global config)
  |
  +-- TeamDO:backend (issues, cycles, projects)
  |     +-- SQLite: issues, comments, history
  |     +-- WebSocket: real-time sync
  |     +-- Full-text search index
  |
  +-- TeamDO:frontend
  +-- TeamDO:mobile
  +-- RoadmapDO (cross-team projects)
  +-- SearchDO (global search index)
```

### Instant Performance

Why linear.do is fast:

```typescript
// 1. Edge computing - data lives close to users
// 2. SQLite in Durable Objects - no network hop for queries
// 3. Optimistic updates - UI responds immediately
// 4. WebSocket sync - no polling, instant updates
// 5. Smart caching - frequently accessed data cached

// Cold start: <50ms
// Issue load: <10ms
// Real-time sync: <100ms globally
```

### Storage

```typescript
// Hot: SQLite in Durable Object
// Active issues, current cycles, recent activity

// Warm: R2 object storage
// Attachments, old cycles, comment history

// Cold: R2 archive
// Closed issues older than 1 year
```

## Migration from Linear

Import your existing Linear workspace:

```bash
npx linear-do migrate \
  --token=your_linear_api_key
```

Imports:
- All issues and sub-issues
- Projects and milestones
- Cycles (current and past)
- Workflows and states
- Labels and templates
- Views and filters
- Team configurations
- Integrations (where possible)

## Roadmap

- [x] Issues with full editing
- [x] Workflows and states
- [x] Cycles and burndowns
- [x] Projects and milestones
- [x] Roadmaps
- [x] Triage
- [x] Views and filters
- [x] GraphQL API compatibility
- [x] AI triage and estimation
- [x] GitHub integration
- [ ] Slack integration
- [ ] Initiatives (cross-project)
- [ ] SLAs
- [ ] Analytics
- [ ] Linear import (full fidelity)

## Why Open Source?

Engineering workflow is too important for rent:

1. **Your process** - How you build software is competitive advantage
2. **Your data** - Issues, decisions, and patterns are institutional knowledge
3. **Your speed** - Your tools should be as fast as you think
4. **Your AI** - Intelligence on your workflow should be yours

Linear showed the world what beautiful, fast issue tracking could feel like. **linear.do** makes it open, self-hostable, and AI-native.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Key areas:
- Performance optimization
- Keyboard navigation
- AI capabilities
- GitHub and other integrations
- GraphQL API compatibility

## License

MIT License - Use it however you want. Build your business on it. Fork it. Make it your own.

---

<p align="center">
  <strong>linear.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://linear.do">Website</a> | <a href="https://docs.linear.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
