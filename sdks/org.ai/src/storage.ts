import type { TokenStorage, StoredTokenData } from './types.js'

// Keychain service and account identifiers
const KEYCHAIN_SERVICE = 'org.ai'
const KEYCHAIN_ACCOUNT = 'access_token'

/**
 * Check if we're running in a Node.js environment
 */
function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null
}

/**
 * Safe environment variable access
 */
function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key]
  return undefined
}

/**
 * Keychain-based token storage using OS credential manager
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: Secret Service (libsecret)
 */
export class KeychainTokenStorage implements TokenStorage {
  private keytar: typeof import('keytar') | null = null
  private initialized = false

  private async getKeytar(): Promise<typeof import('keytar') | null> {
    if (this.initialized) {
      return this.keytar
    }

    this.initialized = true

    try {
      const imported = await import('keytar')
      const keytarModule = (imported as any).default || imported
      this.keytar = keytarModule as typeof import('keytar')

      if (typeof this.keytar.getPassword !== 'function') {
        if (getEnv('DEBUG')) {
          console.warn('Keytar module loaded but getPassword is not a function')
        }
        this.keytar = null
        return null
      }

      return this.keytar
    } catch (error) {
      if (getEnv('DEBUG')) {
        console.warn('Keychain storage not available:', error)
      }
      return null
    }
  }

  async getToken(): Promise<string | null> {
    const keytar = await this.getKeytar()
    if (!keytar) return null

    try {
      return await keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
    } catch (error) {
      if (getEnv('DEBUG')) {
        console.warn('Failed to get token from keychain:', error)
      }
      return null
    }
  }

  async setToken(token: string): Promise<void> {
    const keytar = await this.getKeytar()
    if (!keytar) {
      throw new Error('Keychain storage not available')
    }
    await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, token)
  }

  async removeToken(): Promise<void> {
    const keytar = await this.getKeytar()
    if (!keytar) return

    try {
      await keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
    } catch {
      // Ignore errors if credential doesn't exist
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const keytar = await this.getKeytar()
      if (!keytar) return false
      await keytar.getPassword(KEYCHAIN_SERVICE, '__test__')
      return true
    } catch {
      return false
    }
  }
}

/**
 * Secure file-based token storage
 * Stores token in ~/.org.ai/token with restricted permissions (0600)
 */
export class SecureFileTokenStorage implements TokenStorage {
  private tokenPath: string | null = null
  private configDir: string | null = null
  private initialized = false
  private customPath?: string

  constructor(customPath?: string) {
    this.customPath = customPath
  }

  private async init(): Promise<boolean> {
    if (this.initialized) return this.tokenPath !== null
    this.initialized = true

    if (!isNode()) return false

    try {
      const os = await import('os')
      const path = await import('path')

      if (this.customPath) {
        const expandedPath = this.customPath.startsWith('~/')
          ? path.join(os.homedir(), this.customPath.slice(2))
          : this.customPath

        this.tokenPath = expandedPath
        this.configDir = path.dirname(expandedPath)
      } else {
        this.configDir = path.join(os.homedir(), '.org.ai')
        this.tokenPath = path.join(this.configDir, 'token')
      }
      return true
    } catch {
      return false
    }
  }

  async getToken(): Promise<string | null> {
    const data = await this.getTokenData()
    if (data) return data.accessToken

    if (!(await this.init()) || !this.tokenPath) return null

    try {
      const fs = await import('fs/promises')
      const content = await fs.readFile(this.tokenPath, 'utf-8')
      const trimmed = content.trim()

      if (trimmed.startsWith('{')) {
        const data = JSON.parse(trimmed) as StoredTokenData
        return data.accessToken
      }

      return trimmed
    } catch {
      return null
    }
  }

  async setToken(token: string): Promise<void> {
    await this.setTokenData({ accessToken: token.trim() })
  }

  async getTokenData(): Promise<StoredTokenData | null> {
    if (!(await this.init()) || !this.tokenPath) return null

    try {
      const fs = await import('fs/promises')
      const content = await fs.readFile(this.tokenPath, 'utf-8')
      const trimmed = content.trim()

      if (trimmed.startsWith('{')) {
        return JSON.parse(trimmed) as StoredTokenData
      }

      return { accessToken: trimmed }
    } catch {
      return null
    }
  }

  async setTokenData(data: StoredTokenData): Promise<void> {
    if (!(await this.init()) || !this.tokenPath || !this.configDir) {
      throw new Error('File storage not available')
    }

    try {
      const fs = await import('fs/promises')
      await fs.mkdir(this.configDir, { recursive: true, mode: 0o700 })
      await fs.writeFile(this.tokenPath, JSON.stringify(data), { encoding: 'utf-8', mode: 0o600 })
      await fs.chmod(this.tokenPath, 0o600)
    } catch (error) {
      console.error('Failed to save token data:', error)
      throw error
    }
  }

  async removeToken(): Promise<void> {
    if (!(await this.init()) || !this.tokenPath) return

    try {
      const fs = await import('fs/promises')
      await fs.unlink(this.tokenPath)
    } catch {
      // Ignore errors if file doesn't exist
    }
  }
}

/**
 * In-memory token storage (for browser or testing)
 */
export class MemoryTokenStorage implements TokenStorage {
  private token: string | null = null

  async getToken(): Promise<string | null> {
    return this.token
  }

  async setToken(token: string): Promise<void> {
    this.token = token
  }

  async removeToken(): Promise<void> {
    this.token = null
  }
}

/**
 * LocalStorage-based token storage (for browser)
 */
export class LocalStorageTokenStorage implements TokenStorage {
  private key = 'org.ai:token'

  async getToken(): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(this.key)
  }

  async setToken(token: string): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available')
    }
    localStorage.setItem(this.key, token)
  }

  async removeToken(): Promise<void> {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(this.key)
  }
}

/**
 * Create the default token storage
 * - Node.js: Uses secure file storage (~/.org.ai/token)
 * - Browser: Uses localStorage
 * - Worker: Uses in-memory storage
 */
export function createSecureStorage(storagePath?: string): TokenStorage {
  if (isNode()) {
    return new SecureFileTokenStorage(storagePath)
  }

  if (typeof localStorage !== 'undefined') {
    return new LocalStorageTokenStorage()
  }

  return new MemoryTokenStorage()
}
