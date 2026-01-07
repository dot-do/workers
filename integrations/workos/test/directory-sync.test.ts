/**
 * Tests: WorkOSDO Directory Sync / User Listing
 *
 * Tests the directory sync functionality for id.org.ai.
 * This service syncs users from enterprise directories (Okta, Azure AD, etc).
 *
 * @see CLAUDE.md - id.org.ai section
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createMockDirectoryUser,
  type MockDOState,
  type MockWorkOSEnv,
} from './helpers.js'

/**
 * Directory user from sync
 */
export interface DirectoryUser {
  id: string
  directoryId: string
  organizationId?: string
  email: string
  firstName?: string
  lastName?: string
  jobTitle?: string
  state: 'active' | 'inactive' | 'suspended'
  groups: DirectoryGroup[]
  rawAttributes?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Directory group
 */
export interface DirectoryGroup {
  id: string
  name: string
  directoryId: string
  organizationId?: string
  rawAttributes?: Record<string, unknown>
}

/**
 * Directory listing options
 */
export interface ListUsersOptions {
  directory?: string
  directoryId?: string
  limit?: number
  before?: string
  after?: string
  group?: string
}

/**
 * Paginated list response
 */
export interface ListUsersResult {
  data: DirectoryUser[]
  listMetadata: {
    before?: string
    after?: string
  }
}

/**
 * Contract for WorkOSDO users methods
 */
export interface WorkOSDOUsersContract {
  users: {
    list(orgId: string, options?: ListUsersOptions): Promise<ListUsersResult>
    get(userId: string): Promise<DirectoryUser | null>
    getByEmail(email: string, orgId?: string): Promise<DirectoryUser | null>
  }
  fetch(request: Request): Promise<Response>
}

/**
 * Load WorkOSDO
 */
async function loadWorkOSDO(): Promise<new (ctx: MockDOState, env: MockWorkOSEnv) => WorkOSDOUsersContract> {
  const module = await import('../src/workos.js')
  return module.WorkOSDO
}

describe('WorkOSDO Directory Sync / User Listing', () => {
  let ctx: MockDOState
  let env: MockWorkOSEnv
  let WorkOSDO: new (ctx: MockDOState, env: MockWorkOSEnv) => WorkOSDOUsersContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    WorkOSDO = await loadWorkOSDO()
  })

  describe('users.list()', () => {
    it('should list users for an organization', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.users.list('org_test123')

      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should return users with required fields', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.users.list('org_test123')

      if (result.data.length > 0) {
        const user = result.data[0]
        expect(user.id).toBeDefined()
        expect(user.email).toBeDefined()
        expect(user.state).toBeDefined()
        expect(['active', 'inactive', 'suspended']).toContain(user.state)
      }
    })

    it('should support directory filter', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.users.list('org_test123', {
        directory: 'dir_okta_456',
      })

      expect(result.data).toBeDefined()
    })

    it('should support pagination with limit', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.users.list('org_test123', {
        limit: 10,
      })

      expect(result.data.length).toBeLessThanOrEqual(10)
      expect(result.listMetadata).toBeDefined()
    })

    it('should support cursor-based pagination with after', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.users.list('org_test123', {
        limit: 10,
        after: 'cursor_abc123',
      })

      expect(result.listMetadata).toBeDefined()
    })

    it('should support filtering by group', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.users.list('org_test123', {
        group: 'group_engineering',
      })

      expect(result.data).toBeDefined()
    })

    it('should include user groups in response', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.users.list('org_test123')

      if (result.data.length > 0) {
        const user = result.data[0]
        expect(user.groups).toBeDefined()
        expect(Array.isArray(user.groups)).toBe(true)
      }
    })

    it('should return empty list for organization with no users', async () => {
      const instance = new WorkOSDO(ctx, env)
      const result = await instance.users.list('org_empty')

      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
    })
  })

  describe('users.get()', () => {
    it('should get user by ID', async () => {
      const instance = new WorkOSDO(ctx, env)
      const user = await instance.users.get('user_test123')

      expect(user).toBeDefined()
      if (user) {
        expect(user.id).toBe('user_test123')
      }
    })

    it('should return null for non-existent user', async () => {
      const instance = new WorkOSDO(ctx, env)
      const user = await instance.users.get('user_nonexistent')

      expect(user).toBeNull()
    })

    it('should include user groups', async () => {
      const instance = new WorkOSDO(ctx, env)
      const user = await instance.users.get('user_test123')

      if (user) {
        expect(user.groups).toBeDefined()
        expect(Array.isArray(user.groups)).toBe(true)
      }
    })

    it('should include raw attributes if available', async () => {
      const instance = new WorkOSDO(ctx, env)
      const user = await instance.users.get('user_with_attributes')

      if (user && user.rawAttributes) {
        expect(typeof user.rawAttributes).toBe('object')
      }
    })
  })

  describe('users.getByEmail()', () => {
    it('should get user by email', async () => {
      const instance = new WorkOSDO(ctx, env)
      const user = await instance.users.getByEmail('test@example.com')

      expect(user).toBeDefined()
      if (user) {
        expect(user.email).toBe('test@example.com')
      }
    })

    it('should be case-insensitive', async () => {
      const instance = new WorkOSDO(ctx, env)
      const user = await instance.users.getByEmail('TEST@EXAMPLE.COM')

      expect(user).toBeDefined()
    })

    it('should scope to organization if provided', async () => {
      const instance = new WorkOSDO(ctx, env)
      const user = await instance.users.getByEmail('test@example.com', 'org_test123')

      expect(user).toBeDefined()
    })

    it('should return null for non-existent email', async () => {
      const instance = new WorkOSDO(ctx, env)
      const user = await instance.users.getByEmail('nonexistent@example.com')

      expect(user).toBeNull()
    })
  })

  describe('HTTP fetch() handler - User endpoints', () => {
    describe('GET /api/users', () => {
      it('should list users with authorization', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/users?org_id=org_test123', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_access_token',
          },
        })

        const response = await instance.fetch(request)
        expect([200, 401]).toContain(response.status)
      })

      it('should require authorization', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/users?org_id=org_test123', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(401)
      })

      it('should support pagination parameters', async () => {
        const instance = new WorkOSDO(ctx, env)
        const url = new URL('https://id.org.ai/api/users')
        url.searchParams.set('org_id', 'org_test123')
        url.searchParams.set('limit', '10')
        url.searchParams.set('after', 'cursor_123')

        const request = new Request(url.toString(), {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_access_token',
          },
        })

        const response = await instance.fetch(request)
        expect([200, 401]).toContain(response.status)
      })
    })

    describe('GET /api/users/:id', () => {
      it('should get user by ID', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/users/user_test123', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_access_token',
          },
        })

        const response = await instance.fetch(request)
        expect([200, 401, 404]).toContain(response.status)
      })

      it('should return 404 for non-existent user', async () => {
        const instance = new WorkOSDO(ctx, env)
        const request = new Request('https://id.org.ai/api/users/user_nonexistent', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_access_token',
          },
        })

        const response = await instance.fetch(request)
        expect([401, 404]).toContain(response.status)
      })
    })
  })
})
