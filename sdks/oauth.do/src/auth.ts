/**
 * OAuth-specific login/logout functions
 *
 * These are OAuth-specific operations that call the /login and /logout endpoints.
 * For core auth utilities (getToken, getUser, isAuthenticated), use org.ai directly.
 */

import { getConfig, getToken } from 'org.ai'
import type { User, AuthResult } from 'org.ai/types'

/**
 * Safe environment variable access (works in Node, browser, and Workers)
 */
function getEnv(key: string): string | undefined {
  if ((globalThis as any)[key]) return (globalThis as any)[key]
  if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key]
  return undefined
}

/**
 * Initiate login flow
 * Calls POST /login endpoint
 *
 * @param credentials - Login credentials (email, password, etc.)
 * @returns Authentication result with user info and token
 */
export async function login(credentials: { email?: string; password?: string; [key: string]: unknown }): Promise<AuthResult> {
  const config = getConfig()

  try {
    const response = await config.fetch(`${config.apiUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`)
    }

    const data = (await response.json()) as { user: User; token: string }
    return { user: data.user, token: data.token }
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

/**
 * Logout current user
 * Calls POST /logout endpoint
 *
 * @param token - Optional authentication token (will use ORG_AI_TOKEN/DO_TOKEN env var if not provided)
 */
export async function logout(token?: string): Promise<void> {
  const config = getConfig()
  const authToken = token || (await getToken()) || getEnv('ORG_AI_TOKEN') || getEnv('DO_TOKEN') || ''

  if (!authToken) {
    return
  }

  try {
    const response = await config.fetch(`${config.apiUrl}/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn(`Logout warning: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Logout error:', error)
  }
}
