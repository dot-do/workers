/**
 * GREEN Tests: FHIR R4 DocumentReference Operations
 *
 * Tests for workers-061: [GREEN] Implement DocumentReference operations
 *
 * Acceptance Criteria:
 * - Test DocumentReference with PDF attachments (base64 or URL)
 * - Test GET /fhir/r4/DocumentReference?patient={id}
 * - Test GET /fhir/r4/DocumentReference?category=clinical-note
 * - Test GET /fhir/r4/DocumentReference?type=18842-5 (discharge summary LOINC)
 * - Test status values (current, superseded, entered-in-error)
 * - Test content array with multiple attachments
 * - Test CRUD operations (create, read, update, delete)
 *
 * @see FHIR R4 DocumentReference: http://hl7.org/fhir/R4/documentreference.html
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFHIREnv } from './helpers.js'

/**
 * FHIR R4 DocumentReference Resource Type
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
  description?: string
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
    period?: {
      start?: string
      end?: string
    }
  }
}

/**
 * FHIR R4 OperationOutcome Resource Type
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
 * FHIR R4 Bundle Resource Type
 */
export interface Bundle {
  resourceType: 'Bundle'
  type: 'searchset' | 'collection' | 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history'
  total?: number
  link?: Array<{
    relation: string
    url: string
  }>
  entry?: Array<{
    fullUrl?: string
    resource: DocumentReference
    search?: {
      mode: 'match' | 'include' | 'outcome'
      score?: number
    }
  }>
}

/**
 * FHIR DO Contract for DocumentReference Operations
 */
export interface FHIRDO {
  // DocumentReference CRUD operations
  createDocumentReference(doc: Omit<DocumentReference, 'id' | 'meta'>): Promise<DocumentReference>
  readDocumentReference(id: string): Promise<DocumentReference | null>
  updateDocumentReference(id: string, doc: Partial<DocumentReference>): Promise<DocumentReference | null>
  deleteDocumentReference(id: string): Promise<boolean>

  // DocumentReference search operations
  searchDocumentReferences(params: {
    patient?: string
    category?: string
    type?: string
    status?: string
    date?: string
  }): Promise<DocumentReference[]>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Attempt to load FHIRDO
 */
async function loadFHIRDO(): Promise<new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO> {
  const module = await import('../src/fhir.js')
  return module.FHIRDO
}

describe('FHIR R4 DocumentReference Operations', () => {
  let ctx: MockDOState
  let env: MockFHIREnv
  let FHIRDO: new (ctx: MockDOState, env: MockFHIREnv) => FHIRDO

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FHIRDO = await loadFHIRDO()
  })

