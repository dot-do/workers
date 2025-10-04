/**
 * Type Definitions for Business-as-Code Runtime
 *
 * Complete TypeScript type definitions and examples for the $ runtime and all primitives.
 * These types power secure code execution in V8 isolates via Cloudflare Workers.
 */

/**
 * ROOT_TYPES - Complete overview of $ runtime
 *
 * The Business-as-Code runtime ($) provides 8 core primitives for building
 * business logic in secure V8 isolates. Code runs with automatic rollback
 * capability and non-destructive mutations.
 */
export const ROOT_TYPES = `
# Business-as-Code Runtime ($)

The **$ runtime** is a Business-as-Code execution environment that runs TypeScript code in secure V8 isolates on Cloudflare's edge. All primitives are available both via \`$\` and directly on the global scope.

## TypeScript Interface

\`\`\`typescript
/**
 * Business-as-Code Runtime
 *
 * Provides 8 core primitives for building business logic:
 * - ai: AI operations (generation, embeddings, classification)
 * - db: Database operations (CRUD, chainable queries, bulk operations)
 * - api: HTTP requests to external APIs
 * - on: Event handlers for lifecycle events
 * - send: Communication operations (email, SMS, webhooks)
 * - every: Scheduled tasks and iteration over collections
 * - decide: Decision logic and conditional execution
 * - user: User context and authentication state
 *
 * @example Evaluate a statement
 * \`\`\`typescript
 * // Direct primitive access
 * const result = await ai.generateText('Write a haiku')
 * const users = await db.users.find({ active: true })
 * \`\`\`
 *
 * @example Business module pattern
 * \`\`\`typescript
 * export default $ => {
 *   const { ai, db, on, send, every } = $
 *
 *   // Event-driven business logic
 *   on.user.created(async (user) => {
 *     await send.email(user.email, 'Welcome!', ai.generateWelcomeEmail(user))
 *   })
 *
 *   // Scheduled tasks
 *   every.hour.reviewKPIs()
 *   every.month.forEvery.user.sendMonthlyReport()
 * }
 * \`\`\`
 */
interface BusinessRuntime {
  /** AI operations - text generation, embeddings, classification */
  ai: AIOperations

  /** Database operations - CRUD, queries, bulk operations */
  db: DatabaseOperations

  /** HTTP API calls - GET, POST, PUT, DELETE */
  api: APIOperations

  /** Event handlers - lifecycle events and custom events */
  on: EventOperations

  /** Communication - email, SMS, push notifications, webhooks */
  send: SendOperations

  /** Scheduling - cron tasks and collection iteration */
  every: EveryOperations

  /** Decision logic - conditionals, switches, rules */
  decide: DecisionOperations

  /** User context - authentication state and metadata */
  user: UserContext
}
\`\`\`

## Usage Patterns

### Pattern 1: Evaluate Statement

Execute a single statement or expression:

\`\`\`typescript
// AI generation
await ai.generateText('Write a haiku about coding')

// Database queries
await db.forEvery.industry.occupations.tasks.generateService()

// Chained operations
await db.users.find({ role: 'admin' }).forEach(user =>
  send.email(user.email, 'Admin Alert', 'System maintenance scheduled')
)
\`\`\`

### Pattern 2: Business Module

Define complete business logic as a module:

\`\`\`typescript
export default $ => {
  const { ai, api, db, decide, every, on, send, user } = $

  // Lifecycle event handlers
  on.user.created(async (newUser) => {
    // Generate personalized welcome email
    const welcomeEmail = await ai.generateText(\`
      Write a welcome email for \${newUser.name} who signed up as \${newUser.role}
    \`)

    // Send email
    await send.email(newUser.email, 'Welcome to .do!', welcomeEmail)

    // Create default workspace
    await db.workspaces.create({
      name: \`\${newUser.name}'s Workspace\`,
      owner: newUser.id
    })
  })

  // Scheduled tasks
  every.hour(async () => {
    // Review KPIs and send alerts
    const kpis = await db.kpis.find({ alertEnabled: true })
    for (const kpi of kpis) {
      if (kpi.value < kpi.threshold) {
        await send.webhook(kpi.alertUrl, { kpi, alert: 'below_threshold' })
      }
    }
  })

  // Bulk operations
  every.month.forEvery.user(async (user) => {
    // Generate monthly report
    const report = await ai.generateMonthlyReport(user)
    await send.email(user.email, 'Monthly Report', report)
  })

  // Decision logic
  decide.switch(user.tier, {
    free: () => db.usage.limit(user.id, { requests: 100 }),
    pro: () => db.usage.limit(user.id, { requests: 10000 }),
    enterprise: () => db.usage.unlimited(user.id)
  })
}
\`\`\`

## Security

All code runs in secure V8 isolates with:
- ✅ **Automatic rollback** - Failed operations roll back automatically
- ✅ **Non-destructive mutations** - Database changes are versioned
- ✅ **Rate limiting** - Tier-based execution limits
- ✅ **Namespace isolation** - Tenant data is isolated
- ✅ **Timeout protection** - Max 30 seconds execution time

## Documentation

Access complete documentation for any primitive:

\`\`\`typescript
// Get full $ runtime docs
await $.md

// Get primitive-specific docs
await ai.md
await db.md
await send.md
\`\`\`
`

/**
 * AI_TYPES - AI operations interface
 */
