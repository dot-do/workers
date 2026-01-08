/**
 * GREEN Tests: FHIR R4 Procedure CRUD Operations
 *
 * Tests for workers-041: [GREEN] Implement Procedure CRUD
 *
 * Acceptance Criteria:
 * - Test createProcedure() with generated ID
 * - Test readProcedure() by ID
 * - Test updateProcedure() with version increment
 * - Test deleteProcedure()
 * - Test searchProcedures() with patient filter
 * - Test searchProcedures() with date filter
 * - Test HTTP endpoints (GET, POST, PUT, DELETE)
 *
 * @see FHIR R4 Procedure: http://hl7.org/fhir/R4/procedure.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * FHIR R4 Procedure Resource Type
 */
export interface Procedure {
  resourceType: 'Procedure'
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
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown'
  code?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  subject: {
    reference: string
    display?: string
  }
  encounter?: {
    reference: string
    display?: string
  }
  performedDateTime?: string
  performedPeriod?: {
    start?: string
    end?: string
  }
  performedString?: string
  performer?: Array<{
    function?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    actor: {
      reference: string
      display?: string
    }
  }>
  location?: {
    reference: string
    display?: string
  }
  reasonCode?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  bodySite?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  outcome?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  note?: Array<{
    authorString?: string
    time?: string
    text: string
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
 * FHIR R4 Bundle Resource Type
 */
export interface Bundle {
  resourceType: 'Bundle'
  type: 'searchset' | 'collection' | 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history'
  total?: number
  link?: Array<{
    relation: string
    url: string
  }>
  entry?: Array<{
    fullUrl?: string
    resource: Procedure
    search?: {
      mode: 'match' | 'include' | 'outcome'
      score?: number
    }
  }>
}

/**
 * FHIR DO Contract for Procedure Operations
 */
export interface FHIRDO {
  // Procedure CRUD operations
  createProcedure(procedure: Omit<Procedure, 'id' | 'meta'>): Promise<Procedure>
  readProcedure(id: string): Promise<Procedure | null>
  updateProcedure(id: string, procedure: Partial<Procedure>): Promise<Procedure | null>
  deleteProcedure(id: string): Promise<boolean>

  // Procedure search operations
  searchProcedures(params: {
    patient?: string
    date?: string
    code?: string
    status?: string
  }): Promise<Procedure[]>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Load FHIRDO module
 */
async function loadFHIRDO(): Promise<new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO> {
  const module = await import('../src/fhir.js')
  return module.FHIRDO
}

describe('FHIR R4 Procedure CRUD Operations', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('createProcedure() - Create Procedure', () => {
    it('should create a new Procedure with generated ID', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedureData: Omit<Procedure, 'id' | 'meta'> = {
        resourceType: 'Procedure',
        status: 'completed',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '80146002',
            display: 'Appendectomy'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const result = await instance.createProcedure(procedureData)

      expect(result).toBeDefined()
      expect(result.resourceType).toBe('Procedure')
      expect(result.id).toBeDefined()
      expect(result.meta).toBeDefined()
      expect(result.meta.versionId).toBe('1')
      expect(result.meta.lastUpdated).toBeDefined()
      expect(result.status).toBe('completed')
    })

    it('should create Procedure with CPT code', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedureData: Omit<Procedure, 'id' | 'meta'> = {
        resourceType: 'Procedure',
        status: 'completed',
        code: {
          coding: [{
            system: 'http://www.ama-assn.org/go/cpt',
            code: '99213',
            display: 'Office visit, established patient'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const result = await instance.createProcedure(procedureData)

      expect(result.code?.coding).toBeDefined()
      expect(result.code!.coding[0].system).toBe('http://www.ama-assn.org/go/cpt')
      expect(result.code!.coding[0].code).toBe('99213')
    })

    it('should create Procedure with performer', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedureData: Omit<Procedure, 'id' | 'meta'> = {
        resourceType: 'Procedure',
        status: 'completed',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '387713003',
            display: 'Surgical procedure'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        performer: [{
          function: {
            coding: [{
              system: 'http://snomed.info/sct',
              code: '304292004',
              display: 'Surgeon'
            }]
          },
          actor: {
            reference: 'Practitioner/surgeon-1',
            display: 'Dr. Jane Smith'
          }
        }],
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const result = await instance.createProcedure(procedureData)

      expect(result.performer).toBeDefined()
      expect(result.performer![0].actor.reference).toBe('Practitioner/surgeon-1')
    })

    it('should create Procedure with performedPeriod', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedureData: Omit<Procedure, 'id' | 'meta'> = {
        resourceType: 'Procedure',
        status: 'completed',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '387713003',
            display: 'Surgical procedure'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        performedPeriod: {
          start: '2024-01-15T10:30:00Z',
          end: '2024-01-15T12:00:00Z'
        }
      }

      const result = await instance.createProcedure(procedureData)

      expect(result.performedPeriod).toBeDefined()
      expect(result.performedPeriod!.start).toBe('2024-01-15T10:30:00Z')
      expect(result.performedPeriod!.end).toBe('2024-01-15T12:00:00Z')
    })

    it('should create Procedure with body site', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedureData: Omit<Procedure, 'id' | 'meta'> = {
        resourceType: 'Procedure',
        status: 'completed',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '80146002',
            display: 'Appendectomy'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        bodySite: [{
          coding: [{
            system: 'http://snomed.info/sct',
            code: '66754008',
            display: 'Appendix structure'
          }]
        }],
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const result = await instance.createProcedure(procedureData)

      expect(result.bodySite).toBeDefined()
      expect(result.bodySite![0].coding[0].code).toBe('66754008')
    })
  })

  describe('readProcedure() - Read Procedure', () => {
    it('should return null for non-existent procedure', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readProcedure('nonexistent')
      expect(result).toBeNull()
    })

    it('should return Procedure resource with required fields', async () => {
      const instance = new FHIRDO(ctx, env)

      // Create and store a procedure
      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-12345',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'completed',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '80146002',
            display: 'Appendectomy'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-12345', procedure)

      const result = await instance.readProcedure('proc-12345')
      expect(result).not.toBeNull()
      expect(result!.resourceType).toBe('Procedure')
      expect(result!.id).toBe('proc-12345')
      expect(result!.meta.versionId).toBeDefined()
      expect(result!.meta.lastUpdated).toBeDefined()
      expect(result!.status).toBe('completed')
    })
  })

  describe('updateProcedure() - Update Procedure', () => {
    it('should update Procedure status', async () => {
      const instance = new FHIRDO(ctx, env)

      // Create initial procedure
      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-update-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'in-progress',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '80146002',
            display: 'Appendectomy'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-update-1', procedure)

      const updated = await instance.updateProcedure('proc-update-1', {
        status: 'completed'
      })

      expect(updated).not.toBeNull()
      expect(updated!.status).toBe('completed')
      expect(updated!.meta.versionId).toBe('2')
    })

    it('should update Procedure outcome', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-update-2',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'completed',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '80146002',
            display: 'Appendectomy'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-update-2', procedure)

      const updated = await instance.updateProcedure('proc-update-2', {
        outcome: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '385669000',
            display: 'Successful'
          }]
        }
      })

      expect(updated).not.toBeNull()
      expect(updated!.outcome).toBeDefined()
      expect(updated!.outcome!.coding[0].code).toBe('385669000')
    })

    it('should return null for non-existent procedure', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.updateProcedure('nonexistent', {
        status: 'completed'
      })
      expect(result).toBeNull()
    })
  })

  describe('deleteProcedure() - Delete Procedure', () => {
    it('should delete existing procedure', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-delete-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'completed',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '80146002',
            display: 'Appendectomy'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-delete-1', procedure)

      const result = await instance.deleteProcedure('proc-delete-1')
      expect(result).toBe(true)

      const checkDeleted = await instance.readProcedure('proc-delete-1')
      expect(checkDeleted).toBeNull()
    })

    it('should return false for non-existent procedure', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.deleteProcedure('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('searchProcedures() - Search Procedures', () => {
    it('should search by patient', async () => {
      const instance = new FHIRDO(ctx, env)

      // Create multiple procedures for different patients
      const proc1: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-search-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/patient-1' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const proc2: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-search-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/patient-2' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-search-1', proc1)
      await ctx.storage.put('Procedure:proc-search-2', proc2)

      const results = await instance.searchProcedures({ patient: 'patient-1' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].subject.reference).toBe('Patient/patient-1')
    })

    it('should search by status', async () => {
      const instance = new FHIRDO(ctx, env)

      const proc1: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-status-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const proc2: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-status-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'in-progress',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-status-1', proc1)
      await ctx.storage.put('Procedure:proc-status-2', proc2)

      const results = await instance.searchProcedures({ status: 'completed' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].status).toBe('completed')
    })

    it('should search by code', async () => {
      const instance = new FHIRDO(ctx, env)

      const proc1: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-code-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const proc2: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-code-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '387713003', display: 'Surgical procedure' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-code-1', proc1)
      await ctx.storage.put('Procedure:proc-code-2', proc2)

      const results = await instance.searchProcedures({ code: '80146002' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].code!.coding[0].code).toBe('80146002')
    })

    it('should search by date with eq prefix', async () => {
      const instance = new FHIRDO(ctx, env)

      const proc1: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-date-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const proc2: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-date-2',
        meta: { versionId: '1', lastUpdated: '2024-01-20T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-20T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-date-1', proc1)
      await ctx.storage.put('Procedure:proc-date-2', proc2)

      const results = await instance.searchProcedures({ date: 'eq2024-01-15T10:30:00Z' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('proc-date-1')
    })

    it('should search by date with ge prefix (greater than or equal)', async () => {
      const instance = new FHIRDO(ctx, env)

      const proc1: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-date-ge-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const proc2: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-date-ge-2',
        meta: { versionId: '1', lastUpdated: '2024-01-20T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-20T10:30:00Z'
      }

      const proc3: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-date-ge-3',
        meta: { versionId: '1', lastUpdated: '2024-01-10T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-10T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-date-ge-1', proc1)
      await ctx.storage.put('Procedure:proc-date-ge-2', proc2)
      await ctx.storage.put('Procedure:proc-date-ge-3', proc3)

      const results = await instance.searchProcedures({ date: 'ge2024-01-15T10:30:00Z' })

      expect(results).toBeDefined()
      expect(results.length).toBe(2)
      expect(results.some(p => p.id === 'proc-date-ge-1')).toBe(true)
      expect(results.some(p => p.id === 'proc-date-ge-2')).toBe(true)
    })

    it('should search by patient and date combined', async () => {
      const instance = new FHIRDO(ctx, env)

      const proc1: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-combined-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/patient-1' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const proc2: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-combined-2',
        meta: { versionId: '1', lastUpdated: '2024-01-20T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/patient-1' },
        performedDateTime: '2024-01-20T10:30:00Z'
      }

      const proc3: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-combined-3',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/patient-2' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-combined-1', proc1)
      await ctx.storage.put('Procedure:proc-combined-2', proc2)
      await ctx.storage.put('Procedure:proc-combined-3', proc3)

      const results = await instance.searchProcedures({
        patient: 'patient-1',
        date: 'ge2024-01-15T10:30:00Z'
      })

      expect(results).toBeDefined()
      expect(results.length).toBe(2)
      expect(results.every(p => p.subject.reference === 'Patient/patient-1')).toBe(true)
    })
  })

  describe('GET /fhir/r4/Procedure/{id} - HTTP endpoint', () => {
    it('should return 200 with valid Procedure resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-http-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'completed',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '80146002',
            display: 'Appendectomy'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-http-1', procedure)

      const request = new Request('http://fhir.do/fhir/r4/Procedure/proc-http-1', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Procedure
      expect(data.resourceType).toBe('Procedure')
      expect(data.id).toBe('proc-http-1')
    })

    it('should return 404 with OperationOutcome for non-existent procedure', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Procedure/nonexistent', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].code).toBe('not-found')
    })

    it('should return Content-Type: application/fhir+json', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-content-type',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-content-type', procedure)

      const request = new Request('http://fhir.do/fhir/r4/Procedure/proc-content-type', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })
  })

  describe('GET /fhir/r4/Procedure - Search endpoint', () => {
    it('should search by patient parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-search-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/test-patient' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-search-http-1', procedure)

      const request = new Request('http://fhir.do/fhir/r4/Procedure?patient=test-patient', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.entry).toBeDefined()
      expect(bundle.entry!.length).toBeGreaterThan(0)
    })

    it('should search by patient and date', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-search-http-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/test-patient' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-search-http-2', procedure)

      const request = new Request('http://fhir.do/fhir/r4/Procedure?patient=test-patient&date=ge2024-01-01T00:00:00Z', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })

    it('should search by status', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-search-http-3',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/test-patient' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-search-http-3', procedure)

      const request = new Request('http://fhir.do/fhir/r4/Procedure?status=completed', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })
  })

  describe('POST /fhir/r4/Procedure - Create endpoint', () => {
    it('should create new Procedure via POST', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedureData: Omit<Procedure, 'id' | 'meta'> = {
        resourceType: 'Procedure',
        status: 'completed',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '80146002',
            display: 'Appendectomy'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      const request = new Request('http://fhir.do/fhir/r4/Procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(procedureData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const created = await response.json() as Procedure
      expect(created.id).toBeDefined()
      expect(created.meta.versionId).toBe('1')
    })

    it('should return 400 if subject is missing', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedureData = {
        resourceType: 'Procedure',
        status: 'completed',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '80146002',
            display: 'Appendectomy'
          }]
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/Procedure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(procedureData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].code).toBe('invalid')
    })
  })

  describe('PUT /fhir/r4/Procedure/{id} - Update endpoint', () => {
    it('should update existing Procedure via PUT', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-put-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'in-progress',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-put-1', procedure)

      const updateData: Partial<Procedure> = {
        status: 'completed'
      }

      const request = new Request('http://fhir.do/fhir/r4/Procedure/proc-put-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const updated = await response.json() as Procedure
      expect(updated.meta.versionId).toBe('2')
      expect(updated.status).toBe('completed')
    })
  })

  describe('DELETE /fhir/r4/Procedure/{id} - Delete endpoint', () => {
    it('should delete Procedure via DELETE', async () => {
      const instance = new FHIRDO(ctx, env)

      const procedure: Procedure = {
        resourceType: 'Procedure',
        id: 'proc-delete-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '80146002', display: 'Appendectomy' }]
        },
        subject: { reference: 'Patient/12345' },
        performedDateTime: '2024-01-15T10:30:00Z'
      }

      await ctx.storage.put('Procedure:proc-delete-http-1', procedure)

      const request = new Request('http://fhir.do/fhir/r4/Procedure/proc-delete-http-1', {
        method: 'DELETE'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(204)
    })
  })
})
