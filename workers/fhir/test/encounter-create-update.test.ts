/**
 * Tests for FHIR R4 Encounter Create and Update Operations
 *
 * Tests for workers-026: [GREEN] Implement Encounter create and update
 *
 * Acceptance Criteria:
 * - Test POST /fhir/r4/Encounter creates new Encounter resource
 * - Test PUT /fhir/r4/Encounter/{id} updates existing Encounter
 * - Test resource validation (required fields: status, class)
 * - Test version management (increment versionId)
 * - Test meta.lastUpdated is updated
 * - Test version history is preserved
 * - Test 404 for non-existent encounter
 *
 * @see FHIR R4 Encounter: http://hl7.org/fhir/R4/encounter.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'
import { Encounter, OperationOutcome } from '../src/types.js'

/**
 * FHIR DO Contract
 */
export interface FHIRDO {
  // Encounter create and update operations
  createEncounter(encounter: Omit<Encounter, 'id' | 'meta'>): Promise<Encounter>
  updateEncounter(id: string, updates: Partial<Encounter>): Promise<Encounter | null>

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

describe('FHIR R4 Encounter Create and Update Operations', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('createEncounter() - Direct method', () => {
    it('should create a new Encounter with auto-generated ID', async () => {
      const instance = new FHIRDO(ctx, env)

      const newEncounter: Omit<Encounter, 'id' | 'meta'> = {
        resourceType: 'Encounter',
        status: 'in-progress',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'IMP',
          display: 'inpatient encounter'
        },
        subject: {
          reference: 'Patient/12345',
          display: 'John Smith'
        },
        period: {
          start: '2025-01-08T09:00:00.000Z'
        }
      }

      const result = await instance.createEncounter(newEncounter)

      expect(result.id).toBeDefined()
      expect(result.id).toMatch(/^enc-[a-f0-9]+$/)
      expect(result.resourceType).toBe('Encounter')
      expect(result.status).toBe('in-progress')
      expect(result.class.code).toBe('IMP')
    })

    it('should set meta.versionId to "1" for new resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const newEncounter: Omit<Encounter, 'id' | 'meta'> = {
        resourceType: 'Encounter',
        status: 'planned',
        class: {
          code: 'AMB'
        }
      }

      const result = await instance.createEncounter(newEncounter)

      expect(result.meta).toBeDefined()
      expect(result.meta.versionId).toBe('1')
    })

