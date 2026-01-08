/**
 * FHIR R4 Type Definitions
 *
 * This module provides a comprehensive set of FHIR R4 type definitions
 * organized into logical categories:
 *
 * - primitives: Basic types and enumerations
 * - datatypes: Complex data types (CodeableConcept, Reference, etc.)
 * - resources: Base and domain resources (Patient, Immunization, etc.)
 * - bundle: Bundle types for resource grouping
 * - search: Search parameter definitions
 * - forecast: Immunization forecasting types
 */

// Primitives - Basic types and enumerations
export type {
  AddressType,
  AddressUse,
  AdministrativeGender,
  AgeUnit,
  BundleSearchMode,
  BundleType,
  ContactPointSystem,
  ContactPointUse,
  ForecastStatus,
  HTTPMethod,
  IdentifierUse,
  ImmunizationStatus,
  IntervalUnit,
  LinkType,
  NameUse,
  NarrativeStatus,
  QuantityComparator,
} from './primitives'

// Data Types - Complex data types
export type {
  Address,
  AgeValue,
  Annotation,
  Attachment,
  CodeableConcept,
  Coding,
  ContactPoint,
  Extension,
  HumanName,
  Identifier,
  IntervalValue,
  Meta,
  Narrative,
  Period,
  Quantity,
  Reference,
  Signature,
} from './datatypes'

// Resources - Base and domain resources
export type {
  DomainResource,
  Immunization,
  ImmunizationEducation,
  ImmunizationEvaluation,
  ImmunizationPerformer,
  ImmunizationProtocolApplied,
  ImmunizationReaction,
  ImmunizationRecommendation,
  ImmunizationRecommendationDateCriterion,
  ImmunizationRecommendationRecommendation,
  IssueSeverity,
  IssueType,
  OperationOutcome,
  OperationOutcomeIssue,
  Patient,
  PatientCommunication,
  PatientContact,
  PatientLink,
  Resource,
} from './resources'

// Bundle - Bundle types for resource grouping
export type {
  Bundle,
  BundleEntry,
  BundleEntryRequest,
  BundleEntryResponse,
  BundleEntrySearch,
  BundleLink,
} from './bundle'

// Search - Search parameter definitions
export type { ImmunizationSearchParams } from './search'

// Forecast - Immunization forecasting types
export type {
  ImmunizationForecast,
  VaccineDose,
  VaccineScheduleEntry,
  VaccineSeries,
} from './forecast'
