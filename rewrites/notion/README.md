# notion.do

> The everything workspace. Open source. AI-native.

Notion changed how teams think about tools. Docs, wikis, databases, projects - all in one. But at $10-15/user/month with AI as a premium add-on, and growing performance issues at scale, it's time for something better.

**notion.do** is Notion reimagined. Block-based editing. Databases with formulas. AI built into every block. Deploy your own. Own your data.

## AI-Native API

```typescript
import { notion } from 'notion.do'           // Full SDK
import { notion } from 'notion.do/tiny'      // Minimal client
import { notion } from 'notion.do/blocks'    // Block operations only
```

Natural language for your workspace:

```typescript
import { notion } from 'notion.do'

// Talk to it like a colleague
const tasks = await notion`my tasks not done, sorted by priority`
const overdue = await notion`what's overdue this week?`
const blockers = await notion`which team has the most blockers?`

// Chain like sentences
await notion`feature requests from users`
  .map(request => notion`prioritize ${request}`)
  .map(feature => notion`add to roadmap`)

// Meetings that document themselves
await notion`start meeting notes for Q1 planning`
  .listen()           // captures discussion
  .summarize()        // key points extracted
  .actionItems()      // tasks assigned automatically
```

## The Problem

Notion became essential infrastructure. Then came the pricing:

| Notion Plan | Price | AI Add-on |
|-------------|-------|-----------|
| Free | $0 | Limited blocks, no AI |
| Plus | $10/user/month | +$10/user for AI |
| Business | $15/user/month | +$10/user for AI |
| Enterprise | Custom | +$10/user for AI |

**100-person team on Business with AI?** That's **$30,000/year**.

The hidden costs:
- **Performance at scale** - Large workspaces get painfully slow
- **AI is bolted on** - Not native, feels like an afterthought
- **Block limits on free tier** - Artificial scarcity
- **Complex permissions** - Hard to manage who sees what
- **No self-hosting** - Your company's knowledge on their servers

## The Solution

**notion.do** is what Notion should be:

```
Traditional Notion             notion.do
-----------------------------------------------------------------
$10-25/user/month              $0 - run your own
AI as premium add-on           AI-native in every block
Slow at scale                  Edge computing, instant
Their servers                  Your Cloudflare account
Proprietary format             Open format, exportable
Block limits                   Unlimited
```

## One-Click Deploy

```bash
npx create-dotdo notion
```

Your own Notion. Running on Cloudflare. AI everywhere.

```typescript
import { Notion } from 'notion.do'

export default Notion({
  name: 'my-workspace',
  domain: 'wiki.my-startup.com',
  ai: {
    enabled: true,
    model: 'claude-3-opus',
  },
})
```

## Features

### Pages & Blocks

```typescript
// Find and navigate
const page = await notion`Q1 roadmap`
const meetings = await notion`meeting notes from last week`
const docs = await notion`engineering docs about auth`

// Create naturally
await notion`new page: Product Roadmap Q1 2025`
await notion`add a callout: this is a living document`
await notion`insert a toggle with key metrics`

// AI infers what you need
await notion`Q1 roadmap`                    // returns page
await notion`summarize Q1 roadmap`          // returns summary
await notion`tasks from Q1 roadmap`         // returns linked tasks
```

### Block Types

| Type | Description |
|------|-------------|
| **Text** | Paragraph, heading (1-3), quote, callout |
| **Lists** | Bullet, numbered, to-do, toggle |
| **Media** | Image, video, audio, file, bookmark |
| **Embeds** | Code, equation, table, database |
| **Advanced** | Synced block, template, AI block |
| **Columns** | Multi-column layouts |

### Databases

The killer feature. Spreadsheet meets database:

```typescript
// Create databases naturally
await notion`create Tasks database with status, priority, assignee, due date`
await notion`add Projects database with budget, timeline, owner`

// Query with plain language
const myTasks = await notion`my tasks not done, sorted by priority`
const urgent = await notion`high priority bugs assigned to me`
const overdue = await notion`tasks past due date`

// Views just work
await notion`show Tasks as kanban by status`
await notion`show Projects as timeline by deadline`
await notion`show Bugs as calendar by due date`
```

### Database Views

Same data, infinite perspectives:

```typescript
// Switch views naturally
await notion`Tasks as table`
await notion`Tasks as board grouped by status`
await notion`Tasks as calendar by due date`
await notion`Tasks as timeline by assignee`
await notion`Tasks as gallery with cover images`

