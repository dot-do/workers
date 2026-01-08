/**
 * FHIR Resource Base Class for Cerner.do
 *
 * Provides common patterns for all FHIR resource handlers:
 * - Meta handling (versionId, lastUpdated)
 * - Resource ID generation
 * - Content-Type handling
 * - OperationOutcome generation for errors
 * - Base search parameter parsing
 * - Read endpoint pattern
 */

import type { Context } from 'hono'
import type {
  Meta,
  Resource,
  CodeableConcept,
  Coding,
  Bundle,
  BundleEntry,
  BundleSearchMode,
  OperationOutcome,
  OperationOutcomeIssue,
  IssueSeverity,
  IssueType,
} from './types'

// Re-export types for convenience
export type { OperationOutcome, OperationOutcomeIssue, IssueSeverity, IssueType }

// =============================================================================
// Base Search Parameters
// =============================================================================

export interface BaseSearchParams {
  _id?: string
  _lastUpdated?: string
  _count?: number
  _offset?: number
  _sort?: string
  _include?: string | string[]
  _revinclude?: string | string[]
  _summary?: 'true' | 'text' | 'data' | 'count' | 'false'
  _elements?: string
  _total?: 'none' | 'estimate' | 'accurate'
}

// =============================================================================
// Resource Base Class
// =============================================================================

export abstract class FHIRResourceBase<
  TResource extends Resource,
  TSearchParams extends BaseSearchParams = BaseSearchParams,
