/**
 * Tests: FHIR R4 Patient Search Operation
 *
 * Tests for workers-009: [RED] Test Patient search operations
 *
 * Acceptance Criteria:
 * - Search by identifier (MRN)
 * - Search by name (family, given)
 * - Search by birthdate
 * - Search by gender
 * - Combined search parameters
 * - Valid FHIR Bundle responses
 *
 * @see FHIR R4 Patient: http://hl7.org/fhir/R4/patient.html
 * @see FHIR R4 Search: http://hl7.org/fhir/R4/search.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'
import { Patient, Bundle } from '../src/types.js'

/**
 * FHIR DO Contract
 */
export interface FHIRDO {
  searchPatients(params: {
    identifier?: string
    name?: string
    family?: string
    given?: string
    birthdate?: string
    gender?: string
  }): Promise<Bundle<Patient>>

  fetch(request: Request): Promise<Response>
}

/**
 * Load FHIRDO implementation
 */
async function loadFHIRDO(): Promise<new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO> {
  const module = await import('../src/fhir.js')
  return module.FHIRDO
}

describe('FHIR R4 Patient Search Operation', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('Setup test data', () => {
    it('should create test patients in storage', async () => {
      // Create diverse test patients
      const patients: Patient[] = [
        {
          resourceType: 'Patient',
          id: 'patient-001',
          meta: {
            versionId: '1',
            lastUpdated: '2024-01-15T10:00:00.000Z'
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
            value: 'MRN12345'
          }],
          name: [{
            use: 'official',
            family: 'Smith',
            given: ['John', 'David']
          }],
          gender: 'male',
          birthDate: '1990-01-15'
        },
        {
          resourceType: 'Patient',
          id: 'patient-002',
          meta: {
            versionId: '1',
            lastUpdated: '2024-01-15T10:00:00.000Z'
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
            value: 'MRN67890'
          }],
          name: [{
            use: 'official',
            family: 'Johnson',
            given: ['Jane', 'Marie']
          }],
          gender: 'female',
          birthDate: '1985-03-22'
        },
        {
          resourceType: 'Patient',
          id: 'patient-003',
          meta: {
            versionId: '1',
            lastUpdated: '2024-01-15T10:00:00.000Z'
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
            value: 'MRN11111'
          }],
          name: [{
            use: 'official',
            family: 'Smith',
            given: ['Robert']
          }],
          gender: 'male',
          birthDate: '1990-01-15'
        }
      ]

      // Store all patients
      for (const patient of patients) {
        await ctx.storage.put(`Patient:${patient.id}`, patient)
      }

      // Verify storage
      const stored = await ctx.storage.get<Patient>('Patient:patient-001')
      expect(stored).not.toBeNull()
      expect(stored!.id).toBe('patient-001')
    })
  })

  describe('searchPatients() - Direct method', () => {
    beforeEach(async () => {
      // Set up test data
      const patients: Patient[] = [
        {
          resourceType: 'Patient',
          id: 'patient-001',
          meta: { versionId: '1', lastUpdated: '2024-01-15T10:00:00.000Z' },
          identifier: [{
            use: 'usual',
            type: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }]
            },
            system: 'urn:oid:1.2.36.146.595.217.0.1',
            value: 'MRN12345'
          }],
          name: [{ use: 'official', family: 'Smith', given: ['John', 'David'] }],
          gender: 'male',
          birthDate: '1990-01-15'
        },
        {
          resourceType: 'Patient',
          id: 'patient-002',
          meta: { versionId: '1', lastUpdated: '2024-01-15T10:00:00.000Z' },
          identifier: [{
            use: 'usual',
            type: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }]
            },
            system: 'urn:oid:1.2.36.146.595.217.0.1',
            value: 'MRN67890'
          }],
          name: [{ use: 'official', family: 'Johnson', given: ['Jane', 'Marie'] }],
          gender: 'female',
          birthDate: '1985-03-22'
        },
        {
          resourceType: 'Patient',
          id: 'patient-003',
          meta: { versionId: '1', lastUpdated: '2024-01-15T10:00:00.000Z' },
          identifier: [{
            use: 'usual',
            type: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }]
            },
            system: 'urn:oid:1.2.36.146.595.217.0.1',
            value: 'MRN11111'
          }],
          name: [{ use: 'official', family: 'Smith', given: ['Robert'] }],
          gender: 'male',
          birthDate: '1990-01-15'
        }
      ]

      for (const patient of patients) {
        await ctx.storage.put(`Patient:${patient.id}`, patient)
      }
    })

    it('should return empty Bundle when no patients match', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ family: 'NonExistent' })

      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.total).toBe(0)
      expect(bundle.entry).toEqual([])
    })

    it('should return all patients when no search parameters provided', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({})

      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.total).toBe(3)
      expect(bundle.entry).toHaveLength(3)
    })

    it('should search by identifier (MRN)', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ identifier: 'MRN12345' })

      expect(bundle.total).toBe(1)
      expect(bundle.entry).toHaveLength(1)
      expect(bundle.entry![0].resource!.id).toBe('patient-001')
      expect(bundle.entry![0].resource!.identifier![0].value).toBe('MRN12345')
    })

    it('should search by family name', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ family: 'Smith' })

      expect(bundle.total).toBe(2)
      expect(bundle.entry).toHaveLength(2)
      const ids = bundle.entry!.map(e => e.resource!.id).sort()
      expect(ids).toEqual(['patient-001', 'patient-003'])
    })

    it('should search by given name', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ given: 'John' })

      expect(bundle.total).toBe(1)
      expect(bundle.entry).toHaveLength(1)
      expect(bundle.entry![0].resource!.id).toBe('patient-001')
      expect(bundle.entry![0].resource!.name![0].given![0]).toBe('John')
    })

    it('should search by full name parameter (matches family or given)', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ name: 'Jane' })

      expect(bundle.total).toBe(1)
      expect(bundle.entry).toHaveLength(1)
      expect(bundle.entry![0].resource!.id).toBe('patient-002')
    })

    it('should search by birthdate', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ birthdate: '1990-01-15' })

      expect(bundle.total).toBe(2)
      expect(bundle.entry).toHaveLength(2)
      const ids = bundle.entry!.map(e => e.resource!.id).sort()
      expect(ids).toEqual(['patient-001', 'patient-003'])
    })

    it('should search by gender', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ gender: 'male' })

      expect(bundle.total).toBe(2)
      expect(bundle.entry).toHaveLength(2)
      const ids = bundle.entry!.map(e => e.resource!.id).sort()
      expect(ids).toEqual(['patient-001', 'patient-003'])
    })

    it('should search with combined parameters (gender and birthdate)', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({
        gender: 'male',
        birthdate: '1990-01-15'
      })

      expect(bundle.total).toBe(2)
      expect(bundle.entry).toHaveLength(2)
    })

    it('should search with combined parameters (family and gender)', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({
        family: 'Smith',
        gender: 'male'
      })

      expect(bundle.total).toBe(2)
      expect(bundle.entry).toHaveLength(2)
    })

    it('should return empty Bundle when combined parameters match nothing', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({
        family: 'Smith',
        gender: 'female'
      })

      expect(bundle.total).toBe(0)
      expect(bundle.entry).toEqual([])
    })

    it('should perform case-insensitive name search', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ family: 'smith' })

      expect(bundle.total).toBe(2)
    })

    it('should include fullUrl in each entry', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ identifier: 'MRN12345' })

      expect(bundle.entry![0].fullUrl).toBeDefined()
      expect(bundle.entry![0].fullUrl).toBe('Patient/patient-001')
    })

    it('should include search mode in each entry', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ identifier: 'MRN12345' })

      expect(bundle.entry![0].search).toBeDefined()
      expect(bundle.entry![0].search!.mode).toBe('match')
    })
  })

  describe('GET /fhir/r4/Patient - HTTP endpoint', () => {
    beforeEach(async () => {
      // Set up test data
      const patients: Patient[] = [
        {
          resourceType: 'Patient',
          id: 'patient-001',
          meta: { versionId: '1', lastUpdated: '2024-01-15T10:00:00.000Z' },
          identifier: [{
            use: 'usual',
            type: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }]
            },
            system: 'urn:oid:1.2.36.146.595.217.0.1',
            value: 'MRN12345'
          }],
          name: [{ use: 'official', family: 'Smith', given: ['John', 'David'] }],
          gender: 'male',
          birthDate: '1990-01-15'
        },
        {
          resourceType: 'Patient',
          id: 'patient-002',
          meta: { versionId: '1', lastUpdated: '2024-01-15T10:00:00.000Z' },
          identifier: [{
            use: 'usual',
            type: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }]
            },
            system: 'urn:oid:1.2.36.146.595.217.0.1',
            value: 'MRN67890'
          }],
          name: [{ use: 'official', family: 'Johnson', given: ['Jane', 'Marie'] }],
          gender: 'female',
          birthDate: '1985-03-22'
        }
      ]

      for (const patient of patients) {
        await ctx.storage.put(`Patient:${patient.id}`, patient)
      }
    })

    it('should return 200 with Bundle for search with no parameters', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Patient>
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.total).toBe(2)
    })

    it('should return Content-Type: application/fhir+json', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })

    it('should search by identifier query parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient?identifier=MRN12345', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Patient>
      expect(bundle.total).toBe(1)
      expect(bundle.entry![0].resource!.identifier![0].value).toBe('MRN12345')
    })

    it('should search by family query parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient?family=Smith', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Patient>
      expect(bundle.total).toBe(1)
      expect(bundle.entry![0].resource!.name![0].family).toBe('Smith')
    })

    it('should search by given query parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient?given=Jane', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Patient>
      expect(bundle.total).toBe(1)
      expect(bundle.entry![0].resource!.name![0].given![0]).toBe('Jane')
    })

    it('should search by name query parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient?name=Johnson', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Patient>
      expect(bundle.total).toBe(1)
      expect(bundle.entry![0].resource!.name![0].family).toBe('Johnson')
    })

    it('should search by birthdate query parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient?birthdate=1990-01-15', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Patient>
      expect(bundle.total).toBe(1)
      expect(bundle.entry![0].resource!.birthDate).toBe('1990-01-15')
    })

    it('should search by gender query parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient?gender=female', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Patient>
      expect(bundle.total).toBe(1)
      expect(bundle.entry![0].resource!.gender).toBe('female')
    })

    it('should search with multiple query parameters', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient?family=Smith&gender=male', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Patient>
      expect(bundle.total).toBe(1)
      expect(bundle.entry![0].resource!.name![0].family).toBe('Smith')
      expect(bundle.entry![0].resource!.gender).toBe('male')
    })

    it('should return empty Bundle when no matches found', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient?family=NonExistent', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Patient>
      expect(bundle.total).toBe(0)
      expect(bundle.entry).toEqual([])
    })

    it('should handle URL encoded query parameters', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Patient?name=John%20David', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Bundle structure validation', () => {
    beforeEach(async () => {
      const patient: Patient = {
        resourceType: 'Patient',
        id: 'patient-001',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:00:00.000Z' },
        identifier: [{
          use: 'usual',
          type: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }]
          },
          system: 'urn:oid:1.2.36.146.595.217.0.1',
          value: 'MRN12345'
        }],
        name: [{ use: 'official', family: 'Smith', given: ['John'] }],
        gender: 'male',
        birthDate: '1990-01-15'
      }

      await ctx.storage.put('Patient:patient-001', patient)
    })

    it('should return valid FHIR Bundle structure', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ identifier: 'MRN12345' })

      // Validate Bundle structure
      expect(bundle).toHaveProperty('resourceType')
      expect(bundle).toHaveProperty('type')
      expect(bundle).toHaveProperty('total')
      expect(bundle).toHaveProperty('entry')
    })

    it('should have correct Bundle.type for search results', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ identifier: 'MRN12345' })

      expect(bundle.type).toBe('searchset')
    })

    it('should include resource in each entry', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ identifier: 'MRN12345' })

      expect(bundle.entry![0]).toHaveProperty('resource')
      expect(bundle.entry![0].resource).toHaveProperty('resourceType')
      expect(bundle.entry![0].resource!.resourceType).toBe('Patient')
    })

    it('should include meta in each Patient resource', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ identifier: 'MRN12345' })

      const patient = bundle.entry![0].resource!
      expect(patient.meta).toBeDefined()
      expect(patient.meta.versionId).toBeDefined()
      expect(patient.meta.lastUpdated).toBeDefined()
    })

    it('should have total matching number of entries', async () => {
      const instance = new FHIRDO(ctx, env)
      const bundle = await instance.searchPatients({ identifier: 'MRN12345' })

      expect(bundle.total).toBe(bundle.entry!.length)
    })
  })
})
