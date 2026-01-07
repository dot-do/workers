# jira.do

> Atlassian's $3B cash cow. Now open source. AI-native.

Jira became synonymous with issue tracking. It also became synonymous with slowness, complexity, and eye-watering enterprise pricing. Every developer knows the pain: waiting for pages to load, clicking through endless configuration screens, paying $8.15/user/month that somehow balloons to six figures annually.

**jira.do** reimagines issue tracking for the AI era. Deploy your own Jira. JQL-compatible queries. AI that triages bugs, writes acceptance criteria, and estimates story points while you sleep.

## The Problem

Atlassian built a $50B+ company on developer frustration:

| Jira Plan | Price | Reality |
|-----------|-------|---------|
| Free | $0/10 users | Crippled features, 2GB storage |
| Standard | $8.15/user/month | Basic features, still slow |
| Premium | $16/user/month | Timeline, advanced roadmaps |
| Enterprise | Custom | Unlimited everything, unlimited cost |

**A 500-person engineering org on Premium?** That's **$96,000/year** for a slow, bloated issue tracker. Add Confluence? Double it.

And AI? Atlassian Intelligence is (of course) an enterprise add-on.

The real costs:
- **Speed tax** - Developers wait 3-5 seconds per page load, dozens of times daily
- **Complexity tax** - Jira admins are a full-time job
- **Lock-in tax** - Workflows, automations, custom fields trap your data
- **AI tax** - Intelligence features locked behind highest tiers

## The Solution

**jira.do** is what Jira should have been:

```
Traditional Jira              jira.do
-----------------------------------------------------------------
$8-16/user/month              $0 - run your own
Slow page loads               Instant (edge computing)
Complex configuration         Convention over configuration
AI as premium add-on          AI-native from day one
JQL queries                   JQL queries (compatible!)
Atlassian servers             Your Cloudflare account
Groovy automations            TypeScript workflows
Their ecosystem               Open ecosystem
```

## One-Click Deploy

```bash
npx create-dotdo jira
```

That's it. Your own Jira. Running on Cloudflare. Ready for issues.

Or deploy to an existing workers.do project:

```bash
npx dotdo add jira
```

## The workers.do Way

You're building a product. Your team needs issue tracking. Jira wants $100k/year and your developers spend more time waiting for pages to load than writing code. There's a better way.

**Natural language. Tagged templates. AI agents that work.**

```typescript
import { jira } from 'jira.do'
import { priya, ralph, quinn } from 'agents.do'

// Talk to your issue tracker like a human
const bugs = await jira`find critical bugs from ${sprint}`
const blocked = await jira`which stories are blocked and why?`
const myWork = await jira`what am I working on?`
```

**Promise pipelining - chain work without Promise.all:**

```typescript
// Ship a release with one pipeline
const shipped = await jira`find completed issues in ${cycle}`
  .map(issue => mark`write release notes for ${issue}`)
  .map(notes => priya`review ${notes}`)

// AI triage pipeline
const triaged = await jira`show untriaged issues`
  .map(issue => priya`analyze and prioritize ${issue}`)
  .map(issue => ralph`estimate ${issue}`)
  .map(issue => quinn`identify test cases for ${issue}`)
```

One network round trip. Record-replay pipelining. Workers working for you.

## Features

### Issue Tracking

Everything you expect from a modern issue tracker:

| Feature | Description |
|---------|-------------|
| **Issues** | Bugs, stories, tasks, epics, subtasks |
| **Projects** | Organize work by team or product |
| **Boards** | Kanban and Scrum boards |
| **Backlogs** | Prioritized work queues |
| **Sprints** | Time-boxed iterations |
| **Roadmaps** | Visual timeline planning |
| **Components** | Categorize by system area |
| **Versions** | Track releases |
| **Labels** | Flexible tagging |
| **Custom Fields** | Your data, your schema |

### JQL Compatible

Write JQL exactly like Jira:

```sql
project = BACKEND AND status = "In Progress" AND assignee = currentUser()
ORDER BY priority DESC, created ASC
```

Advanced queries work too:

```sql
project in (FRONTEND, BACKEND, MOBILE)
  AND resolution = Unresolved
  AND priority in (Critical, High)
  AND created >= -30d
  AND labels in (security, performance)
ORDER BY updated DESC
```

The JQL parser compiles to SQLite - your queries run locally, instantly.

