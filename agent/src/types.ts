/**
 * Agent Worker Types
 *
 * Simplified types for code generation agent in microservices architecture
 */

import type { DurableObjectNamespace } from 'cloudflare:workers'

// ========== Environment ==========

export interface AgentServiceEnv {
  // Durable Object bindings
  CODE_GENERATOR: DurableObjectNamespace

  // Service bindings
  DB: any // DB_SERVICE RPC
  AI_SERVICE: any // AI_SERVICE RPC
  QUEUE: any // Queue service

  // Environment variables
  OPENAI_API_KEY: string
  ANTHROPIC_API_KEY: string
  CLOUDFLARE_ACCOUNT_ID: string
  CUSTOM_DOMAIN: string

  // R2 buckets
  SANDBOX_BUCKET: R2Bucket
  ASSETS_BUCKET: R2Bucket
}

// ========== Core State ==========

export enum CurrentDevState {
  IDLE,
  INITIALIZING,
  PHASE_GENERATING,
  PHASE_IMPLEMENTING,
  REVIEWING,
  FILE_REGENERATING,
  FINALIZING,
  DEPLOYING,
  COMPLETE,
  ERROR
}

export interface FileState {
  path: string
  content: string
  language: string
  lasthash: string
  lastmodified: number
  unmerged: string[]
  lastDiff: string
}

export interface PhaseState {
  id: string
  name: string
  description: string
  files: string[]
  completed: boolean
  deploymentNeeded: boolean
}

export interface Blueprint {
  projectName: string
  description: string
  framework: string
  phases: PhaseState[]
  dependencies: string[]
  environment: Record<string, string>
}

export interface CodeGenState {
  sessionId: string
  query: string
  hostname: string
  blueprint?: Blueprint
  generatedFilesMap: Record<string, FileState>
  generatedPhases: PhaseState[]
  phasesCounter: number
  currentPhase?: PhaseState
  currentDevState: CurrentDevState
  reviewCycles?: number
  mvpGenerated: boolean
  shouldBeGenerating: boolean
  sandboxInstanceId?: string
  previewURL?: string
  agentMode: 'deterministic' | 'smart'
  error?: string
}

// ========== API Types ==========

export interface CreateAgentRequest {
  query: string
  language?: string
  frameworks?: string[]
  template?: string
  inferenceContext?: InferenceContext
}

export interface CreateAgentResponse {
  success: boolean
  agentId: string
  sessionId: string
  wsUrl?: string
  error?: string
}

export interface GetAgentStatusResponse {
  success: boolean
  state: Partial<CodeGenState>
  previewURL?: string
  error?: string
}

export interface GenerateCodeRequest {
  reviewCycles?: number
  autoFix?: boolean
}

export interface GenerateCodeResponse {
  success: boolean
  message: string
  error?: string
}

// ========== WebSocket Types ==========

export interface WebSocketMessage {
  type: WebSocketMessageType
  data: any
}

export enum WebSocketMessageType {
  INIT = 'init',
  STATE_UPDATE = 'state_update',
  FILE_GENERATED = 'file_generated',
  PHASE_COMPLETE = 'phase_complete',
  PREVIEW_URL = 'preview_url',
  ERROR = 'error',
  COMPLETE = 'complete'
}

// ========== Inference Context ==========

export interface InferenceContext {
  model?: string
  provider?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

// ========== MCP Types ==========

export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  handler: (input: any, env: AgentServiceEnv) => Promise<any>
}

// ========== RPC Methods ==========

export interface AgentRpcMethods {
  // Create new agent session
  createAgent(request: CreateAgentRequest): Promise<CreateAgentResponse>

  // Get agent status
  getStatus(sessionId: string): Promise<GetAgentStatusResponse>

  // Start code generation
  generateCode(sessionId: string, options?: GenerateCodeRequest): Promise<GenerateCodeResponse>

  // Send user message
  sendMessage(sessionId: string, message: string): Promise<{ success: boolean; response?: string; error?: string }>

  // Get generated files
  getFiles(sessionId: string): Promise<{ success: boolean; files: Record<string, FileState>; error?: string }>

  // Get preview URL
  getPreviewURL(sessionId: string): Promise<{ success: boolean; previewURL?: string; error?: string }>

  // Cancel generation
  cancelGeneration(sessionId: string): Promise<{ success: boolean; error?: string }>
}

// ========== Utility Types ==========

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function success<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message }
}

export function error(message: string, details?: any): ApiResponse {
  return { success: false, error: message }
}