// Filter and sort
await notion`Tasks where status is not done, sorted by priority desc`
await notion`Projects where budget > 100k, by deadline`
```

### Formulas & Rollups

```typescript
// Formulas in plain language
await notion`add Progress formula: completed points / total points`
await notion`add Health indicator: red if over budget, green otherwise`
await notion`add Days Until Due: due date minus today`

// Rollups across relations
await notion`add Total Points rollup from Tasks`
await notion`add Completed Count: count of done tasks`
```

### Relations

```typescript
// Connect databases naturally
await notion`link Tasks to Projects`
await notion`add Sprint relation to Tasks`

// Query across relations
await notion`tasks for Project Alpha`
await notion`projects with overdue tasks`
await notion`sprints with most incomplete work`
```

## AI-Native Workspace

AI isn't an add-on. It's woven into every block.

### AI Writing

```typescript
// Just ask
await notion`draft the quarterly update email`
await notion`make this more concise`
await notion`translate to Spanish`
await notion`fix grammar and improve clarity`

// Continue or improve
await notion`continue writing`
await notion`make it longer with more detail`
await notion`change tone to professional`
```

### AI Understanding

```typescript
// Summarize anything
await notion`summarize this page`
await notion`what were the key decisions?`
await notion`give me the TLDR`

// Extract insights
await notion`what action items came from this meeting?`
await notion`who owns what from these notes?`
await notion`what are the blockers mentioned?`

// Compare and analyze
await notion`compare Q1 and Q2 roadmaps`
await notion`what changed since last planning session?`
```

### AI Database Operations

```typescript
// Fill in missing data
await notion`fill in descriptions based on titles and tags`
await notion`categorize these entries as feature, bug, or improvement`

// Create from natural language
await notion`add high priority bug: login failing on mobile`
// Creates: { Name: 'Login failing on mobile', Priority: 'High', Tags: ['bug'] }

// Bulk operations
await notion`mark all tasks from last sprint as done`
await notion`move stale items to backlog`

// AI suggestions
await notion`what features should we build next quarter?`
await notion`suggest priorities based on user feedback`
```

### Natural Language Queries

Query your workspace with plain English:

```typescript
// Find anything
await notion`what did we decide about pricing?`
await notion`when is the launch date?`
await notion`who's responsible for onboarding?`

// Cross-database analysis
await notion`compare planned features against user feedback, what are we missing?`
await notion`which projects are at risk based on task completion?`

// Workspace-wide search
await notion`everything about the mobile app`
await notion`decisions made in December`
```

### AI Workspace Assistant

Chat with your entire workspace:

```typescript
const insights = await notion`
  analyze our velocity this quarter
  compared to last quarter
  and identify bottlenecks
`

const brief = await notion`
  draft a project brief for the mobile app
  based on our roadmap and user feedback
`

const blockers = await notion`
  what are the blockers for the Q1 launch?
  who needs to unblock what?
`
```

## Real-Time Collaboration

```typescript
// See who's working
await notion`who's viewing this page?`
await notion`what's Alice working on?`

// Comments and discussions
await notion`comment: should we reconsider this approach? @alice`
await notion`resolve all comments on this section`

// Track changes
await notion`what changed today?`
await notion`show edit history for this page`
```

## Synced Blocks

```typescript
// Create reusable content
await notion`create synced block: company mission statement`

// Use everywhere
await notion`insert company mission synced block here`

// Changes sync automatically
await notion`update company mission`  // updates everywhere
```

## Templates

```typescript
// Create templates naturally
await notion`create Meeting Notes template with agenda, notes, action items`
await notion`create Bug Report template with severity, steps to reproduce, expected behavior`

// Use templates
await notion`new page from Meeting Notes template for Q1 Planning`
await notion`create bug report: checkout button unresponsive`
```

## API Compatible

Full compatibility with Notion API:

```typescript
// Standard Notion API endpoints
GET    /v1/pages/{page_id}
POST   /v1/pages
PATCH  /v1/pages/{page_id}
DELETE /v1/blocks/{block_id}

GET    /v1/databases/{database_id}
POST   /v1/databases
POST   /v1/databases/{database_id}/query

GET    /v1/blocks/{block_id}/children
PATCH  /v1/blocks/{block_id}

