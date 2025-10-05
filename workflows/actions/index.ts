/**
 * Actions Library
 *
 * Pre-built actions for common automation tasks:
 * - Communication (email, SMS, notifications)
 * - Data operations (database, API calls)
 * - Integrations (third-party services)
 * - AI operations (text generation, analysis)
 * - Utilities (transformations, validations)
 */

import type { Env } from '../types'

// ============================================================================
// Action Registry
// ============================================================================

export const ACTIONS = {
  // Communication
  send_email: sendEmail,
  send_sms: sendSMS,
  send_slack_message: sendSlackMessage,
  send_webhook: sendWebhook,

  // Data Operations
  database_query: databaseQuery,
  database_insert: databaseInsert,
  database_update: databaseUpdate,
  http_request: httpRequest,
  store_in_r2: storeInR2,
  store_in_kv: storeInKV,

  // Integrations
  create_crm_record: createCRMRecord,
  update_crm_record: updateCRMRecord,
  create_ticket: createTicket,
  schedule_meeting: scheduleMeeting,

  // AI Operations
  generate_text: generateText,
  analyze_sentiment: analyzeSentiment,
  extract_entities: extractEntities,
  classify_text: classifyText,

  // Utilities
  transform_data: transformData,
  validate_data: validateData,
  delay: delay,
  log: log,
}

// ============================================================================
// Action Executor
// ============================================================================

export async function executeAction(type: string, config: Record<string, any>, context: Record<string, any>, env: Env): Promise<any> {
  const action = ACTIONS[type as keyof typeof ACTIONS]
  if (!action) {
    throw new Error(`Unknown action type: ${type}`)
  }

  // Resolve config references
  const resolvedConfig = resolveConfigReferences(config, context)

  // Execute action
  return await action(resolvedConfig, env)
}

// ============================================================================
// Communication Actions
// ============================================================================

async function sendEmail(config: { to: string; subject: string; body: string; from?: string }, env: Env): Promise<any> {
  // Using Cloudflare Email Routing or external service
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY || 'your-key'}`,
    },
    body: JSON.stringify({
      from: config.from || 'noreply@example.com',
      to: config.to,
      subject: config.subject,
      html: config.body,
    }),
  })

  return await response.json()
}

async function sendSMS(config: { to: string; message: string }, env: Env): Promise<any> {
  // Using Twilio or similar
  const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`YOUR_ACCOUNT_SID:${env.TWILIO_AUTH_TOKEN || 'your-token'}`)}`,
    },
    body: new URLSearchParams({
      To: config.to,
      From: '+1234567890',
      Body: config.message,
    }),
  })

  return await response.json()
}

async function sendSlackMessage(config: { channel: string; text: string; webhook_url?: string }, env: Env): Promise<any> {
  const webhookUrl = config.webhook_url || env.SLACK_WEBHOOK_URL || ''

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: config.channel,
      text: config.text,
    }),
  })

  return { ok: response.ok }
}

async function sendWebhook(config: { url: string; method?: string; headers?: Record<string, string>; body?: any }, env: Env): Promise<any> {
  const response = await fetch(config.url, {
    method: config.method || 'POST',
    headers: config.headers || { 'Content-Type': 'application/json' },
    body: config.body ? JSON.stringify(config.body) : undefined,
  })

  return await response.json()
}

// ============================================================================
// Data Operations
// ============================================================================

async function databaseQuery(config: { query: string; params?: any[] }, env: Env): Promise<any> {
  const stmt = env.DB.prepare(config.query)
  if (config.params) {
    stmt.bind(...config.params)
  }
  const { results } = await stmt.all()
  return results
}

async function databaseInsert(config: { table: string; data: Record<string, any> }, env: Env): Promise<any> {
  const columns = Object.keys(config.data).join(', ')
  const placeholders = Object.keys(config.data)
    .map(() => '?')
    .join(', ')
  const values = Object.values(config.data)

  const query = `INSERT INTO ${config.table} (${columns}) VALUES (${placeholders})`
  await env.DB.prepare(query).bind(...values).run()

  return { success: true }
}

async function databaseUpdate(config: { table: string; data: Record<string, any>; where: string; params?: any[] }, env: Env): Promise<any> {
  const setClause = Object.keys(config.data)
    .map((key) => `${key} = ?`)
    .join(', ')
  const values = [...Object.values(config.data), ...(config.params || [])]

  const query = `UPDATE ${config.table} SET ${setClause} WHERE ${config.where}`
  await env.DB.prepare(query).bind(...values).run()

  return { success: true }
}

