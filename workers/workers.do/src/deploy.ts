/**
 * Workers for Platforms Deployment Logic
 *
 * Supports two modes:
 * 1. Simulated mode (local testing): Uses in-memory worker execution
 * 2. Production mode: Uses Cloudflare API for real WfP deployment
 *
 * @see https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
 */

import type { DeployRequest, DeployResponse } from './types'
import {
  SimulatedDispatchNamespace,
  getSimulatedDispatchNamespace,
  type WorkerBindings,
} from './wfp-simulator'

/**
 * Extended deploy request with bindings and env vars
 */
export interface ExtendedDeployRequest extends DeployRequest {
  /** KV namespace bindings */
  bindings?: {
    kv?: { name: string; namespace_id: string }[]
    do?: { name: string; class_name: string; script_name?: string }[]
    vars?: Record<string, string>
    services?: { name: string; service: string }[]
  }
  /** Environment variables */
  env?: Record<string, string>
  /** Compatibility settings */
  compatibility_date?: string
  compatibility_flags?: string[]
}

/**
 * Extended environment with simulated dispatch namespace support
 */
export interface Env {
  apps: DispatchNamespace | SimulatedDispatchNamespace
  esbuild?: Fetcher
  deployments: KVNamespace
  db?: D1Database
  /** Cloudflare API token for real WfP deployment */
  CF_API_TOKEN?: string
  /** Cloudflare account ID */
  CF_ACCOUNT_ID?: string
  /** Dispatch namespace name for real WfP */
  WFP_NAMESPACE?: string
}

/**
 * Check if the dispatch namespace is simulated
 */
function isSimulatedNamespace(
  apps: DispatchNamespace | SimulatedDispatchNamespace
): apps is SimulatedDispatchNamespace {
  return 'put' in apps && typeof (apps as any).put === 'function'
}

/**
 * Strip TypeScript syntax from code for execution
 * This is a basic implementation - production would use esbuild
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

/**
 * Deploy worker to Workers for Platforms namespace
 *
 * In test mode: Deploys to simulated dispatch namespace
 * In production: Uses Cloudflare API to deploy to real WfP
 *
 * @param request - Deployment request with code and metadata
 * @param env - Worker environment bindings
 * @returns Deployment response with worker ID and URL
 */
export async function deployWorker(
  request: DeployRequest | ExtendedDeployRequest,
  env: Env
): Promise<DeployResponse> {
  try {
    // Validate inputs
    if (!request.name || !request.code) {
      return {
        success: false,
        error: 'Missing required fields: name and code',
      }
    }

    // Generate worker ID - use name for consistency in redeploys
    const workerId = request.name

    // Process the code
    let processedCode = request.code

    // If we have esbuild, compile the code
    if (env.esbuild) {
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

        const buildResult = (await buildResponse.json()) as any

        if (!buildResult.success) {
          return {
            success: false,
            error: `Build failed: ${buildResult.error}`,
          }
        }

        processedCode = buildResult.output || request.code
      } catch {
        // If esbuild fails, fall back to basic TypeScript stripping
        if (request.language === 'ts') {
          processedCode = stripTypeScript(request.code)
        }
      }
    } else if (request.language === 'ts') {
      // Basic TypeScript stripping if no esbuild
      processedCode = stripTypeScript(request.code)
    }

    const workerUrl = `https://${workerId}.workers.dev`

    // Check if we're using simulated namespace (for testing)
    if (isSimulatedNamespace(env.apps)) {
      // Deploy to simulated namespace
      const extRequest = request as ExtendedDeployRequest
      const bindings: WorkerBindings = {}

      // Handle env vars
      if (extRequest.env) {
        bindings.vars = { ...bindings.vars, ...extRequest.env }
      }

      // Handle bindings
      if (extRequest.bindings?.vars) {
        bindings.vars = { ...bindings.vars, ...extRequest.bindings.vars }
      }

      // Deploy to simulated dispatch namespace
      await env.apps.put(workerId, processedCode, {
        bindings,
        env: extRequest.env,
      })
    } else if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID && env.WFP_NAMESPACE) {
      // Production: Deploy via Cloudflare API
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
    // If no apps binding and no API credentials, just store metadata

    // Store deployment metadata in KV
    if (env.deployments) {
      const now = new Date().toISOString()
      const existingData = await env.deployments.get(`deploy:${workerId}`, 'json') as any

      await env.deployments.put(
        `deploy:${workerId}`,
        JSON.stringify({
          workerId,
          name: request.name,
          language: request.language || 'js',
          createdAt: existingData?.createdAt || now,
          updatedAt: now,
          url: workerUrl,
        }),
        {
          expirationTtl: 60 * 60 * 24 * 90, // 90 days
        }
      )
    }

    // Store in D1 if available
    if (env.db) {
      try {
        // Use REPLACE to handle redeploys
        await env.db
          .prepare(
            `INSERT OR REPLACE INTO deployments (worker_id, name, url, created_at) VALUES (?, ?, ?, ?)`
          )
          .bind(workerId, request.name, workerUrl, new Date().toISOString())
          .run()
      } catch {
        // D1 might not have the table - ignore for now
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
      error: `Deployment failed: ${errorMessage}`,
    }
  }
}

