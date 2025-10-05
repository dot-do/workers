/**
 * Test cases for Auth Service
 */

import type { TestCase } from '../adapters/types'

export const authTestCases: TestCase[] = [
  {
    service: 'auth',
    method: 'health',
    description: 'should return auth health status',
    input: {},
    expected: {
      status: 'ok',
      service: 'auth',
    },
    tags: ['health', 'fast'],
  },

  {
    service: 'auth',
    method: 'validateToken',
    description: 'should validate valid JWT token',
    input: {
      token: 'valid.jwt.token',
    },
    assertions: [
      (result) => typeof result.valid === 'boolean',
      (result) => result.valid === true,
      (result) => typeof result.userId === 'string',
    ],
    tags: ['token', 'validation'],
  },

  {
    service: 'auth',
    method: 'validateToken',
    description: 'should reject invalid token',
    input: {
      token: 'invalid-token',
    },
    expected: {
      valid: false,
    },
    tags: ['token', 'validation'],
  },

  {
    service: 'auth',
    method: 'validateToken',
    description: 'should reject expired token',
    input: {
      token: 'expired.jwt.token',
    },
    assertions: [
      (result) => result.valid === false,
      (result) => result.reason === 'expired',
    ],
    tags: ['token', 'validation'],
  },

  {
    service: 'auth',
    method: 'validateApiKey',
    description: 'should validate valid API key',
    input: {
      apiKey: 'valid-api-key',
    },
    assertions: [
      (result) => result.valid === true,
      (result) => typeof result.userId === 'string',
      (result) => Array.isArray(result.permissions),
    ],
    tags: ['apikey', 'validation'],
  },

  {
    service: 'auth',
    method: 'validateApiKey',
    description: 'should reject invalid API key',
    input: {
      apiKey: 'invalid-api-key',
    },
    expected: {
      valid: false,
    },
    tags: ['apikey', 'validation'],
  },

  {
    service: 'auth',
    method: 'checkPermission',
    description: 'should check user has permission',
    input: {
      userId: 'test-user',
      permission: 'db:read',
    },
    assertions: [
      (result) => typeof result.hasPermission === 'boolean',
    ],
    tags: ['authorization', 'permission'],
  },

  {
    service: 'auth',
    method: 'checkRole',
    description: 'should check user has role',
    input: {
      userId: 'test-user',
      role: 'admin',
    },
    assertions: [
      (result) => typeof result.hasRole === 'boolean',
    ],
    tags: ['authorization', 'role'],
  },

  {
    service: 'auth',
    method: 'getUserRoles',
    description: 'should get user roles',
    input: {
      userId: 'test-user',
    },
    assertions: [
      (result) => Array.isArray(result.roles),
    ],
    tags: ['authorization', 'role'],
  },

  {
    service: 'auth',
    method: 'getUserPermissions',
    description: 'should get user permissions',
    input: {
      userId: 'test-user',
    },
    assertions: [
      (result) => Array.isArray(result.permissions),
    ],
    tags: ['authorization', 'permission'],
  },

  {
    service: 'auth',
    method: 'createSession',
    description: 'should create user session',
    input: {
      userId: 'test-user',
      expiresIn: 3600,
    },
    assertions: [
      (result) => typeof result.sessionId === 'string',
      (result) => typeof result.token === 'string',
      (result) => typeof result.expiresAt === 'number',
    ],
    tags: ['session', 'write'],
  },

  {
    service: 'auth',
    method: 'getSession',
    description: 'should get session by ID',
    input: {
      sessionId: 'test-session-id',
    },
    assertions: [
      (result) => typeof result.userId === 'string',
      (result) => typeof result.createdAt === 'number',
    ],
    tags: ['session', 'read'],
  },

  {
    service: 'auth',
    method: 'deleteSession',
    description: 'should delete session',
    input: {
      sessionId: 'test-session-id',
    },
    expected: {
      deleted: true,
    },
    tags: ['session', 'write'],
  },

  {
    service: 'auth',
    method: 'refreshToken',
    description: 'should refresh access token',
    input: {
      refreshToken: 'valid-refresh-token',
    },
    assertions: [
      (result) => typeof result.accessToken === 'string',
      (result) => typeof result.expiresAt === 'number',
    ],
    tags: ['token', 'refresh'],
  },
]
