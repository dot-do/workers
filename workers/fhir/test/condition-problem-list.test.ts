/**
 * RED Tests: FHIR R4 Condition Problem List Operations
 *
 * Tests for workers-036: [RED] Test Condition problem list operations
 *
 * Acceptance Criteria:
 * - Test GET /fhir/r4/Condition?patient={id}&category=problem-list-item
 * - Test GET /fhir/r4/Condition?clinical-status=active
 * - Test ICD-10 code.coding with proper system URI
 * - Test SNOMED CT code.coding
 * - Test verificationStatus (confirmed, provisional, differential)
 *
 * @see FHIR R4 Condition: http://hl7.org/fhir/R4/condition.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * FHIR R4 Condition Resource Type
 */
export interface Condition {
  resourceType: 'Condition'
  id: string
  meta: {
    versionId: string
    lastUpdated: string
  }
  clinicalStatus?: {
    coding: Array<{
      system: string
      code: 'active' | 'recurrence' | 'relapse' | 'inactive' | 'remission' | 'resolved'
      display?: string
    }>
    text?: string
  }
  verificationStatus?: {
    coding: Array<{
      system: string
      code: 'unconfirmed' | 'provisional' | 'differential' | 'confirmed' | 'refuted' | 'entered-in-error'
      display?: string
    }>
    text?: string
  }
  category?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  severity?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  code?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  bodySite?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  subject: {
    reference: string
    display?: string
  }
  encounter?: {
    reference: string
    display?: string
  }
  onsetDateTime?: string
  onsetAge?: {
    value: number
    unit: string
    system: string
    code: string
  }
  onsetPeriod?: {
    start?: string
    end?: string
  }
  onsetRange?: {
    low?: { value: number; unit: string }
    high?: { value: number; unit: string }
  }
  onsetString?: string
  abatementDateTime?: string
  abatementAge?: {
    value: number
    unit: string
    system: string
    code: string
  }
  abatementPeriod?: {
    start?: string
    end?: string
  }
  abatementRange?: {
    low?: { value: number; unit: string }
    high?: { value: number; unit: string }
  }
  abatementString?: string
  recordedDate?: string
  recorder?: {
    reference: string
    display?: string
  }
  asserter?: {
    reference: string
    display?: string
  }
  stage?: Array<{
    summary?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }
    assessment?: Array<{
      reference: string
    }>
    type?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }
  }>
  evidence?: Array<{
    code?: Array<{
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }>
    detail?: Array<{
      reference: string
    }>
  }>
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
    resource: Condition
    search?: {
      mode: 'match' | 'include' | 'outcome'
      score?: number
    }
  }>
}

/**
 * FHIR DO Contract for Condition Operations
 */
export interface FHIRDO {
  // Condition CRUD operations
  createCondition(condition: Omit<Condition, 'id' | 'meta'>): Promise<Condition>
  readCondition(id: string): Promise<Condition | null>
  updateCondition(id: string, condition: Partial<Condition>): Promise<Condition | null>
  deleteCondition(id: string): Promise<boolean>