async function httpRequest(config: { url: string; method?: string; headers?: Record<string, string>; body?: any }, env: Env): Promise<any> {
  const response = await fetch(config.url, {
    method: config.method || 'GET',
    headers: config.headers,
    body: config.body ? JSON.stringify(config.body) : undefined,
  })

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return await response.json()
  } else {
    return await response.text()
  }
}

async function storeInR2(config: { key: string; value: any; contentType?: string }, env: Env): Promise<any> {
  const data = typeof config.value === 'string' ? config.value : JSON.stringify(config.value)

  await env.PAYLOADS.put(config.key, data, {
    httpMetadata: {
      contentType: config.contentType || 'application/json',
    },
  })

  return { key: config.key, stored: true }
}

async function storeInKV(config: { key: string; value: any; expirationTtl?: number }, env: Env): Promise<any> {
  const data = typeof config.value === 'string' ? config.value : JSON.stringify(config.value)

  await env.CACHE.put(config.key, data, {
    expirationTtl: config.expirationTtl,
  })

  return { key: config.key, stored: true }
}

// ============================================================================
// Integration Actions
// ============================================================================

async function createCRMRecord(config: { type: string; data: Record<string, any>; crmUrl?: string; apiKey?: string }, env: Env): Promise<any> {
  // Example: HubSpot integration
  const crmUrl = config.crmUrl || 'https://api.hubapi.com/crm/v3/objects'
  const apiKey = config.apiKey || env.HUBSPOT_API_KEY || ''

  const response = await fetch(`${crmUrl}/${config.type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: config.data,
    }),
  })

  return await response.json()
}

async function updateCRMRecord(config: { type: string; id: string; data: Record<string, any>; crmUrl?: string; apiKey?: string }, env: Env): Promise<any> {
  const crmUrl = config.crmUrl || 'https://api.hubapi.com/crm/v3/objects'
  const apiKey = config.apiKey || env.HUBSPOT_API_KEY || ''

  const response = await fetch(`${crmUrl}/${config.type}/${config.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: config.data,
    }),
  })

  return await response.json()
}

async function createTicket(config: { title: string; description: string; priority?: string; assignee?: string }, env: Env): Promise<any> {
  // Example: Linear integration
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.LINEAR_API_KEY || '',
    },
    body: JSON.stringify({
      query: `
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              title
            }
          }
        }
      `,
      variables: {
        input: {
          title: config.title,
          description: config.description,
          priority: config.priority || 3,
          assigneeId: config.assignee,
        },
      },
    }),
  })

  return await response.json()
}

async function scheduleMeeting(config: { attendees: string[]; title: string; startTime: string; duration: number }, env: Env): Promise<any> {
  // Example: Google Calendar integration
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GOOGLE_CALENDAR_TOKEN || ''}`,
    },
    body: JSON.stringify({
      summary: config.title,
      start: {
        dateTime: config.startTime,
      },
      end: {
        dateTime: new Date(new Date(config.startTime).getTime() + config.duration * 60000).toISOString(),
      },
      attendees: config.attendees.map((email) => ({ email })),
    }),
  })

  return await response.json()
}

// ============================================================================
// AI Actions
// ============================================================================

async function generateText(config: { prompt: string; model?: string; temperature?: number; maxTokens?: number }, env: Env): Promise<any> {
  const messages = [{ role: 'user', content: config.prompt }]

  const response = await env.AI_BINDING.run(config.model || '@cf/meta/llama-3.1-8b-instruct', {
    messages,
    temperature: config.temperature || 0.7,
    max_tokens: config.maxTokens || 256,
  })

  return response
}

async function analyzeSentiment(config: { text: string }, env: Env): Promise<any> {
  const messages = [
    {
      role: 'system',
      content: 'Analyze the sentiment of the following text. Respond with JSON: {"sentiment": "positive|negative|neutral", "score": 0-1, "confidence": 0-1}',
    },
    { role: 'user', content: config.text },
  ]

  const response = await env.AI_BINDING.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    temperature: 0.3,
  })

  return JSON.parse(response.response)
}

async function extractEntities(config: { text: string; entityTypes?: string[] }, env: Env): Promise<any> {
  const entityTypes = config.entityTypes || ['person', 'organization', 'location', 'date']

  const messages = [
    {
      role: 'system',
      content: `Extract entities from the following text. Entity types: ${entityTypes.join(', ')}. Respond with JSON array: [{"type": "...", "value": "...", "confidence": 0-1}]`,
    },
    { role: 'user', content: config.text },
  ]

  const response = await env.AI_BINDING.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    temperature: 0.3,
  })

  return JSON.parse(response.response)
}

async function classifyText(config: { text: string; categories: string[] }, env: Env): Promise<any> {
  const messages = [
    {
      role: 'system',
      content: `Classify the following text into one of these categories: ${config.categories.join(', ')}. Respond with JSON: {"category": "...", "confidence": 0-1}`,
    },
    { role: 'user', content: config.text },
  ]

  const response = await env.AI_BINDING.run('@cf/meta/llama-3.1-8b-instruct', {
    messages,
    temperature: 0.3,
  })

  return JSON.parse(response.response)
}

// ============================================================================
// Utility Actions
// ============================================================================

async function transformData(config: { data: any; transformation: string }, env: Env): Promise<any> {
  // Execute JavaScript transformation
  const fn = new Function('data', config.transformation)
  return fn(config.data)
}

async function validateData(config: { data: any; schema: Record<string, any> }, env: Env): Promise<any> {
  // Simple validation (would use Zod in production)
  const errors: string[] = []

  for (const [key, rules] of Object.entries(config.schema)) {
    const value = config.data[key]

    if (rules.required && !value) {
      errors.push(`${key} is required`)
    }

    if (rules.type && typeof value !== rules.type) {
      errors.push(`${key} must be of type ${rules.type}`)
    }

    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${key} must be at least ${rules.min}`)
    }

    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${key} must be at most ${rules.max}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

