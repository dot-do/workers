# forms.do - Cloudflare Workers Forms & Surveys Platform

## Executive Summary

**forms.do** (with **surveys.do** as a companion domain) is a Cloudflare Workers rewrite that provides form building, submission handling, and survey capabilities. It replaces the need for Typeform, Tally, Formbricks, SurveyMonkey, Jotform, and Formspree by leveraging edge-native architecture with D1, R2, Durable Objects, and Turnstile.

---

## Platform Research Summary

### 1. Typeform

**Core Value Proposition**: Conversational, one-question-at-a-time forms that feel like conversations rather than traditional forms.

**Key APIs/Features**:
- **Create API**: Programmatic form creation, themes, images
- **Responses API**: JSON submission retrieval
- **Webhooks API**: Real-time submission delivery
- **Embed SDK**: JavaScript library for website integration
- **Logic Jumps**: Sophisticated conditional branching
- **Field Types**: 23+ types including calendly, matrix, payment, NPS, ranking, file_upload

**Schema Example**:
```json
{
  "title": "Customer Feedback",
  "fields": [
    { "type": "short_text", "title": "What is your name?", "ref": "name_field" },
    { "type": "rating", "title": "How satisfied are you?", "ref": "satisfaction" }
  ],
  "logic": [
    {
      "type": "field",
      "ref": "satisfaction",
      "actions": [
        {
          "action": "jump",
          "details": { "to": { "type": "field", "value": "followup" } },
          "condition": { "op": "lower_than", "vars": [{ "type": "field", "value": "satisfaction" }, { "type": "constant", "value": 3 }] }
        }
      ]
    }
  ]
}
```

**Pricing**: $25-34/month starting, 10 submissions/month free

---

### 2. Tally

**Core Value Proposition**: "Freemium powerhouse" - unlimited forms and submissions free, Notion-like editing experience.

**Key APIs/Features**:
- REST API at `api.tally.so` with Bearer token auth
- Event listeners: form loaded, page view, submission, popup closed
- `Tally.loadEmbeds()`, `Tally.openPopup()`, `Tally.closePopup()`
- Webhooks with signing secrets
- Hidden fields for attribution tracking
- Rate limit: 100 requests/minute

**Pricing**: Free unlimited forms/submissions, paid for team features and branding removal

---

### 3. Formbricks

**Core Value Proposition**: Open-source (AGPLv3) experience management suite with self-hosting capabilities.

**Key APIs/Features**:
- Management API: CRUD for surveys, responses, contacts
- Client API: Frontend interactions
- Built with Next.js, Tailwind CSS, Prisma, PostgreSQL
- Advanced targeting and user segmentation
- Docker/Kubernetes deployment
- Integrations: Slack, Airtable, Google Sheets, Zapier, n8n, Notion

**Architecture**:
- Link surveys, website surveys, in-app surveys
- All question types including ratings, rankings, matrices, file uploads
- Conditional logic and branching
- Multi-language support

---

### 4. SurveyMonkey

**Core Value Proposition**: Enterprise-grade survey platform with advanced analytics and research tools.

**Key APIs/Features**:
- API v3 with OAuth/access tokens
- Scopes: surveys_read/write, responses_read/write, webhooks_read/write
- Question families and subtypes for typing
- Webhook events: response_completed, response_disqualified, response_updated
- Rate limits: 120 calls/minute, 500 calls/day (draft apps)

**Complexity**: Response objects reference rows/columns/choices numerically, requiring lookups against survey structure.

---

### 5. Jotform

**Core Value Proposition**: All-in-one form builder with 10,000+ templates and extensive integrations.

**Key APIs/Features**:
- Auth via query params or headers
- SDKs: PHP, Python, Java, NodeJS, Go, C#, Ruby, Scala
- File upload endpoints with metadata
- Webhook creation/management
- Rate limits by plan: 1,000 (Starter) to unlimited (Enterprise)

**Pricing**: Free 5 forms/100 submissions, $34-39/month for more

---

### 6. Formspree

**Core Value Proposition**: Backend-only form service - "use your own frontend code, submit to our API."

**Key APIs/Features**:
- Submit to `https://formspree.io/f/{form_id}`
- Formshield ML spam filtering + reCAPTCHA
- 25+ direct integrations (Airtable, Slack, Salesforce, etc.)
- File uploads with validation rules
- REST API, webhooks, CLI deployment via `formspree.json`
- 10GB file storage on Business plan

