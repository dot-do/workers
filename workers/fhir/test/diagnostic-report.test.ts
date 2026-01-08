/**
 * GREEN Tests: FHIR R4 DiagnosticReport Operations
 *
 * Tests for workers-053: [GREEN] Implement DiagnosticReport operations
 *
 * Acceptance Criteria:
 * - Test GET /fhir/r4/DiagnosticReport?patient={id}
 * - Test GET /fhir/r4/DiagnosticReport?status=final
 * - Test GET /fhir/r4/DiagnosticReport?category=LAB
 * - Test LOINC code.coding with proper system URI
 * - Test result references to Observations
 * - Test conclusion text
 * - Test status workflow (registered, partial, final, amended)
 *
 * @see FHIR R4 DiagnosticReport: http://hl7.org/fhir/R4/diagnosticreport.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * FHIR R4 DiagnosticReport Resource Type
 */
export interface DiagnosticReport {
  resourceType: 'DiagnosticReport'
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
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown'
  category?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  code: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  subject?: {
    reference: string
    display?: string
  }
  encounter?: {
    reference: string
    display?: string
  }
  effectiveDateTime?: string
  effectivePeriod?: {
    start?: string
    end?: string
  }
  issued?: string
  performer?: Array<{
    reference: string
    display?: string
  }>
  result?: Array<{
    reference: string
    display?: string
  }>
  conclusion?: string
  conclusionCode?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  presentedForm?: Array<{
    contentType: string
    data?: string
    url?: string
    title?: string
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
    resource: DiagnosticReport
    search?: {
      mode: 'match' | 'include' | 'outcome'
      score?: number
    }
  }>
}

/**
 * FHIR DO Contract for DiagnosticReport Operations
 */
export interface FHIRDO {
  // DiagnosticReport CRUD operations
  createDiagnosticReport(report: Omit<DiagnosticReport, 'id' | 'meta'>): Promise<DiagnosticReport>
  readDiagnosticReport(id: string): Promise<DiagnosticReport | null>
  updateDiagnosticReport(id: string, report: Partial<DiagnosticReport>): Promise<DiagnosticReport | null>
  deleteDiagnosticReport(id: string): Promise<boolean>

