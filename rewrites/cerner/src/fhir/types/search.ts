/**
 * FHIR R4 Search Parameter Definitions
 *
 * Search parameters for querying FHIR resources.
 */

import type { ImmunizationStatus } from './primitives'

// =============================================================================
// Immunization Search Parameters
// =============================================================================

export interface ImmunizationSearchParams {
  _id?: string
  _lastUpdated?: string
  patient?: string
  date?: string
  status?: ImmunizationStatus
  'vaccine-code'?: string
  location?: string
  manufacturer?: string
  'lot-number'?: string
  performer?: string
  'reaction-date'?: string
  'reason-code'?: string
  series?: string
  'status-reason'?: string
  'target-disease'?: string
  _count?: number
  _sort?: string
  _include?: string[]
  _revinclude?: string[]
}
