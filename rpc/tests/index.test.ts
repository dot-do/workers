import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RpcService } from '../src/index'
import type { Env } from '../src/types'

// Mock environment
const createMockEnv = (): Env => ({
  OAUTH_SERVICE: {
    validateToken: vi.fn().mockResolvedValue({
      valid: true,
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      expiresAt: Date.now() + 3600000,
    }),
  },
  AUTH_SERVICE: {},
  DB_SERVICE: {
    get: vi.fn().mockResolvedValue({
      ns: 'test',
      id: 'entity-1',
      type: 'Thing',
      data: { name: 'Test Entity' },
    }),
    list: vi.fn().mockResolvedValue({
      data: [],
      total: 0,
      hasMore: false,
    }),
    upsert: vi.fn().mockResolvedValue({
      ns: 'test',
      id: 'entity-1',
      type: 'Thing',
      data: { name: 'Test Entity' },
    }),
  },
  SESSIONS: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  } as any,
})

describe('RpcService', () => {
  let service: RpcService
  let env: Env
  let ctx: ExecutionContext

  beforeEach(() => {
    env = createMockEnv()
    ctx = {} as ExecutionContext
    service = new RpcService(ctx, env)
  })

  describe('listMethods', () => {
    it('should return list of available methods', async () => {
      const methods = await service.listMethods()

      expect(methods).toBeInstanceOf(Array)
      expect(methods.length).toBeGreaterThan(0)

      const pingMethod = methods.find((m) => m.name === 'system.ping')
      expect(pingMethod).toBeDefined()
      expect(pingMethod?.requiresAuth).toBe(false)
    })
  })

  describe('execute', () => {
    it('should execute system.ping without auth', async () => {
      const result = await service.execute('system.ping')

      expect(result).toHaveProperty('pong', true)
      expect(result).toHaveProperty('timestamp')
    })

    it('should execute system.info without auth', async () => {
      const result = await service.execute('system.info')

      expect(result).toHaveProperty('service', 'rpc')
      expect(result).toHaveProperty('version', '0.1.0')
      expect(result).toHaveProperty('protocol', 'capnweb')
    })

    it('should throw error for non-existent method', async () => {
      await expect(service.execute('invalid.method')).rejects.toThrow('Method not found')
    })

    it('should require auth for protected methods', async () => {
      await expect(service.execute('auth.whoami')).rejects.toThrow('Authentication required')
    })

    it('should execute auth.whoami with valid token', async () => {
      const result = await service.execute('auth.whoami', {}, 'valid-token')

      expect(result).toHaveProperty('userId', 'user-123')
      expect(result).toHaveProperty('email', 'test@example.com')
    })

    it('should proxy db.get to DB_SERVICE', async () => {
      const result = await service.execute('db.get', { ns: 'test', id: 'entity-1' }, 'valid-token')

      expect(env.DB_SERVICE.get).toHaveBeenCalledWith('test', 'entity-1')
      expect(result).toHaveProperty('id', 'entity-1')
      expect(result).toHaveProperty('type', 'Thing')
    })
  })
})