export const AI_TYPES = `
# AI Operations (ai)

AI generation, embeddings, classification, and extraction powered by Cloudflare Workers AI and external providers.

## TypeScript Interface

\`\`\`typescript
/**
 * AI Operations
 *
 * Provides AI capabilities including text generation, embeddings,
 * classification, and structured data extraction.
 *
 * @example Direct access
 * \`\`\`typescript
 * const haiku = await ai.generateText('Write a haiku about AI')
 * const embedding = await ai.embed('Business-as-Code')
 * const sentiment = await ai.classify('This is amazing!', ['positive', 'negative'])
 * \`\`\`
 *
 * @example In module
 * \`\`\`typescript
 * export default $ => {
 *   const { ai, db } = $
 *
 *   on.article.created(async (article) => {
 *     // Generate embeddings for search
 *     const embedding = await ai.embed(article.content)
 *     await db.embeddings.create({ articleId: article.id, vector: embedding })
 *
 *     // Extract key topics
 *     const topics = await ai.extract(article.content, {
 *       schema: { topics: ['string'] }
 *     })
 *     await db.articles.update(article.id, { topics })
 *   })
 * }
 * \`\`\`
 */
interface AIOperations {
  /**
   * Generate text from prompt
   * @param prompt - Text prompt for generation
   * @param options - Generation options (model, temperature, maxTokens)
   * @returns Generated text
   */
  generateText(prompt: string, options?: GenerateOptions): Promise<string>

  /**
   * Generate structured output
   * @param prompt - Text prompt
   * @param options - Generation options with schema
   * @returns Structured object matching schema
   */
  generate(prompt: string, options?: GenerateOptions): Promise<any>

  /**
   * Stream generated text
   * @param prompt - Text prompt
   * @param options - Generation options
   * @returns Async generator yielding text chunks
   */
  generateStream(prompt: string, options?: GenerateOptions): AsyncGenerator<string>

  /**
   * Generate embeddings vector
   * @param text - Text to embed
   * @param options - Embedding options (model, dimensions)
   * @returns Vector embedding
   */
  embed(text: string, options?: EmbedOptions): Promise<number[]>

  /**
   * Classify text into categories
   * @param text - Text to classify
   * @param categories - Array of category labels
   * @param options - Classification options
   * @returns Category label with confidence
   */
  classify(text: string, categories: string[], options?: ClassifyOptions): Promise<{
    category: string
    confidence: number
  }>

  /**
   * Extract structured data from text
   * @param text - Text to extract from
   * @param options - Extraction schema
   * @returns Extracted data matching schema
   */
  extract(text: string, options: ExtractOptions): Promise<any>
}

interface GenerateOptions {
  model?: string              // 'llama-3.1-8b', 'gpt-4', 'claude-3.5-sonnet'
  temperature?: number        // 0-1, default 0.7
  maxTokens?: number          // Max tokens to generate
  system?: string             // System prompt
  schema?: object             // JSON schema for structured output
}

interface EmbedOptions {
  model?: string              // '@cf/baai/bge-base-en-v1.5'
  dimensions?: number         // Vector dimensions (default 768)
}

interface ClassifyOptions {
  model?: string
  threshold?: number          // Minimum confidence threshold
}

interface ExtractOptions {
  schema: object              // JSON schema for extraction
  model?: string
}
\`\`\`

## Examples

### Text Generation

\`\`\`typescript
// Simple generation
const story = await ai.generateText('Write a short story about a robot')

// With options
const code = await ai.generateText('Write a TypeScript function to validate email', {
  model: 'claude-3.5-sonnet',
  temperature: 0.3,
  maxTokens: 500,
  system: 'You are an expert TypeScript developer'
})
\`\`\`

### Structured Generation

\`\`\`typescript
// Generate structured output matching schema
const analysis = await ai.generate('Analyze this product review: "Great quality!"', {
  schema: {
    sentiment: 'string',           // 'positive' | 'negative' | 'neutral'
    rating: 'number',               // 1-5
    topics: ['string'],             // Array of topics
    summary: 'string'
  }
})

// Result: { sentiment: 'positive', rating: 5, topics: ['quality'], summary: '...' }
\`\`\`

### Embeddings

\`\`\`typescript
// Generate embedding for semantic search
const queryEmbedding = await ai.embed('How do I deploy a worker?')

// Find similar documents
const results = await db.documents
  .find({})
  .similarTo(queryEmbedding)
  .limit(5)
\`\`\`

### Classification

\`\`\`typescript
// Classify support tickets
const ticket = await ai.classify(
  'My payment failed and I need help',
  ['billing', 'technical', 'sales', 'general']
)

// Route based on classification
decide.switch(ticket.category, {
  billing: () => send.email('billing@company.com', 'New Ticket', ...),
  technical: () => send.email('support@company.com', 'New Ticket', ...),
})
\`\`\`

### Extraction

\`\`\`typescript
// Extract contact information from email
const contact = await ai.extract(emailBody, {
  schema: {
    name: 'string',
    email: 'string',
    phone: 'string?',              // Optional field
    company: 'string?'
  }
})

// Save to database
await db.contacts.create(contact)
\`\`\`

## Streaming

\`\`\`typescript
// Stream generated text for real-time display
for await (const chunk of ai.generateStream('Write a long article about AI')) {
  console.log(chunk)               // Print each chunk as it arrives
}
\`\`\`

## Error Handling

\`\`\`typescript
try {
  const result = await ai.generateText(prompt)
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // Handle rate limiting
  } else if (error.code === 'INVALID_MODEL') {
    // Handle invalid model
  }
}
\`\`\`
`

/**
 * DB_TYPES - Database operations interface
 */
