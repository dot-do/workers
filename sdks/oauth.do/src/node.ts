/**
 * oauth.do/node - Node.js-only utilities
 *
 * This entry point exports utilities that require Node.js APIs
 * (e.g., opening URLs in the system browser using child_process).
 *
 * DO NOT import this in browser or edge runtime environments.
 *
 * @packageDocumentation
 */

// Re-export browser-safe utilities for convenience
export * from './index.js'

// Export login utilities that use the 'open' package
export { ensureLoggedIn, forceLogin, ensureLoggedOut } from './login.js'
export type { LoginOptions, LoginResult, OAuthProvider } from './login.js'
