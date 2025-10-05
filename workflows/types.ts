/**
 * Type Definitions for Event-Driven Automation Platform
 */

import { z } from 'zod'

// ============================================================================
// Environment Types
// ============================================================================

export interface Env {
  // Analytics Engine
  EVENTS: AnalyticsEngineDataset
  METRICS: AnalyticsEngineDataset

  // D1 Database
  DB: D1Database

  // KV Namespaces
  WORKFLOW_STATE: KVNamespace
  CACHE: KVNamespace

  // R2 Buckets
  PAYLOADS: R2Bucket

  // Queues
  EVENT_QUEUE: Queue
  WORKFLOW_QUEUE: Queue

  // Workflows
  AUTOMATION_WORKFLOW: Workflow

  // Service Bindings
  AI: any // AI service

  // Workers AI
  AI_BINDING: Ai

  // Secrets
  WEBHOOK_SECRET: string
  ANALYTICS_TOKEN: string
  ENCRYPTION_KEY: string

  // Variables
  ENVIRONMENT: string
  MAX_WORKFLOW_STEPS: string
  EVENT_RETENTION_DAYS: string
}

// ============================================================================
// Event Schema
// ============================================================================

export const EventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number(),
  type: z.string(),
  source: z.string(),
  accountId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  data: z.record(z.any()),
  metadata: z
    .object({
      ip: z.string().optional(),
      userAgent: z.string().optional(),
      referrer: z.string().optional(),
      correlationId: z.string().optional(),
    })
    .optional(),
})

export type Event = z.infer<typeof EventSchema>

// ============================================================================
// Pattern Matching Schema
// ============================================================================

export const PatternSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  accountId: z.string(),

  // Pattern definition
  pattern: z.union([
    // SQL-based pattern (Analytics Engine)
    z.object({
      type: z.literal('sql'),
      query: z.string(),
      interval: z.enum(['1m', '5m', '15m', '1h', '1d']),
    }),

    // Simple event matching
    z.object({
      type: z.literal('event'),
      eventType: z.string(),
      conditions: z.record(z.any()).optional(),
    }),

    // Sequence pattern
    z.object({
      type: z.literal('sequence'),
      events: z.array(
        z.object({
          eventType: z.string(),
          conditions: z.record(z.any()).optional(),
          within: z.string().optional(), // e.g., "5m", "1h"
        })
      ),
      ordered: z.boolean().default(true),
    }),

    // Threshold pattern
    z.object({
      type: z.literal('threshold'),
      eventType: z.string(),
      metric: z.string(),
      operator: z.enum(['>', '<', '>=', '<=', '==', '!=']),
      value: z.number(),
      window: z.string(), // e.g., "5m", "1h"
    }),

    // Anomaly detection
    z.object({
      type: z.literal('anomaly'),
      eventType: z.string(),
      metric: z.string(),
      sensitivity: z.enum(['low', 'medium', 'high']),
      window: z.string(),
    }),
  ]),

  // Workflow to trigger
  workflowId: z.string().uuid(),

  // Metadata
  createdAt: z.string(),
  updatedAt: z.string(),
  triggeredCount: z.number().default(0),
  lastTriggered: z.string().optional(),
})

export type Pattern = z.infer<typeof PatternSchema>

// ============================================================================
// Workflow Schema
// ============================================================================

export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['action', 'condition', 'loop', 'parallel', 'delay', 'webhook', 'transform', 'ai']),

  // Action configuration
  action: z
    .object({
      type: z.string(), // e.g., "send_email", "http_request", "database_query"
      config: z.record(z.any()),
      retries: z
        .object({
          limit: z.number().default(3),
          delay: z.string().default('5s'),
          backoff: z.enum(['linear', 'exponential']).default('exponential'),
        })
        .optional(),
      timeout: z.string().optional(),
    })
    .optional(),

  // Condition configuration
  condition: z
    .object({
      expression: z.string(), // JavaScript expression
      onTrue: z.string().optional(), // Next step ID
      onFalse: z.string().optional(), // Next step ID
    })
    .optional(),

  // Loop configuration
  loop: z
    .object({
      items: z.string(), // Reference to data array
      steps: z.array(z.string()), // Step IDs to execute
      maxIterations: z.number().optional(),
    })
    .optional(),

  // Parallel configuration
  parallel: z
    .object({
      steps: z.array(z.string()), // Step IDs to execute in parallel
      waitForAll: z.boolean().default(true),
    })
    .optional(),

  // Delay configuration
  delay: z
    .object({
      duration: z.string(), // e.g., "5m", "1h"
    })
    .optional(),

  // Webhook configuration
  webhook: z
    .object({
      url: z.string().url(),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
      headers: z.record(z.string()).optional(),
      body: z.any().optional(),
      auth: z
        .object({
          type: z.enum(['none', 'basic', 'bearer', 'api_key']),
          config: z.record(z.string()),
        })
        .optional(),
    })
    .optional(),

  // Transform configuration
  transform: z
    .object({
      script: z.string(), // JavaScript code
      input: z.string().optional(), // Reference to input data
    })
    .optional(),

  // AI configuration
  ai: z
    .object({
      model: z.string(),
      prompt: z.string(),
      input: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),

  // Next step
  next: z.string().optional(), // Next step ID
})

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  accountId: z.string(),

  // Workflow definition
  steps: z.array(WorkflowStepSchema),
  startStep: z.string(), // Initial step ID

  // Configuration
  config: z
    .object({
      maxExecutionTime: z.string().default('1h'),
      maxSteps: z.number().default(100),
      errorHandling: z
        .object({
          onError: z.enum(['stop', 'continue', 'retry']),
          notifyOnError: z.boolean().default(true),
        })
        .optional(),
    })
    .optional(),

  // Metadata
  createdAt: z.string(),
  updatedAt: z.string(),
  executionCount: z.number().default(0),
  lastExecuted: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export type Workflow = z.infer<typeof WorkflowSchema>

