/**
 * Next.js Adapter for OpenFeature Cloudflare Provider
 * Compatible with flags-sdk.dev
 */

import { OpenFeature, Client, EvaluationContext } from '@openfeature/server-sdk'
import { CloudflareWorkersProvider } from '../provider'
import type { CloudflareEnv } from '../provider/types'

export interface NextJsAdapterConfig {
  env: CloudflareEnv
  cacheTTL?: number
  enableAnalytics?: boolean
}

/**
 * Next.js Server-Side Adapter
 * Use in API routes, Server Components, getServerSideProps
 */
export class NextJsServerAdapter {
  private client: Client
  private provider: CloudflareWorkersProvider

  constructor(config: NextJsAdapterConfig) {
    this.provider = new CloudflareWorkersProvider({
      env: config.env,
      cacheTTL: config.cacheTTL,
      enableAnalytics: config.enableAnalytics,
    })

    // Set provider and get client
    OpenFeature.setProvider(this.provider)
    this.client = OpenFeature.getClient()
  }

  /**
   * Initialize provider
   */
  async initialize(context?: EvaluationContext): Promise<void> {
    await this.provider.initialize(context)
  }

  /**
   * Get boolean flag
   */
  async getBooleanFlag(key: string, defaultValue: boolean, context?: EvaluationContext): Promise<boolean> {
    const result = await this.client.getBooleanValue(key, defaultValue, context)
    return result
  }

  /**
   * Get string flag
   */
  async getStringFlag(key: string, defaultValue: string, context?: EvaluationContext): Promise<string> {
    const result = await this.client.getStringValue(key, defaultValue, context)
    return result
  }

  /**
   * Get number flag
   */
  async getNumberFlag(key: string, defaultValue: number, context?: EvaluationContext): Promise<number> {
    const result = await this.client.getNumberValue(key, defaultValue, context)
    return result
  }

  /**
   * Get object flag
   */
  async getObjectFlag<T extends object>(key: string, defaultValue: T, context?: EvaluationContext): Promise<T> {
    const result = await this.client.getObjectValue(key, defaultValue, context)
    return result as T
  }

  /**
   * Get all flags for client-side hydration
   */
  async getAllFlags(context?: EvaluationContext): Promise<Record<string, any>> {
    // This would require additional implementation to fetch all flags
    // For now, return empty object
    return {}
  }
}

/**
 * Next.js Edge Config Adapter
 * Compatible with Vercel Edge Config and Cloudflare Workers
 */
export class NextJsEdgeAdapter extends NextJsServerAdapter {
  constructor(config: NextJsAdapterConfig) {
    super(config)
  }

  /**
   * Edge-optimized flag evaluation
   * Uses KV cache aggressively
   */
  async getFlag(key: string, defaultValue: any, context?: EvaluationContext): Promise<any> {
    const type = typeof defaultValue

    switch (type) {
      case 'boolean':
        return this.getBooleanFlag(key, defaultValue, context)
      case 'string':
        return this.getStringFlag(key, defaultValue, context)
      case 'number':
        return this.getNumberFlag(key, defaultValue, context)
      case 'object':
        return this.getObjectFlag(key, defaultValue, context)
      default:
        return defaultValue
    }
  }
}

/**
 * Helper function to create adapter in Next.js API routes
 */
export function createNextJsAdapter(env: CloudflareEnv): NextJsServerAdapter {
  return new NextJsServerAdapter({ env })
}

/**
 * Helper function for Next.js Edge Runtime
 */
export function createNextJsEdgeAdapter(env: CloudflareEnv): NextJsEdgeAdapter {
  return new NextJsEdgeAdapter({ env })
}

/**
 * React Server Component helper
 * Use in Next.js 13+ Server Components
 */
export async function getServerFlags(adapter: NextJsServerAdapter, context?: EvaluationContext) {
  return {
    getBoolean: (key: string, defaultValue: boolean) => adapter.getBooleanFlag(key, defaultValue, context),
    getString: (key: string, defaultValue: string) => adapter.getStringFlag(key, defaultValue, context),
    getNumber: (key: string, defaultValue: number) => adapter.getNumberFlag(key, defaultValue, context),
    getObject: <T extends object>(key: string, defaultValue: T) => adapter.getObjectFlag(key, defaultValue, context),
  }
}
