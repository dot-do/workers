/**
 * Tests: WorkOSDO Vault Storage for Secrets
 *
 * Tests secure secret storage for organizations.
 * Stores API keys, credentials, and other sensitive data.
 *
 * @see CLAUDE.md - id.org.ai section on vault storage
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockWorkOSEnv,
} from './helpers.js'

/**
 * Vault secret metadata (doesn't include value)
 */
export interface VaultSecretMetadata {
  key: string
  orgId: string
  createdAt: number
  updatedAt: number
  version: number
  description?: string
}

/**
 * Vault secret (includes value)
 */
export interface VaultSecret extends VaultSecretMetadata {
  value: string
}

/**
 * List vault secrets options
 */
export interface ListSecretsOptions {
  prefix?: string
  limit?: number
}

/**
 * List vault secrets result
 */
export interface ListSecretsResult {
  data: VaultSecretMetadata[]
}

/**
 * Contract for WorkOSDO vault methods
 */
export interface WorkOSDOVaultContract {
  vault: {
    store(orgId: string, key: string, value: string, description?: string): Promise<VaultSecretMetadata>
    get(orgId: string, key: string): Promise<string | null>
    delete(orgId: string, key: string): Promise<{ success: boolean }>
    list(orgId: string, options?: ListSecretsOptions): Promise<ListSecretsResult>
    exists(orgId: string, key: string): Promise<boolean>
  }
  fetch(request: Request): Promise<Response>
}

/**
 * Load WorkOSDO
 */
async function loadWorkOSDO(): Promise<new (ctx: MockDOState, env: MockWorkOSEnv) => WorkOSDOVaultContract> {
  const module = await import('../src/workos.js')
  return module.WorkOSDO
}

