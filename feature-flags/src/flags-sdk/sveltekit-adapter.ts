/**
 * SvelteKit Adapter for OpenFeature Cloudflare Provider
 * Compatible with flags-sdk.dev
 */

import { OpenFeature, Client, EvaluationContext } from '@openfeature/server-sdk'
import { CloudflareWorkersProvider } from '../provider'
import type { CloudflareEnv } from '../provider/types'

export interface SvelteKitAdapterConfig {
  env: CloudflareEnv
  cacheTTL?: number
  enableAnalytics?: boolean
}

/**
 * SvelteKit Server-Side Adapter
 * Use in +page.server.ts, +server.ts, hooks.server.ts
 */
export class SvelteKitServerAdapter {
  private client: Client
  private provider: CloudflareWorkersProvider

  constructor(config: SvelteKitAdapterConfig) {
    this.provider = new CloudflareWorkersProvider({
      env: config.env,
      cacheTTL: config.cacheTTL,
      enableAnalytics: config.enableAnalytics,
    })

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
  async getBoolean(key: string, defaultValue: boolean, context?: EvaluationContext): Promise<boolean> {
    return await this.client.getBooleanValue(key, defaultValue, context)
  }

  /**
   * Get string flag
   */
  async getString(key: string, defaultValue: string, context?: EvaluationContext): Promise<string> {
    return await this.client.getStringValue(key, defaultValue, context)
  }

  /**
   * Get number flag
   */
  async getNumber(key: string, defaultValue: number, context?: EvaluationContext): Promise<number> {
    return await this.client.getNumberValue(key, defaultValue, context)
  }

  /**
   * Get object flag
   */
  async getObject<T extends object>(key: string, defaultValue: T, context?: EvaluationContext): Promise<T> {
    return (await this.client.getObjectValue(key, defaultValue, context)) as T
  }

  /**
   * Get flag details (with variant and reason)
   */
  async getDetails(key: string, defaultValue: any, context?: EvaluationContext) {
    const type = typeof defaultValue

    switch (type) {
      case 'boolean':
        return await this.client.getBooleanDetails(key, defaultValue, context)
      case 'string':
        return await this.client.getStringDetails(key, defaultValue, context)
      case 'number':
        return await this.client.getNumberDetails(key, defaultValue, context)
      case 'object':
        return await this.client.getObjectDetails(key, defaultValue, context)
      default:
        throw new Error(`Unsupported flag type: ${type}`)
    }
  }

  /**
   * Get all flags for client-side hydration
   */
  async getAllFlags(keys: string[], context?: EvaluationContext): Promise<Record<string, any>> {
    const flags: Record<string, any> = {}

    // This is a simplified implementation
    // In production, you'd fetch all flags in parallel
    for (const key of keys) {
      try {
        // Default to string type - in production, you'd know the types
        flags[key] = await this.getString(key, '', context)
      } catch (error) {
        console.error(`Error fetching flag ${key}:`, error)
      }
    }

    return flags
  }
}

/**
 * SvelteKit Load Function Helper
 * Use in +page.server.ts load functions
 */
export function createSvelteKitLoadHelper(adapter: SvelteKitServerAdapter) {
  return {
    /**
     * Get flags for load function
     */
    async getFlags(context?: EvaluationContext) {
      return {
        getBoolean: (key: string, defaultValue: boolean) => adapter.getBoolean(key, defaultValue, context),
        getString: (key: string, defaultValue: string) => adapter.getString(key, defaultValue, context),
        getNumber: (key: string, defaultValue: number) => adapter.getNumber(key, defaultValue, context),
        getObject: <T extends object>(key: string, defaultValue: T) => adapter.getObject(key, defaultValue, context),
      }
    },

    /**
     * Get flags with details for debugging
     */
    async getFlagsWithDetails(keys: string[], context?: EvaluationContext) {
      const flags: Record<string, any> = {}

      for (const key of keys) {
        try {
          flags[key] = await adapter.getDetails(key, null, context)
        } catch (error) {
          console.error(`Error fetching flag ${key}:`, error)
        }
      }

      return flags
    },
  }
}

/**
 * Helper function to create adapter in SvelteKit
 */
export function createSvelteKitAdapter(env: CloudflareEnv): SvelteKitServerAdapter {
  return new SvelteKitServerAdapter({ env })
}

/**
 * Example usage in +page.server.ts:
 *
 * import { createSvelteKitAdapter } from '@dot-do/openfeature-cloudflare-provider/flags-sdk'
 *
 * export async function load({ platform, locals }) {
 *   const adapter = createSvelteKitAdapter(platform.env)
 *   await adapter.initialize()
 *
 *   const context = {
 *     targetingKey: locals.userId,
 *     email: locals.email,
 *   }
 *
 *   const showNewFeature = await adapter.getBoolean('new-feature', false, context)
 *   const theme = await adapter.getString('ui-theme', 'light', context)
 *
 *   return {
 *     showNewFeature,
 *     theme,
 *   }
 * }
 */
