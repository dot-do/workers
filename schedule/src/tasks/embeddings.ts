/**
 * Embeddings Tasks
 */

/**
 * Generate missing embeddings (runs daily)
 * Finds entities without embeddings and queues them for generation
 * Uses ClickHouse vector search backend
 */
export async function generateMissingEmbeddings(env: Env) {
  const startTime = Date.now()

  try {
    // Query ClickHouse for entities without embeddings via RPC
    const db = env.DB as any // Service binding (RPC)
    const entities = await db.getEntitiesWithoutEmbeddings({
      limit: 100,
      model: 'workers-ai', // Use Workers AI by default (free, 768 dimensions)
    })

    let queuedCount = 0

    // Queue each entity for embedding generation
    const queue = env.QUEUE as any // Service binding (RPC)
    for (const entity of entities) {
      try {
        // Enqueue via Queue service
        await queue.enqueue({
          type: 'generate-embedding',
          payload: {
            ns: entity.ns,
            id: entity.id,
            type: entity.type,
            content: entity.content,
            model: 'workers-ai',
          },
          priority: 5, // Medium priority
        })
        queuedCount++
      } catch (error: any) {
        console.error(`Failed to queue entity ${entity.ns}/${entity.id}:`, error.message)
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

/**
 * Generate missing chunk embeddings (runs daily)
 * Finds document chunks without embeddings and queues them for generation
 * Uses ClickHouse vector search backend
 */
export async function generateMissingChunkEmbeddings(env: Env) {
  const startTime = Date.now()

  try {
    // Query ClickHouse for chunks without embeddings via RPC
    const db = env.DB as any // Service binding (RPC)
    const chunks = await db.getChunksWithoutEmbeddings({
      limit: 100,
      model: 'workers-ai', // Use Workers AI by default (free, 768 dimensions)
    })

    let queuedCount = 0

    // Queue each chunk for embedding generation
    const queue = env.QUEUE as any // Service binding (RPC)
    for (const chunk of chunks) {
      try {
        // Enqueue via Queue service
        await queue.enqueue({
          type: 'generate-chunk-embedding',
          payload: {
            ns: chunk.ns,
            id: chunk.id,
            chunkIndex: chunk.chunkIndex,
            chunkText: chunk.chunkText,
            model: 'workers-ai',
          },
          priority: 5, // Medium priority
        })
        queuedCount++
      } catch (error: any) {
        console.error(`Failed to queue chunk ${chunk.ns}/${chunk.id}[${chunk.chunkIndex}]:`, error.message)
      }
    }

    return {
      success: true,
      found: chunks.length,
      queuedCount,
      duration: Date.now() - startTime,
      message: `Queued ${queuedCount} chunks for embedding generation`,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }
  }
}
