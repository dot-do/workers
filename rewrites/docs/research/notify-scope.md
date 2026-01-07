# notify.do - Customer Engagement Infrastructure

**Cloudflare Workers Rewrite Scoping Document**

A unified notification and customer engagement platform built on Cloudflare Workers, combining the best patterns from Customer.io, Intercom, Braze, OneSignal, Knock, and Novu.

---

## Executive Summary

notify.do provides notification infrastructure for developers building customer engagement into their products. It handles event ingestion, workflow orchestration, template rendering, and multi-channel delivery - all running at the edge with Cloudflare Workers.

**Target domain**: `notify.do` (primary), `engage.do` (alias)

**Core value**: Replace fragmented notification infrastructure with a single, edge-native platform that developers configure once and delivers across all channels.

---

## 1. Platform Analysis

### 1.1 Customer.io

**Core Value Proposition**: Data-driven customer engagement with visual workflow builder. Powers 56+ billion messages annually for 8,000+ brands.

**Key Capabilities**:
- Event-driven campaigns triggered by user actions
- Visual drag-and-drop journey builder
- Multi-channel: email, SMS, push, in-app
- Real-time data pipelines with reverse ETL (Snowflake, BigQuery)
- A/B testing and cohort experimentation
- Ad audience sync (Google, Facebook, Instagram)

**Technical Architecture**:
- Track API: Event ingestion at 3000 req/3sec rate limit
- v2 Edge API with batch endpoints
- Anonymous ID to User ID resolution
- Object associations (accounts, courses, etc.)

**Key Insight**: Customer.io excels at connecting behavioral data to messaging workflows. Their "objects" concept (grouping people into accounts) is valuable for B2B use cases.

### 1.2 Intercom

**Core Value Proposition**: AI-first customer service platform with "Fin AI Agent" for automated support resolution.

**Key Capabilities**:
- Conversational messaging across channels
- AI agent (Fin) for automated query resolution
- Help desk integration
- Multi-region support (US, EU, Australia)
- Real-time chat widgets

**Technical Architecture**:
- REST API with JSON encoding
- Regional endpoint deployment
- Webhook-based event delivery
- Conversation threading model

**Key Insight**: Intercom's strength is conversational AI and support workflows. For notify.do, the relevant pattern is their real-time messaging infrastructure and conversation state management.

### 1.3 Braze

**Core Value Proposition**: Enterprise customer engagement with AI-powered journey orchestration. Powers cross-channel experiences at massive scale.

**Key Capabilities**:
- Canvas Flow: No-code journey builder with "unlimited ingress/specific egress"
- BrazeAI: Predictive, generative, and agentic intelligence
- Cross-channel: email, SMS/RCS, push, in-app, WhatsApp, web, LINE
- Real-time user tracking via `/users/track` endpoint
- Liquid templating for personalization
- Segment and campaign management APIs

**Technical Architecture**:
- Sub-second latency at any scale
- Component-based workflow: Action Paths, Audience Paths, Decision Splits
- User Update Component for in-journey data capture
- Experiment Paths for A/B testing
- Data Platform with direct warehouse connections

**Key Insight**: Braze's Canvas Flow architecture - deterministic step-based journeys with unlimited inputs - is the gold standard for workflow orchestration. Their real-time triggering model is essential.

### 1.4 OneSignal

**Core Value Proposition**: Push notification infrastructure for developers, powering ~20% of all mobile apps with 12B+ daily messages.

**Key Capabilities**:
- Push notifications (mobile + web)
- Email, SMS/RCS, in-app messaging
- Live Activities (iOS)
- Dynamic segmentation with no-code workflows
- 200+ integrations (CDPs, analytics, CRMs)
- Real-time analytics and optimization

**Technical Architecture**:
- REST API + SDKs (Android, iOS, Flutter, React Native, Unity)
- 99.95% uptime SLA
- SOC 2, GDPR, CCPA, HIPAA, ISO 27001/27701 certified
- Behavior-based personalization engine

