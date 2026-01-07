/**
 * RED Tests: oauth.do WorkOS AuthKit Integration
 *
 * These tests define the contract for the oauth.do worker's WorkOS integration.
 * The OAuthDO must properly integrate with WorkOS AuthKit for authentication.
 *
 * Per ARCHITECTURE.md:
 * - oauth.do implements WorkOS AuthKit integration
 * - Handles SSO, MFA, and user management via WorkOS
 * - Extends slim DO core
 *
 * RED PHASE: These tests MUST FAIL because OAuthDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-6ebr).
 *
 * @see ARCHITECTURE.md lines 984, 1148-1153, 1340
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createMockUser,
  createMockSession,
  type MockDOState,
  type MockOAuthEnv,
} from './helpers.js'

/**
 * Interface definition for OAuthDO WorkOS integration
 */
export interface OAuthDOWorkOSContract {
  // SSO via WorkOS
  getSSOAuthorizationUrl(options: SSOOptions): Promise<SSOAuthResult>
  handleSSOCallback(code: string): Promise<SSOCallbackResult>

  // Organization management
  getOrganization(organizationId: string): Promise<Organization | null>
  listUserOrganizations(userId: string): Promise<Organization[]>

  // Connection management (SSO providers)
  getConnection(connectionId: string): Promise<SSOConnection | null>
  listOrganizationConnections(organizationId: string): Promise<SSOConnection[]>

  // Directory sync (if enabled)
  syncDirectory(directoryId: string): Promise<DirectorySyncResult>

  // HTTP fetch handler
  fetch(request: Request): Promise<Response>
}

export interface SSOOptions {
  connectionId?: string
  organizationId?: string
  domainHint?: string
  loginHint?: string
  state?: string
  redirectUri?: string
}

export interface SSOAuthResult {
  url: string
  state: string
}

export interface SSOCallbackResult {
  success: boolean
  profile?: SSOProfile
  session?: {
    id: string
    accessToken: string
    expiresAt: number
  }
  error?: string
}

export interface SSOProfile {
  id: string
  idpId: string
  email: string
  firstName?: string
  lastName?: string
  groups?: string[]
  rawAttributes?: Record<string, unknown>
  connectionId: string
  connectionType: string
  organizationId?: string
}

export interface Organization {
  id: string
  name: string
  allowProfilesOutsideOrganization: boolean
  domains: OrganizationDomain[]
  createdAt: string
  updatedAt: string
}

export interface OrganizationDomain {
  id: string
  domain: string
  state: 'verified' | 'pending'
}

export interface SSOConnection {
  id: string
  name: string
  connectionType: string
  state: 'active' | 'inactive' | 'draft'
  organizationId: string
  domains: string[]
  createdAt: string
  updatedAt: string
}

export interface DirectorySyncResult {
  success: boolean
  usersUpdated: number
  groupsUpdated: number
  error?: string
}

/**
 * Attempt to load OAuthDO - this will fail in RED phase
 */
async function loadOAuthDO(): Promise<new (ctx: MockDOState, env: MockOAuthEnv) => OAuthDOWorkOSContract> {
  const module = await import('../src/oauth.js')
  return module.OAuthDO
}

