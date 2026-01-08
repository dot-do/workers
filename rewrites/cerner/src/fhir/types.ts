/**
 * FHIR R4 Type Definitions for Cerner.do
 *
 * Defines core FHIR resource types used throughout the platform.
 */

// =============================================================================
// Core FHIR Types
// =============================================================================

export interface Reference<T extends string = string> {
  reference?: string
  type?: T
  identifier?: Identifier
  display?: string
}

export interface Identifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old'
  type?: CodeableConcept
  system?: string
  value?: string
  period?: Period
  assigner?: Reference<'Organization'>
}

export interface CodeableConcept {
  coding?: Coding[]
  text?: string
}

export interface Coding {
  system?: string
  version?: string
  code?: string
  display?: string
  userSelected?: boolean
}

export interface Period {
  start?: string
  end?: string
}

export interface Annotation {
  authorReference?: Reference<'Practitioner' | 'Patient' | 'RelatedPerson'>
  authorString?: string
  time?: string
  text: string
}

export interface Quantity {
  value?: number
  comparator?: '<' | '<=' | '>=' | '>'
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
// Base Resource
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

export interface Narrative {
  status: 'generated' | 'extensions' | 'additional' | 'empty'
  div: string
}

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
// Patient Resource
// =============================================================================

export interface Patient extends DomainResource {
  resourceType: 'Patient'
  identifier?: Identifier[]
  active?: boolean
  name?: HumanName[]
  telecom?: ContactPoint[]
  gender?: 'male' | 'female' | 'other' | 'unknown'
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

export interface HumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden'
  text?: string
  family?: string
  given?: string[]
  prefix?: string[]
  suffix?: string[]
  period?: Period
}

export interface ContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other'
  value?: string
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile'
  rank?: number
  period?: Period
}

export interface Address {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing'
  type?: 'postal' | 'physical' | 'both'
  text?: string
  line?: string[]
  city?: string
  district?: string
  state?: string
  postalCode?: string
  country?: string
  period?: Period
}

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

export interface PatientContact {
  relationship?: CodeableConcept[]
  name?: HumanName
  telecom?: ContactPoint[]
  address?: Address
  gender?: 'male' | 'female' | 'other' | 'unknown'
  organization?: Reference<'Organization'>
  period?: Period
}

export interface PatientCommunication {
  language: CodeableConcept
  preferred?: boolean
}

export interface PatientLink {
  other: Reference<'Patient' | 'RelatedPerson'>
  type: 'replaced-by' | 'replaces' | 'refer' | 'seealso'
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

export type ImmunizationStatus = 'completed' | 'entered-in-error' | 'not-done'

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

// =============================================================================
// Bundle Types
// =============================================================================

export interface Bundle<T extends Resource = Resource> extends Resource {
  resourceType: 'Bundle'
  identifier?: Identifier
  type: BundleType
  timestamp?: string
  total?: number
  link?: BundleLink[]
  entry?: BundleEntry<T>[]
  signature?: Signature
}

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

export interface BundleLink {
  relation: string
  url: string
}

export interface BundleEntry<T extends Resource = Resource> {
  link?: BundleLink[]
  fullUrl?: string
  resource?: T
  search?: BundleEntrySearch
  request?: BundleEntryRequest
  response?: BundleEntryResponse
}

export interface BundleEntrySearch {
  mode?: 'match' | 'include' | 'outcome'
  score?: number
}

export interface BundleEntryRequest {
  method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  ifNoneMatch?: string
  ifModifiedSince?: string
  ifMatch?: string
  ifNoneExist?: string
}

export interface BundleEntryResponse {
  status: string
  location?: string
  etag?: string
  lastModified?: string
  outcome?: Resource
}

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
// Search Parameters
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

// =============================================================================
// Forecast Types
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

export interface AgeValue {
  value: number
  unit: 'days' | 'weeks' | 'months' | 'years'
}

export interface IntervalValue {
  value: number
  unit: 'days' | 'weeks' | 'months' | 'years'
}

/**
 * Forecast status codes per CDC recommendations
 */
export type ForecastStatus =
  | 'due'
  | 'overdue'
  | 'immune'
  | 'contraindicated'
  | 'complete'
  | 'not-recommended'
  | 'aged-out'

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
