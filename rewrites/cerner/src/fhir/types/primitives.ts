/**
 * FHIR R4 Primitive Type Definitions
 *
 * Base types and enumerations used throughout FHIR resources.
 */

// =============================================================================
// Status Types
// =============================================================================

export type ImmunizationStatus = 'completed' | 'entered-in-error' | 'not-done'

export type NarrativeStatus = 'generated' | 'extensions' | 'additional' | 'empty'

export type IdentifierUse = 'usual' | 'official' | 'temp' | 'secondary' | 'old'

export type NameUse = 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden'

export type AddressUse = 'home' | 'work' | 'temp' | 'old' | 'billing'

export type AddressType = 'postal' | 'physical' | 'both'

export type ContactPointSystem = 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other'

export type ContactPointUse = 'home' | 'work' | 'temp' | 'old' | 'mobile'

export type AdministrativeGender = 'male' | 'female' | 'other' | 'unknown'

export type LinkType = 'replaced-by' | 'replaces' | 'refer' | 'seealso'

export type QuantityComparator = '<' | '<=' | '>=' | '>'

export type BundleSearchMode = 'match' | 'include' | 'outcome'

export type HTTPMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// =============================================================================
// Bundle Types
// =============================================================================

export type BundleType =
  | 'document'
  | 'message'
  | 'transaction'
  | 'transaction-response'
  | 'batch'
  | 'batch-response'
  | 'history'
  | 'searchset'
  | 'collection'

// =============================================================================
// Forecast Types
// =============================================================================

export type ForecastStatus =
  | 'due'
  | 'overdue'
  | 'immune'
  | 'contraindicated'
  | 'complete'
  | 'not-recommended'
  | 'aged-out'

export type AgeUnit = 'days' | 'weeks' | 'months' | 'years'

export type IntervalUnit = 'days' | 'weeks' | 'months' | 'years'
