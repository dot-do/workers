/**
 * RED/GREEN Tests: FHIR R4 Observation Laboratory Results
 *
 * Tests for workers-033: [GREEN] Implement Observation laboratory results
 *
 * Acceptance Criteria:
 * - Test lab-specific LOINC codes (chemistry, hematology, etc.)
 * - Test reference ranges for lab values
 * - Test interpretation codes (high, low, normal, abnormal)
 * - Test specimen references
 * - Test complete blood count (CBC) panel
 * - Test metabolic panel with multiple results
 *
 * @see FHIR R4 Observation: http://hl7.org/fhir/R4/observation.html
 * @see FHIR Lab Results: http://hl7.org/fhir/R4/observation-lab.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'
import type { Observation } from '../src/types.js'

/**
 * FHIR DO Contract with Observation support
 */
export interface FHIRDO {
  // Observation read operations
  readObservation(id: string): Promise<Observation | null>
  searchObservations(params: { category?: string; patient?: string; code?: string }): Promise<Observation[]>

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

describe('FHIR R4 Observation Laboratory Results', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('Lab-specific LOINC codes', () => {
    it('should support glucose measurement with LOINC code 2345-7', async () => {
      const instance = new FHIRDO(ctx, env)

      const glucose: Observation = {
        resourceType: 'Observation',
        id: 'lab-glucose-1',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2345-7',
            display: 'Glucose [Mass/volume] in Serum or Plasma'
          }],
          text: 'Glucose'
        },
        subject: {
          reference: 'Patient/patient-123',
          display: 'John Smith'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        issued: '2024-01-15T10:30:00.000Z',
        valueQuantity: {
          value: 95,
          unit: 'mg/dL',
          system: 'http://unitsofmeasure.org',
          code: 'mg/dL'
        }
      }

      await ctx.storage.put('Observation:lab-glucose-1', glucose)

      const result = await instance.readObservation('lab-glucose-1')
      expect(result).not.toBeNull()
      expect(result!.code.coding[0].code).toBe('2345-7')
      expect(result!.code.coding[0].system).toBe('http://loinc.org')
      expect(result!.category![0].coding[0].code).toBe('laboratory')
    })

    it('should support hemoglobin measurement with LOINC code 718-7', async () => {
      const instance = new FHIRDO(ctx, env)

      const hemoglobin: Observation = {
        resourceType: 'Observation',
        id: 'lab-hgb-1',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '718-7',
            display: 'Hemoglobin [Mass/volume] in Blood'
          }],
          text: 'Hemoglobin'
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 14.5,
          unit: 'g/dL',
          system: 'http://unitsofmeasure.org',
          code: 'g/dL'
        }
      }

      await ctx.storage.put('Observation:lab-hgb-1', hemoglobin)

