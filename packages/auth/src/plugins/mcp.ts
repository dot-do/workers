// Better Auth MCP plugin for AI tool authentication
// Custom plugin for Model Context Protocol authentication

import type { BetterAuthPlugin } from 'better-auth'

/**
 * MCP plugin options
 */
export interface McpOptions {
  /** Allowed origins for MCP connections */
  allowedOrigins?: string[]
  /** Require signed requests */
  requireSignature?: boolean
  /** Token expiration in seconds (default: 1 hour) */
  tokenExpiration?: number
}

/**
 * MCP token payload
 */
export interface McpTokenPayload {
  userId: string
  clientId: string
  scopes: string[]
  tools?: string[]
  expiresAt: Date
}

/**
 * MCP plugin for AI tool authentication
 *
 * Provides authentication support for the Model Context Protocol (MCP),
 * enabling secure AI-to-AI communication.
 *
 * @example
 * ```ts
 * import { createAuth } from '@dotdo/auth/better-auth'
 * import { mcp } from '@dotdo/auth/plugins/mcp'
 *
 * const auth = createAuth({
 *   database: db,
 *   secret: env.AUTH_SECRET,
 *   plugins: [
 *     mcp({
 *       allowedOrigins: ['https://claude.ai'],
 *       requireSignature: true
 *     })
 *   ]
 * })
 *
 * // Issue MCP token
 * const token = await auth.api.createMcpToken({
 *   userId: session.user.id,
 *   clientId: 'claude-desktop',
 *   scopes: ['read', 'write']
 * })
 * ```
 */
export function mcp(options: McpOptions = {}): BetterAuthPlugin {
  const {
    allowedOrigins = [],
    requireSignature = false,
    tokenExpiration = 60 * 60, // 1 hour
  } = options

  return {
    id: 'mcp',
    endpoints: {
      createMcpToken: {
        method: 'POST',
        path: '/mcp/token',
        handler: async (ctx) => {
          // Implementation would create and sign MCP tokens
          // This is a placeholder for the actual implementation
          return ctx.json({ error: 'Not implemented' }, 501)
        },
      },
      verifyMcpToken: {
        method: 'POST',
        path: '/mcp/verify',
        handler: async (ctx) => {
          // Implementation would verify MCP tokens
          return ctx.json({ error: 'Not implemented' }, 501)
        },
      },
    },
  }
}

export default mcp
