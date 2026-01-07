# notion.do

> The everything workspace. Open source. AI-native.

Notion changed how teams think about tools. Docs, wikis, databases, projects - all in one. But at $10-15/user/month with AI as a premium add-on, and growing performance issues at scale, it's time for something better.

**notion.do** is Notion reimagined. Block-based editing. Databases with formulas. AI built into every block. Deploy your own. Own your data.

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

```bash
# Or add to existing workers.do project
npx dotdo add notion
```

## Features

### Block-Based Editor

Everything is a block. Blocks compose infinitely:

```typescript
import { Block, Page } from 'notion.do'

const page = Page.create({
  title: 'Product Roadmap Q1 2025',
  icon: '🚀',
  cover: '/covers/gradient-purple.png',
  blocks: [
    Block.heading1('Q1 2025 Roadmap'),
    Block.paragraph('Our focus areas for the quarter.'),
    Block.callout('💡', 'This is a living document. Update as priorities shift.'),
    Block.toggle('Key Metrics', [
      Block.bulletList([
        'DAU: 50k → 100k',
        'Revenue: $1M ARR → $2M ARR',
        'NPS: 45 → 60',
      ]),
    ]),
    Block.heading2('Features'),
    Block.database('features-db'),  // Embedded database
    Block.divider(),
    Block.heading2('Timeline'),
    Block.embed('timeline-view', { database: 'features-db' }),
  ],
})
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
import { Database, Property } from 'notion.do'

const tasksDb = Database.create({
  name: 'Tasks',
  properties: {
    Name: Property.title(),
    Status: Property.select(['Not Started', 'In Progress', 'Done']),
    Priority: Property.select(['Low', 'Medium', 'High', 'Critical']),
    Assignee: Property.person(),
    Due: Property.date(),
    Sprint: Property.relation('sprints-db'),
    Points: Property.number({ format: 'number' }),
    Tags: Property.multiSelect(['bug', 'feature', 'chore', 'docs']),
    Created: Property.createdTime(),
    Updated: Property.lastEditedTime(),
  },
})

// Query the database
const myTasks = await tasksDb.query({
  filter: {
    and: [
      { property: 'Assignee', person: { contains: currentUser.id } },
      { property: 'Status', select: { does_not_equal: 'Done' } },
    ],
  },
  sort: [
    { property: 'Priority', direction: 'descending' },
    { property: 'Due', direction: 'ascending' },
  ],
})
```

### Database Views

Same data, infinite perspectives:

```typescript
// Table view (default)
const tableView = View.table({
  properties: ['Name', 'Status', 'Priority', 'Assignee', 'Due'],
  filter: { property: 'Status', select: { does_not_equal: 'Done' } },
})

// Kanban board
const boardView = View.board({
  groupBy: 'Status',
  properties: ['Priority', 'Assignee', 'Due'],
})

// Calendar
const calendarView = View.calendar({
  dateProperty: 'Due',
  properties: ['Status', 'Priority'],
})

// Timeline (Gantt)
const timelineView = View.timeline({
  dateProperty: 'Due',
  groupBy: 'Assignee',
})

// Gallery
const galleryView = View.gallery({
  coverProperty: 'Cover',
  properties: ['Name', 'Status'],
})

// List
const listView = View.list({
  properties: ['Status', 'Priority'],
})
```

### Formulas

Computed properties with full formula language:

```typescript
const projectsDb = Database.create({
  name: 'Projects',
  properties: {
    Name: Property.title(),
    Budget: Property.number({ format: 'dollar' }),
    Spent: Property.rollup({
      relation: 'expenses',
      property: 'Amount',
      function: 'sum',
    }),
    Remaining: Property.formula('Budget - Spent'),
    PercentUsed: Property.formula('round(Spent / Budget * 100)'),
    Status: Property.formula(`
      if(PercentUsed >= 100, "Over Budget",
        if(PercentUsed >= 80, "Warning",
          if(PercentUsed >= 50, "On Track", "Under Budget")))
    `),
    Health: Property.formula(`
      if(Status == "Over Budget", "🔴",
        if(Status == "Warning", "🟡", "🟢"))
    `),
  },
})
```

### Relations & Rollups

Connect databases together:

```typescript
// Projects have many Tasks
const projectsDb = Database.create({
  properties: {
    Tasks: Property.relation('tasks-db', { type: 'dual' }),
    TotalPoints: Property.rollup({
      relation: 'Tasks',
      property: 'Points',
      function: 'sum',
    }),
    CompletedPoints: Property.rollup({
      relation: 'Tasks',
      property: 'Points',
      filter: { Status: 'Done' },
      function: 'sum',
    }),
    Progress: Property.formula('round(CompletedPoints / TotalPoints * 100) + "%"'),
  },
})
```

## AI-Native Workspace

AI isn't an add-on. It's woven into every block.

### AI Writing

Every text block has AI capabilities:

```typescript
// AI writing assistant in any block
Block.paragraph({
  content: 'Draft the quarterly update email...',
  aiAssist: {
    draft: true,        // AI drafts based on context
    tone: 'professional',
    length: 'medium',
  },
})

// AI continues writing
await block.aiContinue()

// AI improves existing text
await block.aiImprove({
  action: 'make-concise',  // or 'make-longer', 'fix-grammar', 'change-tone'
})

// AI translates
await block.aiTranslate('spanish')
```

### AI Blocks

Special blocks powered by AI:

```typescript
// AI Summary Block - auto-summarizes page content
Block.aiSummary({
  source: 'page',  // or 'database', 'selection'
  length: 'short',
  update: 'on-change',  // Keep summary fresh
})

// AI Q&A Block - answers questions from page content
Block.aiQA({
  question: 'What are the key decisions?',
  source: ['this-page', 'linked-pages'],
})

// AI Action Items Block - extracts todos from meeting notes
Block.aiActionItems({
  source: 'page',
  assignees: 'auto-detect',  // AI figures out who owns what
})

// AI Table Block - generates tables from prompts
Block.aiTable({
  prompt: 'Compare React, Vue, and Svelte frameworks',
  columns: ['Framework', 'Learning Curve', 'Performance', 'Ecosystem', 'Best For'],
})
```

### AI Database Operations

AI helps manage your data:

```typescript
// AI fills in missing data
await db.aiFill({
  property: 'Description',
  basedOn: ['Name', 'Tags'],
})

// AI categorizes entries
await db.aiCategorize({
  entries: newEntries,
  property: 'Category',
  options: ['Feature', 'Bug', 'Improvement', 'Docs'],
})

// AI suggests new entries
const suggestions = await db.aiSuggest({
  context: 'What features should we build next quarter?',
  basedOn: ['user-feedback-db', 'competitors-db'],
})

// AI creates entries from natural language
await db.aiCreate('Add a high priority bug about login failing on mobile')
// Creates: { Name: 'Login failing on mobile', Priority: 'High', Tags: ['bug'] }
```

### Natural Language Queries

Query your workspace with plain English:

```typescript
import { ai } from 'notion.do'

// Natural language database queries
const urgent = await ai.query`what tasks are due this week?`
const projects = await ai.query`show me all projects over budget`
const insights = await ai.query`which team member has the most open tasks?`

// Cross-database analysis
const analysis = await ai.analyze`
  Compare our planned features against user feedback.
  What are we missing?
`
```

### AI Workspace Assistant

Chat with your entire workspace:

```typescript
const chat = await ai.chat({
  workspace: true,  // Access all workspace content
})

await chat.ask('What did we decide about the pricing model?')
// AI searches across all pages and databases, synthesizes answer

await chat.ask('Draft a project brief for the mobile app based on our roadmap')
// AI uses context from multiple sources to generate content

await chat.ask('What are the blockers for the Q1 launch?')
// AI finds related tasks, documents, and surfaces issues
```

## Real-Time Collaboration

Built for teams working together:

```typescript
// Subscribe to page changes
page.subscribe((event) => {
  if (event.type === 'block.changed') {
    console.log(`${event.user} edited block at ${event.path}`)
  }
})

// Presence awareness
page.onPresence((users) => {
  users.forEach(user => {
    console.log(`${user.name} is viewing ${user.blockId}`)
  })
})

// Comments and discussions
await block.addComment({
  content: 'Should we reconsider this approach?',
  mentions: ['@alice'],
})

// Reactions
await block.addReaction('👍')
```

## Synced Blocks

Reuse content across pages:

```typescript
// Create a synced block
const syncedBlock = await Block.createSynced({
  content: [
    Block.callout('📢', 'This content appears on multiple pages.'),
    Block.paragraph('Edit once, update everywhere.'),
  ],
})

// Use in multiple pages
await page1.addBlock(Block.syncedReference(syncedBlock.id))
await page2.addBlock(Block.syncedReference(syncedBlock.id))

// Changes sync automatically
```

## Templates

Create reusable templates:

```typescript
import { Template } from 'notion.do'

const meetingTemplate = Template.create({
  name: 'Meeting Notes',
  icon: '📝',
  blocks: [
    Block.heading1('{{title}}'),
    Block.properties({
      Date: '{{date}}',
      Attendees: '{{attendees}}',
      Type: '{{type}}',
    }),
    Block.heading2('Agenda'),
    Block.bulletList(['Topic 1', 'Topic 2', 'Topic 3']),
    Block.heading2('Notes'),
    Block.paragraph(''),
    Block.heading2('Action Items'),
    Block.database('action-items-template'),
    Block.aiActionItems({ source: 'notes-section' }),
  ],
})

// Create page from template
const meeting = await Template.create('meetingTemplate', {
  title: 'Q1 Planning Meeting',
  date: '2025-01-15',
  attendees: ['@alice', '@bob', '@carol'],
  type: 'Planning',
})
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
