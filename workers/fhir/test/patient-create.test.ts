/**
 * Tests for FHIR R4 Patient Create Operation
 *
 * Tests for workers-016: [GREEN] Implement Patient create operation
 *
 * Acceptance Criteria:
 * - Test POST /fhir/r4/Patient creates new Patient resource
 * - Test resource validation (required fields)
 * - Test duplicate detection by identifier
 * - Test auto-generated ID assignment
 * - Test response includes Location header
 * - Test response status 201 Created
 * - Test meta.versionId starts at "1"
 * - Test meta.lastUpdated is set
 *
 * @see FHIR R4 Patient: http://hl7.org/fhir/R4/patient.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'
import { Patient, OperationOutcome } from '../src/types.js'

/**
 * FHIR DO Contract
 */
export interface FHIRDO {
  // Patient create operation
  createPatient(patient: Omit<Patient, 'id' | 'meta'>): Promise<Patient>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Load FHIRDO
 */
async function loadFHIRDO(): Promise<new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO> {
  const module = await import('../src/fhir.js')
  return module.FHIRDO
}

describe('FHIR R4 Patient Create Operation', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('createPatient() - Direct method', () => {
    it('should create a new Patient with auto-generated ID', async () => {
      const instance = new FHIRDO(ctx, env)

      const newPatient: Omit<Patient, 'id' | 'meta'> = {
        resourceType: 'Patient',
        name: [{
          family: 'Smith',
          given: ['John']
        }],
        gender: 'male',
        birthDate: '1990-01-15'
      }

      const result = await instance.createPatient(newPatient)

      expect(result.id).toBeDefined()
      expect(result.id).toMatch(/^[a-z0-9-]+$/)
      expect(result.resourceType).toBe('Patient')
      expect(result.name![0].family).toBe('Smith')
    })

    it('should set meta.versionId to "1" for new resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const newPatient: Omit<Patient, 'id' | 'meta'> = {
        resourceType: 'Patient',
        name: [{
          family: 'Doe',
          given: ['Jane']
        }]
      }

      const result = await instance.createPatient(newPatient)

      expect(result.meta).toBeDefined()
      expect(result.meta.versionId).toBe('1')
    })

    it('should set meta.lastUpdated in ISO8601 format', async () => {
      const instance = new FHIRDO(ctx, env)

      const newPatient: Omit<Patient, 'id' | 'meta'> = {
        resourceType: 'Patient',
        name: [{
          family: 'Johnson',
          given: ['Bob']
        }]
      }

      const result = await instance.createPatient(newPatient)

      expect(result.meta.lastUpdated).toBeDefined()
      expect(result.meta.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should store the patient in storage', async () => {
      const instance = new FHIRDO(ctx, env)

      const newPatient: Omit<Patient, 'id' | 'meta'> = {
        resourceType: 'Patient',
        name: [{
          family: 'Williams',
          given: ['Sarah']
        }]
      }

      const result = await instance.createPatient(newPatient)

      const stored = await ctx.storage.get<Patient>(`Patient:${result.id}`)
      expect(stored).toBeDefined()
      expect(stored!.id).toBe(result.id)
      expect(stored!.name![0].family).toBe('Williams')
    })

    it('should store version history', async () => {
      const instance = new FHIRDO(ctx, env)

      const newPatient: Omit<Patient, 'id' | 'meta'> = {
        resourceType: 'Patient',
        name: [{
          family: 'Brown',
          given: ['Michael']
        }]
      }

      const result = await instance.createPatient(newPatient)

      const history = await ctx.storage.get<Patient>(`Patient:${result.id}:_history:1`)
      expect(history).toBeDefined()
      expect(history!.meta.versionId).toBe('1')
    })

    it('should detect duplicate by identifier system and value', async () => {
      const instance = new FHIRDO(ctx, env)

      const patient1: Omit<Patient, 'id' | 'meta'> = {
        resourceType: 'Patient',
        identifier: [{
          system: 'http://hospital.org/mrn',
          value: 'MRN12345'
        }],
        name: [{
          family: 'Davis',
          given: ['Emily']
        }]
      }

      await instance.createPatient(patient1)

      // Try to create duplicate
      const patient2: Omit<Patient, 'id' | 'meta'> = {
        resourceType: 'Patient',
        identifier: [{
          system: 'http://hospital.org/mrn',
          value: 'MRN12345'
        }],
        name: [{
          family: 'Davis',
          given: ['Emma']
        }]
      }

      await expect(instance.createPatient(patient2)).rejects.toThrow(/duplicate/i)
    })

    it('should allow same identifier value with different system', async () => {
      const instance = new FHIRDO(ctx, env)

      const patient1: Omit<Patient, 'id' | 'meta'> = {
        resourceType: 'Patient',
        identifier: [{
          system: 'http://hospital1.org/mrn',
          value: 'MRN12345'
        }],
        name: [{
          family: 'Wilson',
          given: ['David']
        }]
      }

      await instance.createPatient(patient1)

      // Different system, same value - should be allowed
      const patient2: Omit<Patient, 'id' | 'meta'> = {
        resourceType: 'Patient',
        identifier: [{
          system: 'http://hospital2.org/mrn',
          value: 'MRN12345'
        }],
        name: [{
          family: 'Wilson',
          given: ['Daniel']
        }]
      }

      const result = await instance.createPatient(patient2)
      expect(result.id).toBeDefined()
    })
  })

