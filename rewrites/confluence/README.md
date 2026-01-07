# confluence.do

> Enterprise wiki. AI-native. Open source.

Confluence became the default for team documentation. It also became the place where knowledge goes to die. Outdated pages, broken links, impossible search, and the constant question: "Is this doc still accurate?"

**confluence.do** reimagines team knowledge for the AI era. AI writes docs from your code. AI keeps docs in sync. AI answers questions. Your wiki finally works.

## The Problem

Atlassian bundled Confluence with Jira, and companies got stuck:

| Confluence Plan | Price | Reality |
|-----------------|-------|---------|
| Free | $0/10 users | 2GB storage, limited features |
| Standard | $6.05/user/month | Basic wiki |
| Premium | $11.55/user/month | Analytics, archiving |
| Enterprise | Custom | Unlimited everything, unlimited cost |

**500-person company on Premium?** That's **$69,300/year** for a wiki.

The hidden costs are worse:
- **Search that doesn't work** - Can't find what you're looking for
- **Stale documentation** - Nobody knows if docs are current
- **Content sprawl** - 10,000 pages, 10 useful ones
- **No code integration** - Docs and code drift apart
- **Template hell** - 50 templates, none quite right

## The Solution

**confluence.do** is what a wiki should be:

```
Traditional Confluence         confluence.do
-----------------------------------------------------------------
$6-12/user/month              $0 - run your own
Terrible search               AI-powered semantic search
Stale documentation           AI-verified freshness
Manual everything             AI writes, updates, maintains
Their servers                 Your Cloudflare account
Content lock-in               Markdown + structured data
Complex macros                Simple, powerful components
```

## One-Click Deploy

```bash
npx create-dotdo confluence
```

Your team wiki. Running on Cloudflare. AI-native.

```bash
# Or add to existing workers.do project
npx dotdo add confluence
```

## Features

### Spaces & Pages

Organize knowledge naturally:

```typescript
import { Space, Page } from 'confluence.do'

// Create a space
const engineeringSpace = Space.create({
  key: 'ENG',
  name: 'Engineering',
  description: 'Technical documentation and decisions',
})

// Create pages
const page = Page.create({
  space: 'ENG',
  title: 'Authentication Architecture',
  parent: 'Architecture',
  content: `
# Authentication Architecture

Our auth system uses JWT tokens with refresh rotation...

## Components

\`\`\`mermaid
graph TD
  A[Client] --> B[API Gateway]
  B --> C[Auth Service]
  C --> D[User Database]
\`\`\`

## Decision Record

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-01-15 | JWT over sessions | Stateless scaling |
| 2024-02-20 | Refresh rotation | Security hardening |
  `,
})
```

### Real-Time Collaboration

Multiple editors, zero conflicts:

```typescript
// Subscribe to page changes
page.subscribe((event) => {
  if (event.type === 'content.changed') {
    console.log(`${event.user} edited at ${event.position}`)
  }
})

// Presence awareness
page.onPresence((users) => {
  console.log(`${users.length} people viewing this page`)
  users.forEach(u => console.log(`${u.name} - cursor at ${u.position}`))
})

// Collaborative editing with CRDT
const doc = page.getCollaborativeDoc()
doc.on('change', (delta) => {
  // Real-time sync across all editors
})
```

### Page Trees & Navigation

Hierarchical organization with instant access:

```typescript
// Get the full page tree
const tree = await Space.getPageTree('ENG')

// Smart breadcrumbs
const breadcrumbs = await page.getBreadcrumbs()
// ['Engineering', 'Architecture', 'Authentication Architecture']

// Related pages
const related = await page.getRelated()
// AI finds semantically similar pages
```

### Templates

Define reusable templates:

```typescript
import { Template } from 'confluence.do'

export const adrTemplate = Template({
  name: 'Architecture Decision Record',
  labels: ['adr', 'architecture'],
  schema: {
    status: { type: 'select', options: ['Proposed', 'Accepted', 'Deprecated'] },
    deciders: { type: 'users' },
    date: { type: 'date' },
  },
  content: `
# {title}

**Status:** {status}
**Deciders:** {deciders}
**Date:** {date}

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing?

## Consequences

What becomes easier or more difficult because of this change?
  `,
})

// Create page from template
await Page.createFromTemplate(adrTemplate, {
  title: 'Use PostgreSQL for User Data',
  status: 'Proposed',
  deciders: ['@alice', '@bob'],
  date: '2025-01-15',
})
```

## AI-Native Documentation

The real magic. AI that keeps your documentation alive.

### AI Search

Search that actually understands:

```typescript
import { ai, search } from 'confluence.do'

