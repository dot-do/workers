/**
 * Workers for Platforms Dynamic Dispatch
 * Route requests to deployed workers in WfP namespace
 *
 * Key optimization: O(1) lookup via secondary index
 */

import type { DispatchRequest, DispatchResponse } from './types'

/**
 * Deployment record from secondary index
 */
export interface DeploymentRecord {
  workerId: string
  name: string
  url: string
  createdAt: string
  context?: { ns: string; type: string; id: string }
}

/**
 * Rate limit status for a worker
 */
export interface RateLimitStatus {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * DeploymentsStore interface for O(1) lookup
 * Uses secondary index for name-based lookups
 */
export interface DeploymentsStore {
  getById(workerId: string): Promise<DeploymentRecord | null>
  getByName(name: string): Promise<DeploymentRecord | null>
  getRateLimitStatus(workerId: string): Promise<RateLimitStatus>
}

export interface Env {
  apps: DispatchNamespace
  deployments: KVNamespace
  deploymentsStore?: DeploymentsStore
}

/**
 * Dispatch request to a worker in Workers for Platforms namespace
 *
 * @param request - Dispatch request with worker ID and request details
 * @param env - Worker environment bindings
 * @returns Response from the dispatched worker
 */
export async function dispatchToWorker(request: DispatchRequest, env: Env): Promise<DispatchResponse> {
  try {
    if (!request.worker) {
      return {
        success: false,
        error: 'Missing required field: worker'
      }
    }

    // Verify worker exists in deployments
    const deploymentData = await env.deployments.get(`deploy:${request.worker}`, 'json')
    if (!deploymentData) {
      return {
        success: false,
        status: 404,
        error: `Worker not found: ${request.worker}`
      }
    }

    // Build request to forward to worker
    const workerRequest = new Request(`https://worker.internal${request.path || '/'}`, {
      method: request.method || 'GET',
      headers: request.headers || {},
      body: request.body ? JSON.stringify(request.body) : undefined
    })

    // Dispatch to worker in WfP namespace
    const workerResponse = await env.apps.get(request.worker).fetch(workerRequest)

    // Parse response
    const responseData = await workerResponse.text()
    let parsedData
    try {
      parsedData = JSON.parse(responseData)
    } catch {
      parsedData = responseData
    }

    return {
      success: true,
      status: workerResponse.status,
      data: parsedData
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Dispatch failed: ${errorMessage}`
    }
  }
}

/**
 * Dispatch request to worker by name
 *
 * Uses O(1) lookup via DeploymentsStore.getByName() secondary index
 * instead of O(n) KV scan.
 *
 * @param workerName - Worker name
 * @param request - HTTP request to forward
 * @param env - Worker environment bindings
 * @returns Response from the dispatched worker
 */
export async function dispatchByName(workerName: string, request: Request, env: Env): Promise<Response> {
  try {
    // O(1) lookup via secondary index
    if (!env.deploymentsStore) {
      return new Response(
        JSON.stringify({
          error: 'Dispatch failed',
          message: 'DeploymentsStore not available'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const deployment = await env.deploymentsStore.getByName(workerName)
    if (!deployment) {
      return new Response(JSON.stringify({ error: 'Worker not found', name: workerName }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check rate limit BEFORE dispatching
    const rateLimitStatus = await env.deploymentsStore.getRateLimitStatus(deployment.workerId)
    if (!rateLimitStatus.allowed) {
      const retryAfter = Math.ceil((rateLimitStatus.resetAt - Date.now()) / 1000)
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter,
          remaining: rateLimitStatus.remaining,
          resetAt: rateLimitStatus.resetAt
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Remaining': String(rateLimitStatus.remaining),
            'X-RateLimit-Reset': String(rateLimitStatus.resetAt)
          }
        }
      )
    }

    // Dispatch to worker
    const workerResponse = await env.apps.get(deployment.workerId).fetch(request)

    // Add rate limit headers to response
    const modifiedResponse = new Response(workerResponse.body, workerResponse)
    modifiedResponse.headers.set('X-RateLimit-Remaining', String(rateLimitStatus.remaining))
    modifiedResponse.headers.set('X-RateLimit-Reset', String(rateLimitStatus.resetAt))

    return modifiedResponse
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({
        error: 'Dispatch failed',
        message: errorMessage
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * Dispatch request to worker by ID
 *
 * @param workerId - Worker identifier
 * @param request - HTTP request to forward
 * @param env - Worker environment bindings
 * @returns Response from the dispatched worker
 */
export async function dispatchById(workerId: string, request: Request, env: Env): Promise<Response> {
  try {
    // Verify worker exists
    const deploymentData = await env.deployments.get(`deploy:${workerId}`, 'json')
    if (!deploymentData) {
      return new Response(JSON.stringify({ error: 'Worker not found', workerId }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Dispatch to worker
    const workerResponse = await env.apps.get(workerId).fetch(request)
    return workerResponse
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({
        error: 'Dispatch failed',
        message: errorMessage
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
