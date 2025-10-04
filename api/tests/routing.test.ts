/**
 * Tests for API worker routing logic
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { matchPathRoute } from '../src/routing/paths'
import { isInternalService } from '../src/routing/wfp'

describe('Path-based routing', () => {
  it('should match /api/db/* routes', () => {
    const route = matchPathRoute('/api/db/users/123', 'api.do')
    expect(route).toBeDefined()
    expect(route?.service).toBe('db')
    expect(route?.binding).toBe('DB_SERVICE')
    expect(route?.requiresAuth).toBe(true)
  })

  it('should match /api/auth/* routes', () => {
    const route = matchPathRoute('/api/auth/login', 'api.do')
    expect(route).toBeDefined()
    expect(route?.service).toBe('auth')
    expect(route?.binding).toBe('AUTH_SERVICE')
    expect(route?.requiresAuth).toBe(false)
  })

  it('should match /api/ai/* routes', () => {
    const route = matchPathRoute('/api/ai/generate', 'api.do')
    expect(route).toBeDefined()
    expect(route?.service).toBe('ai')
    expect(route?.binding).toBe('AI_SERVICE')
    expect(route?.requiresAuth).toBe(true)
  })

  it('should return null for non-matching paths', () => {
    const route = matchPathRoute('/unknown/path', 'api.do')
    expect(route).toBeNull()
  })

  it('should match /mcp/* routes', () => {
    const route = matchPathRoute('/mcp/tools', 'api.do')
    expect(route).toBeDefined()
    expect(route?.service).toBe('mcp')
    expect(route?.requiresAuth).toBe(false)
  })
})

describe('Workers for Platforms routing', () => {
  it('should identify internal services', () => {
    expect(isInternalService('db')).toBe(true)
    expect(isInternalService('auth')).toBe(true)
    expect(isInternalService('ai')).toBe(true)
    expect(isInternalService('gateway')).toBe(true)
    expect(isInternalService('schedule')).toBe(true)
  })

  it('should identify user workers', () => {
    expect(isInternalService('myapp')).toBe(false)
    expect(isInternalService('customer-service')).toBe(false)
    expect(isInternalService('unknown')).toBe(false)
  })

  it('should identify all core services as internal', () => {
    const coreServices = [
      'api',
      'gateway',
      'db',
      'auth',
      'schedule',
      'webhooks',
      'email',
      'mcp',
      'queue',
      'do',
      'dispatcher',
      'deploy',
      'ai',
      'embeddings',
      'pipeline',
      'analytics',
    ]

    coreServices.forEach(service => {
      expect(isInternalService(service)).toBe(true)
    })
  })
})

describe('Route configuration', () => {
  it('should have correct auth requirements', () => {
    const dbRoute = matchPathRoute('/api/db/users', 'api.do')
    expect(dbRoute?.requiresAuth).toBe(true)

    const authRoute = matchPathRoute('/api/auth/login', 'api.do')
    expect(authRoute?.requiresAuth).toBe(false)

    const mcpRoute = matchPathRoute('/mcp/tools', 'api.do')
    expect(mcpRoute?.requiresAuth).toBe(false)
  })

  it('should have correct admin requirements', () => {
    const scheduleRoute = matchPathRoute('/api/schedule/tasks', 'api.do')
    expect(scheduleRoute?.requiresAdmin).toBe(true)

    const dbRoute = matchPathRoute('/api/db/users', 'api.do')
    expect(dbRoute?.requiresAdmin).toBe(false)
  })
})
