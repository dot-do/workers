/**
 * FHIR R4 Resource Types
 *
 * Based on FHIR R4 specification: http://hl7.org/fhir/R4/
 */

/**
 * FHIR R4 Patient Resource
 * @see http://hl7.org/fhir/R4/patient.html
 */
export interface Patient {
  resourceType: 'Patient'
  id: string
  meta: {
    versionId: string
    lastUpdated: string
  }
  identifier?: Array<{
    use?: string
    type?: {
      coding: Array<{
        system: string
        code: string
      }>
    }
    system: string
    value: string
  }>
  active?: boolean
  name?: Array<{
    use?: string
    family?: string
    given?: string[]
    prefix?: string[]
    suffix?: string[]
  }>
  telecom?: Array<{
    system: 'phone' | 'email' | 'fax' | 'pager' | 'url' | 'sms' | 'other'
    value: string
    use?: 'home' | 'work' | 'temp' | 'old' | 'mobile'
  }>
  gender?: 'male' | 'female' | 'other' | 'unknown'
  birthDate?: string
  address?: Array<{
    use?: 'home' | 'work' | 'temp' | 'old' | 'billing'
    type?: 'postal' | 'physical' | 'both'
    line?: string[]
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }>
  maritalStatus?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
  }
  communication?: Array<{
    language: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }
    preferred?: boolean
  }>
}

/**
 * FHIR R4 OperationOutcome Resource
 * @see http://hl7.org/fhir/R4/operationoutcome.html
 */
export interface OperationOutcome {
  resourceType: 'OperationOutcome'
  issue: Array<{
    severity: 'fatal' | 'error' | 'warning' | 'information'
    code: string
    diagnostics?: string
    details?: {
      text?: string
    }
  }>
}

/**
 * Helper to create a not-found OperationOutcome
 */
export function createNotFoundOutcome(resourceType: string, id: string): OperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    issue: [{
      severity: 'error',
      code: 'not-found',
      diagnostics: `${resourceType} resource with id '${id}' not found`
    }]
  }
}

/**
 * Helper to create a generic error OperationOutcome
 */
export function createErrorOutcome(message: string, code = 'processing'): OperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    issue: [{
      severity: 'error',
      code,
      diagnostics: message
    }]
  }
}