---

## Architecture Vision: forms.do

```
forms.do / surveys.do
├── Form Schema Engine (D1)
│   ├── Form definitions
│   ├── Field configurations
│   ├── Logic/branching rules
│   └── Version history
├── Submission Processing (Edge Worker)
│   ├── Turnstile verification
│   ├── Validation engine
│   ├── Partial save recovery
│   └── Webhook dispatch
├── File Handling (R2)
│   ├── Upload presigning
│   ├── Virus scanning integration
│   ├── Size/type validation
│   └── CDN delivery
├── Spam Protection (Turnstile)
│   ├── Managed mode
│   ├── Invisible mode
│   └── Server-side verification
├── Analytics (D1 + Workers Analytics)
│   ├── Submission counts
│   ├── Field completion rates
│   ├── Drop-off analysis
│   └── Response time metrics
└── Integrations
    ├── Webhooks (durable delivery)
    ├── Email (via workers.do)
    ├── Slack/Discord
    └── Custom endpoints
```

---

## Form Schema Design

### Core Schema (D1)

```typescript
// Form definition
interface Form {
  id: string                    // UUID
  workspaceId: string          // Multi-tenant
  slug: string                  // URL-safe identifier
  title: string
  description?: string
  version: number              // Schema versioning
  status: 'draft' | 'published' | 'archived'
  settings: FormSettings
  fields: Field[]
  logic: LogicRule[]
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

interface FormSettings {
  // Behavior
  submitOnce: boolean           // One response per user
  saveProgress: boolean         // Partial submission recovery
  showProgressBar: boolean

  // Spam protection
  turnstile: {
    enabled: boolean
    mode: 'managed' | 'invisible' | 'non-interactive'
    siteKey: string
  }

  // Submission
  redirectUrl?: string
  successMessage?: string
  notifyEmails?: string[]

  // Limits
  maxSubmissions?: number
  closeDate?: string

  // Branding
  theme: ThemeSettings
  customCss?: string
}

interface Field {
  id: string                    // Stable reference ID
  type: FieldType
  title: string
  description?: string
  placeholder?: string
  required: boolean
  validation?: ValidationRule[]
  options?: FieldOption[]       // For choice fields
  properties: Record<string, unknown>  // Type-specific props
}

type FieldType =
  // Text
  | 'short_text' | 'long_text' | 'email' | 'phone' | 'url'
  // Numbers
  | 'number' | 'currency'
  // Choices
  | 'single_choice' | 'multiple_choice' | 'dropdown'
  // Scales
  | 'rating' | 'nps' | 'opinion_scale' | 'ranking' | 'matrix'
  // Date/Time
  | 'date' | 'time' | 'datetime'
  // Media
  | 'file_upload' | 'signature' | 'image_choice'
  // Layout
  | 'statement' | 'page_break' | 'section'
  // Advanced
  | 'hidden' | 'calculated' | 'payment'

interface LogicRule {
  id: string
  triggerFieldId: string
  conditions: Condition[]
  combinator: 'and' | 'or'
  action: LogicAction
}

interface Condition {
  fieldId: string
  operator: ConditionOperator
  value: unknown
}

type ConditionOperator =
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal'
  | 'is_empty' | 'is_not_empty'
  | 'starts_with' | 'ends_with'
  | 'before' | 'after' | 'on'

interface LogicAction {
  type: 'show' | 'hide' | 'jump' | 'calculate' | 'require'
  target: string  // Field ID or calculation expression
}
```

### Submission Schema

```typescript
interface Submission {
  id: string
  formId: string
  formVersion: number          // Which version was submitted
  status: 'partial' | 'complete' | 'spam'

  // Respondent tracking
  respondentId?: string        // For authenticated users
  sessionId: string            // Browser session
  ipAddress?: string           // Hashed for privacy
  userAgent?: string

  // Response data
  answers: Answer[]
  metadata: {
    startedAt: string
    submittedAt?: string
    duration?: number          // Seconds to complete
    pageViews: number[]        // Time on each page
    referrer?: string
    utm?: Record<string, string>
  }

  // Spam verdict
  turnstileToken?: string
  spamScore?: number

  createdAt: string
  updatedAt: string
}

interface Answer {
  fieldId: string
  fieldType: FieldType
  value: unknown               // Type depends on fieldType
  fileUrls?: string[]          // For file uploads
}
```

