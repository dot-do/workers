/**
 * RED Tests: FHIR R4 OAuth2 Client Credentials Flow
 *
 * Tests for workers-002/workers-003: OAuth2 client credentials flow
 *
 * Acceptance Criteria from workers-002:
 * - Test POST /oauth2/token with grant_type=client_credentials
 * - Test invalid client credentials return 401
 * - Test valid credentials return JWT access_token
 * - Test token contains appropriate scopes
 * - Test token expiration (expires_in field)
 *
 * FHIR Context:
 * - FHIR R4 OAuth2 for Cerner API compatibility
 * - SMART on FHIR scopes (patient/*.read, user/*.*, etc.)
 * - Client credentials for system-to-system access
 *
 * @see https://www.hl7.org/fhir/smart-app-launch/
 * @see https://oauth.net/2/grant-types/client-credentials/
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * OAuth2 Token Response
 */
export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

/**
 * OAuth2 Error Response
 */
export interface OAuth2Error {
  error: string
  error_description?: string
}

/**
 * FHIR DO Contract with OAuth2 support
 */
export interface FHIRDO {
  // OAuth2 token endpoint
  issueToken(grantType: string, clientId: string, clientSecret: string, scope?: string): Promise<TokenResponse | OAuth2Error>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Attempt to load FHIRDO - will fail in RED phase
 */
async function loadFHIRDO(): Promise<new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO> {
  const module = await import('../src/fhir.js')
  return module.FHIRDO
}

describe('FHIR R4 OAuth2 Client Credentials Flow', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()

    // Pre-register a test client
    await ctx.storage.put('client:test-client-id', {
      id: 'test-client-id',
      secret: 'test-client-secret',
      name: 'Test FHIR Client',
      grantTypes: ['client_credentials'],
      scopes: ['system/*.read', 'system/Patient.read', 'system/Observation.read']
    })
  })

  describe('POST /oauth2/token - client_credentials grant', () => {
    it('should return access_token for valid client credentials', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          scope: 'system/Patient.read'
        }).toString()
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as TokenResponse
      expect(data.access_token).toBeDefined()
      expect(data.access_token.length).toBeGreaterThan(0)
    })

    it('should return token_type as Bearer', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret'
        }).toString()
      })

      const response = await instance.fetch(request)
      const data = await response.json() as TokenResponse

      expect(data.token_type).toBe('Bearer')
    })

    it('should return expires_in field', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret'
        }).toString()
      })

      const response = await instance.fetch(request)
      const data = await response.json() as TokenResponse

      expect(data.expires_in).toBeDefined()
      expect(data.expires_in).toBeGreaterThan(0)
      expect(typeof data.expires_in).toBe('number')
    })

    it('should return requested FHIR scopes', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          scope: 'system/Patient.read system/Observation.read'
        }).toString()
      })

      const response = await instance.fetch(request)
      const data = await response.json() as TokenResponse

      expect(data.scope).toBeDefined()
      expect(data.scope).toContain('Patient.read')
      expect(data.scope).toContain('Observation.read')
    })

    it('should return 401 for invalid client_id', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'invalid-client-id',
          client_secret: 'test-client-secret'
        }).toString()
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(401)

      const data = await response.json() as OAuth2Error
      expect(data.error).toBe('invalid_client')
    })

    it('should return 401 for invalid client_secret', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'test-client-id',
          client_secret: 'wrong-secret'
        }).toString()
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(401)

      const data = await response.json() as OAuth2Error
      expect(data.error).toBe('invalid_client')
    })

    it('should return 400 for missing grant_type', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret'
        }).toString()
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)

      const data = await response.json() as OAuth2Error
      expect(data.error).toBe('invalid_request')
    })

    it('should return 400 for unsupported grant_type', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret'
        }).toString()
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)

      const data = await response.json() as OAuth2Error
      expect(data.error).toBe('unsupported_grant_type')
    })

    it('should return 400 for missing client_id', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_secret: 'test-client-secret'
        }).toString()
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 for missing client_secret', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'test-client-id'
        }).toString()
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })
  })

  describe('issueToken() - Direct method', () => {
    it('should return access_token for valid credentials', async () => {
      const instance = new FHIRDO(ctx, env)

      const result = await instance.issueToken(
        'client_credentials',
        'test-client-id',
        'test-client-secret'
      )

      expect('access_token' in result).toBe(true)
      if ('access_token' in result) {
        expect(result.access_token).toBeDefined()
        expect(result.token_type).toBe('Bearer')
        expect(result.expires_in).toBeGreaterThan(0)
      }
    })

    it('should return error for invalid credentials', async () => {
      const instance = new FHIRDO(ctx, env)

      const result = await instance.issueToken(
        'client_credentials',
        'test-client-id',
        'wrong-secret'
      )

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe('invalid_client')
      }
    })

    it('should support FHIR SMART scopes', async () => {
      const instance = new FHIRDO(ctx, env)

      const result = await instance.issueToken(
        'client_credentials',
        'test-client-id',
        'test-client-secret',
        'system/Patient.read system/Observation.read'
      )

      expect('access_token' in result).toBe(true)
      if ('access_token' in result && result.scope) {
        expect(result.scope).toContain('Patient.read')
        expect(result.scope).toContain('Observation.read')
      }
    })
  })

  describe('SMART on FHIR Scope Support', () => {
    it('should support system/*.read scope', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          scope: 'system/*.read'
        }).toString()
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as TokenResponse
      expect(data.scope).toContain('*.read')
    })

    it('should support system/Patient.read scope', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          scope: 'system/Patient.read'
        }).toString()
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as TokenResponse
      expect(data.scope).toContain('Patient.read')
    })

    it('should support multiple FHIR resource scopes', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          scope: 'system/Patient.read system/Observation.read system/Condition.read'
        }).toString()
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as TokenResponse
      const scopes = data.scope?.split(' ') || []
      expect(scopes.length).toBeGreaterThanOrEqual(3)
    })
  })
})
