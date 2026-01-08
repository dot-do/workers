/**
 * RED Tests: FHIR R4 Patient Read Operation
 *
 * Tests for workers-012: [RED] Test Patient read operation
 *
 * Acceptance Criteria:
 * - Test GET /fhir/r4/Patient/{id} returns valid Patient resource
 * - Test GET /fhir/r4/Patient/{invalid-id} returns 404 OperationOutcome
 * - Test GET /fhir/r4/Patient/{id}/_history/{vid} returns specific version
 * - Test response includes meta.versionId and meta.lastUpdated
 *
 * @see FHIR R4 Patient: http://hl7.org/fhir/R4/patient.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * FHIR R4 Patient Resource Type
 */
export interface Patient {
  resourceType: 'Patient'
  id: string
  meta: {
    versionId: string
    lastUpdated: string
  }
  identifier?: Array<{
    use?: string
    type?: {
      coding: Array<{
        system: string
        code: string
      }>
    }
    system: string
    value: string
  }>
  active?: boolean
  name?: Array<{
    use?: string
    family?: string
    given?: string[]
    prefix?: string[]
    suffix?: string[]
  }>
  telecom?: Array<{
    system: 'phone' | 'email' | 'fax' | 'pager' | 'url' | 'sms' | 'other'
    value: string
    use?: 'home' | 'work' | 'temp' | 'old' | 'mobile'
  }>
  gender?: 'male' | 'female' | 'other' | 'unknown'
  birthDate?: string
  address?: Array<{
    use?: 'home' | 'work' | 'temp' | 'old' | 'billing'
    type?: 'postal' | 'physical' | 'both'
    line?: string[]
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }>
  maritalStatus?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
  }
  communication?: Array<{
    language: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }
    preferred?: boolean
  }>
}

/**
 * FHIR R4 OperationOutcome Resource Type
 */
export interface OperationOutcome {
  resourceType: 'OperationOutcome'
  issue: Array<{
    severity: 'fatal' | 'error' | 'warning' | 'information'
    code: string
    diagnostics?: string
    details?: {
      text?: string
    }
  }>
}

/**
 * FHIR DO Contract
 */
