/**
 * functions.do - Serverless Functions SDK
 *
 * @example
 * ```typescript
 * import { functions } from 'functions.do'
 *
 * // Define a function
 * await functions.define('processImage', {
 *   code: `export default async (input) => { return resizeImage(input) }`,
 *   runtime: 'v8'
 * })
 *
 * // Invoke a function
 * const result = await functions.invoke('processImage', { url: 'https://...' })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface FunctionDefinition {
  name: string
  code: string
  runtime: 'v8' | 'node' | 'python' | 'wasm'
  timeout?: number
  memory?: number
  env?: Record<string, string>
}

export interface FunctionInvocation {
  id: string
  functionName: string
  input: unknown
  output?: unknown
  error?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  duration?: number
  createdAt: Date
  completedAt?: Date
}

export interface FunctionInfo {
  name: string
  runtime: string
  invocations: number
  lastInvoked?: Date
  createdAt: Date
}

// Client interface
export interface FunctionsClient {
  define(name: string, definition: Omit<FunctionDefinition, 'name'>): Promise<FunctionDefinition>
  update(name: string, updates: Partial<FunctionDefinition>): Promise<FunctionDefinition>
  delete(name: string): Promise<void>
  get(name: string): Promise<FunctionDefinition>
  list(): Promise<FunctionInfo[]>

  invoke<T = unknown>(name: string, input?: unknown): Promise<T>
  invokeAsync(name: string, input?: unknown): Promise<{ invocationId: string }>
  status(invocationId: string): Promise<FunctionInvocation>

  logs(name: string, options?: { limit?: number; from?: Date }): Promise<Array<{ timestamp: Date; message: string; level: string }>>
}

export function Functions(options?: ClientOptions): FunctionsClient {
  return createClient<FunctionsClient>('https://functions.do', options)
}

export const functions: FunctionsClient = Functions({
  apiKey: typeof process !== 'undefined' ? process.env?.FUNCTIONS_API_KEY : undefined,
})

export type { ClientOptions } from 'rpc.do'
