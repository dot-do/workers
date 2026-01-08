/**
 * RED/GREEN Tests: FHIR R4 Observation Vital Signs
 *
 * Tests for workers-029: [RED] Test Observation vital signs
 * Implementation for workers-030: [GREEN] Implement Observation vital signs
 *
 * Acceptance Criteria:
 * - Test GET /fhir/r4/Observation/{id} returns valid Observation resource
 * - Test GET /fhir/r4/Observation?category=vital-signs&patient={id} search
 * - Test blood pressure with systolic/diastolic components
 * - Test valueQuantity with proper units (UCUM)
 * - Test referenceRange for vital signs
 * - Test LOINC codes for each vital type
 * - Test references to Patient and Encounter
 *
 * @see FHIR R4 Observation: http://hl7.org/fhir/R4/observation.html
 * @see FHIR Vital Signs: http://hl7.org/fhir/R4/observation-vitalsigns.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * FHIR R4 Observation Resource Type for Vital Signs
 */
export interface Observation {
  resourceType: 'Observation'
  id: string
  meta?: {
    versionId: string
    lastUpdated: string
  }
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown'
  category?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
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
  }
  effectiveDateTime?: string
  effectivePeriod?: {
    start?: string
    end?: string
  }
  issued?: string
  valueQuantity?: {
    value: number
    unit: string
    system: string
    code: string
  }
  valueCodeableConcept?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  valueString?: string
  valueBoolean?: boolean
  valueInteger?: number
  valueRange?: {
    low?: {
      value: number
      unit: string
      system: string
      code: string
    }
    high?: {
      value: number
      unit: string
      system: string
      code: string
    }
  }
  component?: Array<{
    code: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    valueQuantity?: {
      value: number
      unit: string
      system: string
      code: string
    }
  }>
  referenceRange?: Array<{
    low?: {
      value: number
      unit: string
      system: string
      code: string
    }
    high?: {
      value: number
      unit: string
      system: string
      code: string
    }
    type?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    text?: string
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
 * FHIR DO Contract with Observation support
 */
export interface FHIRDO {
  // Observation read operations
  readObservation(id: string): Promise<Observation | null>
  searchObservations(params: { category?: string; patient?: string }): Promise<Observation[]>

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

describe('FHIR R4 Observation Vital Signs', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('readObservation() - Direct method', () => {
    it('should return null for non-existent observation', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readObservation('nonexistent')
      expect(result).toBeNull()
    })

    it('should return Observation resource with required fields', async () => {
      const instance = new FHIRDO(ctx, env)

      // Store a heart rate observation
      const observation: Observation = {
        resourceType: 'Observation',
        id: 'heart-rate-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 72,
          unit: 'beats/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        }
      }

      await ctx.storage.put('Observation:heart-rate-1', observation)

      const result = await instance.readObservation('heart-rate-1')
      expect(result).not.toBeNull()
      expect(result!.resourceType).toBe('Observation')
      expect(result!.id).toBe('heart-rate-1')
      expect(result!.status).toBe('final')
      expect(result!.code.coding[0].code).toBe('8867-4')
    })
  })

  describe('GET /fhir/r4/Observation/{id} - HTTP endpoint', () => {
    it('should return 200 with valid Observation resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const observation: Observation = {
        resourceType: 'Observation',
        id: 'temp-1',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8310-5',
            display: 'Body temperature'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 37.0,
          unit: 'C',
          system: 'http://unitsofmeasure.org',
          code: 'Cel'
        }
      }

      await ctx.storage.put('Observation:temp-1', observation)

      const request = new Request('http://fhir.do/fhir/r4/Observation/temp-1', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Observation
      expect(data.resourceType).toBe('Observation')
      expect(data.id).toBe('temp-1')
      expect(data.valueQuantity).toBeDefined()
      expect(data.valueQuantity!.value).toBe(37.0)
    })

    it('should return 404 for non-existent observation', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/Observation/nonexistent', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].severity).toBe('error')
      expect(outcome.issue[0].code).toBe('not-found')
    })
  })

  describe('Blood Pressure with Components', () => {
    it('should handle blood pressure with systolic and diastolic components', async () => {
      const instance = new FHIRDO(ctx, env)

      const bloodPressure: Observation = {
        resourceType: 'Observation',
        id: 'bp-1',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '85354-9',
            display: 'Blood pressure panel with all children optional'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        component: [
          {
            code: {
              coding: [{
                system: 'http://loinc.org',
                code: '8480-6',
                display: 'Systolic blood pressure'
              }]
            },
            valueQuantity: {
              value: 120,
              unit: 'mm[Hg]',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]'
            }
          },
          {
            code: {
              coding: [{
                system: 'http://loinc.org',
                code: '8462-4',
                display: 'Diastolic blood pressure'
              }]
            },
            valueQuantity: {
              value: 80,
              unit: 'mm[Hg]',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]'
            }
          }
        ]
      }

      await ctx.storage.put('Observation:bp-1', bloodPressure)

      const result = await instance.readObservation('bp-1')
      expect(result).not.toBeNull()
      expect(result!.component).toBeDefined()
      expect(result!.component!.length).toBe(2)
      expect(result!.component![0].valueQuantity!.value).toBe(120)
      expect(result!.component![1].valueQuantity!.value).toBe(80)
    })
  })

  describe('UCUM Units', () => {
    it('should use proper UCUM units for temperature', async () => {
      const instance = new FHIRDO(ctx, env)

      const observation: Observation = {
        resourceType: 'Observation',
        id: 'temp-ucum',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8310-5',
            display: 'Body temperature'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 98.6,
          unit: '[degF]',
          system: 'http://unitsofmeasure.org',
          code: '[degF]'
        }
      }

      await ctx.storage.put('Observation:temp-ucum', observation)

      const result = await instance.readObservation('temp-ucum')
      expect(result!.valueQuantity!.system).toBe('http://unitsofmeasure.org')
      expect(result!.valueQuantity!.code).toBe('[degF]')
    })

    it('should use proper UCUM units for respiratory rate', async () => {
      const instance = new FHIRDO(ctx, env)

      const observation: Observation = {
        resourceType: 'Observation',
        id: 'resp-rate',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '9279-1',
            display: 'Respiratory rate'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 16,
          unit: 'breaths/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        }
      }

      await ctx.storage.put('Observation:resp-rate', observation)

      const result = await instance.readObservation('resp-rate')
      expect(result!.valueQuantity!.code).toBe('/min')
    })
  })

  describe('Reference Range', () => {
    it('should include reference range for vital signs', async () => {
      const instance = new FHIRDO(ctx, env)

      const observation: Observation = {
        resourceType: 'Observation',
        id: 'hr-with-range',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 72,
          unit: 'beats/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        },
        referenceRange: [{
          low: {
            value: 60,
            unit: 'beats/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min'
          },
          high: {
            value: 100,
            unit: 'beats/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min'
          }
        }]
      }

      await ctx.storage.put('Observation:hr-with-range', observation)

      const result = await instance.readObservation('hr-with-range')
      expect(result!.referenceRange).toBeDefined()
      expect(result!.referenceRange![0].low!.value).toBe(60)
      expect(result!.referenceRange![0].high!.value).toBe(100)
    })
  })

  describe('LOINC Codes', () => {
    it('should use correct LOINC code for heart rate (8867-4)', async () => {
      const instance = new FHIRDO(ctx, env)

      const observation: Observation = {
        resourceType: 'Observation',
        id: 'hr-loinc',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 72,
          unit: 'beats/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        }
      }

      await ctx.storage.put('Observation:hr-loinc', observation)

      const result = await instance.readObservation('hr-loinc')
      expect(result!.code.coding[0].system).toBe('http://loinc.org')
      expect(result!.code.coding[0].code).toBe('8867-4')
    })

    it('should use correct LOINC code for oxygen saturation (2708-6)', async () => {
      const instance = new FHIRDO(ctx, env)

      const observation: Observation = {
        resourceType: 'Observation',
        id: 'o2sat',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2708-6',
            display: 'Oxygen saturation in Arterial blood'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 98,
          unit: '%',
          system: 'http://unitsofmeasure.org',
          code: '%'
        }
      }

      await ctx.storage.put('Observation:o2sat', observation)

      const result = await instance.readObservation('o2sat')
      expect(result!.code.coding[0].code).toBe('2708-6')
    })
  })

  describe('Patient and Encounter References', () => {
    it('should include reference to Patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const observation: Observation = {
        resourceType: 'Observation',
        id: 'ref-test-1',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate'
          }]
        },
        subject: {
          reference: 'Patient/patient-123',
          display: 'John Smith'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 72,
          unit: 'beats/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        }
      }

      await ctx.storage.put('Observation:ref-test-1', observation)

      const result = await instance.readObservation('ref-test-1')
      expect(result!.subject).toBeDefined()
      expect(result!.subject!.reference).toBe('Patient/patient-123')
    })

    it('should include reference to Encounter', async () => {
      const instance = new FHIRDO(ctx, env)

      const observation: Observation = {
        resourceType: 'Observation',
        id: 'ref-test-2',
        status: 'final',
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8867-4',
            display: 'Heart rate'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        encounter: {
          reference: 'Encounter/encounter-456'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 72,
          unit: 'beats/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        }
      }

      await ctx.storage.put('Observation:ref-test-2', observation)

      const result = await instance.readObservation('ref-test-2')
      expect(result!.encounter).toBeDefined()
      expect(result!.encounter!.reference).toBe('Encounter/encounter-456')
    })
  })

  describe('Search by category and patient', () => {
    it('should search observations by vital-signs category and patient', async () => {
      const instance = new FHIRDO(ctx, env)

      // Store multiple observations
      const obs1: Observation = {
        resourceType: 'Observation',
        id: 'search-1',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8867-4'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 72,
          unit: 'beats/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        }
      }

      const obs2: Observation = {
        resourceType: 'Observation',
        id: 'search-2',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8310-5'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T10:35:00.000Z',
        valueQuantity: {
          value: 37.0,
          unit: 'C',
          system: 'http://unitsofmeasure.org',
          code: 'Cel'
        }
      }

      // Observation for different patient
      const obs3: Observation = {
        resourceType: 'Observation',
        id: 'search-3',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8867-4'
          }]
        },
        subject: {
          reference: 'Patient/patient-456'
        },
        effectiveDateTime: '2024-01-15T10:40:00.000Z',
        valueQuantity: {
          value: 68,
          unit: 'beats/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        }
      }

      await ctx.storage.put('Observation:search-1', obs1)
      await ctx.storage.put('Observation:search-2', obs2)
      await ctx.storage.put('Observation:search-3', obs3)

      const results = await instance.searchObservations({
        category: 'vital-signs',
        patient: 'patient-123'
      })

      expect(results.length).toBe(2)
      expect(results.every(obs => obs.subject!.reference === 'Patient/patient-123')).toBe(true)
    })
  })

  describe('GET /fhir/r4/Observation - Search endpoint', () => {
    it('should search by category and patient via HTTP', async () => {
      const instance = new FHIRDO(ctx, env)

      const obs: Observation = {
        resourceType: 'Observation',
        id: 'http-search-1',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '8867-4'
          }]
        },
        subject: {
          reference: 'Patient/test-patient'
        },
        effectiveDateTime: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 72,
          unit: 'beats/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        }
      }

      await ctx.storage.put('Observation:http-search-1', obs)

      const request = new Request('http://fhir.do/fhir/r4/Observation?category=vital-signs&patient=test-patient', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as any
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.entry).toBeDefined()
    })
  })
})
