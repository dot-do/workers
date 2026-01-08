/**
 * Required Field Validation
 *
 * Validates that required fields are present in FHIR resources.
 */

import type { ValidationResult, ValidationOptions } from './types'
import { validResult, invalidResult, createError, mergeResults } from './types'

/**
 * Check if a value is defined (not null, undefined, or empty string)
 */
export function isDefined(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string' && value.trim() === '') return false
  return true
}

/**
 * Validate that a single required field is present
 */
export function validateRequired(
  value: unknown,
  fieldName: string,
  options: ValidationOptions = {}
): ValidationResult {
  const path = options.pathPrefix ? `${options.pathPrefix}.${fieldName}` : fieldName

  if (!isDefined(value)) {
    return invalidResult([
      createError(path, `Required field '${fieldName}' is missing`, 'REQUIRED_FIELD_MISSING'),
    ])
  }

  return validResult()
}

/**
 * Validate multiple required fields on an object
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  obj: T,
  requiredFields: (keyof T)[],
  options: ValidationOptions = {}
): ValidationResult {
  const results: ValidationResult[] = []

  for (const field of requiredFields) {
    const result = validateRequired(obj[field], String(field), options)
    results.push(result)

    if (!result.valid && options.stopOnFirstError) {
      return result
    }
  }

  return mergeResults(...results)
}

/**
 * Validate that an array is non-empty (for required array fields)
 */
export function validateRequiredArray(
  value: unknown[] | undefined,
  fieldName: string,
  options: ValidationOptions = {}
): ValidationResult {
  const path = options.pathPrefix ? `${options.pathPrefix}.${fieldName}` : fieldName

  if (!value || !Array.isArray(value) || value.length === 0) {
    return invalidResult([
      createError(path, `Required array field '${fieldName}' is missing or empty`, 'REQUIRED_FIELD_MISSING'),
    ])
  }

  return validResult()
}

/**
 * Validate conditional required fields
 * If condition is true, the field is required
 */
export function validateConditionalRequired(
  value: unknown,
  fieldName: string,
  condition: boolean,
  options: ValidationOptions = {}
): ValidationResult {
  if (!condition) {
    return validResult()
  }

  return validateRequired(value, fieldName, options)
}

/**
 * Validate that at least one of the specified fields is present
 */
export function validateOneOfRequired<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  options: ValidationOptions = {}
): ValidationResult {
  const path = options.pathPrefix || ''
  const hasOne = fields.some(field => isDefined(obj[field]))

  if (!hasOne) {
    const fieldNames = fields.map(String).join(', ')
    return invalidResult([
      createError(
        path,
        `At least one of the following fields is required: ${fieldNames}`,
        'REQUIRED_FIELD_MISSING'
      ),
    ])
  }

  return validResult()
}

/**
 * Resource-specific required field definitions
 */
export const REQUIRED_FIELDS = {
  Patient: [] as const, // Patient has no required fields in FHIR R4

  Immunization: ['status', 'vaccineCode', 'patient'] as const,

  ImmunizationRecommendation: ['patient', 'date', 'recommendation'] as const,

  ImmunizationEvaluation: [
    'status',
    'patient',
    'targetDisease',
    'immunizationEvent',
    'doseStatus',
  ] as const,

  Encounter: ['status', 'class'] as const,

  Observation: ['status', 'code'] as const,

  Condition: ['subject'] as const,

  MedicationRequest: ['status', 'intent', 'medication', 'subject'] as const,

  AllergyIntolerance: ['patient'] as const,

  Procedure: ['status', 'subject'] as const,

  DiagnosticReport: ['status', 'code'] as const,
} as const

export type ResourceWithRequiredFields = keyof typeof REQUIRED_FIELDS

/**
 * Validate required fields for a specific resource type
 */
export function validateResourceRequired<T extends Record<string, unknown>>(
  resource: T & { resourceType: ResourceWithRequiredFields },
  options: ValidationOptions = {}
): ValidationResult {
  const requiredFields = REQUIRED_FIELDS[resource.resourceType]
  if (!requiredFields) {
    return validResult()
  }

  return validateRequiredFields(resource, requiredFields as unknown as (keyof T)[], options)
}
