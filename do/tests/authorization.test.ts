/**
 * Tests for three-tier authorization system
 */

import { describe, it, expect } from 'vitest'
import {
  getUserTier,
  getUserNamespace,
  getCodePermissions,
  authorizeCodeExecution,
  checkRateLimit,
  scopeBindingToNamespace,
} from '../src/authorization'
import type { ServiceContext, ExecuteCodeRequest } from '../src/types'

describe('Authorization - User Tier Detection', () => {
  it('should identify internal tier for admin users', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_admin',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          permissions: [],
        },
      },
      requestId: 'req_123',
      timestamp: Date.now(),
      metadata: {},
    }

    const tier = getUserTier(context)
    expect(tier).toBe('internal')
  })

  it('should identify internal tier for service accounts', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'svc_worker',
          email: 'worker@service.internal',
          name: 'Worker Service',
          role: 'service',
          permissions: [],
        },
      },
      requestId: 'req_456',
      timestamp: Date.now(),
      metadata: {},
    }

    const tier = getUserTier(context)
    expect(tier).toBe('internal')
  })

  it('should identify tenant tier for tenant users', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_tenant',
          email: 'user@acme.com',
          name: 'Tenant User',
          role: 'tenant',
          permissions: [],
          metadata: { tenantId: 'acme-corp' },
        },
      },
      requestId: 'req_789',
      timestamp: Date.now(),
      metadata: {},
    }

    const tier = getUserTier(context)
    expect(tier).toBe('tenant')
  })

  it('should identify tenant tier for users with tenant:* permission', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_tenant2',
          email: 'user@company.com',
          name: 'Tenant User',
          role: 'user',
          permissions: ['tenant:*'],
          metadata: { tenantId: 'company-inc' },
        },
      },
      requestId: 'req_abc',
      timestamp: Date.now(),
      metadata: {},
    }

    const tier = getUserTier(context)
    expect(tier).toBe('tenant')
  })

  it('should identify public tier for regular users', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_public',
          email: 'user@example.com',
          name: 'Public User',
          role: 'user',
          permissions: [],
        },
      },
      requestId: 'req_def',
      timestamp: Date.now(),
      metadata: {},
    }

    const tier = getUserTier(context)
    expect(tier).toBe('public')
  })

  it('should default to public tier for unauthenticated users', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: false,
      },
      requestId: 'req_ghi',
      timestamp: Date.now(),
      metadata: {},
    }

    const tier = getUserTier(context)
    expect(tier).toBe('public')
  })
})

describe('Authorization - Namespace Assignment', () => {
  it('should assign unrestricted namespace to internal tier', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_admin',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          permissions: [],
        },
      },
      requestId: 'req_123',
      timestamp: Date.now(),
      metadata: {},
    }

    const namespace = getUserNamespace(context)
    expect(namespace).toBe('*')
  })

  it('should assign tenant namespace to tenant users', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_tenant',
          email: 'user@acme.com',
          name: 'Tenant User',
          role: 'tenant',
          permissions: [],
          metadata: { tenantId: 'acme-corp' },
        },
      },
      requestId: 'req_456',
      timestamp: Date.now(),
      metadata: {},
    }

    const namespace = getUserNamespace(context)
    expect(namespace).toBe('tenant:acme-corp')
  })

  it('should assign user namespace to public users', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_public',
          email: 'user@example.com',
          name: 'Public User',
          role: 'user',
          permissions: [],
        },
      },
      requestId: 'req_789',
      timestamp: Date.now(),
      metadata: {},
    }

    const namespace = getUserNamespace(context)
    expect(namespace).toBe('user:usr_public')
  })

  it('should assign session namespace to unauthenticated users', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: false,
      },
      requestId: 'req_abc',
      timestamp: Date.now(),
      metadata: {},
    }

    const namespace = getUserNamespace(context)
    expect(namespace).toBe('session:req_abc')
  })
})

describe('Authorization - Permissions', () => {
  it('should grant full permissions to internal tier', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_admin',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          permissions: [],
        },
      },
      requestId: 'req_123',
      timestamp: Date.now(),
      metadata: {},
    }

    const permissions = getCodePermissions(context)
    expect(permissions.allowedBindings).toEqual([
      'db',
      'auth',
      'gateway',
      'schedule',
      'webhooks',
      'email',
      'mcp',
      'queue',
    ])
    expect(permissions.namespace).toBe('*')
    expect(permissions.maxExecutionTime).toBe(120000)
    expect(permissions.maxConcurrentExecutions).toBe(100)
    expect(permissions.canAccessInternal).toBe(true)
    expect(permissions.canBypassRateLimit).toBe(true)
    expect(permissions.canExecuteArbitraryCode).toBe(true)
  })

  it('should grant tenant permissions to tenant tier', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_tenant',
          email: 'user@acme.com',
          name: 'Tenant User',
          role: 'tenant',
          permissions: [],
          metadata: { tenantId: 'acme-corp' },
        },
      },
      requestId: 'req_456',
      timestamp: Date.now(),
      metadata: {},
    }

    const permissions = getCodePermissions(context)
    expect(permissions.allowedBindings).toEqual(['db', 'email', 'queue'])
    expect(permissions.namespace).toBe('tenant:acme-corp')
    expect(permissions.maxExecutionTime).toBe(30000)
    expect(permissions.maxConcurrentExecutions).toBe(10)
    expect(permissions.canAccessInternal).toBe(false)
    expect(permissions.canBypassRateLimit).toBe(false)
    expect(permissions.canExecuteArbitraryCode).toBe(true)
  })

  it('should grant minimal permissions to public tier', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_public',
          email: 'user@example.com',
          name: 'Public User',
          role: 'user',
          permissions: [],
        },
      },
      requestId: 'req_789',
      timestamp: Date.now(),
      metadata: {},
    }

    const permissions = getCodePermissions(context)
    expect(permissions.allowedBindings).toEqual(['db'])
    expect(permissions.namespace).toBe('user:usr_public')
    expect(permissions.maxExecutionTime).toBe(10000)
    expect(permissions.maxConcurrentExecutions).toBe(3)
    expect(permissions.canAccessInternal).toBe(false)
    expect(permissions.canBypassRateLimit).toBe(false)
    expect(permissions.canExecuteArbitraryCode).toBe(false)
  })
})

