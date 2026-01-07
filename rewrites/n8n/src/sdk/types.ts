/**
 * n8n SDK Types
 */

export interface N8nConfig {
  id: string
}

export interface WorkflowConfig {
  id: string
  trigger: Trigger
  settings?: WorkflowSettings
}

export interface WorkflowSettings {
  retryOnFail?: boolean
  maxRetries?: number
  waitBetweenRetries?: number
}

export type TriggerType = 'webhook' | 'cron' | 'event' | 'manual' | 'interval' | 'workflow'

export interface Trigger {
  type: TriggerType
  expression?: string  // For cron
  event?: string       // For event trigger
  every?: string       // For interval
}

export interface WorkflowContext {
  trigger: TriggerData
  nodes: NodeExecutor
}

export interface TriggerData {
  data: Record<string, unknown>
  headers?: Record<string, string>
  method?: string
  timestamp: string
}

export interface NodeExecutor {
  httpRequest: (config: HttpRequestConfig) => Promise<unknown>
  code: (config: CodeConfig) => Promise<unknown>
  if: (config: IfConfig) => Promise<[unknown[], unknown[]]>
  switch: (config: SwitchConfig) => Promise<unknown[][]>
  merge: (config: MergeConfig) => Promise<unknown[]>
  wait: (config: WaitConfig) => Promise<void>
  splitInBatches: (config: SplitConfig) => Promise<unknown[][]>
  executeWorkflow: (config: ExecuteWorkflowConfig) => Promise<unknown>
  slack: SlackNodes
  airtable: AirtableNodes
  email: EmailNodes
}

export interface HttpRequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
}

export interface CodeConfig {
  language: 'javascript' | 'python'
  code: string
  items: unknown[]
}

export interface IfConfig {
  condition: string
  items: unknown[]
}

export interface SwitchConfig {
  rules: SwitchRule[]
  items: unknown[]
}

export interface SwitchRule {
  output: number
  condition: string
}

export interface MergeConfig {
  mode: 'combine' | 'append' | 'wait'
  inputs: unknown[][]
}

export interface WaitConfig {
  duration: string
}

export interface SplitConfig {
  batchSize: number
  items: unknown[]
}

export interface ExecuteWorkflowConfig {
  workflowId: string
  data: unknown
}

export interface SlackNodes {
  message: (config: SlackMessageConfig) => Promise<void>
}

export interface SlackMessageConfig {
  credential?: string
  channel: string
  text: string
  blocks?: unknown[]
}

export interface AirtableNodes {
  create: (config: AirtableCreateConfig) => Promise<unknown>
  update: (config: AirtableUpdateConfig) => Promise<unknown>
  list: (config: AirtableListConfig) => Promise<unknown[]>
}

export interface AirtableCreateConfig {
  credential?: string
  base: string
  table: string
  records: unknown[]
}

export interface AirtableUpdateConfig {
  credential?: string
  base: string
  table: string
  records: unknown[]
}

export interface AirtableListConfig {
  credential?: string
  base: string
  table: string
  filter?: string
}

export interface EmailNodes {
  send: (config: EmailSendConfig) => Promise<void>
}

export interface EmailSendConfig {
  to: string | string[]
  subject: string
  template?: string
  html?: string
  text?: string
  data?: Record<string, unknown>
}

export type WorkflowHandler = (context: WorkflowContext) => Promise<unknown>

export interface Workflow {
  id: string
  config: WorkflowConfig
  handler: WorkflowHandler
}

export interface Node {
  id: string
  type: string
  config: Record<string, unknown>
}

export interface NodeResult {
  nodeId: string
  output: unknown
  duration: number
  status: 'success' | 'error'
  error?: string
}

export interface Execution {
  id: string
  workflowId: string
  status: 'running' | 'success' | 'error' | 'waiting'
  startedAt: string
  finishedAt?: string
  duration?: number
  data: Record<string, NodeResult>
  trigger: TriggerData
}

export interface Credential {
  id: string
  name: string
  type: string
  createdAt: string
  updatedAt: string
}

export interface CredentialData extends Credential {
  data: Record<string, unknown>
}