  // Condition search operations
  searchConditions(params: {
    patient?: string
    category?: string
    clinicalStatus?: string
    verificationStatus?: string
    code?: string
  }): Promise<Condition[]>

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

describe('FHIR R4 Condition Problem List Operations', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('createCondition() - Create Condition', () => {
    it('should create a new Condition with generated ID', async () => {
      const instance = new FHIRDO(ctx, env)

      const conditionData: Omit<Condition, 'id' | 'meta'> = {
        resourceType: 'Condition',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }]
        },
        verificationStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: 'confirmed'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item',
            display: 'Problem List Item'
          }]
        }],
        code: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: 'E11.9',
            display: 'Type 2 diabetes mellitus without complications'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createCondition(conditionData)

      expect(result).toBeDefined()
      expect(result.resourceType).toBe('Condition')
      expect(result.id).toBeDefined()
      expect(result.meta).toBeDefined()
      expect(result.meta.versionId).toBe('1')
      expect(result.meta.lastUpdated).toBeDefined()
    })

    it('should create Condition with ICD-10 coding', async () => {
      const instance = new FHIRDO(ctx, env)

      const conditionData: Omit<Condition, 'id' | 'meta'> = {
        resourceType: 'Condition',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item'
          }]
        }],
        code: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: 'I10',
            display: 'Essential (primary) hypertension'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createCondition(conditionData)

      expect(result.code?.coding).toBeDefined()
      expect(result.code!.coding[0].system).toBe('http://hl7.org/fhir/sid/icd-10')
      expect(result.code!.coding[0].code).toBe('I10')
    })

    it('should create Condition with SNOMED CT coding', async () => {
      const instance = new FHIRDO(ctx, env)

      const conditionData: Omit<Condition, 'id' | 'meta'> = {
        resourceType: 'Condition',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item'
          }]
        }],
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '38341003',
            display: 'Hypertensive disorder, systemic arterial'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createCondition(conditionData)

      expect(result.code?.coding).toBeDefined()
      expect(result.code!.coding[0].system).toBe('http://snomed.info/sct')
      expect(result.code!.coding[0].code).toBe('38341003')
    })

    it('should create Condition with onset and abatement dates', async () => {
      const instance = new FHIRDO(ctx, env)

      const conditionData: Omit<Condition, 'id' | 'meta'> = {
        resourceType: 'Condition',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'resolved'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item'
          }]
        }],
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '195967001',
            display: 'Asthma'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        onsetDateTime: '2020-01-15T00:00:00Z',
        abatementDateTime: '2023-06-30T00:00:00Z'
      }

      const result = await instance.createCondition(conditionData)

      expect(result.onsetDateTime).toBe('2020-01-15T00:00:00Z')
      expect(result.abatementDateTime).toBe('2023-06-30T00:00:00Z')
    })

    it('should create Condition with verification status', async () => {
      const instance = new FHIRDO(ctx, env)

      const conditionData: Omit<Condition, 'id' | 'meta'> = {
        resourceType: 'Condition',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }]
        },
        verificationStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: 'provisional',
            display: 'Provisional'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item'
          }]
        }],
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '233604007',
            display: 'Pneumonia'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createCondition(conditionData)

      expect(result.verificationStatus?.coding[0].code).toBe('provisional')
    })
  })

  describe('readCondition() - Read Condition', () => {
    it('should return null for non-existent condition', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readCondition('nonexistent')
      expect(result).toBeNull()
    })

    it('should return Condition resource with required fields', async () => {
      const instance = new FHIRDO(ctx, env)

      // Create and store a condition
      const condition: Condition = {
        resourceType: 'Condition',
        id: 'cond-12345',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item'
          }]
        }],
        code: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: 'E11.9'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('Condition:cond-12345', condition)

      const result = await instance.readCondition('cond-12345')
      expect(result).not.toBeNull()
      expect(result!.resourceType).toBe('Condition')
      expect(result!.id).toBe('cond-12345')
      expect(result!.meta.versionId).toBeDefined()
      expect(result!.meta.lastUpdated).toBeDefined()
    })
  })

  describe('updateCondition() - Update Condition', () => {
    it('should update Condition clinical status', async () => {
      const instance = new FHIRDO(ctx, env)

      // Create initial condition
      const condition: Condition = {
        resourceType: 'Condition',
        id: 'cond-update-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item'
          }]
        }],
        code: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: 'E11.9'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('Condition:cond-update-1', condition)

      const updated = await instance.updateCondition('cond-update-1', {
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'resolved'
          }]
        }
      })

      expect(updated).not.toBeNull()
      expect(updated!.clinicalStatus?.coding[0].code).toBe('resolved')
      expect(updated!.meta.versionId).toBe('2')
    })

    it('should return null for non-existent condition', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.updateCondition('nonexistent', {
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'resolved'
          }]
        }
      })
      expect(result).toBeNull()
    })
  })

  describe('deleteCondition() - Delete Condition', () => {
    it('should delete existing condition', async () => {
      const instance = new FHIRDO(ctx, env)

      const condition: Condition = {
        resourceType: 'Condition',
        id: 'cond-delete-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item'
          }]
        }],
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('Condition:cond-delete-1', condition)

      const result = await instance.deleteCondition('cond-delete-1')
      expect(result).toBe(true)

      const checkDeleted = await instance.readCondition('cond-delete-1')
      expect(checkDeleted).toBeNull()
    })

    it('should return false for non-existent condition', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.deleteCondition('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('searchConditions() - Search Conditions', () => {
    it('should search by patient', async () => {
      const instance = new FHIRDO(ctx, env)

      // Create multiple conditions for different patients
      const cond1: Condition = {
        resourceType: 'Condition',
        id: 'cond-search-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/patient-1' }
      }

      const cond2: Condition = {
        resourceType: 'Condition',
        id: 'cond-search-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/patient-2' }
      }

      await ctx.storage.put('Condition:cond-search-1', cond1)
      await ctx.storage.put('Condition:cond-search-2', cond2)

      const results = await instance.searchConditions({ patient: 'patient-1' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].subject.reference).toBe('Patient/patient-1')
    })

    it('should search by category (problem-list-item)', async () => {
      const instance = new FHIRDO(ctx, env)

      const cond1: Condition = {
        resourceType: 'Condition',
        id: 'cond-category-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/12345' }
      }

      const cond2: Condition = {
        resourceType: 'Condition',
        id: 'cond-category-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' }]
        }],
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('Condition:cond-category-1', cond1)
      await ctx.storage.put('Condition:cond-category-2', cond2)

      const results = await instance.searchConditions({ category: 'problem-list-item' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].category![0].coding[0].code).toBe('problem-list-item')
    })

    it('should search by clinical status (active)', async () => {
      const instance = new FHIRDO(ctx, env)

      const cond1: Condition = {
        resourceType: 'Condition',
        id: 'cond-status-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/12345' }
      }

      const cond2: Condition = {
        resourceType: 'Condition',
        id: 'cond-status-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'resolved' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('Condition:cond-status-1', cond1)
      await ctx.storage.put('Condition:cond-status-2', cond2)

      const results = await instance.searchConditions({ clinicalStatus: 'active' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].clinicalStatus?.coding[0].code).toBe('active')
    })

    it('should search by verification status', async () => {
      const instance = new FHIRDO(ctx, env)

      const cond1: Condition = {
        resourceType: 'Condition',
        id: 'cond-ver-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        verificationStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/12345' }
      }

      const cond2: Condition = {
        resourceType: 'Condition',
        id: 'cond-ver-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        verificationStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'provisional' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('Condition:cond-ver-1', cond1)
      await ctx.storage.put('Condition:cond-ver-2', cond2)

      const results = await instance.searchConditions({ verificationStatus: 'provisional' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].verificationStatus?.coding[0].code).toBe('provisional')
    })

    it('should search by patient and category combined', async () => {
      const instance = new FHIRDO(ctx, env)

      const cond1: Condition = {
        resourceType: 'Condition',
        id: 'cond-combined-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/patient-1' }
      }

      const cond2: Condition = {
        resourceType: 'Condition',
        id: 'cond-combined-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' }]
        }],
        subject: { reference: 'Patient/patient-1' }
      }

      await ctx.storage.put('Condition:cond-combined-1', cond1)
      await ctx.storage.put('Condition:cond-combined-2', cond2)

      const results = await instance.searchConditions({
        patient: 'patient-1',
        category: 'problem-list-item'
      })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('cond-combined-1')
    })
  })

  describe('GET /fhir/r4/Condition/{id} - HTTP endpoint', () => {
    it('should return 200 with valid Condition resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const condition: Condition = {
        resourceType: 'Condition',
        id: 'cond-http-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item'
          }]
        }],
        subject: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('Condition:cond-http-1', condition)

      const request = new Request('http://fhir.do/fhir/r4/Condition/cond-http-1', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Condition
      expect(data.resourceType).toBe('Condition')
      expect(data.id).toBe('cond-http-1')
    })

    it('should return 404 with OperationOutcome for non-existent condition', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Condition/nonexistent', {
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

      const condition: Condition = {
        resourceType: 'Condition',
        id: 'cond-content-type',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('Condition:cond-content-type', condition)

      const request = new Request('http://fhir.do/fhir/r4/Condition/cond-content-type', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })
  })

  describe('GET /fhir/r4/Condition - Search endpoint', () => {
    it('should search by patient parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const condition: Condition = {
        resourceType: 'Condition',
        id: 'cond-search-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('Condition:cond-search-http-1', condition)

      const request = new Request('http://fhir.do/fhir/r4/Condition?patient=test-patient', {
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

    it('should search by patient and category', async () => {
      const instance = new FHIRDO(ctx, env)

      const condition: Condition = {
        resourceType: 'Condition',
        id: 'cond-search-http-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('Condition:cond-search-http-2', condition)

      const request = new Request('http://fhir.do/fhir/r4/Condition?patient=test-patient&category=problem-list-item', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })

    it('should search by clinical-status', async () => {
      const instance = new FHIRDO(ctx, env)

      const condition: Condition = {
        resourceType: 'Condition',
        id: 'cond-search-http-3',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('Condition:cond-search-http-3', condition)

      const request = new Request('http://fhir.do/fhir/r4/Condition?clinical-status=active', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })
  })

  describe('POST /fhir/r4/Condition - Create endpoint', () => {
    it('should create new Condition via POST', async () => {
      const instance = new FHIRDO(ctx, env)

      const conditionData: Omit<Condition, 'id' | 'meta'> = {
        resourceType: 'Condition',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item'
          }]
        }],
        subject: {
          reference: 'Patient/12345'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/Condition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(conditionData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const created = await response.json() as Condition
      expect(created.id).toBeDefined()
      expect(created.meta.versionId).toBe('1')
    })
  })

  describe('PUT /fhir/r4/Condition/{id} - Update endpoint', () => {
    it('should update existing Condition via PUT', async () => {
      const instance = new FHIRDO(ctx, env)

      const condition: Condition = {
        resourceType: 'Condition',
        id: 'cond-put-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('Condition:cond-put-1', condition)

      const updateData: Partial<Condition> = {
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'resolved' }]
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/Condition/cond-put-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const updated = await response.json() as Condition
      expect(updated.meta.versionId).toBe('2')
      expect(updated.clinicalStatus?.coding[0].code).toBe('resolved')
    })
  })

  describe('DELETE /fhir/r4/Condition/{id} - Delete endpoint', () => {
    it('should delete Condition via DELETE', async () => {
      const instance = new FHIRDO(ctx, env)

      const condition: Condition = {
        resourceType: 'Condition',
        id: 'cond-delete-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
        }],
        subject: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('Condition:cond-delete-http-1', condition)

      const request = new Request('http://fhir.do/fhir/r4/Condition/cond-delete-http-1', {
        method: 'DELETE'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(204)
    })
  })
})
