import { z } from 'zod'

/**
 * Worker Environment Bindings
 */
export interface Env {
  // Service bindings
  OAUTH_SERVICE: any
  AUTH_SERVICE: any
  DB_SERVICE: any

  // KV namespace for sessions
  SESSIONS: KVNamespace
}

/**
 * RPC Request Schema
 */
export const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.record(z.any()).optional().default({}),
  id: z.string().optional(),
})

export type RpcRequest = z.infer<typeof rpcRequestSchema>

/**
 * RPC Response Schema
 */
export const rpcResponseSchema = z.object({
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional(),
  }).optional(),
  id: z.string().optional(),
})

export type RpcResponse = z.infer<typeof rpcResponseSchema>

/**
 * OAuth Token Info
 */
export interface TokenInfo {
  userId: string
  email: string
  name?: string
  organizationId?: string
  permissions?: string[]
  expiresAt: number
}

/**
 * Session Data
 */
export interface SessionData {
  userId: string
  token: string
  createdAt: number
  expiresAt: number
}

/**
 * RPC Method Handler
 */
export type RpcMethodHandler = (params: any, context: RpcContext) => Promise<any>

/**
 * RPC Context
 */
export interface RpcContext {
  env: Env
  auth?: TokenInfo
  sessionId?: string
  request: Request
}

/**
 * RPC Method Registry
 */
export interface RpcMethod {
  name: string
  description: string
  requiresAuth: boolean
  handler: RpcMethodHandler
  schema?: z.ZodSchema
}