**Key Insight**: OneSignal's specialization in push notifications and their integration ecosystem shows the value of channel-specific optimization and broad connectivity.

### 1.5 Knock

**Core Value Proposition**: Developer-first notification infrastructure with emphasis on workflow orchestration and preference management.

**Key Capabilities**:
- Multi-channel workflows (email, SMS, push, in-app, Slack, MS Teams)
- Drag-and-drop workflow builder
- Functions: delay, batch, branch, fetch, throttle
- User preference management with opt-out support
- Link and open tracking
- Real-time in-app notifications via WebSocket
- Version control with rollback

**Technical Architecture**:
- SDKs in 8 languages (Node, Python, Ruby, Go, Java, .NET, Elixir, PHP)
- Management API for programmatic workflow control
- CI/CD integration for pre-deployment validation
- SAML SSO, SCIM directory sync
- 99.99% uptime, HIPAA/SOC2/GDPR/CCPA compliant

**Key Insight**: Knock's developer experience - SDKs, CLI tooling, version control for workflows - is best-in-class. Their preference management system handles commercial unsubscribe compliance well.

### 1.6 Novu

**Core Value Proposition**: Open-source notification infrastructure with unified API and self-hosting option.

**Key Capabilities**:
- Unified API for all channels
- Visual workflow editor + code-based Novu Framework SDK
- In-app Inbox component (6 lines of code)
- Digest engine to consolidate notifications
- Multi-provider support per channel
- Internationalization built-in
- Subscriber preference management

**Technical Architecture**:
- Open-source core (MIT), commercial enterprise features
- NestJS + MongoDB stack
- Docker self-hosting support
- REST + WebSocket architecture
- Event-driven trigger system
- Provider integrations:
  - Email: SendGrid, Mailgun, AWS SES, Postmark, SMTP
  - SMS: Twilio, Vonage, Plivo, SNS
  - Push: FCM, Expo, APNs, Pushpad
  - Chat: Slack, Discord, Microsoft Teams

**Key Insight**: Novu's open-source model and provider abstraction layer is compelling. Their digest engine for notification consolidation reduces user fatigue.

---

## 2. Architecture Vision

```
notify.do
├── Edge Layer (Workers)
│   ├── Event Ingestion API
│   ├── Webhook Receivers
│   └── Real-time WebSocket Gateway
│
├── Core Services (Durable Objects)
│   ├── UserDO (profiles + preferences)
│   ├── WorkflowDO (journey state machine)
│   ├── TemplateDO (template storage + rendering)
│   └── DeliveryDO (channel orchestration)
│
├── Orchestration (CF Workflows)
│   ├── Journey Engine
│   ├── Batch/Digest Processor
│   └── Retry/Escalation Handler
│
├── Storage
│   ├── D1 (user profiles, event history, analytics)
│   ├── R2 (template assets, large payloads)
│   └── KV (rate limiting, feature flags)
│
├── Channel Adapters
│   ├── Email (Resend, SendGrid, Mailgun, SES)
│   ├── SMS (Twilio, Vonage, MessageBird)
│   ├── Push (APNs, FCM)
│   ├── In-App (WebSocket)
│   ├── Chat (Slack, Discord, Teams)
│   └── Webhooks
│
└── Analytics Pipeline
    ├── Event Stream (R2 + batch processing)
    └── Real-time Counters (DO)
```

---

## 3. Core Components

### 3.1 Event Ingestion Layer

**Problem**: High-volume event tracking with low latency at edge.

