/**
 * Tests: FHIR R4 MedicationRequest Operations
 *
 * Tests for workers-045: [GREEN] Implement MedicationRequest operations
 *
 * Acceptance Criteria:
 * - Test CRUD operations for MedicationRequest
 * - Test RxNorm medication coding
 * - Test structured dosage instructions
 * - Test dispense request tracking
 * - Test search by patient, status, and medication
 *
 * @see FHIR R4 MedicationRequest: http://hl7.org/fhir/R4/medicationrequest.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * FHIR R4 MedicationRequest Resource Type
 */
export interface MedicationRequest {
  resourceType: 'MedicationRequest'
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
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown'
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option'
  priority?: 'routine' | 'urgent' | 'asap' | 'stat'
  medicationCodeableConcept?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  medicationReference?: {
    reference: string
    display?: string
  }
  subject: {
    reference: string
    display?: string
  }
  encounter?: {
    reference: string
    display?: string
  }
  authoredOn?: string
  requester?: {
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
  reasonReference?: Array<{
    reference: string
    display?: string
  }>
  note?: Array<{
    authorString?: string
    time?: string
    text: string
  }>
  dosageInstruction?: Array<{
    sequence?: number
    text?: string
    timing?: {
      repeat?: {
        frequency?: number
        period?: number
        periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a'
        boundsDuration?: {
          value: number
          unit: string
          system: string
          code: string
        }
      }
      code?: {
        coding: Array<{
          system: string
          code: string
          display?: string
        }>
        text?: string
      }
    }
    route?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    method?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    doseAndRate?: Array<{
      type?: {
        coding: Array<{
          system: string
          code: string
          display?: string
        }>
      }
      doseQuantity?: {
        value: number
        unit: string
        system: string
        code: string
      }
      rateQuantity?: {
        value: number
        unit: string
        system: string
        code: string
      }
    }>
  }>
  dispenseRequest?: {
    initialFill?: {
      quantity?: {
        value: number
        unit: string
        system: string
        code: string
      }
      duration?: {
        value: number
        unit: string
        system: string
        code: string
      }
    }
    dispenseInterval?: {
      value: number
      unit: string
      system: string
      code: string
    }
    validityPeriod?: {
      start?: string
      end?: string
    }
    numberOfRepeatsAllowed?: number
    quantity?: {
      value: number
      unit: string
      system: string
      code: string
    }
    expectedSupplyDuration?: {
      value: number
      unit: string
      system: string
      code: string
    }
    performer?: {
      reference: string
      display?: string
    }
  }
  substitution?: {
    allowedBoolean?: boolean
    allowedCodeableConcept?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    reason?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
  }
  priorPrescription?: {
    reference: string
    display?: string
  }
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
    resource: MedicationRequest
    search?: {
      mode: 'match' | 'include' | 'outcome'
      score?: number
    }
  }>
}

/**
 * FHIR DO Contract for MedicationRequest Operations
 */
export interface FHIRDO {
  // MedicationRequest CRUD operations
  createMedicationRequest(medicationRequest: Omit<MedicationRequest, 'id' | 'meta'>): Promise<MedicationRequest>
  readMedicationRequest(id: string): Promise<MedicationRequest | null>
  updateMedicationRequest(id: string, medicationRequest: Partial<MedicationRequest>): Promise<MedicationRequest | null>
  deleteMedicationRequest(id: string): Promise<boolean>

