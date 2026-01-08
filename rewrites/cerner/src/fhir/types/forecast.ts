/**
 * FHIR R4 Forecast Type Definitions
 *
 * Types for immunization forecasting and vaccine scheduling.
 */

import type { AgeValue, CodeableConcept, IntervalValue, Reference } from './datatypes'
import type { ForecastStatus } from './primitives'

// =============================================================================
// Vaccine Schedule Types
// =============================================================================

/**
 * CDC ACIP Vaccine Schedule Entry
 */
export interface VaccineScheduleEntry {
  vaccineCode: string
  vaccineDisplay: string
  cvx: string
  series: VaccineSeries[]
}

export interface VaccineSeries {
  seriesName: string
  doses: VaccineDose[]
  targetDisease: CodeableConcept
}

export interface VaccineDose {
  doseNumber: number
  minAge: AgeValue
  recommendedAge: AgeValue
  maxAge?: AgeValue
  minIntervalFromPrevious?: IntervalValue
  recommendedIntervalFromPrevious?: IntervalValue
  contraindications?: CodeableConcept[]
  precautions?: CodeableConcept[]
}

// =============================================================================
// Immunization Forecast Types
// =============================================================================

export interface ImmunizationForecast {
  patient: Reference<'Patient'>
  vaccineCode: CodeableConcept
  targetDisease: CodeableConcept
  forecastStatus: ForecastStatus
  doseNumber: number
  seriesDoses: number
  earliestDate?: string
  recommendedDate?: string
  latestDate?: string
  pastDueDate?: string
  supportingImmunizations: Reference<'Immunization'>[]
  contraindicationReasons?: CodeableConcept[]
}