      const result = await instance.readObservation('lab-hgb-1')
      expect(result!.code.coding[0].code).toBe('718-7')
      expect(result!.valueQuantity!.value).toBe(14.5)
    })

    it('should support creatinine measurement with LOINC code 2160-0', async () => {
      const instance = new FHIRDO(ctx, env)

      const creatinine: Observation = {
        resourceType: 'Observation',
        id: 'lab-creat-1',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2160-0',
            display: 'Creatinine [Mass/volume] in Serum or Plasma'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 1.1,
          unit: 'mg/dL',
          system: 'http://unitsofmeasure.org',
          code: 'mg/dL'
        }
      }

      await ctx.storage.put('Observation:lab-creat-1', creatinine)

      const result = await instance.readObservation('lab-creat-1')
      expect(result!.code.coding[0].code).toBe('2160-0')
    })
  })

  describe('Reference ranges for lab values', () => {
    it('should include reference range for glucose', async () => {
      const instance = new FHIRDO(ctx, env)

      const glucose: Observation = {
        resourceType: 'Observation',
        id: 'lab-glucose-range',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2345-7',
            display: 'Glucose [Mass/volume] in Serum or Plasma'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 95,
          unit: 'mg/dL',
          system: 'http://unitsofmeasure.org',
          code: 'mg/dL'
        },
        referenceRange: [{
          low: {
            value: 70,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL'
          },
          high: {
            value: 100,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL'
          },
          text: 'Normal fasting glucose range'
        }]
      }

      await ctx.storage.put('Observation:lab-glucose-range', glucose)

      const result = await instance.readObservation('lab-glucose-range')
      expect(result!.referenceRange).toBeDefined()
      expect(result!.referenceRange![0].low!.value).toBe(70)
      expect(result!.referenceRange![0].high!.value).toBe(100)
    })

    it('should include reference range for hemoglobin with gender-specific range', async () => {
      const instance = new FHIRDO(ctx, env)

      const hemoglobin: Observation = {
        resourceType: 'Observation',
        id: 'lab-hgb-range',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '718-7',
            display: 'Hemoglobin [Mass/volume] in Blood'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 14.5,
          unit: 'g/dL',
          system: 'http://unitsofmeasure.org',
          code: 'g/dL'
        },
        referenceRange: [{
          low: {
            value: 13.5,
            unit: 'g/dL',
            system: 'http://unitsofmeasure.org',
            code: 'g/dL'
          },
          high: {
            value: 17.5,
            unit: 'g/dL',
            system: 'http://unitsofmeasure.org',
            code: 'g/dL'
          },
          type: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/referencerange-meaning',
              code: 'normal',
              display: 'Normal Range'
            }]
          },
          text: 'Normal range for adult males'
        }]
      }

      await ctx.storage.put('Observation:lab-hgb-range', hemoglobin)

      const result = await instance.readObservation('lab-hgb-range')
      expect(result!.referenceRange![0].type).toBeDefined()
      expect(result!.referenceRange![0].type!.coding[0].code).toBe('normal')
    })
  })

  describe('Interpretation codes', () => {
    it('should include interpretation code for high glucose', async () => {
      const instance = new FHIRDO(ctx, env)

      const glucose: Observation = {
        resourceType: 'Observation',
        id: 'lab-glucose-high',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2345-7',
            display: 'Glucose [Mass/volume] in Serum or Plasma'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 145,
          unit: 'mg/dL',
          system: 'http://unitsofmeasure.org',
          code: 'mg/dL'
        },
        referenceRange: [{
          low: {
            value: 70,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL'
          },
          high: {
            value: 100,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL'
          }
        }],
        interpretation: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: 'H',
            display: 'High'
          }],
          text: 'Above high normal'
        }]
      }

      await ctx.storage.put('Observation:lab-glucose-high', glucose)

      const result = await instance.readObservation('lab-glucose-high')
      expect(result!.interpretation).toBeDefined()
      expect(result!.interpretation![0].coding[0].code).toBe('H')
      expect(result!.interpretation![0].coding[0].display).toBe('High')
    })

    it('should include interpretation code for low hemoglobin', async () => {
      const instance = new FHIRDO(ctx, env)

      const hemoglobin: Observation = {
        resourceType: 'Observation',
        id: 'lab-hgb-low',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '718-7',
            display: 'Hemoglobin [Mass/volume] in Blood'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 10.5,
          unit: 'g/dL',
          system: 'http://unitsofmeasure.org',
          code: 'g/dL'
        },
        referenceRange: [{
          low: {
            value: 13.5,
            unit: 'g/dL',
            system: 'http://unitsofmeasure.org',
            code: 'g/dL'
          },
          high: {
            value: 17.5,
            unit: 'g/dL',
            system: 'http://unitsofmeasure.org',
            code: 'g/dL'
          }
        }],
        interpretation: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: 'L',
            display: 'Low'
          }],
          text: 'Below low normal'
        }]
      }

      await ctx.storage.put('Observation:lab-hgb-low', hemoglobin)

      const result = await instance.readObservation('lab-hgb-low')
      expect(result!.interpretation![0].coding[0].code).toBe('L')
    })

    it('should include interpretation code for normal result', async () => {
      const instance = new FHIRDO(ctx, env)

      const creatinine: Observation = {
        resourceType: 'Observation',
        id: 'lab-creat-normal',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2160-0',
            display: 'Creatinine [Mass/volume] in Serum or Plasma'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 1.0,
          unit: 'mg/dL',
          system: 'http://unitsofmeasure.org',
          code: 'mg/dL'
        },
        referenceRange: [{
          low: {
            value: 0.6,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL'
          },
          high: {
            value: 1.2,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL'
          }
        }],
        interpretation: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: 'N',
            display: 'Normal'
          }]
        }]
      }

      await ctx.storage.put('Observation:lab-creat-normal', creatinine)

      const result = await instance.readObservation('lab-creat-normal')
      expect(result!.interpretation![0].coding[0].code).toBe('N')
    })

    it('should support abnormal interpretation', async () => {
      const instance = new FHIRDO(ctx, env)

      const lab: Observation = {
        resourceType: 'Observation',
        id: 'lab-abnormal',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2951-2',
            display: 'Sodium [Moles/volume] in Serum or Plasma'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 125,
          unit: 'mmol/L',
          system: 'http://unitsofmeasure.org',
          code: 'mmol/L'
        },
        interpretation: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: 'A',
            display: 'Abnormal'
          }]
        }]
      }

      await ctx.storage.put('Observation:lab-abnormal', lab)

      const result = await instance.readObservation('lab-abnormal')
      expect(result!.interpretation![0].coding[0].code).toBe('A')
    })
  })

  describe('Specimen references', () => {
    it('should include specimen reference for blood sample', async () => {
      const instance = new FHIRDO(ctx, env)

      const glucose: Observation = {
        resourceType: 'Observation',
        id: 'lab-glucose-specimen',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2345-7',
            display: 'Glucose [Mass/volume] in Serum or Plasma'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 95,
          unit: 'mg/dL',
          system: 'http://unitsofmeasure.org',
          code: 'mg/dL'
        },
        specimen: {
          reference: 'Specimen/blood-12345',
          display: 'Blood sample'
        }
      }

      await ctx.storage.put('Observation:lab-glucose-specimen', glucose)

      const result = await instance.readObservation('lab-glucose-specimen')
      expect(result!.specimen).toBeDefined()
      expect(result!.specimen!.reference).toBe('Specimen/blood-12345')
      expect(result!.specimen!.display).toBe('Blood sample')
    })

    it('should include specimen reference for urine sample', async () => {
      const instance = new FHIRDO(ctx, env)

      const urinalysis: Observation = {
        resourceType: 'Observation',
        id: 'lab-urine-specimen',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '5811-5',
            display: 'Specific gravity of Urine by Test strip'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 1.020,
          unit: '{ratio}',
          system: 'http://unitsofmeasure.org',
          code: '{ratio}'
        },
        specimen: {
          reference: 'Specimen/urine-67890',
          display: 'Urine sample'
        }
      }

      await ctx.storage.put('Observation:lab-urine-specimen', urinalysis)

      const result = await instance.readObservation('lab-urine-specimen')
      expect(result!.specimen!.reference).toBe('Specimen/urine-67890')
    })
  })

  describe('Complete Blood Count (CBC) panel', () => {
    it('should handle multiple CBC components with interpretations', async () => {
      const instance = new FHIRDO(ctx, env)

      // White Blood Cell Count
      const wbc: Observation = {
        resourceType: 'Observation',
        id: 'cbc-wbc',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '6690-2',
            display: 'Leukocytes [#/volume] in Blood by Automated count'
          }],
          text: 'WBC'
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 7.5,
          unit: '10*3/uL',
          system: 'http://unitsofmeasure.org',
          code: '10*3/uL'
        },
        referenceRange: [{
          low: {
            value: 4.5,
            unit: '10*3/uL',
            system: 'http://unitsofmeasure.org',
            code: '10*3/uL'
          },
          high: {
            value: 11.0,
            unit: '10*3/uL',
            system: 'http://unitsofmeasure.org',
            code: '10*3/uL'
          }
        }],
        interpretation: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: 'N',
            display: 'Normal'
          }]
        }],
        specimen: {
          reference: 'Specimen/blood-cbc-001'
        }
      }

      await ctx.storage.put('Observation:cbc-wbc', wbc)

      const result = await instance.readObservation('cbc-wbc')
      expect(result!.code.coding[0].code).toBe('6690-2')
      expect(result!.interpretation![0].coding[0].code).toBe('N')
      expect(result!.specimen!.reference).toBe('Specimen/blood-cbc-001')
    })
  })

  describe('Metabolic panel with multiple results', () => {
    it('should handle basic metabolic panel results', async () => {
      const instance = new FHIRDO(ctx, env)

      // Sodium
      const sodium: Observation = {
        resourceType: 'Observation',
        id: 'bmp-sodium',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2951-2',
            display: 'Sodium [Moles/volume] in Serum or Plasma'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 140,
          unit: 'mmol/L',
          system: 'http://unitsofmeasure.org',
          code: 'mmol/L'
        },
        referenceRange: [{
          low: {
            value: 136,
            unit: 'mmol/L',
            system: 'http://unitsofmeasure.org',
            code: 'mmol/L'
          },
          high: {
            value: 145,
            unit: 'mmol/L',
            system: 'http://unitsofmeasure.org',
            code: 'mmol/L'
          }
        }],
        interpretation: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: 'N',
            display: 'Normal'
          }]
        }],
        specimen: {
          reference: 'Specimen/serum-bmp-001',
          display: 'Serum sample'
        }
      }

      await ctx.storage.put('Observation:bmp-sodium', sodium)

      const result = await instance.readObservation('bmp-sodium')
      expect(result!.code.coding[0].code).toBe('2951-2')
      expect(result!.valueQuantity!.value).toBe(140)
      expect(result!.interpretation).toBeDefined()
      expect(result!.specimen).toBeDefined()
    })
  })

  describe('Search by laboratory category', () => {
    it('should search observations by laboratory category', async () => {
      const instance = new FHIRDO(ctx, env)

      const glucose: Observation = {
        resourceType: 'Observation',
        id: 'search-lab-1',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2345-7'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 95,
          unit: 'mg/dL',
          system: 'http://unitsofmeasure.org',
          code: 'mg/dL'
        }
      }

      await ctx.storage.put('Observation:search-lab-1', glucose)

      const results = await instance.searchObservations({
        category: 'laboratory',
        patient: 'patient-123'
      })

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].category![0].coding[0].code).toBe('laboratory')
    })
  })

  describe('HTTP endpoint for lab results', () => {
    it('should return lab observation with all fields via HTTP', async () => {
      const instance = new FHIRDO(ctx, env)

      const glucose: Observation = {
        resourceType: 'Observation',
        id: 'http-lab-1',
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: '2345-7',
            display: 'Glucose [Mass/volume] in Serum or Plasma'
          }]
        },
        subject: {
          reference: 'Patient/patient-123'
        },
        effectiveDateTime: '2024-01-15T08:00:00.000Z',
        valueQuantity: {
          value: 145,
          unit: 'mg/dL',
          system: 'http://unitsofmeasure.org',
          code: 'mg/dL'
        },
        referenceRange: [{
          low: {
            value: 70,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL'
          },
          high: {
            value: 100,
            unit: 'mg/dL',
            system: 'http://unitsofmeasure.org',
            code: 'mg/dL'
          }
        }],
        interpretation: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: 'H',
            display: 'High'
          }]
        }],
        specimen: {
          reference: 'Specimen/blood-12345',
          display: 'Blood sample'
        }
      }

      await ctx.storage.put('Observation:http-lab-1', glucose)

      const request = new Request('http://fhir.do/fhir/r4/Observation/http-lab-1', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Observation
      expect(data.resourceType).toBe('Observation')
      expect(data.id).toBe('http-lab-1')
      expect(data.interpretation).toBeDefined()
      expect(data.interpretation![0].coding[0].code).toBe('H')
      expect(data.specimen).toBeDefined()
      expect(data.specimen!.reference).toBe('Specimen/blood-12345')
      expect(data.referenceRange).toBeDefined()
    })
  })
})