  // MedicationRequest search operations
  searchMedicationRequests(params: {
    patient?: string
    status?: string
    medication?: string
    intent?: string
    authoredon?: string
  }): Promise<MedicationRequest[]>

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

describe('FHIR R4 MedicationRequest Operations', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('createMedicationRequest() - Create MedicationRequest', () => {
    it('should create a new MedicationRequest with generated ID', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequestData: Omit<MedicationRequest, 'id' | 'meta'> = {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '197361',
            display: 'Lisinopril 10 MG Oral Tablet'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        authoredOn: '2024-01-15T10:30:00Z'
      }

      const result = await instance.createMedicationRequest(medicationRequestData)

      expect(result).toBeDefined()
      expect(result.resourceType).toBe('MedicationRequest')
      expect(result.id).toBeDefined()
      expect(result.meta).toBeDefined()
      expect(result.meta.versionId).toBe('1')
      expect(result.meta.lastUpdated).toBeDefined()
    })

    it('should create MedicationRequest with RxNorm coding', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequestData: Omit<MedicationRequest, 'id' | 'meta'> = {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '1049502',
            display: 'Amoxicillin 500 MG Oral Capsule'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createMedicationRequest(medicationRequestData)

      expect(result.medicationCodeableConcept?.coding).toBeDefined()
      expect(result.medicationCodeableConcept!.coding[0].system).toBe('http://www.nlm.nih.gov/research/umls/rxnorm')
      expect(result.medicationCodeableConcept!.coding[0].code).toBe('1049502')
    })

    it('should create MedicationRequest with structured dosage instructions', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequestData: Omit<MedicationRequest, 'id' | 'meta'> = {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '197361',
            display: 'Lisinopril 10 MG Oral Tablet'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        dosageInstruction: [{
          sequence: 1,
          text: 'Take one tablet daily',
          timing: {
            repeat: {
              frequency: 1,
              period: 1,
              periodUnit: 'd'
            }
          },
          route: {
            coding: [{
              system: 'http://snomed.info/sct',
              code: '26643006',
              display: 'Oral route'
            }]
          },
          doseAndRate: [{
            doseQuantity: {
              value: 10,
              unit: 'mg',
              system: 'http://unitsofmeasure.org',
              code: 'mg'
            }
          }]
        }]
      }

      const result = await instance.createMedicationRequest(medicationRequestData)

      expect(result.dosageInstruction).toBeDefined()
      expect(result.dosageInstruction![0].timing?.repeat?.frequency).toBe(1)
      expect(result.dosageInstruction![0].timing?.repeat?.periodUnit).toBe('d')
      expect(result.dosageInstruction![0].doseAndRate![0].doseQuantity?.value).toBe(10)
    })

    it('should create MedicationRequest with dispense request tracking', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequestData: Omit<MedicationRequest, 'id' | 'meta'> = {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '1049502',
            display: 'Amoxicillin 500 MG Oral Capsule'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        dispenseRequest: {
          numberOfRepeatsAllowed: 2,
          quantity: {
            value: 30,
            unit: 'capsule',
            system: 'http://unitsofmeasure.org',
            code: '{capsule}'
          },
          expectedSupplyDuration: {
            value: 10,
            unit: 'days',
            system: 'http://unitsofmeasure.org',
            code: 'd'
          },
          validityPeriod: {
            start: '2024-01-15',
            end: '2024-07-15'
          }
        }
      }

      const result = await instance.createMedicationRequest(medicationRequestData)

      expect(result.dispenseRequest).toBeDefined()
      expect(result.dispenseRequest!.numberOfRepeatsAllowed).toBe(2)
      expect(result.dispenseRequest!.quantity?.value).toBe(30)
      expect(result.dispenseRequest!.expectedSupplyDuration?.value).toBe(10)
    })
  })

  describe('readMedicationRequest() - Read MedicationRequest', () => {
    it('should return null for non-existent medication request', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readMedicationRequest('nonexistent')
      expect(result).toBeNull()
    })

    it('should return MedicationRequest resource with required fields', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequest: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-12345',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '197361',
            display: 'Lisinopril 10 MG Oral Tablet'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('MedicationRequest:medrq-12345', medicationRequest)

      const result = await instance.readMedicationRequest('medrq-12345')
      expect(result).not.toBeNull()
      expect(result!.resourceType).toBe('MedicationRequest')
      expect(result!.id).toBe('medrq-12345')
      expect(result!.meta.versionId).toBeDefined()
      expect(result!.meta.lastUpdated).toBeDefined()
    })
  })

  describe('updateMedicationRequest() - Update MedicationRequest', () => {
    it('should update MedicationRequest status', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequest: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-update-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '197361'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('MedicationRequest:medrq-update-1', medicationRequest)

      const updated = await instance.updateMedicationRequest('medrq-update-1', {
        status: 'completed'
      })

      expect(updated).not.toBeNull()
      expect(updated!.status).toBe('completed')
      expect(updated!.meta.versionId).toBe('2')
    })

    it('should return null for non-existent medication request', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.updateMedicationRequest('nonexistent', {
        status: 'completed'
      })
      expect(result).toBeNull()
    })
  })

  describe('deleteMedicationRequest() - Delete MedicationRequest', () => {
    it('should delete existing medication request', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequest: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-delete-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '197361'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('MedicationRequest:medrq-delete-1', medicationRequest)

      const result = await instance.deleteMedicationRequest('medrq-delete-1')
      expect(result).toBe(true)

      const checkDeleted = await instance.readMedicationRequest('medrq-delete-1')
      expect(checkDeleted).toBeNull()
    })

    it('should return false for non-existent medication request', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.deleteMedicationRequest('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('searchMedicationRequests() - Search MedicationRequests', () => {
    it('should search by patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const medrq1: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-search-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361' }]
        },
        subject: { reference: 'Patient/patient-1' }
      }

      const medrq2: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-search-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1049502' }]
        },
        subject: { reference: 'Patient/patient-2' }
      }

      await ctx.storage.put('MedicationRequest:medrq-search-1', medrq1)
      await ctx.storage.put('MedicationRequest:medrq-search-2', medrq2)

      const results = await instance.searchMedicationRequests({ patient: 'patient-1' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].subject.reference).toBe('Patient/patient-1')
    })

    it('should search by status', async () => {
      const instance = new FHIRDO(ctx, env)

      const medrq1: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-status-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      const medrq2: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-status-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1049502' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('MedicationRequest:medrq-status-1', medrq1)
      await ctx.storage.put('MedicationRequest:medrq-status-2', medrq2)

      const results = await instance.searchMedicationRequests({ status: 'active' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].status).toBe('active')
    })

    it('should search by medication code', async () => {
      const instance = new FHIRDO(ctx, env)

      const medrq1: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-med-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      const medrq2: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-med-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1049502' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('MedicationRequest:medrq-med-1', medrq1)
      await ctx.storage.put('MedicationRequest:medrq-med-2', medrq2)

      const results = await instance.searchMedicationRequests({ medication: '197361' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].medicationCodeableConcept?.coding[0].code).toBe('197361')
    })

    it('should search by patient and status combined', async () => {
      const instance = new FHIRDO(ctx, env)

      const medrq1: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-combined-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361' }]
        },
        subject: { reference: 'Patient/patient-1' }
      }

      const medrq2: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-combined-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'completed',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1049502' }]
        },
        subject: { reference: 'Patient/patient-1' }
      }

      await ctx.storage.put('MedicationRequest:medrq-combined-1', medrq1)
      await ctx.storage.put('MedicationRequest:medrq-combined-2', medrq2)

      const results = await instance.searchMedicationRequests({
        patient: 'patient-1',
        status: 'active'
      })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('medrq-combined-1')
    })
  })

  describe('GET /fhir/r4/MedicationRequest/{id} - HTTP endpoint', () => {
    it('should return 200 with valid MedicationRequest resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequest: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-http-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '197361'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('MedicationRequest:medrq-http-1', medicationRequest)

      const request = new Request('http://fhir.do/fhir/r4/MedicationRequest/medrq-http-1', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as MedicationRequest
      expect(data.resourceType).toBe('MedicationRequest')
      expect(data.id).toBe('medrq-http-1')
    })

    it('should return 404 with OperationOutcome for non-existent medication request', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/MedicationRequest/nonexistent', {
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

      const medicationRequest: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-content-type',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('MedicationRequest:medrq-content-type', medicationRequest)

      const request = new Request('http://fhir.do/fhir/r4/MedicationRequest/medrq-content-type', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })
  })

  describe('GET /fhir/r4/MedicationRequest - Search endpoint', () => {
    it('should search by patient parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequest: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-search-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361' }]
        },
        subject: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('MedicationRequest:medrq-search-http-1', medicationRequest)

      const request = new Request('http://fhir.do/fhir/r4/MedicationRequest?patient=test-patient', {
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

    it('should search by patient and status', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequest: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-search-http-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361' }]
        },
        subject: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('MedicationRequest:medrq-search-http-2', medicationRequest)

      const request = new Request('http://fhir.do/fhir/r4/MedicationRequest?patient=test-patient&status=active', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })

    it('should search by medication code', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequest: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-search-http-3',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361' }]
        },
        subject: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('MedicationRequest:medrq-search-http-3', medicationRequest)

      const request = new Request('http://fhir.do/fhir/r4/MedicationRequest?medication=197361', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })
  })

  describe('POST /fhir/r4/MedicationRequest - Create endpoint', () => {
    it('should create new MedicationRequest via POST', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequestData: Omit<MedicationRequest, 'id' | 'meta'> = {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '197361'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/MedicationRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(medicationRequestData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const created = await response.json() as MedicationRequest
      expect(created.id).toBeDefined()
      expect(created.meta.versionId).toBe('1')
    })
  })

  describe('PUT /fhir/r4/MedicationRequest/{id} - Update endpoint', () => {
    it('should update existing MedicationRequest via PUT', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequest: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-put-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('MedicationRequest:medrq-put-1', medicationRequest)

      const updateData: Partial<MedicationRequest> = {
        status: 'completed'
      }

      const request = new Request('http://fhir.do/fhir/r4/MedicationRequest/medrq-put-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const updated = await response.json() as MedicationRequest
      expect(updated.meta.versionId).toBe('2')
      expect(updated.status).toBe('completed')
    })
  })

  describe('DELETE /fhir/r4/MedicationRequest/{id} - Delete endpoint', () => {
    it('should delete MedicationRequest via DELETE', async () => {
      const instance = new FHIRDO(ctx, env)

      const medicationRequest: MedicationRequest = {
        resourceType: 'MedicationRequest',
        id: 'medrq-delete-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '197361' }]
        },
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('MedicationRequest:medrq-delete-http-1', medicationRequest)

      const request = new Request('http://fhir.do/fhir/r4/MedicationRequest/medrq-delete-http-1', {
        method: 'DELETE'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(204)
    })
  })
})