  describe('POST /fhir/r4/Patient - HTTP endpoint', () => {
    it('should return 201 Created with new Patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const newPatient = {
        resourceType: 'Patient',
        name: [{
          family: 'Martinez',
          given: ['Carlos']
        }],
        gender: 'male',
        birthDate: '1985-06-20'
      }

      const request = new Request('http://fhir.do/fhir/r4/Patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(newPatient)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const data = await response.json() as Patient
      expect(data.id).toBeDefined()
      expect(data.resourceType).toBe('Patient')
      expect(data.meta.versionId).toBe('1')
    })

    it('should return Location header with resource URL', async () => {
      const instance = new FHIRDO(ctx, env)

      const newPatient = {
        resourceType: 'Patient',
        name: [{
          family: 'Garcia',
          given: ['Maria']
        }]
      }

      const request = new Request('http://fhir.do/fhir/r4/Patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(newPatient)
      })

      const response = await instance.fetch(request)
      const location = response.headers.get('Location')

      expect(location).toBeDefined()
      expect(location).toMatch(/\/fhir\/r4\/Patient\/[a-z0-9-]+$/)
    })

    it('should return Content-Type: application/fhir+json', async () => {
      const instance = new FHIRDO(ctx, env)

      const newPatient = {
        resourceType: 'Patient',
        name: [{
          family: 'Anderson',
          given: ['Lisa']
        }]
      }

      const request = new Request('http://fhir.do/fhir/r4/Patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(newPatient)
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })

    it('should return 400 for invalid resource (missing resourceType)', async () => {
      const instance = new FHIRDO(ctx, env)

      const invalidPatient = {
        name: [{
          family: 'Invalid'
        }]
      }

      const request = new Request('http://fhir.do/fhir/r4/Patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(invalidPatient)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].severity).toBe('error')
    })

    it('should return 409 Conflict for duplicate identifier', async () => {
      const instance = new FHIRDO(ctx, env)

      const patient1 = {
        resourceType: 'Patient',
        identifier: [{
          system: 'http://hospital.org/mrn',
          value: 'CONFLICT123'
        }],
        name: [{
          family: 'Conflict',
          given: ['Test']
        }]
      }

      // Create first patient
      const req1 = new Request('http://fhir.do/fhir/r4/Patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(patient1)
      })
      await instance.fetch(req1)

      // Try to create duplicate
      const req2 = new Request('http://fhir.do/fhir/r4/Patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(patient1)
      })

      const response = await instance.fetch(req2)
      expect(response.status).toBe(409)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].code).toBe('duplicate')
    })
  })
})
