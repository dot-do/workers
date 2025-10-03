import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'

/**
 * Auth Tools
 * API key management and user authentication
 */

export function getTools(): MCPTool[] {
  return [
    {
      name: 'auth_create_key',
      description: 'Generate a new API key',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Key name for identification'
          },
          scopes: {
            type: 'array',
            description: 'Permission scopes (e.g., read, write, admin)',
            items: { type: 'string' }
          },
          expiresIn: {
            type: 'number',
            description: 'Expiration time in days (default: 365)',
            default: 365
          }
        },
        required: ['name']
      }
    },
    {
      name: 'auth_list_keys',
      description: 'List all API keys for current user',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'revoked', 'expired'],
            description: 'Filter by status (optional)'
          }
        }
      }
    },
    {
      name: 'auth_revoke_key',
      description: 'Revoke an API key',
      inputSchema: {
        type: 'object',
        properties: {
          keyId: {
            type: 'string',
            description: 'API key ID to revoke'
          }
        },
        required: ['keyId']
      }
    },
    {
      name: 'auth_get_user',
      description: 'Get current authenticated user info',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}

export async function auth_create_key(
  args: { name: string; scopes?: string[]; expiresIn?: number },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  if (!user) throw new Error('Authentication required')

  const auth = c.env.AUTH
  if (!auth) throw new Error('Auth service not available')

  return await auth.createApiKey({
    userId: user.id,
    name: args.name,
    scopes: args.scopes || ['read', 'write'],
    expiresIn: args.expiresIn || 365
  })
}

export async function auth_list_keys(
  args: { status?: string },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  if (!user) throw new Error('Authentication required')

  const auth = c.env.AUTH
  if (!auth) throw new Error('Auth service not available')

  return await auth.listApiKeys({
    userId: user.id,
    status: args.status
  })
}

export async function auth_revoke_key(
  args: { keyId: string },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  if (!user) throw new Error('Authentication required')

  const auth = c.env.AUTH
  if (!auth) throw new Error('Auth service not available')

  return await auth.revokeApiKey({
    userId: user.id,
    keyId: args.keyId
  })
}

export async function auth_get_user(
  args: {},
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  if (!user) throw new Error('Authentication required')

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  }
}
