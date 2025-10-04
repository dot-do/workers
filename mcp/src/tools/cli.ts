import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'

/**
 * CLI Tools
 * Authentication and token management operations
 * Mirrors cli.do CLI commands for MCP clients
 */

export function getTools(): MCPTool[] {
  return [
    {
      name: 'cli_whoami',
      description: 'Get current authenticated user information (like cli.do whoami)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'cli_token',
      description: 'Get current access token information (like cli.do token)',
      inputSchema: {
        type: 'object',
        properties: {
          showToken: {
            type: 'boolean',
            description: 'Include the actual token value (default: false for security)',
            default: false
          }
        }
      }
    },
    {
      name: 'cli_refresh',
      description: 'Refresh the current access token (like cli.do refresh)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'cli_status',
      description: 'Get authentication status and OAuth configuration',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'cli_login_url',
      description: 'Get the OAuth login URL for authentication',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Optional session ID for OAuth flow tracking'
          }
        }
      }
    }
  ]
}

/**
 * Get current user information
 * Equivalent to: cli.do whoami
 */
export async function cli_whoami(
  args: {},
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  if (!user) {
    throw new Error('Not authenticated. Please authenticate first.')
  }

  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    message: `Authenticated as ${user.email}`
  }
}

/**
 * Get access token information
 * Equivalent to: cli.do token
 */
export async function cli_token(
  args: { showToken?: boolean },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  if (!user) {
    throw new Error('Not authenticated. Please authenticate first.')
  }

  // Extract token from request Authorization header
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!token) {
    throw new Error('No access token found in request')
  }

  // Get token info from OAuth worker
  try {
    const response = await fetch('https://oauth.do/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to validate token')
    }

    const userInfo = await response.json() as any

    return {
      authenticated: true,
      token: args.showToken ? {
        value: token,
        preview: `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
      } : {
        preview: `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
      },
      user: {
        id: userInfo.sub || userInfo.id,
        email: userInfo.email,
        name: userInfo.name
      },
      message: args.showToken
        ? 'Token retrieved (handle with care!)'
        : 'Token available (use showToken:true to reveal)'
    }
  } catch (error) {
    throw new Error(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Refresh access token
 * Equivalent to: cli.do refresh
 *
 * Note: In MCP context, clients should handle token refresh automatically.
 * This tool provides refresh URL information.
 */
export async function cli_refresh(
  args: {},
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  if (!user) {
    throw new Error('Not authenticated. Please authenticate first.')
  }

  return {
    message: 'Token refresh should be handled by your MCP client automatically',
    refresh_endpoint: 'https://oauth.do/refresh',
    instructions: [
      '1. MCP clients handle token refresh automatically when tokens expire',
      '2. Manual refresh: POST to https://oauth.do/refresh with refresh_token',
      '3. If refresh fails, re-authenticate via cli_login_url'
    ],
    current_user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  }
}

/**
 * Get authentication status
 * Equivalent to: cli.do whoami (when not authenticated)
 */
export async function cli_status(
  args: {},
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  return {
    authenticated: user !== null,
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    } : null,
    oauth: {
      issuer: 'https://oauth.do',
      authorization_endpoint: 'https://api.workos.com/user_management/authorize',
      token_endpoint: 'https://oauth.do/token',
      userinfo_endpoint: 'https://oauth.do/user',
      resource_identifier: 'https://mcp.do',
      scopes_supported: ['openid', 'profile', 'email'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256']
    },
    mcp: {
      server: 'https://mcp.do',
      protocol: 'mcp/2024-11-05',
      discovery: 'https://mcp.do/.well-known/oauth-protected-resource'
    },
    message: user
      ? `Authenticated as ${user.email}`
      : 'Not authenticated. Use cli_login_url to get authentication URL.'
  }
}

/**
 * Get OAuth login URL
 * Generates a login URL for authentication flow
 */
export async function cli_login_url(
  args: { sessionId?: string },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const sessionId = args.sessionId || crypto.randomUUID()
  const loginUrl = `https://oauth.do/login?session_id=${sessionId}`

  return {
    login_url: loginUrl,
    session_id: sessionId,
    instructions: [
      '1. Open the login URL in your browser',
      '2. Authenticate via WorkOS (Google OAuth)',
      '3. Your MCP client will receive the tokens automatically',
      '4. If using Claude Desktop, it handles this flow automatically'
    ],
    oauth_flow: 'production',
    message: user
      ? `Already authenticated as ${user.email}. Use this URL to re-authenticate.`
      : 'Open the login URL to authenticate'
  }
}
