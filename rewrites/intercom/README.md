# intercom.do

<p align="center">
  <strong>Customer Messaging. AI-First. Yours to Own.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/intercom.do"><img src="https://img.shields.io/npm/v/intercom.do.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/intercom.do"><img src="https://img.shields.io/npm/dm/intercom.do.svg" alt="npm downloads" /></a>
  <a href="https://github.com/drivly/intercom.do/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/intercom.do.svg" alt="license" /></a>
</p>

---

Re-imagining customer messaging for the AI era. One-click deploy your own Intercom.

## The Problem

**Intercom charges $74-153/seat/month.** AI features cost extra. Your conversations live on their servers. Your customer data belongs to them.

| What Intercom Charges | What You Get |
|-----------------------|--------------|
| $74/seat/month | Basic messaging |
| $153/seat/month | Advanced automation |
| +$0.99/resolution | Fin AI Agent |
| Enterprise pricing | Custom bots |

For a 10-person support team: **$740-1,530/month** before AI features.

And you still don't own your data.

## The Solution

**intercom.do** is open-source customer messaging with AI built-in. Deploy it once, own it forever.

```bash
npx create-dotdo intercom
```

That's it. Your own messenger. Your own inbox. Your data.

```typescript
import { IntercomClient } from 'intercom.do'

const intercom = new IntercomClient('https://support.yourcompany.com')

// AI handles first response
await intercom.conversations.send({
  to: 'user@example.com',
  message: 'How do I reset my password?',
  // AI responds instantly, escalates if needed
})
```

---

## Features

### Messenger Widget

Drop-in JavaScript widget that works anywhere:

```html
<script>
  window.intercomSettings = {
    app_id: 'your-workspace-id',
    api_base: 'https://support.yourcompany.com'
  };
</script>
<script src="https://support.yourcompany.com/widget.js" async></script>
```

- Customizable appearance (colors, position, launcher icon)
- Mobile-responsive design
- Pre-chat forms and qualification
- File attachments and rich media
- Typing indicators and read receipts

### Team Inbox

Real-time collaborative inbox for your support team:

| Feature | Description |
|---------|-------------|
| **Unified Inbox** | All conversations from web, email, and API in one place |
| **Assignment** | Round-robin, load-balanced, or manual assignment |
| **Collision Detection** | See when teammates are viewing/typing |
| **Saved Replies** | Templated responses with variable substitution |
| **Internal Notes** | Private team communication within conversations |
| **Conversation Tags** | Organize and filter by custom categories |
| **SLA Timers** | Track response and resolution times |

### Help Center

Self-service knowledge base with AI-powered search:

```typescript
// Create articles programmatically
await intercom.articles.create({
  title: 'Getting Started Guide',
  body: '<h2>Welcome!</h2><p>Here is how to get started...</p>',
  state: 'published',
  collection_id: 'getting-started'
})

// AI-powered search
const results = await intercom.articles.search({
  query: 'how do I reset my password',
  // Returns ranked results with relevance scores
})
```

- Markdown and rich text editor
- Collections and sections for organization
- SEO-optimized article pages
- FTS5 full-text search with ranking
- Suggested articles in messenger

### Bots & Workflows

Visual workflow builder for automation:

```typescript
// Define a qualification bot
const bot = intercom.bots.create({
  name: 'Lead Qualifier',
  triggers: [{ event: 'conversation_started' }],
  steps: [
    { type: 'message', content: 'Hi! What brings you here today?' },
    { type: 'buttons', options: ['Sales', 'Support', 'Partnership'] },
    { type: 'route', rules: [
      { match: 'Sales', assign_to: 'sales-team' },
      { match: 'Support', assign_to: 'ai-agent' },
      { match: 'Partnership', assign_to: 'partnerships@company.com' }
    ]}
  ]
})
```

- No-code workflow builder UI
- Conditional branching logic
- User attribute collection
- Team and individual routing
- Scheduled messages
- Event-triggered automation

---

## AI Support Agents

AI agents handle L1 support out of the box. No per-resolution fees.

### How It Works

```
Customer Question
       |
       v
  [AI Agent]
       |
  Can answer?
   /       \
 Yes        No
  |          |
  v          v
Respond   Escalate
instantly  to human
```

### Knowledge Sources

AI learns from multiple sources:

```typescript
// Train from your help center
await intercom.ai.train({
  sources: [
    { type: 'help_center' },              // Your articles
    { type: 'conversations', days: 90 },   // Past conversations
    { type: 'url', url: 'https://docs.yourcompany.com' },
    { type: 'pdf', path: './product-manual.pdf' }
  ]
})
```

### Intelligent Escalation

AI knows when to hand off:

