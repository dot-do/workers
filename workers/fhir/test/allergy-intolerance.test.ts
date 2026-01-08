/**
 * FHIR R4 AllergyIntolerance Operations Tests
 *
 * Tests for workers-048: [RED] Test AllergyIntolerance CRUD
 * Tests for workers-049: [GREEN] Implement AllergyIntolerance CRUD
 *
 * Acceptance Criteria:
 * - Test GET /fhir/r4/AllergyIntolerance?patient={id}
 * - Test GET /fhir/r4/AllergyIntolerance?category=medication
 * - Test reaction array with manifestation and severity
 * - Test criticality (low, high, unable-to-assess)
 * - Test RxNorm coding for drug allergies
 *
 * @see FHIR R4 AllergyIntolerance: http://hl7.org/fhir/R4/allergyintolerance.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * FHIR R4 AllergyIntolerance Resource Type
 */
export interface AllergyIntolerance {
  resourceType: 'AllergyIntolerance'
  id: string
  meta: {
    versionId: string
    lastUpdated: string
  }
  clinicalStatus?: {
    coding: Array<{
      system: string
      code: 'active' | 'inactive' | 'resolved'
      display?: string
    }>
    text?: string
  }
  verificationStatus?: {
    coding: Array<{
      system: string
      code: 'unconfirmed' | 'confirmed' | 'refuted' | 'entered-in-error'
      display?: string
    }>
    text?: string
  }
  type?: 'allergy' | 'intolerance'
  category?: Array<'food' | 'medication' | 'environment' | 'biologic'>
  criticality?: 'low' | 'high' | 'unable-to-assess'
  code?: {
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
  onsetDateTime?: string
  recordedDate?: string
  recorder?: {
    reference: string
    display?: string
  }
  asserter?: {
    reference: string
    display?: string
  }
  lastOccurrence?: string
  note?: Array<{
    authorString?: string
    time?: string
    text: string
  }>
  reaction?: Array<{
    substance?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    manifestation: Array<{
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }>
    description?: string
    onset?: string
    severity?: 'mild' | 'moderate' | 'severe'
    exposureRoute?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    note?: Array<{
      text: string
    }>
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
    resource: AllergyIntolerance
    search?: {
      mode: 'match' | 'include' | 'outcome'
      score?: number
    }
  }>
}

/**
 * FHIR DO Contract for AllergyIntolerance Operations
 */
export interface FHIRDO {
  // AllergyIntolerance CRUD operations
  createAllergyIntolerance(allergyIntolerance: Omit<AllergyIntolerance, 'id' | 'meta'>): Promise<AllergyIntolerance>
  readAllergyIntolerance(id: string): Promise<AllergyIntolerance | null>
  updateAllergyIntolerance(id: string, allergyIntolerance: Partial<AllergyIntolerance>): Promise<AllergyIntolerance | null>
  deleteAllergyIntolerance(id: string): Promise<boolean>

  // AllergyIntolerance search operations
  searchAllergyIntolerances(params: {
    patient?: string
    category?: string
    clinicalStatus?: string
    verificationStatus?: string
    criticality?: string
    type?: string
  }): Promise<AllergyIntolerance[]>

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

describe('FHIR R4 AllergyIntolerance Operations', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('createAllergyIntolerance() - Create AllergyIntolerance', () => {
    it('should create a new AllergyIntolerance with generated ID', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergyData: Omit<AllergyIntolerance, 'id' | 'meta'> = {
        resourceType: 'AllergyIntolerance',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        verificationStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
            code: 'confirmed'
          }]
        },
        type: 'allergy',
        category: ['medication'],
        criticality: 'high',
        code: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '7980',
            display: 'Penicillin'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createAllergyIntolerance(allergyData)

      expect(result).toBeDefined()
      expect(result.resourceType).toBe('AllergyIntolerance')
      expect(result.id).toBeDefined()
      expect(result.meta).toBeDefined()
      expect(result.meta.versionId).toBe('1')
      expect(result.meta.lastUpdated).toBeDefined()
    })

