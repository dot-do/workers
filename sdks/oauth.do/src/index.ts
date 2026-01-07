/**
 * oauth.do - OAuth authentication SDK and CLI for .do Platform
 *
 * This is the browser-safe entry point.
 * For CLI utilities that open the browser, import from 'oauth.do/node'
 *
 * @packageDocumentation
 */

// Re-export core auth from org.ai
export {
  auth,
  getUser,
  getToken,
  isAuthenticated,
  buildAuthUrl,
  refreshAccessToken,
  getStoredTokenData,
  storeTokenData,
  type AuthProvider,
} from 'org.ai'

// Re-export configuration from org.ai
export { configure, getConfig } from 'org.ai/config'

// Re-export storage from org.ai
export {
  createSecureStorage,
  SecureFileTokenStorage,
  MemoryTokenStorage,
  LocalStorageTokenStorage,
  KeychainTokenStorage,
} from 'org.ai/storage'

// Re-export types from org.ai
export type {
  OrgConfig as OAuthConfig,
  User,
  AuthResult,
  DeviceAuthorizationResponse,
  TokenResponse,
  TokenError,
  StoredTokenData,
  TokenStorage,
} from 'org.ai/types'

// OAuth-specific: Device flow
export { authorizeDevice, pollForTokens } from './device.js'
export type { OAuthProvider, DeviceAuthOptions } from './device.js'

// OAuth-specific: GitHub Device Flow
export { startGitHubDeviceFlow, pollGitHubDeviceFlow, getGitHubUser } from './github-device.js'
export type { GitHubDeviceFlowOptions, GitHubDeviceAuthResponse, GitHubTokenResponse, GitHubUser } from './github-device.js'

// Re-export login types only (not functions - they use 'open' package)
export type { LoginOptions, LoginResult } from './login.js'

// Legacy re-exports for backwards compatibility
export { login, logout } from './auth.js'