**Design**:
```typescript
// Edge Worker - validates and routes events
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const event = await request.json() as TrackEvent

    // Validate and normalize
    const normalized = validateEvent(event)

    // Route to user's DO for state updates
    const userId = normalized.userId || normalized.anonymousId
    const userDO = env.USERS.get(env.USERS.idFromName(userId))

    // Fire-and-forget ingestion (async durability)
    ctx.waitUntil(userDO.track(normalized))

    // Immediate response for low latency
    return new Response('OK', { status: 202 })
  }
}

// Event schema (Customer.io compatible)
interface TrackEvent {
  userId?: string
  anonymousId?: string
  event: string
  properties?: Record<string, unknown>
  timestamp?: string
  context?: EventContext
}
```

**Rate Limiting**: Use KV for sliding window counters per API key.

**Anonymous ID Resolution**: When `identify()` is called with both `anonymousId` and `userId`, merge profiles in UserDO.

### 3.2 User Profile Management

**Problem**: Store user attributes, track events, and manage preferences at scale.

**Design (Durable Object)**:
```typescript
export class UserDO extends DurableObject<Env> {
  private sql: SqlStorage

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.sql = state.storage.sql
    this.initSchema()
  }

  private initSchema() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS attributes (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        properties TEXT,
        timestamp INTEGER NOT NULL,
        UNIQUE(event, timestamp)
      );

      CREATE TABLE IF NOT EXISTS preferences (
        workflow_id TEXT,
        channel TEXT,
        enabled INTEGER DEFAULT 1,
        PRIMARY KEY (workflow_id, channel)
      );

      CREATE TABLE IF NOT EXISTS channel_tokens (
        channel TEXT PRIMARY KEY,
        token TEXT,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
      CREATE INDEX IF NOT EXISTS idx_events_time ON events(timestamp);
    `)
  }

  async identify(attributes: Record<string, unknown>) {
    const now = Date.now()
    for (const [key, value] of Object.entries(attributes)) {
      this.sql.exec(`
        INSERT OR REPLACE INTO attributes (key, value, updated_at)
        VALUES (?, ?, ?)
      `, key, JSON.stringify(value), now)
    }
  }

  async track(event: TrackEvent) {
    const timestamp = event.timestamp
      ? new Date(event.timestamp).getTime()
      : Date.now()

    this.sql.exec(`
      INSERT INTO events (event, properties, timestamp)
      VALUES (?, ?, ?)
    `, event.event, JSON.stringify(event.properties || {}), timestamp)

    // Trigger workflow evaluation
    await this.evaluateWorkflows(event)
  }

  async getPreferences(): Promise<UserPreferences> {
    const rows = this.sql.exec(`SELECT * FROM preferences`).toArray()
    return rows.reduce((acc, row) => {
      acc[row.workflow_id] = acc[row.workflow_id] || {}
      acc[row.workflow_id][row.channel] = Boolean(row.enabled)
      return acc
    }, {} as UserPreferences)
  }

  async setChannelToken(channel: string, token: string, metadata?: object) {
    this.sql.exec(`
      INSERT OR REPLACE INTO channel_tokens (channel, token, metadata)
      VALUES (?, ?, ?)
    `, channel, token, JSON.stringify(metadata || {}))
  }
}
```

### 3.3 Workflow Engine

**Problem**: Execute multi-step, multi-channel notification journeys with branching, delays, and batching.

**Design (Cloudflare Workflows)**:
```typescript
// Workflow definition (Braze Canvas-inspired)
interface WorkflowDefinition {
  id: string
  name: string
  trigger: WorkflowTrigger
  steps: WorkflowStep[]
}

interface WorkflowTrigger {
  type: 'event' | 'segment' | 'api' | 'schedule'
  event?: string
  segment?: string
  schedule?: string // cron expression
}

type WorkflowStep =
  | MessageStep
  | DelayStep
  | BranchStep
  | BatchStep
  | ThrottleStep
  | FetchStep
  | UpdateUserStep

interface MessageStep {
  type: 'message'
  channel: Channel
  template: string
  fallback?: string // fallback channel if primary fails
}

interface DelayStep {
  type: 'delay'
  duration: string // "5m", "1h", "1d"
  until?: string   // ISO timestamp
}

