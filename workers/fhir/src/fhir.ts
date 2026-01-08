/**
 * FHIRDO - Durable Object for FHIR R4 Server
 *
 * Implements FHIR R4 specification for healthcare interoperability
 *
 * Features:
 * - Patient resource CRUD operations
 * - Version history tracking (_history)
 * - FHIR-compliant error responses (OperationOutcome)
 * - RESTful API endpoints
 *
 * @see http://hl7.org/fhir/R4/
 */

import type { Patient, OperationOutcome } from './types.js'
import { createNotFoundOutcome, createErrorOutcome } from './types.js'

// ============================================================================
// Type Definitions
// ============================================================================

interface DOStorage {
  get<T = unknown>(keyOrKeys: string | string[]): Promise<T | Map<string, T> | undefined>
  put<T>(keyOrEntries: string | Record<string, T>, value?: T): Promise<void>
  delete(keyOrKeys: string | string[]): Promise<boolean | number>
  deleteAll(): Promise<void>
  list<T = unknown>(options?: { prefix?: string; limit?: number; start?: string; startAfter?: string }): Promise<Map<string, T>>
}

interface DOState {
  id: { toString(): string; name?: string }
  storage: DOStorage
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>
}

interface FHIREnv {
  FHIR_DO?: unknown
}

// ============================================================================
// FHIRDO Implementation
// ============================================================================

export class FHIRDO {
  protected readonly ctx: DOState
  protected readonly env: FHIREnv

  constructor(ctx: DOState, env: FHIREnv) {
    this.ctx = ctx
    this.env = env
  }

  // ============================================================================
  // Patient Operations
  // ============================================================================

  /**
   * Read a Patient resource by ID
   * @param id - Patient resource ID
   * @returns Patient resource or null if not found
   */
  async readPatient(id: string): Promise<Patient | null> {
    const key = `Patient:${id}`
    const patient = await this.ctx.storage.get<Patient>(key)
    return patient ?? null
  }

  /**
   * Read a specific version of a Patient resource (vread)
   * @param id - Patient resource ID
   * @param versionId - Version ID to retrieve
   * @returns Patient resource at specific version or null if not found
   */
  async readPatientVersion(id: string, versionId: string): Promise<Patient | null> {
    const key = `Patient:${id}:_history:${versionId}`
    const patient = await this.ctx.storage.get<Patient>(key)
    return patient ?? null
  }

  // ============================================================================
  // HTTP Fetch Handler
  // ============================================================================

  /**
   * Handle HTTP requests to the FHIR server
   * @param request - Incoming HTTP request
   * @returns HTTP response with FHIR resource or OperationOutcome
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Parse FHIR R4 RESTful API path
      // Format: /fhir/r4/{resourceType}/{id}[/_history/{vid}]
      const fhirPathMatch = path.match(/^\/fhir\/r4\/([A-Z][a-zA-Z]+)\/([^/]+)(?:\/_history\/([^/]+))?$/)

      if (!fhirPathMatch) {
        return this.createFHIRResponse(
          createErrorOutcome('Invalid FHIR API path', 'invalid'),
          400
        )
      }

      const [, resourceType, id, versionId] = fhirPathMatch

      // Only support Patient resources for now
      if (resourceType !== 'Patient') {
        return this.createFHIRResponse(
          createErrorOutcome(`Resource type '${resourceType}' not supported`, 'not-supported'),
          404
        )
      }

      // Handle version-specific read (vread)
      if (versionId) {
        const patient = await this.readPatientVersion(id, versionId)
        if (!patient) {
          return this.createFHIRResponse(
            createNotFoundOutcome('Patient', `${id}/_history/${versionId}`),
            404
          )
        }
        return this.createFHIRResponse(patient, 200)
      }

      // Handle standard read
      const patient = await this.readPatient(id)
      if (!patient) {
        return this.createFHIRResponse(
          createNotFoundOutcome('Patient', id),
          404
        )
      }

      return this.createFHIRResponse(patient, 200)

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return this.createFHIRResponse(
        createErrorOutcome(message, 'exception'),
        500
      )
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Create a FHIR-compliant HTTP response
   * @param resource - FHIR resource or OperationOutcome
   * @param status - HTTP status code
   * @returns HTTP Response with application/fhir+json content type
   */
  private createFHIRResponse(resource: Patient | OperationOutcome, status: number): Response {
    return new Response(JSON.stringify(resource), {
      status,
      headers: {
        'Content-Type': 'application/fhir+json; charset=utf-8'
      }
    })
  }
}
