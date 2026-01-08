# jira.do

> Atlassian's $3B cash cow. Now open source. AI-native.

Jira became synonymous with issue tracking. It also became synonymous with slowness, complexity, and eye-watering enterprise pricing. Every developer knows the pain: waiting for pages to load, clicking through endless configuration screens, paying $8.15/user/month that somehow balloons to six figures annually.

**jira.do** reimagines issue tracking for the AI era. Deploy your own Jira. Natural language queries. AI that triages bugs, writes acceptance criteria, and estimates story points while you sleep.

## AI-Native API

```typescript
import { jira } from 'jira.do'           // Full SDK
import { jira } from 'jira.do/tiny'      // Minimal client
import { jira } from 'jira.do/agile'     // Scrum/Kanban operations
```

Natural language for project management:

```typescript
import { jira } from 'jira.do'

// Talk to it like a colleague
const bugs = await jira`critical bugs blocking release`
const myWork = await jira`my issues in current sprint`
const blocked = await jira`what's blocked and why?`

// Chain like sentences
await jira`untriaged bugs this week`
  .map(bug => jira`triage ${bug}`)
  .map(bug => jira`assign ${bug} to on-call`)

// Ship a release with one pipeline
await jira`completed since last release`
  .map(issue => jira`add to release notes ${issue}`)
  .notify(`#releases`)
```

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
JQL queries                   Natural language
Atlassian servers             Your Cloudflare account
Groovy automations            Say what you want
Their ecosystem               Open ecosystem
```

## One-Click Deploy

```bash
npx create-dotdo jira
```

That's it. Your own Jira. Running on Cloudflare. Ready for issues.

```typescript
import { Jira } from 'jira.do'

export default Jira({
  name: 'my-startup',
  domain: 'issues.my-startup.com',
})
```

## Features

### Issues

```typescript
// Create issues naturally
await jira`create bug "Login broken on Safari" priority high`
await jira`new story "User can export dashboard as PDF"`
await jira`add task "Update dependencies" to current sprint`

// Find issues by talking
await jira`my open bugs`
await jira`unassigned stories in backend`
await jira`blockers for release 2.0`
await jira`what did I close this week?`

// AI infers what you need
await jira`BACKEND-123`                    // returns the issue
await jira`comments on BACKEND-123`        // returns comments
await jira`history of BACKEND-123`         // returns changelog
```

### Sprints

```typescript
// Sprint management as conversation
await jira`start sprint "Auth Refactor" two weeks`
await jira`current sprint progress`
await jira`what's left in this sprint?`
await jira`close sprint and move incomplete to backlog`

// Sprint planning with AI
await jira`plan next sprint 40 points`     // AI picks from backlog
await jira`can we fit BACKEND-456 in this sprint?`
```

### Boards

```typescript
// Scrum or Kanban, just ask
await jira`show backend board`
await jira`what's in code review?`
await jira`move BACKEND-123 to testing`

// Board health
await jira`blocked items on frontend board`
await jira`what's been in progress too long?`
```

### Workflows

```typescript
// Transition issues naturally
await jira`start work on BACKEND-123`
await jira`BACKEND-123 ready for review`
await jira`close BACKEND-123 as fixed`

// Bulk transitions
await jira`close all done issues in sprint`
await jira`reopen BACKEND-100 through BACKEND-110`
```

### Automations

```typescript
// Describe what you want, AI makes it happen
await jira`when bugs are created, assign to on-call`
await jira`notify #frontend when frontend issues are critical`
await jira`escalate if critical bugs sit untouched for 4 hours`

// Or chain it yourself
await jira`new critical bugs`
  .each(bug => jira`assign ${bug} to on-call`)
  .notify(`#escalations`)
```

## AI-Native Issue Tracking

Here's where jira.do gets interesting. AI isn't an add-on. It's how modern issue tracking works.

### AI Triage

```typescript
// New issues triage themselves
await jira`triage new bugs`
  .map(bug => jira`estimate ${bug}`)
  .map(bug => jira`assign ${bug} by expertise`)

// Or ask for analysis
await jira`analyze BACKEND-456`
// AI returns: priority suggestion, estimate, likely assignee, potential duplicates

// Find duplicates before they multiply
await jira`is BACKEND-789 a duplicate?`
await jira`similar issues to "login timeout on mobile"`
```

### AI Estimation

```typescript
// Never play planning poker again
await jira`estimate BACKEND-456`
// AI compares to similar historical issues, analyzes code complexity

