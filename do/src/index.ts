/**
 * DO Worker - RPC Proxy Service
 *
 * This worker exposes and proxies RPC functions from all other workers in the system.
 * It provides a unified interface for calling any function on any worker.
 *
 * Usage:
 *   const result = await env.DO_SERVICE.call('db', 'get', ['users', '123'])
 *   const result = await env.DO_SERVICE.call('ai', 'generateText', ['Hello world'])
 *
 * This worker does NOT have a public fetch handler. All interactions are via RPC.
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import type { Env, ServiceCall, ServiceCallResult, ServiceMetadata } from './types'

export default class DoService extends WorkerEntrypoint<Env> {
  /**
   * Call a function on any worker service
   *
   * @param serviceName - Name of the service (e.g., 'db', 'ai', 'auth')
   * @param methodName - Name of the RPC method to call
   * @param args - Arguments to pass to the method
   * @returns Result from the service method
   */
  async call(serviceName: string, methodName: string, args: any[] = []): Promise<any> {
    const startTime = Date.now()

    try {
      // Get service binding
      const service = this.getService(serviceName)
      if (!service) {
        throw new Error(`Service not found: ${serviceName}`)
      }

      // Check if method exists
      if (typeof service[methodName] !== 'function') {
        throw new Error(`Method not found: ${serviceName}.${methodName}`)
      }

      // Call the method
      const result = await service[methodName](...args)

      // Log the call
      const duration = Date.now() - startTime
      this.logCall({
        service: serviceName,
        method: methodName,
        args,
        duration,
        success: true,
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.logCall({
        service: serviceName,
        method: methodName,
        args,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  /**
   * Batch call multiple functions in parallel
   *
   * @param calls - Array of service calls
   * @returns Array of results (same order as calls)
   */
  async batchCall(calls: ServiceCall[]): Promise<ServiceCallResult[]> {
    const promises = calls.map(async call => {
      try {
        const result = await this.call(call.service, call.method, call.args)
        return {
          success: true,
          result,
        } as ServiceCallResult
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        } as ServiceCallResult
      }
    })

    return Promise.all(promises)
  }

  /**
   * Get metadata about all available services
   */
  async getServices(): Promise<ServiceMetadata[]> {
    const services: ServiceMetadata[] = []

    // Core services
    this.addServiceMetadata(services, 'db', 'DB_SERVICE', 'Database abstraction layer')
    this.addServiceMetadata(services, 'auth', 'AUTH_SERVICE', 'Authentication and authorization')
    this.addServiceMetadata(services, 'schedule', 'SCHEDULE_SERVICE', 'Cron jobs and scheduled tasks')
    this.addServiceMetadata(services, 'webhooks', 'WEBHOOKS_SERVICE', 'External webhooks')
    this.addServiceMetadata(services, 'email', 'EMAIL_SERVICE', 'Transactional emails')
    this.addServiceMetadata(services, 'mcp', 'MCP_SERVICE', 'Model Context Protocol server')
    this.addServiceMetadata(services, 'queue', 'QUEUE_SERVICE', 'Message queue processing')

    // AI services
    this.addServiceMetadata(services, 'ai', 'AI_SERVICE', 'AI generation service')
    this.addServiceMetadata(services, 'embeddings', 'EMBEDDINGS_SERVICE', 'Text embeddings')

    // Domain services
    this.addServiceMetadata(services, 'agents', 'AGENTS_SERVICE', 'AI agents')
    this.addServiceMetadata(services, 'workflows', 'WORKFLOWS_SERVICE', 'Workflow orchestration')
    this.addServiceMetadata(services, 'business', 'BUSINESS_SERVICE', 'Business logic')

    // Integration services
    this.addServiceMetadata(services, 'stripe', 'STRIPE_SERVICE', 'Stripe payment integration')
    this.addServiceMetadata(services, 'github', 'GITHUB_SERVICE', 'GitHub integration')

    return services.filter(s => s.available)
  }

  /**
   * Get metadata about a specific service
   */
  async getService(serviceName: string): Promise<any | null> {
    const bindingName = this.getBindingName(serviceName)
    if (!bindingName) return null

    return this.env[bindingName] || null
  }

  /**
   * Check if a service is available
   */
  async isServiceAvailable(serviceName: string): Promise<boolean> {
    const service = await this.getService(serviceName)
    return service !== null
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string; timestamp: string; services: number }> {
    const services = await this.getServices()
    const availableCount = services.filter(s => s.available).length

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: availableCount,
    }
  }

  // ==================== Private Methods ====================

  private getBindingName(serviceName: string): string | null {
    const bindings: Record<string, string> = {
      // Core services
      db: 'DB_SERVICE',
      auth: 'AUTH_SERVICE',
      schedule: 'SCHEDULE_SERVICE',
      webhooks: 'WEBHOOKS_SERVICE',
      email: 'EMAIL_SERVICE',
      mcp: 'MCP_SERVICE',
      queue: 'QUEUE_SERVICE',
      waitlist: 'WAITLIST_SERVICE',

      // AI services
      ai: 'AI_SERVICE',
      embeddings: 'EMBEDDINGS_SERVICE',

      // Domain services
      agents: 'AGENTS_SERVICE',
      workflows: 'WORKFLOWS_SERVICE',
      business: 'BUSINESS_SERVICE',

      // Integration services
      stripe: 'STRIPE_SERVICE',
      github: 'GITHUB_SERVICE',
      anthropic: 'ANTHROPIC_SERVICE',
    }

    return bindings[serviceName] || null
  }

  private addServiceMetadata(
    services: ServiceMetadata[],
    name: string,
    binding: string,
    description: string
  ): void {
    const available = !!this.env[binding]
    services.push({
      name,
      binding,
      description,
      available,
      methods: available ? this.getServiceMethods(this.env[binding]) : [],
    })
  }

  private getServiceMethods(service: any): string[] {
    if (!service) return []

    const methods: string[] = []
    const proto = Object.getPrototypeOf(service)

    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key !== 'constructor' && typeof service[key] === 'function') {
        methods.push(key)
      }
    }

    return methods
  }

  private logCall(data: {
    service: string
    method: string
    args: any[]
    duration: number
    success: boolean
    error?: string
  }): void {
    console.log(
      JSON.stringify({
        type: 'rpc_call',
        timestamp: new Date().toISOString(),
        ...data,
      })
    )
  }
}

// Export SDK for easy usage
export { SDK } from './sdk'