### Agile Boards

#### Scrum Board

```typescript
import { Board, Sprint } from 'jira.do'

export const backendBoard = Board({
  name: 'Backend Scrum',
  type: 'scrum',
  project: 'BACKEND',
  columns: ['To Do', 'In Progress', 'Code Review', 'Testing', 'Done'],
  swimlanes: 'assignee',
  quickFilters: [
    { name: 'Only My Issues', jql: 'assignee = currentUser()' },
    { name: 'Critical', jql: 'priority = Critical' },
  ],
})

// Sprint management
const currentSprint = await Sprint.active('BACKEND')
await Sprint.create({
  name: 'Sprint 42',
  startDate: '2025-01-13',
  endDate: '2025-01-24',
  goal: 'Complete authentication refactor',
})
```

#### Kanban Board

```typescript
export const supportBoard = Board({
  name: 'Support Kanban',
  type: 'kanban',
  project: 'SUPPORT',
  columns: [
    { name: 'Inbox', limit: null },
    { name: 'Triage', limit: 5 },
    { name: 'Working', limit: 3 },
    { name: 'Review', limit: 2 },
    { name: 'Done', limit: null },
  ],
})
```

### Workflows

Define issue workflows in TypeScript:

```typescript
import { Workflow, Transition } from 'jira.do'

export const bugWorkflow = Workflow({
  name: 'Bug Workflow',
  statuses: ['Open', 'In Progress', 'In Review', 'Testing', 'Done'],
  transitions: [
    Transition('Open', 'In Progress', {
      validators: [{ field: 'assignee', isNotEmpty: true }],
    }),
    Transition('In Progress', 'In Review', {
      postFunctions: [
        { action: 'addLabel', value: 'needs-review' },
        { action: 'notify', recipients: ['lead'] },
      ],
    }),
    Transition('In Review', 'Testing', {
      conditions: [{ field: 'reviewer', approved: true }],
    }),
    Transition('Testing', 'Done', {
      conditions: [{ field: 'qa', approved: true }],
      postFunctions: [
        { action: 'setField', field: 'resolution', value: 'Fixed' },
      ],
    }),
  ],
})
```

### Automations

Automate repetitive tasks with TypeScript:

```typescript
import { Automation } from 'jira.do'

// Auto-assign based on component
export const componentAssignment = Automation({
  name: 'Component Auto-Assignment',
  trigger: { event: 'issue.created' },
  conditions: [
    { field: 'assignee', isEmpty: true },
    { field: 'components', isNotEmpty: true },
  ],
  actions: async (issue) => {
    const component = issue.components[0]
    const lead = await component.getLead()
    await issue.update({ assignee: lead })
  },
})

// SLA breach warning
export const slaWarning = Automation({
  name: 'SLA Breach Warning',
  trigger: { event: 'schedule', cron: '*/15 * * * *' },
  actions: async () => {
    const issues = await Issue.query(`
      priority = Critical
      AND status != Done
      AND created <= -4h
      AND labels not in (sla-warned)
    `)
    for (const issue of issues) {
      await issue.addLabel('sla-warned')
      await issue.comment('SLA breach imminent. Escalating.')
      await Slack.notify('#escalations', `Critical issue ${issue.key} approaching SLA breach`)
    }
  },
})
```

## AI-Native Issue Tracking

Here's where jira.do gets interesting. AI isn't an add-on. It's how modern issue tracking works.

### AI Triage

When issues come in, AI handles the grunt work:

```typescript
import { ai } from 'jira.do'

// AI analyzes every new issue
export const aiTriage = Automation({
  name: 'AI Triage',
  trigger: { event: 'issue.created' },
  actions: async (issue) => {
    const analysis = await ai.triage(issue, {
      estimatePoints: true,
      suggestPriority: true,
      suggestComponents: true,
      suggestAssignee: true,
      detectDuplicates: true,
      writeAcceptanceCriteria: issue.type === 'Story',
    })

    // Apply AI suggestions
    await issue.update({
      storyPoints: analysis.estimatedPoints,
      priority: analysis.suggestedPriority,
      components: analysis.suggestedComponents,
      labels: analysis.suggestedLabels,
    })

    // Add AI-generated acceptance criteria
    if (analysis.acceptanceCriteria) {
      await issue.update({
        description: issue.description + '\n\n## Acceptance Criteria\n' + analysis.acceptanceCriteria
      })
    }

    // Flag potential duplicates
    if (analysis.duplicates.length > 0) {
      await issue.addComment(`Potential duplicates: ${analysis.duplicates.map(d => d.key).join(', ')}`)
      await issue.addLabel('possible-duplicate')
    }

    // Auto-assign based on expertise
    if (analysis.suggestedAssignee) {
      await issue.update({ assignee: analysis.suggestedAssignee })
    }
  },
})
```

