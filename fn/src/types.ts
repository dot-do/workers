/**
 * Fn Worker Types
 *
 * Intelligent function classification and routing
 */

// ========== Environment ==========

export interface FnServiceEnv {
  // Service bindings
  AI_SERVICE: any // AI generation service
  AGENT_SERVICE: any // Agent Durable Objects
  DB: any // Database RPC service
  QUEUE_SERVICE: any // Queue service (RPC)

  // Queue producer binding
  FUNCTION_QUEUE: any // Function execution queue

  // Environment variables
  OPENAI_API_KEY: string
  ANTHROPIC_API_KEY: string
  DEFAULT_MODEL: string // Default: gpt-4o-mini
}

// ========== Function Types ==========

export type FunctionType = 'code' | 'object' | 'agentic' | 'human'

export interface FunctionClassification {
  type: FunctionType
  confidence: number
  reasoning: string
}

// ========== Request/Response Types ==========

export interface ExecuteFunctionRequest {
  // Function description with optional context
  description: string

  // Optional context (prepended to description)
  context?: string

  // Function arguments
  args?: Record<string, any>

  // Options
  options?: {
    model?: string // AI model to use for classification
    temperature?: number
    maxTokens?: number
    timeout?: number // Execution timeout in ms
    mode?: 'sync' | 'async' // Sync or async execution
  }
}

export interface ExecuteFunctionResponse {
  success: boolean
  type: FunctionType
  result?: any
  error?: string
  classification?: FunctionClassification
  executionTime?: number
  jobId?: string // For async execution
}

// ========== Classification Types ==========

export interface CodeFunction {
  type: 'code'
  language: string
  code: string
  dependencies?: string[]
}

export interface ObjectFunction {
  type: 'object'
  schema: Record<string, any>
  validation?: string[]
}

export interface AgenticFunction {
  type: 'agentic'
  prompt: string
  tools: string[]
  constraints?: string[]
}

export interface HumanFunction {
  type: 'human'
  taskDescription: string
  assignee?: string
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
}

export type ClassifiedFunction = CodeFunction | ObjectFunction | AgenticFunction | HumanFunction

// ========== Routing Types ==========

export interface RouteTarget {
  service: 'ai' | 'agent' | 'db' | 'queue'
  method: string
  payload: any
}

// ========== API Response Types ==========

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

// ========== Classification Prompt ==========

export const CLASSIFICATION_PROMPT = `You are a function classifier that determines the best execution strategy for a given function description.

Analyze the function and classify it as one of the following types:

1. **code**: A function that can be implemented as pure TypeScript code
   - Examples: data transformations, calculations, string manipulation, sorting
   - Characteristics: No external state, deterministic, can run in V8 isolate

2. **object**: A function that generates a structured data object
   - Examples: configuration generation, form data, API responses
   - Characteristics: Returns structured data following a schema

3. **agentic**: A function that requires AI agent reasoning and tool use
   - Examples: multi-step processes, decision-making, complex analysis
   - Characteristics: Needs reasoning, tool selection, and orchestration

4. **human**: A function that requires human intervention
   - Examples: approvals, manual data entry, creative work
   - Characteristics: Cannot be automated, needs human judgment

Respond with a JSON object:
{
  "type": "code" | "object" | "agentic" | "human",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of classification"
}

Function to classify:
{{FUNCTION_DESCRIPTION}}`