---

## D1 Database Schema

```sql
-- Forms table
CREATE TABLE forms (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  settings TEXT,  -- JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  UNIQUE(workspace_id, slug)
);

-- Form fields (normalized for querying)
CREATE TABLE fields (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  required INTEGER DEFAULT 0,
  position INTEGER NOT NULL,
  properties TEXT,  -- JSON
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

-- Logic rules
CREATE TABLE logic_rules (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  trigger_field_id TEXT NOT NULL,
  conditions TEXT NOT NULL,  -- JSON
  combinator TEXT DEFAULT 'and',
  action_type TEXT NOT NULL,
  action_target TEXT NOT NULL,
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

-- Form versions (for versioning)
CREATE TABLE form_versions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  schema TEXT NOT NULL,  -- Full JSON snapshot
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(form_id, version),
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

-- Submissions
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  form_version INTEGER NOT NULL,
  status TEXT DEFAULT 'partial',
  respondent_id TEXT,
  session_id TEXT NOT NULL,
  ip_hash TEXT,
  answers TEXT,  -- JSON
  metadata TEXT, -- JSON
  spam_score REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT,
  FOREIGN KEY (form_id) REFERENCES forms(id)
);

-- File uploads
CREATE TABLE uploads (
  id TEXT PRIMARY KEY,
  submission_id TEXT,
  field_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE SET NULL
);

-- Webhooks
CREATE TABLE webhooks (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT,  -- JSON array: ['submission.created', 'submission.updated']
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

-- Webhook deliveries (for retry and debugging)
CREATE TABLE webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  event TEXT NOT NULL,
  payload TEXT NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  next_retry_at TEXT,
  delivered_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_forms_workspace ON forms(workspace_id);
CREATE INDEX idx_submissions_form ON submissions(form_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_uploads_submission ON uploads(submission_id);
CREATE INDEX idx_webhook_deliveries_pending ON webhook_deliveries(next_retry_at)
  WHERE delivered_at IS NULL;
```

---

## API Design

### Form Management API

```typescript
// GET /api/forms
// List forms for workspace
interface ListFormsResponse {
  forms: Form[]
  pagination: { page: number, limit: number, total: number }
}

// POST /api/forms
// Create a new form
interface CreateFormRequest {
  title: string
  description?: string
  fields?: Field[]
  settings?: Partial<FormSettings>
}

// GET /api/forms/:formId
// Get form by ID
interface GetFormResponse {
  form: Form
  submissions: { total: number, recent: number }
}

// PUT /api/forms/:formId
// Update form (creates new version if published)
interface UpdateFormRequest {
  title?: string
  description?: string
  fields?: Field[]
  settings?: Partial<FormSettings>
  logic?: LogicRule[]
}

// POST /api/forms/:formId/publish
// Publish form (increments version)
interface PublishFormResponse {
  form: Form
  version: number
  publishedAt: string
}

// DELETE /api/forms/:formId
// Archive form (soft delete)
```

### Submission API

```typescript
// POST /f/:formSlug
// Submit a form (public endpoint)
interface SubmitFormRequest {
  sessionId: string
  answers: Answer[]
  turnstileToken?: string
  partial?: boolean  // For save-and-continue
}

interface SubmitFormResponse {
  submissionId: string
  status: 'complete' | 'partial'
  redirectUrl?: string
  message?: string
}

// GET /api/forms/:formId/submissions
// List submissions (authenticated)
interface ListSubmissionsResponse {
  submissions: Submission[]
  pagination: { page: number, limit: number, total: number }
}

// GET /api/forms/:formId/submissions/:submissionId
// Get single submission
interface GetSubmissionResponse {
  submission: Submission
  form: Form  // The form version that was submitted
}

// DELETE /api/forms/:formId/submissions/:submissionId
// Delete submission
```

### File Upload API

```typescript
// POST /api/forms/:formId/uploads/presign
// Get presigned URL for R2 upload
interface PresignUploadRequest {
  filename: string
  contentType: string
  size: number
  fieldId: string
}

interface PresignUploadResponse {
  uploadId: string
  uploadUrl: string  // R2 presigned PUT URL
  expiresAt: string
}

// POST /api/forms/:formId/uploads/:uploadId/complete
// Confirm upload completion
interface CompleteUploadRequest {
  sessionId: string
}

interface CompleteUploadResponse {
  upload: {
    id: string
    url: string  // Public CDN URL
    filename: string
    size: number
  }
}
```