async function delay(config: { duration: string }, env: Env): Promise<any> {
  // This is handled by Workflows step.sleep()
  return { delayed: config.duration }
}

async function log(config: { message: string; level?: string; data?: any }, env: Env): Promise<any> {
  console.log(`[${config.level || 'info'}] ${config.message}`, config.data || '')
  return { logged: true }
}

// ============================================================================
// Helper Functions
// ============================================================================

function resolveConfigReferences(config: Record<string, any>, context: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = {}

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      // Resolve reference
      const path = value.slice(2, -2).split('.')
      let resolvedValue = context
      for (const part of path) {
        resolvedValue = resolvedValue?.[part]
      }
      resolved[key] = resolvedValue
    } else if (typeof value === 'object' && value !== null) {
      resolved[key] = resolveConfigReferences(value, context)
    } else {
      resolved[key] = value
    }
  }

  return resolved
}

// ============================================================================
// Action Metadata (for UI/documentation)
// ============================================================================

export const ACTION_METADATA = [
  {
    type: 'send_email',
    name: 'Send Email',
    description: 'Send an email using Resend or similar service',
    category: 'communication',
    inputSchema: {
      to: { type: 'string', required: true, description: 'Recipient email address' },
      subject: { type: 'string', required: true, description: 'Email subject' },
      body: { type: 'string', required: true, description: 'Email body (HTML)' },
      from: { type: 'string', required: false, description: 'Sender email address' },
    },
    outputSchema: {
      id: { type: 'string', description: 'Email ID' },
    },
    config: {
      requiresAuth: true,
      supportsRetry: true,
      estimatedDuration: '500ms',
      costPerExecution: 0.01, // $0.01 per email
    },
  },
  {
    type: 'database_query',
    name: 'Database Query',
    description: 'Execute a SQL query against D1 database',
    category: 'data',
    inputSchema: {
      query: { type: 'string', required: true, description: 'SQL query' },
      params: { type: 'array', required: false, description: 'Query parameters' },
    },
    outputSchema: {
      results: { type: 'array', description: 'Query results' },
    },
    config: {
      requiresAuth: false,
      supportsRetry: true,
      estimatedDuration: '50ms',
      costPerExecution: 0, // Free with D1
    },
  },
  {
    type: 'generate_text',
    name: 'Generate Text (AI)',
    description: 'Generate text using Workers AI',
    category: 'ai',
    inputSchema: {
      prompt: { type: 'string', required: true, description: 'Generation prompt' },
      model: { type: 'string', required: false, description: 'AI model to use' },
      temperature: { type: 'number', required: false, description: 'Temperature (0-1)' },
      maxTokens: { type: 'number', required: false, description: 'Maximum tokens' },
    },
    outputSchema: {
      response: { type: 'string', description: 'Generated text' },
    },
    config: {
      requiresAuth: false,
      supportsRetry: true,
      estimatedDuration: '2s',
      costPerExecution: 0.0001, // $0.0001 per inference
    },
  },
  {
    type: 'http_request',
    name: 'HTTP Request',
    description: 'Make an HTTP request to any API',
    category: 'integration',
    inputSchema: {
      url: { type: 'string', required: true, description: 'Request URL' },
      method: { type: 'string', required: false, description: 'HTTP method (default: GET)' },
      headers: { type: 'object', required: false, description: 'Request headers' },
      body: { type: 'any', required: false, description: 'Request body' },
    },
    outputSchema: {
      response: { type: 'any', description: 'Response data' },
    },
    config: {
      requiresAuth: false,
      supportsRetry: true,
      estimatedDuration: '1s',
      costPerExecution: 0,
    },
  },
]
