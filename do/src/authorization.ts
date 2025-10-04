/**
 * Authorization for Code Mode
 * Implements three-tier access control: internal, public, tenant
 */

import type { ServiceContext, ExecuteCodeRequest } from './types'

/**
 * User tier determines access level
 */
export type UserTier = 'internal' | 'public' | 'tenant'

/**
 * Permission levels for code execution
 */
export interface CodePermissions {
  // Available service bindings
  allowedBindings: string[]

  // Namespace restrictions
  namespace: string // User's scoped namespace

  // Execution limits
  maxExecutionTime: number // milliseconds
  maxConcurrentExecutions: number

  // Feature flags
  canAccessInternal: boolean // Access internal services
  canBypassRateLimit: boolean
  canExecuteArbitraryCode: boolean
}

/**
 * Determine user tier from service context
 */
export function getUserTier(context: ServiceContext): UserTier {
  const user = context.auth.user

  // Internal tier: admin users, service accounts
  if (user?.role === 'admin' || user?.role === 'service') {
    return 'internal'
  }

  // Tenant tier: tenant-scoped users
  if (user?.role === 'tenant' || user?.permissions?.includes('tenant:*')) {
    return 'tenant'
  }

  // Public tier: regular users (default)
  return 'public'
}

/**
 * Get user namespace from context
 */
export function getUserNamespace(context: ServiceContext): string {
  const user = context.auth.user

  // Internal users have no namespace restriction
  if (getUserTier(context) === 'internal') {
    return '*'
  }

  // Tenant users are scoped to their tenant
  if (getUserTier(context) === 'tenant' && user?.metadata?.tenantId) {
    return `tenant:${user.metadata.tenantId}`
  }

  // Public users are scoped to their user ID
  if (user?.id) {
    return `user:${user.id}`
  }

  // Anonymous users get a session-based namespace
  return `session:${context.requestId}`
}

/**
 * Get code permissions based on user tier
 */
export function getCodePermissions(context: ServiceContext): CodePermissions {
  const tier = getUserTier(context)
  const namespace = getUserNamespace(context)

  // Internal tier - full access
  if (tier === 'internal') {
    return {
      allowedBindings: ['db', 'auth', 'gateway', 'schedule', 'webhooks', 'email', 'mcp', 'queue'],
      namespace,
      maxExecutionTime: 120000, // 2 minutes
      maxConcurrentExecutions: 100,
      canAccessInternal: true,
      canBypassRateLimit: true,
      canExecuteArbitraryCode: true
    }
  }

  // Tenant tier - tenant-scoped access
  if (tier === 'tenant') {
    return {
      allowedBindings: ['db', 'email', 'queue'], // Limited bindings
      namespace,
      maxExecutionTime: 30000, // 30 seconds
      maxConcurrentExecutions: 10,
      canAccessInternal: false,
      canBypassRateLimit: false,
      canExecuteArbitraryCode: true
    }
  }

  // Public tier - most restricted
  return {
    allowedBindings: ['db'], // Only database access
    namespace,
    maxExecutionTime: 10000, // 10 seconds
    maxConcurrentExecutions: 3,
    canAccessInternal: false,
    canBypassRateLimit: false,
    canExecuteArbitraryCode: false // Could be enabled with paid plan
  }
}

/**
 * Validate code execution request against permissions
 */
export function authorizeCodeExecution(
  request: ExecuteCodeRequest,
  context: ServiceContext
): { authorized: boolean; error?: string } {
  const permissions = getCodePermissions(context)

  // Check if user can execute arbitrary code
  if (!permissions.canExecuteArbitraryCode) {
    return {
      authorized: false,
      error: 'Code execution not available on your plan. Upgrade to execute custom code.'
    }
  }

  // Check requested bindings
  const requestedBindings = request.bindings || []
  const unauthorized = requestedBindings.filter(
    binding => !permissions.allowedBindings.includes(binding)
  )

  if (unauthorized.length > 0) {
    return {
      authorized: false,
      error: `Access denied to bindings: ${unauthorized.join(', ')}. Available: ${permissions.allowedBindings.join(', ')}`
    }
  }

  // Check timeout
  const requestedTimeout = request.timeout || 30000
  if (requestedTimeout > permissions.maxExecutionTime) {
    return {
      authorized: false,
      error: `Timeout ${requestedTimeout}ms exceeds maximum ${permissions.maxExecutionTime}ms for your tier`
    }
  }

  return { authorized: true }
}