export const DB_TYPES = `
# Database Operations (db)

Database operations with semantic path building, CRUD operations, and bulk processing.

## TypeScript Interface

\`\`\`typescript
/**
 * Database Operations
 *
 * Provides database access with semantic path building and chainable queries.
 * All operations are non-destructive and support automatic rollback.
 *
 * @example Direct access
 * \`\`\`typescript
 * const users = await db.users.find({ active: true })
 * const user = await db.user.create({ email: 'test@example.com', name: 'Test' })
 * await db.user.update('user_123', { active: false })
 * \`\`\`
 *
 * @example Chainable paths
 * \`\`\`typescript
 * // Semantic relationships
 * await db.forEvery.industry.occupations.tasks.generateService()
 * await db.user.workspaces.projects.update({ status: 'active' })
 * \`\`\`
 *
 * @example In module
 * \`\`\`typescript
 * export default $ => {
 *   const { db, ai, send } = $
 *
 *   // Bulk processing
 *   every.day.forEvery.user(async (user) => {
 *     if (user.subscription.expiresAt < Date.now()) {
 *       await send.email(user.email, 'Subscription Expiring', ...)
 *     }
 *   })
 * }
 * \`\`\`
 */
interface DatabaseOperations {
  /**
   * Find records matching filter
   * @param filter - Query filter object
   * @param options - Query options (limit, offset, sort)
   * @returns Array of matching records
   */
  find(filter: object, options?: QueryOptions): Promise<any[]>

  /**
   * Find single record by ID or filter
   * @param idOrFilter - Record ID or filter object
   * @returns Single record or null
   */
  findOne(idOrFilter: string | object): Promise<any | null>

  /**
   * Create new record
   * @param data - Record data
   * @returns Created record with generated ID
   */
  create(data: object): Promise<any>

  /**
   * Update existing record
   * @param id - Record ID
   * @param data - Fields to update
   * @returns Updated record
   */
  update(id: string, data: object): Promise<any>

  /**
   * Delete record
   * @param id - Record ID
   * @returns Deleted record
   */
  delete(id: string): Promise<any>

  /**
   * Iterate over all records in collection
   * @param callback - Function to call for each record
   */
  forEvery(callback: (record: any) => Promise<void>): Promise<void>

  /**
   * Count records matching filter
   * @param filter - Query filter
   * @returns Number of matching records
   */
  count(filter?: object): Promise<number>
}

interface QueryOptions {
  limit?: number          // Max results to return
  offset?: number         // Number of results to skip
  sort?: {                // Sort order
    [field: string]: 'asc' | 'desc'
  }
  select?: string[]       // Fields to include
}
\`\`\`

## Collection Naming

Collections are accessed via semantic paths with automatic tense inference:

\`\`\`typescript
// Plural = collection (list of items)
db.users.find({})              // Find users
db.industries.find({})         // Find industries

// Singular = item operations
db.user.create({ ... })        // Create user
db.industry.update(id, { ... }) // Update industry

// Relationships via chaining
db.user.workspaces.find({})    // Find user's workspaces
db.industry.occupations.tasks.find({}) // Nested relationships
\`\`\`

## CRUD Operations

### Create

\`\`\`typescript
// Create single record
const user = await db.user.create({
  email: 'user@example.com',
  name: 'John Doe',
  role: 'admin'
})

// Create with relationships
const project = await db.project.create({
  name: 'New Project',
  workspace: workspaceId,
  members: [userId1, userId2]
})
\`\`\`

### Read

\`\`\`typescript
// Find all
const users = await db.users.find({})

// Find with filter
const admins = await db.users.find({ role: 'admin' })

// Find with options
const recentUsers = await db.users.find(
  { active: true },
  { limit: 10, sort: { createdAt: 'desc' } }
)

// Find one by ID
const user = await db.user.findOne('user_123')

// Find one by filter
const user = await db.user.findOne({ email: 'test@example.com' })
\`\`\`

### Update

\`\`\`typescript
// Update single record
await db.user.update('user_123', {
  name: 'Jane Doe',
  active: false
})

// Update with nested data
await db.user.update('user_123', {
  settings: {
    theme: 'dark',
    notifications: true
  }
})
\`\`\`

### Delete

\`\`\`typescript
// Delete single record
await db.user.delete('user_123')

// Soft delete (update status)
await db.user.update('user_123', { deleted: true, deletedAt: Date.now() })
\`\`\`

## Chainable Queries

\`\`\`typescript
// Semantic relationship queries
const userProjects = await db.user('user_123').projects.find({})
const projectTasks = await db.project('proj_123').tasks.find({ status: 'open' })

// Multi-level relationships
const industryTasks = await db.industry('naics_123')
  .occupations
  .tasks
  .find({ complexity: 'high' })
\`\`\`

## Bulk Operations

### forEvery

\`\`\`typescript
// Process all records in collection
await db.forEvery.user(async (user) => {
  // Send notification to each user
  await send.email(user.email, 'Update', 'We have a new feature!')
})

// With filter
await db.users
  .find({ subscriptionExpiring: true })
  .forEvery(async (user) => {
    await send.email(user.email, 'Renew Subscription', ...)
  })

// Nested relationships
await db.forEvery.industry.occupations.tasks(async (task) => {
  // Generate service for each task
  await ai.generateService(task)
})
\`\`\`

### Batch Operations

\`\`\`typescript
// Batch create
const users = await db.users.createMany([
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' },
])

// Batch update
await db.users.updateMany(
  { active: false },                    // Filter
  { status: 'archived' }                // Update
)

// Batch delete
await db.users.deleteMany({ deletedAt: { $lt: Date.now() - 30 * 24 * 60 * 60 * 1000 } })
\`\`\`

## Aggregations

\`\`\`typescript
// Count records
const activeUsers = await db.users.count({ active: true })

// Group by
const usersByRole = await db.users.groupBy('role')
// Result: { admin: 5, user: 42, guest: 12 }

// Aggregate functions
const stats = await db.users.aggregate({
  avgAge: { $avg: 'age' },
  totalUsers: { $count: true },
  maxCreatedAt: { $max: 'createdAt' }
})
\`\`\`

## Transactions

\`\`\`typescript
// Automatic transaction wrapping
await db.transaction(async (tx) => {
  const user = await tx.user.create({ email: 'test@example.com' })
  await tx.workspace.create({ name: 'Workspace', owner: user.id })

  // If any operation fails, entire transaction rolls back
})
\`\`\`

## Semantic Search

\`\`\`typescript
// Vector similarity search
const embedding = await ai.embed('machine learning')
const similarDocs = await db.documents
  .similarTo(embedding)
  .limit(10)

// Full-text search
const results = await db.articles.search('cloudflare workers', {
  fields: ['title', 'content'],
  fuzzy: true
})
\`\`\`
`

/**
 * API_TYPES - HTTP API operations interface
 */