interface BranchStep {
  type: 'branch'
  conditions: BranchCondition[]
  default: string // step id
}

interface BatchStep {
  type: 'batch'
  window: string      // "1h" - collect events for 1 hour
  maxSize: number     // max events before forced delivery
  digestTemplate: string
}

// Cloudflare Workflow implementation
export class NotifyWorkflow extends WorkflowEntrypoint<Env, WorkflowParams> {
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep) {
    const { userId, workflowId, trigger } = event.payload

    // Load workflow definition
    const definition = await step.do('load-workflow', async () => {
      return await this.env.WORKFLOWS_KV.get(workflowId, 'json')
    })

    // Check user preferences
    const userDO = this.env.USERS.get(this.env.USERS.idFromName(userId))
    const preferences = await step.do('check-preferences', async () => {
      return await userDO.getPreferences()
    })

    // Execute steps
    for (const stepDef of definition.steps) {
      await this.executeStep(step, stepDef, userId, preferences)
    }
  }

  private async executeStep(
    step: WorkflowStep,
    stepDef: WorkflowStep,
    userId: string,
    preferences: UserPreferences
  ) {
    switch (stepDef.type) {
      case 'delay':
        await step.sleep(stepDef.id, parseDuration(stepDef.duration))
        break

      case 'message':
        // Check preferences
        if (!preferences[stepDef.channel]?.enabled) {
          if (stepDef.fallback) {
            return this.executeStep(step, { ...stepDef, channel: stepDef.fallback }, userId, preferences)
          }
          return // user opted out, no fallback
        }

        await step.do(`send-${stepDef.channel}`, async () => {
          const deliveryDO = this.env.DELIVERY.get(
            this.env.DELIVERY.idFromName(`${userId}:${stepDef.channel}`)
          )
          return await deliveryDO.send(userId, stepDef.template)
        })
        break

      case 'branch':
        const user = await step.do('load-user', async () => {
          const userDO = this.env.USERS.get(this.env.USERS.idFromName(userId))
          return await userDO.getProfile()
        })

        for (const condition of stepDef.conditions) {
          if (evaluateCondition(condition, user)) {
            // Jump to condition's target step
            return condition.goto
          }
        }
        return stepDef.default
        break

      case 'batch':
        // Handled by BatchDO - collects events until window closes
        const batchDO = this.env.BATCH.get(
          this.env.BATCH.idFromName(`${userId}:${stepDef.id}`)
        )
        await batchDO.addToBatch(trigger, stepDef.window, stepDef.maxSize)
        break
    }
  }
}
```

### 3.4 Template Engine

**Problem**: Dynamic template rendering with personalization at scale.

**Design**:
```typescript
// Template storage (supports Liquid-like syntax)
interface Template {
  id: string
  channel: Channel
  subject?: string     // email subject
  body: string
  variables: string[]  // extracted variable names for validation
  version: number
}

// Lightweight Liquid-compatible template engine
export class TemplateEngine {
  private cache = new Map<string, CompiledTemplate>()

  compile(template: string): CompiledTemplate {
    // Parse {{ variable }} and {% if %} / {% for %} blocks
    // Return compiled function for efficient re-rendering
  }

  async render(
    templateId: string,
    context: TemplateContext,
    env: Env
  ): Promise<RenderedContent> {
    // Load template
    const template = await this.loadTemplate(templateId, env)

    // Get or compile
    let compiled = this.cache.get(templateId)
    if (!compiled || compiled.version !== template.version) {
      compiled = this.compile(template.body)
      this.cache.set(templateId, compiled)
    }

    // Render with user context
    return {
      subject: this.renderString(template.subject, context),
      body: compiled.render(context)
    }
  }
}