### Webhook API

```typescript
// POST /api/forms/:formId/webhooks
interface CreateWebhookRequest {
  url: string
  events: ('submission.created' | 'submission.updated')[]
  secret?: string  // For HMAC signing
}

// GET /api/forms/:formId/webhooks/:webhookId/deliveries
// List recent deliveries (for debugging)
interface ListDeliveriesResponse {
  deliveries: WebhookDelivery[]
}

// POST /api/forms/:formId/webhooks/:webhookId/test
// Send test webhook
```

---

## Durable Object Architecture

### FormsDO (Per-Form State)

```typescript
export class FormsDO extends DurableObject<Env> {
  private app: Hono
  private db: D1Database
  private r2: R2Bucket

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.app = this.createApp()
    this.db = env.DB
    this.r2 = env.UPLOADS
  }

  private createApp(): Hono {
    const app = new Hono()

    // Public submission endpoint
    app.post('/submit', this.handleSubmit.bind(this))

    // Partial save recovery
    app.get('/session/:sessionId', this.getSession.bind(this))
    app.post('/session/:sessionId', this.saveSession.bind(this))

    // Real-time updates (WebSocket)
    app.get('/ws', this.handleWebSocket.bind(this))

    return app
  }

  async handleSubmit(c: Context) {
    // 1. Verify Turnstile token
    if (this.form.settings.turnstile.enabled) {
      const valid = await this.verifyTurnstile(c.req.json().turnstileToken)
      if (!valid) return c.json({ error: 'Bot detected' }, 403)
    }

    // 2. Validate submission
    const validation = await this.validateSubmission(c.req.json())
    if (!validation.valid) {
      return c.json({ errors: validation.errors }, 400)
    }

    // 3. Store submission
    const submission = await this.storeSubmission(c.req.json())

    // 4. Dispatch webhooks (non-blocking)
    this.ctx.waitUntil(this.dispatchWebhooks(submission))

    // 5. Send notifications (non-blocking)
    this.ctx.waitUntil(this.sendNotifications(submission))

    return c.json({
      submissionId: submission.id,
      status: 'complete',
      redirectUrl: this.form.settings.redirectUrl,
      message: this.form.settings.successMessage
    })
  }

  async verifyTurnstile(token: string): Promise<boolean> {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: this.env.TURNSTILE_SECRET,
        response: token
      })
    })
    const result = await response.json()
    return result.success === true
  }
}
```

### WebhookDeliveryDO (Durable Webhook Delivery)

```typescript
export class WebhookDeliveryDO extends DurableObject<Env> {
  async deliver(delivery: WebhookDelivery): Promise<void> {
    const maxAttempts = 5
    const backoffMs = [0, 30000, 120000, 600000, 3600000]  // 0, 30s, 2m, 10m, 1h

    while (delivery.attempts < maxAttempts) {
      try {
        const payload = JSON.stringify(delivery.payload)
        const signature = await this.sign(payload, delivery.webhook.secret)

        const response = await fetch(delivery.webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forms-Signature': signature,
            'X-Forms-Delivery-ID': delivery.id
          },
          body: payload
        })

        if (response.ok) {
          await this.markDelivered(delivery.id)
          return
        }

        delivery.attempts++
        if (delivery.attempts < maxAttempts) {
          await this.ctx.storage.setAlarm(Date.now() + backoffMs[delivery.attempts])
        }
      } catch (error) {
        delivery.attempts++
        await this.logAttempt(delivery.id, error)
      }
    }

    await this.markFailed(delivery.id)
  }

  private async sign(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
  }
}
```

---

## Cloudflare-Native Advantages

### 1. Turnstile Integration

**Zero-friction spam protection** without CAPTCHAs:

```typescript
// Client-side (invisible mode)
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<form action="/f/my-form" method="POST">
  <div class="cf-turnstile"
       data-sitekey="0x4AAAAAAA..."
       data-callback="onTurnstileSuccess"
       data-action="form-submit">
  </div>
</form>

// Server-side verification
const verifyTurnstile = async (token: string, ip: string) => {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
      remoteip: ip
    })
  })
  return response.json()
}
```

### 2. R2 File Storage

**Direct uploads** with presigned URLs:

```typescript
// Generate presigned URL for client upload
const presignUpload = async (formId: string, fieldId: string, filename: string) => {
  const key = `forms/${formId}/uploads/${crypto.randomUUID()}/${filename}`

  return await env.UPLOADS.createMultipartUpload(key, {
    httpMetadata: {
      contentType: getMimeType(filename)
    },
    customMetadata: {
      formId,
      fieldId
    }
  })
}

// CDN delivery via Workers
app.get('/uploads/:key+', async (c) => {
  const object = await env.UPLOADS.get(c.req.param('key'))
  if (!object) return c.notFound()

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata.contentType,
      'Cache-Control': 'public, max-age=31536000'
    }
  })
})
```

### 3. Edge Submission Processing

**Global low latency** - forms render and submit from nearest edge:

```typescript
// Worker handles initial validation at edge
// Only valid submissions reach Durable Objects
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    // Public form submission
    if (url.pathname.startsWith('/f/')) {
      const formSlug = url.pathname.split('/')[2]

      // Edge validation (fast reject bad requests)
      if (request.method === 'POST') {
        const body = await request.json()

        // Quick validation at edge
        if (!body.answers || !Array.isArray(body.answers)) {
          return Response.json({ error: 'Invalid submission' }, { status: 400 })
        }

        // Verify Turnstile at edge (don't even hit DO if bot)
        if (body.turnstileToken) {
          const verified = await verifyTurnstile(body.turnstileToken, request.headers.get('CF-Connecting-IP'))
          if (!verified.success) {
            return Response.json({ error: 'Verification failed' }, { status: 403 })
          }
        }
      }

      // Route to Form's Durable Object
      const id = env.FORMS.idFromName(formSlug)
      const stub = env.FORMS.get(id)
      return stub.fetch(request)
    }

    // API routes...
  }
}
```

### 4. D1 Analytics

**Real-time analytics** without external services:

```typescript
// Built-in analytics queries
const getFormAnalytics = async (formId: string, period: '24h' | '7d' | '30d') => {
  const periodStart = {
    '24h': 'datetime("now", "-1 day")',
    '7d': 'datetime("now", "-7 days")',
    '30d': 'datetime("now", "-30 days")'
  }[period]

  const result = await env.DB.prepare(`
    SELECT
      COUNT(*) as total_submissions,
      COUNT(CASE WHEN status = 'complete' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial,
      AVG(CASE WHEN submitted_at IS NOT NULL
          THEN (julianday(submitted_at) - julianday(created_at)) * 86400
          END) as avg_completion_time_seconds,
      COUNT(DISTINCT DATE(created_at)) as active_days
    FROM submissions
    WHERE form_id = ? AND created_at >= ${periodStart}
  `).bind(formId).first()

  return result
}
```

---

## Form Versioning Strategy

### Why Versioning Matters

- Forms evolve over time
- Submissions must reference the exact schema they were submitted against
- Analytics need to compare across versions
- Legal/compliance requires knowing what users saw

### Implementation

```typescript
// On form update when published
const updatePublishedForm = async (formId: string, changes: FormUpdate) => {
  // Get current form
  const form = await getForm(formId)

  // Create new version
  const newVersion = form.version + 1

  // Store version snapshot
  await env.DB.prepare(`
    INSERT INTO form_versions (id, form_id, version, schema)
    VALUES (?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    formId,
    newVersion,
    JSON.stringify({ ...form, ...changes })
  ).run()

  // Update form with new version
  await env.DB.prepare(`
    UPDATE forms
    SET version = ?, title = ?, fields = ?, settings = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(newVersion, changes.title, JSON.stringify(changes.fields), JSON.stringify(changes.settings), formId).run()

  return newVersion
}

// On submission, capture version
const createSubmission = async (formId: string, submission: SubmissionData) => {
  const form = await getForm(formId)

  await env.DB.prepare(`
    INSERT INTO submissions (id, form_id, form_version, answers, ...)
    VALUES (?, ?, ?, ?, ...)
  `).bind(
    crypto.randomUUID(),
    formId,
    form.version,  // Capture current version
    JSON.stringify(submission.answers),
    // ...
  ).run()
}
```

---

## Partial Submission Recovery

### Flow

1. User starts filling form
2. On each field completion, save progress
3. If user leaves, store session in Durable Object
4. On return, prompt to continue or start fresh
5. Restore state if continuing

```typescript
// Client-side auto-save
const autoSave = debounce(async (sessionId: string, answers: Answer[]) => {
  await fetch(`/f/${formSlug}/session/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ answers, currentPage: pageIndex })
  })
}, 2000)