export const API_TYPES = `
# API Operations (api)

HTTP client for making requests to external APIs.

## TypeScript Interface

\`\`\`typescript
/**
 * API Operations
 *
 * HTTP client for external API calls with automatic retries,
 * rate limiting, and error handling.
 *
 * @example Direct access
 * \`\`\`typescript
 * const data = await api.get('https://api.example.com/users')
 * const result = await api.post('https://api.example.com/users', { name: 'John' })
 * \`\`\`
 *
 * @example In module
 * \`\`\`typescript
 * export default $ => {
 *   const { api, db } = $
 *
 *   on.order.created(async (order) => {
 *     // Call payment API
 *     const payment = await api.post('https://api.stripe.com/v1/charges', {
 *       amount: order.total,
 *       currency: 'usd',
 *       source: order.paymentToken
 *     }, {
 *       headers: { Authorization: \`Bearer \${env.STRIPE_KEY}\` }
 *     })
 *
 *     // Update order
 *     await db.order.update(order.id, { paymentId: payment.id })
 *   })
 * }
 * \`\`\`
 */
interface APIOperations {
  /**
   * Make GET request
   * @param url - Request URL
   * @param options - Request options
   * @returns Response data
   */
  get(url: string, options?: RequestOptions): Promise<any>

  /**
   * Make POST request
   * @param url - Request URL
   * @param body - Request body
   * @param options - Request options
   * @returns Response data
   */
  post(url: string, body?: any, options?: RequestOptions): Promise<any>

  /**
   * Make PUT request
   * @param url - Request URL
   * @param body - Request body
   * @param options - Request options
   * @returns Response data
   */
  put(url: string, body?: any, options?: RequestOptions): Promise<any>

  /**
   * Make PATCH request
   * @param url - Request URL
   * @param body - Request body
   * @param options - Request options
   * @returns Response data
   */
  patch(url: string, body?: any, options?: RequestOptions): Promise<any>

  /**
   * Make DELETE request
   * @param url - Request URL
   * @param options - Request options
   * @returns Response data
   */
  delete(url: string, options?: RequestOptions): Promise<any>
}

interface RequestOptions {
  headers?: Record<string, string>     // HTTP headers
  query?: Record<string, any>          // URL query parameters
  timeout?: number                     // Request timeout in ms
  retry?: {                            // Retry configuration
    attempts: number
    delay: number
  }
}
\`\`\`

## Examples

### GET Request

\`\`\`typescript
// Simple GET
const users = await api.get('https://api.example.com/users')

// With query parameters
const filtered = await api.get('https://api.example.com/users', {
  query: { role: 'admin', active: true }
})
// Fetches: https://api.example.com/users?role=admin&active=true

// With headers
const data = await api.get('https://api.github.com/user/repos', {
  headers: {
    Authorization: \`token \${env.GITHUB_TOKEN}\`,
    Accept: 'application/vnd.github.v3+json'
  }
})
\`\`\`

### POST Request

\`\`\`typescript
// Create resource
const user = await api.post('https://api.example.com/users', {
  name: 'John Doe',
  email: 'john@example.com'
})

// With authentication
const payment = await api.post('https://api.stripe.com/v1/charges', {
  amount: 2000,
  currency: 'usd',
  source: 'tok_visa'
}, {
  headers: {
    Authorization: \`Bearer \${env.STRIPE_SECRET_KEY}\`,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})
\`\`\`

### PUT Request

\`\`\`typescript
// Update resource
await api.put(\`https://api.example.com/users/\${userId}\`, {
  name: 'Jane Doe',
  active: false
})
\`\`\`

### DELETE Request

\`\`\`typescript
// Delete resource
await api.delete(\`https://api.example.com/users/\${userId}\`)

// With confirmation headers
await api.delete(\`https://api.example.com/users/\${userId}\`, {
  headers: { 'X-Confirm': 'true' }
})
\`\`\`

## Error Handling

\`\`\`typescript
try {
  const data = await api.get('https://api.example.com/data')
} catch (error) {
  if (error.status === 404) {
    // Handle not found
  } else if (error.status === 429) {
    // Handle rate limit
  } else if (error.code === 'TIMEOUT') {
    // Handle timeout
  }
}
\`\`\`

## Retry Logic

\`\`\`typescript
// Automatic retries on failure
const data = await api.get('https://api.example.com/data', {
  retry: {
    attempts: 3,        // Retry up to 3 times
    delay: 1000         // Wait 1s between retries
  },
  timeout: 5000         // 5s timeout per attempt
})
\`\`\`

## Integration Examples

### Weather API

\`\`\`typescript
export default $ => {
  const { api, db } = $

  every.hour(async () => {
    const cities = await db.cities.find({ weatherEnabled: true })

    for (const city of cities) {
      const weather = await api.get('https://api.openweathermap.org/data/2.5/weather', {
        query: {
          q: city.name,
          appid: env.OPENWEATHER_KEY,
          units: 'metric'
        }
      })

      await db.weather.create({
        city: city.id,
        temperature: weather.main.temp,
        condition: weather.weather[0].main,
        timestamp: Date.now()
      })
    }
  })
}
\`\`\`

### Stripe Webhooks

\`\`\`typescript
export default $ => {
  const { api, db, send } = $

  on.payment.succeeded(async (payment) => {
    // Verify payment with Stripe
    const charge = await api.get(
      \`https://api.stripe.com/v1/charges/\${payment.chargeId}\`,
      {
        headers: { Authorization: \`Bearer \${env.STRIPE_SECRET_KEY}\` }
      }
    )

    if (charge.status === 'succeeded') {
      // Update order
      await db.order.update(payment.orderId, { status: 'paid' })

      // Send confirmation
      const order = await db.order.findOne(payment.orderId)
      await send.email(order.customerEmail, 'Payment Confirmed', ...)
    }
  })
}
\`\`\`
`

/**
 * ON_TYPES - Event operations interface
 */
export const ON_TYPES = `
# Event Operations (on)

Event-driven programming with lifecycle events and custom event handlers.

## TypeScript Interface

\`\`\`typescript
/**
 * Event Operations
 *
 * Define handlers for lifecycle events and custom events.
 * Supports both built-in events (created, updated, deleted) and
 * custom events via emit().
 *
 * @example Direct access
 * \`\`\`typescript
 * on.user.created(async (user) => {
 *   console.log('New user:', user)
 * })
 *
 * on.order.updated(async (order, changes) => {
 *   if (changes.status === 'shipped') {
 *     await send.email(order.customerEmail, 'Order Shipped', ...)
 *   }
 * })
 * \`\`\`
 *
 * @example In module
 * \`\`\`typescript
 * export default $ => {
 *   const { on, ai, send, db } = $
 *
 *   // Lifecycle events
 *   on.user.created(async (user) => {
 *     const welcome = await ai.generateWelcomeEmail(user)
 *     await send.email(user.email, 'Welcome!', welcome)
 *   })
 *
 *   // Custom events
 *   on('payment.failed', async (payment) => {
 *     await db.payment.update(payment.id, { status: 'failed' })
 *     await send.email(payment.customerEmail, 'Payment Failed', ...)
 *   })
 * }
 * \`\`\`
 */
interface EventOperations {
  /**
   * Register event handler
   * @param event - Event name (dot notation: entity.event)
   * @param handler - Function to call when event fires
   */
  (event: string, handler: (data: any, metadata?: any) => Promise<void>): void

  /**
   * Emit custom event
   * @param event - Event name
   * @param data - Event data
   */
  emit(event: string, data: any): Promise<void>
}
\`\`\`

## Built-In Lifecycle Events

### Created Events

\`\`\`typescript
// Fired when new record is created
on.user.created(async (user) => {
  // Send welcome email
  await send.email(user.email, 'Welcome!', ...)

  // Create default workspace
  await db.workspace.create({
    name: \`\${user.name}'s Workspace\`,
    owner: user.id
  })
})

on.order.created(async (order) => {
  // Process payment
  // Send confirmation
  // Update inventory
})
\`\`\`

### Updated Events

\`\`\`typescript
// Fired when record is updated
on.user.updated(async (user, changes) => {
  // changes = { field: newValue, ... }

  if (changes.email) {
    // Email changed - send verification
    await send.email(user.email, 'Verify Email', ...)
  }

  if (changes.subscription) {
    // Subscription changed - update permissions
    await db.user.update(user.id, {
      permissions: getPermissionsForTier(user.subscription)
    })
  }
})

on.order.updated(async (order, changes) => {
  if (changes.status === 'shipped') {
    // Send shipping notification
    await send.email(order.customerEmail, 'Order Shipped', ...)
  }
})
\`\`\`

### Deleted Events

\`\`\`typescript
// Fired when record is deleted
on.user.deleted(async (user) => {
  // Clean up related data
  await db.workspaces.deleteMany({ owner: user.id })
  await db.sessions.deleteMany({ userId: user.id })

  // Send goodbye email
  await send.email(user.email, 'Account Deleted', ...)
})
\`\`\`

## Custom Events

\`\`\`typescript
// Define custom event handlers
on('payment.succeeded', async (payment) => {
  await db.order.update(payment.orderId, { status: 'paid' })
})

on('subscription.expiring', async (subscription) => {
  const user = await db.user.findOne(subscription.userId)
  await send.email(user.email, 'Renew Subscription', ...)
})

on('kpi.threshold', async (kpi) => {
  await send.webhook(kpi.alertUrl, { kpi, alert: 'threshold_exceeded' })
})

// Emit custom events
await on.emit('payment.succeeded', { orderId: '123', amount: 2000 })
await on.emit('subscription.expiring', subscription)
\`\`\`

## Event Chaining

\`\`\`typescript
export default $ => {
  const { on, ai, send, db } = $

  // Event chain: user created → workspace created → invitation sent
  on.user.created(async (user) => {
    const workspace = await db.workspace.create({
      name: \`\${user.name}'s Workspace\`,
      owner: user.id
    })

    // This triggers on.workspace.created
  })

  on.workspace.created(async (workspace) => {
    // Invite team members
    const owner = await db.user.findOne(workspace.owner)
    if (owner.teamEmails) {
      for (const email of owner.teamEmails) {
        await on.emit('invitation.send', {
          workspace: workspace.id,
          email
        })
      }
    }
  })

  on('invitation.send', async (invitation) => {
    await send.email(invitation.email, 'Workspace Invitation', ...)
  })
}
\`\`\`

## Error Handling

\`\`\`typescript
on.user.created(async (user) => {
  try {
    await send.email(user.email, 'Welcome!', ...)
  } catch (error) {
    // Log error but don't fail the event
    console.error('Failed to send welcome email:', error)

    // Emit error event for monitoring
    await on.emit('email.failed', {
      user: user.id,
      type: 'welcome',
      error: error.message
    })
  }
})
\`\`\`

## Conditional Handlers

\`\`\`typescript
on.order.updated(async (order, changes) => {
  // Only handle status changes
  if (!changes.status) return

  decide.switch(order.status, {
    pending: () => console.log('Order pending...'),
    processing: () => send.email(order.customerEmail, 'Processing Order', ...),
    shipped: () => send.email(order.customerEmail, 'Order Shipped', ...),
    delivered: () => on.emit('order.delivered', order),
  })
})
\`\`\`
`

