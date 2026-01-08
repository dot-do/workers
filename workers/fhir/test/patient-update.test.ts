/**
 * Tests for FHIR R4 Patient Update Operation
 *
 * Tests for workers-019: [GREEN] Implement Patient update operation
 *
 * Acceptance Criteria:
 * - Test PUT /fhir/r4/Patient/{id} updates existing Patient
 * - Test version management (increment versionId)
 * - Test If-Match header for optimistic locking
 * - Test conflict detection (409 when version mismatch)
 * - Test 404 for non-existent patient
 * - Test meta.lastUpdated is updated
 * - Test version history is preserved
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
  // Patient update operation
  updatePatient(id: string, patient: Partial<Patient>, ifMatch?: string): Promise<Patient | null>

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

describe('FHIR R4 Patient Update Operation', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('updatePatient() - Direct method', () => {
    it('should return null for non-existent patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const result = await instance.updatePatient('nonexistent', {
        name: [{
          family: 'Updated'
        }]
      })

      expect(result).toBeNull()
    })

    it('should update existing patient and increment version', async () => {
      const instance = new FHIRDO(ctx, env)

      // Create initial patient
      const initial: Patient = {
        resourceType: 'Patient',
        id: 'test-123',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'Smith',
          given: ['John']
        }],
        gender: 'male'
      }

      await ctx.storage.put('Patient:test-123', initial)

      // Update patient
      const result = await instance.updatePatient('test-123', {
        name: [{
          family: 'Smith',
          given: ['Jonathan']
        }]
      })

      expect(result).not.toBeNull()
      expect(result!.meta.versionId).toBe('2')
      expect(result!.name![0].given![0]).toBe('Jonathan')
    })

    it('should update meta.lastUpdated timestamp', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Patient = {
        resourceType: 'Patient',
        id: 'test-456',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'Doe',
          given: ['Jane']
        }]
      }

      await ctx.storage.put('Patient:test-456', initial)

      const result = await instance.updatePatient('test-456', {
        gender: 'female'
      })

      expect(result).not.toBeNull()
      expect(result!.meta.lastUpdated).not.toBe('2024-01-15T10:00:00.000Z')
      expect(new Date(result!.meta.lastUpdated).getTime()).toBeGreaterThan(
        new Date(initial.meta.lastUpdated).getTime()
      )
    })

    it('should preserve patient ID during update', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Patient = {
        resourceType: 'Patient',
        id: 'preserve-id',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'Original'
        }]
      }

      await ctx.storage.put('Patient:preserve-id', initial)

      const result = await instance.updatePatient('preserve-id', {
        name: [{
          family: 'Updated'
        }]
      })

      expect(result!.id).toBe('preserve-id')
    })

    it('should store version history', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Patient = {
        resourceType: 'Patient',
        id: 'history-test',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'Original'
        }]
      }

      await ctx.storage.put('Patient:history-test', initial)
      await ctx.storage.put('Patient:history-test:_history:1', initial)

      await instance.updatePatient('history-test', {
        name: [{
          family: 'Updated'
        }]
      })

      // Check that version 2 is stored in history
      const version2 = await ctx.storage.get<Patient>('Patient:history-test:_history:2')
      expect(version2).toBeDefined()
      expect(version2!.meta.versionId).toBe('2')
      expect(version2!.name![0].family).toBe('Updated')
    })

    it('should throw conflict error when If-Match version does not match', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Patient = {
        resourceType: 'Patient',
        id: 'conflict-test',
        meta: {
          versionId: '2',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'Current'
        }]
      }

      await ctx.storage.put('Patient:conflict-test', initial)

      // Try to update with wrong version
      await expect(
        instance.updatePatient('conflict-test', {
          name: [{ family: 'Updated' }]
        }, '1')
      ).rejects.toThrow(/conflict|version/i)
    })

    it('should succeed when If-Match version matches', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Patient = {
        resourceType: 'Patient',
        id: 'match-test',
        meta: {
          versionId: '3',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'Current'
        }]
      }

      await ctx.storage.put('Patient:match-test', initial)

      const result = await instance.updatePatient('match-test', {
        name: [{
          family: 'Updated'
        }]
      }, '3')

      expect(result).not.toBeNull()
      expect(result!.meta.versionId).toBe('4')
      expect(result!.name![0].family).toBe('Updated')
    })
  })

  describe('PUT /fhir/r4/Patient/{id} - HTTP endpoint', () => {
    it('should return 200 OK with updated Patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Patient = {
        resourceType: 'Patient',
        id: 'update-123',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'Martinez',
          given: ['Carlos']
        }]
      }

      await ctx.storage.put('Patient:update-123', initial)

      const updateData = {
        resourceType: 'Patient',
        id: 'update-123',
        name: [{
          family: 'Martinez',
          given: ['Carlos', 'Miguel']
        }],
        gender: 'male'
      }

      const request = new Request('http://fhir.do/fhir/r4/Patient/update-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Patient
      expect(data.meta.versionId).toBe('2')
      expect(data.name![0].given!.length).toBe(2)
    })

    it('should return Content-Type: application/fhir+json', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Patient = {
        resourceType: 'Patient',
        id: 'content-test',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'Test'
        }]
      }

      await ctx.storage.put('Patient:content-test', initial)

      const request = new Request('http://fhir.do/fhir/r4/Patient/content-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify({ ...initial, gender: 'male' })
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })

    it('should return 404 for non-existent patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const updateData = {
        resourceType: 'Patient',
        name: [{
          family: 'NotFound'
        }]
      }

      const request = new Request('http://fhir.do/fhir/r4/Patient/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].code).toBe('not-found')
    })

    it('should return 409 Conflict when If-Match version does not match', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Patient = {
        resourceType: 'Patient',
        id: 'conflict-http',
        meta: {
          versionId: '5',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'Conflict'
        }]
      }

      await ctx.storage.put('Patient:conflict-http', initial)

      const updateData = {
        resourceType: 'Patient',
        name: [{
          family: 'Updated'
        }]
      }

      const request = new Request('http://fhir.do/fhir/r4/Patient/conflict-http', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/fhir+json',
          'If-Match': 'W/"3"'
        },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(409)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].code).toMatch(/conflict|version-conflict/)
    })

    it('should succeed with correct If-Match header', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Patient = {
        resourceType: 'Patient',
        id: 'if-match-test',
        meta: {
          versionId: '7',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'IfMatch'
        }]
      }

      await ctx.storage.put('Patient:if-match-test', initial)

      const updateData = {
        resourceType: 'Patient',
        name: [{
          family: 'Updated'
        }]
      }

      const request = new Request('http://fhir.do/fhir/r4/Patient/if-match-test', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/fhir+json',
          'If-Match': 'W/"7"'
        },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Patient
      expect(data.meta.versionId).toBe('8')
    })

    it('should return ETag header with version', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Patient = {
        resourceType: 'Patient',
        id: 'etag-test',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:00:00.000Z'
        },
        name: [{
          family: 'ETag'
        }]
      }

      await ctx.storage.put('Patient:etag-test', initial)

      const updateData = {
        resourceType: 'Patient',
        name: [{
          family: 'Updated'
        }]
      }

      const request = new Request('http://fhir.do/fhir/r4/Patient/etag-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      const etag = response.headers.get('ETag')

      expect(etag).toBeDefined()
      expect(etag).toMatch(/W\/"2"/)
    })
  })
})
