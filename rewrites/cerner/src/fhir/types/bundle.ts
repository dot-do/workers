/**
 * FHIR R4 Bundle Type Definitions
 *
 * Bundle resources for grouping and searching FHIR resources.
 */

import type { Identifier, Signature } from './datatypes'
import type { BundleSearchMode, BundleType, HTTPMethod } from './primitives'
import type { Resource } from './resources'

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
  mode?: BundleSearchMode
  score?: number
}

export interface BundleEntryRequest {
  method: HTTPMethod
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