```typescript
// Configure escalation rules
intercom.ai.configure({
  escalate_when: [
    'customer_requests_human',
    'sentiment_negative',
    'confidence_below_0.7',
    'vip_customer',
    'billing_dispute'
  ],
  working_hours: {
    timezone: 'America/Los_Angeles',
    hours: { start: 9, end: 17 },
    days: ['mon', 'tue', 'wed', 'thu', 'fri']
  },
  outside_hours: 'collect_info_and_queue'
})
```

### Conversation Handoff

Seamless transition from AI to human:

```typescript
// AI provides context to human agent
{
  conversation_id: 'conv_123',
  customer: { name: 'Alice', email: 'alice@example.com' },
  ai_summary: 'Customer asking about enterprise pricing. Mentioned 500 seats.',
  ai_sentiment: 'positive',
  suggested_response: 'Hi Alice! Happy to discuss enterprise pricing...',
  relevant_articles: ['pricing-guide', 'enterprise-features']
}
```

---

## Real-Time at the Edge

Built on Cloudflare Durable Objects with WebSocket support. Conversations happen at the edge, not in a distant data center.

### Global Performance

| Metric | intercom.do | Traditional SaaS |
|--------|-------------|------------------|
| Message latency | <50ms worldwide | 100-300ms |
| Widget load time | <100ms (edge cached) | 500ms+ |
| WebSocket connection | Regional edge | Single region |
| Offline resilience | Queue & sync | Lost messages |

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Your Customers                                │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│  Web Widget     │  Mobile SDK     │  Email / API                    │
├─────────────────┴─────────────────┴─────────────────────────────────┤
│                    Cloudflare Edge Network                           │
├─────────────────────────────────────────────────────────────────────┤
│  intercom.do Worker                                                  │
│  ├── ConversationDO (WebSocket hub, message history)                │
│  ├── InboxDO (team view, assignments, routing)                      │
│  ├── ArticleDO (help center, FTS5 search)                           │
│  ├── UserDO (customer profiles, attributes)                         │
│  └── AIDo (AI agent, knowledge base, embeddings)                    │
├─────────────────────────────────────────────────────────────────────┤
│  SQLite (hot)  │  R2 (attachments)  │  Vectorize (AI search)        │
└─────────────────────────────────────────────────────────────────────┘
```

Each conversation runs in its own Durable Object:

```typescript
// ConversationDO handles real-time messaging
export class ConversationDO extends DurableObject<Env> {
  private connections = new Map<string, WebSocket>()

  async webSocketMessage(ws: WebSocket, message: string) {
    const { type, data } = JSON.parse(message)

    if (type === 'message') {
      // Persist to SQLite
      await this.sql.exec(
        'INSERT INTO messages (id, author, content, created_at) VALUES (?, ?, ?, ?)',
        [data.id, data.author, data.content, Date.now()]
      )

      // Broadcast to all participants
      for (const [id, conn] of this.connections) {
        conn.send(JSON.stringify({ type: 'message', data }))
      }

      // Trigger AI response if needed
      if (data.author === 'customer' && this.aiEnabled) {
        await this.env.AI_AGENT.respond(this.id, data)
      }
    }
  }
}
```

---

## API Compatible

Drop-in replacement for Intercom's REST API. Existing integrations just work.

### REST API

```bash
# List conversations
curl https://support.yourcompany.com/api/conversations \
  -H "Authorization: Bearer $API_KEY"

# Send a message
curl -X POST https://support.yourcompany.com/api/conversations/123/reply \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "admin", "body": "Thanks for reaching out!"}'

# Create a user
curl -X POST https://support.yourcompany.com/api/contacts \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"email": "alice@example.com", "name": "Alice"}'
```

### TypeScript SDK

```typescript
import { IntercomClient } from 'intercom.do'

const client = new IntercomClient({
  baseUrl: 'https://support.yourcompany.com',
  apiKey: process.env.INTERCOM_API_KEY
})

// Conversations
const conversations = await client.conversations.list({ state: 'open' })
await client.conversations.reply(convId, { body: 'Hello!' })
await client.conversations.assign(convId, { assignee_id: 'admin_123' })
await client.conversations.close(convId)

// Contacts
const contact = await client.contacts.create({ email: 'user@example.com' })
await client.contacts.update(contact.id, { custom_attributes: { plan: 'pro' } })

// Articles
const articles = await client.articles.search({ query: 'billing' })
await client.articles.create({ title: 'FAQ', body: '...' })

// Events
await client.events.create({
  event_name: 'purchased',
  user_id: 'user_123',
  metadata: { plan: 'pro', amount: 99 }
})
```

### Webhooks

```typescript
// Receive real-time events
app.post('/webhooks/intercom', async (req, res) => {
  const event = req.body

  switch (event.topic) {
    case 'conversation.created':
      await notifySlack(event.data)
      break
    case 'conversation.user.replied':
      await updateCRM(event.data)
      break
    case 'conversation.admin.closed':
      await triggerSurvey(event.data)
      break
  }

  res.sendStatus(200)
})
```

---

## One-Click Deploy

### Cloudflare Workers

```bash
# Create your intercom.do instance
npx create-dotdo intercom

