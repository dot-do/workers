/**
 * Unified Services Interface
 *
 * Wraps all core services and passes authentication context through all calls
 * This provides a single entry point for all service interactions
 */

import type { Env, ServiceContext, AuthContext } from './types'

/**
 * Create a service context from request
 */
export function createServiceContext(request: Request, auth: AuthContext): ServiceContext {
  return {
    auth,
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    metadata: {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('cf-connecting-ip'),
    }
  }
}

/**
 * Extract auth context from request
 */
export async function extractAuthContext(request: Request, env: Env): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return { authenticated: false }
  }

  // Call auth service to validate token
  try {
    const authResponse = await env.AUTH.fetch('http://auth/rpc/validateToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: authHeader.replace('Bearer ', '')
      })
    })

    if (authResponse.ok) {
      const authData = await authResponse.json() as any
      return {
        authenticated: true,
        user: authData.user,
        session: authData.session,
        apiKey: authData.apiKey,
      }
    }
  } catch (error) {
    console.error('Auth validation error:', error)
  }

  return { authenticated: false }
}

/**
 * Unified DO Service
 *
 * Exposes all service methods with automatic context passing
 */
export class DOService {
  constructor(private env: Env, private context: ServiceContext) {}

  // ========== Database Service ==========

  async db_query(sql: string, params?: any[]) {
    return this.callService('DB', 'query', { sql, params, context: this.context })
  }

  async db_get(ns: string, id: string) {
    return this.callService('DB', 'get', { ns, id, context: this.context })
  }

  async db_list(ns: string, options?: any) {
    return this.callService('DB', 'list', { ns, options, context: this.context })
  }

  async db_upsert(ns: string, id: string, data: any) {
    return this.callService('DB', 'upsert', { ns, id, data, context: this.context })
  }

  async db_delete(ns: string, id: string) {
    return this.callService('DB', 'delete', { ns, id, context: this.context })
  }

  async db_search(ns: string, query: string, options?: any) {
    return this.callService('DB', 'search', { ns, query, options, context: this.context })
  }

  // ========== Auth Service ==========

  async auth_validateToken(token: string) {
    return this.callService('AUTH', 'validateToken', { token, context: this.context })
  }

  async auth_createSession(userId: string) {
    return this.callService('AUTH', 'createSession', { userId, context: this.context })
  }

  async auth_createApiKey(name: string, permissions: string[]) {
    return this.callService('AUTH', 'createApiKey', { name, permissions, context: this.context })
  }

  async auth_checkPermission(permission: string) {
    return this.callService('AUTH', 'checkPermission', { permission, context: this.context })
  }

  // ========== Email Service ==========

  async email_send(to: string, subject: string, body: string, options?: any) {
    return this.callService('EMAIL', 'send', { to, subject, body, options, context: this.context })
  }

  async email_sendTemplate(to: string, template: string, data: any) {
    return this.callService('EMAIL', 'sendTemplate', { to, template, data, context: this.context })
  }

  // ========== Queue Service ==========

  async queue_send(queue: string, message: any, options?: any) {
    return this.callService('QUEUE', 'send', { queue, message, options, context: this.context })
  }

  async queue_batch(queue: string, messages: any[]) {
    return this.callService('QUEUE', 'batch', { queue, messages, context: this.context })
  }

  // ========== Schedule Service ==========

  async schedule_execute(taskName: string) {
    return this.callService('SCHEDULE', 'execute', { taskName, context: this.context })
  }

  async schedule_listTasks() {
    return this.callService('SCHEDULE', 'listTasks', { context: this.context })
  }

  async schedule_getHistory(taskName: string, limit?: number) {
    return this.callService('SCHEDULE', 'getHistory', { taskName, limit, context: this.context })
  }

  // ========== Webhooks Service ==========

  async webhooks_syncToGitHub(options: any) {
    return this.callService('WEBHOOKS', 'syncToGitHub', { ...options, context: this.context })
  }

  async webhooks_resolveConflict(conflictId: string, strategy: string) {
    return this.callService('WEBHOOKS', 'resolveConflict', { conflictId, strategy, context: this.context })
  }

  // ========== MCP Service ==========

  async mcp_listTools() {
    return this.callService('MCP', 'listTools', { context: this.context })
  }

  async mcp_callTool(toolName: string, args: any) {
    return this.callService('MCP', 'callTool', { toolName, args, context: this.context })
  }

  // ========== Gateway Service ==========

  async gateway_route(path: string, options?: any) {
    return this.callService('GATEWAY', 'route', { path, options, context: this.context })
  }

  // ========== Private Helper ==========

  private async callService(service: keyof Env, method: string, params: any) {
    const serviceBinding = this.env[service] as Fetcher

    try {
      const response = await serviceBinding.fetch(`http://${service.toLowerCase()}/rpc/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': this.context.requestId,
          'X-User-ID': this.context.auth.user?.id || '',
          'X-Authenticated': String(this.context.auth.authenticated),
        },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Service ${service}.${method} failed: ${error}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Error calling ${service}.${method}:`, error)
      throw error
    }
  }
}
