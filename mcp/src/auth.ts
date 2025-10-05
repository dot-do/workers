import type { Context } from 'hono'
import type { Env, User } from './types'

/**
 * Authentication for MCP requests
 * Supports API key (Bearer token) and anonymous access
 */
export async function authenticateRequest(c: Context<{ Bindings: Env }>): Promise<{
  authenticated: boolean
  user: User | null
}> {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, user: null }
  }

  const token = authHeader.substring(7)

  // Validate token via Auth service
  try {
    const auth = c.env.AUTH
    if (!auth) {
      console.warn('[MCP Auth] AUTH service binding not available')
      return { authenticated: false, user: null }
    }

    const user = await auth.validateToken(token)

    if (user) {
      return { authenticated: true, user }
    }
  } catch (error) {
    console.error('[MCP Auth] Token validation error:', error)
  }

  return { authenticated: false, user: null }
}
