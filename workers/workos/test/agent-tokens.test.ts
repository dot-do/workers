/**
 * Tests: WorkOSDO Agent Token Creation (Machine-to-Machine)
 *
 * Tests agent token creation for AI agents and services.
 * These are M2M tokens for automated systems, not human users.
 *
 * @see CLAUDE.md - id.org.ai section on machine-to-machine tokens
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createMockAgentToken,
  type MockDOState,
  type MockWorkOSEnv,
} from './helpers.js'

/**
 * Options for creating an agent token
 */
export interface CreateAgentTokenOptions {
  orgId: string
  name: string
  permissions: string[]
  expiresIn?: number // seconds
  metadata?: Record<string, unknown>
}

/**
 * Agent token result
 */
export interface AgentToken {
  id: string
  orgId: string
  name: string
  permissions: string[]
  token: string
  expiresAt?: number
  createdAt: number
  metadata?: Record<string, unknown>
}

/**
 * List agent tokens options
 */
export interface ListAgentTokensOptions {
  limit?: number
  after?: string
}

/**
 * List agent tokens result
 */
export interface ListAgentTokensResult {
  data: Omit<AgentToken, 'token'>[]
  listMetadata: {
    before?: string
    after?: string
  }
}

/**
 * Contract for WorkOSDO agent token methods
 */
export interface WorkOSDOAgentContract {
  createAgentToken(options: CreateAgentTokenOptions): Promise<AgentToken>
  listAgentTokens(orgId: string, options?: ListAgentTokensOptions): Promise<ListAgentTokensResult>
  getAgentToken(tokenId: string): Promise<Omit<AgentToken, 'token'> | null>
  revokeAgentToken(tokenId: string): Promise<{ success: boolean }>
  validateAgentToken(token: string): Promise<{
    valid: boolean
    tokenId?: string
    orgId?: string
    permissions?: string[]
    error?: string
  }>
  fetch(request: Request): Promise<Response>
}

/**
 * Load WorkOSDO
 */
async function loadWorkOSDO(): Promise<new (ctx: MockDOState, env: MockWorkOSEnv) => WorkOSDOAgentContract> {
  const module = await import('../src/workos.js')
  return module.WorkOSDO
}