  // DiagnosticReport search operations
  searchDiagnosticReports(params: {
    patient?: string
    category?: string
    status?: string
    code?: string
    date?: string
  }): Promise<DiagnosticReport[]>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Attempt to load FHIRDO
 */
async function loadFHIRDO(): Promise<new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO> {
  const module = await import('../src/fhir.js')
  return module.FHIRDO
}

describe('FHIR R4 DiagnosticReport Operations', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('createDiagnosticReport() - Create DiagnosticReport', () => {
    it('should create a new DiagnosticReport with generated ID', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData: Omit<DiagnosticReport, 'id' | 'meta'> = {
        resourceType: 'DiagnosticReport',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'LAB',
            display: 'Laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2',
            display: 'Complete blood count (hemogram) panel - Blood by Automated count'
          }],
          text: 'Complete Blood Count'
        },
        subject: {
          reference: 'Patient/12345'
        },
        effectiveDateTime: '2024-01-15T10:00:00Z',
        issued: '2024-01-15T14:30:00Z'
      }

      const result = await instance.createDiagnosticReport(reportData)

      expect(result).toBeDefined()
      expect(result.resourceType).toBe('DiagnosticReport')
      expect(result.id).toBeDefined()
      expect(result.meta).toBeDefined()
      expect(result.meta.versionId).toBe('1')
      expect(result.meta.lastUpdated).toBeDefined()
      expect(result.status).toBe('final')
    })

    it('should create DiagnosticReport with LOINC coding', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData: Omit<DiagnosticReport, 'id' | 'meta'> = {
        resourceType: 'DiagnosticReport',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'LAB'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '24331-1',
            display: 'Lipid panel - Serum or Plasma'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createDiagnosticReport(reportData)

      expect(result.code.coding).toBeDefined()
      expect(result.code.coding[0].system).toBe('http://loinc.org')
      expect(result.code.coding[0].code).toBe('24331-1')
    })

    it('should create DiagnosticReport with result references to Observations', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData: Omit<DiagnosticReport, 'id' | 'meta'> = {
        resourceType: 'DiagnosticReport',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        result: [
          { reference: 'Observation/obs-1', display: 'Hemoglobin' },
          { reference: 'Observation/obs-2', display: 'White Blood Cell Count' },
          { reference: 'Observation/obs-3', display: 'Platelet Count' }
        ]
      }

      const result = await instance.createDiagnosticReport(reportData)

      expect(result.result).toBeDefined()
      expect(result.result?.length).toBe(3)
      expect(result.result![0].reference).toBe('Observation/obs-1')
      expect(result.result![1].reference).toBe('Observation/obs-2')
      expect(result.result![2].reference).toBe('Observation/obs-3')
    })

    it('should create DiagnosticReport with conclusion text', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData: Omit<DiagnosticReport, 'id' | 'meta'> = {
        resourceType: 'DiagnosticReport',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '24331-1'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        conclusion: 'All values within normal limits. No clinical action required.'
      }

      const result = await instance.createDiagnosticReport(reportData)

      expect(result.conclusion).toBe('All values within normal limits. No clinical action required.')
    })

    it('should create DiagnosticReport with status registered', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData: Omit<DiagnosticReport, 'id' | 'meta'> = {
        resourceType: 'DiagnosticReport',
        status: 'registered',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createDiagnosticReport(reportData)

      expect(result.status).toBe('registered')
    })

    it('should create DiagnosticReport with status partial', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData: Omit<DiagnosticReport, 'id' | 'meta'> = {
        resourceType: 'DiagnosticReport',
        status: 'partial',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        result: [
          { reference: 'Observation/obs-1' }
        ]
      }

      const result = await instance.createDiagnosticReport(reportData)

      expect(result.status).toBe('partial')
    })

    it('should create DiagnosticReport with status amended', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData: Omit<DiagnosticReport, 'id' | 'meta'> = {
        resourceType: 'DiagnosticReport',
        status: 'amended',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        conclusion: 'Amended report: Updated reference range.'
      }

      const result = await instance.createDiagnosticReport(reportData)

      expect(result.status).toBe('amended')
    })

    it('should create DiagnosticReport with radiology category', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData: Omit<DiagnosticReport, 'id' | 'meta'> = {
        resourceType: 'DiagnosticReport',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'RAD',
            display: 'Radiology'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '36643-5',
            display: 'Chest X-ray'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createDiagnosticReport(reportData)

      expect(result.category![0].coding[0].code).toBe('RAD')
    })
  })

  describe('readDiagnosticReport() - Read DiagnosticReport', () => {
    it('should return null for non-existent report', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readDiagnosticReport('nonexistent')
      expect(result).toBeNull()
    })

    it('should return DiagnosticReport resource with required fields', async () => {
      const instance = new FHIRDO(ctx, env)

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-12345',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('DiagnosticReport:rep-12345', report)

      const result = await instance.readDiagnosticReport('rep-12345')
      expect(result).not.toBeNull()
      expect(result!.resourceType).toBe('DiagnosticReport')
      expect(result!.id).toBe('rep-12345')
      expect(result!.status).toBe('final')
    })
  })

  describe('updateDiagnosticReport() - Update DiagnosticReport', () => {
    it('should update DiagnosticReport status from registered to final', async () => {
      const instance = new FHIRDO(ctx, env)

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-update-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'registered',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('DiagnosticReport:rep-update-1', report)

      const updated = await instance.updateDiagnosticReport('rep-update-1', {
        status: 'final',
        conclusion: 'All tests completed. Results within normal limits.'
      })

      expect(updated).not.toBeNull()
      expect(updated!.status).toBe('final')
      expect(updated!.conclusion).toBe('All tests completed. Results within normal limits.')
      expect(updated!.meta.versionId).toBe('2')
    })

    it('should update DiagnosticReport to add result references', async () => {
      const instance = new FHIRDO(ctx, env)

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-update-2',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'partial',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('DiagnosticReport:rep-update-2', report)

      const updated = await instance.updateDiagnosticReport('rep-update-2', {
        status: 'final',
        result: [
          { reference: 'Observation/obs-1' },
          { reference: 'Observation/obs-2' }
        ]
      })

      expect(updated).not.toBeNull()
      expect(updated!.status).toBe('final')
      expect(updated!.result?.length).toBe(2)
    })

    it('should return null for non-existent report', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.updateDiagnosticReport('nonexistent', {
        status: 'final'
      })
      expect(result).toBeNull()
    })
  })

  describe('deleteDiagnosticReport() - Delete DiagnosticReport', () => {
    it('should delete existing report', async () => {
      const instance = new FHIRDO(ctx, env)

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-delete-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('DiagnosticReport:rep-delete-1', report)

      const result = await instance.deleteDiagnosticReport('rep-delete-1')
      expect(result).toBe(true)

      const checkDeleted = await instance.readDiagnosticReport('rep-delete-1')
      expect(checkDeleted).toBeNull()
    })

    it('should return false for non-existent report', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.deleteDiagnosticReport('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('searchDiagnosticReports() - Search DiagnosticReports', () => {
    it('should search by patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const rep1: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-search-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/patient-1' }
      }

      const rep2: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-search-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/patient-2' }
      }

      await ctx.storage.put('DiagnosticReport:rep-search-1', rep1)
      await ctx.storage.put('DiagnosticReport:rep-search-2', rep2)

      const results = await instance.searchDiagnosticReports({ patient: 'patient-1' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].subject?.reference).toBe('Patient/patient-1')
    })

    it('should search by status (final)', async () => {
      const instance = new FHIRDO(ctx, env)

      const rep1: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-status-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      const rep2: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-status-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'registered',
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('DiagnosticReport:rep-status-1', rep1)
      await ctx.storage.put('DiagnosticReport:rep-status-2', rep2)

      const results = await instance.searchDiagnosticReports({ status: 'final' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].status).toBe('final')
    })

    it('should search by category (LAB)', async () => {
      const instance = new FHIRDO(ctx, env)

      const rep1: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-category-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }]
        }],
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      const rep2: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-category-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'RAD' }]
        }],
        code: {
          coding: [{ system: 'http://loinc.org', code: '36643-5' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('DiagnosticReport:rep-category-1', rep1)
      await ctx.storage.put('DiagnosticReport:rep-category-2', rep2)

      const results = await instance.searchDiagnosticReports({ category: 'LAB' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].category![0].coding[0].code).toBe('LAB')
    })

    it('should search by code', async () => {
      const instance = new FHIRDO(ctx, env)

      const rep1: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-code-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      const rep2: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-code-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '24331-1' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('DiagnosticReport:rep-code-1', rep1)
      await ctx.storage.put('DiagnosticReport:rep-code-2', rep2)

      const results = await instance.searchDiagnosticReports({ code: '58410-2' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].code.coding[0].code).toBe('58410-2')
    })

    it('should search by patient and category combined', async () => {
      const instance = new FHIRDO(ctx, env)

      const rep1: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-combined-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }]
        }],
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/patient-1' }
      }

      const rep2: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-combined-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'RAD' }]
        }],
        code: {
          coding: [{ system: 'http://loinc.org', code: '36643-5' }]
        },
        subject: { reference: 'Patient/patient-1' }
      }

      await ctx.storage.put('DiagnosticReport:rep-combined-1', rep1)
      await ctx.storage.put('DiagnosticReport:rep-combined-2', rep2)

      const results = await instance.searchDiagnosticReports({
        patient: 'patient-1',
        category: 'LAB'
      })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('rep-combined-1')
    })
  })

  describe('GET /fhir/r4/DiagnosticReport/{id} - HTTP endpoint', () => {
    it('should return 200 with valid DiagnosticReport resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-http-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('DiagnosticReport:rep-http-1', report)

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport/rep-http-1', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as DiagnosticReport
      expect(data.resourceType).toBe('DiagnosticReport')
      expect(data.id).toBe('rep-http-1')
    })

    it('should return 404 with OperationOutcome for non-existent report', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport/nonexistent', {
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

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-content-type',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('DiagnosticReport:rep-content-type', report)

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport/rep-content-type', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })
  })

  describe('GET /fhir/r4/DiagnosticReport - Search endpoint', () => {
    it('should search by patient parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-search-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('DiagnosticReport:rep-search-http-1', report)

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport?patient=test-patient', {
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

    it('should search by status parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-search-http-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('DiagnosticReport:rep-search-http-2', report)

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport?status=final', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })

    it('should search by category parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-search-http-3',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB' }]
        }],
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('DiagnosticReport:rep-search-http-3', report)

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport?category=LAB', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })
  })

  describe('POST /fhir/r4/DiagnosticReport - Create endpoint', () => {
    it('should create new DiagnosticReport via POST', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData: Omit<DiagnosticReport, 'id' | 'meta'> = {
        resourceType: 'DiagnosticReport',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(reportData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const created = await response.json() as DiagnosticReport
      expect(created.id).toBeDefined()
      expect(created.meta.versionId).toBe('1')
    })

    it('should return 400 when missing required code field', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData = {
        resourceType: 'DiagnosticReport',
        status: 'final',
        subject: {
          reference: 'Patient/12345'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(reportData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 when missing required status field', async () => {
      const instance = new FHIRDO(ctx, env)

      const reportData = {
        resourceType: 'DiagnosticReport',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '58410-2'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(reportData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })
  })

  describe('PUT /fhir/r4/DiagnosticReport/{id} - Update endpoint', () => {
    it('should update existing DiagnosticReport via PUT', async () => {
      const instance = new FHIRDO(ctx, env)

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-put-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'registered',
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('DiagnosticReport:rep-put-1', report)

      const updateData: Partial<DiagnosticReport> = {
        status: 'final',
        conclusion: 'Test complete. Results within normal limits.'
      }

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport/rep-put-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const updated = await response.json() as DiagnosticReport
      expect(updated.meta.versionId).toBe('2')
      expect(updated.status).toBe('final')
      expect(updated.conclusion).toBe('Test complete. Results within normal limits.')
    })
  })

  describe('DELETE /fhir/r4/DiagnosticReport/{id} - Delete endpoint', () => {
    it('should delete DiagnosticReport via DELETE', async () => {
      const instance = new FHIRDO(ctx, env)

      const report: DiagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: 'rep-delete-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '58410-2' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('DiagnosticReport:rep-delete-http-1', report)

      const request = new Request('http://fhir.do/fhir/r4/DiagnosticReport/rep-delete-http-1', {
        method: 'DELETE'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(204)
    })
  })
})
