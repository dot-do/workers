# Dynamic Worker Runtime APIs - Complete Reference

> **Comprehensive JSDoc documentation and examples for `ai`, `api`, `db`, `on`, and `send` runtime APIs**

This document provides complete reference documentation for the dynamic worker runtime APIs, with real-world examples using **do.industries** as the business use case.

## Table of Contents

- [Overview](#overview)
- [Runtime APIs](#runtime-apis)
  - [`ai` - AI Models](#ai---ai-models)
  - [`api` - HTTP Requests](#api---http-requests)
  - [`db` - Database Queries](#db---database-queries)
  - [`on` - Event Handlers](#on---event-handlers)
  - [`send` - WebSocket/Streaming](#send---websocketstreaming)
- [Execution Patterns](#execution-patterns)
  - [Execute Statement Pattern](#execute-statement-pattern)
  - [Define Module Pattern](#define-module-pattern)
- [do.industries Business Example](#doindustries-business-example)
- [Related Documentation](#related-documentation)

---

## Overview

Dynamic workers provide five core runtime APIs that enable building complete business applications with AI, data, events, and real-time communication:

```typescript
/**
 * Runtime APIs available in dynamic workers
 */
interface RuntimeAPIs {
  /** AI model calls for text generation, embeddings, and analysis */
  ai: AIService

  /** HTTP requests to platform APIs and external services */
  api: APIService

  /** Database queries for persistent storage */
  db: DBService

  /** Event handlers for pub/sub messaging */
  on: EventService

  /** WebSocket streaming for real-time communication */
  send: StreamService
}
```

**Key Concepts:**
- **Modular Design**: Each API is independent but composable
- **Type Safety**: Full TypeScript support with strong typing
- **Async/Await**: All operations are promise-based
- **Error Handling**: Consistent error patterns across APIs

---

## Runtime APIs

### `ai` - AI Models

Interface for AI model calls including text generation, object generation, embeddings, and analysis.

#### Type Definitions

```typescript
/**
 * AI Service Interface
 * Provides access to AI models for generation and analysis
 */
interface AIService {
  /**
   * Generate text using AI models
   *
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - Input prompt for the model
   * @param {string} [params.model] - Model name (default: claude-sonnet-4)
   * @param {number} [params.temperature] - Randomness 0-1 (default: 0.7)
   * @param {number} [params.maxTokens] - Maximum output tokens (default: 1024)
   * @returns {Promise<{text: string; usage?: any}>} Generated text and usage stats
   *
   * @example
   * ```typescript
   * const { text } = await ai({
   *   prompt: "Explain quantum computing",
   *   temperature: 0.3,
   *   maxTokens: 500
   * })
   * ```
   */
  generateText(params: {
    prompt: string
    model?: string
    temperature?: number
    maxTokens?: number
  }): Promise<{ text: string; usage?: any }>

  /**
   * Generate structured objects using AI with schema validation
   *
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - Instruction prompt
   * @param {any} params.schema - Zod schema or JSON schema for validation
   * @param {string} [params.model] - Model name
   * @returns {Promise<{object: any}>} Generated object matching schema
   *
   * @example
   * ```typescript
   * const { object } = await ai.generateObject({
   *   prompt: "Create a product catalog entry",
   *   schema: z.object({
   *     name: z.string(),
   *     price: z.number(),
   *     category: z.enum(['software', 'hardware', 'service'])
   *   })
   * })
   * ```
   */
  generateObject(params: {
    prompt: string
    schema: any
    model?: string
  }): Promise<{ object: any }>

  /**
   * Generate lists of items using AI
   *
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - Instruction for list generation
   * @param {any} [params.itemSchema] - Schema for each list item
   * @param {string} [params.model] - Model name
   * @returns {Promise<{items: any[]}>} Array of generated items
   *
   * @example
   * ```typescript
   * const { items } = await ai.generateList({
   *   prompt: "Generate 5 industry categories",
   *   itemSchema: z.object({
   *     name: z.string(),
   *     naicsCode: z.string(),
   *     description: z.string()
   *   })
   * })
   * ```
   */
  generateList(params: {
    prompt: string
    itemSchema?: any
    model?: string
  }): Promise<{ items: any[] }>

  /**
   * Perform AI-powered research with web search and synthesis
   *
   * @param {Object} params - Research parameters
   * @param {string} params.query - Research query or question
   * @param {string[]} [params.sources] - Specific sources to use
   * @param {'quick' | 'deep'} [params.depth] - Research depth (default: 'quick')
   * @returns {Promise<{findings: string; sources: any[]}>} Research findings and sources
   *
   * @example
   * ```typescript
   * const { findings, sources } = await ai.research({
   *   query: "Latest trends in AI-powered business automation",
   *   depth: 'deep',
   *   sources: ['arxiv.org', 'techcrunch.com']
   * })
   * ```
   */
  research(params: {
    query: string
    sources?: string[]
    depth?: 'quick' | 'deep'
  }): Promise<{ findings: string; sources: any[] }>

  /**
   * Analyze content with AI
   *
   * @param {Object} params - Analysis parameters
   * @param {string} params.content - Content to analyze
   * @param {string} params.analysis - Type of analysis to perform
   * @returns {Promise<{result: any}>} Analysis results
   *
   * @example
   * ```typescript
   * const { result } = await ai.analyze({
   *   content: documentText,
   *   analysis: "Extract key business metrics and KPIs"
   * })
   * ```
   */
  analyze(params: {
    content: string
    analysis: string
  }): Promise<{ result: any }>

  /**
   * Generate vector embedding for text
   *
   * @param {Object} params - Embedding parameters
   * @param {string} params.text - Text to embed
   * @param {string} [params.model] - Embedding model (default: bge-base-en-v1.5)
   * @returns {Promise<{embedding: number[]}>} Vector embedding (768 dimensions)
   *
   * @example
   * ```typescript
   * const { embedding } = await ai.generateEmbedding({
   *   text: "Software development services",
   *   model: 'bge-base-en-v1.5'
   * })
   * // embedding is [0.123, -0.456, ..., 0.789] with 768 dimensions
   * ```
   */
  generateEmbedding(params: {
    text: string
    model?: string
  }): Promise<{ embedding: number[] }>

  /**
   * Generate embeddings for multiple texts in batch
   *
   * @param {Object} params - Batch embedding parameters
   * @param {string[]} params.texts - Array of texts to embed
   * @param {string} [params.model] - Embedding model
   * @returns {Promise<{embeddings: number[][]}>} Array of vector embeddings
   *
   * @example
   * ```typescript
   * const { embeddings } = await ai.generateEmbeddings({
   *   texts: [
   *     "Software development",
   *     "Data analysis",
   *     "Project management"
   *   ]
   * })
   * // embeddings.length === 3, each embedding is 768 dimensions
   * ```
   */
  generateEmbeddings(params: {
    texts: string[]
    model?: string
  }): Promise<{ embeddings: number[][] }>
}
```

#### AI Examples

```typescript
// Example 1: Generate business content
const summary = await ai.generateText({
  prompt: `Write a 2-sentence description of do.industries,
           a platform for building AI-native businesses`,
  temperature: 0.7,
  maxTokens: 100
})

// Example 2: Generate structured industry data
const industry = await ai.generateObject({
  prompt: "Create an industry profile for AI automation services",
  schema: z.object({
    name: z.string(),
    naicsCode: z.string(),
    description: z.string(),
    keyOccupations: z.array(z.string()),
    averageRevenue: z.number()
  })
})

// Example 3: Research industry trends
const { findings, sources } = await ai.research({
  query: "Impact of AI on professional services industry",
  depth: 'deep'
})

// Example 4: Generate embeddings for semantic search
const { embedding } = await ai.generateEmbedding({
  text: "AI-powered business process automation"
})

// Store embedding for vector search
await db.set({
  collection: 'services',
  id: 'ai-automation',
  data: { name: 'AI Automation', embedding }
})
```

---

### `api` - HTTP Requests

Interface for making HTTP requests to platform APIs and external services (Zapier, etc.).

#### Type Definitions

```typescript
/**
 * API Service Interface
 * Provides access to HTTP requests for Zapier actions and platform APIs
 */
interface APIService {
  /**
   * Search using Zapier service
   *
   * @param {Object} params - Search parameters
   * @param {string} params.service - Zapier service name (e.g., 'gmail', 'slack')
   * @param {string} params.action - Search action name
   * @param {any} params.query - Query parameters specific to the service
   * @returns {Promise<{results: any[]}>} Search results
   *
   * @example
   * ```typescript
   * const { results } = await api.search({
   *   service: 'gmail',
   *   action: 'find_email',
   *   query: { subject: 'Invoice' }
   * })
   * ```
   */
  search(params: {
    service: string
    action: string
    query: any
  }): Promise<{ results: any[] }>

  /**
   * Execute Zapier action
   *
   * @param {Object} params - Execution parameters
   * @param {string} params.service - Zapier service name
   * @param {string} params.action - Action to execute
   * @param {any} params.input - Action input data
   * @returns {Promise<{result: any}>} Execution result
   *
   * @example
   * ```typescript
   * const { result } = await api.execute({
   *   service: 'slack',
   *   action: 'send_message',
   *   input: {
   *     channel: '#general',
   *     text: 'New service published!'
   *   }
   * })
   * ```
   */
  execute(params: {
    service: string
    action: string
    input: any
  }): Promise<{ result: any }>

  /**
   * List available services
   *
   * @returns {Promise<{services: Array<{id: string; name: string; actions: string[]}>}>}
   *
   * @example
   * ```typescript
   * const { services } = await api.listServices()
   * // services = [
   * //   { id: 'gmail', name: 'Gmail', actions: ['send', 'find_email'] },
   * //   { id: 'slack', name: 'Slack', actions: ['send_message', 'create_channel'] }
   * // ]
   * ```
   */
  listServices(): Promise<{
    services: Array<{
      id: string
      name: string
      actions: string[]
    }>
  }>

  /**
   * Get action schema
   *
   * @param {Object} params - Schema parameters
   * @param {string} params.service - Service name
   * @param {string} params.action - Action name
   * @returns {Promise<{schema: any}>} JSON schema for the action
   *
   * @example
   * ```typescript
   * const { schema } = await api.getSchema({
   *   service: 'gmail',
   *   action: 'send_email'
   * })
   * // schema = { type: 'object', properties: { to: ..., subject: ..., body: ... } }
   * ```
   */
  getSchema(params: {
    service: string
    action: string
  }): Promise<{ schema: any }>
}
```

#### API Examples

```typescript
// Example 1: Search for emails about new services
const { results: emails } = await api.search({
  service: 'gmail',
  action: 'find_email',
  query: {
    subject: 'New Service Request',
    from: 'customers@example.com'
  }
})

// Example 2: Send Slack notification
await api.execute({
  service: 'slack',
  action: 'send_message',
  input: {
    channel: '#services',
    text: `New service published: ${serviceName}`
  }
})

// Example 3: List available services
const { services } = await api.listServices()
console.log(`Available integrations: ${services.map(s => s.name).join(', ')}`)

// Example 4: Get action schema for validation
const { schema } = await api.getSchema({
  service: 'stripe',
  action: 'create_payment'
})
```

---

### `db` - Database Queries

Interface for database operations including CRUD, search, and collection management.

#### Type Definitions

```typescript
/**
 * Database Service Interface
 * Provides access to persistent storage with collections and search
 */
interface DBService {
  /**
   * Get item from collection by ID
   *
   * @param {Object} params - Get parameters
   * @param {string} params.collection - Collection name
   * @param {string} params.id - Item ID
   * @returns {Promise<{item: any | null}>} Item data or null if not found
   *
   * @example
   * ```typescript
   * const { item } = await db.get({
   *   collection: 'services',
   *   id: 'ai-automation-service'
   * })
   *
   * if (item) {
   *   console.log(item.name, item.price)
   * }
   * ```
   */
  get(params: {
    collection: string
    id: string
  }): Promise<{ item: any | null }>

  /**
   * Set/create item in collection
   *
   * @param {Object} params - Set parameters
   * @param {string} params.collection - Collection name
   * @param {string} params.id - Item ID (will be created/updated)
   * @param {any} params.data - Item data to store
   * @returns {Promise<{success: boolean}>} Operation success status
   *
   * @example
   * ```typescript
   * await db.set({
   *   collection: 'services',
   *   id: 'web-development',
   *   data: {
   *     name: 'Web Development Service',
   *     category: 'Technology',
   *     price: 5000,
   *     provider: 'do.industries'
   *   }
   * })
   * ```
   */
  set(params: {
    collection: string
    id: string
    data: any
  }): Promise<{ success: boolean }>

  /**
   * Delete item from collection
   *
   * @param {Object} params - Delete parameters
   * @param {string} params.collection - Collection name
   * @param {string} params.id - Item ID to delete
   * @returns {Promise<{success: boolean}>} Operation success status
   *
   * @example
   * ```typescript
   * await db.delete({
   *   collection: 'services',
   *   id: 'deprecated-service'
   * })
   * ```
   */
  delete(params: {
    collection: string
    id: string
  }): Promise<{ success: boolean }>

  /**
   * List items in collection with filtering and pagination
   *
   * @param {Object} params - List parameters
   * @param {string} params.collection - Collection name
   * @param {number} [params.limit] - Maximum items to return (default: 10)
   * @param {number} [params.offset] - Number of items to skip (default: 0)
   * @param {any} [params.filter] - Filter criteria object
   * @returns {Promise<{items: any[]; total: number}>} Items and total count
   *
   * @example
   * ```typescript
   * const { items, total } = await db.list({
   *   collection: 'services',
   *   limit: 20,
   *   offset: 0,
   *   filter: { category: 'AI' }
   * })
   *
   * console.log(`Found ${total} AI services`)
   * items.forEach(service => console.log(service.name))
   * ```
   */
  list(params: {
    collection: string
    limit?: number
    offset?: number
    filter?: any
  }): Promise<{ items: any[]; total: number }>

  /**
   * Search items in collection (full-text and vector search)
   *
   * @param {Object} params - Search parameters
   * @param {string} params.collection - Collection name
   * @param {string} params.query - Search query text
   * @param {number} [params.limit] - Maximum results (default: 10)
   * @returns {Promise<{items: any[]; scores?: number[]}>} Matching items with optional relevance scores
   *
   * @example
   * ```typescript
   * const { items, scores } = await db.search({
   *   collection: 'services',
   *   query: 'AI automation business process',
   *   limit: 5
   * })
   *
   * items.forEach((item, i) => {
   *   console.log(`${item.name} (relevance: ${scores[i]})`)
   * })
   * ```
   */
  search(params: {
    collection: string
    query: string
    limit?: number
  }): Promise<{ items: any[]; scores?: number[] }>

  /**
   * List all collections
   *
   * @returns {Promise<{collections: string[]}>} Array of collection names
   *
   * @example
   * ```typescript
   * const { collections } = await db.listCollections()
   * // collections = ['services', 'industries', 'occupations', 'workflows']
   * ```
   */
  listCollections(): Promise<{ collections: string[] }>
}
```

#### Database Examples

```typescript
// Example 1: Store a new service
await db.set({
  collection: 'services',
  id: 'ai-business-automation',
  data: {
    name: 'AI Business Automation',
    description: 'End-to-end business process automation using AI',
    category: 'AI Services',
    price: 10000,
    industry: 'Technology',
    provider: 'do.industries',
    features: [
      'Workflow automation',
      'Document processing',
      'Email automation',
      'Data extraction'
    ],
    createdAt: new Date().toISOString()
  }
})

// Example 2: Get service details
const { item: service } = await db.get({
  collection: 'services',
  id: 'ai-business-automation'
})

// Example 3: List all AI services
const { items: aiServices, total } = await db.list({
  collection: 'services',
  filter: { category: 'AI Services' },
  limit: 20
})

console.log(`Found ${total} AI services:`)
aiServices.forEach(s => console.log(`- ${s.name}: $${s.price}`))

// Example 4: Search for services
const { items: results } = await db.search({
  collection: 'services',
  query: 'workflow automation document processing',
  limit: 10
})

// Example 5: List all collections
const { collections } = await db.listCollections()
console.log('Available collections:', collections)
```

---

### `on` - Event Handlers

Interface for pub/sub event handling and subscriptions.

#### Type Definitions

```typescript
/**
 * Event Service Interface
 * Provides event-driven pub/sub messaging
 */
interface EventService {
  /**
   * Subscribe to event
   *
   * @param {Object} params - Subscription parameters
   * @param {string} params.event - Event name to subscribe to
   * @param {string} params.handler - Handler function name or code
   * @returns {Promise<{subscriptionId: string}>} Subscription ID for unsubscribing
   *
   * @example
   * ```typescript
   * const { subscriptionId } = await on({
   *   event: 'service.created',
   *   handler: 'handleServiceCreated'
   * })
   *
   * // Handler function
   * async function handleServiceCreated(data) {
   *   console.log('New service:', data.serviceName)
   *   await api.execute({
   *     service: 'slack',
   *     action: 'send_message',
   *     input: {
   *       channel: '#services',
   *       text: `New service created: ${data.serviceName}`
   *     }
   *   })
   * }
   * ```
   */
  subscribe(params: {
    event: string
    handler: string
  }): Promise<{ subscriptionId: string }>

  /**
   * Unsubscribe from event
   *
   * @param {Object} params - Unsubscribe parameters
   * @param {string} params.subscriptionId - Subscription ID from subscribe()
   * @returns {Promise<{success: boolean}>} Operation success status
   *
   * @example
   * ```typescript
   * await on.unsubscribe({ subscriptionId })
   * ```
   */
  unsubscribe(params: {
    subscriptionId: string
  }): Promise<{ success: boolean }>

  /**
   * List active subscriptions
   *
   * @returns {Promise<{subscriptions: Array<{id: string; event: string; handler: string}>}>}
   *
   * @example
   * ```typescript
   * const { subscriptions } = await on.listSubscriptions()
   * subscriptions.forEach(sub => {
   *   console.log(`${sub.event} → ${sub.handler}`)
   * })
   * ```
   */
  listSubscriptions(): Promise<{
    subscriptions: Array<{
      id: string
      event: string
      handler: string
    }>
  }>
}
```

#### Event Handler Examples

```typescript
// Example 1: Subscribe to service creation events
const { subscriptionId } = await on.subscribe({
  event: 'service.created',
  handler: async (data) => {
    // Send welcome email to service provider
    await api.execute({
      service: 'sendgrid',
      action: 'send_email',
      input: {
        to: data.providerEmail,
        subject: 'Welcome to do.industries Services Marketplace',
        body: `Your service "${data.serviceName}" has been published!`
      }
    })

    // Update analytics
    await db.set({
      collection: 'analytics',
      id: `service-created-${Date.now()}`,
      data: {
        event: 'service.created',
        serviceId: data.serviceId,
        timestamp: new Date().toISOString()
      }
    })
  }
})

// Example 2: Subscribe to purchase events
await on.subscribe({
  event: 'service.purchased',
  handler: async (data) => {
    // Notify provider
    await send({
      channel: `provider:${data.providerId}`,
      data: {
        type: 'purchase',
        service: data.serviceName,
        customer: data.customerName,
        amount: data.amount
      }
    })

    // Process payment
    await api.execute({
      service: 'stripe',
      action: 'create_payment',
      input: {
        amount: data.amount,
        customer: data.customerId
      }
    })
  }
})

// Example 3: List all subscriptions
const { subscriptions } = await on.listSubscriptions()
console.log('Active event subscriptions:')
subscriptions.forEach(sub => {
  console.log(`- ${sub.event}`)
})
```

---

### `send` - WebSocket/Streaming

Interface for WebSocket streaming and real-time communication.

#### Type Definitions

```typescript
/**
 * Stream Service Interface
 * Provides WebSocket streaming for real-time communication
 */
interface StreamService {
  /**
   * Send message to channel
   *
   * @param {Object} params - Send parameters
   * @param {string} params.channel - Channel name
   * @param {any} params.data - Data to send
   * @returns {Promise<{messageId: string}>} Message ID
   *
   * @example
   * ```typescript
   * await send({
   *   channel: 'service-updates',
   *   data: {
   *     type: 'status',
   *     service: 'ai-automation',
   *     status: 'processing',
   *     progress: 45
   *   }
   * })
   * ```
   */
  send(params: {
    channel: string
    data: any
  }): Promise<{ messageId: string }>

  /**
   * Broadcast to all connected clients
   *
   * @param {Object} params - Broadcast parameters
   * @param {any} params.data - Data to broadcast
   * @returns {Promise<{recipients: number}>} Number of recipients
   *
   * @example
   * ```typescript
   * const { recipients } = await send.broadcast({
   *   data: {
   *     type: 'announcement',
   *     message: 'New feature: AI-powered service recommendations!'
   *   }
   * })
   * console.log(`Broadcasted to ${recipients} clients`)
   * ```
   */
  broadcast(params: {
    data: any
  }): Promise<{ recipients: number }>

  /**
   * Stream data in chunks
   *
   * @param {Object} params - Stream parameters
   * @param {string} params.channel - Channel name
   * @param {AsyncIterator<any>} params.chunks - Async iterator of chunks
   * @returns {Promise<{success: boolean}>} Operation success status
   *
   * @example
   * ```typescript
   * async function* generateChunks() {
   *   for (let i = 0; i < 100; i++) {
   *     yield { progress: i, data: await processStep(i) }
   *     await new Promise(r => setTimeout(r, 100))
   *   }
   * }
   *
   * await send.stream({
   *   channel: 'job:123',
   *   chunks: generateChunks()
   * })
   * ```
   */
  stream(params: {
    channel: string
    chunks: AsyncIterator<any>
  }): Promise<{ success: boolean }>
}
```

#### Streaming Examples

```typescript
// Example 1: Send real-time service status updates
await send({
  channel: `service:${serviceId}`,
  data: {
    type: 'status',
    status: 'processing',
    stage: 'data-collection',
    progress: 25,
    message: 'Collecting business data...'
  }
})

// Example 2: Broadcast system announcement
await send.broadcast({
  data: {
    type: 'announcement',
    title: 'New Features Released',
    message: 'AI-powered service recommendations and real-time collaboration',
    timestamp: new Date().toISOString()
  }
})

// Example 3: Stream AI generation progress
async function* streamGeneration() {
  for (let step = 0; step < 5; step++) {
    const { text } = await ai.generateText({
      prompt: `Step ${step + 1}: Generate section ${step + 1} of business plan`
    })

    yield {
      step: step + 1,
      total: 5,
      content: text,
      timestamp: new Date().toISOString()
    }
  }
}

await send.stream({
  channel: `generation:${jobId}`,
  chunks: streamGeneration()
})

// Example 4: Real-time dashboard updates
setInterval(async () => {
  const metrics = await db.get({
    collection: 'metrics',
    id: 'current'
  })

  await send({
    channel: 'dashboard',
    data: {
      activeServices: metrics.activeServices,
      totalRevenue: metrics.totalRevenue,
      newCustomers: metrics.newCustomers,
      timestamp: new Date().toISOString()
    }
  })
}, 5000) // Update every 5 seconds
```

---

## Execution Patterns

Dynamic workers support two primary execution patterns:

### Execute Statement Pattern

Execute code directly without defining a module. Best for quick operations and simple workflows.

```typescript
/**
 * Execute Statement - Direct code execution
 * Use this for:
 * - Quick operations
 * - One-off tasks
 * - Simple data transformations
 */

// Example 1: Generate and store business content
const { text } = await ai.generateText({
  prompt: "Write a description of do.industries service marketplace"
})

await db.set({
  collection: 'content',
  id: 'marketplace-description',
  data: { content: text, createdAt: new Date().toISOString() }
})

return { success: true, contentLength: text.length }
```

```typescript
// Example 2: Process service purchase
const { item: service } = await db.get({
  collection: 'services',
  id: serviceId
})

// Process payment
const { result: payment } = await api.execute({
  service: 'stripe',
  action: 'create_payment',
  input: {
    amount: service.price,
    customer: customerId
  }
})

// Send confirmation
await send({
  channel: `customer:${customerId}`,
  data: {
    type: 'purchase-confirmed',
    service: service.name,
    amount: service.price,
    paymentId: payment.id
  }
})

return { success: true, paymentId: payment.id }
```

### Define Module Pattern

Define a complete module with exports. Best for reusable workers and complex applications.

```typescript
/**
 * Define Module - Create reusable worker modules
 * Use this for:
 * - Reusable services
 * - Complex applications
 * - Multi-endpoint workers
 */

// Export default worker with fetch handler
export default {
  /**
   * Main fetch handler
   * Handles HTTP requests to the worker
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // Route: GET /services - List all services
    if (url.pathname === '/services' && request.method === 'GET') {
      const { items } = await env.DB_SERVICE.list({
        collection: 'services',
        limit: 100
      })

      return Response.json({ services: items })
    }

    // Route: POST /services - Create new service
    if (url.pathname === '/services' && request.method === 'POST') {
      const service = await request.json()

      // Generate AI description
      const { text: description } = await env.AI_SERVICE.generateText({
        prompt: `Write a compelling 2-sentence description for: ${service.name}`
      })

      // Store service
      await env.DB_SERVICE.set({
        collection: 'services',
        id: service.id,
        data: { ...service, description }
      })

      // Broadcast event
      await env.QUEUE_SERVICE.send({
        event: 'service.created',
        data: { serviceId: service.id, serviceName: service.name }
      })

      return Response.json({ success: true, service })
    }

    // Route: GET /services/:id - Get service details
    if (url.pathname.startsWith('/services/')) {
      const id = url.pathname.split('/')[2]
      const { item } = await env.DB_SERVICE.get({
        collection: 'services',
        id
      })

      if (!item) {
        return Response.json({ error: 'Service not found' }, { status: 404 })
      }

      return Response.json({ service: item })
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  },

  /**
   * Queue handler for async processing
   */
  async queue(batch, env, ctx) {
    for (const message of batch.messages) {
      const { event, data } = message.body

      if (event === 'service.created') {
        // Send notification
        await env.API_SERVICE.execute({
          service: 'slack',
          action: 'send_message',
          input: {
            channel: '#services',
            text: `New service created: ${data.serviceName}`
          }
        })
      }

      message.ack()
    }
  }
}
```

---

## do.industries Business Example

Complete example showing how do.industries uses these APIs to power the services marketplace.

### Service Lifecycle Automation

```typescript
/**
 * Complete service lifecycle automation for do.industries
 * Demonstrates all runtime APIs working together
 */

// 1. Service Creation - Generate service listing with AI
async function createService(serviceName: string, category: string) {
  // Generate comprehensive service description
  const { object: serviceData } = await ai.generateObject({
    prompt: `Create a detailed service listing for "${serviceName}" in the ${category} category`,
    schema: z.object({
      name: z.string(),
      tagline: z.string(),
      description: z.string(),
      features: z.array(z.string()),
      pricing: z.object({
        base: z.number(),
        currency: z.string()
      }),
      deliverables: z.array(z.string()),
      timeline: z.string()
    })
  })

  // Generate embedding for semantic search
  const { embedding } = await ai.generateEmbedding({
    text: `${serviceData.name} ${serviceData.description}`
  })

  // Store service in database
  const serviceId = serviceName.toLowerCase().replace(/\s+/g, '-')
  await db.set({
    collection: 'services',
    id: serviceId,
    data: {
      ...serviceData,
      embedding,
      status: 'active',
      createdAt: new Date().toISOString()
    }
  })

  // Publish event
  await on.subscribe({
    event: 'service.created',
    handler: 'notifyServiceCreated'
  })

  // Broadcast to dashboard
  await send({
    channel: 'dashboard',
    data: {
      type: 'service-created',
      service: serviceData.name,
      category
    }
  })

  return { serviceId, ...serviceData }
}

// 2. Service Discovery - Smart search with AI
async function discoverServices(query: string) {
  // Generate search embedding
  const { embedding: queryEmbedding } = await ai.generateEmbedding({
    text: query
  })

  // Vector search for relevant services
  const { items: semanticResults } = await db.search({
    collection: 'services',
    query,
    limit: 10
  })

  // AI-powered re-ranking
  const { object: rankedResults } = await ai.generateObject({
    prompt: `Re-rank these services based on relevance to query: "${query}"`,
    schema: z.object({
      rankings: z.array(z.object({
        serviceId: z.string(),
        relevanceScore: z.number(),
        reason: z.string()
      }))
    })
  })

  return rankedResults.rankings
}

// 3. Service Purchase - Complete transaction flow
async function purchaseService(serviceId: string, customerId: string) {
  // Get service details
  const { item: service } = await db.get({
    collection: 'services',
    id: serviceId
  })

  // Process payment via Stripe
  const { result: payment } = await api.execute({
    service: 'stripe',
    action: 'create_payment',
    input: {
      amount: service.pricing.base * 100, // Convert to cents
      currency: service.pricing.currency,
      customer: customerId,
      description: `Purchase: ${service.name}`
    }
  })

  // Create order record
  const orderId = crypto.randomUUID()
  await db.set({
    collection: 'orders',
    id: orderId,
    data: {
      serviceId,
      customerId,
      amount: service.pricing.base,
      status: 'processing',
      paymentId: payment.id,
      createdAt: new Date().toISOString()
    }
  })

  // Send real-time updates
  await send({
    channel: `customer:${customerId}`,
    data: {
      type: 'purchase-confirmed',
      orderId,
      service: service.name,
      status: 'processing'
    }
  })

  // Notify provider via email
  await api.execute({
    service: 'sendgrid',
    action: 'send_email',
    input: {
      to: service.providerEmail,
      subject: `New Order: ${service.name}`,
      body: `You have a new order for ${service.name}. Order ID: ${orderId}`
    }
  })

  return { orderId, payment }
}

// 4. Service Delivery - Track progress with AI
async function deliverService(orderId: string) {
  const { item: order } = await db.get({
    collection: 'orders',
    id: orderId
  })

  const { item: service } = await db.get({
    collection: 'services',
    id: order.serviceId
  })

  // Stream delivery progress
  async function* streamDelivery() {
    const stages = [
      'Requirements gathering',
      'Initial analysis',
      'Implementation',
      'Quality assurance',
      'Delivery'
    ]

    for (let i = 0; i < stages.length; i++) {
      // AI generates stage update
      const { text: update } = await ai.generateText({
        prompt: `Generate a brief status update for ${stages[i]} stage of ${service.name}`
      })

      yield {
        stage: stages[i],
        progress: ((i + 1) / stages.length) * 100,
        update,
        timestamp: new Date().toISOString()
      }

      // Simulate work
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  // Stream to customer
  await send.stream({
    channel: `order:${orderId}`,
    chunks: streamDelivery()
  })

  // Mark as complete
  await db.set({
    collection: 'orders',
    id: orderId,
    data: {
      ...order,
      status: 'completed',
      completedAt: new Date().toISOString()
    }
  })
}

// 5. Service Analytics - AI-powered insights
async function generateServiceInsights() {
  // Get all orders
  const { items: orders } = await db.list({
    collection: 'orders',
    limit: 1000
  })

  // AI analyzes trends
  const { object: insights } = await ai.generateObject({
    prompt: `Analyze these service orders and provide business insights`,
    schema: z.object({
      topServices: z.array(z.object({
        name: z.string(),
        revenue: z.number(),
        orderCount: z.number()
      })),
      growthTrend: z.enum(['up', 'down', 'stable']),
      recommendations: z.array(z.string()),
      metrics: z.object({
        totalRevenue: z.number(),
        averageOrderValue: z.number(),
        conversionRate: z.number()
      })
    })
  })

  // Store insights
  await db.set({
    collection: 'analytics',
    id: `insights-${new Date().toISOString()}`,
    data: insights
  })

  // Broadcast to dashboard
  await send.broadcast({
    data: {
      type: 'analytics-update',
      insights
    }
  })

  return insights
}
```

---

## Related Documentation

### POCs & Implementation Examples

- **[Dynamic Worker MCP POC](../../../poc/2025-10-03-dynamic-worker-mcp/README.md)** - Complete MCP server with dynamic worker loader and runtime APIs
- **[MDXE Worker Loader](../../../mdx/packages/mdxe/WORKER_LOADER.md)** - MDX development environment with dynamic worker execution
- **[CapnWeb RPC Implementation](../../../api.services/notes/2025-10-01-capnweb-rpc-implementation.md)** - RPC protocol for bidirectional communication

### do.industries Documentation

- **[do.industries README](../../../do.industries/README.md)** - Business-as-Code vision and concepts
- **[Strategy & Moat](../../../do.industries/do.industries/Strategy & Moat.md)** - Competitive positioning and defensibility
- **[Business-as-Code](../../../do.industries/Business-as-Code.md)** - Core philosophy and principles

### Platform Documentation

- **[Root README](../../../README.md)** - Platform OKRs and architecture overview
- **[Workers CLAUDE.md](../CLAUDE.md)** - Workers repository development guidelines
- **[API.Services ARCHITECTURE.md](../../../api.services/ARCHITECTURE.md)** - System architecture documentation

### Code Examples

```typescript
// See complete examples in:
poc/2025-10-03-dynamic-worker-mcp/src/codemode.ts        // Code Mode TypeScript API
poc/2025-10-03-dynamic-worker-mcp/src/mcp.ts             // MCP Tools implementation
mdx/packages/mdxe/examples/worker-loader-basic.ts        // Basic worker loader
mdx/packages/mdxe/examples/worker-loader-advanced.ts     // Advanced patterns
```

---

**Last Updated:** 2025-10-03
**Version:** 1.0.0
**Status:** 🟢 Complete Reference Documentation