// Server-side session storage (in FormsDO)
async saveSession(c: Context) {
  const sessionId = c.req.param('sessionId')
  const { answers, currentPage } = await c.req.json()

  // Store in DO's transactional storage (survives restarts)
  await this.ctx.storage.put(`session:${sessionId}`, {
    answers,
    currentPage,
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()  // 7 days
  })

  return c.json({ saved: true })
}

async getSession(c: Context) {
  const sessionId = c.req.param('sessionId')
  const session = await this.ctx.storage.get(`session:${sessionId}`)

  if (!session || new Date(session.expiresAt) < new Date()) {
    return c.json({ found: false })
  }

  return c.json({
    found: true,
    answers: session.answers,
    currentPage: session.currentPage
  })
}
```

---

## File Upload Architecture

### Constraints

- Cloudflare Workers: 100MB request body limit
- R2: 5GB per object, multipart for larger
- Security: Validate types, scan for malware

### Flow

```
1. Client requests presigned URL
   POST /api/forms/:formId/uploads/presign
   { filename, contentType, size, fieldId }

2. Server validates and returns presigned URL
   { uploadId, uploadUrl, expiresAt }

3. Client uploads directly to R2
   PUT {uploadUrl} with file body

4. Client confirms upload
   POST /api/forms/:formId/uploads/:uploadId/complete

5. On form submit, include uploadIds in answers
```

### Validation

```typescript
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  video: ['video/mp4', 'video/webm', 'video/quicktime']
}

const MAX_FILE_SIZE = 50 * 1024 * 1024  // 50MB default

const validateUpload = (field: Field, upload: UploadRequest) => {
  const allowedTypes = field.properties.allowedTypes || Object.values(ALLOWED_TYPES).flat()
  const maxSize = field.properties.maxSize || MAX_FILE_SIZE

  if (!allowedTypes.includes(upload.contentType)) {
    return { valid: false, error: `File type ${upload.contentType} not allowed` }
  }

  if (upload.size > maxSize) {
    return { valid: false, error: `File exceeds maximum size of ${maxSize / 1024 / 1024}MB` }
  }

  return { valid: true }
}
```

---

## Integration Patterns

### Webhook Payload Schema

```typescript
interface WebhookPayload {
  event: 'submission.created' | 'submission.updated'
  timestamp: string
  formId: string
  formTitle: string
  submission: {
    id: string
    status: string
    answers: Record<string, {
      fieldId: string
      fieldTitle: string
      fieldType: FieldType
      value: unknown
    }>
    metadata: {
      submittedAt: string
      duration: number
      referrer?: string
    }
  }
}

// Example webhook payload
{
  "event": "submission.created",
  "timestamp": "2025-01-07T12:00:00Z",
  "formId": "form_abc123",
  "formTitle": "Customer Feedback Survey",
  "submission": {
    "id": "sub_xyz789",
    "status": "complete",
    "answers": {
      "name": {
        "fieldId": "field_001",
        "fieldTitle": "What is your name?",
        "fieldType": "short_text",
        "value": "Alice Smith"
      },
      "satisfaction": {
        "fieldId": "field_002",
        "fieldTitle": "How satisfied are you?",
        "fieldType": "rating",
        "value": 5
      }
    },
    "metadata": {
      "submittedAt": "2025-01-07T12:00:00Z",
      "duration": 45,
      "referrer": "https://example.com/products"
    }
  }
}
```

### Email Notifications (via workers.do)

```typescript
const sendNotification = async (form: Form, submission: Submission) => {
  if (!form.settings.notifyEmails?.length) return

  const emailContent = formatSubmissionEmail(form, submission)

  await env.EMAIL.send({
    to: form.settings.notifyEmails,
    subject: `New submission: ${form.title}`,
    html: emailContent
  })
}
```

---

## Directory Structure

```
rewrites/forms/
├── .beads/
│   └── issues.jsonl
├── src/
│   ├── index.ts                    # Worker entrypoint
│   ├── durable-objects/
│   │   ├── forms.ts                # FormsDO
│   │   └── webhook-delivery.ts     # WebhookDeliveryDO
│   ├── api/
│   │   ├── forms.ts                # Form CRUD routes
│   │   ├── submissions.ts          # Submission routes
│   │   ├── uploads.ts              # File upload routes
│   │   └── webhooks.ts             # Webhook routes
│   ├── core/
│   │   ├── schema.ts               # Form schema types
│   │   ├── validation.ts           # Form validation engine
│   │   ├── logic.ts                # Conditional logic engine
│   │   └── analytics.ts            # Analytics queries
│   ├── integrations/
│   │   ├── turnstile.ts            # Turnstile verification
│   │   ├── r2.ts                   # R2 upload handling
│   │   └── webhooks.ts             # Webhook dispatch
│   └── render/
│       ├── form.tsx                # Server-rendered form
│       └── embed.ts                # Embed SDK
├── client/
│   ├── index.ts                    # SDK entrypoint
│   └── types.ts                    # Client types
├── test/
│   ├── forms.test.ts
│   ├── submissions.test.ts
│   └── webhooks.test.ts
├── wrangler.jsonc
├── package.json
├── tsconfig.json
└── README.md
```

---

## SDK Design

```typescript
// forms.do SDK
import { Forms } from 'forms.do'

