/**
 * apps.as - Deploy and manage applications
 *
 * Build, deploy, and scale applications on the edge.
 * apps.as/my-app, apps.as/staging, apps.as/production
 *
 * @see https://apps.as
 *
 * @example
 * ```typescript
 * import { apps } from 'apps.as'
 *
 * // Deploy an app
 * const deployment = await apps.deploy({
 *   name: 'my-app',
 *   source: './dist',
 *   env: { API_KEY: 'xxx' }
 * })
 *
 * // Get app status
 * const status = await apps.status('my-app')
 *
 * // Scale app
 * await apps.scale('my-app', { instances: 3 })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface AppConfig {
  /** App name/slug */
  name: string
  /** Display name */
  displayName?: string
  /** Source directory or URL */
  source?: string
  /** Environment variables */
  env?: Record<string, string>
  /** Custom domain */
  domain?: string
  /** Build command */
  build?: string
  /** Start command */
  start?: string
  /** Framework preset */
  framework?: 'vite' | 'next' | 'remix' | 'astro' | 'static' | 'worker'
  /** Region preferences */
  regions?: string[]
}

export interface App {
  id: string
  name: string
  displayName?: string
  status: 'running' | 'stopped' | 'deploying' | 'failed'
  url: string
  domains: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Deployment {
  id: string
  appId: string
  version: string
  status: 'pending' | 'building' | 'deploying' | 'live' | 'failed' | 'rolled-back'
  url: string
  logs: string[]
  createdAt: Date
  completedAt?: Date
}

export interface AppMetrics {
  requests: number
  bandwidth: number
  errors: number
  latencyP50: number
  latencyP99: number
  period: string
}

export interface ScaleConfig {
  /** Number of instances */
  instances?: number
  /** Auto-scale min */
  minInstances?: number
  /** Auto-scale max */
  maxInstances?: number
  /** CPU threshold for scaling */
  cpuThreshold?: number
}

export interface LogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  metadata?: Record<string, unknown>
}

// Client interface
export interface AppsAsClient {
  /**
   * Deploy an application
   */
  deploy(config: AppConfig): Promise<Deployment>

  /**
   * Get app details
   */
  get(name: string): Promise<App>

  /**
   * List all apps
   */
  list(options?: { status?: App['status']; limit?: number }): Promise<App[]>

  /**
   * Get app status
   */
  status(name: string): Promise<App['status']>

  /**
   * Scale an app
   */
  scale(name: string, config: ScaleConfig): Promise<App>

  /**
   * Stop an app
   */
  stop(name: string): Promise<App>

  /**
   * Start a stopped app
   */
  start(name: string): Promise<App>

  /**
   * Delete an app
   */
  delete(name: string): Promise<void>

  /**
   * Get app metrics
   */
  metrics(name: string, period?: '1h' | '24h' | '7d' | '30d'): Promise<AppMetrics>

  /**
   * Get deployment history
   */
  deployments(name: string, limit?: number): Promise<Deployment[]>

  /**
   * Rollback to a previous deployment
   */
  rollback(name: string, deploymentId: string): Promise<Deployment>

  /**
   * Get app logs
   */
  logs(name: string, options?: { follow?: boolean; tail?: number }): AsyncIterable<LogEntry>

  /**
   * Set environment variables
   */
  setEnv(name: string, env: Record<string, string>): Promise<App>

  /**
   * Add a custom domain
   */
  addDomain(name: string, domain: string): Promise<App>

  /**
   * Remove a custom domain
   */
  removeDomain(name: string, domain: string): Promise<App>
}

/**
 * Create a configured apps.as client
 */
export function Apps(options?: ClientOptions): AppsAsClient {
  return createClient<AppsAsClient>('https://apps.as', options)
}

/**
 * Default apps.as client instance
 */
export const apps: AppsAsClient = Apps({
  apiKey: typeof process !== 'undefined' ? (process.env?.APPS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const deploy = (config: AppConfig) => apps.deploy(config)
export const list = (options?: { status?: App['status']; limit?: number }) => apps.list(options)

export default apps

// Re-export types
export type { ClientOptions } from 'rpc.do'
