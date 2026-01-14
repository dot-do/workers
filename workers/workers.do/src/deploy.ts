/**
 * Workers for Platforms (WfP) Deployment Module
 *
 * This module provides deployment functionality for Cloudflare Workers for Platforms.
 * It supports two operational modes:
 *
 * 1. **Simulated mode** (local testing): Uses an in-memory dispatch namespace simulator
 *    that evaluates worker code locally. Used in tests and development.
 *
 * 2. **Production mode**: Uses the Cloudflare API to deploy workers to a real
 *    WfP dispatch namespace. Requires CF_API_TOKEN, CF_ACCOUNT_ID, and WFP_NAMESPACE.
 *
 * @module src/deploy
 * @see https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
 */

import type { DeployRequest, DeployResponse } from './types'
import {
  SimulatedDispatchNamespace,
  type WorkerBindings,
} from './wfp-simulator'
import { sanitizeForErrorMessage } from './middleware/security'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * KV namespace binding configuration for WfP deployment
 */
export interface KVBindingConfig {
  /** Binding name accessible in worker code as env.{name} */
  name: string
  /** Cloudflare KV namespace ID */
  namespace_id: string
}

/**
 * Durable Object binding configuration for WfP deployment
 */
export interface DurableObjectBindingConfig {
  /** Binding name accessible in worker code as env.{name} */
  name: string
  /** DO class name to bind */
  class_name: string
  /** Script containing the DO class (optional, defaults to same script) */
  script_name?: string
}

/**
 * Service binding configuration for WfP deployment
 */
export interface ServiceBindingConfig {
  /** Binding name accessible in worker code as env.{name} */
  name: string
  /** Target service worker name */
  service: string
}

/**
 * Worker bindings configuration for WfP deployment
 */
export interface DeploymentBindings {
  /** KV namespace bindings */
  kv?: KVBindingConfig[]
  /** Durable Object bindings */
  do?: DurableObjectBindingConfig[]
  /** Plain text variable bindings */
  vars?: Record<string, string>
  /** Service bindings to other workers */
  services?: ServiceBindingConfig[]
}

/**
 * Extended deploy request with bindings, environment variables, and compatibility settings.
 * Extends the base DeployRequest with production deployment configuration.
 */
export interface ExtendedDeployRequest extends DeployRequest {
  /** Worker bindings (KV, DO, services, vars) */
  bindings?: DeploymentBindings
  /** Environment variables passed to the worker */
  env?: Record<string, string>
  /**
   * Compatibility date for the worker runtime.
   * @see https://developers.cloudflare.com/workers/configuration/compatibility-dates/
   * @default '2024-01-01'
   */
  compatibility_date?: string
  /**
   * Compatibility flags for the worker runtime.
   * @example ['nodejs_compat']
   * @see https://developers.cloudflare.com/workers/configuration/compatibility-flags/
   */
  compatibility_flags?: string[]
}

/**
 * Worker environment bindings for the deployment service.
 * Supports both simulated (testing) and production dispatch namespaces.
 */
export interface Env {
  /**
   * Dispatch namespace for deployed user workers.
   * In tests: SimulatedDispatchNamespace (supports put/delete methods)
   * In production: Cloudflare DispatchNamespace (get only, deploy via API)
   */
  apps: DispatchNamespace | SimulatedDispatchNamespace

  /**
   * Optional esbuild service binding for TypeScript compilation.
   * When available, provides production-grade TS → JS compilation.
   * Falls back to basic type stripping when unavailable.
   */
  esbuild?: Fetcher

  /**
   * KV namespace for storing deployment metadata.
   * Stores worker info, timestamps, and configuration.
   */
  deployments: KVNamespace

  /**
   * Optional D1 database for structured deployment tracking.
   * Used for queries and analytics when available.
   */
  db?: D1Database

  /**
   * Cloudflare API token for production WfP deployment.
   * Required for production mode. Must have Workers Scripts Write permission.
   * @see https://developers.cloudflare.com/api/tokens/create/
   */
  CF_API_TOKEN?: string