### AI Story Point Estimation

Never play planning poker again:

```typescript
const estimate = await ai.estimatePoints(issue, {
  historical: true,      // Learn from past issues
  codebase: true,        // Analyze relevant code
  teamVelocity: true,    // Factor in team capacity
})

// Returns:
{
  points: 5,
  confidence: 0.82,
  reasoning: "Similar to BACKEND-234 which took 4 days. Code changes in auth module are well-isolated. Team velocity suggests 5 points is achievable in one sprint.",
  comparables: ['BACKEND-234', 'BACKEND-198', 'BACKEND-312']
}
```

### AI Acceptance Criteria

Product managers rejoice:

```typescript
const story = Issue.create({
  type: 'Story',
  summary: 'User can reset password via email',
  description: 'Users need to reset their password when they forget it.',
})

// AI generates acceptance criteria
const ac = await ai.acceptanceCriteria(story)

// Returns:
`
## Acceptance Criteria

- [ ] User can click "Forgot Password" from login page
- [ ] User enters email address
- [ ] System validates email exists in database
- [ ] System sends password reset email within 30 seconds
- [ ] Email contains secure, time-limited reset link (expires in 1 hour)
- [ ] User can set new password meeting security requirements
- [ ] User receives confirmation email after password change
- [ ] User can log in with new password

## Technical Notes
- Reset tokens should use cryptographically secure random generation
- Rate limit reset requests to prevent abuse (max 5 per hour per email)
- Log all password reset attempts for security audit
`
```

### AI Bug Analysis

AI reads stack traces so you don't have to:

```typescript
const bugAnalysis = await ai.analyzeBug(issue, {
  stackTrace: issue.description,
  codebase: true,
  recentCommits: true,
})

// Returns:
{
  rootCause: "Null pointer exception in UserService.getProfile() when user.email is null",
  likelyFile: "src/services/user-service.ts:142",
  suggestedFix: "Add null check before accessing user.email property",
  recentCommit: {
    sha: "abc123",
    message: "Refactor user profile loading",
    author: "alice@company.com",
    relevance: 0.91
  },
  assigneeSuggestion: "alice@company.com"  // Author of related commit
}
```

### Natural Language Queries

Skip JQL entirely:

```typescript
import { jira } from 'jira.do'

// Natural language to JQL
const bugs = await jira`show me all critical bugs from this week`
const myWork = await jira`what am I working on?`
const blocked = await jira`which stories are blocked and why?`
const velocity = await jira`how many points did the backend team complete last sprint?`
```

### AI Sprint Planning

Let AI help plan sprints:

```typescript
const sprintPlan = await ai.planSprint({
  team: 'backend',
  capacity: 45,  // story points
  priorities: ['security', 'performance'],
  mustInclude: ['BACKEND-500', 'BACKEND-501'],  // Critical issues
})

// Returns:
{
  suggestedIssues: ['BACKEND-500', 'BACKEND-501', 'BACKEND-456', 'BACKEND-478'],
  totalPoints: 43,
  reasoning: "Prioritized security issues as requested. Included BACKEND-478 as it unblocks BACKEND-500. Left 2 points buffer for unexpected work.",
  risks: [
    "BACKEND-456 has no acceptance criteria - recommend writing before sprint start",
    "BACKEND-478 depends on external API that has been flaky"
  ]
}
```

## Real-Time Collaboration

Built on Durable Objects for true real-time:

```typescript
// Subscribe to issue changes
const subscription = issue.subscribe((change) => {
  console.log(`${change.field} changed from ${change.oldValue} to ${change.newValue} by ${change.user}`)
})

// Subscribe to board changes
const boardSub = board.subscribe((event) => {
  if (event.type === 'issue.moved') {
    console.log(`${event.issue.key} moved to ${event.column}`)
  }
})

// Presence awareness
board.onPresence((users) => {
  console.log(`${users.length} people viewing this board`)
})
```

