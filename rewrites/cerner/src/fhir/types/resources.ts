/**
 * FHIR R4 Resource Type Definitions
 *
 * Base resource types and domain resources.
 */

import type {
  Address,
  Annotation,
  Attachment,
  CodeableConcept,
  ContactPoint,
  Extension,
  HumanName,
  Identifier,
  Meta,
  Narrative,
  Period,
  Quantity,
  Reference,
} from './datatypes'
import type { AdministrativeGender, ImmunizationStatus, LinkType } from './primitives'

// =============================================================================
// Base Resource Types
// =============================================================================

export interface Resource {
  resourceType: string
  id?: string
  meta?: Meta
  implicitRules?: string
  language?: string
}

export interface DomainResource extends Resource {
  text?: Narrative
  contained?: Resource[]
  extension?: Extension[]
  modifierExtension?: Extension[]
}

// =============================================================================
// Patient Resource
// =============================================================================

export interface Patient extends DomainResource {
  resourceType: 'Patient'
  identifier?: Identifier[]
  active?: boolean
  name?: HumanName[]
  telecom?: ContactPoint[]
  gender?: AdministrativeGender
  birthDate?: string
  deceasedBoolean?: boolean
  deceasedDateTime?: string
  address?: Address[]
  maritalStatus?: CodeableConcept
  multipleBirthBoolean?: boolean
  multipleBirthInteger?: number
  photo?: Attachment[]
  contact?: PatientContact[]
  communication?: PatientCommunication[]
  generalPractitioner?: Reference<'Organization' | 'Practitioner' | 'PractitionerRole'>[]
  managingOrganization?: Reference<'Organization'>
  link?: PatientLink[]
}

export interface PatientContact {
  relationship?: CodeableConcept[]
  name?: HumanName
  telecom?: ContactPoint[]
  address?: Address
  gender?: AdministrativeGender
  organization?: Reference<'Organization'>
  period?: Period
}

export interface PatientCommunication {
  language: CodeableConcept
  preferred?: boolean
}

export interface PatientLink {
  other: Reference<'Patient' | 'RelatedPerson'>
  type: LinkType
}

// =============================================================================
// Immunization Resource
// =============================================================================

export interface Immunization extends DomainResource {
  resourceType: 'Immunization'
  identifier?: Identifier[]
  status: ImmunizationStatus
  statusReason?: CodeableConcept
  vaccineCode: CodeableConcept
  patient: Reference<'Patient'>
  encounter?: Reference<'Encounter'>
  occurrenceDateTime?: string
  occurrenceString?: string
  recorded?: string
  primarySource?: boolean
  reportOrigin?: CodeableConcept
  location?: Reference<'Location'>
  manufacturer?: Reference<'Organization'>
  lotNumber?: string
  expirationDate?: string
  site?: CodeableConcept
  route?: CodeableConcept
  doseQuantity?: Quantity
  performer?: ImmunizationPerformer[]
  note?: Annotation[]
  reasonCode?: CodeableConcept[]
  reasonReference?: Reference<'Condition' | 'Observation' | 'DiagnosticReport'>[]
  isSubpotent?: boolean
  subpotentReason?: CodeableConcept[]
  education?: ImmunizationEducation[]
  programEligibility?: CodeableConcept[]
  fundingSource?: CodeableConcept
  reaction?: ImmunizationReaction[]
  protocolApplied?: ImmunizationProtocolApplied[]
}

export interface ImmunizationPerformer {
  function?: CodeableConcept
  actor: Reference<'Practitioner' | 'PractitionerRole' | 'Organization'>
}

export interface ImmunizationEducation {
  documentType?: string
  reference?: string
  publicationDate?: string
  presentationDate?: string
}

export interface ImmunizationReaction {
  date?: string
  detail?: Reference<'Observation'>
  reported?: boolean
}

export interface ImmunizationProtocolApplied {
  series?: string
  authority?: Reference<'Organization'>
  targetDisease?: CodeableConcept[]
  doseNumberPositiveInt?: number
  doseNumberString?: string
  seriesDosesPositiveInt?: number
  seriesDosesString?: string
}

// =============================================================================
// ImmunizationRecommendation Resource
// =============================================================================

export interface ImmunizationRecommendation extends DomainResource {
  resourceType: 'ImmunizationRecommendation'
  identifier?: Identifier[]
  patient: Reference<'Patient'>
  date: string
  authority?: Reference<'Organization'>
  recommendation: ImmunizationRecommendationRecommendation[]
}

export interface ImmunizationRecommendationRecommendation {
  vaccineCode?: CodeableConcept[]
  targetDisease?: CodeableConcept
  contraindicatedVaccineCode?: CodeableConcept[]
  forecastStatus: CodeableConcept
  forecastReason?: CodeableConcept[]
  dateCriterion?: ImmunizationRecommendationDateCriterion[]
  description?: string
  series?: string
  doseNumberPositiveInt?: number
  doseNumberString?: string
  seriesDosesPositiveInt?: number
  seriesDosesString?: string
  supportingImmunization?: Reference<'Immunization' | 'ImmunizationEvaluation'>[]
  supportingPatientInformation?: Reference[]
}

export interface ImmunizationRecommendationDateCriterion {
  code: CodeableConcept
  value: string
}

// =============================================================================
// ImmunizationEvaluation Resource
// =============================================================================

export interface ImmunizationEvaluation extends DomainResource {
  resourceType: 'ImmunizationEvaluation'
  identifier?: Identifier[]
  status: 'completed' | 'entered-in-error'
  patient: Reference<'Patient'>
  date?: string
  authority?: Reference<'Organization'>
  targetDisease: CodeableConcept
  immunizationEvent: Reference<'Immunization'>
  doseStatus: CodeableConcept
  doseStatusReason?: CodeableConcept[]
  description?: string
  series?: string
  doseNumberPositiveInt?: number
  doseNumberString?: string
  seriesDosesPositiveInt?: number
  seriesDosesString?: string
}
