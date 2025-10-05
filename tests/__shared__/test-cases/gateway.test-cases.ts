/**
 * Test cases for Gateway Service
 */

import type { TestCase } from '../adapters/types'

export const gatewayTestCases: TestCase[] = [
  {
    service: 'gateway',
    method: 'health',
    description: 'should return health status',
    input: {},
    expected: {
      status: 'ok',
      service: 'gateway',
    },
    assertions: [
      (result) => result.status === 'ok',
      (result) => result.service === 'gateway',
      (result) => typeof result.timestamp !== 'undefined',
    ],
    tags: ['health', 'fast'],
  },

  {
    service: 'gateway',
    method: 'version',
    description: 'should return version information',
    input: {},
    assertions: [
      (result) => typeof result.version === 'string',
      (result) => typeof result.commit === 'string',
      (result) => typeof result.buildTime !== 'undefined',
    ],
    tags: ['info', 'fast'],
  },

  {
    service: 'gateway',
    method: 'route',
    description: 'should route GET request to db service',
    input: {
      method: 'GET',
      path: '/db/health',
    },
    assertions: [
      (result) => result.service === 'db',
      (result) => result.method === 'GET',
    ],
    tags: ['routing'],
  },

  {
    service: 'gateway',
    method: 'route',
    description: 'should route POST request to auth service',
    input: {
      method: 'POST',
      path: '/auth/login',
    },
    assertions: [
      (result) => result.service === 'auth',
      (result) => result.method === 'POST',
    ],
    tags: ['routing'],
  },

  {
    service: 'gateway',
    method: 'validatePath',
    description: 'should validate correct path format',
    input: {
      path: '/db/users',
    },
    expected: {
      valid: true,
      service: 'db',
      resource: 'users',
    },
    tags: ['validation', 'fast'],
  },

  {
    service: 'gateway',
    method: 'validatePath',
    description: 'should reject invalid path format',
    input: {
      path: '/invalid',
    },
    expected: {
      valid: false,
    },
    tags: ['validation', 'fast'],
  },

  {
    service: 'gateway',
    method: 'rateLimit',
    description: 'should check rate limit status',
    input: {
      userId: 'test-user',
      endpoint: '/db/query',
    },
    assertions: [
      (result) => typeof result.allowed === 'boolean',
      (result) => typeof result.remaining === 'number',
      (result) => typeof result.resetAt === 'number',
    ],
    tags: ['rate-limit'],
  },
]