> {
  /** The FHIR resource type (e.g., 'Patient', 'Observation') */
  abstract readonly resourceType: TResource['resourceType']

  /** The base URL for this resource (e.g., 'https://fhir.cerner.do/r4') */
  protected baseUrl: string

  constructor(baseUrl = 'https://fhir.cerner.do/r4') {
    this.baseUrl = baseUrl
  }

  // ---------------------------------------------------------------------------
  // ID Generation
  // ---------------------------------------------------------------------------

  /**
   * Generate a new resource ID
   * Uses crypto.randomUUID() by default, can be overridden for custom ID patterns
   */
  generateId(): string {
    return crypto.randomUUID()
  }

  // ---------------------------------------------------------------------------
  // Meta Handling
  // ---------------------------------------------------------------------------

  /**
   * Create initial meta for a new resource
   */
  createMeta(versionId = '1'): Meta {
    return {
      versionId,
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Update meta for an existing resource (increments version, updates timestamp)
   */
  updateMeta(existingMeta?: Meta): Meta {
    const currentVersion = parseInt(existingMeta?.versionId ?? '0', 10)
    return {
      ...existingMeta,
      versionId: String(currentVersion + 1),
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Validate and merge meta from request with server-generated values
   */
  normalizeMeta(requestMeta?: Meta, existingMeta?: Meta): Meta {
    const baseMeta = existingMeta ? this.updateMeta(existingMeta) : this.createMeta()

    return {
      ...baseMeta,
      // Allow client to specify profile, security, tag
      profile: requestMeta?.profile ?? existingMeta?.profile,
      security: requestMeta?.security ?? existingMeta?.security,
      tag: requestMeta?.tag ?? existingMeta?.tag,
      // Server always controls these
      versionId: baseMeta.versionId,
      lastUpdated: baseMeta.lastUpdated,
    }
  }

  // ---------------------------------------------------------------------------
  // Content-Type Handling
  // ---------------------------------------------------------------------------

  /** Standard FHIR JSON content type */
  static readonly CONTENT_TYPE_FHIR_JSON = 'application/fhir+json; charset=utf-8'

  /** Standard JSON content type (fallback) */
  static readonly CONTENT_TYPE_JSON = 'application/json; charset=utf-8'

  /**
   * Get the appropriate content type header for FHIR responses
   */
  getContentType(): string {
    return FHIRResourceBase.CONTENT_TYPE_FHIR_JSON
  }

  /**
   * Create standard FHIR response headers
   */
  createHeaders(options: {
    etag?: string
    lastModified?: string
    location?: string
  } = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': this.getContentType(),
    }

    if (options.etag) {
      headers['ETag'] = `W/"${options.etag}"`
    }

    if (options.lastModified) {
      headers['Last-Modified'] = new Date(options.lastModified).toUTCString()
    }

    if (options.location) {
      headers['Location'] = options.location
    }

    return headers
  }

  // ---------------------------------------------------------------------------
  // OperationOutcome Generation
  // ---------------------------------------------------------------------------

  /**
   * Create an OperationOutcome for errors
   */
  createOperationOutcome(
    severity: IssueSeverity,
    code: IssueType,
    diagnostics?: string,
    options: {
      location?: string[]
      expression?: string[]
      detailsText?: string
      detailsCoding?: Coding
    } = {}
  ): OperationOutcome {
    const issue: OperationOutcomeIssue = {
      severity,
      code,
    }

    if (diagnostics) {
      issue.diagnostics = diagnostics
    }

    if (options.location) {
      issue.location = options.location
    }

    if (options.expression) {
      issue.expression = options.expression
    }

    if (options.detailsText || options.detailsCoding) {
      issue.details = {
        text: options.detailsText,
        coding: options.detailsCoding ? [options.detailsCoding] : undefined,
      }
    }

    return {
      resourceType: 'OperationOutcome',
      issue: [issue],
    }
  }

  /**
   * Create a not found OperationOutcome
   */
  notFound(resourceId: string): OperationOutcome {
    return this.createOperationOutcome(
      'error',
      'not-found',
      `${this.resourceType}/${resourceId} was not found`
    )
  }

  /**
   * Create a validation error OperationOutcome
   */
  validationError(message: string, expression?: string[]): OperationOutcome {
    return this.createOperationOutcome('error', 'invalid', message, { expression })
  }

  /**
   * Create a business rule error OperationOutcome
   */
  businessRuleError(message: string): OperationOutcome {
    return this.createOperationOutcome('error', 'business-rule', message)
  }

  /**
   * Create a conflict OperationOutcome (for version conflicts)
   */
  conflictError(message: string): OperationOutcome {
    return this.createOperationOutcome('error', 'conflict', message)
  }

  /**
   * Create a processing error OperationOutcome
   */
  processingError(message: string): OperationOutcome {
    return this.createOperationOutcome('error', 'processing', message)
  }

  /**
   * Create a security/forbidden OperationOutcome
   */
  forbiddenError(message: string): OperationOutcome {
    return this.createOperationOutcome('error', 'forbidden', message)
  }

  // ---------------------------------------------------------------------------
  // Search Parameter Parsing
  // ---------------------------------------------------------------------------

  /**
   * Parse base search parameters from URL query string
   */
  parseBaseSearchParams(params: URLSearchParams): BaseSearchParams {
    const result: BaseSearchParams = {}

    const id = params.get('_id')
    if (id) result._id = id

    const lastUpdated = params.get('_lastUpdated')
    if (lastUpdated) result._lastUpdated = lastUpdated

    const count = params.get('_count')
    if (count) result._count = parseInt(count, 10)

    const offset = params.get('_offset')
    if (offset) result._offset = parseInt(offset, 10)

    const sort = params.get('_sort')
    if (sort) result._sort = sort

    const include = params.getAll('_include')
    if (include.length > 0) {
      result._include = include.length === 1 ? include[0] : include
    }

    const revinclude = params.getAll('_revinclude')
    if (revinclude.length > 0) {
      result._revinclude = revinclude.length === 1 ? revinclude[0] : revinclude
    }

    const summary = params.get('_summary') as BaseSearchParams['_summary']
    if (summary) result._summary = summary

    const elements = params.get('_elements')
    if (elements) result._elements = elements

    const total = params.get('_total') as BaseSearchParams['_total']
    if (total) result._total = total

    return result
  }

  /**
   * Parse all search parameters (base + resource-specific)
   * Override in subclasses to add resource-specific parameters
   */
  parseSearchParams(params: URLSearchParams): TSearchParams {
    return this.parseBaseSearchParams(params) as TSearchParams
  }

  // ---------------------------------------------------------------------------
  // Bundle Creation
  // ---------------------------------------------------------------------------

  /**
   * Create a search result Bundle
   */
  createSearchBundle(
    resources: TResource[],
    options: {
      total?: number
      selfLink?: string
      nextLink?: string
      prevLink?: string
    } = {}
  ): Bundle<TResource> {
    const bundle: Bundle<TResource> = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: options.total ?? resources.length,
      link: [],
      entry: resources.map((resource) => this.createBundleEntry(resource)),
    }

    if (options.selfLink) {
      bundle.link!.push({ relation: 'self', url: options.selfLink })
    }

    if (options.nextLink) {
      bundle.link!.push({ relation: 'next', url: options.nextLink })
    }

    if (options.prevLink) {
      bundle.link!.push({ relation: 'previous', url: options.prevLink })
    }

    return bundle
  }

  /**
   * Create a Bundle entry for a resource
   */
  createBundleEntry(resource: TResource, mode: BundleSearchMode = 'match'): BundleEntry<TResource> {
    return {
      fullUrl: `${this.baseUrl}/${resource.resourceType}/${resource.id}`,
      resource,
      search: { mode },
    }
  }

  // ---------------------------------------------------------------------------
  // Response Helpers
  // ---------------------------------------------------------------------------

  /**
   * Create a successful read response
   */
  readResponse(c: Context, resource: TResource): Response {
    return c.json(resource, 200, this.createHeaders({
      etag: resource.meta?.versionId,
      lastModified: resource.meta?.lastUpdated,
    }))
  }

  /**
   * Create a successful create response (201)
   */
  createResponse(c: Context, resource: TResource): Response {
    return c.json(resource, 201, this.createHeaders({
      etag: resource.meta?.versionId,
      lastModified: resource.meta?.lastUpdated,
      location: `${this.baseUrl}/${resource.resourceType}/${resource.id}`,
    }))
  }

  /**
   * Create a successful update response (200)
   */
  updateResponse(c: Context, resource: TResource): Response {
    return c.json(resource, 200, this.createHeaders({
      etag: resource.meta?.versionId,
      lastModified: resource.meta?.lastUpdated,
    }))
  }

  /**
   * Create a successful delete response (204 No Content or 200 with OperationOutcome)
   */
  deleteResponse(c: Context): Response {
    return c.body(null, 204)
  }

  /**
   * Create a successful search response
   */
  searchResponse(c: Context, bundle: Bundle<TResource>): Response {
    return c.json(bundle, 200, { 'Content-Type': this.getContentType() })
  }

  /**
   * Create a not found error response (404)
   */
  notFoundResponse(c: Context, resourceId: string): Response {
    return c.json(this.notFound(resourceId), 404, {
      'Content-Type': this.getContentType(),
    })
  }

  /**
   * Create a validation error response (400)
   */
  validationErrorResponse(c: Context, message: string, expression?: string[]): Response {
    return c.json(this.validationError(message, expression), 400, {
      'Content-Type': this.getContentType(),
    })
  }

  /**
   * Create a conflict error response (409)
   */
  conflictResponse(c: Context, message: string): Response {
    return c.json(this.conflictError(message), 409, {
      'Content-Type': this.getContentType(),
    })
  }

  /**
   * Create a forbidden error response (403)
   */
  forbiddenResponse(c: Context, message: string): Response {
    return c.json(this.forbiddenError(message), 403, {
      'Content-Type': this.getContentType(),
    })
  }

  /**
   * Create a server error response (500)
   */
  serverErrorResponse(c: Context, message: string): Response {
    return c.json(this.processingError(message), 500, {
      'Content-Type': this.getContentType(),
    })
  }

  // ---------------------------------------------------------------------------
  // Abstract Methods (to be implemented by subclasses)
  // ---------------------------------------------------------------------------

  /**
   * Read a resource by ID
   * Subclasses must implement actual storage retrieval
   */
  abstract read(id: string): Promise<TResource | null>

  /**
   * Search for resources
   * Subclasses must implement actual search logic
   */
  abstract search(params: TSearchParams): Promise<TResource[]>

  /**
   * Create a new resource
   * Subclasses must implement actual storage creation
   */
  abstract create(resource: Omit<TResource, 'id' | 'meta'>): Promise<TResource>

  /**
   * Update an existing resource
   * Subclasses must implement actual storage update
   */
  abstract update(id: string, resource: TResource): Promise<TResource | null>

  /**
   * Delete a resource
   * Subclasses must implement actual storage deletion
   */
  abstract delete(id: string): Promise<boolean>
}

// =============================================================================
// Exports
// =============================================================================

export type { Meta, Resource, CodeableConcept, Coding, Bundle, BundleEntry } from './types'