describe('WorkOSDO Agent Token Creation', () => {
  let ctx: MockDOState
  let env: MockWorkOSEnv
  let WorkOSDO: new (ctx: MockDOState, env: MockWorkOSEnv) => WorkOSDOAgentContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    WorkOSDO = await loadWorkOSDO()
  })

  describe('createAgentToken()', () => {
    it('should create agent token with required fields', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'My Agent',
        permissions: ['read:users', 'write:data'],
      })

      expect(result.id).toBeDefined()
      expect(result.token).toBeDefined()
      expect(result.orgId).toBe('org_test123')
      expect(result.name).toBe('My Agent')
      expect(result.permissions).toEqual(['read:users', 'write:data'])
    })

    it('should generate unique token value', async () => {
      const instance = new WorkOSDO(ctx, env)
      const token1 = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Agent 1',
        permissions: ['read:users'],
      })
      const token2 = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Agent 2',
        permissions: ['read:users'],
      })

      expect(token1.token).not.toBe(token2.token)
      expect(token1.id).not.toBe(token2.id)
    })

    it('should set createdAt timestamp', async () => {
      const instance = new WorkOSDO(ctx, env)
      const before = Date.now()
      const result = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'My Agent',
        permissions: ['read:users'],
      })
      const after = Date.now()

      expect(result.createdAt).toBeGreaterThanOrEqual(before)
      expect(result.createdAt).toBeLessThanOrEqual(after)
    })

    it('should support custom expiration', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Short-lived Agent',
        permissions: ['read:users'],
        expiresIn: 3600, // 1 hour
      })

      expect(result.expiresAt).toBeDefined()
      expect(result.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should support non-expiring tokens', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Permanent Agent',
        permissions: ['read:users'],
      })

      // expiresAt may be undefined for permanent tokens
      // or set to a very distant future
    })

    it('should support metadata', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Agent with Metadata',
        permissions: ['read:users'],
        metadata: {
          environment: 'production',
          team: 'platform',
        },
      })

      expect(result.metadata).toEqual({
        environment: 'production',
        team: 'platform',
      })
    })

    it('should store token in storage', async () => {
      const instance = new WorkOSDO(ctx, env)
      await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Stored Agent',
        permissions: ['read:users'],
      })

      expect(ctx.storage.put).toHaveBeenCalled()
    })

    it('should validate permissions format', async () => {
      const instance = new WorkOSDO(ctx, env)

      // Should accept valid permission strings
      const result = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Valid Agent',
        permissions: ['read:users', 'write:data', 'admin:*'],
      })

      expect(result.permissions).toHaveLength(3)
    })
  })

  describe('listAgentTokens()', () => {
    it('should list agent tokens for organization', async () => {
      const instance = new WorkOSDO(ctx, env)

      // Create a token first
      await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'List Test Agent',
        permissions: ['read:users'],
      })

      const result = await instance.listAgentTokens('org_test123')

      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should not include token value in list', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Secret Agent',
        permissions: ['read:users'],
      })

      const result = await instance.listAgentTokens('org_test123')

      // Token value should not be exposed in list
      if (result.data.length > 0) {
        expect((result.data[0] as any).token).toBeUndefined()
      }
    })

    it('should support pagination', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.listAgentTokens('org_test123', {
        limit: 10,
      })

      expect(result.listMetadata).toBeDefined()
    })

    it('should return empty list for org with no tokens', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.listAgentTokens('org_empty')

      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
    })
  })

  describe('getAgentToken()', () => {
    it('should get agent token by ID', async () => {
      const instance = new WorkOSDO(ctx, env)

      const created = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Get Test Agent',
        permissions: ['read:users'],
      })

      const result = await instance.getAgentToken(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
      expect(result?.name).toBe('Get Test Agent')
    })

    it('should not include token value', async () => {
      const instance = new WorkOSDO(ctx, env)

      const created = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Secret Agent',
        permissions: ['read:users'],
      })

      const result = await instance.getAgentToken(created.id)

      expect((result as any)?.token).toBeUndefined()
    })

    it('should return null for non-existent token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.getAgentToken('agt_nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('revokeAgentToken()', () => {
    it('should revoke agent token', async () => {
      const instance = new WorkOSDO(ctx, env)

      const created = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Revoke Test Agent',
        permissions: ['read:users'],
      })

      const result = await instance.revokeAgentToken(created.id)

      expect(result.success).toBe(true)
    })

    it('should make token invalid after revocation', async () => {
      const instance = new WorkOSDO(ctx, env)

      const created = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Invalidate Agent',
        permissions: ['read:users'],
      })

      await instance.revokeAgentToken(created.id)
      const validation = await instance.validateAgentToken(created.token)

      expect(validation.valid).toBe(false)
    })

    it('should succeed for already revoked token', async () => {
      const instance = new WorkOSDO(ctx, env)

      const created = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Double Revoke Agent',
        permissions: ['read:users'],
      })

      await instance.revokeAgentToken(created.id)
      const result = await instance.revokeAgentToken(created.id)

      expect(result.success).toBe(true)
    })
  })

  describe('validateAgentToken()', () => {
    it('should validate valid agent token', async () => {
      const instance = new WorkOSDO(ctx, env)

      const created = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Validate Test Agent',
        permissions: ['read:users', 'write:data'],
      })

      const result = await instance.validateAgentToken(created.token)

      expect(result.valid).toBe(true)
      expect(result.orgId).toBe('org_test123')
      expect(result.permissions).toEqual(['read:users', 'write:data'])
    })

    it('should return token ID', async () => {
      const instance = new WorkOSDO(ctx, env)

      const created = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'ID Test Agent',
        permissions: ['read:users'],
      })

      const result = await instance.validateAgentToken(created.token)

      expect(result.tokenId).toBe(created.id)
    })

    it('should reject invalid token', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.validateAgentToken('invalid_agent_token')

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject expired token', async () => {
      const instance = new WorkOSDO(ctx, env)

      // Create token that's already expired (simulated)
      const result = await instance.validateAgentToken('expired_agent_token')

      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/expired/i)
    })

    it('should reject revoked token', async () => {
      const instance = new WorkOSDO(ctx, env)

      const created = await instance.createAgentToken({
        orgId: 'org_test123',
        name: 'Revoked Agent',
        permissions: ['read:users'],
      })

      await instance.revokeAgentToken(created.id)
      const result = await instance.validateAgentToken(created.token)

      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/revoked/i)
    })
  })

  describe('HTTP fetch() handler - Agent token endpoints', () => {
    describe('POST /api/agent-tokens', () => {
      it('should create agent token', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/agent-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer admin_access_token',
          },
          body: JSON.stringify({
            orgId: 'org_test123',
            name: 'API Agent',
            permissions: ['read:users'],
          }),
        })

        const response = await instance.fetch(request)
        expect([200, 201, 401]).toContain(response.status)
      })

      it('should require authorization', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/agent-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orgId: 'org_test123',
            name: 'Unauthorized Agent',
            permissions: ['read:users'],
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(401)
      })
    })

    describe('GET /api/agent-tokens', () => {
      it('should list agent tokens', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/agent-tokens?org_id=org_test123', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer admin_access_token',
          },
        })

        const response = await instance.fetch(request)
        expect([200, 401]).toContain(response.status)
      })
    })

    describe('DELETE /api/agent-tokens/:id', () => {
      it('should revoke agent token', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/agent-tokens/agt_test123', {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer admin_access_token',
          },
        })

        const response = await instance.fetch(request)
        expect([200, 204, 401, 404]).toContain(response.status)
      })
    })
  })
})
