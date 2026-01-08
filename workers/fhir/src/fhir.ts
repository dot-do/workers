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

import { Patient, Encounter, Observation, Condition, Bundle, OperationOutcome } from './types.js'

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
   * Read an Encounter resource by ID
   */
  async readEncounter(id: string): Promise<Encounter | null> {
    const encounter = await this.ctx.storage.get<Encounter>(`Encounter:${id}`)
    return encounter || null
  }

  /**
   * Search for Encounter resources
   */
  async searchEncounters(params: {
    patient?: string
    date?: string
    status?: string
    class?: string
  }): Promise<Bundle<Encounter>> {
    // Get all encounters from storage
    const allEncounters = await this.ctx.storage.list<Encounter>({ prefix: 'Encounter:' })

    // Filter encounters based on search parameters
    let encounters = Array.from(allEncounters.values())

    // Filter by patient
    if (params.patient) {
      const patientRef = params.patient.startsWith('Patient/')
        ? params.patient
        : `Patient/${params.patient}`
      encounters = encounters.filter(enc => enc.subject?.reference === patientRef)
    }

    // Filter by status
    if (params.status) {
      encounters = encounters.filter(enc => enc.status === params.status)
    }

    // Filter by class
    if (params.class) {
      encounters = encounters.filter(enc => enc.class.code === params.class)
    }

    // Filter by date
    if (params.date) {
      const dateMatch = params.date.match(/^(eq|ne|lt|le|gt|ge)?(.+)$/)
      if (dateMatch) {
        const [, prefix = 'eq', dateStr] = dateMatch
        const searchDate = new Date(dateStr).getTime()

        encounters = encounters.filter(enc => {
          if (!enc.period?.start) return false
          const encounterDate = new Date(enc.period.start).getTime()

          switch (prefix) {
            case 'eq':
              return encounterDate === searchDate
            case 'ne':
              return encounterDate !== searchDate
            case 'lt':
              return encounterDate < searchDate
            case 'le':
              return encounterDate <= searchDate
            case 'gt':
              return encounterDate > searchDate
            case 'ge':
              return encounterDate >= searchDate
            default:
              return false
          }
        })
      }
    }

    // Create Bundle response
    const bundle: Bundle<Encounter> = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: encounters.length,
      entry: encounters.map(resource => ({
        fullUrl: `Encounter/${resource.id}`,
        resource,
        search: {
          mode: 'match'
        }
      }))
    }

    return bundle
  }

  /**
   * Read an Observation resource by ID
   */
  async readObservation(id: string): Promise<Observation | null> {
    const observation = await this.ctx.storage.get<Observation>(`Observation:${id}`)
    return observation || null
  }

  /**
   * Search for Observation resources
   */
  async searchObservations(params: {
    category?: string
    patient?: string
    code?: string
    date?: string
  }): Promise<Observation[]> {
    // Get all observations from storage
    const allObservations = await this.ctx.storage.list<Observation>({ prefix: 'Observation:' })

    // Filter observations based on search parameters
    let observations = Array.from(allObservations.values())

    // Filter by category
    if (params.category) {
      observations = observations.filter(obs =>
        obs.category?.some(cat =>
          cat.coding.some(coding => coding.code === params.category)
        )
      )
    }

    // Filter by patient
    if (params.patient) {
      const patientRef = params.patient.startsWith('Patient/')
        ? params.patient
        : `Patient/${params.patient}`
      observations = observations.filter(obs => obs.subject?.reference === patientRef)
    }

    // Filter by code
    if (params.code) {
      observations = observations.filter(obs =>
        obs.code.coding.some(coding => coding.code === params.code)
      )
    }

    // Filter by date
    if (params.date) {
      const dateMatch = params.date.match(/^(eq|ne|lt|le|gt|ge)?(.+)$/)
      if (dateMatch) {
        const [, prefix = 'eq', dateStr] = dateMatch
        const searchDate = new Date(dateStr).getTime()

        observations = observations.filter(obs => {
          const effectiveDate = obs.effectiveDateTime || obs.effectivePeriod?.start
          if (!effectiveDate) return false
          const observationDate = new Date(effectiveDate).getTime()

          switch (prefix) {
            case 'eq':
              return observationDate === searchDate
            case 'ne':
              return observationDate !== searchDate
            case 'lt':
              return observationDate < searchDate
            case 'le':
              return observationDate <= searchDate
            case 'gt':
              return observationDate > searchDate
            case 'ge':
              return observationDate >= searchDate
            default:
              return false
          }
        })
      }
    }

    return observations
  }

  /**
   * Create a new Condition resource
   */
  async createCondition(condition: Omit<Condition, 'id' | 'meta'>): Promise<Condition> {
    // Generate a unique ID for the condition
    const id = `cond-${this.generateToken().substring(0, 16)}`

    // Create metadata
    const now = new Date().toISOString()
    const meta = {
      versionId: '1',
      lastUpdated: now
    }

    // Create the full condition resource
    const newCondition: Condition = {
      ...condition,
      id,
      meta
    }

    // Store the condition
    await this.ctx.storage.put(`Condition:${id}`, newCondition)
    await this.ctx.storage.put(`Condition:${id}:_history:1`, newCondition)

    return newCondition
  }

  /**
   * Read a Condition resource by ID
   */
  async readCondition(id: string): Promise<Condition | null> {
    const condition = await this.ctx.storage.get<Condition>(`Condition:${id}`)
    return condition || null
  }

  /**
   * Update a Condition resource
   */
  async updateCondition(id: string, updates: Partial<Condition>): Promise<Condition | null> {
    // Get existing condition
    const existing = await this.readCondition(id)
    if (!existing) {
      return null
    }

    // Increment version
    const currentVersion = parseInt(existing.meta.versionId)
    const newVersion = (currentVersion + 1).toString()

    // Create updated condition
    const updated: Condition = {
      ...existing,
      ...updates,
      id, // Preserve ID
      meta: {
        versionId: newVersion,
        lastUpdated: new Date().toISOString()
      }
    }

    // Store updated condition
    await this.ctx.storage.put(`Condition:${id}`, updated)
    await this.ctx.storage.put(`Condition:${id}:_history:${newVersion}`, updated)

    return updated
  }

  /**
   * Delete a Condition resource
   */
  async deleteCondition(id: string): Promise<boolean> {
    const existing = await this.readCondition(id)
    if (!existing) {
      return false
    }

    await this.ctx.storage.delete(`Condition:${id}`)
    return true
  }

  /**
   * Search for Condition resources
   */
  async searchConditions(params: {
    patient?: string
    category?: string
    clinicalStatus?: string
    verificationStatus?: string
    code?: string
  }): Promise<Condition[]> {
    // Get all conditions from storage
    const allConditions = await this.ctx.storage.list<Condition>({ prefix: 'Condition:' })

    // Filter out history entries (only get current versions)
    let conditions = Array.from(allConditions.entries())
      .filter(([key]) => !key.includes(':_history:'))
      .map(([, value]) => value)

    // Filter by patient
    if (params.patient) {
      const patientRef = params.patient.startsWith('Patient/')
        ? params.patient
        : `Patient/${params.patient}`
      conditions = conditions.filter(cond => cond.subject.reference === patientRef)
    }

    // Filter by category
    if (params.category) {
      conditions = conditions.filter(cond =>
        cond.category?.some(cat =>
          cat.coding.some(coding => coding.code === params.category)
        )
      )
    }

    // Filter by clinical status
    if (params.clinicalStatus) {
      conditions = conditions.filter(cond =>
        cond.clinicalStatus?.coding.some(coding => coding.code === params.clinicalStatus)
      )
    }

    // Filter by verification status
    if (params.verificationStatus) {
      conditions = conditions.filter(cond =>
        cond.verificationStatus?.coding.some(coding => coding.code === params.verificationStatus)
      )
    }

    // Filter by code
    if (params.code) {
      conditions = conditions.filter(cond =>
        cond.code?.coding.some(coding => coding.code === params.code)
      )
    }

    return conditions
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

      // FHIR Encounter search endpoint
      if (path === '/fhir/r4/Encounter' && method === 'GET') {
        return this.handleEncounterSearch(request, url)
      }

      // FHIR Encounter read endpoint
      if (path.match(/^\/fhir\/r4\/Encounter\/[\w-]+$/) && method === 'GET') {
        return this.handleEncounterRead(request, path)
      }

      // FHIR Observation search endpoint
      if (path === '/fhir/r4/Observation' && method === 'GET') {
        return this.handleObservationSearch(request, url)
      }

      // FHIR Observation read endpoint
      if (path.match(/^\/fhir\/r4\/Observation\/[\w-]+$/) && method === 'GET') {
        return this.handleObservationRead(request, path)
      }

      // FHIR Condition search endpoint
      if (path === '/fhir/r4/Condition' && method === 'GET') {
        return this.handleConditionSearch(request, url)
      }

      // FHIR Condition create endpoint
      if (path === '/fhir/r4/Condition' && method === 'POST') {
        return this.handleConditionCreate(request)
      }

      // FHIR Condition read endpoint
      if (path.match(/^\/fhir\/r4\/Condition\/[\w-]+$/) && method === 'GET') {
        return this.handleConditionRead(request, path)
      }

      // FHIR Condition update endpoint
      if (path.match(/^\/fhir\/r4\/Condition\/[\w-]+$/) && method === 'PUT') {
        return this.handleConditionUpdate(request, path)
      }

      // FHIR Condition delete endpoint
      if (path.match(/^\/fhir\/r4\/Condition\/[\w-]+$/) && method === 'DELETE') {
        return this.handleConditionDelete(request, path)
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
   * Handle FHIR Encounter read
   */
  private async handleEncounterRead(request: Request, path: string): Promise<Response> {
    const match = path.match(/^\/fhir\/r4\/Encounter\/([\w-]+)$/)
    if (!match) {
      return this.createOperationOutcome('error', 'invalid', 'Invalid path', 400)
    }

    const encounterId = match[1]
    const encounter = await this.readEncounter(encounterId)

    if (!encounter) {
      return this.createOperationOutcome(
        'error',
        'not-found',
        `Encounter resource with id ${encounterId} not found`,
        404
      )
    }

    return new Response(JSON.stringify(encounter), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  }

  /**
   * Handle FHIR Encounter search
   */
  private async handleEncounterSearch(request: Request, url: URL): Promise<Response> {
    const searchParams = {
      patient: url.searchParams.get('patient') || undefined,
      date: url.searchParams.get('date') || undefined,
      status: url.searchParams.get('status') || undefined,
      class: url.searchParams.get('class') || undefined,
    }

    const bundle = await this.searchEncounters(searchParams)

    return new Response(JSON.stringify(bundle), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  }

  /**
   * Handle FHIR Observation read
   */
  private async handleObservationRead(request: Request, path: string): Promise<Response> {
    const match = path.match(/^\/fhir\/r4\/Observation\/([\w-]+)$/)
    if (!match) {
      return this.createOperationOutcome('error', 'invalid', 'Invalid path', 400)
    }

    const observationId = match[1]
    const observation = await this.readObservation(observationId)

    if (!observation) {
      return this.createOperationOutcome(
        'error',
        'not-found',
        `Observation resource with id ${observationId} not found`,
        404
      )
    }

    return new Response(JSON.stringify(observation), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  }

  /**
   * Handle FHIR Observation search
   */
  private async handleObservationSearch(request: Request, url: URL): Promise<Response> {
    const params = {
      category: url.searchParams.get('category') || undefined,
      patient: url.searchParams.get('patient') || undefined,
      code: url.searchParams.get('code') || undefined,
      date: url.searchParams.get('date') || undefined,
    }

    const observations = await this.searchObservations(params)

    // Create Bundle response
    const bundle: Bundle<Observation> = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: observations.length,
      entry: observations.map(resource => ({
        fullUrl: `Observation/${resource.id}`,
        resource,
        search: {
          mode: 'match'
        }
      }))
    }

    return new Response(JSON.stringify(bundle), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  }

  /**
   * Handle FHIR Condition read
   */
  private async handleConditionRead(request: Request, path: string): Promise<Response> {
    const match = path.match(/^\/fhir\/r4\/Condition\/([\w-]+)$/)
    if (!match) {
      return this.createOperationOutcome('error', 'invalid', 'Invalid path', 400)
    }

    const conditionId = match[1]
    const condition = await this.readCondition(conditionId)

    if (!condition) {
      return this.createOperationOutcome(
        'error',
        'not-found',
        `Condition resource with id ${conditionId} not found`,
        404
      )
    }

    return new Response(JSON.stringify(condition), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  }

  /**
   * Handle FHIR Condition search
   */
  private async handleConditionSearch(request: Request, url: URL): Promise<Response> {
    const params = {
      patient: url.searchParams.get('patient') || undefined,
      category: url.searchParams.get('category') || undefined,
      clinicalStatus: url.searchParams.get('clinical-status') || undefined,
      verificationStatus: url.searchParams.get('verification-status') || undefined,
      code: url.searchParams.get('code') || undefined,
    }

    const conditions = await this.searchConditions(params)

    // Create Bundle response
    const bundle: Bundle<Condition> = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: conditions.length,
      entry: conditions.map(resource => ({
        fullUrl: `Condition/${resource.id}`,
        resource,
        search: {
          mode: 'match'
        }
      }))
    }

    return new Response(JSON.stringify(bundle), {
      status: 200,
      headers: { 'Content-Type': 'application/fhir+json' },
    })
  }

  /**
   * Handle FHIR Condition create
   */
  private async handleConditionCreate(request: Request): Promise<Response> {
    try {
      const body = await request.json() as Omit<Condition, 'id' | 'meta'>

      // Validate required fields
      if (!body.subject?.reference) {
        return this.createOperationOutcome(
          'error',
          'invalid',
          'Condition must have a subject reference',
          400
        )
      }

      const condition = await this.createCondition(body)

      return new Response(JSON.stringify(condition), {
        status: 201,
        headers: {
          'Content-Type': 'application/fhir+json',
          'Location': `/fhir/r4/Condition/${condition.id}`
        },
      })
    } catch (error) {
      return this.createOperationOutcome(
        'error',
        'processing',
        `Failed to create Condition: ${(error as Error).message}`,
        400
      )
    }
  }

  /**
   * Handle FHIR Condition update
   */
  private async handleConditionUpdate(request: Request, path: string): Promise<Response> {
    const match = path.match(/^\/fhir\/r4\/Condition\/([\w-]+)$/)
    if (!match) {
      return this.createOperationOutcome('error', 'invalid', 'Invalid path', 400)
    }

    const conditionId = match[1]

    try {
      const body = await request.json() as Partial<Condition>

      const updated = await this.updateCondition(conditionId, body)

      if (!updated) {
        return this.createOperationOutcome(
          'error',
          'not-found',
          `Condition resource with id ${conditionId} not found`,
          404
        )
      }

      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/fhir+json' },
      })
    } catch (error) {
      return this.createOperationOutcome(
        'error',
        'processing',
        `Failed to update Condition: ${(error as Error).message}`,
        400
      )
    }
  }

  /**
   * Handle FHIR Condition delete
   */
  private async handleConditionDelete(request: Request, path: string): Promise<Response> {
    const match = path.match(/^\/fhir\/r4\/Condition\/([\w-]+)$/)
    if (!match) {
      return this.createOperationOutcome('error', 'invalid', 'Invalid path', 400)
    }

    const conditionId = match[1]
    const deleted = await this.deleteCondition(conditionId)

    if (!deleted) {
      return this.createOperationOutcome(
        'error',
        'not-found',
        `Condition resource with id ${conditionId} not found`,
        404
      )
    }

    return new Response(null, {
      status: 204,
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
