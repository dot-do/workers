/**
 * FHIR R4 Immunization Operations Tests
 *
 * Tests for workers-056: [RED] Test Immunization CRUD
 * Tests for workers-057: [GREEN] Implement Immunization CRUD
 *
 * Acceptance Criteria:
 * - Test GET /fhir/r4/Immunization?patient={id}
 * - Test CVX vaccine codes
 * - Test lot number tracking
 * - Test expiration date
 * - Test administration site and route
 * - Test performer/location references
 *
 * @see FHIR R4 Immunization: http://hl7.org/fhir/R4/immunization.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * FHIR R4 Immunization Resource Type
 */
export interface Immunization {
  resourceType: 'Immunization'
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
  status: 'completed' | 'entered-in-error' | 'not-done'
  vaccineCode: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  patient: {
    reference: string
    display?: string
  }
  encounter?: {
    reference: string
    display?: string
  }
  occurrenceDateTime?: string
  recorded?: string
  primarySource?: boolean
  location?: {
    reference: string
    display?: string
  }
  manufacturer?: {
    reference: string
    display?: string
  }
  lotNumber?: string
  expirationDate?: string
  site?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  route?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  doseQuantity?: {
    value: number
    unit: string
    system: string
    code: string
  }
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
  note?: Array<{
    authorString?: string
    time?: string
    text: string
  }>
  protocolApplied?: Array<{
    doseNumberPositiveInt?: number
    seriesDosesPositiveInt?: number
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
    resource: Immunization
    search?: {
      mode: 'match' | 'include' | 'outcome'
      score?: number
    }
  }>
}

/**
 * FHIR DO Contract for Immunization Operations
 */
export interface FHIRDO {
  // Immunization CRUD operations
  createImmunization(immunization: Omit<Immunization, 'id' | 'meta'>): Promise<Immunization>
  readImmunization(id: string): Promise<Immunization | null>
  updateImmunization(id: string, immunization: Partial<Immunization>): Promise<Immunization | null>
  deleteImmunization(id: string): Promise<boolean>