// Context includes user attributes, event data, computed fields
interface TemplateContext {
  user: UserProfile
  event?: TrackEvent
  computed?: Record<string, unknown>
  digest?: DigestData  // for batch templates
}
```

### 3.5 Channel Adapters

**Problem**: Reliable delivery across email, SMS, push, in-app, and chat with provider abstraction.

**Design**:
```typescript
// Abstract channel interface
interface ChannelAdapter {
  readonly channel: Channel
  send(recipient: Recipient, content: RenderedContent): Promise<DeliveryResult>
  validateRecipient(recipient: Recipient): boolean
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>
}

// Email adapter with provider selection
export class EmailAdapter implements ChannelAdapter {
  readonly channel = 'email'

  constructor(
    private providers: EmailProvider[],
    private selector: ProviderSelector
  ) {}

  async send(recipient: Recipient, content: RenderedContent): Promise<DeliveryResult> {
    const provider = this.selector.select(this.providers, recipient)

    try {
      const result = await provider.send({
        to: recipient.email,
        subject: content.subject,
        html: content.body,
        from: this.getFromAddress(recipient),
        replyTo: content.replyTo,
        headers: this.buildHeaders(recipient, content)
      })

      return {
        success: true,
        messageId: result.id,
        provider: provider.name
      }
    } catch (error) {
      // Try fallback provider
      const fallback = this.selector.fallback(this.providers, provider)
      if (fallback) {
        return this.sendWithProvider(fallback, recipient, content)
      }
      throw error
    }
  }
}

// Push adapter with APNs + FCM
export class PushAdapter implements ChannelAdapter {
  readonly channel = 'push'

  async send(recipient: Recipient, content: RenderedContent): Promise<DeliveryResult> {
    const tokens = await this.getTokens(recipient.userId)

    const results = await Promise.allSettled(
      tokens.map(token => this.sendToToken(token, content))
    )

    // Handle token invalidation
    const invalidTokens = results
      .filter(r => r.status === 'rejected' && isInvalidToken(r.reason))
      .map((r, i) => tokens[i])

    if (invalidTokens.length > 0) {
      await this.removeInvalidTokens(recipient.userId, invalidTokens)
    }

    return {
      success: results.some(r => r.status === 'fulfilled'),
      messageId: generateId(),
      details: results
    }
  }
}

// In-app adapter via WebSocket
export class InAppAdapter implements ChannelAdapter {
  readonly channel = 'in_app'

  async send(recipient: Recipient, content: RenderedContent): Promise<DeliveryResult> {
    // Store in inbox
    const inboxDO = this.env.INBOX.get(
      this.env.INBOX.idFromName(recipient.userId)
    )
    const messageId = await inboxDO.addMessage(content)

    // Push via WebSocket if connected
    const ws = await this.getWebSocket(recipient.userId)
    if (ws) {
      ws.send(JSON.stringify({
        type: 'notification',
        message: content
      }))
    }

    return { success: true, messageId }
  }
}
```

### 3.6 Digest/Batch Processing

**Problem**: Consolidate multiple notifications into single digests to reduce user fatigue.

**Design**:
```typescript
export class BatchDO extends DurableObject<Env> {
  private sql: SqlStorage
  private alarm: DurableObjectAlarm

  async addToBatch(event: TrackEvent, window: string, maxSize: number) {
    // Store event
    this.sql.exec(`
      INSERT INTO batch_events (event, properties, timestamp)
      VALUES (?, ?, ?)
    `, event.event, JSON.stringify(event.properties), Date.now())

    // Check if we should deliver early (max size reached)
    const count = this.sql.exec(`SELECT COUNT(*) as c FROM batch_events`).one().c
    if (count >= maxSize) {
      await this.deliverBatch()
      return
    }

    // Set alarm for window close if not set
    const alarm = await this.state.storage.getAlarm()
    if (!alarm) {
      const windowMs = parseDuration(window)
      await this.state.storage.setAlarm(Date.now() + windowMs)
    }
  }

  async alarm() {
    await this.deliverBatch()
  }

