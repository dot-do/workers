/**
 * APIs Adapter - Test via apis.do SDK
 */

import type { TestAdapter } from './types'

export interface ApisAdapterOptions {
  baseUrl?: string
  apiKey?: string
  accessToken?: string
}

export class ApisAdapter implements TestAdapter {
  name = 'apis.do'
  private client: any
  private options: ApisAdapterOptions

  constructor(options: ApisAdapterOptions = {}) {
    this.options = {
      baseUrl: options.baseUrl || process.env.API_BASE_URL || 'https://api.do',
      apiKey: options.apiKey || process.env.API_KEY,
      accessToken: options.accessToken || process.env.ACCESS_TOKEN,
    }
  }

  async setup(): Promise<void> {
    // Dynamically import apis.do to avoid bundling issues
    try {
      const { createClient } = await import('apis.do')
      this.client = createClient(this.options)
    } catch (error) {
      throw new Error(`Failed to load apis.do: ${error}`)
    }

    // Verify connection
    try {
      await this.client.call('gateway.health', {})
    } catch (error) {
      throw new Error(`Failed to connect to API: ${error}`)
    }
  }

  async teardown(): Promise<void> {
    // Nothing to cleanup
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.call('gateway.health', {})
      return true
    } catch {
      return false
    }
  }

  async call(service: string, method: string, input: any): Promise<any> {
    if (!this.client) {
      throw new Error('Client not initialized. Call setup() first.')
    }

    const rpcMethod = `${service}.${method}`
    return await this.client.call(rpcMethod, input)
  }
}