/**
 * SEND_TYPES - Communication operations interface
 */
export const SEND_TYPES = `
# Send Operations (send)

Communication operations for email, SMS, push notifications, and webhooks.

## TypeScript Interface

\`\`\`typescript
/**
 * Send Operations
 *
 * Communication methods for sending emails, SMS, push notifications,
 * and webhooks.
 *
 * @example Direct access
 * \`\`\`typescript
 * await send.email('user@example.com', 'Welcome!', 'Welcome to our platform!')
 * await send.sms('+1234567890', 'Your verification code is 123456')
 * await send.webhook('https://api.example.com/hooks', { event: 'user.created' })
 * \`\`\`
 *
 * @example In module
 * \`\`\`typescript
 * export default $ => {
 *   const { send, on, ai } = $
 *
 *   on.user.created(async (user) => {
 *     // Send welcome email
 *     const body = await ai.generateWelcomeEmail(user)
 *     await send.email(user.email, 'Welcome!', body)
 *
 *     // Send SMS verification
 *     await send.sms(user.phone, \`Verify: \${user.verificationCode}\`)
 *   })
 * }
 * \`\`\`
 */
interface SendOperations {
  /**
   * Send email
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param body - Email body (HTML or plain text)
   * @param options - Email options
   */
  email(to: string, subject: string, body: string, options?: EmailOptions): Promise<void>

  /**
   * Send SMS
   * @param to - Recipient phone number (E.164 format)
   * @param message - SMS message text
   * @param options - SMS options
   */
  sms(to: string, message: string, options?: SMSOptions): Promise<void>

  /**
   * Send push notification
   * @param userId - User ID or device token
   * @param notification - Notification content
   * @param options - Push options
   */
  push(userId: string, notification: PushNotification, options?: PushOptions): Promise<void>

  /**
   * Send webhook
   * @param url - Webhook URL
   * @param payload - Data to send
   * @param options - Webhook options
   */
  webhook(url: string, payload: any, options?: WebhookOptions): Promise<void>
}

interface EmailOptions {
  from?: string                          // Sender email
  cc?: string[]                          // CC recipients
  bcc?: string[]                         // BCC recipients
  replyTo?: string                       // Reply-to address
  attachments?: Attachment[]             // File attachments
  html?: boolean                         // Body is HTML (auto-detected)
}

interface SMSOptions {
  from?: string                          // Sender phone number
}

interface PushNotification {
  title: string                          // Notification title
  body: string                           // Notification body
  icon?: string                          // Icon URL
  badge?: number                         // Badge count
  data?: any                             // Custom data
}

interface PushOptions {
  priority?: 'normal' | 'high'
  ttl?: number                           // Time to live (seconds)
}

interface WebhookOptions {
  headers?: Record<string, string>       // Custom headers
  retry?: boolean                        // Retry on failure
}

interface Attachment {
  filename: string
  content: Buffer | string
  contentType?: string
}
\`\`\`

## Email

### Simple Email

\`\`\`typescript
// Plain text
await send.email('user@example.com', 'Hello', 'This is a test email')

// HTML
await send.email('user@example.com', 'Welcome!', \`
  <h1>Welcome to Our Platform!</h1>
  <p>We're excited to have you.</p>
\`)
\`\`\`

### Email with Options

\`\`\`typescript
await send.email('user@example.com', 'Monthly Report', reportHtml, {
  from: 'reports@company.com',
  cc: ['manager@company.com'],
  replyTo: 'support@company.com',
  attachments: [{
    filename: 'report.pdf',
    content: pdfBuffer,
    contentType: 'application/pdf'
  }]
})
\`\`\`

### AI-Generated Emails

\`\`\`typescript
on.user.created(async (user) => {
  const welcomeEmail = await ai.generateText(\`
    Write a welcome email for \${user.name}.
    They signed up as \${user.role}.
    Include helpful getting started tips.
  \`)

  await send.email(user.email, 'Welcome!', welcomeEmail)
})
\`\`\`

## SMS

### Simple SMS

\`\`\`typescript
// Verification code
await send.sms('+1234567890', 'Your verification code is: 123456')

// Order notification
await send.sms(user.phone, \`Your order #\${order.id} has shipped!\`)
\`\`\`

### SMS with Options

\`\`\`typescript
await send.sms('+1234567890', 'Alert: High CPU usage detected', {
  from: '+10987654321'
})
\`\`\`

## Push Notifications

### Simple Push

\`\`\`typescript
await send.push('user_123', {
  title: 'New Message',
  body: 'You have a new message from John',
  icon: 'https://example.com/icon.png'
})
\`\`\`

### Push with Data

\`\`\`typescript
await send.push('user_123', {
  title: 'Order Shipped',
  body: 'Your order #12345 is on the way',
  badge: 1,
  data: {
    orderId: '12345',
    trackingUrl: 'https://example.com/track/12345'
  }
}, {
  priority: 'high',
  ttl: 86400  // 24 hours
})
\`\`\`

## Webhooks

### Simple Webhook

\`\`\`typescript
// Send event data
await send.webhook('https://api.example.com/hooks', {
  event: 'user.created',
  user: { id: '123', email: 'user@example.com' }
})
\`\`\`

### Webhook with Headers

\`\`\`typescript
await send.webhook('https://api.example.com/hooks', payload, {
  headers: {
    'X-Webhook-Secret': env.WEBHOOK_SECRET,
    'X-Event-Type': 'order.created'
  },
  retry: true
})
\`\`\`

## Integration Examples

### Order Confirmation

\`\`\`typescript
on.order.created(async (order) => {
  const customer = await db.user.findOne(order.customerId)

  // Email confirmation
  await send.email(customer.email, 'Order Confirmed', \`
    <h1>Thanks for your order!</h1>
    <p>Order #\${order.id}</p>
    <p>Total: $\${order.total}</p>
  \`)

  // SMS notification
  if (customer.phone) {
    await send.sms(customer.phone, \`Order #\${order.id} confirmed! Total: $\${order.total}\`)
  }

  // Push notification
  await send.push(customer.id, {
    title: 'Order Confirmed',
    body: \`Order #\${order.id} • $\${order.total}\`,
    data: { orderId: order.id }
  })

  // Webhook to fulfillment system
  await send.webhook('https://fulfillment.example.com/orders', {
    orderId: order.id,
    items: order.items,
    shippingAddress: order.shippingAddress
  })
})
\`\`\`

### Subscription Renewal

\`\`\`typescript
every.day(async () => {
  const expiring = await db.subscriptions.find({
    expiresAt: {
      $gte: Date.now(),
      $lte: Date.now() + 7 * 24 * 60 * 60 * 1000  // 7 days
    }
  })

  for (const sub of expiring) {
    const user = await db.user.findOne(sub.userId)
    const daysLeft = Math.ceil((sub.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))

    await send.email(user.email, 'Subscription Expiring', \`
      Your subscription expires in \${daysLeft} days.
      <a href="\${env.BASE_URL}/renew">Renew Now</a>
    \`)
  }
})
\`\`\`
`