  private async deliverBatch() {
    const events = this.sql.exec(`SELECT * FROM batch_events ORDER BY timestamp`).toArray()

    if (events.length === 0) return

    // Build digest context
    const digestContext: DigestData = {
      count: events.length,
      events: events.map(e => ({
        event: e.event,
        properties: JSON.parse(e.properties),
        timestamp: new Date(e.timestamp)
      })),
      summary: this.generateSummary(events)
    }

    // Trigger digest delivery
    const userId = this.state.id.toString().split(':')[0]
    const deliveryDO = this.env.DELIVERY.get(
      this.env.DELIVERY.idFromName(`${userId}:digest`)
    )
    await deliveryDO.sendDigest(userId, digestContext)

    // Clear batch
    this.sql.exec(`DELETE FROM batch_events`)
  }
}
```

### 3.7 Preference Management

**Problem**: Allow users to control notification delivery while maintaining compliance.

**Design**:
```typescript
// Preference levels (Knock-inspired)
interface PreferenceSchema {
  // Global opt-out
  global: {
    enabled: boolean
  }

  // Per-workflow preferences
  workflows: {
    [workflowId: string]: {
      enabled: boolean
      channels?: {
        [channel: string]: boolean
      }
    }
  }

  // Per-channel preferences
  channels: {
    [channel: string]: {
      enabled: boolean
      quietHours?: {
        start: string  // "22:00"
        end: string    // "08:00"
        timezone: string
      }
    }
  }
}

// Preference evaluation
function shouldDeliver(
  preferences: PreferenceSchema,
  workflowId: string,
  channel: string
): boolean {
  // Check global opt-out
  if (!preferences.global.enabled) return false

  // Check channel opt-out
  if (preferences.channels[channel]?.enabled === false) return false

  // Check workflow opt-out
  const workflow = preferences.workflows[workflowId]
  if (workflow?.enabled === false) return false
  if (workflow?.channels?.[channel] === false) return false

  // Check quiet hours
  const channelPrefs = preferences.channels[channel]
  if (channelPrefs?.quietHours) {
    if (isInQuietHours(channelPrefs.quietHours)) return false
  }

  return true
}

// Preference API endpoints
app.get('/v1/users/:userId/preferences', async (c) => {
  const userDO = c.env.USERS.get(c.env.USERS.idFromName(c.req.param('userId')))
  return c.json(await userDO.getPreferences())
})

app.put('/v1/users/:userId/preferences', async (c) => {
  const userDO = c.env.USERS.get(c.env.USERS.idFromName(c.req.param('userId')))
  const preferences = await c.req.json()
  await userDO.setPreferences(preferences)
  return c.json({ success: true })
})
```

---

## 4. API Design

### 4.1 Track API (Customer.io Compatible)

```typescript
// POST /v1/track
interface TrackRequest {
  userId?: string
  anonymousId?: string
  event: string
  properties?: Record<string, unknown>
  timestamp?: string
  context?: {
    ip?: string
    userAgent?: string
    locale?: string
    timezone?: string
  }
}

// POST /v1/identify
interface IdentifyRequest {
  userId: string
  anonymousId?: string  // for merging
  traits: Record<string, unknown>
}

// POST /v1/batch
interface BatchRequest {
  batch: (TrackRequest | IdentifyRequest)[]
}
```

### 4.2 Workflow API (Knock-inspired)

```typescript
// POST /v1/workflows/:workflowId/trigger
interface WorkflowTriggerRequest {
  recipients: string | string[]  // user IDs
  data?: Record<string, unknown>  // template variables
  actor?: string  // who triggered (for "X liked your post")
  tenant?: string  // for multi-tenant apps
}

// Response
interface WorkflowTriggerResponse {
  workflowRunId: string
  status: 'accepted'
}

// GET /v1/workflows/:workflowId/runs/:runId
interface WorkflowRunStatus {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  steps: StepStatus[]
  startedAt: string
  completedAt?: string
}
```

### 4.3 Message API

```typescript
// GET /v1/users/:userId/messages
interface MessageListResponse {
  messages: Message[]
  cursor?: string
}

