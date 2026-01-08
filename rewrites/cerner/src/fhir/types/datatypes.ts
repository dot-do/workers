/**
 * FHIR R4 Data Type Definitions
 *
 * Complex data types used within FHIR resources.
 */

import type {
  AddressType,
  AddressUse,
  AgeUnit,
  ContactPointSystem,
  ContactPointUse,
  IdentifierUse,
  IntervalUnit,
  NameUse,
  QuantityComparator,
} from './primitives'

// =============================================================================
// Core Data Types
// =============================================================================

export interface Coding {
  system?: string
  version?: string
  code?: string
  display?: string
  userSelected?: boolean
}

export interface CodeableConcept {
  coding?: Coding[]
  text?: string
}

export interface Period {
  start?: string
  end?: string
}

export interface Quantity {
  value?: number
  comparator?: QuantityComparator
  unit?: string
  system?: string
  code?: string
}

export interface Meta {
  versionId?: string
  lastUpdated?: string
  source?: string
  profile?: string[]
  security?: Coding[]
  tag?: Coding[]
}

// =============================================================================
// Reference Types
// =============================================================================

export interface Reference<T extends string = string> {
  reference?: string
  type?: T
  identifier?: Identifier
  display?: string
}

export interface Identifier {
  use?: IdentifierUse
  type?: CodeableConcept
  system?: string
  value?: string
  period?: Period
  assigner?: Reference<'Organization'>
}

// =============================================================================
// Contact Information Types
// =============================================================================

export interface HumanName {
  use?: NameUse
  text?: string
  family?: string
  given?: string[]
  prefix?: string[]
  suffix?: string[]
  period?: Period
}

export interface ContactPoint {
  system?: ContactPointSystem
  value?: string
  use?: ContactPointUse
  rank?: number
  period?: Period
}

export interface Address {
  use?: AddressUse
  type?: AddressType
  text?: string
  line?: string[]
  city?: string
  district?: string
  state?: string
  postalCode?: string
  country?: string
  period?: Period
}

// =============================================================================
// Attachment Types
// =============================================================================

export interface Attachment {
  contentType?: string
  language?: string
  data?: string
  url?: string
  size?: number
  hash?: string
  title?: string
  creation?: string
}

// =============================================================================
// Annotation Types
// =============================================================================

export interface Annotation {
  authorReference?: Reference<'Practitioner' | 'Patient' | 'RelatedPerson'>
  authorString?: string
  time?: string
  text: string
}

// =============================================================================
// Signature Types
// =============================================================================

export interface Signature {
  type: Coding[]
  when: string
  who: Reference<'Practitioner' | 'PractitionerRole' | 'RelatedPerson' | 'Patient' | 'Device' | 'Organization'>
  onBehalfOf?: Reference<'Practitioner' | 'PractitionerRole' | 'RelatedPerson' | 'Patient' | 'Device' | 'Organization'>
  targetFormat?: string
  sigFormat?: string
  data?: string
}

// =============================================================================
// Extension Types
// =============================================================================

export interface Extension {
  url: string
  valueString?: string
  valueInteger?: number
  valueBoolean?: boolean
  valueCode?: string
  valueCodeableConcept?: CodeableConcept
  valueQuantity?: Quantity
  valueReference?: Reference
  valuePeriod?: Period
}

// =============================================================================
// Narrative Types
// =============================================================================

export interface Narrative {
  status: 'generated' | 'extensions' | 'additional' | 'empty'
  div: string
}

// =============================================================================
// Time/Age Value Types
// =============================================================================

export interface AgeValue {
  value: number
  unit: AgeUnit
}

export interface IntervalValue {
  value: number
  unit: IntervalUnit
}