  // Immunization search operations
  searchImmunizations(params: {
    patient?: string
    status?: string
    date?: string
    vaccine?: string
    location?: string
    performer?: string
    lotNumber?: string
  }): Promise<Immunization[]>

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

describe('FHIR R4 Immunization Operations', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('createImmunization() - Create Immunization', () => {
    it('should create a new Immunization with CVX vaccine code', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunizationData: Omit<Immunization, 'id' | 'meta'> = {
        resourceType: 'Immunization',
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '140',
            display: 'Influenza, seasonal, injectable, preservative free'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        primarySource: true
      }

      const result = await instance.createImmunization(immunizationData)

      expect(result).toBeDefined()
      expect(result.resourceType).toBe('Immunization')
      expect(result.id).toBeDefined()
      expect(result.meta).toBeDefined()
      expect(result.meta.versionId).toBe('1')
      expect(result.meta.lastUpdated).toBeDefined()
      expect(result.vaccineCode.coding[0].system).toBe('http://hl7.org/fhir/sid/cvx')
      expect(result.vaccineCode.coding[0].code).toBe('140')
    })

    it('should create Immunization with lot number and expiration date', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunizationData: Omit<Immunization, 'id' | 'meta'> = {
        resourceType: 'Immunization',
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '208',
            display: 'COVID-19, mRNA, LNP-S, PF, 30 mcg/0.3 mL dose'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        lotNumber: 'EK9231',
        expirationDate: '2025-06-30',
        manufacturer: {
          reference: 'Organization/pfizer',
          display: 'Pfizer'
        }
      }

      const result = await instance.createImmunization(immunizationData)

      expect(result.lotNumber).toBe('EK9231')
      expect(result.expirationDate).toBe('2025-06-30')
      expect(result.manufacturer?.display).toBe('Pfizer')
    })

    it('should create Immunization with administration site and route', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunizationData: Omit<Immunization, 'id' | 'meta'> = {
        resourceType: 'Immunization',
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '140',
            display: 'Influenza, seasonal, injectable, preservative free'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        site: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActSite',
            code: 'LA',
            display: 'left arm'
          }]
        },
        route: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration',
            code: 'IM',
            display: 'Injection, intramuscular'
          }]
        },
        doseQuantity: {
          value: 0.5,
          unit: 'ml',
          system: 'http://unitsofmeasure.org',
          code: 'ml'
        }
      }

      const result = await instance.createImmunization(immunizationData)

      expect(result.site?.coding[0].code).toBe('LA')
      expect(result.route?.coding[0].code).toBe('IM')
      expect(result.doseQuantity?.value).toBe(0.5)
    })

    it('should create Immunization with performer and location', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunizationData: Omit<Immunization, 'id' | 'meta'> = {
        resourceType: 'Immunization',
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '140',
            display: 'Influenza, seasonal, injectable, preservative free'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        location: {
          reference: 'Location/clinic-a',
          display: 'Main Street Clinic'
        },
        performer: [{
          function: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0443',
              code: 'AP',
              display: 'Administering Provider'
            }]
          },
          actor: {
            reference: 'Practitioner/dr-smith',
            display: 'Dr. Jane Smith'
          }
        }]
      }

      const result = await instance.createImmunization(immunizationData)

      expect(result.location?.reference).toBe('Location/clinic-a')
      expect(result.performer).toBeDefined()
      expect(result.performer![0].actor.reference).toBe('Practitioner/dr-smith')
    })

    it('should create Immunization with protocol applied (dose number)', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunizationData: Omit<Immunization, 'id' | 'meta'> = {
        resourceType: 'Immunization',
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '208',
            display: 'COVID-19, mRNA, LNP-S, PF, 30 mcg/0.3 mL dose'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        protocolApplied: [{
          doseNumberPositiveInt: 2,
          seriesDosesPositiveInt: 2
        }]
      }

      const result = await instance.createImmunization(immunizationData)

      expect(result.protocolApplied).toBeDefined()
      expect(result.protocolApplied![0].doseNumberPositiveInt).toBe(2)
      expect(result.protocolApplied![0].seriesDosesPositiveInt).toBe(2)
    })

    it('should create Immunization with multiple CVX codes', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunizationData: Omit<Immunization, 'id' | 'meta'> = {
        resourceType: 'Immunization',
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '120',
            display: 'DTaP-Hep B-IPV'
          }, {
            system: 'http://hl7.org/fhir/sid/ndc',
            code: '58160-0810-11',
            display: 'Pediarix'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      const result = await instance.createImmunization(immunizationData)

      expect(result.vaccineCode.coding).toHaveLength(2)
      expect(result.vaccineCode.coding[0].system).toBe('http://hl7.org/fhir/sid/cvx')
      expect(result.vaccineCode.coding[1].system).toBe('http://hl7.org/fhir/sid/ndc')
    })
  })

  describe('readImmunization() - Read Immunization', () => {
    it('should return null for non-existent immunization', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readImmunization('nonexistent')
      expect(result).toBeNull()
    })

    it('should return Immunization resource with all fields', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunization: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-12345',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '140',
            display: 'Influenza, seasonal, injectable, preservative free'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        lotNumber: 'EK9231',
        expirationDate: '2025-06-30'
      }

      await ctx.storage.put('Immunization:imm-12345', immunization)

      const result = await instance.readImmunization('imm-12345')
      expect(result).not.toBeNull()
      expect(result!.resourceType).toBe('Immunization')
      expect(result!.id).toBe('imm-12345')
      expect(result!.lotNumber).toBe('EK9231')
    })
  })

  describe('updateImmunization() - Update Immunization', () => {
    it('should update Immunization status', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunization: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-update-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '140',
            display: 'Influenza, seasonal, injectable, preservative free'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      await ctx.storage.put('Immunization:imm-update-1', immunization)

      const updated = await instance.updateImmunization('imm-update-1', {
        status: 'entered-in-error'
      })

      expect(updated).not.toBeNull()
      expect(updated!.status).toBe('entered-in-error')
      expect(updated!.meta.versionId).toBe('2')
    })

    it('should return null for non-existent immunization', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.updateImmunization('nonexistent', {
        status: 'entered-in-error'
      })
      expect(result).toBeNull()
    })
  })

  describe('deleteImmunization() - Delete Immunization', () => {
    it('should delete existing immunization', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunization: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-delete-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '140',
            display: 'Influenza, seasonal, injectable, preservative free'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      await ctx.storage.put('Immunization:imm-delete-1', immunization)

      const result = await instance.deleteImmunization('imm-delete-1')
      expect(result).toBe(true)

      const checkDeleted = await instance.readImmunization('imm-delete-1')
      expect(checkDeleted).toBeNull()
    })

    it('should return false for non-existent immunization', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.deleteImmunization('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('searchImmunizations() - Search Immunizations', () => {
    it('should search by patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const imm1: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-search-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '140', display: 'Influenza' }]
        },
        patient: { reference: 'Patient/patient-1' },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      const imm2: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-search-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '140', display: 'Influenza' }]
        },
        patient: { reference: 'Patient/patient-2' },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      await ctx.storage.put('Immunization:imm-search-1', imm1)
      await ctx.storage.put('Immunization:imm-search-2', imm2)

      const results = await instance.searchImmunizations({ patient: 'patient-1' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].patient.reference).toBe('Patient/patient-1')
    })

    it('should search by vaccine code (CVX)', async () => {
      const instance = new FHIRDO(ctx, env)

      const imm1: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-vaccine-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '140', display: 'Influenza' }]
        },
        patient: { reference: 'Patient/12345' },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      const imm2: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-vaccine-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '208', display: 'COVID-19' }]
        },
        patient: { reference: 'Patient/12345' },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      await ctx.storage.put('Immunization:imm-vaccine-1', imm1)
      await ctx.storage.put('Immunization:imm-vaccine-2', imm2)

      const results = await instance.searchImmunizations({ vaccine: '208' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].vaccineCode.coding[0].code).toBe('208')
    })

    it('should search by lot number', async () => {
      const instance = new FHIRDO(ctx, env)

      const imm1: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-lot-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '208', display: 'COVID-19' }]
        },
        patient: { reference: 'Patient/12345' },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        lotNumber: 'EK9231'
      }

      const imm2: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-lot-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '208', display: 'COVID-19' }]
        },
        patient: { reference: 'Patient/12345' },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        lotNumber: 'FK1234'
      }

      await ctx.storage.put('Immunization:imm-lot-1', imm1)
      await ctx.storage.put('Immunization:imm-lot-2', imm2)

      const results = await instance.searchImmunizations({ lotNumber: 'EK9231' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].lotNumber).toBe('EK9231')
    })

    it('should search by location', async () => {
      const instance = new FHIRDO(ctx, env)

      const imm: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-location-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '140', display: 'Influenza' }]
        },
        patient: { reference: 'Patient/12345' },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        location: {
          reference: 'Location/clinic-a',
          display: 'Main Street Clinic'
        }
      }

      await ctx.storage.put('Immunization:imm-location-1', imm)

      const results = await instance.searchImmunizations({ location: 'Location/clinic-a' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].location?.reference).toBe('Location/clinic-a')
    })

    it('should search by performer', async () => {
      const instance = new FHIRDO(ctx, env)

      const imm: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-performer-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '140', display: 'Influenza' }]
        },
        patient: { reference: 'Patient/12345' },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        performer: [{
          actor: {
            reference: 'Practitioner/dr-smith',
            display: 'Dr. Jane Smith'
          }
        }]
      }

      await ctx.storage.put('Immunization:imm-performer-1', imm)

      const results = await instance.searchImmunizations({ performer: 'Practitioner/dr-smith' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].performer![0].actor.reference).toBe('Practitioner/dr-smith')
    })
  })

  describe('GET /fhir/r4/Immunization/{id} - HTTP endpoint', () => {
    it('should return 200 with valid Immunization resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunization: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-http-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '140',
            display: 'Influenza, seasonal, injectable, preservative free'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      await ctx.storage.put('Immunization:imm-http-1', immunization)

      const request = new Request('http://fhir.do/fhir/r4/Immunization/imm-http-1', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Immunization
      expect(data.resourceType).toBe('Immunization')
      expect(data.id).toBe('imm-http-1')
    })

    it('should return 404 with OperationOutcome for non-existent immunization', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Immunization/nonexistent', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].code).toBe('not-found')
    })
  })

  describe('GET /fhir/r4/Immunization - Search endpoint', () => {
    it('should search by patient parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunization: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-search-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '140', display: 'Influenza' }]
        },
        patient: { reference: 'Patient/test-patient' },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      await ctx.storage.put('Immunization:imm-search-http-1', immunization)

      const request = new Request('http://fhir.do/fhir/r4/Immunization?patient=test-patient', {
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

    it('should search by vaccine code', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunization: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-search-http-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '208', display: 'COVID-19' }]
        },
        patient: { reference: 'Patient/test-patient' },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      await ctx.storage.put('Immunization:imm-search-http-2', immunization)

      const request = new Request('http://fhir.do/fhir/r4/Immunization?vaccine-code=208', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })

    it('should search by lot number', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunization: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-search-http-3',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '208', display: 'COVID-19' }]
        },
        patient: { reference: 'Patient/test-patient' },
        occurrenceDateTime: '2024-01-15T10:00:00Z',
        lotNumber: 'EK9231'
      }

      await ctx.storage.put('Immunization:imm-search-http-3', immunization)

      const request = new Request('http://fhir.do/fhir/r4/Immunization?lot-number=EK9231', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })
  })

  describe('POST /fhir/r4/Immunization - Create endpoint', () => {
    it('should create new Immunization via POST', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunizationData: Omit<Immunization, 'id' | 'meta'> = {
        resourceType: 'Immunization',
        status: 'completed',
        vaccineCode: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/cvx',
            code: '140',
            display: 'Influenza, seasonal, injectable, preservative free'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      const request = new Request('http://fhir.do/fhir/r4/Immunization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(immunizationData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const created = await response.json() as Immunization
      expect(created.id).toBeDefined()
      expect(created.meta.versionId).toBe('1')
    })
  })

  describe('PUT /fhir/r4/Immunization/{id} - Update endpoint', () => {
    it('should update existing Immunization via PUT', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunization: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-put-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '140', display: 'Influenza' }]
        },
        patient: { reference: 'Patient/12345' },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      await ctx.storage.put('Immunization:imm-put-1', immunization)

      const updateData: Partial<Immunization> = {
        status: 'entered-in-error'
      }

      const request = new Request('http://fhir.do/fhir/r4/Immunization/imm-put-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const updated = await response.json() as Immunization
      expect(updated.meta.versionId).toBe('2')
      expect(updated.status).toBe('entered-in-error')
    })
  })

  describe('DELETE /fhir/r4/Immunization/{id} - Delete endpoint', () => {
    it('should delete Immunization via DELETE', async () => {
      const instance = new FHIRDO(ctx, env)

      const immunization: Immunization = {
        resourceType: 'Immunization',
        id: 'imm-delete-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        vaccineCode: {
          coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '140', display: 'Influenza' }]
        },
        patient: { reference: 'Patient/12345' },
        occurrenceDateTime: '2024-01-15T10:00:00Z'
      }

      await ctx.storage.put('Immunization:imm-delete-http-1', immunization)

      const request = new Request('http://fhir.do/fhir/r4/Immunization/imm-delete-http-1', {
        method: 'DELETE'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(204)
    })
  })
})
