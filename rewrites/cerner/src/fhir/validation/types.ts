/**
 * FHIR Validation Types
 *
 * Common types used across validation utilities.
 */

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * A single validation error
 */
export interface ValidationError {
  path: string
  message: string
  code: ValidationErrorCode
  severity: 'error' | 'warning' | 'info'
}

/**
 * Error codes for validation failures
 */
export type ValidationErrorCode =
  | 'REQUIRED_FIELD_MISSING'
  | 'INVALID_VALUE_SET'
  | 'INVALID_REFERENCE_FORMAT'
  | 'INVALID_DATE_FORMAT'
  | 'INVALID_DATETIME_FORMAT'
  | 'INVALID_TERMINOLOGY_CODE'
  | 'INVALID_LOINC_CODE'
  | 'INVALID_RXNORM_CODE'
  | 'INVALID_CVX_CODE'
  | 'INVALID_SNOMED_CODE'
  | 'INVALID_ICD10_CODE'
  | 'CONSTRAINT_VIOLATION'

/**
 * Options for validation behavior
 */
export interface ValidationOptions {
  /** Whether to stop on first error */
  stopOnFirstError?: boolean
  /** Path prefix for nested validation */
  pathPrefix?: string
  /** Whether to include warnings */
  includeWarnings?: boolean
}

/**
 * Helper to create a successful validation result
 */
export function validResult(): ValidationResult {
  return { valid: true, errors: [] }
}

/**
 * Helper to create a failed validation result
 */
export function invalidResult(errors: ValidationError[]): ValidationResult {
  return { valid: false, errors }
}

/**
 * Helper to create a single error
 */
export function createError(
  path: string,
  message: string,
  code: ValidationErrorCode,
  severity: 'error' | 'warning' | 'info' = 'error'
): ValidationError {
  return { path, message, code, severity }
}

/**
 * Merge multiple validation results
 */
export function mergeResults(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap(r => r.errors)
  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  }
}