  describe('createDocumentReference() - Create DocumentReference', () => {
    it('should create a new DocumentReference with PDF attachment (base64)', async () => {
      const instance = new FHIRDO(ctx, env)

      const docData: Omit<DocumentReference, 'id' | 'meta'> = {
        resourceType: 'DocumentReference',
        status: 'current',
        type: {
          coding: [{
            system: 'http://loinc.org',
            code: '34133-9',
            display: 'Summarization of episode note'
          }]
        },
        category: [{
          coding: [{
            system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category',
            code: 'clinical-note',
            display: 'Clinical Note'
          }]
        }],
        subject: {
          reference: 'Patient/12345'
        },
        date: '2024-01-15T10:00:00Z',
        content: [{
          attachment: {
            contentType: 'application/pdf',
            data: 'JVBERi0xLjMKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwg',
            title: 'Clinical Summary',
            creation: '2024-01-15T10:00:00Z'
          }
        }]
      }

      const result = await instance.createDocumentReference(docData)

      expect(result).toBeDefined()
      expect(result.resourceType).toBe('DocumentReference')
      expect(result.id).toBeDefined()
      expect(result.meta).toBeDefined()
      expect(result.meta.versionId).toBe('1')
      expect(result.meta.lastUpdated).toBeDefined()
      expect(result.status).toBe('current')
      expect(result.content).toBeDefined()
      expect(result.content.length).toBe(1)
      expect(result.content[0].attachment.contentType).toBe('application/pdf')
    })

    it('should create DocumentReference with attachment URL instead of data', async () => {
      const instance = new FHIRDO(ctx, env)

      const docData: Omit<DocumentReference, 'id' | 'meta'> = {
        resourceType: 'DocumentReference',
        status: 'current',
        content: [{
          attachment: {
            contentType: 'application/pdf',
            url: 'https://example.com/documents/summary.pdf',
            title: 'Patient Summary',
            size: 245678
          }
        }]
      }

      const result = await instance.createDocumentReference(docData)

      expect(result.content[0].attachment.url).toBe('https://example.com/documents/summary.pdf')
      expect(result.content[0].attachment.size).toBe(245678)
    })

    it('should create DocumentReference with discharge summary type (LOINC 18842-5)', async () => {
      const instance = new FHIRDO(ctx, env)

      const docData: Omit<DocumentReference, 'id' | 'meta'> = {
        resourceType: 'DocumentReference',
        status: 'current',
        type: {
          coding: [{
            system: 'http://loinc.org',
            code: '18842-5',
            display: 'Discharge summary'
          }]
        },
        subject: {
          reference: 'Patient/12345'
        },
        content: [{
          attachment: {
            contentType: 'application/pdf',
            url: 'https://example.com/discharge-summary.pdf'
          }
        }]
      }

      const result = await instance.createDocumentReference(docData)

      expect(result.type?.coding[0].code).toBe('18842-5')
      expect(result.type?.coding[0].display).toBe('Discharge summary')
    })

    it('should create DocumentReference with clinical-note category', async () => {
      const instance = new FHIRDO(ctx, env)

      const docData: Omit<DocumentReference, 'id' | 'meta'> = {
        resourceType: 'DocumentReference',
        status: 'current',
        category: [{
          coding: [{
            system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category',
            code: 'clinical-note'
          }]
        }],
        content: [{
          attachment: {
            contentType: 'text/plain',
            data: 'Q2xpbmljYWwgbm90ZSBjb250ZW50'
          }
        }]
      }

      const result = await instance.createDocumentReference(docData)

      expect(result.category![0].coding[0].code).toBe('clinical-note')
    })

    it('should create DocumentReference with multiple attachments', async () => {
      const instance = new FHIRDO(ctx, env)

      const docData: Omit<DocumentReference, 'id' | 'meta'> = {
        resourceType: 'DocumentReference',
        status: 'current',
        subject: {
          reference: 'Patient/12345'
        },
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              url: 'https://example.com/report.pdf',
              title: 'Lab Report'
            }
          },
          {
            attachment: {
              contentType: 'image/jpeg',
              url: 'https://example.com/xray.jpg',
              title: 'X-Ray Image'
            }
          },
          {
            attachment: {
              contentType: 'text/xml',
              data: 'PENsaW5pY2FsRG9jdW1lbnQ+PC9DbGluaWNhbERvY3VtZW50Pg==',
              title: 'C-CDA Document'
            },
            format: {
              system: 'http://ihe.net/fhir/ValueSet/IHE.FormatCode.codesystem',
              code: 'urn:ihe:iti:xds:2017:mimeTypeSufficient',
              display: 'C-CDA'
            }
          }
        ]
      }

      const result = await instance.createDocumentReference(docData)

      expect(result.content.length).toBe(3)
      expect(result.content[0].attachment.contentType).toBe('application/pdf')
      expect(result.content[1].attachment.contentType).toBe('image/jpeg')
      expect(result.content[2].attachment.contentType).toBe('text/xml')
      expect(result.content[2].format?.code).toBe('urn:ihe:iti:xds:2017:mimeTypeSufficient')
    })

    it('should create DocumentReference with status current', async () => {
      const instance = new FHIRDO(ctx, env)

      const docData: Omit<DocumentReference, 'id' | 'meta'> = {
        resourceType: 'DocumentReference',
        status: 'current',
        content: [{
          attachment: {
            contentType: 'application/pdf',
            url: 'https://example.com/doc.pdf'
          }
        }]
      }

      const result = await instance.createDocumentReference(docData)
      expect(result.status).toBe('current')
    })

    it('should create DocumentReference with encounter context', async () => {
      const instance = new FHIRDO(ctx, env)

      const docData: Omit<DocumentReference, 'id' | 'meta'> = {
        resourceType: 'DocumentReference',
        status: 'current',
        subject: {
          reference: 'Patient/12345'
        },
        content: [{
          attachment: {
            contentType: 'application/pdf',
            url: 'https://example.com/visit-summary.pdf'
          }
        }],
        context: {
          encounter: [{
            reference: 'Encounter/visit-123'
          }],
          period: {
            start: '2024-01-15T09:00:00Z',
            end: '2024-01-15T10:30:00Z'
          }
        }
      }

      const result = await instance.createDocumentReference(docData)

      expect(result.context?.encounter).toBeDefined()
      expect(result.context?.encounter![0].reference).toBe('Encounter/visit-123')
      expect(result.context?.period?.start).toBe('2024-01-15T09:00:00Z')
    })
  })

  describe('readDocumentReference() - Read DocumentReference', () => {
    it('should return null for non-existent document', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.readDocumentReference('nonexistent')
      expect(result).toBeNull()
    })

    it('should return DocumentReference resource with required fields', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-12345',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'current',
        content: [{
          attachment: {
            contentType: 'application/pdf',
            url: 'https://example.com/doc.pdf'
          }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-12345', doc)

      const result = await instance.readDocumentReference('doc-12345')
      expect(result).not.toBeNull()
      expect(result!.resourceType).toBe('DocumentReference')
      expect(result!.id).toBe('doc-12345')
      expect(result!.status).toBe('current')
    })
  })

  describe('updateDocumentReference() - Update DocumentReference', () => {
    it('should update DocumentReference status from current to superseded', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-update-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'current',
        content: [{
          attachment: {
            contentType: 'application/pdf',
            url: 'https://example.com/doc.pdf'
          }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-update-1', doc)

      const updated = await instance.updateDocumentReference('doc-update-1', {
        status: 'superseded',
        description: 'Replaced by newer version'
      })

      expect(updated).not.toBeNull()
      expect(updated!.status).toBe('superseded')
      expect(updated!.description).toBe('Replaced by newer version')
      expect(updated!.meta.versionId).toBe('2')
    })

    it('should return null for non-existent document', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.updateDocumentReference('nonexistent', {
        status: 'superseded'
      })
      expect(result).toBeNull()
    })
  })

  describe('deleteDocumentReference() - Delete DocumentReference', () => {
    it('should delete existing document', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-delete-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'current',
        content: [{
          attachment: {
            contentType: 'application/pdf',
            url: 'https://example.com/doc.pdf'
          }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-delete-1', doc)

      const result = await instance.deleteDocumentReference('doc-delete-1')
      expect(result).toBe(true)

      const checkDeleted = await instance.readDocumentReference('doc-delete-1')
      expect(checkDeleted).toBeNull()
    })

    it('should return false for non-existent document', async () => {
      const instance = new FHIRDO(ctx, env)
      const result = await instance.deleteDocumentReference('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('searchDocumentReferences() - Search DocumentReferences', () => {
    it('should search by patient', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc1: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-search-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        subject: { reference: 'Patient/patient-1' },
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/doc1.pdf' }
        }]
      }

      const doc2: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-search-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        subject: { reference: 'Patient/patient-2' },
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/doc2.pdf' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-search-1', doc1)
      await ctx.storage.put('DocumentReference:doc-search-2', doc2)

      const results = await instance.searchDocumentReferences({ patient: 'patient-1' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].subject?.reference).toBe('Patient/patient-1')
    })

    it('should search by category (clinical-note)', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc1: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-category-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        category: [{
          coding: [{
            system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category',
            code: 'clinical-note'
          }]
        }],
        content: [{
          attachment: { contentType: 'text/plain', data: 'Q2xpbmljYWwgbm90ZQ==' }
        }]
      }

      const doc2: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-category-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        category: [{
          coding: [{
            system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category',
            code: 'imaging'
          }]
        }],
        content: [{
          attachment: { contentType: 'image/jpeg', url: 'https://example.com/xray.jpg' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-category-1', doc1)
      await ctx.storage.put('DocumentReference:doc-category-2', doc2)

      const results = await instance.searchDocumentReferences({ category: 'clinical-note' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].category![0].coding[0].code).toBe('clinical-note')
    })

    it('should search by type (discharge summary 18842-5)', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc1: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-type-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        type: {
          coding: [{ system: 'http://loinc.org', code: '18842-5', display: 'Discharge summary' }]
        },
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/discharge.pdf' }
        }]
      }

      const doc2: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-type-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        type: {
          coding: [{ system: 'http://loinc.org', code: '34133-9', display: 'Summarization of episode note' }]
        },
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/summary.pdf' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-type-1', doc1)
      await ctx.storage.put('DocumentReference:doc-type-2', doc2)

      const results = await instance.searchDocumentReferences({ type: '18842-5' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].type?.coding[0].code).toBe('18842-5')
    })

    it('should search by status', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc1: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-status-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/current.pdf' }
        }]
      }

      const doc2: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-status-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'superseded',
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/old.pdf' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-status-1', doc1)
      await ctx.storage.put('DocumentReference:doc-status-2', doc2)

      const results = await instance.searchDocumentReferences({ status: 'current' })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].status).toBe('current')
    })

    it('should search by patient and category combined', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc1: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-combined-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        subject: { reference: 'Patient/patient-1' },
        category: [{
          coding: [{ system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category', code: 'clinical-note' }]
        }],
        content: [{
          attachment: { contentType: 'text/plain', data: 'Q2xpbmljYWwgbm90ZQ==' }
        }]
      }

      const doc2: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-combined-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        subject: { reference: 'Patient/patient-1' },
        category: [{
          coding: [{ system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category', code: 'imaging' }]
        }],
        content: [{
          attachment: { contentType: 'image/jpeg', url: 'https://example.com/xray.jpg' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-combined-1', doc1)
      await ctx.storage.put('DocumentReference:doc-combined-2', doc2)

      const results = await instance.searchDocumentReferences({
        patient: 'patient-1',
        category: 'clinical-note'
      })

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('doc-combined-1')
    })
  })

  describe('GET /fhir/r4/DocumentReference/{id} - HTTP endpoint', () => {
    it('should return 200 with valid DocumentReference resource', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-http-1',
        meta: {
          versionId: '1',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        },
        status: 'current',
        content: [{
          attachment: {
            contentType: 'application/pdf',
            url: 'https://example.com/doc.pdf'
          }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-http-1', doc)

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference/doc-http-1', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as DocumentReference
      expect(data.resourceType).toBe('DocumentReference')
      expect(data.id).toBe('doc-http-1')
    })

    it('should return 404 with OperationOutcome for non-existent document', async () => {
      const instance = new FHIRDO(ctx, env)

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference/nonexistent', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)

      const outcome = await response.json() as OperationOutcome
      expect(outcome.resourceType).toBe('OperationOutcome')
      expect(outcome.issue[0].code).toBe('not-found')
    })

    it('should return Content-Type: application/fhir+json', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-content-type',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/doc.pdf' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-content-type', doc)

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference/doc-content-type', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toMatch(/application\/fhir\+json/)
    })
  })

  describe('GET /fhir/r4/DocumentReference - Search endpoint', () => {
    it('should search by patient parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-search-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        subject: { reference: 'Patient/test-patient' },
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/doc.pdf' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-search-http-1', doc)

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference?patient=test-patient', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
      expect(bundle.entry).toBeDefined()
      expect(bundle.entry!.length).toBeGreaterThan(0)
    })

    it('should search by category parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-search-http-2',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        category: [{
          coding: [{ system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category', code: 'clinical-note' }]
        }],
        content: [{
          attachment: { contentType: 'text/plain', data: 'Q2xpbmljYWwgbm90ZQ==' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-search-http-2', doc)

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference?category=clinical-note', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })

    it('should search by type parameter', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-search-http-3',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        type: {
          coding: [{ system: 'http://loinc.org', code: '18842-5' }]
        },
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/discharge.pdf' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-search-http-3', doc)

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference?type=18842-5', {
        method: 'GET'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const bundle = await response.json() as Bundle
      expect(bundle.resourceType).toBe('Bundle')
      expect(bundle.type).toBe('searchset')
    })
  })

  describe('POST /fhir/r4/DocumentReference - Create endpoint', () => {
    it('should create new DocumentReference via POST', async () => {
      const instance = new FHIRDO(ctx, env)

      const docData: Omit<DocumentReference, 'id' | 'meta'> = {
        resourceType: 'DocumentReference',
        status: 'current',
        content: [{
          attachment: {
            contentType: 'application/pdf',
            url: 'https://example.com/doc.pdf'
          }
        }]
      }

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(docData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const created = await response.json() as DocumentReference
      expect(created.id).toBeDefined()
      expect(created.meta.versionId).toBe('1')
    })

    it('should return 400 when missing required content field', async () => {
      const instance = new FHIRDO(ctx, env)

      const docData = {
        resourceType: 'DocumentReference',
        status: 'current'
      }

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(docData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 when missing required status field', async () => {
      const instance = new FHIRDO(ctx, env)

      const docData = {
        resourceType: 'DocumentReference',
        content: [{
          attachment: {
            contentType: 'application/pdf',
            url: 'https://example.com/doc.pdf'
          }
        }]
      }

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(docData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })
  })

  describe('PUT /fhir/r4/DocumentReference/{id} - Update endpoint', () => {
    it('should update existing DocumentReference via PUT', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-put-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/doc.pdf' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-put-1', doc)

      const updateData: Partial<DocumentReference> = {
        status: 'superseded',
        description: 'Replaced by new version'
      }

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference/doc-put-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/fhir+json' },
        body: JSON.stringify(updateData)
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const updated = await response.json() as DocumentReference
      expect(updated.meta.versionId).toBe('2')
      expect(updated.status).toBe('superseded')
      expect(updated.description).toBe('Replaced by new version')
    })
  })

  describe('DELETE /fhir/r4/DocumentReference/{id} - Delete endpoint', () => {
    it('should delete DocumentReference via DELETE', async () => {
      const instance = new FHIRDO(ctx, env)

      const doc: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'doc-delete-http-1',
        meta: { versionId: '1', lastUpdated: '2024-01-15T10:30:00.000Z' },
        status: 'current',
        content: [{
          attachment: { contentType: 'application/pdf', url: 'https://example.com/doc.pdf' }
        }]
      }

      await ctx.storage.put('DocumentReference:doc-delete-http-1', doc)

      const request = new Request('http://fhir.do/fhir/r4/DocumentReference/doc-delete-http-1', {
        method: 'DELETE'
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(204)
    })
  })
})