// ============================================================================
// Workflow Execution Schema
// ============================================================================

export const WorkflowExecutionSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  accountId: z.string(),

  // Trigger information
  triggeredBy: z.object({
    type: z.enum(['pattern', 'webhook', 'schedule', 'manual']),
    id: z.string().optional(),
    event: EventSchema.optional(),
  }),

  // Execution state
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  currentStep: z.string().optional(),
  completedSteps: z.array(z.string()).default([]),

  // Execution data
  input: z.record(z.any()),
  output: z.record(z.any()).optional(),
  context: z.record(z.any()).default({}),

  // Error handling
  error: z
    .object({
      step: z.string(),
      message: z.string(),
      stack: z.string().optional(),
      timestamp: z.string(),
    })
    .optional(),

  // Timing
  startedAt: z.string(),
  completedAt: z.string().optional(),
  duration: z.number().optional(), // milliseconds
})

export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>

// ============================================================================
// Action Library Schema
// ============================================================================

export const ActionSchema = z.object({
  type: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['communication', 'data', 'integration', 'ai', 'utility', 'custom']),

  // Input/Output schema
  inputSchema: z.record(z.any()),
  outputSchema: z.record(z.any()).optional(),

  // Configuration
  config: z.object({
    requiresAuth: z.boolean().default(false),
    supportsRetry: z.boolean().default(true),
    estimatedDuration: z.string().optional(), // e.g., "100ms"
    costPerExecution: z.number().optional(), // in cents
  }),

  // Implementation
  handler: z.string(), // Reference to handler function
})

export type Action = z.infer<typeof ActionSchema>

// ============================================================================
// Integration Schema (for Payload CMS)
// ============================================================================

export const IntegrationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(), // e.g., "webhook", "database", "api"
  accountId: z.string(),

  // Configuration
  config: z.object({
    endpoint: z.string().optional(),
    auth: z.record(z.any()).optional(),
    headers: z.record(z.string()).optional(),
    settings: z.record(z.any()).optional(),
  }),

  // Webhook configuration (for Payload integration)
  webhook: z
    .object({
      url: z.string().url(),
      events: z.array(z.string()), // Which Payload events to listen to
      secret: z.string().optional(),
      enabled: z.boolean().default(true),
    })
    .optional(),

  // Status
  enabled: z.boolean().default(true),
  status: z.enum(['active', 'inactive', 'error']).default('active'),
  lastSync: z.string().optional(),

  // Metadata
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Integration = z.infer<typeof IntegrationSchema>

// ============================================================================
// Analytics & Monitoring Schema
// ============================================================================

export const MetricSchema = z.object({
  timestamp: z.number(),
  accountId: z.string(),
  metricType: z.enum([
    'event_ingested',
    'pattern_matched',
    'workflow_started',
    'workflow_completed',
    'workflow_failed',
    'step_executed',
    'action_executed',
    'error_occurred',
  ]),
  value: z.number(),
  metadata: z.record(z.any()).optional(),
})

export type Metric = z.infer<typeof MetricSchema>

// ============================================================================
// API Response Types
// ============================================================================

export type ApiResponse<T = any> =
  | {
      success: true
      data: T
      metadata?: {
        page?: number
        limit?: number
        total?: number
        hasMore?: boolean
      }
    }
  | {
      success: false
      error: {
        code: string
        message: string
        details?: any
      }
    }

// ============================================================================
// Utility Types
// ============================================================================

export type TimeWindow = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '7d' | '30d'

export type EventFilter = {
  eventType?: string
  source?: string
  accountId?: string
  userId?: string
  startTime?: number
  endTime?: number
  limit?: number
  offset?: number
}

export type WorkflowFilter = {
  accountId?: string
  enabled?: boolean
  tags?: string[]
  limit?: number
  offset?: number
}

export type ExecutionFilter = {
  workflowId?: string
  accountId?: string
  status?: WorkflowExecution['status']
  startTime?: string
  endTime?: string
  limit?: number
  offset?: number
}
