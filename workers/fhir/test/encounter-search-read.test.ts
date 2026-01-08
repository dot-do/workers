/**
 * RED Tests: FHIR R4 Encounter Search and Read Operations
 *
 * Tests for workers-022: [RED] Test Encounter search and read operations
 *
 * Acceptance Criteria:
 * - Test GET /fhir/r4/Encounter?patient={id}
 * - Test GET /fhir/r4/Encounter?date=ge2025-01-01
 * - Test GET /fhir/r4/Encounter?status=in-progress
 * - Test GET /fhir/r4/Encounter?class=inpatient
 * - Test GET /fhir/r4/Encounter/{id} returns valid Encounter
 *
 * @see FHIR R4 Encounter: http://hl7.org/fhir/R4/encounter.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * FHIR R4 Encounter Resource Type
 */
export interface Encounter {
  resourceType: 'Encounter'
  id: string
  meta: {
    versionId: string
    lastUpdated: string
  }
  identifier?: Array<{
    use?: string
    system?: string
    value: string
  }>
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown'
  class: {
    system?: string
    code: string
    display?: string
  }
  type?: Array<{
    coding?: Array<{
      system?: string
      code: string
      display?: string
    }>
    text?: string
  }>
  subject?: {
    reference: string
    display?: string
  }
  participant?: Array<{
    type?: Array<{
      coding?: Array<{
        system?: string
        code: string
        display?: string
      }>
    }>
    individual?: {
      reference: string
      display?: string
    }
  }>
  period?: {
    start?: string
    end?: string
  }
  reasonCode?: Array<{
    coding?: Array<{
      system?: string
      code: string
      display?: string
    }>
    text?: string
  }>
  hospitalization?: {
    admitSource?: {
      coding?: Array<{
        system?: string
        code: string
        display?: string
      }>
    }
    dischargeDisposition?: {
      coding?: Array<{
        system?: string
        code: string
        display?: string
      }>
    }
  }
  location?: Array<{
    location: {
      reference: string
      display?: string
    }
    status?: 'planned' | 'active' | 'reserved' | 'completed'
  }>
}

/**
 * FHIR R4 Bundle Resource Type
 */
