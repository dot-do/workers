/**
 * sdk.as - Generate and manage SDKs
 *
 * Create type-safe SDKs for any API automatically.
 * sdk.as/my-api, sdk.as/typescript, sdk.as/python
 *
 * @see https://sdk.as
 *
 * @example
 * ```typescript
 * import { sdk } from 'sdk.as'
 *
 * // Generate SDK from OpenAPI
 * const generated = await sdk.generate({
 *   source: 'https://api.example.com/openapi.json',
 *   language: 'typescript',
 *   name: 'my-api-sdk'
 * })
 *
 * // Publish to npm
 * await sdk.publish('my-api-sdk', { registry: 'npm' })
 *
 * // Get usage stats
 * const stats = await sdk.stats('my-api-sdk')
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export type Language = 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java' | 'csharp' | 'ruby' | 'php' | 'swift' | 'kotlin'

export interface GenerateConfig {
  /** SDK name */
  name: string
  /** Source (OpenAPI URL/spec, GraphQL schema, or API URL) */
  source: string | Record<string, unknown>
  /** Target language */
  language: Language
  /** Package name override */
  packageName?: string
  /** Version */
  version?: string
  /** Include runtime validation */
  validation?: boolean
  /** Generate async/streaming methods */
  async?: boolean
  /** Custom templates */
  templates?: Record<string, string>
  /** Output style */
  style?: 'functional' | 'class' | 'fluent'
}

export interface Sdk {
  id: string
  name: string
  language: Language
  packageName: string
  version: string
  status: 'generating' | 'ready' | 'published' | 'failed'
  downloadUrl: string
  previewUrl: string
  createdAt: Date
  updatedAt: Date
}

export interface GeneratedFile {
  path: string
  content: string
  language: string
}

export interface GenerateResult {
  sdk: Sdk
  files: GeneratedFile[]
  installCommand: string
  usageExample: string
}

export interface PublishConfig {
  /** Target registry */
  registry: 'npm' | 'pypi' | 'crates' | 'maven' | 'nuget' | 'rubygems' | 'packagist'
  /** Registry credentials (or use env vars) */
  token?: string
  /** Access level */
  access?: 'public' | 'private'
  /** Tag */
  tag?: string
}

export interface PublishResult {
  registry: string
  packageName: string
  version: string
  url: string
  publishedAt: Date
}

export interface SdkStats {
  downloads: number
  weeklyDownloads: number
  versions: number
  dependents: number
  lastPublished: Date
}

export interface SdkVersion {
  version: string
  language: Language
  publishedAt: Date
  downloads: number
  changelog?: string
}

// Client interface
export interface SdkAsClient {
  /**
   * Generate an SDK
   */
  generate(config: GenerateConfig): Promise<GenerateResult>

  /**
   * Get SDK details
   */
  get(name: string): Promise<Sdk>

  /**
   * List all SDKs
   */
  list(options?: { language?: Language; status?: Sdk['status']; limit?: number }): Promise<Sdk[]>

  /**
   * Update SDK configuration and regenerate
   */
  update(name: string, config: Partial<GenerateConfig>): Promise<GenerateResult>

  /**
   * Delete an SDK
   */
  delete(name: string): Promise<void>

  /**
   * Publish SDK to a registry
   */
  publish(name: string, config: PublishConfig): Promise<PublishResult>

  /**
   * Get publish history
   */
  publishes(name: string): Promise<PublishResult[]>

  /**
   * Get SDK stats
   */
  stats(name: string): Promise<SdkStats>

  /**
   * List SDK versions
   */
  versions(name: string): Promise<SdkVersion[]>

  /**
   * Download SDK as zip
   */
  download(name: string, version?: string): Promise<ArrayBuffer>

  /**
   * Preview SDK files
   */
  preview(name: string): Promise<GeneratedFile[]>

  /**
   * Validate source schema
   */
  validate(source: string | Record<string, unknown>): Promise<{ valid: boolean; errors?: string[] }>

  /**
   * Get supported languages
   */
  languages(): Promise<Array<{ language: Language; features: string[] }>>

  /**
   * Generate SDK for multiple languages at once
   */
  generateAll(config: Omit<GenerateConfig, 'language'> & { languages: Language[] }): Promise<GenerateResult[]>

  /**
   * Watch source for changes and auto-regenerate
   */
  watch(name: string, source: string): Promise<{ watchId: string }>

  /**
   * Stop watching
   */
  unwatch(watchId: string): Promise<void>
}

/**
 * Create a configured sdk.as client
 */
export function Sdk(options?: ClientOptions): SdkAsClient {
  return createClient<SdkAsClient>('https://sdk.as', options)
}

/**
 * Default sdk.as client instance
 */
export const sdk: SdkAsClient = Sdk({
  apiKey: typeof process !== 'undefined' ? (process.env?.SDK_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const generate = (config: GenerateConfig) => sdk.generate(config)
export const publish = (name: string, config: PublishConfig) => sdk.publish(name, config)

export default sdk

// Re-export types
export type { ClientOptions } from 'rpc.do'
