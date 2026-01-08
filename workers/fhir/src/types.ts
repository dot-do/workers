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
  interpretation?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  specimen?: {
    reference: string
    display?: string
  }
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
 * FHIR R4 DiagnosticReport Resource
 * @see http://hl7.org/fhir/R4/diagnosticreport.html
 */
export interface DiagnosticReport {
  resourceType: 'DiagnosticReport'
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
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown'
  category?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
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
    display?: string
  }
  effectiveDateTime?: string
  effectivePeriod?: {
    start?: string
    end?: string
  }
  issued?: string
  performer?: Array<{
    reference: string
    display?: string
  }>
  result?: Array<{
    reference: string
    display?: string
  }>
  conclusion?: string
  conclusionCode?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  presentedForm?: Array<{
    contentType: string
    data?: string
    url?: string
    title?: string
  }>
}


/**
 * FHIR R4 AllergyIntolerance Resource
 * @see http://hl7.org/fhir/R4/allergyintolerance.html
 */
export interface AllergyIntolerance {
  resourceType: 'AllergyIntolerance'
  id: string
  meta: {
    versionId: string
    lastUpdated: string
  }
  clinicalStatus?: {
    coding: Array<{
      system: string
      code: 'active' | 'inactive' | 'resolved'
      display?: string
    }>
    text?: string
  }
  verificationStatus?: {
    coding: Array<{
      system: string
      code: 'unconfirmed' | 'confirmed' | 'refuted' | 'entered-in-error'
      display?: string
    }>
    text?: string
  }
  type?: 'allergy' | 'intolerance'
  category?: Array<'food' | 'medication' | 'environment' | 'biologic'>
  criticality?: 'low' | 'high' | 'unable-to-assess'
  code?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  patient: {
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
  recordedDate?: string
  recorder?: {
    reference: string
    display?: string
  }
  asserter?: {
    reference: string
    display?: string
  }
  lastOccurrence?: string
  note?: Array<{
    authorString?: string
    time?: string
    text: string
  }>
  reaction?: Array<{
    substance?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    manifestation: Array<{
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }>
    description?: string
    onset?: string
    severity?: 'mild' | 'moderate' | 'severe'
    exposureRoute?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    note?: Array<{
      text: string
    }>
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

/**
 * FHIR R4 Procedure Resource
 * @see http://hl7.org/fhir/R4/procedure.html
 */
export interface Procedure {
  resourceType: 'Procedure'
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
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown'
  code?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  subject: {
    reference: string
    display?: string
  }
  encounter?: {
    reference: string
    display?: string
  }
  performedDateTime?: string
  performedPeriod?: {
    start?: string
    end?: string
  }
  performedString?: string
  performer?: Array<{
    function?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    actor: {
      reference: string
      display?: string
    }
  }>
  location?: {
    reference: string
    display?: string
  }
  reasonCode?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  bodySite?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  outcome?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  note?: Array<{
    authorString?: string
    time?: string
    text: string
  }>
}

/**
 * FHIR R4 MedicationRequest Resource
 * @see http://hl7.org/fhir/R4/medicationrequest.html
 */
export interface MedicationRequest {
  resourceType: 'MedicationRequest'
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
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown'
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option'
  priority?: 'routine' | 'urgent' | 'asap' | 'stat'
  medicationCodeableConcept?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  medicationReference?: {
    reference: string
    display?: string
  }
  subject: {
    reference: string
    display?: string
  }
  encounter?: {
    reference: string
    display?: string
  }
  authoredOn?: string
  requester?: {
    reference: string
    display?: string
  }
  reasonCode?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  reasonReference?: Array<{
    reference: string
    display?: string
  }>
  note?: Array<{
    authorString?: string
    time?: string
    text: string
  }>
  dosageInstruction?: Array<{
    sequence?: number
    text?: string
    timing?: {
      repeat?: {
        frequency?: number
        period?: number
        periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a'
        boundsDuration?: {
          value: number
          unit: string
          system: string
          code: string
        }
      }
      code?: {
        coding: Array<{
          system: string
          code: string
          display?: string
        }>
        text?: string
      }
    }
    route?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    method?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    doseAndRate?: Array<{
      type?: {
        coding: Array<{
          system: string
          code: string
          display?: string
        }>
      }
      doseQuantity?: {
        value: number
        unit: string
        system: string
        code: string
      }
      rateQuantity?: {
        value: number
        unit: string
        system: string
        code: string
      }
    }>
  }>
  dispenseRequest?: {
    initialFill?: {
      quantity?: {
        value: number
        unit: string
        system: string
        code: string
      }
      duration?: {
        value: number
        unit: string
        system: string
        code: string
      }
    }
    dispenseInterval?: {
      value: number
      unit: string
      system: string
      code: string
    }
    validityPeriod?: {
      start?: string
      end?: string
    }
    numberOfRepeatsAllowed?: number
    quantity?: {
      value: number
      unit: string
      system: string
      code: string
    }
    expectedSupplyDuration?: {
      value: number
      unit: string
      system: string
      code: string
    }
    performer?: {
      reference: string
      display?: string
    }
  }
  substitution?: {
    allowedBoolean?: boolean
    allowedCodeableConcept?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    reason?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
  }
  priorPrescription?: {
    reference: string
    display?: string
  }
}

/**
 * FHIR R4 Immunization Resource
 * @see http://hl7.org/fhir/R4/immunization.html
 */
export interface Immunization {
  resourceType: 'Immunization'
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
  status: 'completed' | 'entered-in-error' | 'not-done'
  statusReason?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  vaccineCode: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  patient: {
    reference: string
    display?: string
  }
  encounter?: {
    reference: string
    display?: string
  }
  occurrenceDateTime?: string
  occurrenceString?: string
  recorded?: string
  primarySource?: boolean
  reportOrigin?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  location?: {
    reference: string
    display?: string
  }
  manufacturer?: {
    reference: string
    display?: string
  }
  lotNumber?: string
  expirationDate?: string
  site?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  route?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  doseQuantity?: {
    value: number
    unit: string
    system: string
    code: string
  }
  performer?: Array<{
    function?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }
    actor: {
      reference: string
      display?: string
    }
  }>
  note?: Array<{
    authorString?: string
    time?: string
    text: string
  }>
  reasonCode?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  isSubpotent?: boolean
  subpotentReason?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  education?: Array<{
    documentType?: string
    reference?: string
    publicationDate?: string
    presentationDate?: string
  }>
  programEligibility?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }>
  fundingSource?: {
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
    text?: string
  }
  reaction?: Array<{
    date?: string
    detail?: {
      reference: string
      display?: string
    }
    reported?: boolean
  }>
  protocolApplied?: Array<{
    series?: string
    authority?: {
      reference: string
      display?: string
    }
    targetDisease?: Array<{
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
      text?: string
    }>
    doseNumberPositiveInt?: number
    doseNumberString?: string
    seriesDosesPositiveInt?: number
    seriesDosesString?: string
  }>
}

/**
 * FHIR R4 DocumentReference Resource
 * @see http://hl7.org/fhir/R4/documentreference.html
 */
export interface DocumentReference {
  resourceType: 'DocumentReference'
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
  status: 'current' | 'superseded' | 'entered-in-error'
  docStatus?: 'preliminary' | 'final' | 'amended' | 'entered-in-error'
  type?: {
    coding: Array<{
      system: string
      code: string
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
  subject?: {
    reference: string
    display?: string
  }
  date?: string
  author?: Array<{
    reference: string
    display?: string
  }>
  authenticator?: {
    reference: string
    display?: string
  }
  custodian?: {
    reference: string
    display?: string
  }
  description?: string
  securityLabel?: Array<{
    coding: Array<{
      system: string
      code: string
      display?: string
    }>
  }>
  content: Array<{
    attachment: {
      contentType: string
      language?: string
      data?: string
      url?: string
      size?: number
      hash?: string
      title?: string
      creation?: string
    }
    format?: {
      system: string
      code: string
      display?: string
    }
  }>
  context?: {
    encounter?: Array<{
      reference: string
    }>
    event?: Array<{
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }>
    period?: {
      start?: string
      end?: string
    }
    facilityType?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }
    practiceSetting?: {
      coding: Array<{
        system: string
        code: string
        display?: string
      }>
    }
    sourcePatientInfo?: {
      reference: string
    }
    related?: Array<{
      reference: string
    }>
  }
}