/**
 * Scope database queries to user namespace
 * Injects namespace filter into all DB operations
 */
export function scopeBindingToNamespace(
  bindingName: string,
  binding: any,
  namespace: string
): any {
  // If namespace is '*', no scoping needed (internal users)
  if (namespace === '*') {
    return binding
  }

  // For DB binding, wrap to inject namespace
  if (bindingName === 'db' || bindingName === 'DB') {
    return createScopedDbProxy(binding, namespace)
  }

  // For other bindings, return as-is for now
  // TODO: Implement scoping for email, queue, etc.
  return binding
}

/**
 * Create a proxy for DB binding that automatically scopes queries
 */
function createScopedDbProxy(db: any, namespace: string): any {
  return new Proxy(db, {
    get(target, prop) {
      const original = target[prop]

      // Intercept query methods
      if (prop === 'query' && typeof original === 'function') {
        return async (sql: string, params?: any[]) => {
          // Inject namespace filter into WHERE clause
          const scopedSql = injectNamespaceFilter(sql, namespace)
          return await original.call(target, scopedSql, params)
        }
      }

      // Intercept RPC methods (get, list, upsert, delete, search)
      if (['get', 'list', 'upsert', 'delete', 'search'].includes(prop as string)) {
        return async (...args: any[]) => {
          // Inject namespace as first argument or option
          const scopedArgs = injectNamespaceIntoArgs(args, namespace)
          return await original.apply(target, scopedArgs)
        }
      }

      return original
    }
  })
}

/**
 * Inject namespace filter into SQL query
 */
function injectNamespaceFilter(sql: string, namespace: string): string {
  // Simple implementation: add WHERE ns = ? if no WHERE exists
  // Or AND ns = ? if WHERE exists
  // This is a simplified version - production would need proper SQL parsing

  const lowerSql = sql.toLowerCase()

  if (lowerSql.includes('where')) {
    // Add AND ns = 'namespace'
    return sql.replace(/where/i, `WHERE ns = '${namespace}' AND`)
  } else if (lowerSql.includes('from')) {
    // Add WHERE ns = 'namespace' after FROM table
    return sql.replace(/from\s+(\w+)/i, `FROM $1 WHERE ns = '${namespace}'`)
  }

  return sql
}

/**
 * Inject namespace into RPC method arguments
 */
function injectNamespaceIntoArgs(args: any[], namespace: string): any[] {
  // For methods like get(ns, id), list(ns, options), upsert(ns, id, data)
  // Replace first argument (ns) with the user's scoped namespace

  if (args.length === 0) {
    return [namespace]
  }

  // Override first argument with scoped namespace
  return [namespace, ...args.slice(1)]
}

/**
 * Rate limit tracking (simple in-memory, would use KV in production)
 */
const rateLimits = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  context: ServiceContext
): { allowed: boolean; error?: string } {
  const permissions = getCodePermissions(context)

  // Internal users can bypass rate limits
  if (permissions.canBypassRateLimit) {
    return { allowed: true }
  }

  const key = getUserNamespace(context)
  const now = Date.now()
  const limit = rateLimits.get(key)

  // Reset if expired
  if (!limit || limit.resetAt < now) {
    rateLimits.set(key, {
      count: 1,
      resetAt: now + 60000 // 1 minute window
    })
    return { allowed: true }
  }

  // Check limit
  if (limit.count >= permissions.maxConcurrentExecutions) {
    return {
      allowed: false,
      error: `Rate limit exceeded: ${permissions.maxConcurrentExecutions} executions per minute`
    }
  }

  // Increment
  limit.count++
  return { allowed: true }
}

/**
 * Get tier summary for display
 */
export function getTierSummary(context: ServiceContext) {
  const tier = getUserTier(context)
  const permissions = getCodePermissions(context)

  return {
    tier,
    namespace: permissions.namespace,
    bindings: permissions.allowedBindings,
    limits: {
      maxExecutionTime: permissions.maxExecutionTime,
      maxConcurrentExecutions: permissions.maxConcurrentExecutions
    },
    features: {
      canAccessInternal: permissions.canAccessInternal,
      canBypassRateLimit: permissions.canBypassRateLimit,
      canExecuteArbitraryCode: permissions.canExecuteArbitraryCode
    }
  }
}
