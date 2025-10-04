/**
 * Gateway Router - Domain and Path-Based Routing
 *
 * Routes requests to appropriate worker services via RPC
 */

import type { RouteMatch, GatewayEnv } from './types'

export interface RouteConfig {
  pattern: RegExp
  service: string
  binding: keyof GatewayEnv
  transform?: (path: string) => string
}

/**
 * Route configuration for all domains and paths
 */
export const routes: RouteConfig[] = [
  // Database service routes
  { pattern: /^\/db\//, service: 'db', binding: 'DB' },

  // AI service routes
  { pattern: /^\/ai\//, service: 'ai', binding: 'AI' },

  // Auth service routes
  { pattern: /^\/auth\//, service: 'auth', binding: 'AUTH' },

  // Queue service routes
  { pattern: /^\/queue\//, service: 'queue', binding: 'QUEUE' },

  // Relationships service routes
  { pattern: /^\/relationships\//, service: 'relationships', binding: 'RELATIONSHIPS' },

  // Events service routes (Durable Objects)
  { pattern: /^\/events\//, service: 'events', binding: 'EVENTS' },

  // Workflows service routes
  { pattern: /^\/workflows\//, service: 'workflows', binding: 'WORKFLOWS' },

  // Embeddings service routes
  { pattern: /^\/embeddings\//, service: 'embeddings', binding: 'EMBEDDINGS' },

  // Batch processing service routes
  { pattern: /^\/batch\//, service: 'batch', binding: 'BATCH' },

  // Schedule service routes
  { pattern: /^\/schedule\//, service: 'schedule', binding: 'SCHEDULE' },

  // Code execution service routes
  { pattern: /^\/code\//, service: 'code-exec', binding: 'CODE_EXEC' },

  // Claude Code service routes
  { pattern: /^\/claude-code\//, service: 'claude-code', binding: 'CLAUDE_CODE' },

  // Agent service routes (Durable Objects)
  { pattern: /^\/agent\//, service: 'agent', binding: 'AGENT' },

  // Fn service routes (function classification and routing)
  { pattern: /^\/fn\//, service: 'fn', binding: 'FN' },

  // Admin CMS routes
  { pattern: /^\/admin\//, service: 'app', binding: 'APP' },
]

/**
 * Domain-based routing configuration
 * Maps domains to default services
 */
export const domainRoutes: Record<string, keyof GatewayEnv> = {
  'db.services.do': 'DB',
  'ai.services.do': 'AI',
  'auth.services.do': 'AUTH',
  'queue.services.do': 'QUEUE',
  'api.services.do': 'DB', // Default to DB for main API domain
  'api.mw': 'DB',
  'admin.do': 'APP', // Admin CMS
}

/**
 * Find matching route for a given path
 */
export function matchRoute(pathname: string): RouteMatch | null {
  for (const route of routes) {
    if (route.pattern.test(pathname)) {
      const transformedPath = route.transform ? route.transform(pathname) : pathname
      return {
        service: route.service,
        path: transformedPath,
        binding: route.binding,
      }
    }
  }

  return null
}

/**
 * Get service binding for domain
 */
export function getServiceForDomain(hostname: string): keyof GatewayEnv | null {
  // Check exact match
  if (domainRoutes[hostname]) {
    return domainRoutes[hostname]
  }

  // Check wildcard subdomains
  const parts = hostname.split('.')
  if (parts.length >= 2) {
    const baseDomain = parts.slice(-2).join('.')
    if (domainRoutes[baseDomain]) {
      return domainRoutes[baseDomain]
    }
  }

  return null
}

/**
 * Check if route requires authentication
 */
export function requiresAuth(pathname: string, method: string): boolean {
  // Public routes (no auth required)
  const publicRoutes = ['/auth/', '/health', '/']

  // Check if path starts with any public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return false
  }

  // Admin routes require authentication
  if (pathname.startsWith('/admin/')) {
    return true
  }

  // Agent and fn services require auth
  if (pathname.startsWith('/agent/') || pathname.startsWith('/fn/')) {
    return true
  }

  // All mutations require auth
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return true
  }

  // Default to requiring auth for safety
  return false
}

/**
 * Check if route requires admin role
 */
export function requiresAdmin(pathname: string, method: string): boolean {
  // Admin-only routes
  const adminRoutes = ['/admin/', '/batch/', '/schedule/']

  // Check if path starts with any admin route
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    return true
  }

  // Mutations on certain paths require admin
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const mutationAdminRoutes = ['/db/', '/relationships/', '/workflows/']
    return mutationAdminRoutes.some(route => pathname.startsWith(route))
  }

  return false
}