## API Compatible

Drop-in compatibility with Jira's REST API:

```typescript
// Standard Jira REST API endpoints
GET    /rest/api/3/issue/{issueKey}
POST   /rest/api/3/issue
PUT    /rest/api/3/issue/{issueKey}
DELETE /rest/api/3/issue/{issueKey}

GET    /rest/api/3/project
GET    /rest/api/3/project/{projectKey}

POST   /rest/api/3/search  // JQL search
GET    /rest/agile/1.0/board/{boardId}/sprint
POST   /rest/agile/1.0/sprint

GET    /rest/api/3/user
GET    /rest/api/3/field
GET    /rest/api/3/workflow
```

Your existing Jira integrations work with minimal changes:

```typescript
// Existing jira-client code
import JiraClient from 'jira-client'

const jira = new JiraClient({
  host: 'your-org.jira.do',  // Just change the host
  // ... rest stays the same
})

const issue = await jira.findIssue('PROJ-123')
```

## Architecture

### Durable Object per Project

Each project runs in its own Durable Object with co-located SQLite:

```
OrganizationDO (users, permissions, global config)
  |
  +-- ProjectDO:BACKEND (all BACKEND issues)
  |     +-- SQLite: issues, comments, history
  |     +-- WebSocket: real-time subscribers
  |
  +-- ProjectDO:FRONTEND (all FRONTEND issues)
  +-- ProjectDO:MOBILE (all MOBILE issues)
  +-- BoardDO:backend-scrum (board state, filters)
  +-- SprintDO:sprint-42 (sprint data, burndown)
```

### Why Durable Objects?

- **Instant queries** - SQLite lives with your data, no network hop
- **Real-time updates** - WebSocket connections per board/issue
- **Global distribution** - Data lives close to your team
- **Transactional** - Workflows execute atomically
- **Scalable** - Each project is independent

### Storage Tiers

```typescript
// Hot: SQLite in Durable Object
// Active issues, recent activity, current sprints

// Warm: R2 object storage
// Closed issues from past 12 months, attachments

// Cold: R2 archive
// Historical data, compliance retention
```

### Multi-Tenancy

One deployment supports unlimited organizations:

```
company.jira.do          <- Your org
client-a.jira.do         <- Client A's org
opensource.jira.do       <- Open source project
```

Each org has isolated data, users, and configuration.

## Migration from Jira

One-time import of your existing Jira:

```bash
npx jira-do migrate \
  --url=https://your-company.atlassian.net \
  --email=admin@company.com \
  --token=your_api_token
```

Imports:
- All projects and issues
- Attachments and comments
- Custom fields and field configurations
- Workflows and workflow schemes
- Boards and filters
- Sprints and sprint history
- Users and groups
- Permissions and schemes

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo jira
# Deploys to your Cloudflare account
```

### Docker

```bash
docker run -p 8787:8787 dotdo/jira
```

### Self-Hosted

```bash
git clone https://github.com/dotdo/jira.do
cd jira.do
npm install
npm run dev     # Local development
npm run deploy  # Production deployment
```

## Roadmap

- [x] Issues, projects, components, versions
- [x] JQL parser and query engine
- [x] Scrum and Kanban boards
- [x] Sprints and backlogs
- [x] Workflows and transitions
- [x] Custom fields
- [x] REST API compatibility
- [x] AI triage and estimation
- [ ] Advanced roadmaps
- [ ] Confluence integration (confluence.do)
- [ ] Tempo/time tracking
- [ ] Structure (hierarchies beyond epics)
- [ ] ScriptRunner compatibility
- [ ] Jira Service Management mode

## Why Open Source?

Issue tracking is too critical to be held hostage:

1. **Your workflow** - How you build software is your competitive advantage
2. **Your data** - Issues, decisions, and history are institutional knowledge
3. **Your speed** - Why should your team wait on slow software?
4. **Your AI** - Intelligence on your data should be yours

Jira showed the world what issue tracking could be. **jira.do** makes it fast, intelligent, and accessible to everyone.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Key areas:
- JQL parser extensions
- Board and workflow features
- API compatibility
- AI/MCP integrations
- Performance optimization

## License

MIT License - Use it however you want. Build your business on it. Fork it. Make it your own.

---

<p align="center">
  <strong>jira.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://jira.do">Website</a> | <a href="https://docs.jira.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