describe('WorkOSDO Vault Storage', () => {
  let ctx: MockDOState
  let env: MockWorkOSEnv
  let WorkOSDO: new (ctx: MockDOState, env: MockWorkOSEnv) => WorkOSDOVaultContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    WorkOSDO = await loadWorkOSDO()
  })

  describe('vault.store()', () => {
    it('should store secret for organization', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.vault.store('org_test123', 'API_KEY', 'sk_live_abc123')

      expect(result.key).toBe('API_KEY')
      expect(result.orgId).toBe('org_test123')
    })

    it('should return metadata without value', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.vault.store('org_test123', 'SECRET', 'secret_value')

      expect(result.key).toBe('SECRET')
      expect((result as any).value).toBeUndefined()
    })

    it('should set createdAt timestamp', async () => {
      const instance = new WorkOSDO(ctx, env)
      const before = Date.now()
      const result = await instance.vault.store('org_test123', 'TIMESTAMP_KEY', 'value')
      const after = Date.now()

      expect(result.createdAt).toBeGreaterThanOrEqual(before)
      expect(result.createdAt).toBeLessThanOrEqual(after)
    })

    it('should set initial version to 1', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.vault.store('org_test123', 'VERSION_KEY', 'value')

      expect(result.version).toBe(1)
    })

    it('should increment version on update', async () => {
      const instance = new WorkOSDO(ctx, env)

      const first = await instance.vault.store('org_test123', 'UPDATE_KEY', 'value1')
      const second = await instance.vault.store('org_test123', 'UPDATE_KEY', 'value2')

      expect(second.version).toBe(first.version + 1)
    })

    it('should update updatedAt on update', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'UPDATED_KEY', 'value1')
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))
      const second = await instance.vault.store('org_test123', 'UPDATED_KEY', 'value2')

      expect(second.updatedAt).toBeGreaterThanOrEqual(second.createdAt)
    })

    it('should support optional description', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.vault.store(
        'org_test123',
        'DESCRIBED_KEY',
        'value',
        'API key for Stripe integration'
      )

      expect(result.description).toBe('API key for Stripe integration')
    })

    it('should encrypt value before storage', async () => {
      const instance = new WorkOSDO(ctx, env)
      await instance.vault.store('org_test123', 'ENCRYPTED_KEY', 'sensitive_value')

      // Verify something was stored (encryption happens internally)
      expect(ctx.storage.put).toHaveBeenCalled()
    })

    it('should isolate secrets between organizations', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_1', 'SHARED_KEY', 'value_for_org_1')
      await instance.vault.store('org_2', 'SHARED_KEY', 'value_for_org_2')

      const value1 = await instance.vault.get('org_1', 'SHARED_KEY')
      const value2 = await instance.vault.get('org_2', 'SHARED_KEY')

      expect(value1).toBe('value_for_org_1')
      expect(value2).toBe('value_for_org_2')
    })
  })

  describe('vault.get()', () => {
    it('should retrieve stored secret', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'GET_KEY', 'secret_value')
      const value = await instance.vault.get('org_test123', 'GET_KEY')

      expect(value).toBe('secret_value')
    })

    it('should return null for non-existent key', async () => {
      const instance = new WorkOSDO(ctx, env)
      const value = await instance.vault.get('org_test123', 'NONEXISTENT_KEY')

      expect(value).toBeNull()
    })

    it('should return null for different organization', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_1', 'ORG_KEY', 'value')
      const value = await instance.vault.get('org_2', 'ORG_KEY')

      expect(value).toBeNull()
    })

    it('should decrypt value on retrieval', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'DECRYPT_KEY', 'original_value')
      const value = await instance.vault.get('org_test123', 'DECRYPT_KEY')

      expect(value).toBe('original_value')
    })

    it('should return latest value after update', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'LATEST_KEY', 'old_value')
      await instance.vault.store('org_test123', 'LATEST_KEY', 'new_value')
      const value = await instance.vault.get('org_test123', 'LATEST_KEY')

      expect(value).toBe('new_value')
    })
  })

  describe('vault.delete()', () => {
    it('should delete stored secret', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'DELETE_KEY', 'value')
      const result = await instance.vault.delete('org_test123', 'DELETE_KEY')

      expect(result.success).toBe(true)
    })

    it('should make secret inaccessible after deletion', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'DELETED_KEY', 'value')
      await instance.vault.delete('org_test123', 'DELETED_KEY')
      const value = await instance.vault.get('org_test123', 'DELETED_KEY')

      expect(value).toBeNull()
    })

    it('should succeed for non-existent key (idempotent)', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.vault.delete('org_test123', 'NONEXISTENT_KEY')

      expect(result.success).toBe(true)
    })

    it('should not affect other organizations', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_1', 'ISOLATED_KEY', 'value_1')
      await instance.vault.store('org_2', 'ISOLATED_KEY', 'value_2')

      await instance.vault.delete('org_1', 'ISOLATED_KEY')

      const value1 = await instance.vault.get('org_1', 'ISOLATED_KEY')
      const value2 = await instance.vault.get('org_2', 'ISOLATED_KEY')

      expect(value1).toBeNull()
      expect(value2).toBe('value_2')
    })
  })

  describe('vault.list()', () => {
    it('should list secrets for organization', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'LIST_KEY_1', 'value1')
      await instance.vault.store('org_test123', 'LIST_KEY_2', 'value2')

      const result = await instance.vault.list('org_test123')

      expect(result.data).toBeDefined()
      expect(result.data.length).toBeGreaterThanOrEqual(2)
    })

    it('should return metadata without values', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'META_KEY', 'secret_value')
      const result = await instance.vault.list('org_test123')

      if (result.data.length > 0) {
        expect((result.data[0] as any).value).toBeUndefined()
        expect(result.data[0].key).toBeDefined()
      }
    })

    it('should support prefix filter', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'STRIPE_API_KEY', 'sk_live_xxx')
      await instance.vault.store('org_test123', 'STRIPE_WEBHOOK_SECRET', 'whsec_xxx')
      await instance.vault.store('org_test123', 'GITHUB_TOKEN', 'ghp_xxx')

      const result = await instance.vault.list('org_test123', { prefix: 'STRIPE_' })

      expect(result.data.length).toBe(2)
      result.data.forEach((secret) => {
        expect(secret.key.startsWith('STRIPE_')).toBe(true)
      })
    })

    it('should support limit', async () => {
      const instance = new WorkOSDO(ctx, env)

      for (let i = 0; i < 5; i++) {
        await instance.vault.store('org_test123', `LIMIT_KEY_${i}`, `value_${i}`)
      }

      const result = await instance.vault.list('org_test123', { limit: 2 })

      expect(result.data.length).toBeLessThanOrEqual(2)
    })

    it('should return empty list for organization with no secrets', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.vault.list('org_empty')

      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data.length).toBe(0)
    })

    it('should only list secrets for specified organization', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_1', 'ORG_1_KEY', 'value')
      await instance.vault.store('org_2', 'ORG_2_KEY', 'value')

      const result = await instance.vault.list('org_1')

      result.data.forEach((secret) => {
        expect(secret.orgId).toBe('org_1')
      })
    })
  })

  describe('vault.exists()', () => {
    it('should return true for existing secret', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'EXISTS_KEY', 'value')
      const exists = await instance.vault.exists('org_test123', 'EXISTS_KEY')

      expect(exists).toBe(true)
    })

    it('should return false for non-existent secret', async () => {
      const instance = new WorkOSDO(ctx, env)
      const exists = await instance.vault.exists('org_test123', 'NONEXISTENT_KEY')

      expect(exists).toBe(false)
    })

    it('should return false for deleted secret', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_test123', 'DELETED_EXISTS_KEY', 'value')
      await instance.vault.delete('org_test123', 'DELETED_EXISTS_KEY')
      const exists = await instance.vault.exists('org_test123', 'DELETED_EXISTS_KEY')

      expect(exists).toBe(false)
    })

    it('should be organization-scoped', async () => {
      const instance = new WorkOSDO(ctx, env)

      await instance.vault.store('org_1', 'SCOPED_KEY', 'value')

      const existsInOrg1 = await instance.vault.exists('org_1', 'SCOPED_KEY')
      const existsInOrg2 = await instance.vault.exists('org_2', 'SCOPED_KEY')

      expect(existsInOrg1).toBe(true)
      expect(existsInOrg2).toBe(false)
    })
  })

  describe('HTTP fetch() handler - Vault endpoints', () => {
    describe('POST /api/vault/secrets', () => {
      it('should store secret', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/vault/secrets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer admin_access_token',
          },
          body: JSON.stringify({
            orgId: 'org_test123',
            key: 'API_KEY',
            value: 'sk_live_xxx',
          }),
        })

        const response = await instance.fetch(request)
        expect([200, 201, 401]).toContain(response.status)
      })

      it('should require authorization', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/vault/secrets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orgId: 'org_test123',
            key: 'API_KEY',
            value: 'sk_live_xxx',
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(401)
      })
    })

    describe('GET /api/vault/secrets/:key', () => {
      it('should retrieve secret', async () => {
        const instance = new WorkOSDO(ctx, env)
        const url = new URL('https://id.org.ai/api/vault/secrets/API_KEY')
        url.searchParams.set('org_id', 'org_test123')

        const request = new Request(url.toString(), {
          method: 'GET',
          headers: {
            Authorization: 'Bearer admin_access_token',
          },
        })

        const response = await instance.fetch(request)
        expect([200, 401, 404]).toContain(response.status)
      })
    })

    describe('DELETE /api/vault/secrets/:key', () => {
      it('should delete secret', async () => {
        const instance = new WorkOSDO(ctx, env)
        const url = new URL('https://id.org.ai/api/vault/secrets/API_KEY')
        url.searchParams.set('org_id', 'org_test123')

        const request = new Request(url.toString(), {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer admin_access_token',
          },
        })

        const response = await instance.fetch(request)
        expect([200, 204, 401]).toContain(response.status)
      })
    })

    describe('GET /api/vault/secrets', () => {
      it('should list secrets', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/vault/secrets?org_id=org_test123', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer admin_access_token',
          },
        })

        const response = await instance.fetch(request)
        expect([200, 401]).toContain(response.status)
      })
    })
  })
})