  /**
   * Cloudflare account ID for API calls.
   * Required for production mode. Found in the Cloudflare dashboard URL.
   */
  CF_ACCOUNT_ID?: string

  /**
   * Dispatch namespace name for WfP deployment.
   * Required for production mode. Must be pre-created in Cloudflare dashboard.
   */
  WFP_NAMESPACE?: string
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Build result from esbuild service
 */
interface EsbuildResult {
  success: boolean
  output?: string
  error?: string
}

/**
 * Cloudflare API response structure
 */
interface CloudflareAPIResponse {
  success: boolean
  errors?: Array<{ code: number; message: string }>
  messages?: string[]
  result?: unknown
}

/**
 * Deployment metadata stored in KV
 */
interface DeploymentMetadata {
  workerId: string
  name: string
  language: string
  createdAt: string
  updatedAt: string
  url: string
}

/**
 * Worker metadata for the Cloudflare API
 */
interface WorkerMetadata {
  main_module: string
  compatibility_date: string
  compatibility_flags: string[]
  bindings?: Array<{
    type: string
    name: string
    [key: string]: unknown
  }>
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if the dispatch namespace is a simulated namespace.
 * Simulated namespaces have a `put` method for deploying workers directly,
 * while production namespaces require API deployment.
 *
 * @param apps - The dispatch namespace to check
 * @returns True if the namespace is simulated (has put method)
 */
function isSimulatedNamespace(
  apps: DispatchNamespace | SimulatedDispatchNamespace
): apps is SimulatedDispatchNamespace {
  return 'put' in apps && typeof (apps as SimulatedDispatchNamespace).put === 'function'
}

// ============================================================================
// Code Processing
// ============================================================================

/**
 * Strip TypeScript type annotations from code to produce valid JavaScript.
 *
 * This is a basic fallback implementation used when the esbuild service
 * is unavailable. It handles common type annotation patterns but may not
 * handle all TypeScript syntax correctly.
 *
 * For production deployments with complex TypeScript code, ensure the
 * esbuild service binding is configured.
 *
 * @param code - TypeScript code to strip
 * @returns JavaScript code with type annotations removed
 *
 * @example
 * ```ts
 * const input = 'function greet(name: string): string { return name }'
 * const output = stripTypeScript(input)
 * // output: 'function greet(name) { return name }'
 * ```
 */
function stripTypeScript(code: string): string {
  return code
    .replace(/:\s*Request/g, '')
    .replace(/:\s*Response/g, '')
    .replace(/:\s*Promise<[^>]+>/g, '')
    .replace(/:\s*any/g, '')
    .replace(/:\s*string/g, '')
    .replace(/:\s*number/g, '')
    .replace(/:\s*boolean/g, '')
    .replace(/:\s*void/g, '')
    .replace(/:\s*unknown/g, '')
    .replace(/:\s*\{[^}]+\}/g, '') // Object type annotations
    .replace(/<[A-Za-z][^>]*>/g, '') // Generic type parameters
}

// ============================================================================
// Core Deployment Functions
// ============================================================================

/**
 * Deploy a worker to Workers for Platforms namespace.
 *
 * This function handles both simulated (testing) and production deployments:
 *
 * - **Simulated mode**: When `env.apps` is a SimulatedDispatchNamespace, deploys
 *   directly to the in-memory simulator. Used for local testing.
 *
 * - **Production mode**: When Cloudflare API credentials are configured
 *   (CF_API_TOKEN, CF_ACCOUNT_ID, WFP_NAMESPACE), deploys via the Cloudflare API.
 *
 * The worker ID is derived from the name, ensuring redeployments update the
 * existing worker rather than creating duplicates.
 *
 * @param request - Deployment request containing worker code and configuration
 * @param env - Worker environment with dispatch namespace and storage bindings
 * @returns Deployment response with worker ID, URL, or error details
 *
 * @example
 * ```ts
 * const result = await deployWorker({
 *   name: 'my-worker',
 *   code: 'export default { fetch: () => new Response("Hello!") }',
 *   language: 'js',
 * }, env)
 *
 * if (result.success) {
 *   console.log(`Deployed to ${result.url}`)
 * }
 * ```
 */
export async function deployWorker(
  request: DeployRequest | ExtendedDeployRequest,
  env: Env
): Promise<DeployResponse> {
  try {
    // Validate required fields
    if (!request.name) {
      return {
        success: false,
        error: 'Missing required field: name. Provide a unique identifier for the worker.',
      }
    }

    if (!request.code) {
      return {
        success: false,
        error: 'Missing required field: code. Provide the worker source code to deploy.',
      }
    }

    // Generate worker ID - use name for consistency in redeploys
    const workerId = request.name

    // Process the code (compile TypeScript if needed)
    let processedCode = request.code

    if (env.esbuild) {
      // Use esbuild service for production-grade compilation
      try {
        const buildResponse = await env.esbuild.fetch('https://esbuild/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: request.code,
            language: request.language || 'ts',
            minify: request.minify || false,
            format: 'esm',
            target: 'esnext',
          }),
        })

        const buildResult = (await buildResponse.json()) as EsbuildResult

        if (!buildResult.success) {
          return {
            success: false,
            error: `TypeScript compilation failed: ${buildResult.error}. Check your code for syntax errors.`,
          }
        }

        processedCode = buildResult.output || request.code
      } catch (buildError) {
        // Esbuild service unavailable - fall back to basic stripping
        if (request.language === 'ts') {
          processedCode = stripTypeScript(request.code)
        }
      }
    } else if (request.language === 'ts') {
      // Basic TypeScript stripping when esbuild unavailable
      processedCode = stripTypeScript(request.code)
    }

    const workerUrl = `https://${workerId}.workers.dev`

    // Deploy to appropriate target
    if (isSimulatedNamespace(env.apps)) {
      // Simulated mode: Deploy directly to in-memory namespace
      const extRequest = request as ExtendedDeployRequest
      const bindings: WorkerBindings = {}

      // Merge env vars and binding vars
      if (extRequest.env) {
        bindings.vars = { ...bindings.vars, ...extRequest.env }
      }
      if (extRequest.bindings?.vars) {
        bindings.vars = { ...bindings.vars, ...extRequest.bindings.vars }
      }

      await env.apps.put(workerId, processedCode, {
        bindings,
        env: extRequest.env,
      })
    } else if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID && env.WFP_NAMESPACE) {
      // Production mode: Deploy via Cloudflare API
      const deployResult = await deployToCloudflareAPI(
        workerId,
        processedCode,
        env.CF_API_TOKEN,
        env.CF_ACCOUNT_ID,
        env.WFP_NAMESPACE,
        request as ExtendedDeployRequest
      )

      if (!deployResult.success) {
        return deployResult
      }
    }
    // Note: If no apps binding and no API credentials, we only store metadata.
    // This allows testing the metadata layer in isolation.

    // Store deployment metadata in KV
    if (env.deployments) {
      const now = new Date().toISOString()
      const existingData = await env.deployments.get(`deploy:${workerId}`, 'json') as DeploymentMetadata | null

      await env.deployments.put(
        `deploy:${workerId}`,
        JSON.stringify({
          workerId,
          name: request.name,
          language: request.language || 'js',
          createdAt: existingData?.createdAt || now,
          updatedAt: now,
          url: workerUrl,
        } satisfies DeploymentMetadata),
        {
          expirationTtl: 60 * 60 * 24 * 90, // 90 days
        }
      )
    }

    // Store in D1 if available (for queries and analytics)
    if (env.db) {
      try {
        await env.db
          .prepare(
            `INSERT OR REPLACE INTO deployments (worker_id, name, url, created_at) VALUES (?, ?, ?, ?)`
          )
          .bind(workerId, request.name, workerUrl, new Date().toISOString())
          .run()
      } catch {
        // D1 table may not exist - silently skip (KV is the primary store)
      }
    }

    return {
      success: true,
      workerId,
      url: workerUrl,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Deployment failed unexpectedly: ${errorMessage}. Please try again or check the worker code.`,
    }
  }
}

// ============================================================================
// Cloudflare API Integration
// ============================================================================

/**
 * Format Cloudflare API errors into a readable message.
 *
 * @param errors - Array of Cloudflare API error objects
 * @returns Formatted error message string
 */
function formatCloudflareErrors(errors: Array<{ code: number; message: string }>): string {
  if (!errors || errors.length === 0) {
    return 'Unknown Cloudflare API error'
  }
  return errors.map((e) => `[${e.code}] ${e.message}`).join('; ')
}

/**
 * Deploy a worker to Cloudflare Workers for Platforms via the API.
 *
 * Uses the WfP script upload endpoint:
 * `PUT /accounts/{account_id}/workers/dispatch/namespaces/{namespace}/scripts/{name}`
 *
 * This function is called internally when production credentials are configured.
 * It handles multipart form data construction with the worker script and metadata.
 *
 * @param scriptName - Unique name for the worker script
 * @param code - Compiled JavaScript code to deploy
 * @param apiToken - Cloudflare API token with Workers Scripts Write permission
 * @param accountId - Cloudflare account ID
 * @param namespace - WfP dispatch namespace name
 * @param request - Extended request with bindings and compatibility settings
 * @returns Deployment result with success status and worker URL or error
 *
 * @internal
 */
async function deployToCloudflareAPI(
  scriptName: string,
  code: string,
  apiToken: string,
  accountId: string,
  namespace: string,
  request: ExtendedDeployRequest
): Promise<DeployResponse> {
  try {
    // Build multipart form data for the script upload
    const formData = new FormData()

    // Add the worker script as the main module
    const scriptBlob = new Blob([code], { type: 'application/javascript' })
    formData.append('worker.js', scriptBlob, 'worker.js')

    // Build metadata with bindings
    const metadata: WorkerMetadata = {
      main_module: 'worker.js',
      compatibility_date: request.compatibility_date || '2024-01-01',
      compatibility_flags: request.compatibility_flags || [],
    }

    // Add bindings if provided
    if (request.bindings || request.env) {
      metadata.bindings = []

      // Add KV namespace bindings
      if (request.bindings?.kv) {
        for (const kv of request.bindings.kv) {
          metadata.bindings.push({
            type: 'kv_namespace',
            name: kv.name,
            namespace_id: kv.namespace_id,
          })
        }
      }

      // Add Durable Object bindings
      if (request.bindings?.do) {
        for (const doBinding of request.bindings.do) {
          metadata.bindings.push({
            type: 'durable_object_namespace',
            name: doBinding.name,
            class_name: doBinding.class_name,
            script_name: doBinding.script_name,
          })
        }
      }

      // Add service bindings
      if (request.bindings?.services) {
        for (const service of request.bindings.services) {
          metadata.bindings.push({
            type: 'service',
            name: service.name,
            service: service.service,
          })
        }
      }

      // Add environment variables as plain text bindings
      const envVars = { ...request.bindings?.vars, ...request.env }
      for (const [name, value] of Object.entries(envVars)) {
        metadata.bindings.push({
          type: 'plain_text',
          name,
          text: value,
        })
      }
    }

    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    )

    // Make the API request to Cloudflare
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/dispatch/namespaces/${namespace}/scripts/${scriptName}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        body: formData,
      }
    )

    const result = (await response.json()) as CloudflareAPIResponse

    if (!result.success) {
      const errorDetail = formatCloudflareErrors(result.errors || [])
      return {
        success: false,
        error: `Cloudflare API rejected the deployment: ${errorDetail}. Verify your API token has Workers Scripts Write permission and the namespace "${namespace}" exists.`,
      }
    }

    return {
      success: true,
      workerId: scriptName,
      url: `https://${scriptName}.workers.dev`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Provide actionable error messages for common failures
    if (errorMessage.includes('fetch')) {
      return {
        success: false,
        error: `Failed to connect to Cloudflare API: ${errorMessage}. Check your network connection and try again.`,
      }
    }

    return {
      success: false,
      error: `Cloudflare API deployment failed: ${errorMessage}. Check your credentials and try again.`,
    }
  }
}