// Initialize
const forms = Forms({
  workspaceId: 'ws_xxx',
  apiKey: process.env.FORMS_API_KEY
})

// Create form
const form = await forms.create({
  title: 'Customer Feedback',
  fields: [
    { type: 'short_text', title: 'Name', required: true },
    { type: 'email', title: 'Email', required: true },
    { type: 'rating', title: 'How satisfied are you?', required: true },
    { type: 'long_text', title: 'Any additional feedback?' }
  ]
})

// Publish
await forms.publish(form.id)

// List submissions
const submissions = await forms.submissions.list(form.id, {
  status: 'complete',
  limit: 50
})

// Export
const csv = await forms.submissions.export(form.id, { format: 'csv' })
```

---

## Implementation Phases

### Phase 1: Core Form Engine (MVP)
- [ ] D1 schema setup
- [ ] Form CRUD API
- [ ] Basic field types (text, email, number, choice, rating)
- [ ] Public submission endpoint
- [ ] Turnstile integration
- [ ] Basic webhooks

### Phase 2: Advanced Fields & Logic
- [ ] All field types (file upload, matrix, ranking, etc.)
- [ ] Conditional logic engine
- [ ] Form versioning
- [ ] Partial save recovery

### Phase 3: File Uploads
- [ ] R2 presigned URL generation
- [ ] Direct upload flow
- [ ] File type validation
- [ ] CDN delivery

### Phase 4: Analytics & Integrations
- [ ] Submission analytics
- [ ] Drop-off analysis
- [ ] Email notifications
- [ ] Slack/Discord integrations
- [ ] Webhook retry with backoff

### Phase 5: Form Builder UI
- [ ] React form builder component
- [ ] Drag-and-drop field ordering
- [ ] Live preview
- [ ] Theme customization

---

## Competitive Advantages

| Feature | Typeform | Tally | Formspree | **forms.do** |
|---------|----------|-------|-----------|-------------|
| Edge Processing | No | No | No | **Yes** |
| Native Spam Protection | reCAPTCHA | reCAPTCHA | reCAPTCHA + ML | **Turnstile** |
| File Storage | S3 | S3 | Custom | **R2** |
| Self-Hostable | No | No | No | **Yes** |
| Open Source | No | No | No | **Yes** |
| Global Latency | ~100-300ms | ~100-300ms | ~100-300ms | **<50ms** |
| Durable Webhooks | Basic | Basic | Basic | **DO-backed** |
| Pricing | $25+/mo | Free* | $50+/mo | **Free tier** |

---

## Resources

- [Typeform Developer Platform](https://www.typeform.com/developers/)
- [Typeform Logic Jumps](https://www.typeform.com/developers/create/logic-jumps/)
- [Tally API Documentation](https://developers.tally.so/)
- [Formbricks GitHub](https://github.com/formbricks/formbricks)
- [SurveyMonkey API](https://api.surveymonkey.com/v3/docs)
- [SurveyMonkey Webhooks](https://github.com/SurveyMonkey/public_api_docs/blob/main/includes/_webhooks.md)
- [Jotform API](https://api.jotform.com/docs/)
- [Formspree Documentation](https://formspree.io/)
- [Formspree File Uploads](https://help.formspree.io/hc/en-us/articles/115008380088-File-uploads)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