    it('should create AllergyIntolerance with RxNorm coding for drug allergies', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergyData: Omit<AllergyIntolerance, 'id' | 'meta'> = {
        resourceType: 'AllergyIntolerance',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        category: ['medication'],
        criticality: 'high',
        code: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '70618',
            display: 'Amoxicillin'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createAllergyIntolerance(allergyData)

      expect(result.code?.coding).toBeDefined()
      expect(result.code!.coding[0].system).toBe('http://www.nlm.nih.gov/research/umls/rxnorm')
      expect(result.code!.coding[0].code).toBe('70618')
    })

    it('should create AllergyIntolerance with reaction details', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergyData: Omit<AllergyIntolerance, 'id' | 'meta'> = {
        resourceType: 'AllergyIntolerance',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        category: ['medication'],
        criticality: 'high',
        code: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '7980',
            display: 'Penicillin'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        reaction: [{
          manifestation: [{
            coding: [{
              system: 'http://snomed.info/sct',
              code: '271807003',
              display: 'Rash'
            }]
          }],
          severity: 'severe',
          description: 'Developed severe rash after taking penicillin'
        }]
      }

      const result = await instance.createAllergyIntolerance(allergyData)

      expect(result.reaction).toBeDefined()
      expect(result.reaction![0].manifestation).toBeDefined()
      expect(result.reaction![0].severity).toBe('severe')
    })