// ============================================================================
// Deployment Query Functions
// ============================================================================

/**
 * Result type for getDeployment function
 */
export interface GetDeploymentResult {
  success: boolean
  data?: DeploymentMetadata
  error?: string
}

/**
 * Result type for listDeployments function
 */
export interface ListDeploymentsResult {
  success: boolean
  deployments?: DeploymentMetadata[]
  error?: string
}

/**
 * Result type for deleteDeployment function
 */
export interface DeleteDeploymentResult {
  success: boolean
  workerId?: string
  error?: string
}

/**
 * Retrieve deployment metadata for a specific worker.
 *
 * Looks up the worker by ID in the KV metadata store.
 *
 * @param workerId - Unique worker identifier (same as the name used during deployment)
 * @param env - Worker environment with KV binding
 * @returns Deployment metadata or error if not found
 *
 * @example
 * ```ts
 * const result = await getDeployment('my-worker', env)
 * if (result.success) {
 *   console.log(`Created at: ${result.data.createdAt}`)
 * }
 * ```
 */
export async function getDeployment(workerId: string, env: Env): Promise<GetDeploymentResult> {
  try {
    const data = await env.deployments.get(`deploy:${workerId}`, 'json') as DeploymentMetadata | null

    if (!data) {
      // Sanitize workerId to prevent XSS in error messages
      const safeWorkerId = sanitizeForErrorMessage(workerId)
      return {
        success: false,
        error: `Deployment not found: No worker with ID "${safeWorkerId}" exists. Check the worker name and try again.`,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Failed to retrieve deployment: ${errorMessage}`,
    }
  }
}

/**
 * List all deployed workers with their metadata.
 *
 * Queries deployments from either D1 (preferred, for better query support)
 * or KV (fallback). Results are ordered by creation date, newest first.
 *
 * @param env - Worker environment with storage bindings
 * @returns List of deployment metadata records
 *
 * @example
 * ```ts
 * const result = await listDeployments(env)
 * if (result.success) {
 *   for (const deployment of result.deployments) {
 *     console.log(`${deployment.name}: ${deployment.url}`)
 *   }
 * }
 * ```
 */
export async function listDeployments(env: Env): Promise<ListDeploymentsResult> {
  try {
    // Prefer D1 for structured queries
    if (env.db) {
      const { results } = await env.db
        .prepare(
          `SELECT worker_id, name, url, created_at FROM deployments ORDER BY created_at DESC LIMIT 100`
        )
        .all<{ worker_id: string; name: string; url: string; created_at: string }>()

      // Transform D1 results to match DeploymentMetadata structure
      const deployments: DeploymentMetadata[] = (results || []).map((row) => ({
        workerId: row.worker_id,
        name: row.name,
        url: row.url,
        language: 'js', // D1 schema doesn't store language
        createdAt: row.created_at,
        updatedAt: row.created_at,
      }))

      return {
        success: true,
        deployments,
      }
    }

    // Fall back to KV list (less efficient for large numbers of deployments)
    const { keys } = await env.deployments.list({ prefix: 'deploy:' })
    const deployments: DeploymentMetadata[] = []

    for (const key of keys) {
      const data = await env.deployments.get(key.name, 'json') as DeploymentMetadata | null
      if (data) {
        deployments.push(data)
      }
    }

    return {
      success: true,
      deployments,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Failed to list deployments: ${errorMessage}`,
    }
  }
}

/**
 * Delete a deployed worker and its metadata.
 *
 * This operation is idempotent - deleting a non-existent worker returns success.
 * Removes the worker from:
 * 1. The dispatch namespace (simulated or production)
 * 2. KV metadata store
 * 3. D1 database (if available)
 *
 * @param workerId - Unique worker identifier to delete
 * @param env - Worker environment with dispatch namespace and storage bindings
 * @returns Success status with the deleted worker ID
 *
 * @example
 * ```ts
 * const result = await deleteDeployment('my-worker', env)
 * if (result.success) {
 *   console.log(`Deleted worker: ${result.workerId}`)
 * }
 * ```
 */
export async function deleteDeployment(workerId: string, env: Env): Promise<DeleteDeploymentResult> {
  try {
    // Delete from dispatch namespace
    if (isSimulatedNamespace(env.apps)) {
      // Simulated mode: Delete from in-memory store
      await env.apps.delete(workerId)
    } else if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID && env.WFP_NAMESPACE) {
      // Production mode: Delete via Cloudflare API
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/dispatch/namespaces/${env.WFP_NAMESPACE}/scripts/${workerId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${env.CF_API_TOKEN}`,
          },
        }
      )

      // 404 is acceptable - worker may already be deleted (idempotent)
      if (!response.ok && response.status !== 404) {
        const result = (await response.json()) as CloudflareAPIResponse
        const errorDetail = formatCloudflareErrors(result.errors || [])
        return {
          success: false,
          error: `Failed to delete from Cloudflare: ${errorDetail}`,
        }
      }
    }

    // Delete metadata from KV
    await env.deployments.delete(`deploy:${workerId}`)

    // Delete from D1 if available (best-effort, KV is primary)
    if (env.db) {
      try {
        await env.db
          .prepare(`DELETE FROM deployments WHERE worker_id = ?`)
          .bind(workerId)
          .run()
      } catch {
        // D1 table may not exist - silently skip
      }
    }

    return {
      success: true,
      workerId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Failed to delete deployment: ${errorMessage}`,
    }
  }
}

// ============================================================================
// Static Site Deployment
// ============================================================================

/**
 * Context identifying the Thing that owns this deployment
 */
export interface ThingContext {
  /** Namespace the Thing belongs to */
  ns: string
  /** Type of the Thing */
  type: string
  /** Unique ID of the Thing */
  id: string
}

/**
 * Static site deployment options
 */
export interface StaticSiteOptions {
  /** Route patterns for the site (default: ['/*']) */
  routes?: string[]
  /** Deployment environment name (default: 'production') */
  environment?: string
}

/**
 * Static site deployment request
 */
export interface StaticSiteDeployRequest {
  /** Display name for the deployment */
  name: string
  /** Worker code that serves the static site */
  code: string
  /** Thing context that owns this deployment */
  context: ThingContext
  /** Optional deployment configuration */
  options?: StaticSiteOptions
}

/**
 * Static site deployment result
 */
export interface StaticSiteDeployResult {
  success: boolean
  workerId?: string
  url?: string
  context?: ThingContext
  environment?: string
  error?: string
}

/**
 * Deploy a static site to Workers for Platforms.
 *
 * Creates a worker that serves static content, associated with a Thing context.
 * The worker ID includes a timestamp to ensure unique deployments per deploy action.
 *
 * @param request - Static site deployment configuration
 * @param env - Worker environment with dispatch namespace and storage
 * @returns Deployment result with worker ID, URL, and context
 *
 * @example
 * ```ts
 * const result = await deployStaticSite({
 *   name: 'my-landing-page',
 *   code: staticSiteWorkerCode,
 *   context: { ns: 'default', type: 'Site', id: 'landing' },
 *   options: { environment: 'staging' },
 * }, env)
 * ```
 */
export async function deployStaticSite(
  request: StaticSiteDeployRequest,
  env: Env
): Promise<StaticSiteDeployResult> {
  try {
    // Validate required fields
    if (!request.name) {
      return {
        success: false,
        error: 'Missing required field: name. Provide a display name for the site.',
      }
    }
    if (!request.code) {
      return {
        success: false,
        error: 'Missing required field: code. Provide the worker code that serves the static site.',
      }
    }
    if (!request.context) {
      return {
        success: false,
        error: 'Missing required field: context. Provide the Thing context (ns, type, id) that owns this deployment.',
      }
    }

    const { name, code, context, options } = request

    // Generate unique worker ID based on Thing context and timestamp
    const workerId = `${context.id}-${context.type}-${context.ns}-${Date.now()}`
    const workerUrl = `https://${workerId}.workers.dev`

    // Deploy using the core deployment function
    const deployResult = await deployWorker(
      {
        name: workerId,
        code,
        language: 'js',
      },
      env
    )

    if (!deployResult.success) {
      return {
        success: false,
        error: deployResult.error,
      }
    }

    // Store extended metadata for static sites
    if (env.deployments) {
      await env.deployments.put(
        `deploy:${workerId}`,
        JSON.stringify({
          workerId,
          name,
          context,
          createdAt: new Date().toISOString(),
          codeSize: code.length,
          url: workerUrl,
          environment: options?.environment || 'production',
          routes: options?.routes || ['/*'],
        }),
        {
          expirationTtl: 60 * 60 * 24 * 90, // 90 days
        }
      )
    }

    return {
      success: true,
      workerId,
      url: workerUrl,
      context,
      environment: options?.environment || 'production',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Static site deployment failed: ${errorMessage}. Check the worker code and try again.`,
    }
  }
}

/**
 * Deploy OpenNext site to Workers for Platforms
 *
 * Deploys a Next.js application built with OpenNext to Workers for Platforms.
 * Handles both the worker code and static assets.
 *
 * @param request - Deployment request with worker code and assets
 * @param env - Worker environment bindings
 * @returns Deployment result with worker ID and URL
 */
export async function deployOpenNext(
  request: {
    name: string
    code: string
    context: { ns: string; type: string; id: string }
    assets?: Array<{
      path: string
      content: string // base64 encoded
    }>
    options?: {
      routes?: string[]
      environment?: string
    }
  },
  env: Env
) {
  try {
    // Validate inputs
    if (!request.name || !request.code || !request.context) {
      return {
        success: false,
        error: 'Missing required fields: name, code, and context',
      }
    }

    const { name, code, context, assets = [], options } = request

    // Generate worker ID based on Thing context
    const workerId = `${context.id}-${context.type}-${context.ns}-${Date.now()}`
    const workerUrl = `https://${workerId}.workers.dev`

    // Calculate total asset size (estimate from base64)
    const totalAssetSize = assets.reduce((sum, asset) => {
      // Base64 decodes to roughly 3/4 of its length
      return sum + Math.floor((asset.content.length * 3) / 4)
    }, 0)

    // Deploy using the main deploy function with nodejs_compat flag
    const deployResult = await deployWorker(
      {
        name: workerId,
        code,
        language: 'js',
        compatibility_flags: ['nodejs_compat'],
      } as ExtendedDeployRequest,
      env
    )

    if (!deployResult.success) {
      return deployResult
    }

    // Store additional metadata
    if (env.deployments) {
      await env.deployments.put(
        `deploy:${workerId}`,
        JSON.stringify({
          workerId,
          name,
          context,
          createdAt: new Date().toISOString(),
          codeSize: code.length,
          assetCount: assets.length,
          totalAssetSize,
          url: workerUrl,
          environment: options?.environment || 'production',
          routes: options?.routes || ['/*'],
          deploymentType: 'dynamic-opennext',
          compatibilityFlags: ['nodejs_compat'],
        }),
        {
          expirationTtl: 60 * 60 * 24 * 90, // 90 days
        }
      )
    }

    return {
      success: true,
      workerId,
      url: workerUrl,
      context,
      environment: options?.environment || 'production',
      stats: {
        codeSize: code.length,
        assetCount: assets.length,
        totalAssetSize,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `OpenNext deployment failed: ${errorMessage}`,
    }
  }
}
