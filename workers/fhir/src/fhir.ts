/**
 * FHIR DO - FHIR R4 Server with OAuth2 Support
 *
 * Implements FHIR R4 server with OAuth2 client credentials flow
 * for Cerner API compatibility and SMART on FHIR.
 *
 * Features:
 * - OAuth2 client credentials grant type
 * - SMART on FHIR scopes (system/*.read, system/Patient.read, etc.)
 * - FHIR R4 Patient resource support
 * - Token management and validation
 *
 * @see https://www.hl7.org/fhir/smart-app-launch/
 * @see https://oauth.net/2/grant-types/client-credentials/
 */

import { Patient, OperationOutcome } from './types.js'

/**
 * Durable Object State interface
 */
interface DOState {
  id: DurableObjectId
  storage: DOStorage
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>
}

interface DurableObjectId {
  name?: string
  toString(): string
  equals(other: DurableObjectId): boolean
}

interface DOStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T, options?: { expirationTtl?: number }): Promise<void>
  put<T>(entries: Record<string, T>, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  deleteAll(): Promise<void>
  list<T = unknown>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>
}

/**
 * OAuth2 Client registration
 */
interface OAuthClient {
  id: string
  name: string
  secret: string
  grantTypes: string[]
  scopes: string[]
  createdAt?: string
}

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
 * Access token data stored in DO storage
 */
interface AccessTokenData {
  clientId: string
  scopes: string[]
  exp: number
  iat: number
}

/**
 * FHIR DO Implementation
 */
export class FHIRDO {
  protected readonly ctx: DOState
  protected readonly env: any

  constructor(ctx: DOState, env: any) {
    this.ctx = ctx
    this.env = env
  }

  /**
   * Issue OAuth2 token for client credentials grant
   */
  async issueToken(
    grantType: string,
    clientId: string,
    clientSecret: string,
    scope?: string
  ): Promise<TokenResponse | OAuth2Error> {
    // Validate grant type
    if (grantType !== 'client_credentials') {
      return { error: 'unsupported_grant_type' }
    }

    // Validate client credentials
    if (!clientId || !clientSecret) {
      return { error: 'invalid_request', error_description: 'Missing client credentials' }
    }

    // Get client from storage
    const client = await this.ctx.storage.get<OAuthClient>(`client:${clientId}`)

    if (!client || client.secret !== clientSecret) {
      return { error: 'invalid_client' }
    }

    // Check if client is authorized for client_credentials grant
    if (!client.grantTypes.includes('client_credentials')) {
      return { error: 'unauthorized_client' }
    }

    // Generate access token
    const accessToken = this.generateToken()
    const expiresIn = 3600 // 1 hour
    const requestedScopes = scope ? scope.split(' ') : ['system/*.read']

    // Store token data
    const tokenData: AccessTokenData = {
      clientId,
      scopes: requestedScopes,
      exp: Date.now() + expiresIn * 1000,
      iat: Date.now(),
    }

    await this.ctx.storage.put(`access:${accessToken}`, tokenData, {
      expirationTtl: expiresIn,
    })

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: requestedScopes.join(' '),
    }
  }

  /**
   * Read a Patient resource by ID
   */
  async readPatient(id: string): Promise<Patient | null> {
    const patient = await this.ctx.storage.get<Patient>(`Patient:${id}`)
    return patient || null
  }

  /**
   * Read a specific version of a Patient resource
   */
  async readPatientVersion(id: string, versionId: string): Promise<Patient | null> {
    const patient = await this.ctx.storage.get<Patient>(`Patient:${id}:_history:${versionId}`)
    return patient || null
  }

  /**
   * HTTP fetch handler
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    try {
      // OAuth2 token endpoint
      if (path === '/oauth2/token' && method === 'POST') {
        return this.handleTokenEndpoint(request)
      }

      // FHIR Patient read endpoint
      if (path.match(/^\/fhir\/r4\/Patient\/[\w-]+$/) && method === 'GET') {
        return this.handlePatientRead(request, path)
      }

      // FHIR Patient version read endpoint
      if (path.match(/^\/fhir\/r4\/Patient\/[\w-]+\/_history\/\d+$/) && method === 'GET') {
        return this.handlePatientVersionRead(request, path)
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/fhir+json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Internal server error', message: (error as Error).message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/fhir+json' },
        }
      )
    }
  }

  /**
   * Handle OAuth2 token endpoint
   */
  private async handleTokenEndpoint(request: Request): Promise<Response> {
    const body = await request.text()
    const params = new URLSearchParams(body)

    const grantType = params.get('grant_type')
    const clientId = params.get('client_id')
    const clientSecret = params.get('client_secret')
    const scope = params.get('scope') || undefined

    // Validate required parameters
    if (!grantType) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Missing grant_type' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Missing client_id' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!clientSecret) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Missing client_secret' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Issue token
    const result = await this.issueToken(grantType, clientId, clientSecret, scope)

    if ('error' in result) {
      const status = result.error === 'invalid_client' ? 401 : 400
      return new Response(JSON.stringify(result), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * Handle FHIR Patient read
   */
  private async handlePatientRead(request: Request, path: string): Promise<Response> {
    const match = path.match(/^\/fhir\/r4\/Patient\/([\w-]+)$/)
    if (!match) {
      return this.createOperationOutcome('error', 'invalid', 'Invalid path', 400)
    }

    const patientId = match[1]
    const patient = await this.readPatient(patientId)

    if (!patient) {
      return this.createOperationOutcome(
        'error',
        'not-found',
        `Patient resource with id ${patientId} not found`,
        404
      )
    }

    return new Response(JSON.stringify(patient), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  }

  /**
   * Handle FHIR Patient version read
   */
  private async handlePatientVersionRead(request: Request, path: string): Promise<Response> {
    const match = path.match(/^\/fhir\/r4\/Patient\/([\w-]+)\/_history\/(\d+)$/)
    if (!match) {
      return this.createOperationOutcome('error', 'invalid', 'Invalid path', 400)
    }

    const patientId = match[1]
    const versionId = match[2]

    const patient = await this.readPatientVersion(patientId, versionId)

    if (!patient) {
      return this.createOperationOutcome(
        'error',
        'not-found',
        `Patient resource with id ${patientId} version ${versionId} not found`,
        404
      )
    }

    return new Response(JSON.stringify(patient), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  }

  /**
   * Create FHIR OperationOutcome response
   */
  private createOperationOutcome(
    severity: 'fatal' | 'error' | 'warning' | 'information',
    code: string,
    diagnostics: string,
    status: number
  ): Response {
    const outcome: OperationOutcome = {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity,
          code,
          diagnostics,
        },
      ],
    }

    return new Response(JSON.stringify(outcome), {
      status,
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
}
