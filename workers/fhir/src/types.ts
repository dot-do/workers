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

/**
 * FHIR R4 Encounter Resource
 * @see http://hl7.org/fhir/R4/encounter.html
 */
export interface Encounter {
  resourceType: 'Encounter'
  id: string
  meta: {
    versionId: string
    lastUpdated: string
  }
  identifier?: Array<{
    use?: string
    system?: string
    value: string
  }>
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown'
  class: {
    system?: string
    code: string
    display?: string
  }
  type?: Array<{
    coding?: Array<{
      system?: string
      code: string
      display?: string
    }>
    text?: string
  }>
  subject?: {
    reference: string
    display?: string
  }
  participant?: Array<{
    type?: Array<{
      coding?: Array<{
        system?: string
        code: string
        display?: string
      }>
    }>
    individual?: {
      reference: string
      display?: string
    }
  }>
  period?: {
    start?: string
    end?: string
  }
  reasonCode?: Array<{
    coding?: Array<{
      system?: string
      code: string
      display?: string
    }>
    text?: string
  }>
  hospitalization?: {
    admitSource?: {
      coding?: Array<{
        system?: string
        code: string
        display?: string
      }>
    }
    dischargeDisposition?: {
      coding?: Array<{
        system?: string
        code: string
        display?: string
      }>
    }
  }
  location?: Array<{
    location: {
      reference: string
      display?: string
    }
    status?: 'planned' | 'active' | 'reserved' | 'completed'
  }>
}

/**
 * FHIR R4 Observation Resource
 * @see http://hl7.org/fhir/R4/observation.html
 * @see http://hl7.org/fhir/R4/observation-vitalsigns.html
 */
export interface Observation {
  resourceType: 'Observation'
  id: string
  meta?: {
    versionId: string
    lastUpdated: string
  }
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown'
  category?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
  }>
  code: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  subject?: {
    reference: string
    display?: string
  }
  encounter?: {
    reference: string
  }
  effectiveDateTime?: string
  effectivePeriod?: {
    start?: string
    end?: string
  }
  issued?: string
  valueQuantity?: {
    value: number
    unit: string
    system: string
    code: string
  }
  valueCodeableConcept?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  valueString?: string
  valueBoolean?: boolean
  valueInteger?: number
  valueRange?: {
    low?: {
      value: number
      unit: string
      system: string
      code: string
    }
    high?: {
      value: number
      unit: string
      system: string
      code: string
    }
  }
  component?: Array<{
    code: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    valueQuantity?: {
      value: number
      unit: string
      system: string
      code: string
    }
  }>
  referenceRange?: Array<{
    low?: {
      value: number
      unit: string
      system: string
      code: string
    }
    high?: {
      value: number
      unit: string
      system: string
      code: string
    }
    type?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    text?: string
  }>
}

/**
 * FHIR R4 Condition Resource
 * @see http://hl7.org/fhir/R4/condition.html
 */
export interface Condition {
  resourceType: 'Condition'
  id: string
  meta: {
    versionId: string
    lastUpdated: string
  }
  clinicalStatus?: {
    coding: Array<{
      system: string
      code: 'active' | 'recurrence' | 'relapse' | 'inactive' | 'remission' | 'resolved'
      display?: string
    }>
    text?: string
  }
  verificationStatus?: {
    coding: Array<{
      system: string
      code: 'unconfirmed' | 'provisional' | 'differential' | 'confirmed' | 'refuted' | 'entered-in-error'
      display?: string
    }>
    text?: string
  }
  category?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  severity?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  code?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  bodySite?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  subject: {
    reference: string
    display?: string
  }
  encounter?: {
    reference: string
    display?: string
  }
  onsetDateTime?: string
  onsetAge?: {
    value: number
    unit: string
    system: string
    code: string
  }
  onsetPeriod?: {
    start?: string
    end?: string
  }
  onsetRange?: {
    low?: { value: number; unit: string }
    high?: { value: number; unit: string }
  }
  onsetString?: string
  abatementDateTime?: string
  abatementAge?: {
    value: number
    unit: string
    system: string
    code: string
  }
  abatementPeriod?: {
    start?: string
    end?: string
  }
  abatementRange?: {
    low?: { value: number; unit: string }
    high?: { value: number; unit: string }
  }
  abatementString?: string
  recordedDate?: string
  recorder?: {
    reference: string
    display?: string
  }
  asserter?: {
    reference: string
    display?: string
  }
  stage?: Array<{
    summary?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }
    assessment?: Array<{
      reference: string
    }>
    type?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }
  }>
  evidence?: Array<{
    code?: Array<{
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }>
    detail?: Array<{
      reference: string
    }>
  }>
  note?: Array<{
    authorString?: string
    time?: string
    text: string
  }>
}

/**
 * FHIR R4 Bundle Resource
 * @see http://hl7.org/fhir/R4/bundle.html
 */
export interface Bundle<T = any> {
  resourceType: 'Bundle'
  type: 'searchset' | 'collection' | 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history'
  total?: number
  link?: Array<{
    relation: string
    url: string
  }>
  entry?: Array<{
    fullUrl?: string
    resource?: T
    search?: {
      mode?: 'match' | 'include'
      score?: number
    }
  }>
}