// Bulk estimation
await jira`estimate unpointed stories in backlog`

// Sprint capacity planning
await jira`can backend team fit 45 points next sprint?`
await jira`what's realistic for next sprint?`
```

### AI Acceptance Criteria

```typescript
// AI writes acceptance criteria from story descriptions
await jira`write acceptance criteria for BACKEND-456`

// Or generate from scratch
await jira`create story "password reset via email" with AC`
// AI generates full acceptance criteria, edge cases, security notes

// Batch it
await jira`stories missing acceptance criteria`
  .map(story => jira`write acceptance criteria for ${story}`)
```

### AI Bug Analysis

```typescript
// AI reads stack traces so you don't have to
await jira`analyze bug BACKEND-789`
// Returns: root cause, likely file, suggested fix, who to assign

// Find the culprit
await jira`who should fix BACKEND-789?`
// AI checks recent commits, code ownership, current workload

// Connect the dots
await jira`what commit caused BACKEND-789?`
await jira`related issues to BACKEND-789`
```

### AI Sprint Planning

```typescript
// Let AI plan your sprint
await jira`plan next sprint for backend team`
await jira`plan sprint prioritizing security issues`

// What-if scenarios
await jira`what if we add BACKEND-456 to current sprint?`
await jira`sprint risks for current sprint`

// Retrospective insights
await jira`why did last sprint slip?`
await jira`what patterns in our blocked issues?`
```

## Real-Time Collaboration

```typescript
// Watch issues live
await jira`watch BACKEND-123`
  .on('change', delta => console.log(`${delta.field} changed`))

// Board presence
await jira`show backend board`
  .on('move', issue => console.log(`${issue.key} moved`))
  .on('presence', users => console.log(`${users.length} viewing`))

// Team activity stream
await jira`backend team activity today`
```

## API Compatible

Drop-in compatibility with Jira's REST API. Your existing integrations work:

```typescript
// Existing jira-client code
import JiraClient from 'jira-client'

const jira = new JiraClient({
  host: 'your-org.jira.do',  // Just change the host
  // ... rest stays the same
})

const issue = await jira.findIssue('PROJ-123')
```

Standard REST endpoints supported: issues, projects, boards, sprints, search, users, fields, workflows.

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

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Active issues, current sprints | <10ms |
| **Warm** | R2 + SQLite Index | Closed issues (past 12 months) | <100ms |
| **Cold** | R2 Archive | Historical data, compliance | <1s |

### Multi-Tenancy

One deployment supports unlimited organizations:

```
company.jira.do          <- Your org
client-a.jira.do         <- Client A's org
opensource.jira.do       <- Open source project
```

Each org has isolated data, users, and configuration.

## vs Jira Cloud

| Feature | Jira Cloud | jira.do |
|---------|-----------|---------|
| **Cost** | $8-16/user/month | ~$5/month total |
| **Page Load** | 3-5 seconds | <100ms |
| **Architecture** | Atlassian Cloud | Edge-native, global |
| **Queries** | JQL only | Natural language |
| **AI** | Enterprise add-on | Built-in from day one |
| **Data Location** | Atlassian data centers | Your Cloudflare account |
| **Customization** | Marketplace apps | Code it yourself |
| **Lock-in** | Years of migration | MIT licensed |

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

### Core
- [x] Issues, projects, components, versions
- [x] Natural language queries
- [x] Scrum and Kanban boards
- [x] Sprints and backlogs
- [x] Workflows and transitions
- [x] Custom fields
- [x] REST API compatibility

### AI
- [x] AI triage and estimation
- [x] Acceptance criteria generation
- [x] Bug analysis and assignment
- [x] Sprint planning assistance
- [ ] Predictive velocity
- [ ] Burndown forecasting

### Integrations
- [ ] Advanced roadmaps
- [ ] Confluence integration (confluence.do)
- [ ] Tempo/time tracking
- [ ] GitHub/GitLab sync
- [ ] Slack/Teams notifications

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
- Natural language query extensions
- Board and workflow features
- API compatibility
- AI/MCP integrations
- Performance optimization

## License

MIT License - Use it however you want. Build your business on it. Fork it. Make it your own.

---

<p align="center">
  <strong>The $96k/year issue tracker ends here.</strong>
  <br />
  Natural language. AI-native. Your infrastructure.
  <br /><br />
  <a href="https://jira.do">Website</a> |
  <a href="https://docs.jira.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/jira.do">GitHub</a>
</p>
