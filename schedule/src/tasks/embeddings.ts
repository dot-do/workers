/**
 * Embeddings Tasks
 */

/**
 * Generate missing embeddings (runs daily)
 * Finds entities without embeddings and queues them for generation
 */
export async function generateMissingEmbeddings(env: Env) {
  const startTime = Date.now()

  try {
    // Query DB for entities without embeddings via RPC
    const db = env.DB as any // Service binding (RPC)
    const result = await db.query(
      `SELECT id, namespace, type, data FROM things
       WHERE embedding IS NULL
       AND type NOT IN ('session', 'api_key', 'log')
       LIMIT 100`,
      {}
    )

    const entities = result?.results || []
    let queuedCount = 0

    // Queue each entity for embedding generation
    const queue = env.QUEUE as any // Service binding (RPC)
    for (const entity of entities) {
      try {
        // Enqueue via Queue service
        await queue.enqueue({
          type: 'generate-embedding',
          payload: {
            id: entity.id,
            namespace: entity.namespace,
            type: entity.type,
            data: entity.data,
          },
          priority: 5, // Medium priority
        })
        queuedCount++
      } catch (error: any) {
        console.error(`Failed to queue entity ${entity.id}:`, error.message)
      }
    }

    return {
      success: true,
      found: entities.length,
      queuedCount,
      duration: Date.now() - startTime,
      message: `Queued ${queuedCount} entities for embedding generation`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }
  }
}
