# confluence.do

> Enterprise wiki. AI-native. Open source.

Confluence became the default for team documentation. It also became the place where knowledge goes to die. Outdated pages, broken links, impossible search, and the constant question: "Is this doc still accurate?"

**confluence.do** reimagines team knowledge for the AI era. AI writes docs from your code. AI keeps docs in sync. AI answers questions. Your wiki finally works.

## AI-Native API

```typescript
import { confluence } from 'confluence.do'           // Full SDK
import { confluence } from 'confluence.do/tiny'      // Minimal client
import { confluence } from 'confluence.do/search'    // Search-only operations
```

Natural language for knowledge workflows:

```typescript
import { confluence } from 'confluence.do'

// Talk to it like a colleague
const answer = await confluence`how do we handle authentication?`
const stale = await confluence`outdated docs in Engineering`
const api = await confluence`pages mentioning API redesign`

// Chain like sentences
await confluence`docs about payments`
  .notify(`Please review for accuracy`)

// Documentation that writes itself
await confluence`document the auth system from code`
  .review()            // AI checks accuracy
  .publish()           // your approval
```

### Promise Pipelining with Agents

Chain work without Promise.all:

```typescript
import { confluence } from 'confluence.do'
import { mark, tom, priya } from 'agents.do'

// Keep docs in sync with code
await confluence`docs about authentication`
  .map(doc => tom`verify ${doc} against codebase`)
  .map(doc => mark`update ${doc} if stale`)
  .map(doc => priya`review ${doc}`)

// Generate docs from code changes
await git`recent commits to ${repo}`
  .map(commit => mark`document ${commit}`)
  .map(doc => confluence`publish ${doc} to Engineering`)

// Close documentation gaps at scale
await confluence`stale docs in Engineering`
  .map(doc => mark`update ${doc} from current code`)
  .each(doc => doc.publish())
```

One network round trip. Record-replay pipelining. Workers working for you.

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

```typescript
import { Confluence } from 'confluence.do'

export default Confluence({
  name: 'acme-wiki',
  domain: 'wiki.acme.com',
  spaces: ['Engineering', 'Product', 'Design'],
})
```

## Features

### Spaces & Pages

```typescript
// Create naturally
await confluence`create space "Engineering" for technical docs`
await confluence`create page "Auth Architecture" in Engineering under Architecture`

// Or just write content
await confluence`
  page "API Guidelines" in Engineering:

  # API Guidelines

  All APIs must be RESTful with JSON responses...
`
```

### Search & Discovery

```typescript
// Find anything
const authDocs = await confluence`pages about authentication`
const stale = await confluence`docs not updated in 6 months`
const byAlice = await confluence`pages Alice wrote last month`

// AI infers what you need
await confluence`authentication`           // returns relevant pages
await confluence`how do we deploy?`        // returns answer with sources
await confluence`what did we decide about caching?`  // finds ADRs
```

### Real-Time Collaboration

Multiple editors, zero conflicts. CRDT-based editing syncs instantly.

```typescript
// Presence just works
// See who's editing, where their cursor is
// Changes merge automatically
```

### Page Trees & Navigation

```typescript
// Navigate naturally
await confluence`Engineering page tree`
await confluence`pages under Architecture`
await confluence`related to Auth Architecture`
```

### Templates

```typescript
// Use templates by name
await confluence`new ADR "Use PostgreSQL for User Data"`
await confluence`new runbook for payment-service`
await confluence`new meeting notes from standup`

// AI fills in context automatically
```

## AI-Native Documentation

The real magic. AI that keeps your documentation alive.

### AI Search

Search that actually understands:

```typescript
// Semantic search - not just keywords
await confluence`how do we handle authentication?`
// Finds pages about auth, JWT, login, sessions - even without those exact words

// Question answering with sources
await confluence`what database do we use for user data?`
// Returns: "PostgreSQL, as decided in ADR-042. The users table schema is defined in..."

// Complex queries
await confluence`how do I deploy to production? show sources`
```

### AI Writes Documentation

Stop staring at blank pages:

```typescript
// Generate docs from code
await confluence`document the API routes in src/routes/`
await confluence`write technical docs for payment-service`

// Generate from context
await confluence`write runbook for payment-service with @backend-team oncall`

// Generate meeting notes
await confluence`meeting notes from standup recording`
  .review()     // you approve
  .publish()    // done
```

### AI Freshness Verification

Know if your docs are current:

```typescript
// AI checks documentation freshness
await confluence`check freshness of API docs against code`
await confluence`find broken links in Engineering`
await confluence`docs that contradict each other`

// Or just ask
await confluence`is the deployment guide current?`
```

### AI Doc Sync

Keep docs and code in sync automatically:

```typescript
// Sync API docs with OpenAPI spec
await confluence`sync API Reference from openapi.yaml on every push`

// Sync README with wiki
await confluence`sync payment-service README bidirectionally`

// Auto-generate changelog
await confluence`generate changelog from commits weekly`
```

### AI Q&A Bot

Answer questions from your wiki:

```typescript
// Deploy a Q&A bot - one line
await confluence`deploy bot to #engineering and #help`

// In Slack: "@wiki-bot how do we deploy to production?"
// Bot responds with synthesized answer + source links
```

## Integration with jira.do

Seamless connection with your issue tracker:

```typescript
// Auto-link issues mentioned in docs
// Writing "BACKEND-123" in a page automatically links to jira.do

// Create design doc from issue
await confluence`design doc for BACKEND-500`

// Or chain from jira
await jira`BACKEND-500`
  .map(issue => confluence`write design doc for ${issue}`)
  .map(doc => confluence`publish to Design Documents`)

// Embed issue status in docs
// {% jira BACKEND-500 %} shows live status
```

## Content Components

Rich components for modern documentation:

### Diagrams

```typescript
// Generate diagrams naturally
await confluence`diagram the auth flow`
await confluence`architecture diagram for payment-service`

// Or embed Mermaid/Excalidraw directly in content
```

### Code Blocks

```typescript
// Live code from GitHub - always current
await confluence`embed src/models/user.ts lines 10-25`

// Code stays in sync automatically
```

### Tables & Databases

```typescript
// Dynamic tables from queries
await confluence`table of open bugs in BACKEND`

// Embedded databases (Notion-style)
await confluence`database of features with status, owner, priority`
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

Existing Confluence integrations work. Just change the host.

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

| Tier | Storage | Use Case | Query Speed |
|------|---------|----------|-------------|
| **Hot** | SQLite | Current pages, recent edits | <10ms |
| **Warm** | R2 + Index | Attachments, page history | <100ms |
| **Cold** | R2 Archive | Old versions, deleted content | <1s |

## vs Atlassian Confluence

| Feature | Atlassian Confluence | confluence.do |
|---------|---------------------|---------------|
| **Annual Cost** | $69,300 (500 users) | ~$50/month |
| **Search** | Keyword matching | AI semantic search |
| **Freshness** | Manual verification | AI-verified |
| **Documentation** | Write everything | AI generates from code |
| **Architecture** | Centralized cloud | Edge-native, global |
| **Data Location** | Atlassian's servers | Your Cloudflare account |
| **Lock-in** | Years of migration | MIT licensed |

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

MIT License - For teams who deserve better documentation.

---

<p align="center">
  <strong>The $70k wiki ends here.</strong>
  <br />
  AI-native. Always fresh. Knowledge that works.
  <br /><br />
  <a href="https://confluence.do">Website</a> |
  <a href="https://docs.confluence.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/confluence.do">GitHub</a>
</p>