interface Message {
  id: string
  workflowId: string
  channel: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
  content: {
    subject?: string
    body: string
  }
  sentAt?: string
  deliveredAt?: string
  readAt?: string
}

// POST /v1/users/:userId/messages/:messageId/read
// Mark message as read

// DELETE /v1/users/:userId/messages/:messageId
// Archive/delete message
```

### 4.4 In-App Feed API

```typescript
// GET /v1/users/:userId/feed
interface FeedResponse {
  entries: FeedEntry[]
  meta: {
    unreadCount: number
    unseenCount: number
    totalCount: number
  }
  cursor?: string
}

// WebSocket connection for real-time updates
// ws://notify.do/v1/users/:userId/feed/realtime
interface FeedWebSocketMessage {
  type: 'new' | 'update' | 'delete'
  entry?: FeedEntry
  entryId?: string
}
```

---

## 5. Integration Points

### 5.1 Email Providers

| Provider | Priority | Use Case |
|----------|----------|----------|
| Resend | Primary | Transactional, great DX |
| SendGrid | Secondary | High volume, enterprise |
| Mailgun | Tertiary | Europe, validation |
| AWS SES | Fallback | Cost optimization |
| Postmark | Specialty | Transactional focus |

### 5.2 SMS Providers

| Provider | Priority | Use Case |
|----------|----------|----------|
| Twilio | Primary | Global coverage |
| Vonage | Secondary | Enterprise |
| MessageBird | Regional | Europe focus |
| SNS | Fallback | AWS integration |

### 5.3 Push Providers

| Provider | Platform | Notes |
|----------|----------|-------|
| APNs | iOS | Direct integration |
| FCM | Android/Web | Firebase Cloud Messaging |
| Expo | React Native | Simplified push |

### 5.4 Chat Integrations

| Platform | Features |
|----------|----------|
| Slack | Channels, DMs, threads |
| Discord | Webhooks, bot messages |
| MS Teams | Adaptive cards |

---

## 6. Key Design Decisions

### 6.1 Workflow State Management

**Decision**: Use Cloudflare Workflows for long-running orchestration, Durable Objects for real-time state.

**Rationale**:
- CF Workflows handle delays, retries, and durability automatically
- DOs provide sub-millisecond access to user state and preferences
- Combination gives both reliability and performance

### 6.2 Template Personalization

**Decision**: Compile templates to JavaScript functions, cache in DO memory.

**Rationale**:
- Avoids re-parsing on every render
- DO memory is fast and persistent within session
- Version tracking ensures cache invalidation

### 6.3 Delivery Reliability

**Decision**: At-least-once delivery with idempotency keys.

**Rationale**:
- Each message gets unique ID
- Channel adapters check for duplicate delivery
- Retry with exponential backoff on transient failures

### 6.4 Rate Limiting

**Decision**: Per-channel rate limits using token bucket in KV.

**Rationale**:
- Email: 100/hour per user (deliverability)
- SMS: 10/day per user (cost + spam regulations)
- Push: 50/hour per user (user experience)
- In-app: Unlimited (low cost)

---

## 7. Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Event ingestion API (track, identify, batch)
- [ ] UserDO with profile and event storage
- [ ] Basic template engine
- [ ] Email channel adapter (Resend)

### Phase 2: Workflow Engine
- [ ] WorkflowDO for definition storage
- [ ] CF Workflow integration
- [ ] Delay, branch, and message steps
- [ ] Push notification adapter (APNs, FCM)

### Phase 3: Advanced Features
- [ ] Batch/digest processing
- [ ] Preference management API
- [ ] In-app notifications with WebSocket
- [ ] SMS channel adapter

### Phase 4: Developer Experience
- [ ] SDK generation (TypeScript, Python)
- [ ] CLI for workflow management
- [ ] Version control for workflows
- [ ] Analytics dashboard

### Phase 5: Enterprise
- [ ] Multi-tenant support
- [ ] Audit logging
- [ ] SSO/SCIM integration
- [ ] Custom domain support

---

## 8. Competitive Positioning

| Feature | notify.do | Customer.io | Knock | Novu |
|---------|-----------|-------------|-------|------|
| Edge-native | Yes | No | No | No |
| Open source | Yes | No | No | Yes |
| Self-hostable | Yes (CF) | No | No | Yes |
| Sub-ms latency | Yes | No | No | No |
| Workflow builder | Yes | Yes | Yes | Yes |
| Multi-channel | Yes | Yes | Yes | Yes |
| Digest engine | Yes | Yes | Yes | Yes |
| MCP integration | Yes | No | No | No |

**Unique Value**: notify.do combines edge-native performance with the developer experience of Knock and the open infrastructure approach of Novu, all running on Cloudflare's global network.

---

## 9. SDK Design

```typescript
// TypeScript SDK (tree-shakable)
import { Notify } from 'notify.do'

