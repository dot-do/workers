/**
 * Path-based routing rules
 *
 * These routes take priority over domain-based routing.
 */

import type { RouteConfig, PathRouteRule } from '../types'

/**
 * Path-based route rules (highest priority)
 */
const PATH_ROUTES: PathRouteRule[] = [
  // Core services
  {
    pattern: /^\/api\/db\//,
    service: 'db',
    binding: 'DB_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/auth\//,
    service: 'auth',
    binding: 'AUTH_SERVICE',
    requiresAuth: false,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/schedule\//,
    service: 'schedule',
    binding: 'SCHEDULE_SERVICE',
    requiresAuth: true,
    requiresAdmin: true,
  },
  {
    pattern: /^\/api\/webhooks\//,
    service: 'webhooks',
    binding: 'WEBHOOKS_SERVICE',
    requiresAuth: false,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/email\//,
    service: 'email',
    binding: 'EMAIL_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/queue\//,
    service: 'queue',
    binding: 'QUEUE_SERVICE',
    requiresAuth: true,
    requiresAdmin: true,
  },

  // AI services
  {
    pattern: /^\/api\/ai\//,
    service: 'ai',
    binding: 'AI_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/embeddings\//,
    service: 'embeddings',
    binding: 'EMBEDDINGS_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },

  // Domain services
  {
    pattern: /^\/api\/agents\//,
    service: 'agents',
    binding: 'AGENTS_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/workflows\//,
    service: 'workflows',
    binding: 'WORKFLOWS_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/business\//,
    service: 'business',
    binding: 'BUSINESS_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },

  // Integration services
  {
    pattern: /^\/api\/stripe\//,
    service: 'stripe',
    binding: 'STRIPE_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    pattern: /^\/api\/github\//,
    service: 'github',
    binding: 'GITHUB_SERVICE',
    requiresAuth: true,
    requiresAdmin: false,
  },

  // MCP server (AI agent tools)
  {
    pattern: /^\/mcp\//,
    service: 'mcp',
    binding: 'MCP_SERVICE',
    requiresAuth: false,
    requiresAdmin: false,
  },

  // Public routes
  {
    pattern: /^\/waitlist\//,
    service: 'waitlist',
    binding: 'WAITLIST_SERVICE',
    requiresAuth: false,
    requiresAdmin: false,
  },
]

/**
 * Match a path against route rules
 */
export function matchPathRoute(pathname: string, hostname: string): RouteConfig | null {
  for (const rule of PATH_ROUTES) {
    if (rule.pattern.test(pathname)) {
      return {
        service: rule.service,
        binding: rule.binding,
        path: pathname,
        requiresAuth: rule.requiresAuth,
        requiresAdmin: rule.requiresAdmin,
      }
    }
  }

  return null
}
