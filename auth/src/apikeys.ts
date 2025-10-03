/**
 * API Key Management
 * Handles generation, validation, and revocation of API keys
 */

import type { AuthServiceEnv, ApiKey, ApiKeyCreateInput, ApiKeyResponse, User } from './types'
import { generateApiKey, hashApiKey, verifyApiKey, generateUUID, getExpiryDate, isExpired, redactApiKey } from './utils'

/**
 * Generate a new API key for a user
 */
export async function createApiKey(env: AuthServiceEnv, input: ApiKeyCreateInput): Promise<{ key: string; apiKey: ApiKeyResponse }> {
  const { userId, name, expiresInDays, environment = 'live' } = input

  // Generate API key
  const { key, prefix } = generateApiKey(environment)

  // Hash key for storage
  const keyHash = await hashApiKey(key)

  const id = generateUUID()
  const now = new Date()
  const expiresAt = expiresInDays ? getExpiryDate(expiresInDays) : null

  // Store in database via DB service RPC
  await env.DB.execute({
    sql: `
      INSERT INTO api_keys (id, user_id, name, key_hash, prefix, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    params: [id, userId, name, keyHash, prefix, expiresAt?.toISOString() || null, now.toISOString(), now.toISOString()],
  })

  return {
    key, // Only returned on creation
    apiKey: {
      id,
      name,
      prefix,
      key, // Include full key in response (only time it's visible)
      lastUsedAt: null,
      expiresAt,
      createdAt: now,
    },
  }
}

/**
 * Validate API key and return associated user
 */
export async function validateApiKeyAndGetUser(env: AuthServiceEnv, key: string): Promise<User | null> {
  if (!key || (!key.startsWith('sk_live_') && !key.startsWith('sk_test_'))) {
    return null
  }

  try {
    // Get all API keys (need to check hashes)
    const result = await env.DB.query({
      sql: 'SELECT * FROM api_keys WHERE revoked_at IS NULL',
      params: [],
    })

    if (!result?.rows || result.rows.length === 0) {
      return null
    }

    // Find matching key by verifying hash
    let matchedApiKey: any = null
    for (const row of result.rows) {
      const isMatch = await verifyApiKey(key, row.key_hash as string)
      if (isMatch) {
        matchedApiKey = row
        break
      }
    }

    if (!matchedApiKey) {
      return null
    }

    // Check if key is expired
    if (matchedApiKey.expires_at && isExpired(new Date(matchedApiKey.expires_at))) {
      return null
    }

    // Update last used timestamp
    const now = new Date()
    await env.DB.execute({
      sql: 'UPDATE api_keys SET last_used_at = ?, updated_at = ? WHERE id = ?',
      params: [now.toISOString(), now.toISOString(), matchedApiKey.id],
    })

    // Get associated user
    const userResult = await env.DB.query({
      sql: 'SELECT * FROM users WHERE id = ? LIMIT 1',
      params: [matchedApiKey.user_id],
    })

    if (!userResult?.rows || userResult.rows.length === 0) {
      return null
    }

    const user = userResult.rows[0]

    return {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string | null,
      image: user.image as string | null,
      role: (user.role as 'admin' | 'user' | 'viewer') || 'user',
      emailVerified: user.email_verified as boolean,
      workosId: user.workos_id as string | undefined,
      organizationId: user.organization_id as string | undefined,
      createdAt: new Date(user.created_at as string),
      updatedAt: new Date(user.updated_at as string),
    }
  } catch (error) {
    console.error('API key validation error:', error)
    return null
  }
}

/**
 * List all API keys for a user
 */
export async function listUserApiKeys(env: AuthServiceEnv, userId: string): Promise<ApiKeyResponse[]> {
  const result = await env.DB.query({
    sql: 'SELECT * FROM api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC',
    params: [userId],
  })

  if (!result?.rows) {
    return []
  }

  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: new Date(row.created_at),
  }))
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(env: AuthServiceEnv, userId: string, keyId: string): Promise<boolean> {
  const now = new Date()

  const result = await env.DB.execute({
    sql: 'UPDATE api_keys SET revoked_at = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    params: [now.toISOString(), now.toISOString(), keyId, userId],
  })

  // Check if update was successful
  return result.changes > 0
}

/**
 * Get API key details (without hash)
 */
export async function getApiKey(env: AuthServiceEnv, keyId: string): Promise<ApiKeyResponse | null> {
  const result = await env.DB.query({
    sql: 'SELECT * FROM api_keys WHERE id = ? AND revoked_at IS NULL LIMIT 1',
    params: [keyId],
  })

  if (!result?.rows || result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]

  return {
    id: row.id as string,
    name: row.name as string,
    prefix: row.prefix as string,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at as string) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Delete API key permanently (admin only)
 */
export async function deleteApiKey(env: AuthServiceEnv, keyId: string): Promise<boolean> {
  const result = await env.DB.execute({
    sql: 'DELETE FROM api_keys WHERE id = ?',
    params: [keyId],
  })

  return result.changes > 0
}

/**
 * Clean up expired API keys (for scheduled task)
 */
export async function cleanupExpiredApiKeys(env: AuthServiceEnv): Promise<number> {
  const now = new Date()

  const result = await env.DB.execute({
    sql: 'DELETE FROM api_keys WHERE expires_at IS NOT NULL AND expires_at < ?',
    params: [now.toISOString()],
  })

  return result.changes || 0
}