/**
 * EVERY_TYPES - Scheduling operations interface
 */
export const EVERY_TYPES = `
# Every Operations (every)

Scheduled tasks and collection iteration.

## TypeScript Interface

\`\`\`typescript
/**
 * Every Operations
 *
 * Schedule recurring tasks (cron-like) and iterate over collections.
 * Supports both time-based scheduling and collection-based iteration.
 *
 * @example Direct access
 * \`\`\`typescript
 * every.hour(async () => {
 *   // Runs every hour
 * })
 *
 * every.day.forEvery.user(async (user) => {
 *   // Runs once per day for each user
 * })
 * \`\`\`
 *
 * @example In module
 * \`\`\`typescript
 * export default $ => {
 *   const { every, db, send } = $
 *
 *   // Time-based scheduling
 *   every.hour.reviewKPIs()
 *   every.day.backupDatabase()
 *
 *   // Collection iteration
 *   every.month.forEvery.user(async (user) => {
 *     await send.email(user.email, 'Monthly Report', ...)
 *   })
 * }
 * \`\`\`
 */
interface EveryOperations {
  /** Run every minute */
  minute(handler: () => Promise<void>): void

  /** Run every hour */
  hour(handler: () => Promise<void>): void

  /** Run every day (midnight UTC) */
  day(handler: () => Promise<void>): void

  /** Run every week (Sunday midnight UTC) */
  week(handler: () => Promise<void>): void

  /** Run every month (1st day midnight UTC) */
  month(handler: () => Promise<void>): void

  /** Run every year (Jan 1st midnight UTC) */
  year(handler: () => Promise<void>): void

  /** Iterate over collection */
  forEvery: {
    [collection: string]: (handler: (item: any) => Promise<void>) => Promise<void>
  }
}
\`\`\`

## Time-Based Scheduling

### Simple Schedules

\`\`\`typescript
// Every minute
every.minute(async () => {
  console.log('Heartbeat')
})

// Every hour
every.hour(async () => {
  await db.analytics.aggregate()
})

// Every day (midnight UTC)
every.day(async () => {
  await db.cleanup.oldRecords()
})

// Every week (Sunday midnight UTC)
every.week(async () => {
  await send.email('admin@example.com', 'Weekly Report', ...)
})

// Every month (1st day midnight UTC)
every.month(async () => {
  await db.billing.processInvoices()
})

// Every year (Jan 1st midnight UTC)
every.year(async () => {
  await db.archive.lastYear()
})
\`\`\`

### Chained Schedules

\`\`\`typescript
// Semantic scheduling with chaining
every.hour.reviewKPIs()
every.day.backupDatabase()
every.week.generateReports()
every.month.processInvoices()
\`\`\`

## Collection Iteration

### forEvery Pattern

\`\`\`typescript
// Iterate over all users
every.day.forEvery.user(async (user) => {
  // Check subscription status
  if (user.subscription.expiresAt < Date.now()) {
    await send.email(user.email, 'Subscription Expired', ...)
  }
})

// Iterate over all orders
every.hour.forEvery.order(async (order) => {
  // Check fulfillment status
  if (order.status === 'pending' && order.createdAt < Date.now() - 24 * 60 * 60 * 1000) {
    await on.emit('order.delayed', order)
  }
})

// Iterate over nested relationships
every.month.forEvery.industry.occupations.tasks(async (task) => {
  await ai.generateService(task)
})
\`\`\`

### Conditional Iteration

\`\`\`typescript
// Only process matching records
every.day.forEvery.user(async (user) => {
  // Skip inactive users
  if (!user.active) return

  // Process active users
  const report = await ai.generateDailyReport(user)
  await send.email(user.email, 'Daily Report', report)
})
\`\`\`

## Combining Schedules and Iteration

\`\`\`typescript
export default $ => {
  const { every, db, send, ai } = $

  // Monthly reports for all users
  every.month.forEvery.user(async (user) => {
    const report = await ai.generateMonthlyReport(user)
    await send.email(user.email, 'Monthly Report', report)
  })

  // Daily cleanup
  every.day(async () => {
    // Delete old sessions
    await db.sessions.deleteMany({
      expiresAt: { $lt: Date.now() }
    })

    // Archive old orders
    const oldOrders = await db.orders.find({
      createdAt: { $lt: Date.now() - 90 * 24 * 60 * 60 * 1000 }
    })

    for (const order of oldOrders) {
      await db.archive.create(order)
      await db.order.delete(order.id)
    }
  })

  // Hourly KPI review
  every.hour(async () => {
    const kpis = await db.kpis.find({ alertEnabled: true })

    for (const kpi of kpis) {
      const value = await db.analytics.calculate(kpi.metric)

      if (value < kpi.threshold) {
        await send.webhook(kpi.alertUrl, {
          kpi: kpi.name,
          value,
          threshold: kpi.threshold,
          alert: 'below_threshold'
        })
      }
    }
  })
}
\`\`\`

## Advanced Patterns

### Batch Processing

\`\`\`typescript
// Process users in batches
every.day(async () => {
  const users = await db.users.find({ active: true })
  const batchSize = 100

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    await Promise.all(
      batch.map(user => processUser(user))
    )
  }
})
\`\`\`

### Rate-Limited Iteration

\`\`\`typescript
// Process with delay between items
every.hour.forEvery.apiCall(async (apiCall) => {
  await api.post(apiCall.url, apiCall.data)
  await new Promise(resolve => setTimeout(resolve, 1000))  // 1s delay
})
\`\`\`

### Error Handling

\`\`\`typescript
every.hour(async () => {
  try {
    await performCriticalTask()
  } catch (error) {
    // Log error
    await db.errors.create({
      task: 'performCriticalTask',
      error: error.message,
      timestamp: Date.now()
    })

    // Alert admin
    await send.email('admin@example.com', 'Task Failed', error.stack)
  }
})
\`\`\`
`

