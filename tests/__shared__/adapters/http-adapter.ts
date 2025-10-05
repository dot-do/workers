/**
 * HTTP Adapter - Direct HTTP calls to worker endpoints
 */

import type { TestAdapter } from './types'

export interface HttpAdapterOptions {
  baseUrl?: string
  apiKey?: string
  accessToken?: string
}

export class HttpAdapter implements TestAdapter {
  name = 'http'
  private baseUrl: string
  private apiKey?: string
  private accessToken?: string

  constructor(options: HttpAdapterOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.API_BASE_URL || 'http://localhost:8787'
    this.apiKey = options.apiKey || process.env.API_KEY
    this.accessToken = options.accessToken || process.env.ACCESS_TOKEN
  }

  async setup(): Promise<void> {
    // Verify base URL is accessible
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
    } catch (error) {
      throw new Error(`Failed to connect to ${this.baseUrl}: ${error}`)
    }
  }

  async teardown(): Promise<void> {
    // Nothing to cleanup
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async call(service: string, method: string, input: any): Promise<any> {
    const url = `${this.baseUrl}/${service}/${method}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    } else if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    return await response.json()
  }
}
