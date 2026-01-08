# linear.do

> Modern issue tracking. Blazing fast. Open source. AI-automated.

Linear showed the world what issue tracking could feel like - instant, keyboard-driven, beautifully designed. But at $8-14/user/month with the good features locked behind Plus tier, and no self-hosting option, teams are still paying rent for their workflow.

**linear.do** is Linear reimagined. The same speed and elegance. AI that triages, writes, and ships. Deploy your own. Own your engineering workflow.

## AI-Native API

```typescript
import { linear } from 'linear.do'           // Full SDK
import { linear } from 'linear.do/tiny'      // Minimal client
import { linear } from 'linear.do/graphql'   // GraphQL-only operations
```

Natural language for engineering workflows:

```typescript
import { linear } from 'linear.do'

// Talk to it like a colleague
const blocked = await linear`what's blocking the release?`
const myWork = await linear`what should I work on today?`
const atRisk = await linear`issues at risk of missing deadline`

// Chain like sentences
await linear`bugs reported this week`
  .map(bug => linear`triage ${bug}`)

// Issues that manage themselves
await linear`create issue "Add dark mode" in Frontend team`
  .estimate()         // AI estimates points
  .assign()           // AI suggests assignee
  .schedule()         // adds to current cycle
```

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

## Promise Pipelining

Chain work without `Promise.all`:

```typescript
import { linear } from 'linear.do'
import { priya, ralph, mark } from 'agents.do'

// Release pipeline
await linear`completed issues this cycle`
  .map(issue => mark`write release notes for ${issue}`)
  .map(notes => priya`review ${notes}`)

// Triage pipeline
await linear`triage inbox`
  .map(issue => priya`analyze and prioritize ${issue}`)
  .map(issue => ralph`estimate ${issue}`)
  .map(issue => linear`route ${issue} to appropriate project`)

// Review pipeline
await linear`issues ready for review`
  .map(issue => [priya, ralph].map(r => r`review ${issue}`))
```

One network round trip. Record-replay pipelining. Workers working for you.

## Features

### Issues

The core of everything:

```typescript
import { linear } from 'linear.do'

// Create issues naturally
await linear`create issue "Implement WebSocket connection pooling" for backend`
await linear`add to q1-performance cycle 42 priority high`
await linear`assign to alice estimate 5 points`

// Or all at once, like you'd say it
await linear`
  create issue "Implement WebSocket connection pooling" in backend:
  - priority high
  - labels: performance, infrastructure
  - project q1-performance
  - cycle 42
  - estimate 5 points
  - assign to alice
`

// Sub-issues
await linear`add subtask "Design connection pool architecture" estimate 2`
await linear`add subtask "Implement pool manager" estimate 3`
```

### The Speed

Linear's signature instant feel, even faster on the edge:

```typescript
// Move issues naturally
await linear`move BACK-101 to in progress`
await linear`start working on BACK-101`       // same thing
await linear`mark BACK-101 done`

// Batch updates read like commands
await linear`close all completed issues in cycle 42`
await linear`assign my inbox to me`
await linear`move blocked issues to next cycle`

// Real-time sync - all clients update instantly
```

### Workflows

Customizable issue states:

```typescript
// Query workflow states
await linear`workflow states for backend team`
await linear`issues in review`
await linear`what's in progress?`

// Move through workflows naturally
await linear`move BACK-101 to review`
await linear`BACK-101 needs review`           // same thing
await linear`mark BACK-101 as duplicate of BACK-50`
```

### Cycles (Sprints)

Time-boxed iterations:

```typescript
// Create cycles naturally
await linear`create cycle 42 for backend starting Monday`
await linear`new sprint "Connection Pooling" Jan 13-24`

// Add issues like you'd say it
await linear`add BACK-101 BACK-102 BACK-103 to cycle 42`
await linear`move my issues to current cycle`
await linear`schedule high priority bugs for this sprint`

// Check progress
await linear`how's cycle 42 going?`
await linear`burndown for current cycle`
await linear`scope creep this sprint`
```

### Projects

Group issues into larger initiatives:

```typescript
// Create projects naturally
await linear`create project "Q1 Performance" for backend led by alice`
await linear`project goal: improve p99 latency by 50%`
await linear`project runs Jan through March`

// Add milestones like a checklist
await linear`
  milestones for Q1 Performance:
  - Baseline metrics by Jan 15
  - Connection pooling by Feb 1
  - Caching layer by Feb 15
  - Target achieved by Mar 15
`

// Check progress
await linear`how's Q1 Performance doing?`
await linear`at risk projects this quarter`
```

### Roadmaps

Visualize the big picture:

```typescript
// Query roadmaps naturally
await linear`engineering roadmap 2025`
await linear`what's planned for Q2?`
await linear`projects by team this year`