    it('should set meta.lastUpdated in ISO8601 format', async () => {
      const instance = new FHIRDO(ctx, env)

      const newEncounter: Omit<Encounter, 'id' | 'meta'> = {
        resourceType: 'Encounter',
        status: 'finished',
        class: {
          code: 'EMER'
        }
      }

      const result = await instance.createEncounter(newEncounter)

      expect(result.meta.lastUpdated).toBeDefined()
      expect(result.meta.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should store the encounter in storage', async () => {
      const instance = new FHIRDO(ctx, env)

      const newEncounter: Omit<Encounter, 'id' | 'meta'> = {
        resourceType: 'Encounter',
        status: 'in-progress',
        class: {
          code: 'IMP'
        }
      }

      const result = await instance.createEncounter(newEncounter)

      const stored = await ctx.storage.get<Encounter>(`Encounter:${result.id}`)
      expect(stored).toBeDefined()
      expect(stored!.id).toBe(result.id)
      expect(stored!.status).toBe('in-progress')
    })

    it('should store version history', async () => {
      const instance = new FHIRDO(ctx, env)

      const newEncounter: Omit<Encounter, 'id' | 'meta'> = {
        resourceType: 'Encounter',
        status: 'arrived',
        class: {
          code: 'AMB'
        }
      }

      const result = await instance.createEncounter(newEncounter)

      const history = await ctx.storage.get<Encounter>(`Encounter:${result.id}:_history:1`)
      expect(history).toBeDefined()
      expect(history!.meta.versionId).toBe('1')
    })
  })

  describe('POST /fhir/r4/Encounter - HTTP endpoint', () => {
    it('should return 201 Created with new Encounter', async () => {
      const instance = new FHIRDO(ctx, env)

      const newEncounter = {
        resourceType: 'Encounter',
        status: 'in-progress',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'IMP',
          display: 'inpatient encounter'
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/Encounter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(newEncounter)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const data = await response.json() as Encounter
      expect(data.id).toBeDefined()
      expect(data.resourceType).toBe('Encounter')
      expect(data.meta.versionId).toBe('1')
    })

    it('should return Location header with resource URL', async () => {
      const instance = new FHIRDO(ctx, env)

      const newEncounter = {
        resourceType: 'Encounter',
        status: 'planned',
        class: {
          code: 'AMB'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/Encounter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(newEncounter)
      })

      const response = await instance.fetch(request)
      const location = response.headers.get('Location')

      expect(location).toBeDefined()
      expect(location).toMatch(/\/fhir\/r4\/Encounter\/enc-[a-f0-9]+$/)
    })

    it('should return Content-Type: application/fhir+json', async () => {
      const instance = new FHIRDO(ctx, env)

      const newEncounter = {
        resourceType: 'Encounter',
        status: 'finished',
        class: {
          code: 'EMER'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/Encounter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(newEncounter)
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })

    it('should return 400 for missing status', async () => {
      const instance = new FHIRDO(ctx, env)

      const invalidEncounter = {
        resourceType: 'Encounter',
        class: {
          code: 'AMB'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/Encounter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(invalidEncounter)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].severity).toBe('error')
    })

    it('should return 400 for missing class', async () => {
      const instance = new FHIRDO(ctx, env)

      const invalidEncounter = {
        resourceType: 'Encounter',
        status: 'in-progress'
      }

      const request = new Request('http://fhir.do/fhir/r4/Encounter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(invalidEncounter)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].severity).toBe('error')
    })
  })

  describe('updateEncounter() - Direct method', () => {
    it('should return null for non-existent encounter', async () => {
      const instance = new FHIRDO(ctx, env)

      const result = await instance.updateEncounter('nonexistent', {
        status: 'finished'
      })

      expect(result).toBeNull()
    })

    it('should update existing encounter and increment version', async () => {
      const instance = new FHIRDO(ctx, env)

      // Create initial encounter
      const initial: Encounter = {
        resourceType: 'Encounter',
        id: 'test-123',
        meta: {
          versionId: '1',
          lastUpdated: '2025-01-08T10:00:00.000Z'
        },
        status: 'in-progress',
        class: {
          code: 'IMP'
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('Encounter:test-123', initial)

      // Update encounter
      const result = await instance.updateEncounter('test-123', {
        status: 'finished',
        period: {
          start: '2025-01-08T09:00:00.000Z',
          end: '2025-01-08T14:00:00.000Z'
        }
      })

      expect(result).not.toBeNull()
      expect(result!.meta.versionId).toBe('2')
      expect(result!.status).toBe('finished')
      expect(result!.period?.end).toBe('2025-01-08T14:00:00.000Z')
    })

    it('should update meta.lastUpdated timestamp', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Encounter = {
        resourceType: 'Encounter',
        id: 'test-456',
        meta: {
          versionId: '1',
          lastUpdated: '2025-01-08T10:00:00.000Z'
        },
        status: 'in-progress',
        class: {
          code: 'AMB'
        }
      }

      await ctx.storage.put('Encounter:test-456', initial)

      const result = await instance.updateEncounter('test-456', {
        status: 'finished'
      })

      expect(result).not.toBeNull()
      expect(result!.meta.lastUpdated).not.toBe('2025-01-08T10:00:00.000Z')
      expect(new Date(result!.meta.lastUpdated).getTime()).toBeGreaterThan(
        new Date(initial.meta.lastUpdated).getTime()
      )
    })

    it('should preserve encounter ID during update', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Encounter = {
        resourceType: 'Encounter',
        id: 'preserve-id',
        meta: {
          versionId: '1',
          lastUpdated: '2025-01-08T10:00:00.000Z'
        },
        status: 'planned',
        class: {
          code: 'IMP'
        }
      }

      await ctx.storage.put('Encounter:preserve-id', initial)

      const result = await instance.updateEncounter('preserve-id', {
        status: 'in-progress'
      })

      expect(result!.id).toBe('preserve-id')
    })

    it('should store version history', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Encounter = {
        resourceType: 'Encounter',
        id: 'history-test',
        meta: {
          versionId: '1',
          lastUpdated: '2025-01-08T10:00:00.000Z'
        },
        status: 'in-progress',
        class: {
          code: 'IMP'
        }
      }

      await ctx.storage.put('Encounter:history-test', initial)
      await ctx.storage.put('Encounter:history-test:_history:1', initial)

      await instance.updateEncounter('history-test', {
        status: 'finished'
      })

      // Check that version 2 is stored in history
      const version2 = await ctx.storage.get<Encounter>('Encounter:history-test:_history:2')
      expect(version2).toBeDefined()
      expect(version2!.meta.versionId).toBe('2')
      expect(version2!.status).toBe('finished')
    })
  })

  describe('PUT /fhir/r4/Encounter/{id} - HTTP endpoint', () => {
    it('should return 200 OK with updated Encounter', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Encounter = {
        resourceType: 'Encounter',
        id: 'update-123',
        meta: {
          versionId: '1',
          lastUpdated: '2025-01-08T10:00:00.000Z'
        },
        status: 'in-progress',
        class: {
          code: 'IMP'
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('Encounter:update-123', initial)

      const updateData = {
        resourceType: 'Encounter',
        id: 'update-123',
        status: 'finished',
        class: {
          code: 'IMP'
        },
        period: {
          start: '2025-01-08T09:00:00.000Z',
          end: '2025-01-08T14:00:00.000Z'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/Encounter/update-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Encounter
      expect(data.meta.versionId).toBe('2')
      expect(data.status).toBe('finished')
    })

    it('should return Content-Type: application/fhir+json', async () => {
      const instance = new FHIRDO(ctx, env)

      const initial: Encounter = {
        resourceType: 'Encounter',
        id: 'content-test',
        meta: {
          versionId: '1',
          lastUpdated: '2025-01-08T10:00:00.000Z'
        },
        status: 'planned',
        class: {
          code: 'AMB'
        }
      }

      await ctx.storage.put('Encounter:content-test', initial)

      const request = new Request('http://fhir.do/fhir/r4/Encounter/content-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify({ ...initial, status: 'in-progress' })
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })

    it('should return 404 for non-existent encounter', async () => {
      const instance = new FHIRDO(ctx, env)

      const updateData = {
        resourceType: 'Encounter',
        status: 'finished',
        class: {
          code: 'IMP'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/Encounter/nonexistent', {
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
  })
})