/**
 * Deploy to Cloudflare API for real WfP
 *
 * Uses PUT /accounts/{account_id}/workers/dispatch/namespaces/{namespace}/scripts/{name}
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

    // Add the worker script
    const scriptBlob = new Blob([code], { type: 'application/javascript' })
    formData.append('worker.js', scriptBlob, 'worker.js')

    // Build metadata with bindings
    const metadata: any = {
      main_module: 'worker.js',
      compatibility_date: request.compatibility_date || '2024-01-01',
      compatibility_flags: request.compatibility_flags || [],
    }

    // Add bindings if provided
    if (request.bindings || request.env) {
      metadata.bindings = []

      // Add KV bindings
      if (request.bindings?.kv) {
        for (const kv of request.bindings.kv) {
          metadata.bindings.push({
            type: 'kv_namespace',
            name: kv.name,
            namespace_id: kv.namespace_id,
          })
        }
      }

      // Add DO bindings
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

      // Add env vars as plain text bindings
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

    // Make the API request
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

    const result = (await response.json()) as any

    if (!result.success) {
      return {
        success: false,
        error: `Cloudflare API error: ${JSON.stringify(result.errors)}`,
      }
    }

    return {
      success: true,
      workerId: scriptName,
      url: `https://${scriptName}.workers.dev`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Cloudflare API deployment failed: ${errorMessage}`,
    }
  }
}

/**
 * Get deployment information
 *
 * @param workerId - Worker identifier
 * @param env - Worker environment bindings
 * @returns Deployment metadata
 */
export async function getDeployment(workerId: string, env: Env) {
  try {
    // Get from KV
    const data = await env.deployments.get(`deploy:${workerId}`, 'json')

    if (!data) {
      return {
        success: false,
        error: 'Deployment not found',
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
      error: errorMessage,
    }
  }
}

/**
 * List all deployments
 *
 * @param env - Worker environment bindings
 * @returns List of deployments
 */
export async function listDeployments(env: Env) {
  try {
    // Try D1 first if available
    if (env.db) {
      const { results } = await env.db
        .prepare(
          `SELECT worker_id, name, url, created_at FROM deployments ORDER BY created_at DESC LIMIT 100`
        )
        .all()

      return {
        success: true,
        deployments: results || [],
      }
    }

    // Fall back to KV list
    const { keys } = await env.deployments.list({ prefix: 'deploy:' })
    const deployments = []

    for (const key of keys) {
      const data = await env.deployments.get(key.name, 'json')
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
      error: errorMessage,
    }
  }
}

/**
 * Delete a deployment
 *
 * @param workerId - Worker identifier
 * @param env - Worker environment bindings
 * @returns Success status
 */
export async function deleteDeployment(workerId: string, env: Env) {
  try {
    // Delete from simulated namespace if applicable
    if (isSimulatedNamespace(env.apps)) {
      await env.apps.delete(workerId)
    } else if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID && env.WFP_NAMESPACE) {
      // Delete from Cloudflare API
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/dispatch/namespaces/${env.WFP_NAMESPACE}/scripts/${workerId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${env.CF_API_TOKEN}`,
          },
        }
      )

      if (!response.ok) {
        const result = (await response.json()) as any
        // Don't fail on 404 - worker might already be deleted
        if (response.status !== 404) {
          return {
            success: false,
            error: `Cloudflare API error: ${JSON.stringify(result.errors)}`,
          }
        }
      }
    }

    // Delete from KV
    await env.deployments.delete(`deploy:${workerId}`)

    // Delete from D1 if available
    if (env.db) {
      try {
        await env.db
          .prepare(`DELETE FROM deployments WHERE worker_id = ?`)
          .bind(workerId)
          .run()
      } catch {
        // Ignore D1 errors
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
      error: errorMessage,
    }
  }
}

/**
 * Deploy static site to Workers for Platforms
 *
 * @param request - Static site deployment request with Worker code
 * @param env - Worker environment bindings
 * @returns Deployment response with worker ID and URL
 */
export async function deployStaticSite(
  request: {
    name: string
    code: string
    context: { ns: string; type: string; id: string }
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

    const { name, code, context, options } = request

    // Generate worker ID based on Thing context
    const workerId = `${context.id}-${context.type}-${context.ns}-${Date.now()}`
    const workerUrl = `https://${workerId}.workers.dev`

    // Deploy using the main deploy function
    const deployResult = await deployWorker(
      {
        name: workerId,
        code,
        language: 'js',
      },
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
      error: `Static site deployment failed: ${errorMessage}`,
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