POST   /v1/search
```

Existing Notion integrations work:

```typescript
// Your existing Notion SDK code
import { Client } from '@notionhq/client'

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  baseUrl: 'https://your-org.notion.do',  // Just add baseUrl
})

const page = await notion.pages.retrieve({ page_id: 'abc123' })
```

## Architecture

### Durable Object per Workspace

Each workspace is isolated:

```
WorkspaceDO (workspace config, permissions)
  |
  +-- PageDO:page-123 (page content, blocks)
  |     +-- SQLite: blocks, comments, history
  |     +-- WebSocket: real-time collaboration
  |
  +-- DatabaseDO:db-456 (database schema, rows)
  |     +-- SQLite: rows, relations
  |     +-- Views, filters, sorts
  |
  +-- SearchDO (vector embeddings, full-text index)
  +-- AIDO (AI context, conversation history)
```

### Block Storage

Efficient block tree storage:

```typescript
// Block tree stored in SQLite
interface BlockRow {
  id: string
  type: string
  content: object        // Block content
  parent_id: string      // Parent block
  page_id: string        // Root page
  order: number          // Position in parent
  created_at: string
  updated_at: string
}

// Fetch page with all blocks in one query
const blocks = await db.query(`
  WITH RECURSIVE block_tree AS (
    SELECT * FROM blocks WHERE id = ?
    UNION ALL
    SELECT b.* FROM blocks b
    JOIN block_tree bt ON b.parent_id = bt.id
  )
  SELECT * FROM block_tree ORDER BY depth, order
`, [pageId])
```

### Real-Time Sync

CRDT-based conflict resolution:

```typescript
// Every change becomes an operation
interface Operation {
  type: 'insert' | 'update' | 'delete' | 'move'
  blockId: string
  path: string[]
  value: any
  timestamp: number
  userId: string
}

// Operations merge without conflicts
const merged = crdt.merge(localOps, remoteOps)
```

## Migration from Notion

Import your existing Notion workspace:

```bash
npx notion-do migrate \
  --token=your_notion_integration_token \
  --workspace=your_workspace_id
```

Or just ask:

```typescript
await notion`import my Notion workspace`
```

Imports:
- All pages and databases
- Block content and formatting
- Database schemas and views
- Relations and rollups
- Comments and discussions
- Permissions (best effort)
- Page icons and covers

## Deployment Options

### Cloudflare Workers (Recommended)

```bash
npx create-dotdo notion
# Deploys to your Cloudflare account
```

### Docker

```bash
docker run -p 8787:8787 dotdo/notion
```

### Self-Hosted

```bash
git clone https://github.com/dotdo/notion.do
cd notion.do
npm install
npm run dev     # Local development
npm run deploy  # Production deployment
```

## vs Notion

| Feature | Notion | notion.do |
|---------|--------|-----------|
| **Cost** | $10-25/user/month | $0 - run your own |
| **AI** | +$10/user add-on | Built into every block |
| **Performance** | Slow at scale | Edge computing, instant |
| **Data Location** | Their servers | Your Cloudflare account |
| **Format** | Proprietary | Open, exportable |
| **Block Limits** | Artificial scarcity | Unlimited |
| **Self-Hosting** | Impossible | One command |
| **API** | Rate limited | Your infrastructure |

## Roadmap

- [x] Block-based editor
- [x] All standard block types
- [x] Databases with all property types
- [x] Views (table, board, calendar, timeline, gallery, list)
- [x] Formulas and rollups
- [x] Real-time collaboration
- [x] API compatibility
- [x] AI writing and AI blocks
- [ ] Synced blocks
- [ ] Template marketplace
- [ ] Automations
- [ ] Public pages and websites
- [ ] Advanced permissions
- [ ] Notion Import (full fidelity)

## Why Open Source?

Your workspace is too important to rent:

1. **Your knowledge** - Documents, databases, and decisions are your company
2. **Your workflow** - How you organize work is competitive advantage
3. **Your data** - Notion stores everything - that should be yours
4. **Your AI** - Intelligence on your workspace should be yours

Notion showed the world what a modern workspace could be. **notion.do** makes it open, fast, and AI-native.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Key areas:
- Block types and editor experience
- Database features and performance
- AI capabilities
- API compatibility
- Import/export tools

## License

MIT License - Use it however you want. Build your business on it. Fork it. Make it your own.

---

<p align="center">
  <strong>notion.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://notion.do">Website</a> | <a href="https://docs.notion.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