/**
 * DECIDE_TYPES - Decision logic interface
 */
export const DECIDE_TYPES = `
# Decide Operations (decide)

Decision logic and conditional execution.

## TypeScript Interface

\`\`\`typescript
/**
 * Decide Operations
 *
 * Provides decision logic including if/then/else, switch/case,
 * and rule-based execution.
 *
 * @example Direct access
 * \`\`\`typescript
 * decide.if(condition,
 *   () => console.log('true'),
 *   () => console.log('false')
 * )
 *
 * decide.switch(value, {
 *   case1: () => action1(),
 *   case2: () => action2(),
 *   default: () => defaultAction()
 * })
 * \`\`\`
 *
 * @example In module
 * \`\`\`typescript
 * export default $ => {
 *   const { decide, user, db } = $
 *
 *   // Tier-based logic
 *   decide.switch(user.tier, {
 *     free: () => db.usage.limit(user.id, { requests: 100 }),
 *     pro: () => db.usage.limit(user.id, { requests: 10000 }),
 *     enterprise: () => db.usage.unlimited(user.id)
 *   })
 * }
 * \`\`\`
 */
interface DecisionOperations {
  /**
   * If/then/else conditional
   * @param condition - Boolean condition
   * @param thenFn - Execute if true
   * @param elseFn - Execute if false (optional)
   */
  if(condition: boolean, thenFn: () => any, elseFn?: () => any): any

  /**
   * Switch/case logic
   * @param value - Value to match
   * @param cases - Object mapping values to handlers
   */
  switch(value: any, cases: Record<string, () => any>): any

  /**
   * Rule-based execution
   * @param rules - Array of rule objects
   */
  rules(rules: Rule[]): any
}

interface Rule {
  when: () => boolean          // Condition function
  then: () => any              // Action if condition true
}
\`\`\`

## If/Then/Else

### Simple Conditionals

\`\`\`typescript
// If/then
decide.if(user.active, () => {
  console.log('User is active')
})

// If/then/else
decide.if(
  user.subscription.active,
  () => grantAccess(),
  () => redirectToPayment()
)

// Nested conditionals
decide.if(user.authenticated, () => {
  decide.if(user.admin, () => {
    showAdminPanel()
  }, () => {
    showUserDashboard()
  })
}, () => {
  redirectToLogin()
})
\`\`\`

### With Async Operations

\`\`\`typescript
await decide.if(
  order.status === 'pending',
  async () => {
    await db.order.update(order.id, { status: 'processing' })
    await send.email(order.customerEmail, 'Order Processing', ...)
  },
  async () => {
    console.log('Order already processed')
  }
)
\`\`\`

## Switch/Case

### Simple Switch

\`\`\`typescript
decide.switch(user.role, {
  admin: () => showAdminPanel(),
  editor: () => showEditorPanel(),
  viewer: () => showViewerPanel(),
  default: () => showPublicPage()
})
\`\`\`

### With Async Handlers

\`\`\`typescript
await decide.switch(order.status, {
  pending: async () => {
    await db.order.update(order.id, { status: 'processing' })
  },
  processing: async () => {
    await fulfillOrder(order)
    await db.order.update(order.id, { status: 'shipped' })
  },
  shipped: async () => {
    await send.email(order.customerEmail, 'Order Delivered', ...)
  },
  default: () => {
    console.log('Unknown status:', order.status)
  }
})
\`\`\`

### Tier-Based Logic

\`\`\`typescript
export default $ => {
  const { decide, user, db } = $

  // Set limits based on user tier
  decide.switch(user.tier, {
    free: () => db.usage.limit(user.id, {
      requests: 100,
      storage: '1GB',
      computeTime: 60
    }),
    pro: () => db.usage.limit(user.id, {
      requests: 10000,
      storage: '100GB',
      computeTime: 3600
    }),
    enterprise: () => db.usage.unlimited(user.id)
  })
}
\`\`\`

## Rule-Based Execution

### Simple Rules

\`\`\`typescript
decide.rules([
  {
    when: () => user.age < 18,
    then: () => requireParentalConsent()
  },
  {
    when: () => user.country === 'US',
    then: () => applyUSTaxes()
  },
  {
    when: () => user.orders.length > 10,
    then: () => applyLoyaltyDiscount()
  }
])
\`\`\`

### Complex Rules

\`\`\`typescript
await decide.rules([
  {
    when: () => order.total > 1000 && user.tier === 'free',
    then: async () => {
      await send.email('sales@company.com', 'High Value Order', ...)
      await db.user.update(user.id, { flaggedForUpgrade: true })
    }
  },
  {
    when: () => order.shippingCountry !== user.country,
    then: async () => {
      await db.order.update(order.id, { requiresCustomsInfo: true })
    }
  },
  {
    when: () => order.items.some(item => item.hazardous),
    then: async () => {
      await send.email('logistics@company.com', 'Hazardous Item', ...)
    }
  }
])
\`\`\`

## Integration Examples

### User Onboarding

\`\`\`typescript
on.user.created(async (user) => {
  // Industry-specific onboarding
  await decide.switch(user.industry, {
    'e-commerce': async () => {
      await db.workspace.create({
        name: \`\${user.name}'s Store\`,
        template: 'e-commerce',
        owner: user.id
      })
      await send.email(user.email, 'E-commerce Setup Guide', ...)
    },
    'saas': async () => {
      await db.workspace.create({
        name: \`\${user.name}'s Product\`,
        template: 'saas',
        owner: user.id
      })
      await send.email(user.email, 'SaaS Setup Guide', ...)
    },
    default: async () => {
      await db.workspace.create({
        name: \`\${user.name}'s Workspace\`,
        template: 'blank',
        owner: user.id
      })
      await send.email(user.email, 'Getting Started', ...)
    }
  })
})
\`\`\`

### Order Processing

\`\`\`typescript
on.order.created(async (order) => {
  // Apply business rules
  await decide.rules([
    // Fraud detection
    {
      when: () => order.total > 10000 || order.shippingCountry in ['...'],
      then: async () => {
        await db.order.update(order.id, { flaggedForReview: true })
        await send.email('fraud@company.com', 'Order Flagged', ...)
      }
    },
    // Loyalty discount
    {
      when: async () => {
        const customer = await db.user.findOne(order.customerId)
        return customer.orders.length >= 10
      },
      then: async () => {
        await db.order.update(order.id, {
          discount: 0.1,
          discountReason: 'loyalty'
        })
      }
    },
    // Priority shipping
    {
      when: () => order.items.some(item => item.perishable),
      then: async () => {
        await db.order.update(order.id, { priority: 'high' })
      }
    }
  ])
})
\`\`\`
`

