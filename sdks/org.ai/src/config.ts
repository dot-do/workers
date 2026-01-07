import type { OrgConfig } from './types.js'

/**
 * Safe environment variable access (works in Node, browser, and Workers)
 */
function getEnv(key: string): string | undefined {
  // Check globalThis first (Workers)
  if ((globalThis as any)[key]) return (globalThis as any)[key]
  // Check process.env (Node.js)
  if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key]
  return undefined
}

/**
 * Global org.ai configuration
 */
let globalConfig: Omit<Required<OrgConfig>, 'storagePath'> & Pick<OrgConfig, 'storagePath'> = {
  apiUrl: getEnv('ORG_AI_API_URL') || getEnv('API_URL') || 'https://id.org.ai',
  clientId: getEnv('ORG_AI_CLIENT_ID') || getEnv('OAUTH_CLIENT_ID') || '',
  authKitDomain: getEnv('ORG_AI_AUTHKIT_DOMAIN') || 'login.org.ai',
  fetch: globalThis.fetch,
  storagePath: getEnv('ORG_AI_STORAGE_PATH'),
}

/**
 * Configure org.ai settings
 */
export function configure(config: OrgConfig): void {
  globalConfig = {
    ...globalConfig,
    ...config,
  }
}

/**
 * Get current configuration
 */
export function getConfig(): Omit<Required<OrgConfig>, 'storagePath'> & Pick<OrgConfig, 'storagePath'> {
  return globalConfig
}