export interface Bundle<T = any> {
  resourceType: 'Bundle'
  type: 'searchset' | 'collection' | 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history'
  total?: number
  link?: Array<{
    relation: string
    url: string
  }>
  entry?: Array<{
    fullUrl?: string
    resource?: T
    search?: {
      mode?: 'match' | 'include'
      score?: number
    }
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
  // Encounter read operations
  readEncounter(id: string): Promise<Encounter | null>
  searchEncounters(params: {
    patient?: string
    date?: string
    status?: string
    class?: string
  }): Promise<Bundle<Encounter>>

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

describe('FHIR R4 Encounter Search and Read Operations', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('readEncounter() - Direct method', () => {
    it('should return null for non-existent encounter', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readEncounter('nonexistent')
      expect(result).toBeNull()
    })

    it('should return Encounter resource with required fields', async () => {
      const instance = new FHIRDO(ctx, env)

      // Store an encounter
      const encounter: Encounter = {
        resourceType: 'Encounter',
        id: 'enc-12345',
        meta: {
          versionId: '1',
          lastUpdated: '2025-01-08T10:30:00.000Z'
        },
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

      await ctx.storage.put('Encounter:enc-12345', encounter)

      const result = await instance.readEncounter('enc-12345')
      expect(result).not.toBeNull()
      expect(result!.resourceType).toBe('Encounter')
      expect(result!.id).toBe('enc-12345')
      expect(result!.status).toBe('in-progress')
      expect(result!.class.code).toBe('IMP')
      expect(result!.meta.versionId).toBeDefined()
      expect(result!.meta.lastUpdated).toBeDefined()
    })

    it('should include meta.versionId in response', async () => {
      const instance = new FHIRDO(ctx, env)

      const encounter: Encounter = {
        resourceType: 'Encounter',
        id: 'enc-test-123',
        meta: {
          versionId: '1',
          lastUpdated: '2025-01-08T10:30:00.000Z'
        },
        status: 'finished',
        class: {
          code: 'AMB'
        }
      }

      await ctx.storage.put('Encounter:enc-test-123', encounter)

      const result = await instance.readEncounter('enc-test-123')
      expect(result).not.toBeNull()
      expect(result!.meta).toBeDefined()
      expect(result!.meta.versionId).toBe('1')
    })
  })

  describe('GET /fhir/r4/Encounter/{id} - HTTP endpoint', () => {
    it('should return 200 with valid Encounter resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const encounter: Encounter = {
        resourceType: 'Encounter',
        id: 'enc-12345',
        meta: {
          versionId: '1',
          lastUpdated: '2025-01-08T10:30:00.000Z'
        },
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

      await ctx.storage.put('Encounter:enc-12345', encounter)

      const request = new Request('http://fhir.do/fhir/r4/Encounter/enc-12345', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Encounter
      expect(data.resourceType).toBe('Encounter')
      expect(data.id).toBe('enc-12345')
      expect(data.status).toBe('in-progress')
      expect(data.meta.versionId).toBeDefined()
      expect(data.meta.lastUpdated).toBeDefined()
    })

    it('should return Content-Type: application/fhir+json', async () => {
      const instance = new FHIRDO(ctx, env)

      const encounter: Encounter = {
        resourceType: 'Encounter',
        id: 'content-type-test',
        meta: {
          versionId: '1',
          lastUpdated: '2025-01-08T10:30:00.000Z'
        },
        status: 'finished',
        class: {
          code: 'AMB'
        }
      }

      await ctx.storage.put('Encounter:content-type-test', encounter)

      const request = new Request('http://fhir.do/fhir/r4/Encounter/content-type-test', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })

    it('should return 404 with OperationOutcome for non-existent encounter', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Encounter/nonexistent', {
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
  })

  describe('searchEncounters() - Direct method', () => {
    beforeEach(async () => {
      const instance = new FHIRDO(ctx, env)

      // Create test encounters
      const encounters: Encounter[] = [
        {
          resourceType: 'Encounter',
          id: 'enc-1',
          meta: {
            versionId: '1',
            lastUpdated: '2025-01-08T10:00:00.000Z'
          },
          status: 'in-progress',
          class: {
            code: 'IMP',
            display: 'inpatient'
          },
          subject: {
            reference: 'Patient/patient-123'
          },
          period: {
            start: '2025-01-08T09:00:00.000Z'
          }
        },
        {
          resourceType: 'Encounter',
          id: 'enc-2',
          meta: {
            versionId: '1',
            lastUpdated: '2025-01-07T10:00:00.000Z'
          },
          status: 'finished',
          class: {
            code: 'AMB',
            display: 'ambulatory'
          },
          subject: {
            reference: 'Patient/patient-123'
          },
          period: {
            start: '2024-12-15T10:00:00.000Z',
            end: '2024-12-15T11:00:00.000Z'
          }
        },
        {
          resourceType: 'Encounter',
          id: 'enc-3',
          meta: {
            versionId: '1',
            lastUpdated: '2025-01-06T10:00:00.000Z'
          },
          status: 'in-progress',
          class: {
            code: 'EMER',
            display: 'emergency'
          },
          subject: {
            reference: 'Patient/patient-456'
          },
          period: {
            start: '2025-01-05T14:00:00.000Z'
          }
        },
        {
          resourceType: 'Encounter',
          id: 'enc-4',
          meta: {
            versionId: '1',
            lastUpdated: '2025-01-04T10:00:00.000Z'
          },
          status: 'planned',
          class: {
            code: 'IMP',
            display: 'inpatient'
          },
          subject: {
            reference: 'Patient/patient-789'
          },
          period: {
            start: '2025-01-10T08:00:00.000Z'
          }
        }
      ]

      // Store all encounters
      for (const enc of encounters) {
        await ctx.storage.put(`Encounter:${enc.id}`, enc)
      }
    })

    it('should return empty bundle when no matches found', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.searchEncounters({ patient: 'Patient/nonexistent' })

      expect(result.resourceType).toBe('Bundle')
      expect(result.type).toBe('searchset')
      expect(result.total).toBe(0)
      expect(result.entry).toEqual([])
    })

    it('should search by patient reference', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.searchEncounters({ patient: 'patient-123' })

      expect(result.resourceType).toBe('Bundle')
      expect(result.type).toBe('searchset')
      expect(result.total).toBe(2)
      expect(result.entry).toBeDefined()
      expect(result.entry!.length).toBe(2)
      expect(result.entry!.every(e => e.resource?.subject?.reference === 'Patient/patient-123')).toBe(true)
    })

    it('should search by status', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.searchEncounters({ status: 'in-progress' })

      expect(result.resourceType).toBe('Bundle')
      expect(result.type).toBe('searchset')
      expect(result.total).toBe(2)
      expect(result.entry).toBeDefined()
      expect(result.entry!.length).toBe(2)
      expect(result.entry!.every(e => e.resource?.status === 'in-progress')).toBe(true)
    })

    it('should search by class code', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.searchEncounters({ class: 'IMP' })

      expect(result.resourceType).toBe('Bundle')
      expect(result.type).toBe('searchset')
      expect(result.total).toBe(2)
      expect(result.entry).toBeDefined()
      expect(result.entry!.length).toBe(2)
      expect(result.entry!.every(e => e.resource?.class.code === 'IMP')).toBe(true)
    })

    it('should search by date with ge prefix (greater than or equal)', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.searchEncounters({ date: 'ge2025-01-01' })

      expect(result.resourceType).toBe('Bundle')
      expect(result.type).toBe('searchset')
      expect(result.total).toBe(3)
      expect(result.entry).toBeDefined()
      expect(result.entry!.length).toBe(3)

      // All returned encounters should have period.start >= 2025-01-01
      for (const entry of result.entry!) {
        const start = entry.resource?.period?.start
        expect(start).toBeDefined()
        expect(new Date(start!).getTime()).toBeGreaterThanOrEqual(new Date('2025-01-01').getTime())
      }
    })

    it('should search by date with le prefix (less than or equal)', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.searchEncounters({ date: 'le2025-01-01' })

      expect(result.resourceType).toBe('Bundle')
      expect(result.type).toBe('searchset')
      expect(result.total).toBe(1)
      expect(result.entry).toBeDefined()
      expect(result.entry!.length).toBe(1)
      expect(result.entry![0].resource?.id).toBe('enc-2')
    })