export interface FHIRDO {
  // Patient read operations
  readPatient(id: string): Promise<Patient | null>
  readPatientVersion(id: string, versionId: string): Promise<Patient | null>

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

describe('FHIR R4 Patient Read Operation', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('readPatient() - Direct method', () => {
    it('should return null for non-existent patient', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readPatient('nonexistent')
      expect(result).toBeNull()
    })

    it('should return Patient resource with required fields', async () => {
      const instance = new FHIRDO(ctx, env)

      // Store a patient
      const patient: Patient = {
        resourceType: 'Patient',
        id: '12345',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        identifier: [{
          use: 'usual',
          type: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR'
            }]
          },
          system: 'urn:oid:1.2.36.146.595.217.0.1',
          value: '12345'
        }],
        name: [{
          use: 'official',
          family: 'Smith',
          given: ['John', 'Q']
        }],
        gender: 'male',
        birthDate: '1990-01-15'
      }

      await ctx.storage.put('Patient:12345', patient)

      const result = await instance.readPatient('12345')
      expect(result).not.toBeNull()
      expect(result!.resourceType).toBe('Patient')
      expect(result!.id).toBe('12345')
      expect(result!.meta.versionId).toBeDefined()
      expect(result!.meta.lastUpdated).toBeDefined()
    })

    it('should include meta.versionId in response', async () => {
      const instance = new FHIRDO(ctx, env)

      const patient: Patient = {
        resourceType: 'Patient',
        id: 'test-123',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        name: [{
          family: 'Doe',
          given: ['Jane']
        }]
      }

      await ctx.storage.put('Patient:test-123', patient)

      const result = await instance.readPatient('test-123')
      expect(result).not.toBeNull()
      expect(result!.meta).toBeDefined()
      expect(result!.meta.versionId).toBe('1')
    })

    it('should include meta.lastUpdated in ISO8601 format', async () => {
      const instance = new FHIRDO(ctx, env)

      const patient: Patient = {
        resourceType: 'Patient',
        id: 'test-456',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        name: [{
          family: 'Johnson',
          given: ['Bob']
        }]
      }

      await ctx.storage.put('Patient:test-456', patient)

      const result = await instance.readPatient('test-456')
      expect(result).not.toBeNull()
      expect(result!.meta.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('GET /fhir/r4/Patient/{id} - HTTP endpoint', () => {
    it('should return 200 with valid Patient resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const patient: Patient = {
        resourceType: 'Patient',
        id: '12345',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        name: [{
          family: 'Rodriguez',
          given: ['Maria']
        }],
        gender: 'female',
        birthDate: '1985-03-22'
      }

      await ctx.storage.put('Patient:12345', patient)

      const request = new Request('http://fhir.do/fhir/r4/Patient/12345', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Patient
      expect(data.resourceType).toBe('Patient')
      expect(data.id).toBe('12345')
      expect(data.meta.versionId).toBeDefined()
      expect(data.meta.lastUpdated).toBeDefined()
    })

    it('should return Content-Type: application/fhir+json', async () => {
      const instance = new FHIRDO(ctx, env)

      const patient: Patient = {
        resourceType: 'Patient',
        id: 'content-type-test',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        }
      }

      await ctx.storage.put('Patient:content-type-test', patient)

      const request = new Request('http://fhir.do/fhir/r4/Patient/content-type-test', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })

    it('should return 404 with OperationOutcome for non-existent patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient/nonexistent', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue).toBeDefined()
      expect(outcome.issue.length).toBeGreaterThan(0)
      expect(outcome.issue[0].severity).toBe('error')
      expect(outcome.issue[0].code).toBe('not-found')
    })

    it('should include diagnostics in 404 OperationOutcome', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient/missing-123', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.issue[0].diagnostics).toBeDefined()
      expect(outcome.issue[0].diagnostics).toContain('missing-123')
    })
  })

  describe('GET /fhir/r4/Patient/{id}/_history/{vid} - Version read (vread)', () => {
    it('should return specific version of Patient resource', async () => {
      const instance = new FHIRDO(ctx, env)

      // Store version 1
      const patientV1: Patient = {
        resourceType: 'Patient',
        id: 'versioned-123',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'Smith',
          given: ['John']
        }]
      }

      // Store version 2
      const patientV2: Patient = {
        resourceType: 'Patient',
        id: 'versioned-123',
        meta: {
          versionId: '2',
          lastUpdated: '2024-01-15T11:00:00.000Z'
        },
        name: [{
          family: 'Smith',
          given: ['Jonathan']
        }]
      }

      await ctx.storage.put('Patient:versioned-123', patientV2)
      await ctx.storage.put('Patient:versioned-123:_history:1', patientV1)
      await ctx.storage.put('Patient:versioned-123:_history:2', patientV2)

      const request = new Request('http://fhir.do/fhir/r4/Patient/versioned-123/_history/1', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Patient
      expect(data.meta.versionId).toBe('1')
      expect(data.name![0].given![0]).toBe('John')
    })

    it('should return 404 for non-existent version', async () => {
      const instance = new FHIRDO(ctx, env)

      const patient: Patient = {
        resourceType: 'Patient',
        id: 'version-test',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        }
      }

      await ctx.storage.put('Patient:version-test', patient)

      const request = new Request('http://fhir.do/fhir/r4/Patient/version-test/_history/999', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].code).toBe('not-found')
    })
  })

  describe('readPatientVersion() - Direct method', () => {
    it('should return specific version by versionId', async () => {
      const instance = new FHIRDO(ctx, env)

      const patientV1: Patient = {
        resourceType: 'Patient',
        id: 'version-direct-test',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        active: true
      }

      await ctx.storage.put('Patient:version-direct-test:_history:1', patientV1)

      const result = await instance.readPatientVersion('version-direct-test', '1')
      expect(result).not.toBeNull()
      expect(result!.meta.versionId).toBe('1')
      expect(result!.active).toBe(true)
    })

    it('should return null for non-existent version', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readPatientVersion('test', '999')
      expect(result).toBeNull()
    })
  })
})
