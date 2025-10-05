/**
 * RPC Adapter - Direct service binding calls (for local testing)
 */

import type { TestAdapter } from './types'

export interface RpcAdapterOptions {
  env?: any
  setupEnv?: () => Promise<any>
}

export class RpcAdapter implements TestAdapter {
  name = 'rpc.do'
  private env: any
  private options: RpcAdapterOptions

  constructor(options: RpcAdapterOptions = {}) {
    this.options = options
    this.env = options.env
  }

  async setup(): Promise<void> {
    if (!this.env && this.options.setupEnv) {
      this.env = await this.options.setupEnv()
    }

    if (!this.env) {
      throw new Error('No environment provided. Use setupEnv or pass env in constructor.')
    }

    // Verify service bindings exist
    const requiredBindings = ['GATEWAY_SERVICE', 'DB_SERVICE', 'AUTH_SERVICE']
    for (const binding of requiredBindings) {
      if (!this.env[binding]) {
        throw new Error(`Missing required binding: ${binding}`)
      }
    }
  }

  async teardown(): Promise<void> {
    // Nothing to cleanup
  }

  async isAvailable(): Promise<boolean> {
    return this.env != null
  }

  async call(service: string, method: string, input: any): Promise<any> {
    if (!this.env) {
      throw new Error('Environment not initialized. Call setup() first.')
    }

    // Convert service name to binding name (e.g., 'gateway' -> 'GATEWAY_SERVICE')
    const bindingName = `${service.toUpperCase()}_SERVICE`
    const serviceBinding = this.env[bindingName]

    if (!serviceBinding) {
      throw new Error(`Service binding not found: ${bindingName}`)
    }

    // Call the method directly on the service
    if (typeof serviceBinding[method] !== 'function') {
      throw new Error(`Method not found: ${service}.${method}`)
    }

    return await serviceBinding[method](input)
  }
}