    it('should create food AllergyIntolerance', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergyData: Omit<AllergyIntolerance, 'id' | 'meta'> = {
        resourceType: 'AllergyIntolerance',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        type: 'allergy',
        category: ['food'],
        criticality: 'high',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '762952008',
            display: 'Peanut (substance)'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        reaction: [{
          manifestation: [{
            coding: [{
              system: 'http://snomed.info/sct',
              code: '39579001',
              display: 'Anaphylactic reaction'
            }]
          }],
          severity: 'severe'
        }]
      }

      const result = await instance.createAllergyIntolerance(allergyData)

      expect(result.category).toContain('food')
      expect(result.criticality).toBe('high')
    })

    it('should create environment AllergyIntolerance', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergyData: Omit<AllergyIntolerance, 'id' | 'meta'> = {
        resourceType: 'AllergyIntolerance',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        type: 'allergy',
        category: ['environment'],
        criticality: 'low',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '256277009',
            display: 'Grass pollen'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        reaction: [{
          manifestation: [{
            coding: [{
              system: 'http://snomed.info/sct',
              code: '418290006',
              display: 'Itching'
            }]
          }, {
            coding: [{
              system: 'http://snomed.info/sct',
              code: '49727002',
              display: 'Sneezing'
            }]
          }],
          severity: 'mild'
        }]
      }

      const result = await instance.createAllergyIntolerance(allergyData)

      expect(result.category).toContain('environment')
      expect(result.criticality).toBe('low')
      expect(result.reaction![0].severity).toBe('mild')
    })

    it('should create AllergyIntolerance with multiple reactions', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergyData: Omit<AllergyIntolerance, 'id' | 'meta'> = {
        resourceType: 'AllergyIntolerance',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        category: ['medication'],
        criticality: 'high',
        code: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '1191',
            display: 'Aspirin'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        },
        reaction: [{
          manifestation: [{
            coding: [{
              system: 'http://snomed.info/sct',
              code: '271807003',
              display: 'Rash'
            }]
          }],
          severity: 'moderate',
          onset: '2023-01-15T10:00:00Z'
        }, {
          manifestation: [{
            coding: [{
              system: 'http://snomed.info/sct',
              code: '267036007',
              display: 'Dyspnea'
            }]
          }],
          severity: 'severe',
          onset: '2023-06-20T14:30:00Z'
        }]
      }

      const result = await instance.createAllergyIntolerance(allergyData)

      expect(result.reaction).toBeDefined()
      expect(result.reaction!.length).toBe(2)
      expect(result.reaction![0].severity).toBe('moderate')
      expect(result.reaction![1].severity).toBe('severe')
    })

    it('should create AllergyIntolerance with criticality unable-to-assess', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergyData: Omit<AllergyIntolerance, 'id' | 'meta'> = {
        resourceType: 'AllergyIntolerance',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        verificationStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
            code: 'unconfirmed'
          }]
        },
        category: ['medication'],
        criticality: 'unable-to-assess',
        code: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '2551',
            display: 'Codeine'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        }
      }

      const result = await instance.createAllergyIntolerance(allergyData)

      expect(result.criticality).toBe('unable-to-assess')
      expect(result.verificationStatus?.coding[0].code).toBe('unconfirmed')
    })
  })

  describe('readAllergyIntolerance() - Read AllergyIntolerance', () => {
    it('should return null for non-existent allergy', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readAllergyIntolerance('nonexistent')
      expect(result).toBeNull()
    })

    it('should return AllergyIntolerance resource with required fields', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-12345',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        category: ['medication'],
        criticality: 'high',
        code: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '7980',
            display: 'Penicillin'
          }]
        },
        patient: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-12345', allergy)

      const result = await instance.readAllergyIntolerance('allergy-12345')
      expect(result).not.toBeNull()
      expect(result!.resourceType).toBe('AllergyIntolerance')
      expect(result!.id).toBe('allergy-12345')
      expect(result!.meta.versionId).toBeDefined()
      expect(result!.meta.lastUpdated).toBeDefined()
    })
  })

  describe('updateAllergyIntolerance() - Update AllergyIntolerance', () => {
    it('should update AllergyIntolerance clinical status', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-update-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        category: ['medication'],
        criticality: 'high',
        patient: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-update-1', allergy)

      const updated = await instance.updateAllergyIntolerance('allergy-update-1', {
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'resolved'
          }]
        }
      })

      expect(updated).not.toBeNull()
      expect(updated!.clinicalStatus?.coding[0].code).toBe('resolved')
      expect(updated!.meta.versionId).toBe('2')
    })

    it('should return null for non-existent allergy', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.updateAllergyIntolerance('nonexistent', {
        criticality: 'low'
      })
      expect(result).toBeNull()
    })
  })

  describe('deleteAllergyIntolerance() - Delete AllergyIntolerance', () => {
    it('should delete existing allergy', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-delete-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        category: ['medication'],
        patient: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-delete-1', allergy)

      const result = await instance.deleteAllergyIntolerance('allergy-delete-1')
      expect(result).toBe(true)

      const checkDeleted = await instance.readAllergyIntolerance('allergy-delete-1')
      expect(checkDeleted).toBeNull()
    })

    it('should return false for non-existent allergy', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.deleteAllergyIntolerance('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('searchAllergyIntolerances() - Search AllergyIntolerances', () => {
    it('should search by patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy1: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-search-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        patient: { reference: 'Patient/patient-1' }
      }

      const allergy2: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-search-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        patient: { reference: 'Patient/patient-2' }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-search-1', allergy1)
      await ctx.storage.put('AllergyIntolerance:allergy-search-2', allergy2)

      const results = await instance.searchAllergyIntolerances({ patient: 'patient-1' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].patient.reference).toBe('Patient/patient-1')
    })

    it('should search by category (medication)', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy1: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-category-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        patient: { reference: 'Patient/12345' }
      }

      const allergy2: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-category-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['food'],
        patient: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-category-1', allergy1)
      await ctx.storage.put('AllergyIntolerance:allergy-category-2', allergy2)

      const results = await instance.searchAllergyIntolerances({ category: 'medication' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].category).toContain('medication')
    })

    it('should search by criticality', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy1: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-criticality-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        criticality: 'high',
        patient: { reference: 'Patient/12345' }
      }

      const allergy2: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-criticality-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        criticality: 'low',
        patient: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-criticality-1', allergy1)
      await ctx.storage.put('AllergyIntolerance:allergy-criticality-2', allergy2)

      const results = await instance.searchAllergyIntolerances({ criticality: 'high' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].criticality).toBe('high')
    })

    it('should search by clinical status', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy1: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-status-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        patient: { reference: 'Patient/12345' }
      }

      const allergy2: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-status-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'resolved' }]
        },
        category: ['medication'],
        patient: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-status-1', allergy1)
      await ctx.storage.put('AllergyIntolerance:allergy-status-2', allergy2)

      const results = await instance.searchAllergyIntolerances({ clinicalStatus: 'active' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].clinicalStatus?.coding[0].code).toBe('active')
    })
  })

  describe('GET /fhir/r4/AllergyIntolerance/{id} - HTTP endpoint', () => {
    it('should return 200 with valid AllergyIntolerance resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-http-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        category: ['medication'],
        criticality: 'high',
        patient: {
          reference: 'Patient/12345'
        }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-http-1', allergy)

      const request = new Request('http://fhir.do/fhir/r4/AllergyIntolerance/allergy-http-1', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as AllergyIntolerance
      expect(data.resourceType).toBe('AllergyIntolerance')
      expect(data.id).toBe('allergy-http-1')
    })

    it('should return 404 with OperationOutcome for non-existent allergy', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/AllergyIntolerance/nonexistent', {
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

      const allergy: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-content-type',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        patient: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-content-type', allergy)

      const request = new Request('http://fhir.do/fhir/r4/AllergyIntolerance/allergy-content-type', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })
  })

  describe('GET /fhir/r4/AllergyIntolerance - Search endpoint', () => {
    it('should search by patient parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-search-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        patient: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-search-http-1', allergy)

      const request = new Request('http://fhir.do/fhir/r4/AllergyIntolerance?patient=test-patient', {
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

    it('should search by category=medication', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-search-http-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        patient: { reference: 'Patient/test-patient' }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-search-http-2', allergy)

      const request = new Request('http://fhir.do/fhir/r4/AllergyIntolerance?category=medication', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })
  })

  describe('POST /fhir/r4/AllergyIntolerance - Create endpoint', () => {
    it('should create new AllergyIntolerance via POST', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergyData: Omit<AllergyIntolerance, 'id' | 'meta'> = {
        resourceType: 'AllergyIntolerance',
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: 'active'
          }]
        },
        category: ['medication'],
        criticality: 'high',
        patient: {
          reference: 'Patient/12345'
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/AllergyIntolerance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(allergyData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const created = await response.json() as AllergyIntolerance
      expect(created.id).toBeDefined()
      expect(created.meta.versionId).toBe('1')
    })
  })

  describe('PUT /fhir/r4/AllergyIntolerance/{id} - Update endpoint', () => {
    it('should update existing AllergyIntolerance via PUT', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-put-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        patient: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-put-1', allergy)

      const updateData: Partial<AllergyIntolerance> = {
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'resolved' }]
        }
      }

      const request = new Request('http://fhir.do/fhir/r4/AllergyIntolerance/allergy-put-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const updated = await response.json() as AllergyIntolerance
      expect(updated.meta.versionId).toBe('2')
      expect(updated.clinicalStatus?.coding[0].code).toBe('resolved')
    })
  })

  describe('DELETE /fhir/r4/AllergyIntolerance/{id} - Delete endpoint', () => {
    it('should delete AllergyIntolerance via DELETE', async () => {
      const instance = new FHIRDO(ctx, env)

      const allergy: AllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-delete-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        category: ['medication'],
        patient: { reference: 'Patient/12345' }
      }

      await ctx.storage.put('AllergyIntolerance:allergy-delete-http-1', allergy)

      const request = new Request('http://fhir.do/fhir/r4/AllergyIntolerance/allergy-delete-http-1', {
        method: 'DELETE'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(204)
    })
  })
})