// Semantic search - not just keywords
const results = await search`how do we handle authentication?`
// Finds pages about auth, JWT, login, sessions - even without those exact words

// Question answering
const answer = await ai.ask`What database do we use for user data?`
// Returns: "PostgreSQL, as decided in ADR-042. The users table schema is defined in..."

// With source citations
const { answer, sources } = await ai.askWithSources`How do I deploy to production?`
// sources: [{ page: 'Deployment Guide', section: 'Production', relevance: 0.94 }]
```

### AI Writes Documentation

Stop staring at blank pages:

```typescript
// Generate docs from code
const apiDocs = await ai.documentCode({
  repo: 'github.com/company/api',
  path: 'src/routes/',
  style: 'technical',
})

// Generate from template + context
const runbook = await ai.generate({
  template: 'incident-runbook',
  context: {
    service: 'payment-service',
    oncall: '@backend-team',
    dependencies: ['stripe', 'postgres', 'redis'],
  },
})

// Generate meeting notes from transcript
const notes = await ai.meetingNotes({
  transcript: meetingTranscript,
  attendees: ['alice', 'bob', 'carol'],
  template: 'decision-meeting',
})
```

### AI Freshness Verification

Know if your docs are current:

```typescript
// AI checks documentation freshness
const freshness = await ai.checkFreshness(page, {
  compareToCode: true,     // Diff against source code
  checkLinks: true,        // Find broken links
  detectContradictions: true,  // Find conflicting information
})

// Returns:
{
  status: 'stale',
  confidence: 0.87,
  issues: [
    {
      type: 'code_drift',
      section: 'API Endpoints',
      detail: 'Documentation shows POST /users but code has POST /api/v2/users',
      suggestion: 'Update endpoint path to /api/v2/users'
    },
    {
      type: 'broken_link',
      section: 'References',
      detail: 'Link to old-architecture.md returns 404'
    }
  ],
  lastVerified: '2025-01-15T10:30:00Z',
  suggestedUpdate: '...'  // AI-generated fix
}
```

### AI Doc Sync

Keep docs and code in sync automatically:

```typescript
import { DocSync } from 'confluence.do'

// Sync API docs with OpenAPI spec
DocSync.register({
  source: 'github.com/company/api/openapi.yaml',
  target: 'ENG/API Reference',
  transform: 'openapi-to-markdown',
  schedule: 'on-push',  // or 'daily', 'weekly'
})

// Sync README with wiki
DocSync.register({
  source: 'github.com/company/service/README.md',
  target: 'ENG/Services/Payment Service',
  bidirectional: true,  // Changes sync both ways
})

// Auto-generate changelog from commits
DocSync.register({
  source: 'github.com/company/app/commits',
  target: 'PRODUCT/Changelog',
  transform: 'conventional-commits-to-changelog',
})
```

### AI Q&A Bot

Answer questions from your wiki:

```typescript
import { QABot } from 'confluence.do'

// Deploy a Q&A bot for your wiki
const bot = QABot.create({
  spaces: ['ENG', 'PRODUCT', 'DESIGN'],
  channels: ['slack:#engineering', 'discord:#help'],
})

// In Slack: "@wiki-bot how do we deploy to production?"
// Bot responds with synthesized answer + source links
```

## Integration with jira.do

Seamless connection with your issue tracker:

```typescript
// Auto-link issues mentioned in docs
// Writing "BACKEND-123" in a page automatically links to jira.do

// Create doc from issue
const issue = await jira.getIssue('BACKEND-500')
const designDoc = await ai.generateDesignDoc(issue)
await Page.create({
  space: 'ENG',
  parent: 'Design Documents',
  title: designDoc.title,
  content: designDoc.content,
  linkedIssues: ['BACKEND-500'],
})

// Embed issue status in docs
// {% jira BACKEND-500 %} shows live status
```

## Content Components

Rich components for modern documentation:

### Diagrams

```typescript
// Mermaid diagrams
\`\`\`mermaid
sequenceDiagram
  Client->>API: POST /login
  API->>Auth: validate(credentials)
  Auth-->>API: token
  API-->>Client: 200 OK + JWT
\`\`\`

// Excalidraw embeds
\`\`\`excalidraw
{
  "type": "excalidraw",
  "id": "arch-diagram-001"
}
\`\`\`
```

### Code Blocks