// Create and update
await linear`create roadmap "Engineering 2025" with Q1 Performance, Q2 Scaling, Mobile App, API v2`
await linear`add Mobile App to Q3 roadmap`
```

### Triage

Handle incoming issues efficiently:

```typescript
// Check triage queue
await linear`triage inbox for backend`
await linear`untriaged issues this week`
await linear`issues needing attention`

// Triage naturally
await linear`triage BACK-150 to Q1 Performance current cycle high priority 3 points`
await linear`snooze BACK-151 until next week`
await linear`close BACK-152 wont fix - out of scope`

// Bulk triage with AI assist
await linear`triage inbox`
  .map(issue => linear`auto-triage ${issue}`)
```

### Views

Custom filtered views:

```typescript
// Query views naturally
await linear`my work`
await linear`my issues not done grouped by project`
await linear`blocked issues in progress or review`

// Save views for reuse
await linear`save view "My Work": my issues not done sorted by priority`
await linear`save view "Blockers": issues labeled blocked in progress`

// Use saved views
await linear`show my work`
await linear`blockers this sprint`
```

## AI-Native Issue Tracking

AI isn't a feature. It's how modern issue tracking works.

### AI Triage

AI handles the triage queue:

```typescript
// Enable AI triage naturally
await linear`enable AI triage for backend team`
await linear`auto-label auto-assign auto-estimate new issues`

// AI triage in action
await linear`triage inbox`
  .map(issue => linear`analyze and triage ${issue}`)

// When issue comes in, AI:
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
await linear`draft issue: login page is slow for some users`

// AI creates full issue with:
// - Clear title
// - Problem statement
// - Investigation checklist
// - Potential causes
// - Suggested labels, priority

// Bug reports expand automatically
await linear`bug: users seeing 500 error uploading files over 10mb`

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
await linear`create issue "Add rate limiting to upload endpoint" with code context`

// AI automatically adds:
// - Links to relevant files
// - Notes about existing patterns
// - Suggested implementation approach
// - Potential impact areas

// Ask about code impact
await linear`what would changing the auth middleware affect?`
await linear`issues related to upload endpoint`
```

### AI Estimation

AI estimates story points:

```typescript
// Estimate issues naturally
await linear`estimate BACK-100`
await linear`how long would this take?`

// AI returns:
// - Estimate: 5 points
// - Confidence: 84%
// - Reasoning: Similar to BACK-234 (5 points, 4 days)
// - Risks: Touches auth middleware - needs careful testing

// Bulk estimation
await linear`estimate all unestimated issues in triage`
await linear`untriaged issues`
  .map(issue => linear`estimate ${issue}`)
```

### AI Cycle Planning

AI helps plan sprints:

```typescript
// Plan cycles naturally
await linear`plan next cycle for backend with 40 points capacity`
await linear`plan sprint including BACK-100 prioritizing security and performance`

// AI suggests:
// - Issues to include with reasoning
// - Total points (39/40)
// - Risks and dependencies
// - Recommendations for sequencing

// Accept or adjust
await linear`accept cycle plan`
await linear`remove BACK-120 from plan, add BACK-125 instead`
```

### AI Release Notes

AI writes release notes from completed issues:

```typescript
// Generate release notes naturally
await linear`release notes for cycle 42`
await linear`changelog for this sprint`
await linear`write release announcement for v2.5`

// Different formats
await linear`release notes for cycle 42 as blog post`
await linear`release notes for cycle 42 for slack`

// AI generates from completed issues:
// - New features with impact
// - Bug fixes
// - Performance improvements
// - Breaking changes
```

### Natural Language Queries

Query issues conversationally:

```typescript
// Ask anything
await linear`what's blocking the release?`
await linear`what should I work on today?`
await linear`how did we do last cycle compared to average?`
await linear`which issues are at risk of missing the deadline?`
await linear`who's overloaded this sprint?`
await linear`show me bugs reported this week`
```

## GitHub Integration

Deep GitHub integration built-in:

```typescript
// Connect naturally
await linear`connect to github company/backend`
await linear`sync github issues labeled linear-sync to Q1 Performance`

// Auto-transitions (enabled by default)
// - PR opened -> issue moves to In Review
// - PR merged -> issue moves to Done
// - Branch with issue ID auto-links

// Query GitHub context
await linear`PRs linked to BACK-101`
await linear`issues waiting on code review`
```

## API Compatibility

Full Linear API compatibility - existing SDKs just work:

```typescript
import { LinearClient } from '@linear/sdk'

const client = new LinearClient({
  apiKey: process.env.LINEAR_TOKEN,
  apiUrl: 'https://your-org.linear.do/graphql',  // Just change URL
})

// Existing code works unchanged
const issues = await client.issues({
  filter: { team: { key: { eq: 'BACK' } } },
})
```

GraphQL API at `/graphql`. Same schema. Same queries. Same mutations.

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