describe('Authorization - Code Execution', () => {
  it('should authorize internal tier code execution', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_admin',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          permissions: [],
        },
      },
      requestId: 'req_123',
      timestamp: Date.now(),
      metadata: {},
    }

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db', 'email'],
      timeout: 30000,
    }

    const result = authorizeCodeExecution(request, context)
    expect(result.authorized).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should authorize tenant tier code execution', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_tenant',
          email: 'user@acme.com',
          name: 'Tenant User',
          role: 'tenant',
          permissions: [],
          metadata: { tenantId: 'acme-corp' },
        },
      },
      requestId: 'req_456',
      timestamp: Date.now(),
      metadata: {},
    }

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db'],
      timeout: 25000,
    }

    const result = authorizeCodeExecution(request, context)
    expect(result.authorized).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject public tier arbitrary code execution', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_public',
          email: 'user@example.com',
          name: 'Public User',
          role: 'user',
          permissions: [],
        },
      },
      requestId: 'req_789',
      timestamp: Date.now(),
      metadata: {},
    }

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db'],
      timeout: 5000,
    }

    const result = authorizeCodeExecution(request, context, { ENVIRONMENT: 'production' })
    expect(result.authorized).toBe(false)
    expect(result.error).toContain('not available on your plan')
  })

  it('should reject requests for unauthorized bindings (tenant trying to use internal bindings)', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_tenant',
          email: 'user@acme.com',
          name: 'Tenant User',
          role: 'tenant',
          permissions: [],
          metadata: { tenantId: 'acme-corp' },
        },
      },
      requestId: 'req_abc',
      timestamp: Date.now(),
      metadata: {},
    }

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['auth', 'gateway'], // Internal-only bindings
      timeout: 5000,
    }

    const result = authorizeCodeExecution(request, context)
    expect(result.authorized).toBe(false)
    expect(result.error).toContain('Access denied to bindings')
    expect(result.error).toContain('auth')
    expect(result.error).toContain('gateway')
  })

  it('should reject requests exceeding timeout limit', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_tenant',
          email: 'user@acme.com',
          name: 'Tenant User',
          role: 'tenant',
          permissions: [],
          metadata: { tenantId: 'acme-corp' },
        },
      },
      requestId: 'req_def',
      timestamp: Date.now(),
      metadata: {},
    }

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db'],
      timeout: 60000, // Exceeds 30s tenant limit
    }

    const result = authorizeCodeExecution(request, context)
    expect(result.authorized).toBe(false)
    expect(result.error).toContain('Timeout')
    expect(result.error).toContain('60000')
    expect(result.error).toContain('30000')
  })
})

describe('Authorization - Rate Limiting', () => {
  it('should allow requests within rate limit', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_public',
          email: 'user@example.com',
          name: 'Public User',
          role: 'user',
          permissions: [],
        },
      },
      requestId: 'req_123',
      timestamp: Date.now(),
      metadata: {},
    }

    const result = checkRateLimit(context)
    expect(result.allowed).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should bypass rate limit for internal tier', () => {
    const context: ServiceContext = {
      auth: {
        authenticated: true,
        user: {
          id: 'usr_admin',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          permissions: [],
        },
      },
      requestId: 'req_456',
      timestamp: Date.now(),
      metadata: {},
    }

    // Call multiple times - should never be rate limited
    for (let i = 0; i < 200; i++) {
      const result = checkRateLimit(context)
      expect(result.allowed).toBe(true)
    }
  })
})

describe('Authorization - Binding Scoping', () => {
  it('should return unscoped binding for internal tier', () => {
    const mockBinding = {
      query: async (sql: string) => ({ data: [] }),
    }

    const scopedBinding = scopeBindingToNamespace('db', mockBinding, '*')
    expect(scopedBinding).toBe(mockBinding)
  })

  it('should return scoped proxy for user namespace', () => {
    const mockBinding = {
      query: async (sql: string, params?: any[]) => ({ data: [] }),
    }

    const scopedBinding = scopeBindingToNamespace('db', mockBinding, 'user:usr_123')
    expect(scopedBinding).toBeDefined()
    expect(typeof scopedBinding.query).toBe('function')
  })

  it('should return unmodified binding for non-db services', () => {
    const mockBinding = {
      send: async (to: string, subject: string, body: string) => ({ sent: true }),
    }

    const scopedBinding = scopeBindingToNamespace('email', mockBinding, 'user:usr_123')
    expect(scopedBinding).toBe(mockBinding)
  })
})
