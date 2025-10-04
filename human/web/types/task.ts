import { z } from 'zod'

export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'timeout', 'rejected'])
export type TaskStatus = z.infer<typeof taskStatusSchema>

export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export type TaskPriority = z.infer<typeof taskPrioritySchema>

export const jsonSchemaPropertySchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string().optional(),
  enum: z.array(z.string()).optional(),
  items: z.any().optional(),
  properties: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
  default: z.any().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  pattern: z.string().optional(),
  format: z.string().optional(),
})

export const jsonSchemaSchema = z.object({
  type: z.literal('object'),
  properties: z.record(jsonSchemaPropertySchema),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
})

export type JSONSchema = z.infer<typeof jsonSchemaSchema>

export const taskSchema = z.object({
  id: z.string(),
  functionName: z.string(),
  prompt: z.string(),
  schema: jsonSchemaSchema,
  status: taskStatusSchema,
  priority: taskPrioritySchema.default('medium'),
  assignee: z.string().optional(),
  response: z.any().optional(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  timeoutAt: z.string().datetime(),
  timeoutSeconds: z.number(),
  metadata: z.record(z.any()).optional(),
  context: z.record(z.any()).optional(),
})

export type Task = z.infer<typeof taskSchema>

export const presenceSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  taskId: z.string(),
  joinedAt: z.string().datetime(),
  lastSeen: z.string().datetime(),
  isTyping: z.boolean().default(false),
})

export type Presence = z.infer<typeof presenceSchema>

export const wsMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('task.created'),
    task: taskSchema,
  }),
  z.object({
    type: z.literal('task.updated'),
    task: taskSchema,
  }),
  z.object({
    type: z.literal('task.completed'),
    taskId: z.string(),
    response: z.any(),
  }),
  z.object({
    type: z.literal('task.timeout'),
    taskId: z.string(),
  }),
  z.object({
    type: z.literal('presence.joined'),
    presence: presenceSchema,
  }),
  z.object({
    type: z.literal('presence.left'),
    userId: z.string(),
    taskId: z.string(),
  }),
  z.object({
    type: z.literal('presence.typing'),
    userId: z.string(),
    taskId: z.string(),
    isTyping: z.boolean(),
  }),
])

export type WSMessage = z.infer<typeof wsMessageSchema>

export interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assignee?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface TaskMetrics {
  total: number
  pending: number
  inProgress: number
  completed: number
  timeout: number
  rejected: number
  avgResponseTime: number
  avgTimeToComplete: number
}