    it('should combine multiple search parameters', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.searchEncounters({
        patient: 'patient-123',
        status: 'in-progress'
      })

      expect(result.resourceType).toBe('Bundle')
      expect(result.type).toBe('searchset')
      expect(result.total).toBe(1)
      expect(result.entry).toBeDefined()
      expect(result.entry!.length).toBe(1)
      expect(result.entry![0].resource?.id).toBe('enc-1')
    })
  })

  describe('GET /fhir/r4/Encounter - HTTP search endpoint', () => {
    beforeEach(async () => {
      const instance = new FHIRDO(ctx, env)

      // Create test encounters
      const encounters: Encounter[] = [
        {
          resourceType: 'Encounter',
          id: 'enc-http-1',
          meta: {
            versionId: '1',
            lastUpdated: '2025-01-08T10:00:00.000Z'
          },
          status: 'in-progress',
          class: {
            code: 'IMP',
            display: 'inpatient'
          },
          subject: {
            reference: 'Patient/http-patient-123'
          },
          period: {
            start: '2025-01-08T09:00:00.000Z'
          }
        },
        {
          resourceType: 'Encounter',
          id: 'enc-http-2',
          meta: {
            versionId: '1',
            lastUpdated: '2025-01-07T10:00:00.000Z'
          },
          status: 'finished',
          class: {
            code: 'AMB',
            display: 'ambulatory'
          },
          subject: {
            reference: 'Patient/http-patient-456'
          },
          period: {
            start: '2024-12-15T10:00:00.000Z',
            end: '2024-12-15T11:00:00.000Z'
          }
        }
      ]

      for (const enc of encounters) {
        await ctx.storage.put(`Encounter:${enc.id}`, enc)
      }
    })

    it('should return searchset Bundle for patient search', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Encounter?patient=http-patient-123', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Encounter>
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.total).toBe(1)
      expect(bundle.entry).toBeDefined()
      expect(bundle.entry!.length).toBe(1)
      expect(bundle.entry![0].resource?.id).toBe('enc-http-1')
    })

    it('should return searchset Bundle for status search', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Encounter?status=in-progress', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Encounter>
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.total).toBe(1)
    })

    it('should return searchset Bundle for class search', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Encounter?class=AMB', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Encounter>
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.total).toBe(1)
      expect(bundle.entry![0].resource?.class.code).toBe('AMB')
    })

    it('should return searchset Bundle for date search with ge prefix', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Encounter?date=ge2025-01-01', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Encounter>
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.total).toBe(1)
    })

    it('should return empty Bundle when no results match', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Encounter?patient=nonexistent', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle<Encounter>
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.total).toBe(0)
      expect(bundle.entry).toEqual([])
    })

    it('should return Content-Type: application/fhir+json for search', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Encounter?patient=http-patient-123', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })
  })
})
