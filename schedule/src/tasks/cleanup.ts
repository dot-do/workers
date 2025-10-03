/**
 * Cleanup Tasks
 */

/**
 * Delete expired sessions (runs hourly)
 */
export async function cleanupExpiredSessions(env: Env) {
  const startTime = Date.now()

  try {
    // Query DB for expired sessions via RPC
    const db = env.DB as any // Service binding (RPC)
    const result = await db.query(`DELETE FROM sessions WHERE expires_at < datetime('now') RETURNING *`, {})

    const deletedCount = result?.results?.length || 0

    return {
      success: true,
      deletedCount,
      duration: Date.now() - startTime,
      message: `Deleted ${deletedCount} expired sessions`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Delete expired API keys (runs daily)
 */
export async function cleanupExpiredApiKeys(env: Env) {
  const startTime = Date.now()

  try {
    const db = env.DB as any // Service binding (RPC)
    const result = await db.query(`DELETE FROM api_keys WHERE expires_at < datetime('now') AND expires_at IS NOT NULL RETURNING *`, {})

    const deletedCount = result?.results?.length || 0

    return {
      success: true,
      deletedCount,
      duration: Date.now() - startTime,
      message: `Deleted ${deletedCount} expired API keys`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Delete old AI generations (runs weekly)
 * Keep only last 30 days of generations
 */
export async function cleanupOldGenerations(env: Env) {
  const startTime = Date.now()

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const db = env.DB as any // Service binding (RPC)
    const result = await db.query(`DELETE FROM generations WHERE created_at < ? AND status = 'completed' RETURNING *`, {
      '?': thirtyDaysAgo.toISOString(),
    })

    const deletedCount = result?.results?.length || 0

    return {
      success: true,
      deletedCount,
      duration: Date.now() - startTime,
      message: `Deleted ${deletedCount} old generations`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }
  }
}