const notify = Notify({
  apiKey: process.env.NOTIFY_API_KEY
})

// Track event
await notify.track({
  userId: 'user_123',
  event: 'order_placed',
  properties: {
    orderId: 'order_456',
    amount: 99.99
  }
})

// Identify user
await notify.identify({
  userId: 'user_123',
  traits: {
    email: 'alice@example.com',
    name: 'Alice',
    plan: 'pro'
  }
})

// Trigger workflow
await notify.workflows.trigger('order-confirmation', {
  recipients: ['user_123'],
  data: {
    orderId: 'order_456',
    items: [{ name: 'Widget', qty: 2 }]
  }
})

// Get user preferences
const prefs = await notify.users.getPreferences('user_123')

// Update preferences
await notify.users.setPreferences('user_123', {
  workflows: {
    'marketing-weekly': { enabled: false }
  }
})
```

---

## 10. MCP Integration

```typescript
// MCP tools for AI agents
const mcpTools = {
  // Send notification
  notify_send: {
    description: 'Send a notification to a user',
    parameters: {
      userId: { type: 'string', required: true },
      channel: { type: 'string', enum: ['email', 'sms', 'push', 'in_app'] },
      message: { type: 'string', required: true }
    }
  },

  // Trigger workflow
  notify_workflow: {
    description: 'Trigger a notification workflow',
    parameters: {
      workflowId: { type: 'string', required: true },
      recipients: { type: 'array', items: { type: 'string' } },
      data: { type: 'object' }
    }
  },

  // Check delivery status
  notify_status: {
    description: 'Check notification delivery status',
    parameters: {
      messageId: { type: 'string', required: true }
    }
  },

  // Get user preferences
  notify_preferences: {
    description: 'Get or update user notification preferences',
    parameters: {
      userId: { type: 'string', required: true },
      action: { type: 'string', enum: ['get', 'set'] },
      preferences: { type: 'object' }
    }
  }
}
```

---

## Sources

- [Customer.io Documentation](https://docs.customer.io/integrations/api/)
- [Customer.io - Track Events](https://docs.customer.io/integrations/data-in/custom-events/)
- [Braze API Basics](https://www.braze.com/docs/api/basics/)
- [Braze Canvas Flow Architecture](https://www.braze.com/resources/articles/building-braze-how-braze-built-our-canvas-flow-customer-journey-tool)
- [OneSignal Documentation](https://documentation.onesignal.com/docs)
- [Knock Documentation](https://docs.knock.app/)
- [Knock Workflows](https://docs.knock.app/concepts/workflows)
- [Novu Documentation](https://docs.novu.co/)
- [Novu GitHub](https://github.com/novuhq/novu)
- [Novu Architecture Overview](https://dev.to/elie222/inside-the-open-source-novu-notification-engine-311g)
