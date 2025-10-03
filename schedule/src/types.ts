/**
 * Schedule Service Types
 */

export type TaskStatus = 'enabled' | 'disabled'
export type ExecutionStatus = 'running' | 'success' | 'failed'

export interface ScheduledTask {
  id: string
  name: string
  schedule: string // Cron expression or named schedule
  handler: string // Function name to execute
  enabled: boolean
  lastRun?: string // ISO timestamp
  nextRun?: string // ISO timestamp
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface TaskExecution {
  id: string
  taskId: string
  taskName: string
  startedAt: string
  completedAt?: string
  status: ExecutionStatus
  error?: string
  result?: any
  durationMs?: number
}

export interface RegisterTaskOptions {
  name: string
  schedule: string
  handler: string
  enabled?: boolean
  metadata?: Record<string, any>
}

export interface TaskExecutionResult {
  success: boolean
  result?: any
  error?: string
  durationMs: number
}

export interface TaskRegistry {
  [key: string]: (env: Env) => Promise<any>
}