/**
 * USER_TYPES - User context interface
 */
export const USER_TYPES = `
# User Context (user)

User authentication state and context information.

## TypeScript Interface

\`\`\`typescript
/**
 * User Context
 *
 * Provides access to authenticated user information including
 * identity, roles, permissions, and metadata.
 *
 * @example Direct access
 * \`\`\`typescript
 * console.log(user.id)           // User ID
 * console.log(user.email)        // User email
 * console.log(user.name)         // User name
 * \`\`\`
 *
 * @example In module
 * \`\`\`typescript
 * export default $ => {
 *   const { user, db, decide } = $
 *
 *   // Role-based access
 *   decide.if(user.admin, () => {
 *     // Admin-only logic
 *   })
 *
 *   // User-scoped queries
 *   const projects = await db.projects.find({ owner: user.id })
 * }
 * \`\`\`
 */
interface UserContext {
  /** User unique identifier */
  id: string

  /** User email address */
  email: string

  /** User display name */
  name: string

  /** User roles (admin, editor, viewer, etc.) */
  roles: string[]

  /** User permissions */
  permissions: string[]

  /** Custom user metadata */
  metadata: Record<string, any>

  /** Check if user has role */
  hasRole(role: string): boolean

  /** Check if user has permission */
  hasPermission(permission: string): boolean
}
\`\`\`

## Accessing User Info

### Basic Properties

\`\`\`typescript
// User identity
console.log(user.id)              // 'user_abc123'
console.log(user.email)           // 'user@example.com'
console.log(user.name)            // 'John Doe'

// User roles
console.log(user.roles)           // ['admin', 'editor']

// User permissions
console.log(user.permissions)     // ['read', 'write', 'delete']

// Custom metadata
console.log(user.metadata)        // { company: 'Acme Inc', plan: 'pro' }
\`\`\`

### Role Checking

\`\`\`typescript
// Check if user has specific role
if (user.hasRole('admin')) {
  // Admin-only logic
  await db.settings.update({ ... })
}

// Multiple role check
if (user.hasRole('admin') || user.hasRole('editor')) {
  // Editor or admin logic
  await db.content.update({ ... })
}
\`\`\`

### Permission Checking

\`\`\`typescript
// Check if user has specific permission
if (user.hasPermission('delete')) {
  await db.resource.delete(resourceId)
} else {
  throw new Error('Permission denied')
}

// Guard pattern
const requirePermission = (permission: string) => {
  if (!user.hasPermission(permission)) {
    throw new Error(\`Missing permission: \${permission}\`)
  }
}

requirePermission('write')
await db.resource.update({ ... })
\`\`\`

## User-Scoped Queries

### Filter by Owner

\`\`\`typescript
// Get user's resources
const projects = await db.projects.find({ owner: user.id })
const documents = await db.documents.find({ author: user.id })
const workspaces = await db.workspaces.find({ members: user.id })
\`\`\`

### Create with Owner

\`\`\`typescript
// Automatically set owner
const project = await db.project.create({
  name: 'New Project',
  owner: user.id,
  createdAt: Date.now()
})
\`\`\`

### Update with Authorization

\`\`\`typescript
// Only allow owner to update
on.project.update(async (project, changes) => {
  if (project.owner !== user.id && !user.hasRole('admin')) {
    throw new Error('Only owner can update project')
  }

  await db.project.update(project.id, changes)
})
\`\`\`

## Role-Based Logic

### Admin Panel

\`\`\`typescript
export default $ => {
  const { user, decide, db } = $

  // Admin-only features
  decide.if(user.hasRole('admin'), async () => {
    // Show admin dashboard
    const stats = await db.analytics.global()
    const users = await db.users.find({})
    const revenue = await db.payments.total()

    return { stats, users, revenue }
  }, () => {
    return { error: 'Admin access required' }
  })
}
\`\`\`

### Tier-Based Features

\`\`\`typescript
export default $ => {
  const { user, decide } = $

  const tier = user.metadata.plan || 'free'

  decide.switch(tier, {
    free: () => ({
      features: ['basic'],
      limits: { projects: 1, storage: '1GB' }
    }),
    pro: () => ({
      features: ['basic', 'advanced', 'ai'],
      limits: { projects: 100, storage: '100GB' }
    }),
    enterprise: () => ({
      features: ['all'],
      limits: { projects: Infinity, storage: 'unlimited' }
    })
  })
}
\`\`\`

## Custom Metadata

### Accessing Metadata

\`\`\`typescript
// Company information
const company = user.metadata.company
const department = user.metadata.department

// Subscription info
const plan = user.metadata.plan
const expiresAt = user.metadata.subscriptionExpiresAt

// Preferences
const theme = user.metadata.theme || 'light'
const language = user.metadata.language || 'en'
\`\`\`

### Updating Metadata

\`\`\`typescript
// Update user metadata
await db.user.update(user.id, {
  metadata: {
    ...user.metadata,
    theme: 'dark',
    lastLoginAt: Date.now()
  }
})
\`\`\`

## Integration Examples

### Personalized Welcome

\`\`\`typescript
on.user.created(async (newUser) => {
  const greeting = await ai.generateText(\`
    Write a personalized welcome message for \${newUser.name}.
    They signed up for \${newUser.metadata.plan} plan.
    Their role is \${newUser.roles[0]}.
  \`)

  await send.email(newUser.email, 'Welcome!', greeting)
})
\`\`\`

### Activity Logging

\`\`\`typescript
export default $ => {
  const { user, db, on } = $

  // Log all user actions
  on('*', async (event, data) => {
    await db.activityLog.create({
      userId: user.id,
      userEmail: user.email,
      event,
      data,
      timestamp: Date.now()
    })
  })
}
\`\`\`
`