```typescript
// Syntax highlighted code
\`\`\`typescript
import { User } from './models'

export async function createUser(data: UserInput): Promise<User> {
  return db.users.insert(data)
}
\`\`\`

// Live code from GitHub
\`\`\`github
repo: company/api
path: src/models/user.ts
lines: 10-25
\`\`\`
```

### Tables & Databases

```typescript
// Dynamic tables
{% table %}
  {% query project = "BACKEND" AND type = "Bug" AND status = "Open" %}
{% /table %}

// Embedded databases (Notion-style)
{% database id="features-db" %}
  columns: [Name, Status, Owner, Priority, Sprint]
  filter: Status != Done
  sort: Priority DESC
{% /database %}
```

### Callouts & Panels

```markdown
{% info %}
This is informational content.
{% /info %}

{% warning %}
Be careful when modifying production data.
{% /warning %}

{% danger %}
This action cannot be undone.
{% /danger %}

{% success %}
Your deployment completed successfully.
{% /success %}
```

## API Compatible

Drop-in compatibility with Confluence REST API:

```typescript
// Standard Confluence REST API
GET    /wiki/rest/api/space
GET    /wiki/rest/api/content
POST   /wiki/rest/api/content
PUT    /wiki/rest/api/content/{id}
DELETE /wiki/rest/api/content/{id}

GET    /wiki/rest/api/content/{id}/child/page
GET    /wiki/rest/api/content/search?cql={query}
```

Existing Confluence integrations work:

```typescript
// Your existing confluence client
const client = new ConfluenceClient({
  host: 'your-org.confluence.do',  // Just change the host
  // ... rest stays the same
})

const page = await client.getPage('123456')
```

## Architecture

### Durable Object per Space

Each space runs in its own Durable Object:

```
WikiDO (global config, search index)
  |
  +-- SpaceDO:ENG (Engineering space)
  |     +-- SQLite: pages, comments, attachments metadata
  |     +-- R2: attachments, images
  |     +-- WebSocket: real-time collaboration
  |
  +-- SpaceDO:PRODUCT (Product space)
  +-- SpaceDO:DESIGN (Design space)
  +-- SearchDO (vector embeddings for semantic search)
```

### Real-Time Editing

CRDT-based collaborative editing:

```
User A types "Hello" at position 0
User B types "World" at position 100

Both operations merge automatically:
- No conflicts
- No lost changes
- Instant sync
```

### Storage Tiers

```typescript
// Hot: SQLite in Durable Object
// Current pages, recent edits, page tree

// Warm: R2 object storage
// Attachments, images, page history

// Cold: R2 archive
// Old versions, deleted content (retention)
```

## Migration from Confluence

One-time import of your existing wiki:

```bash
npx confluence-do migrate \
  --url=https://your-company.atlassian.net/wiki \
  --email=admin@company.com \
  --token=your_api_token
```

Imports:
- All spaces and pages
- Page hierarchy and relationships
- Attachments and images
- Comments and inline comments
- Labels and categories
- User permissions
- Page history

## Roadmap

- [x] Spaces and pages
- [x] Page hierarchy and navigation
- [x] Real-time collaborative editing
- [x] Templates
- [x] Search (full-text + semantic)
- [x] REST API compatibility
- [x] AI search and Q&A
- [x] AI freshness verification
- [ ] Advanced permissions (page-level)
- [ ] Blueprints marketplace
- [ ] Confluence macro compatibility
- [ ] PDF export
- [ ] Jira.do deep integration
- [ ] Git-based version control

## Why Open Source?

Your knowledge is too valuable to be locked away:

1. **Your documentation** - Institutional knowledge is irreplaceable
2. **Your search** - Finding information shouldn't require luck
3. **Your freshness** - Stale docs are worse than no docs
4. **Your AI** - Intelligence on your knowledge should be yours

Confluence showed the world what team wikis could be. **confluence.do** makes them intelligent, accurate, and always up-to-date.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Key areas:
- Editor and collaboration features
- Search and AI capabilities
- Confluence API compatibility
- Component and macro development
- Migration tooling

## License

MIT License - Use it however you want. Build your business on it. Fork it. Make it your own.

---

<p align="center">
  <strong>confluence.do</strong> is part of the <a href="https://dotdo.dev">dotdo</a> platform.
  <br />
  <a href="https://confluence.do">Website</a> | <a href="https://docs.confluence.do">Docs</a> | <a href="https://discord.gg/dotdo">Discord</a>
</p>