describe('OAuthDO WorkOS AuthKit Integration', () => {
  let ctx: MockDOState
  let env: MockOAuthEnv
  let OAuthDO: new (ctx: MockDOState, env: MockOAuthEnv) => OAuthDOWorkOSContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    OAuthDO = await loadOAuthDO()
  })

  describe('SSO Authentication', () => {
    describe('getSSOAuthorizationUrl()', () => {
      it('should generate SSO authorization URL with connection ID', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getSSOAuthorizationUrl({
          connectionId: 'conn_test123',
        })

        expect(result.url).toBeDefined()
        expect(result.url).toContain('https://')
        expect(result.state).toBeDefined()
      })

      it('should generate SSO authorization URL with organization ID', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getSSOAuthorizationUrl({
          organizationId: 'org_test123',
        })

        expect(result.url).toBeDefined()
        expect(result.state).toBeDefined()
      })

      it('should support domain hint for automatic IdP selection', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getSSOAuthorizationUrl({
          domainHint: 'acme.com',
        })

        expect(result.url).toBeDefined()
      })

      it('should support login hint for pre-filling email', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getSSOAuthorizationUrl({
          loginHint: 'user@acme.com',
        })

        expect(result.url).toBeDefined()
      })

      it('should include custom state parameter', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getSSOAuthorizationUrl({
          connectionId: 'conn_test',
          state: 'custom-state-value',
        })

        expect(result.state).toBe('custom-state-value')
      })

      it('should support custom redirect URI', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.getSSOAuthorizationUrl({
          connectionId: 'conn_test',
          redirectUri: 'https://myapp.com/sso/callback',
        })

        expect(result.url).toBeDefined()
      })
    })

    describe('handleSSOCallback()', () => {
      it('should exchange SSO code for profile', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.handleSSOCallback('sso_code_123')

        expect(result.success).toBe(true)
        expect(result.profile).toBeDefined()
      })

      it('should return SSO profile with user details', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.handleSSOCallback('sso_code_123')

        expect(result.profile?.id).toBeDefined()
        expect(result.profile?.email).toBeDefined()
        expect(result.profile?.connectionId).toBeDefined()
        expect(result.profile?.connectionType).toBeDefined()
      })

      it('should include IdP groups if available', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.handleSSOCallback('sso_code_with_groups')

        if (result.profile?.groups) {
          expect(Array.isArray(result.profile.groups)).toBe(true)
        }
      })

      it('should include raw IdP attributes', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.handleSSOCallback('sso_code_123')

        expect(result.profile?.rawAttributes).toBeDefined()
      })

      it('should create session after successful SSO', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.handleSSOCallback('sso_code_123')

        expect(result.session).toBeDefined()
        expect(result.session?.accessToken).toBeDefined()
        expect(result.session?.expiresAt).toBeGreaterThan(Date.now())
      })

      it('should reject invalid SSO code', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.handleSSOCallback('invalid_code')

        expect(result.success).toBe(false)
        expect(result.error).toMatch(/invalid|expired|code/i)
      })
    })
  })

  describe('Organization Management', () => {
    describe('getOrganization()', () => {
      it('should return organization by ID', async () => {
        const instance = new OAuthDO(ctx, env)
        const org = await instance.getOrganization('org_test123')

        expect(org).not.toBeNull()
        expect(org?.id).toBe('org_test123')
        expect(org?.name).toBeDefined()
      })

      it('should return null for non-existent organization', async () => {
        const instance = new OAuthDO(ctx, env)
        const org = await instance.getOrganization('org_nonexistent')

        expect(org).toBeNull()
      })

      it('should include organization domains', async () => {
        const instance = new OAuthDO(ctx, env)
        const org = await instance.getOrganization('org_test123')

        expect(org?.domains).toBeDefined()
        expect(Array.isArray(org?.domains)).toBe(true)
      })
    })

    describe('listUserOrganizations()', () => {
      it('should return organizations for user', async () => {
        const instance = new OAuthDO(ctx, env)
        const orgs = await instance.listUserOrganizations('user_test123')

        expect(Array.isArray(orgs)).toBe(true)
      })

      it('should return empty array for user with no organizations', async () => {
        const instance = new OAuthDO(ctx, env)
        const orgs = await instance.listUserOrganizations('user_no_orgs')

        expect(orgs).toEqual([])
      })
    })
  })

  describe('Connection Management', () => {
    describe('getConnection()', () => {
      it('should return SSO connection by ID', async () => {
        const instance = new OAuthDO(ctx, env)
        const conn = await instance.getConnection('conn_test123')

        expect(conn).not.toBeNull()
        expect(conn?.id).toBe('conn_test123')
        expect(conn?.connectionType).toBeDefined()
      })

      it('should return null for non-existent connection', async () => {
        const instance = new OAuthDO(ctx, env)
        const conn = await instance.getConnection('conn_nonexistent')

        expect(conn).toBeNull()
      })

      it('should include connection state', async () => {
        const instance = new OAuthDO(ctx, env)
        const conn = await instance.getConnection('conn_test123')

        expect(conn?.state).toBeDefined()
        expect(['active', 'inactive', 'draft']).toContain(conn?.state)
      })
    })

    describe('listOrganizationConnections()', () => {
      it('should return connections for organization', async () => {
        const instance = new OAuthDO(ctx, env)
        const conns = await instance.listOrganizationConnections('org_test123')

        expect(Array.isArray(conns)).toBe(true)
      })

      it('should return empty array for organization with no connections', async () => {
        const instance = new OAuthDO(ctx, env)
        const conns = await instance.listOrganizationConnections('org_no_connections')

        expect(conns).toEqual([])
      })
    })
  })

  describe('Directory Sync', () => {
    describe('syncDirectory()', () => {
      it('should sync directory and return stats', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.syncDirectory('dir_test123')

        expect(result.success).toBe(true)
        expect(result.usersUpdated).toBeDefined()
        expect(result.groupsUpdated).toBeDefined()
      })

      it('should return error for invalid directory', async () => {
        const instance = new OAuthDO(ctx, env)
        const result = await instance.syncDirectory('dir_invalid')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('HTTP fetch() handler - WorkOS endpoints', () => {
    describe('GET /sso/authorize', () => {
      it('should redirect to SSO authorization', async () => {
        const instance = new OAuthDO(ctx, env)
        const url = new URL('https://oauth.do/sso/authorize')
        url.searchParams.set('connection_id', 'conn_test123')

        const request = new Request(url.toString(), { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(302)
        expect(response.headers.get('Location')).toBeDefined()
      })

      it('should support organization_id parameter', async () => {
        const instance = new OAuthDO(ctx, env)
        const url = new URL('https://oauth.do/sso/authorize')
        url.searchParams.set('organization_id', 'org_test123')

        const request = new Request(url.toString(), { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(302)
      })

      it('should support domain parameter for automatic IdP selection', async () => {
        const instance = new OAuthDO(ctx, env)
        const url = new URL('https://oauth.do/sso/authorize')
        url.searchParams.set('domain', 'acme.com')

        const request = new Request(url.toString(), { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(302)
      })
    })

    describe('GET /sso/callback', () => {
      it('should handle SSO callback and create session', async () => {
        const instance = new OAuthDO(ctx, env)
        const url = new URL('https://oauth.do/sso/callback')
        url.searchParams.set('code', 'sso_code_123')

        const request = new Request(url.toString(), { method: 'GET' })
        const response = await instance.fetch(request)

        expect([200, 302]).toContain(response.status)
      })

      it('should return error for missing code', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/sso/callback', { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(400)
      })
    })

    describe('GET /api/organizations/:id', () => {
      it('should return organization details', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/organizations/org_test123', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = (await response.json()) as Organization
        expect(data.id).toBe('org_test123')
      })

      it('should return 404 for non-existent organization', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/organizations/org_nonexistent', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(404)
      })
    })

    describe('GET /api/connections/:id', () => {
      it('should return connection details', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/connections/conn_test123', {
          method: 'GET',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = (await response.json()) as SSOConnection
        expect(data.id).toBe('conn_test123')
      })
    })

    describe('POST /api/directories/:id/sync', () => {
      it('should trigger directory sync', async () => {
        const instance = new OAuthDO(ctx, env)
        const request = new Request('https://oauth.do/api/directories/dir_test123/sync', {
          method: 'POST',
        })

        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = (await response.json()) as DirectorySyncResult
        expect(data.success).toBe(true)
      })
    })
  })
})
