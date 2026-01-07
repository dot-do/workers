/**
 * human.do - Type definitions for Human-in-the-Loop operations
 */

/**
 * Task status representing the lifecycle of a human task
 */
export type TaskStatus =
  | 'pending'     // Awaiting assignment
  | 'assigned'    // Assigned to a human
  | 'in_progress' // Human is actively working
  | 'completed'   // Successfully completed
  | 'rejected'    // Rejected by human
  | 'expired'     // Deadline passed
  | 'escalated'   // Escalated to higher authority

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical'

/**
 * Types of human tasks
 */
export type TaskType =
  | 'approval'    // Yes/no decision
  | 'review'      // Review and provide feedback
  | 'decision'    // Choose from options
  | 'input'       // Provide data/information
  | 'escalation'  // Handle escalated issue
  | 'validation'  // Validate AI output

/**
 * Decision types for task responses
 */
export type DecisionType = 'approve' | 'reject' | 'defer' | 'escalate' | 'modify'

/**
 * Human-in-the-loop task
 */
export interface HumanTask {
  /** Unique task identifier */
  _id: string
  /** Type of human intervention required */
  type: TaskType
  /** Short task title */
  title: string
  /** Detailed description */
  description?: string
  /** Context data for the human */
  context?: Record<string, unknown>
  /** Who needs to handle this (role or user) */
  requiredBy?: string
  /** Currently assigned human */
  assignee?: string
  /** Current task status */
  status: TaskStatus
  /** Task priority */
  priority: TaskPriority
  /** Task creation time */
  createdAt: string
  /** Last update time */
  updatedAt: string
  /** Deadline for completion */
  deadline?: string
  /** When the task expires (auto-calculated from timeoutMs) */
  expiresAt?: string
  /** Timeout in milliseconds */
  timeoutMs?: number
  /** Human's response */
  response?: HumanResponse
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Options for decision tasks */
  options?: TaskOption[]
  /** Escalation chain */
  escalationChain?: EscalationLevel[]
  /** Current escalation level */
  escalationLevel?: number
  /** SLA configuration */
  sla?: SLAConfig
  /** Tags for filtering */
  tags?: string[]
  /** Source system/workflow that created this task */
  source?: TaskSource
  /** Callback URL for webhooks */
  callbackUrl?: string
}

/**
 * Response from a human
 */
export interface HumanResponse {
  /** The decision made */
  decision: DecisionType
  /** Free-form value/data provided */
  value?: unknown
  /** Comment explaining the decision */
  comment?: string
  /** Who responded */
  respondedBy: string
  /** When they responded */
  respondedAt: string
  /** Time taken to respond (ms) */
  responseTimeMs?: number
  /** Confidence level (0-1) */
  confidence?: number
  /** Modifications made (for 'modify' decisions) */
  modifications?: Record<string, unknown>
}

/**
 * Option for decision tasks
 */
export interface TaskOption {
  /** Option identifier */
  id: string
  /** Display label */
  label: string
  /** Detailed description */
  description?: string
  /** Visual indicator */
  icon?: string
  /** Whether this is recommended */
  recommended?: boolean
  /** Metadata for this option */
  metadata?: Record<string, unknown>
}

/**
 * Escalation level configuration
 */
export interface EscalationLevel {
  /** Level number (0 = first, higher = more senior) */
  level: number
  /** Role or users at this level */
  assignees: string[]
  /** Time before escalating to next level (ms) */
  timeoutMs: number
  /** Notification method */
  notifyVia?: ('email' | 'slack' | 'webhook' | 'sms')[]
}

/**
 * SLA configuration
 */
export interface SLAConfig {
  /** Target response time (ms) */
  targetResponseMs: number
  /** Maximum response time before breach (ms) */
  maxResponseMs: number
  /** Warning threshold (ms) */
  warningThresholdMs?: number
  /** Action on breach */
  onBreach?: 'escalate' | 'auto-approve' | 'auto-reject' | 'notify'
  /** Notification channels */
  notifyOnBreach?: string[]
}

/**
 * Source of the task
 */
export interface TaskSource {
  /** Workflow/system name */
  system: string
  /** Workflow instance ID */
  workflowId?: string
  /** Step ID within workflow */
  stepId?: string
  /** AI model that triggered this */
  model?: string
  /** Request ID for tracing */
  requestId?: string
}

/**
 * Input for creating a task
 */
export interface CreateTaskInput {
  type: TaskType
  title: string
  description?: string
  context?: Record<string, unknown>
  requiredBy?: string
  assignee?: string
  priority?: TaskPriority
  timeoutMs?: number
  deadline?: string
  metadata?: Record<string, unknown>
  options?: TaskOption[]
  escalationChain?: EscalationLevel[]
  sla?: SLAConfig
  tags?: string[]
  source?: TaskSource
  callbackUrl?: string
}

/**
 * Options for listing tasks
 */
export interface ListTasksOptions {
  status?: TaskStatus
  assignee?: string
  type?: TaskType
  priority?: TaskPriority
  tags?: string[]
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'deadline' | 'priority'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Feedback for AI improvement
 */
export interface HumanFeedback {
  /** Feedback ID */
  _id: string
  /** Related task ID */
  taskId: string
  /** Feedback type */
  type: 'correction' | 'suggestion' | 'rating' | 'annotation'
  /** Feedback content */
  content: unknown
  /** Who provided feedback */
  providedBy: string
  /** When feedback was provided */
  providedAt: string
  /** Target model for learning */
  targetModel?: string
  /** Whether feedback has been processed */
  processed?: boolean
}

/**
 * Queue statistics
 */
export interface QueueStats {
  /** Total tasks */
  total: number
  /** Tasks by status */
  byStatus: Record<TaskStatus, number>
  /** Tasks by priority */
  byPriority: Record<TaskPriority, number>
  /** Tasks by type */
  byType: Record<TaskType, number>
  /** Average response time (ms) */
  avgResponseTimeMs: number
  /** SLA compliance rate (0-1) */
  slaComplianceRate: number
  /** Tasks breaching SLA */
  slaBreaches: number
  /** Tasks expiring soon */
  expiringSoon: number
}

/**
 * Human.do environment bindings
 */
export interface HumanEnv {
  /** Reference to self for Workers RPC */
  HUMAN_DO?: DurableObjectNamespace
  /** AI binding for assistance */
  AI?: unknown
  /** Notification service */
  NOTIFY?: {
    send: (message: NotificationMessage) => Promise<void>
  }
  /** LLM binding for AI feedback */
  LLM?: unknown
  /** Webhook sender */
  WEBHOOKS?: {
    send: (url: string, payload: unknown) => Promise<void>
  }
}

/**
 * Notification message
 */
export interface NotificationMessage {
  channel: 'email' | 'slack' | 'webhook' | 'sms'
  recipient: string
  subject: string
  body: string
  metadata?: Record<string, unknown>
}