# Follow the prompts:
# - Workspace name
# - Custom domain (optional)
# - AI model preference

# Deploy
npm run deploy
```

### Configuration

```jsonc
// wrangler.jsonc
{
  "name": "support",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "durable_objects": {
    "bindings": [
      { "name": "CONVERSATION", "class_name": "ConversationDO" },
      { "name": "INBOX", "class_name": "InboxDO" },
      { "name": "ARTICLE", "class_name": "ArticleDO" },
      { "name": "USER", "class_name": "UserDO" },
      { "name": "AI_AGENT", "class_name": "AIAgentDO" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["ConversationDO", "InboxDO", "ArticleDO", "UserDO", "AIAgentDO"] }
  ],
  "vectorize": {
    "bindings": [{ "binding": "VECTORIZE", "index_name": "knowledge-base" }]
  },
  "ai": { "binding": "AI" },
  "r2_buckets": [
    { "binding": "ATTACHMENTS", "bucket_name": "intercom-attachments" }
  ]
}
```

### Custom Domain

```bash
# Add your support domain
wrangler domains add support.yourcompany.com
```

---

## Migration from Intercom

One-command migration from Intercom:

```bash
npx intercom.do migrate --from-intercom

# Migrates:
# - All conversations and messages
# - Contact database
# - Help center articles
# - Custom attributes
# - Team members and permissions
# - Saved replies
# - Tags and segments
```

### Data Export

```typescript
import { IntercomMigration } from 'intercom.do/migrate'

const migration = new IntercomMigration({
  source: {
    apiKey: process.env.INTERCOM_API_KEY  // Your Intercom API key
  },
  destination: {
    baseUrl: 'https://support.yourcompany.com',
    apiKey: process.env.INTERCOM_DO_API_KEY
  }
})

// Preview what will be migrated
const preview = await migration.preview()
console.log(`${preview.conversations} conversations`)
console.log(`${preview.contacts} contacts`)
console.log(`${preview.articles} articles`)

// Run migration
await migration.run({
  conversations: true,
  contacts: true,
  articles: true,
  onProgress: (progress) => console.log(`${progress.percent}% complete`)
})
```

---

## Self-Hosting

### Docker

```bash
docker run -d \
  -p 8080:8080 \
  -e DATABASE_URL=sqlite:./data/intercom.db \
  -v intercom-data:/data \
  drivly/intercom.do
```

### Node.js

```bash
git clone https://github.com/drivly/intercom.do
cd intercom.do
npm install
npm run build
npm start
```

---

## Pricing Comparison

| Feature | Intercom | intercom.do |
|---------|----------|-------------|
| Base price | $74-153/seat/month | $0 (self-host) |
| AI responses | $0.99/resolution | Included |
| Help center | Included | Included |
| Custom bots | Enterprise only | Included |
| Data ownership | Theirs | Yours |
| API limits | Rate limited | Unlimited |
| White label | Enterprise only | Always |

### Cost Example

**10-person support team, 1,000 AI resolutions/month:**

| | Intercom | intercom.do |
|-|----------|-------------|
| Seats | $740-1,530 | $0 |
| AI resolutions | $990 | $0 |
| **Monthly total** | **$1,730-2,520** | **$5** (Workers) |
| **Annual savings** | - | **$20,700-30,180** |

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Quick Start](./docs/quickstart.mdx) | Get running in 5 minutes |
| [Widget Customization](./docs/widget.mdx) | Styling and configuration |
| [AI Training](./docs/ai-training.mdx) | Teaching AI from your knowledge base |
| [Team Inbox](./docs/inbox.mdx) | Managing conversations |
| [Help Center](./docs/help-center.mdx) | Building your knowledge base |
| [Bots & Workflows](./docs/bots.mdx) | Automation and routing |
| [API Reference](./docs/api.mdx) | REST API documentation |
| [Migration Guide](./docs/migration.mdx) | Moving from Intercom |
| [Self-Hosting](./docs/self-hosting.mdx) | Running on your infrastructure |

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
# Development
git clone https://github.com/drivly/intercom.do
cd intercom.do
npm install
npm run dev

# Tests
npm test
npm run test:e2e
```

---

## License

MIT - see [LICENSE](./LICENSE)

---

<p align="center">
  <strong>Customer messaging without the hostage pricing.</strong>
  <br />
  Built on Cloudflare Workers. Powered by AI. Owned by you.
</p>
