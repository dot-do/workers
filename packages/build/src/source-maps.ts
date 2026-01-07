/**
 * Source Map Manager for Production Deployments
 *
 * RED Phase: This module defines the interface for source map management.
 * All factory functions throw - implementation pending in GREEN phase (workers-1qqj.7).
 *
 * Features (to be implemented):
 * - Secure source map storage (KV or R2)
 * - Stack trace mapping to original source
 * - Access control and authentication
 * - Audit logging
 * - Retention policies
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Storage configuration for source maps
 */
export interface StorageConfig {
  type: 'kv' | 'r2'
  namespace?: string // For KV
  bucket?: string // For R2
}

/**
 * Security configuration for source map access
 */
export interface SecurityConfig {
  /** IP addresses or CIDR ranges allowed to access source maps */
  allowedIPs?: string[]
  /** Required token scopes for access */
  requiredScopes?: string[]
}

/**
 * Retention configuration for source maps
 */
export interface RetentionConfig {
  /** Maximum age of source maps in milliseconds */
  maxAge?: number
  /** Automatically delete expired source maps */
  autoDelete?: boolean
}

/**
 * Configuration options for the Source Map Manager
 */
export interface SourceMapManagerConfig {
  /** Storage backend configuration */
  storage?: StorageConfig
  /** Security configuration */
  security?: SecurityConfig
  /** Retention policy */
  retention?: RetentionConfig
  /** Callback for audit logging */
  onAccess?: (action: string, deploymentId: string) => void
}

/**
 * Options for uploading a source map
 */
export interface SourceMapUploadOptions {
  /** Deployment ID this source map belongs to */
  deploymentId: string
  /** Worker name */
  workerName: string
  /** The source map content (JSON string) */
  sourceMap: string
  /** Optional metadata to store with the source map */
  metadata?: SourceMapMetadata
  /** Override upload timestamp (for testing retention) */
  uploadedAt?: number
}

/**
 * Metadata stored with source maps
 */
export interface SourceMapMetadata {
  /** Application version */
  version?: string
  /** Git commit hash */
  commit?: string
  /** Build timestamp */
  buildTime?: number
  /** Additional custom metadata */
  [key: string]: unknown
}

/**
 * Result of a source map upload operation
 */
export interface SourceMapUploadResult {
  /** Whether the upload was successful */
  success: boolean
  /** Unique ID for the stored source map */
  id?: string
  /** Error message if upload failed */
  error?: string
}

/**
 * Authentication options for source map operations
 */
export interface AuthOptions {
  /** Bearer token for authentication */
  token?: string
  /** API key for authentication */
  apiKey?: string
  /** Client IP address (for IP allowlisting) */
  clientIP?: string
}

/**
 * A single frame in a mapped stack trace
 */
export interface MappedStackFrame {
  /** Original source file path */
  source: string
  /** Line number in original source */
  line: number
  /** Column number in original source */
  column: number
  /** Original function name (if available) */
  functionName?: string
  /** Source context around the error line */
  context?: {
    /** Lines before the error */
    before: string[]
    /** The error line itself */
    line: string
    /** Lines after the error */
    after: string[]
  }
}

/**
 * A fully mapped stack trace
 */
export interface MappedStackTrace {
  /** Original error message */
  message: string
  /** Mapped stack frames */
  frames: MappedStackFrame[]
  /** Original minified stack trace */
  originalStack: string
}

/**
 * Options for stack trace mapping
 */
export interface MapStackTraceOptions extends AuthOptions {
  /** Include source context in the result */
  includeContext?: boolean
  /** Number of context lines to include before/after */
  contextLines?: number
}

/**
 * Result of a delete operation
 */
export interface DeleteResult {
  /** Whether the delete was successful */
  success: boolean
  /** Error message if delete failed */
  error?: string
}

/**
 * Result of a bulk delete operation
 */
export interface BulkDeleteResult {
  /** Whether all deletes were successful */
  success: boolean
  /** Number of source maps deleted */
  deleted: number
  /** Errors for any failed deletions */
  errors?: Array<{ deploymentId: string; error: string }>
}

/**
 * Source map entry in a list
 */
export interface SourceMapEntry {
  /** Deployment ID */
  deploymentId: string
  /** Worker name */
  workerName: string
  /** Upload timestamp */
  uploadedAt: number
  /** Size in bytes */
  sizeBytes: number
  /** Associated metadata */
  metadata?: SourceMapMetadata
}

/**
 * Storage usage statistics
 */
export interface StorageUsage {
  /** Total bytes used */
  totalBytes: number
  /** Number of source maps */
  count: number
}

/**
 * Source Map Manager interface
 */
export interface SourceMapManager {
  /**
   * Upload a source map for a deployment
   */
  upload(options: SourceMapUploadOptions): Promise<SourceMapUploadResult>

  /**
   * Retrieve a source map (requires authentication)
   */
  retrieve(deploymentId: string, auth: AuthOptions): Promise<string | null>

  /**
   * Map a minified stack trace to original source
   */
  mapStackTrace(
    deploymentId: string,
    stackTrace: string,
    options: MapStackTraceOptions
  ): Promise<MappedStackTrace>

  /**
   * Check if a source map exists for a deployment
   */
  exists(deploymentId: string): Promise<boolean>

  /**
   * Delete a source map (requires authentication)
   */
  delete(deploymentId: string, auth: AuthOptions): Promise<DeleteResult>

  /**
   * Delete multiple source maps (requires authentication)
   */
  deleteMany(deploymentIds: string[], auth: AuthOptions): Promise<BulkDeleteResult>

  /**
   * Get metadata for a source map
   */
  getMetadata(deploymentId: string): Promise<SourceMapMetadata | null>

  /**
   * List all source maps for a worker
   */
  list(workerName: string, auth: AuthOptions): Promise<SourceMapEntry[]>

  /**
   * Get storage usage for a worker
   */
  getStorageUsage(workerName: string, auth: AuthOptions): Promise<StorageUsage>

  /**
   * Get public URL for a source map (should return undefined - source maps should not be public)
   */
  getPublicUrl?(deploymentId: string): string | undefined
}

// ============================================================================
// Factory Function (RED Phase - throws)
// ============================================================================

/**
 * Create a Source Map Manager instance
 *
 * RED Phase: This function throws - implementation pending in GREEN phase (workers-1qqj.7)
 *
 * @param config - Configuration options
 * @returns Source Map Manager instance
 * @throws Error - Not implemented yet
 */
export function createSourceMapManager(_config?: SourceMapManagerConfig): SourceMapManager {
  // RED Phase: Throw to make tests fail
  // GREEN Phase (workers-1qqj.7): Implement source map storage and retrieval
  throw new Error(
    'Source Map Manager not implemented - see workers-1qqj.7 for GREEN implementation'
  )
}
