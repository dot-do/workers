/**
 * SDK - Type-safe wrappers for DO RPC proxy
 *
 * Provides typed interfaces for calling services through the DO worker.
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import type { Env } from './types'

export class SDK extends WorkerEntrypoint<Env> {
  /**
   * Get a typed proxy for a service
   *
   * Usage:
   *   const db = env.DO_SERVICE.sdk('db')
   *   const user = await db.get('users', '123')
   */
  async sdk<T = any>(serviceName: string): Promise<T> {
    const service = this.getService(serviceName)
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`)
    }

    return service as T
  }

  /**
   * Get DB service with type safety
   */
  get db() {
    return this.getService('db')
  }

  /**
   * Get Auth service with type safety
   */
  get auth() {
    return this.getService('auth')
  }

  /**
   * Get AI service with type safety
   */
  get ai() {
    return this.getService('ai')
  }

  /**
   * Get Embeddings service with type safety
   */
  get embeddings() {
    return this.getService('embeddings')
  }

  /**
   * Get Agents service with type safety
   */
  get agents() {
    return this.getService('agents')
  }

  /**
   * Get Workflows service with type safety
   */
  get workflows() {
    return this.getService('workflows')
  }

  private getService(serviceName: string): any {
    const bindingName = this.getBindingName(serviceName)
    if (!bindingName) {
      throw new Error(`Unknown service: ${serviceName}`)
    }

    const service = this.env[bindingName]
    if (!service) {
      throw new Error(`Service not available: ${serviceName}`)
    }

    return service
  }

  private getBindingName(serviceName: string): string | null {
    const bindings: Record<string, string> = {
      db: 'DB_SERVICE',
      auth: 'AUTH_SERVICE',
      schedule: 'SCHEDULE_SERVICE',
      webhooks: 'WEBHOOKS_SERVICE',
      email: 'EMAIL_SERVICE',
      mcp: 'MCP_SERVICE',
      queue: 'QUEUE_SERVICE',
      waitlist: 'WAITLIST_SERVICE',
      ai: 'AI_SERVICE',
      embeddings: 'EMBEDDINGS_SERVICE',
      agents: 'AGENTS_SERVICE',
      workflows: 'WORKFLOWS_SERVICE',
      business: 'BUSINESS_SERVICE',
      stripe: 'STRIPE_SERVICE',
      github: 'GITHUB_SERVICE',
    }

    return bindings[serviceName] || null
  }
}
