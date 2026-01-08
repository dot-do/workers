/**
 * CDCDO - Change Data Capture Durable Object
 *
 * Implements CDC pipeline for data synchronization with:
 * - Event batching with configurable size and time limits
 * - Parquet file generation with compression and partitioning
 * - Event ordering with sequence numbers
 * - Delivery guarantees (at-least-once, at-most-once, exactly-once)
 * - Consumer checkpoint management
 *
 * @see ARCHITECTURE.md CDC pipeline sections
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * CDC Pipeline configuration
 */
export interface CDCPipelineConfig {
  /** Pipeline identifier */
  id: string
  /** Human-readable name */
  name?: string
  /** Source systems to capture events from */
  sources: string[]
  /** Event types to capture (glob patterns supported) */
  eventTypes?: string[]
  /** Batch configuration */
  batching: BatchConfig
  /** Output configuration */
  output: OutputConfig
  /** Delivery guarantees */
  deliveryGuarantee: 'at-least-once' | 'at-most-once' | 'exactly-once'
  /** Whether pipeline is active */
  enabled: boolean
  /** Retry policy for delivery failures */
  retryPolicy?: RetryPolicy
}

/**
 * Batch configuration for event batching
 */
export interface BatchConfig {
  /** Maximum events per batch */
  maxSize: number
  /** Maximum time to wait before flushing (ms) */
  maxWaitMs: number
  /** Maximum batch size in bytes */
  maxBytes?: number
}

/**
 * Output configuration for CDC data
 */
export interface OutputConfig {
  /** Output format */
  format: 'parquet' | 'json' | 'avro'
  /** Compression algorithm */
  compression?: 'none' | 'snappy' | 'gzip' | 'zstd'
  /** Partition strategy */
  partitioning?: PartitionConfig
  /** R2 bucket path prefix */
  pathPrefix?: string
}

/**
 * Partition configuration
 */
export interface PartitionConfig {
  /** Partition by fields (e.g., ['source', 'type']) */
  fields?: string[]
  /** Time-based partitioning */
  timeField?: string
  /** Time granularity */
  timeGranularity?: 'hour' | 'day' | 'month'
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  /** Maximum retry attempts */
  maxRetries: number
  /** Initial backoff delay in ms */
  backoffMs: number
  /** Maximum backoff delay in ms */
  maxBackoffMs: number
}

/**
 * Batch status tracking
 */
export interface BatchStatus {
  /** Batch identifier */
  batchId: string
  /** Pipeline this batch belongs to */
  pipelineId: string
  /** Number of events in batch */
  eventCount: number
  /** Batch size in bytes */
  sizeBytes: number
  /** Batch creation timestamp */
  createdAt: number
  /** Batch flush timestamp */
  flushedAt?: number
  /** Output file path (if written) */
  outputPath?: string
  /** Batch status */
  status: 'pending' | 'flushing' | 'completed' | 'failed'
  /** Error message if failed */
  error?: string
  /** First event sequence number */
  firstSequence?: number
  /** Last event sequence number */
  lastSequence?: number
}

/**
 * Delivery acknowledgment
 */
export interface DeliveryAck {
  /** Event ID */
  eventId: string
  /** Acknowledgment status */
  status: 'acked' | 'nacked' | 'pending'
  /** Timestamp */
  timestamp: number
  /** Consumer ID */
  consumerId?: string
  /** Error if nacked */
  error?: string
  /** Retry count */
  retryCount?: number
}

/**
 * Consumer state
 */
export interface ConsumerState {
  /** Consumer identifier */
  consumerId: string
  /** Pipeline ID */
  pipelineId: string
  /** Last committed checkpoint */
  checkpoint: number
  /** Last acknowledgment timestamp */
  lastAckTimestamp: number
  /** Pending event count */
  pendingCount: number
  /** Acknowledged event count */
  ackedCount: number
  /** Negative acknowledged event count */
  nackedCount: number
}

/**
 * CDC statistics
 */
export interface CDCStats {
  /** Total events received */
  totalEventsReceived: number
  /** Total events processed */
  totalEventsProcessed: number
  /** Total batches created */
  totalBatches: number
  /** Total bytes written */
  totalBytesWritten: number
  /** Events pending in buffer */
  pendingEvents: number
  /** Average batch size */
  averageBatchSize: number
  /** Average latency (ms) */
  averageLatencyMs: number
  /** Error count */
  errorCount: number
  /** Last event timestamp */
  lastEventTimestamp?: number
}

/**
 * CDC Event structure
 */
export interface CDCEvent {
  /** Unique event identifier */
  id: string
  /** Event timestamp (Unix ms) */
  timestamp: number
  /** Source system/service */
  source: string
  /** Event type (e.g., "user.created", "order.updated") */
  type: string
  /** Event payload */
  data: Record<string, unknown>
  /** Optional metadata */
  metadata?: Record<string, unknown>
  /** Sequence number for ordering */
  sequenceNumber?: number
  /** Partition key for routing */
  partitionKey?: string
}

/**
 * Parquet file metadata
 */
export interface ParquetFileMetadata {
  path: string
  sizeBytes: number
  rowCount: number
  createdAt: number
  compression: string
  schema: ParquetSchema
  partitionValues?: Record<string, string>
}

/**
 * Parquet schema definition
 */
export interface ParquetSchema {
  fields: Array<{
    name: string
    type: 'string' | 'int64' | 'double' | 'boolean' | 'timestamp' | 'json'
    nullable: boolean
  }>
}

/**
 * Batch buffer state
 */
export interface BatchBuffer {
  eventCount: number
  sizeBytes: number
  oldestEventTimestamp?: number
  newestEventTimestamp?: number
}

/**
 * List options
 */
export interface ListOptions {
  limit?: number
  offset?: number
  status?: string
}

// ============================================================================
// Internal storage types
// ============================================================================

interface StoredEvent extends CDCEvent {
  _batchId?: string
  _ingestedAt: number
}

interface EventDeliveryState {
  eventId: string
  consumerId: string
  status: 'pending' | 'acked' | 'nacked'
  timestamp: number
  retryCount: number
  error?: string
}

// ============================================================================
// CDCDO Implementation
// ============================================================================

/**
 * CDCDO - Change Data Capture Durable Object
 */
export class CDCDO {
  private ctx: DurableObjectState
  private env: unknown

  // In-memory caches (will be hydrated from storage)
  private pipelines: Map<string, CDCPipelineConfig> = new Map()
  private eventBuffers: Map<string, StoredEvent[]> = new Map()
  private batchTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private sequences: Map<string, number> = new Map()
  private batches: Map<string, BatchStatus> = new Map()
  private parquetFiles: Map<string, ParquetFileMetadata> = new Map()
  private consumers: Map<string, Map<string, ConsumerState>> = new Map()
  private deliveryStates: Map<string, Map<string, EventDeliveryState>> = new Map()
  private globalStats: CDCStats = this.createEmptyStats()
  private pipelineStats: Map<string, CDCStats> = new Map()
  private seenEventIds: Map<string, Set<string>> = new Map() // For exactly-once dedup

  // Mutex for batch creation to prevent race conditions
  private batchCreationLock: Map<string, Promise<unknown>> = new Map()

  // RPC method registry
  private rpcMethods: Set<string> = new Set([
    'createPipeline',
    'getPipeline',
    'updatePipeline',
    'deletePipeline',
    'listPipelines',
    'enablePipeline',
    'disablePipeline',
    'ingestEvent',
    'ingestBatch',
    'getBatch',
    'listBatches',
    'flushBatch',
    'retryBatch',
    'createCDCBatch',
    'getEventsBySequence',
    'getLatestSequence',
    'setCheckpoint',
    'getCheckpoint',
    'commitCheckpoint',
    'acknowledgeEvent',
    'acknowledgeEvents',
    'negativeAck',
    'getPendingDeliveries',
    'getDeliveryStatus',
    'retryDelivery',
    'replayEvents',
    'replayForConsumer',
    'getStats',
    'generateParquet',
    'listParquetFiles',
    'getParquetMetadata',
    'readParquetFile',
    'deleteParquetFile',
    'registerConsumer',
    'unregisterConsumer',
    'getConsumerState',
    'listConsumers',
    'getBatchBuffer',
  ])

  constructor(ctx: DurableObjectState, env: unknown) {
    this.ctx = ctx
    this.env = env

    // Initialize from storage
    this.ctx.blockConcurrencyWhile(async () => {
      await this.hydrate()
    })
  }

  // ============================================================================
  // Storage Hydration
  // ============================================================================

  private async hydrate(): Promise<void> {
    const storage = this.ctx.storage

    // Load pipelines
    const pipelineEntries = await storage.list<CDCPipelineConfig>({ prefix: 'pipeline:' })
    for (const [key, config] of pipelineEntries) {
      const id = key.replace('pipeline:', '')
      this.pipelines.set(id, config)
      this.eventBuffers.set(id, [])
      this.consumers.set(id, new Map())
      this.deliveryStates.set(id, new Map())
      this.seenEventIds.set(id, new Set())
    }

    // Load sequences
    const seqEntries = await storage.list<number>({ prefix: 'seq:' })
    for (const [key, seq] of seqEntries) {
      const id = key.replace('seq:', '')
      this.sequences.set(id, seq)
    }

    // Load batches
    const batchEntries = await storage.list<BatchStatus>({ prefix: 'batch:' })
    for (const [key, batch] of batchEntries) {
      const id = key.replace('batch:', '')
      this.batches.set(id, batch)
    }

    // Load parquet file metadata
    const parquetEntries = await storage.list<ParquetFileMetadata>({ prefix: 'parquet:' })
    for (const [key, metadata] of parquetEntries) {
      const path = key.replace('parquet:', '')
      this.parquetFiles.set(path, metadata)
    }

    // Load consumers
    const consumerEntries = await storage.list<ConsumerState>({ prefix: 'consumer:' })
    for (const [key, state] of consumerEntries) {
      const [, pipelineId, consumerId] = key.split(':')
      if (pipelineId && consumerId) {
        if (!this.consumers.has(pipelineId)) {
          this.consumers.set(pipelineId, new Map())
        }
        this.consumers.get(pipelineId)!.set(consumerId, state)
      }
    }

    // Load stats
    const globalStats = await storage.get<CDCStats>('stats:global')
    if (globalStats) this.globalStats = globalStats

    const statsEntries = await storage.list<CDCStats>({ prefix: 'stats:pipeline:' })
    for (const [key, stats] of statsEntries) {
      const id = key.replace('stats:pipeline:', '')
      this.pipelineStats.set(id, stats)
    }

    // Load buffered events
    const eventEntries = await storage.list<StoredEvent>({ prefix: 'event:' })
    for (const [key, event] of eventEntries) {
      const parts = key.split(':')
      const pipelineId = parts[1]
      if (pipelineId && this.eventBuffers.has(pipelineId)) {
        this.eventBuffers.get(pipelineId)!.push(event)
      }
    }
  }

  private createEmptyStats(): CDCStats {
    return {
      totalEventsReceived: 0,
      totalEventsProcessed: 0,
      totalBatches: 0,
      totalBytesWritten: 0,
      pendingEvents: 0,
      averageBatchSize: 0,
      averageLatencyMs: 0,
      errorCount: 0,
    }
  }

  // ============================================================================
  // Pipeline Management
  // ============================================================================

  async createPipeline(config: CDCPipelineConfig): Promise<CDCPipelineConfig> {
    // Validate
    if (!config.sources || config.sources.length === 0) {
      throw new Error('Pipeline sources are required and cannot be empty')
    }

    if (config.batching.maxSize <= 0 || config.batching.maxWaitMs < 0) {
      throw new Error('Invalid batch configuration: maxSize must be positive and maxWaitMs non-negative')
    }

    // Auto-generate ID if not provided
    if (!config.id) {
      config.id = `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }

    // Set default compression if not specified
    if (!config.output.compression) {
      config.output.compression = 'snappy'
    }

    // Store
    this.pipelines.set(config.id, config)
    this.eventBuffers.set(config.id, [])
    this.sequences.set(config.id, 0)
    this.consumers.set(config.id, new Map())
    this.deliveryStates.set(config.id, new Map())
    this.seenEventIds.set(config.id, new Set())
    this.pipelineStats.set(config.id, this.createEmptyStats())

    await this.ctx.storage.put(`pipeline:${config.id}`, config)
    await this.ctx.storage.put(`seq:${config.id}`, 0)
    await this.ctx.storage.put(`stats:pipeline:${config.id}`, this.createEmptyStats())

    return config
  }

  async getPipeline(pipelineId: string): Promise<CDCPipelineConfig | null> {
    return this.pipelines.get(pipelineId) ?? null
  }

  async updatePipeline(pipelineId: string, updates: Partial<CDCPipelineConfig>): Promise<CDCPipelineConfig | null> {
    const existing = this.pipelines.get(pipelineId)
    if (!existing) return null

    const updated = { ...existing, ...updates, id: pipelineId }
    this.pipelines.set(pipelineId, updated)
    await this.ctx.storage.put(`pipeline:${pipelineId}`, updated)

    return updated
  }

  async deletePipeline(pipelineId: string): Promise<boolean> {
    if (!this.pipelines.has(pipelineId)) return false

    // Clear timer if exists
    const timer = this.batchTimers.get(pipelineId)
    if (timer) {
      clearTimeout(timer)
      this.batchTimers.delete(pipelineId)
    }

    this.pipelines.delete(pipelineId)
    this.eventBuffers.delete(pipelineId)
    this.sequences.delete(pipelineId)
    this.consumers.delete(pipelineId)
    this.deliveryStates.delete(pipelineId)
    this.seenEventIds.delete(pipelineId)
    this.pipelineStats.delete(pipelineId)

    await this.ctx.storage.delete(`pipeline:${pipelineId}`)
    await this.ctx.storage.delete(`seq:${pipelineId}`)
    await this.ctx.storage.delete(`stats:pipeline:${pipelineId}`)

    return true
  }

  async listPipelines(options?: ListOptions): Promise<CDCPipelineConfig[]> {
    let pipelines = Array.from(this.pipelines.values())

    if (options?.offset) {
      pipelines = pipelines.slice(options.offset)
    }
    if (options?.limit) {
      pipelines = pipelines.slice(0, options.limit)
    }

    return pipelines
  }

  async enablePipeline(pipelineId: string): Promise<boolean> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) return false

    pipeline.enabled = true
    this.pipelines.set(pipelineId, pipeline)
    await this.ctx.storage.put(`pipeline:${pipelineId}`, pipeline)
    return true
  }

  async disablePipeline(pipelineId: string): Promise<boolean> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) return false

    pipeline.enabled = false
    this.pipelines.set(pipelineId, pipeline)
    await this.ctx.storage.put(`pipeline:${pipelineId}`, pipeline)
    return true
  }

  // ============================================================================
  // Event Ingestion
  // ============================================================================

  async ingestEvent(pipelineId: string, event: CDCEvent): Promise<{ eventId: string; sequenceNumber: number }> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`)
    }

    if (!pipeline.enabled) {
      throw new Error(`Pipeline '${pipelineId}' is disabled and not accepting events`)
    }

    // Validate source
    if (!pipeline.sources.includes(event.source)) {
      throw new Error(`Source '${event.source}' is not allowed for pipeline '${pipelineId}'`)
    }

    // Exactly-once deduplication
    if (pipeline.deliveryGuarantee === 'exactly-once') {
      const seenIds = this.seenEventIds.get(pipelineId)!
      if (seenIds.has(event.id)) {
        // Return existing sequence number
        const buffer = this.eventBuffers.get(pipelineId)!
        const existing = buffer.find((e) => e.id === event.id)
        if (existing) {
          return { eventId: event.id, sequenceNumber: existing.sequenceNumber! }
        }
      }
      seenIds.add(event.id)
    }

    // Assign sequence number
    const currentSeq = this.sequences.get(pipelineId) ?? 0
    const newSeq = currentSeq + 1
    this.sequences.set(pipelineId, newSeq)
    await this.ctx.storage.put(`seq:${pipelineId}`, newSeq)

    // Store event
    const storedEvent: StoredEvent = {
      ...event,
      sequenceNumber: newSeq,
      _ingestedAt: Date.now(),
    }

    const buffer = this.eventBuffers.get(pipelineId)!
    buffer.push(storedEvent)
    await this.ctx.storage.put(`event:${pipelineId}:${newSeq}`, storedEvent)

    // Update stats
    this.updateStats(pipelineId, { eventsReceived: 1 })

    // Initialize delivery states for all consumers (at-least-once)
    if (pipeline.deliveryGuarantee === 'at-least-once') {
      const consumers = this.consumers.get(pipelineId)!
      const deliveryStates = this.deliveryStates.get(pipelineId)!
      for (const consumerId of consumers.keys()) {
        const stateKey = `${event.id}:${consumerId}`
        if (!deliveryStates.has(stateKey)) {
          deliveryStates.set(stateKey, {
            eventId: event.id,
            consumerId,
            status: 'pending',
            timestamp: Date.now(),
            retryCount: 0,
          })
        }
      }
    }

    // Check batch size limits and auto-flush if needed
    await this.checkAndFlush(pipelineId)

    // Set/reset batch timer
    this.resetBatchTimer(pipelineId)

    return { eventId: event.id, sequenceNumber: newSeq }
  }

  async ingestBatch(pipelineId: string, events: CDCEvent[]): Promise<{ eventIds: string[]; sequenceNumbers: number[] }> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`)
    }

    if (!pipeline.enabled) {
      throw new Error(`Pipeline '${pipelineId}' is disabled and not accepting events`)
    }

    // Validate all events first (atomic)
    for (const event of events) {
      if (!pipeline.sources.includes(event.source)) {
        throw new Error(`Source '${event.source}' is not allowed for pipeline '${pipelineId}'`)
      }
    }

    const eventIds: string[] = []
    const sequenceNumbers: number[] = []

    for (const event of events) {
      const result = await this.ingestEvent(pipelineId, event)
      eventIds.push(result.eventId)
      sequenceNumbers.push(result.sequenceNumber)
    }

    return { eventIds, sequenceNumbers }
  }

  private async checkAndFlush(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) return

    const buffer = this.eventBuffers.get(pipelineId)!
    const { maxSize, maxBytes } = pipeline.batching

    // Calculate current buffer size
    let currentBytes = 0
    for (const event of buffer) {
      currentBytes += JSON.stringify(event).length
    }

    // Check if we need to flush
    while (buffer.length >= maxSize || (maxBytes && currentBytes >= maxBytes)) {
      // Flush one batch worth
      const batchEvents = buffer.splice(0, maxSize)
      if (batchEvents.length === 0) break

      await this.createBatch(pipelineId, batchEvents)

      // Recalculate remaining buffer size
      currentBytes = 0
      for (const event of buffer) {
        currentBytes += JSON.stringify(event).length
      }
    }
  }

  private resetBatchTimer(pipelineId: string): void {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) return

    // Clear existing timer
    const existing = this.batchTimers.get(pipelineId)
    if (existing) {
      clearTimeout(existing)
    }

    // Set new timer
    const timer = setTimeout(async () => {
      await this.autoFlush(pipelineId)
    }, pipeline.batching.maxWaitMs)

    this.batchTimers.set(pipelineId, timer)
  }

  private async autoFlush(pipelineId: string): Promise<void> {
    const buffer = this.eventBuffers.get(pipelineId)
    if (!buffer || buffer.length === 0) return

    const events = buffer.splice(0, buffer.length)
    await this.createBatch(pipelineId, events)

    // Update stats
    const stats = this.pipelineStats.get(pipelineId)
    if (stats) {
      stats.pendingEvents = 0
      this.pipelineStats.set(pipelineId, stats)
    }
  }

  private async createBatch(pipelineId: string, events: StoredEvent[]): Promise<BatchStatus> {
    const batchId = `batch-${pipelineId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    let sizeBytes = 0
    for (const event of events) {
      sizeBytes += JSON.stringify(event).length
    }

    const batch: BatchStatus = {
      batchId,
      pipelineId,
      eventCount: events.length,
      sizeBytes,
      createdAt: Date.now(),
      status: 'pending',
      firstSequence: events[0]?.sequenceNumber,
      lastSequence: events[events.length - 1]?.sequenceNumber,
    }

    this.batches.set(batchId, batch)
    await this.ctx.storage.put(`batch:${batchId}`, batch)

    // Store batch events
    await this.ctx.storage.put(`batchEvents:${batchId}`, events)

    // Update stats
    this.updateStats(pipelineId, { batchCreated: true, bytesWritten: sizeBytes })

    return batch
  }

  // ============================================================================
  // Batch Management
  // ============================================================================

  async getBatch(batchId: string): Promise<(BatchStatus & { events: CDCEvent[] }) | null> {
    const batch = this.batches.get(batchId)
    if (!batch) return null

    // Retrieve batch events from storage
    const storedEvents = await this.ctx.storage.get<StoredEvent[]>(`batchEvents:${batchId}`)
    const events: CDCEvent[] = (storedEvents ?? []).map((e) => {
      const { _batchId, _ingestedAt, ...clean } = e
      return clean
    })

    return { ...batch, events }
  }

  async listBatches(pipelineId: string, options?: ListOptions): Promise<BatchStatus[]> {
    let batches = Array.from(this.batches.values()).filter((b) => b.pipelineId === pipelineId)

    if (options?.status) {
      batches = batches.filter((b) => b.status === options.status)
    }
    if (options?.offset) {
      batches = batches.slice(options.offset)
    }
    if (options?.limit) {
      batches = batches.slice(0, options.limit)
    }

    return batches
  }

  async flushBatch(pipelineId: string): Promise<BatchStatus> {
    const buffer = this.eventBuffers.get(pipelineId)
    if (!buffer || buffer.length === 0) {
      // Return empty batch status
      return {
        batchId: '',
        pipelineId,
        eventCount: 0,
        sizeBytes: 0,
        createdAt: Date.now(),
        status: 'completed',
      }
    }

    const events = buffer.splice(0, buffer.length)
    const batch = await this.createBatch(pipelineId, events)

    // Clear timer
    const timer = this.batchTimers.get(pipelineId)
    if (timer) {
      clearTimeout(timer)
      this.batchTimers.delete(pipelineId)
    }

    // Update pending events count
    const stats = this.pipelineStats.get(pipelineId)
    if (stats) {
      stats.pendingEvents = 0
      this.pipelineStats.set(pipelineId, stats)
    }

    return batch
  }

  async retryBatch(batchId: string): Promise<BatchStatus> {
    const batch = this.batches.get(batchId)
    if (!batch) {
      throw new Error(`Batch '${batchId}' not found`)
    }

    // Reset status
    batch.status = 'pending'
    batch.error = undefined
    this.batches.set(batchId, batch)
    await this.ctx.storage.put(`batch:${batchId}`, batch)

    return batch
  }

  async getBatchBuffer(pipelineId: string): Promise<BatchBuffer> {
    const buffer = this.eventBuffers.get(pipelineId) ?? []

    let sizeBytes = 0
    let oldestEventTimestamp: number | undefined
    let newestEventTimestamp: number | undefined

    for (const event of buffer) {
      sizeBytes += JSON.stringify(event).length
      if (!oldestEventTimestamp || event._ingestedAt < oldestEventTimestamp) {
        oldestEventTimestamp = event._ingestedAt
      }
      if (!newestEventTimestamp || event._ingestedAt > newestEventTimestamp) {
        newestEventTimestamp = event._ingestedAt
      }
    }

    return {
      eventCount: buffer.length,
      sizeBytes,
      oldestEventTimestamp,
      newestEventTimestamp,
    }
  }

  // ============================================================================
  // CDC Batch Creation with Transaction Locking
  // ============================================================================

  /**
   * Create a CDC batch for events in the specified pipeline.
   * Uses transaction locking to prevent race conditions when multiple
   * concurrent callers attempt to create batches simultaneously.
   *
   * Key guarantees:
   * - No duplicate batches for the same events
   * - No events missed between concurrent batch creations
   * - No events duplicated across concurrent batches
   * - Sequence numbers remain monotonic and gapless
   */
  async createCDCBatch(
    pipelineId: string,
    options?: {
      fromTimestamp?: number
      toTimestamp?: number
      maxEvents?: number
    }
  ): Promise<{
    batchId: string
    pipelineId: string
    eventCount: number
    events: CDCEvent[]
    fromSequence: number
    toSequence: number
    createdAt: number
  }> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`)
    }

    // Acquire lock for this pipeline's batch creation
    // This ensures only one batch creation happens at a time per pipeline
    const existingLock = this.batchCreationLock.get(pipelineId)
    if (existingLock) {
      // Wait for existing operation to complete before starting ours
      await existingLock
    }

    // Create a new lock promise for this operation
    let releaseLock: () => void
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve
    })
    this.batchCreationLock.set(pipelineId, lockPromise)

    try {
      // Use storage transaction for atomic batch creation
      return await this.ctx.storage.transaction(async (txn) => {
        return this.createCDCBatchInternal(pipelineId, options, txn)
      })
    } finally {
      // Release the lock
      releaseLock!()
      // Only clear if this is still our lock
      if (this.batchCreationLock.get(pipelineId) === lockPromise) {
        this.batchCreationLock.delete(pipelineId)
      }
    }
  }

  /**
   * Internal implementation of batch creation, runs within a transaction
   */
  private async createCDCBatchInternal(
    pipelineId: string,
    options: {
      fromTimestamp?: number
      toTimestamp?: number
      maxEvents?: number
    } | undefined,
    txn: DurableObjectState['storage']
  ): Promise<{
    batchId: string
    pipelineId: string
    eventCount: number
    events: CDCEvent[]
    fromSequence: number
    toSequence: number
    createdAt: number
  }> {
    const maxEvents = options?.maxEvents ?? Number.MAX_SAFE_INTEGER
    const fromTimestamp = options?.fromTimestamp ?? 0
    const toTimestamp = options?.toTimestamp ?? Number.MAX_SAFE_INTEGER

    // Get all unbatched events for this pipeline
    const eventEntries = await txn.list<StoredEvent>({ prefix: `event:${pipelineId}:` })

    // Filter and sort events
    const eligibleEvents: StoredEvent[] = []
    for (const [key, event] of eventEntries) {
      // Skip if already batched
      if (event._batchId) continue

      // Filter by timestamp if specified
      if (event.timestamp < fromTimestamp || event.timestamp > toTimestamp) continue

      eligibleEvents.push(event)
    }

    // Sort by sequence number for consistent ordering
    eligibleEvents.sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0))

    // Limit to maxEvents
    const eventsToProcess = eligibleEvents.slice(0, maxEvents)

    // Return empty batch if no events
    if (eventsToProcess.length === 0) {
      return {
        batchId: '',
        pipelineId,
        eventCount: 0,
        events: [],
        fromSequence: 0,
        toSequence: 0,
        createdAt: Date.now(),
      }
    }

    // Generate batch ID
    const batchId = `batch-${pipelineId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const createdAt = Date.now()

    // Calculate batch metrics
    let sizeBytes = 0
    for (const event of eventsToProcess) {
      sizeBytes += JSON.stringify(event).length
    }

    const fromSequence = eventsToProcess[0]!.sequenceNumber ?? 0
    const toSequence = eventsToProcess[eventsToProcess.length - 1]!.sequenceNumber ?? 0

    // Mark events as batched atomically
    const updates: Record<string, StoredEvent> = {}
    for (const event of eventsToProcess) {
      event._batchId = batchId
      updates[`event:${pipelineId}:${event.sequenceNumber}`] = event
    }
    await txn.put(updates)

    // Create batch record
    const batch: BatchStatus = {
      batchId,
      pipelineId,
      eventCount: eventsToProcess.length,
      sizeBytes,
      createdAt,
      status: 'pending',
      firstSequence: fromSequence,
      lastSequence: toSequence,
    }

    // Store batch metadata
    await txn.put(`batch:${batchId}`, batch)
    await txn.put(`batchEvents:${batchId}`, eventsToProcess)

    // Update in-memory state
    this.batches.set(batchId, batch)

    // Remove from event buffer if present
    const buffer = this.eventBuffers.get(pipelineId)
    if (buffer) {
      const batchedIds = new Set(eventsToProcess.map((e) => e.id))
      const remaining = buffer.filter((e) => !batchedIds.has(e.id))
      this.eventBuffers.set(pipelineId, remaining)
    }

    // Update stats
    this.updateStats(pipelineId, {
      eventsProcessed: eventsToProcess.length,
      batchCreated: true,
      bytesWritten: sizeBytes,
    })

    // Return batch with events (strip internal fields)
    const cleanEvents: CDCEvent[] = eventsToProcess.map((e) => {
      const { _batchId, _ingestedAt, ...clean } = e
      return clean
    })

    return {
      batchId,
      pipelineId,
      eventCount: eventsToProcess.length,
      events: cleanEvents,
      fromSequence,
      toSequence,
      createdAt,
    }
  }

  // ============================================================================
  // Event Ordering
  // ============================================================================

  async getEventsBySequence(pipelineId: string, startSequence: number, endSequence: number): Promise<CDCEvent[]> {
    const events: CDCEvent[] = []

    for (let seq = startSequence; seq <= endSequence; seq++) {
      const event = await this.ctx.storage.get<StoredEvent>(`event:${pipelineId}:${seq}`)
      if (event) {
        events.push(event)
      }
    }

    return events.sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0))
  }

  async getLatestSequence(pipelineId: string): Promise<number> {
    return this.sequences.get(pipelineId) ?? 0
  }

  async setCheckpoint(pipelineId: string, consumerId: string, sequenceNumber: number): Promise<void> {
    const consumerMap = this.consumers.get(pipelineId)
    if (!consumerMap) {
      throw new Error(`Pipeline '${pipelineId}' not found`)
    }

    const consumer = consumerMap.get(consumerId)
    if (consumer && consumer.checkpoint > sequenceNumber) {
      throw new Error(`Cannot set checkpoint backward from ${consumer.checkpoint} to ${sequenceNumber}`)
    }

    if (consumer) {
      consumer.checkpoint = sequenceNumber
      consumerMap.set(consumerId, consumer)
    } else {
      // Checkpoint for unregistered consumer (legacy support)
      consumerMap.set(consumerId, {
        consumerId,
        pipelineId,
        checkpoint: sequenceNumber,
        lastAckTimestamp: Date.now(),
        pendingCount: 0,
        ackedCount: 0,
        nackedCount: 0,
      })
    }

    await this.ctx.storage.put(`consumer:${pipelineId}:${consumerId}`, consumerMap.get(consumerId)!)
  }

  async getCheckpoint(pipelineId: string, consumerId: string): Promise<number> {
    const consumerMap = this.consumers.get(pipelineId)
    if (!consumerMap) return 0

    return consumerMap.get(consumerId)?.checkpoint ?? 0
  }

  async commitCheckpoint(pipelineId: string, consumerId: string): Promise<void> {
    const consumer = this.consumers.get(pipelineId)?.get(consumerId)
    if (!consumer) return

    // Mark events before checkpoint as processed
    const deliveryStates = this.deliveryStates.get(pipelineId)
    if (deliveryStates) {
      for (const [key, state] of deliveryStates.entries()) {
        if (state.consumerId === consumerId) {
          // Check if event is before checkpoint
          const event = await this.ctx.storage.get<StoredEvent>(`event:${pipelineId}:${state.eventId}`)
          if (event && (event.sequenceNumber ?? 0) <= consumer.checkpoint) {
            deliveryStates.delete(key)
          }
        }
      }
    }
  }

  // ============================================================================
  // Delivery Management
  // ============================================================================

  async acknowledgeEvent(pipelineId: string, eventId: string, consumerId: string): Promise<DeliveryAck> {
    const consumerMap = this.consumers.get(pipelineId)
    if (!consumerMap || !consumerMap.has(consumerId)) {
      // Auto-register consumer if needed
      await this.registerConsumer(pipelineId, consumerId)
    }

    const deliveryStates = this.deliveryStates.get(pipelineId) ?? new Map()
    const stateKey = `${eventId}:${consumerId}`

    const existingState = deliveryStates.get(stateKey)
    const ack: DeliveryAck = {
      eventId,
      status: 'acked',
      timestamp: Date.now(),
      consumerId,
      retryCount: existingState?.retryCount ?? 0,
    }

    const state: EventDeliveryState = {
      eventId,
      consumerId,
      status: 'acked',
      timestamp: ack.timestamp,
      retryCount: ack.retryCount,
    }

    deliveryStates.set(stateKey, state)
    this.deliveryStates.set(pipelineId, deliveryStates)

    // Update consumer stats
    const consumer = this.consumers.get(pipelineId)?.get(consumerId)
    if (consumer) {
      // Only increment if this is a new ack
      if (!existingState || existingState.status !== 'acked') {
        consumer.ackedCount++
        consumer.pendingCount = Math.max(0, consumer.pendingCount - 1)
        consumer.lastAckTimestamp = Date.now()
        await this.ctx.storage.put(`consumer:${pipelineId}:${consumerId}`, consumer)
      }
    }

    return ack
  }

  async acknowledgeEvents(pipelineId: string, eventIds: string[], consumerId: string): Promise<DeliveryAck[]> {
    const acks: DeliveryAck[] = []
    for (const eventId of eventIds) {
      const ack = await this.acknowledgeEvent(pipelineId, eventId, consumerId)
      acks.push(ack)
    }
    return acks
  }

  async negativeAck(pipelineId: string, eventId: string, consumerId: string, reason?: string): Promise<DeliveryAck> {
    const deliveryStates = this.deliveryStates.get(pipelineId) ?? new Map()
    const stateKey = `${eventId}:${consumerId}`

    const existingState = deliveryStates.get(stateKey)
    const retryCount = (existingState?.retryCount ?? 0) + 1
    const pipeline = this.pipelines.get(pipelineId)
    const maxRetries = pipeline?.retryPolicy?.maxRetries ?? 3

    const ack: DeliveryAck = {
      eventId,
      status: 'nacked',
      timestamp: Date.now(),
      consumerId,
      error: reason,
      retryCount,
    }

    // Check if max retries exceeded
    if (retryCount > maxRetries) {
      // Move to dead letter (remove from pending)
      deliveryStates.delete(stateKey)
    } else {
      const state: EventDeliveryState = {
        eventId,
        consumerId,
        status: 'nacked',
        timestamp: ack.timestamp,
        retryCount,
        error: reason,
      }
      deliveryStates.set(stateKey, state)
    }

    this.deliveryStates.set(pipelineId, deliveryStates)

    // Update consumer stats
    const consumer = this.consumers.get(pipelineId)?.get(consumerId)
    if (consumer) {
      consumer.nackedCount++
      consumer.lastAckTimestamp = Date.now()
      await this.ctx.storage.put(`consumer:${pipelineId}:${consumerId}`, consumer)
    }

    return ack
  }

  async getPendingDeliveries(pipelineId: string, consumerId: string, limit?: number): Promise<CDCEvent[]> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) return []

    // For at-most-once, events are immediately "delivered" and removed from pending
    if (pipeline.deliveryGuarantee === 'at-most-once') {
      const deliveryStates = this.deliveryStates.get(pipelineId)
      if (!deliveryStates) {
        // First call - return events and mark as delivered
        const latestSeq = await this.getLatestSequence(pipelineId)
        const checkpoint = await this.getCheckpoint(pipelineId, consumerId)
        const events = await this.getEventsBySequence(pipelineId, checkpoint + 1, latestSeq)

        // Mark all as delivered
        const states = new Map<string, EventDeliveryState>()
        for (const event of events) {
          states.set(`${event.id}:${consumerId}`, {
            eventId: event.id,
            consumerId,
            status: 'acked',
            timestamp: Date.now(),
            retryCount: 0,
          })
        }
        this.deliveryStates.set(pipelineId, states)

        return limit ? events.slice(0, limit) : events
      }
      // Subsequent calls return empty
      return []
    }

    // For at-least-once, return pending events
    const latestSeq = await this.getLatestSequence(pipelineId)
    const checkpoint = await this.getCheckpoint(pipelineId, consumerId)
    const deliveryStates = this.deliveryStates.get(pipelineId) ?? new Map()

    const pendingEvents: CDCEvent[] = []
    for (let seq = checkpoint + 1; seq <= latestSeq; seq++) {
      const event = await this.ctx.storage.get<StoredEvent>(`event:${pipelineId}:${seq}`)
      if (event) {
        const stateKey = `${event.id}:${consumerId}`
        const state = deliveryStates.get(stateKey)

        // Include if not acked
        if (!state || state.status !== 'acked') {
          pendingEvents.push(event)
          if (limit && pendingEvents.length >= limit) break
        }
      }
    }

    return pendingEvents
  }

  async getDeliveryStatus(pipelineId: string, eventId: string): Promise<Record<string, DeliveryAck>> {
    const deliveryStates = this.deliveryStates.get(pipelineId) ?? new Map()
    const consumers = this.consumers.get(pipelineId) ?? new Map()
    const result: Record<string, DeliveryAck> = {}

    for (const consumerId of consumers.keys()) {
      const stateKey = `${eventId}:${consumerId}`
      const state = deliveryStates.get(stateKey)

      result[consumerId] = {
        eventId,
        status: state?.status ?? 'pending',
        timestamp: state?.timestamp ?? Date.now(),
        consumerId,
        retryCount: state?.retryCount ?? 0,
        error: state?.error,
      }
    }

    return result
  }

  async retryDelivery(pipelineId: string, eventId: string, consumerId: string): Promise<DeliveryAck> {
    const deliveryStates = this.deliveryStates.get(pipelineId) ?? new Map()
    const stateKey = `${eventId}:${consumerId}`

    const existingState = deliveryStates.get(stateKey)
    const state: EventDeliveryState = {
      eventId,
      consumerId,
      status: 'pending',
      timestamp: Date.now(),
      retryCount: existingState?.retryCount ?? 0,
    }

    deliveryStates.set(stateKey, state)
    this.deliveryStates.set(pipelineId, deliveryStates)

    return {
      eventId,
      status: 'pending',
      timestamp: state.timestamp,
      consumerId,
      retryCount: state.retryCount,
    }
  }

  async replayEvents(pipelineId: string, fromSequence: number, toSequence?: number): Promise<CDCEvent[]> {
    const latestSeq = await this.getLatestSequence(pipelineId)
    const endSeq = toSequence ?? latestSeq

    return this.getEventsBySequence(pipelineId, fromSequence, endSeq)
  }

  async replayForConsumer(pipelineId: string, consumerId: string, fromCheckpoint?: number): Promise<CDCEvent[]> {
    const checkpoint = fromCheckpoint ?? (await this.getCheckpoint(pipelineId, consumerId))
    const latestSeq = await this.getLatestSequence(pipelineId)

    // Start from after checkpoint
    return this.getEventsBySequence(pipelineId, checkpoint + 1, latestSeq)
  }

  // ============================================================================
  // Consumer Management
  // ============================================================================

  async registerConsumer(pipelineId: string, consumerId: string): Promise<ConsumerState> {
    const consumerMap = this.consumers.get(pipelineId)
    if (!consumerMap) {
      throw new Error(`Pipeline '${pipelineId}' not found`)
    }

    const existing = consumerMap.get(consumerId)
    if (existing) return existing

    const state: ConsumerState = {
      consumerId,
      pipelineId,
      checkpoint: 0,
      lastAckTimestamp: Date.now(),
      pendingCount: 0,
      ackedCount: 0,
      nackedCount: 0,
    }

    consumerMap.set(consumerId, state)
    await this.ctx.storage.put(`consumer:${pipelineId}:${consumerId}`, state)

    // Initialize delivery states for existing events
    const latestSeq = await this.getLatestSequence(pipelineId)
    const deliveryStates = this.deliveryStates.get(pipelineId) ?? new Map()
    for (let seq = 1; seq <= latestSeq; seq++) {
      const event = await this.ctx.storage.get<StoredEvent>(`event:${pipelineId}:${seq}`)
      if (event) {
        const stateKey = `${event.id}:${consumerId}`
        if (!deliveryStates.has(stateKey)) {
          deliveryStates.set(stateKey, {
            eventId: event.id,
            consumerId,
            status: 'pending',
            timestamp: Date.now(),
            retryCount: 0,
          })
        }
      }
    }
    this.deliveryStates.set(pipelineId, deliveryStates)

    return state
  }

  async unregisterConsumer(pipelineId: string, consumerId: string): Promise<boolean> {
    const consumerMap = this.consumers.get(pipelineId)
    if (!consumerMap || !consumerMap.has(consumerId)) return false

    consumerMap.delete(consumerId)
    await this.ctx.storage.delete(`consumer:${pipelineId}:${consumerId}`)

    // Clean up delivery states
    const deliveryStates = this.deliveryStates.get(pipelineId)
    if (deliveryStates) {
      for (const key of deliveryStates.keys()) {
        if (key.endsWith(`:${consumerId}`)) {
          deliveryStates.delete(key)
        }
      }
    }

    return true
  }

  async getConsumerState(pipelineId: string, consumerId: string): Promise<ConsumerState | null> {
    return this.consumers.get(pipelineId)?.get(consumerId) ?? null
  }

  async listConsumers(pipelineId: string): Promise<ConsumerState[]> {
    const consumerMap = this.consumers.get(pipelineId)
    if (!consumerMap) return []
    return Array.from(consumerMap.values())
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getStats(pipelineId?: string): Promise<CDCStats> {
    if (pipelineId) {
      const stats = this.pipelineStats.get(pipelineId) ?? this.createEmptyStats()

      // Calculate current pending events
      const buffer = this.eventBuffers.get(pipelineId)
      if (buffer) {
        stats.pendingEvents = buffer.length
      }

      return stats
    }

    // Calculate global stats from all pipelines
    const global = this.createEmptyStats()
    for (const [id, stats] of this.pipelineStats) {
      global.totalEventsReceived += stats.totalEventsReceived
      global.totalEventsProcessed += stats.totalEventsProcessed
      global.totalBatches += stats.totalBatches
      global.totalBytesWritten += stats.totalBytesWritten
      global.errorCount += stats.errorCount

      const buffer = this.eventBuffers.get(id)
      if (buffer) {
        global.pendingEvents += buffer.length
      }
    }

    if (global.totalBatches > 0) {
      global.averageBatchSize = global.totalEventsProcessed / global.totalBatches
    }

    return global
  }

  private updateStats(
    pipelineId: string,
    updates: {
      eventsReceived?: number
      eventsProcessed?: number
      batchCreated?: boolean
      bytesWritten?: number
      error?: boolean
    }
  ): void {
    const stats = this.pipelineStats.get(pipelineId) ?? this.createEmptyStats()

    if (updates.eventsReceived) {
      stats.totalEventsReceived += updates.eventsReceived
      stats.pendingEvents += updates.eventsReceived
      stats.lastEventTimestamp = Date.now()
    }
    if (updates.eventsProcessed) {
      stats.totalEventsProcessed += updates.eventsProcessed
      stats.pendingEvents = Math.max(0, stats.pendingEvents - updates.eventsProcessed)
    }
    if (updates.batchCreated) {
      stats.totalBatches++
    }
    if (updates.bytesWritten) {
      stats.totalBytesWritten += updates.bytesWritten
    }
    if (updates.error) {
      stats.errorCount++
    }

    if (stats.totalBatches > 0) {
      stats.averageBatchSize = stats.totalEventsProcessed / stats.totalBatches
    }

    this.pipelineStats.set(pipelineId, stats)
    // Note: Async storage update done periodically or on demand
  }

  // ============================================================================
  // Parquet Operations
  // ============================================================================

  async generateParquet(pipelineId: string, batchId: string): Promise<{ path: string; sizeBytes: number }> {
    const batch = this.batches.get(batchId)
    if (!batch) {
      throw new Error(`Batch '${batchId}' not found`)
    }

    if (batch.eventCount === 0) {
      throw new Error('Cannot generate Parquet file from empty batch')
    }

    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) {
      throw new Error(`Pipeline '${pipelineId}' not found`)
    }

    // Get batch events
    const events = await this.ctx.storage.get<StoredEvent[]>(`batchEvents:${batchId}`)
    if (!events || events.length === 0) {
      throw new Error('No events found for batch')
    }

    // Build path based on partitioning config
    const path = this.buildParquetPath(pipeline, events[0]!, batchId)

    // Build schema
    const schema: ParquetSchema = {
      fields: [
        { name: 'id', type: 'string', nullable: false },
        { name: 'timestamp', type: 'timestamp', nullable: false },
        { name: 'source', type: 'string', nullable: false },
        { name: 'type', type: 'string', nullable: false },
        { name: 'data', type: 'json', nullable: false },
        { name: 'metadata', type: 'json', nullable: true },
        { name: 'sequenceNumber', type: 'int64', nullable: true },
      ],
    }

    // Simulate Parquet file generation
    // In a real implementation, we would use parquet-wasm or similar
    const compression = pipeline.output.compression ?? 'snappy'
    const compressionRatio = compression === 'none' ? 1.0 : compression === 'gzip' ? 0.3 : compression === 'zstd' ? 0.25 : 0.4

    const rawSize = events.reduce((sum, e) => sum + JSON.stringify(e).length, 0)
    const sizeBytes = Math.ceil(rawSize * compressionRatio)

    // Build partition values
    const partitionValues: Record<string, string> = {}
    if (pipeline.output.partitioning?.fields) {
      for (const field of pipeline.output.partitioning.fields) {
        partitionValues[field] = String((events[0] as Record<string, unknown>)[field] ?? 'unknown')
      }
    }

    // Create metadata
    const metadata: ParquetFileMetadata = {
      path,
      sizeBytes,
      rowCount: events.length,
      createdAt: Date.now(),
      compression,
      schema,
      partitionValues: Object.keys(partitionValues).length > 0 ? partitionValues : undefined,
    }

    // Store metadata
    this.parquetFiles.set(path, metadata)
    await this.ctx.storage.put(`parquet:${path}`, metadata)

    // Store "parquet" data (simulated as JSON for testing)
    const parquetData = JSON.stringify(events)
    const r2Bucket = (this.env as Record<string, unknown>).CDC_BUCKET as {
      put(key: string, data: string): Promise<unknown>
    }
    if (r2Bucket) {
      await r2Bucket.put(path, parquetData)
    }

    // Update batch status
    batch.status = 'completed'
    batch.outputPath = path
    batch.flushedAt = Date.now()
    this.batches.set(batchId, batch)
    await this.ctx.storage.put(`batch:${batchId}`, batch)

    return { path, sizeBytes }
  }

  private buildParquetPath(pipeline: CDCPipelineConfig, event: StoredEvent, batchId: string): string {
    const parts: string[] = []

    // Add prefix if configured
    if (pipeline.output.pathPrefix) {
      parts.push(pipeline.output.pathPrefix)
    }

    // Add field partitions
    if (pipeline.output.partitioning?.fields) {
      for (const field of pipeline.output.partitioning.fields) {
        const value = (event as Record<string, unknown>)[field] ?? 'unknown'
        parts.push(`${field}=${value}`)
      }
    }

    // Add time partition
    if (pipeline.output.partitioning?.timeField) {
      const timestamp = event.timestamp
      const date = new Date(timestamp)
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const hour = String(date.getUTCHours()).padStart(2, '0')

      const granularity = pipeline.output.partitioning.timeGranularity ?? 'day'
      if (granularity === 'hour') {
        parts.push(`${year}/${month}/${day}/${hour}`)
      } else if (granularity === 'day') {
        parts.push(`${year}/${month}/${day}`)
      } else if (granularity === 'month') {
        parts.push(`${year}/${month}`)
      }
    }

    // Add filename
    const filename = `${batchId}.parquet`
    parts.push(filename)

    return parts.join('/')
  }

  async getParquetMetadata(path: string): Promise<ParquetFileMetadata | null> {
    return this.parquetFiles.get(path) ?? null
  }

  async listParquetFiles(
    pipelineId: string,
    options?: { since?: number; until?: number; prefix?: string }
  ): Promise<string[]> {
    const files: string[] = []

    for (const [path, metadata] of this.parquetFiles) {
      // Check if file belongs to pipeline (by prefix)
      const pipeline = this.pipelines.get(pipelineId)
      if (pipeline?.output.pathPrefix && !path.startsWith(pipeline.output.pathPrefix)) {
        // Also check if path contains pipelineId
        if (!path.includes(pipelineId)) continue
      }

      // Filter by time range
      if (options?.since && metadata.createdAt < options.since) continue
      if (options?.until && metadata.createdAt > options.until) continue

      // Filter by prefix
      if (options?.prefix && !path.startsWith(options.prefix)) continue

      files.push(path)
    }

    return files
  }

  async readParquetFile(path: string, options?: { columns?: string[]; limit?: number }): Promise<unknown[]> {
    const r2Bucket = (this.env as Record<string, unknown>).CDC_BUCKET as {
      get(key: string): Promise<{ text(): Promise<string> } | null>
    }

    if (!r2Bucket) return []

    const obj = await r2Bucket.get(path)
    if (!obj) return []

    const data = await obj.text()
    let events = JSON.parse(data) as Record<string, unknown>[]

    // Apply limit
    if (options?.limit) {
      events = events.slice(0, options.limit)
    }

    // Apply column projection
    if (options?.columns) {
      events = events.map((event) => {
        const projected: Record<string, unknown> = {}
        for (const col of options.columns!) {
          if (col in event) {
            projected[col] = event[col]
          }
        }
        return projected
      })
    }

    return events
  }

  async deleteParquetFile(path: string): Promise<boolean> {
    if (!this.parquetFiles.has(path)) return false

    const r2Bucket = (this.env as Record<string, unknown>).CDC_BUCKET as {
      delete(key: string): Promise<void>
    }

    if (r2Bucket) {
      await r2Bucket.delete(path)
    }

    this.parquetFiles.delete(path)
    await this.ctx.storage.delete(`parquet:${path}`)

    return true
  }

  // ============================================================================
  // RPC Interface
  // ============================================================================

  hasMethod(name: string): boolean {
    return this.rpcMethods.has(name)
  }

  async invoke(method: string, params: unknown[]): Promise<unknown> {
    if (!this.hasMethod(method)) {
      throw new Error(`Method '${method}' not allowed or not found`)
    }

    const fn = (this as Record<string, unknown>)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Method '${method}' not found`)
    }

    return fn.apply(this, params)
  }

  // ============================================================================
  // HTTP Fetch Handler
  // ============================================================================

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    try {
      // HATEOAS Discovery
      if (path === '/' && method === 'GET') {
        return this.jsonResponse({
          api: 'cdc.do',
          version: '1.0.0',
          links: {
            pipelines: '/api/pipelines',
            stats: '/api/stats',
            rpc: '/rpc',
          },
          discover: {
            methods: Array.from(this.rpcMethods).map((name) => ({
              name,
              description: `CDC method: ${name}`,
            })),
          },
        })
      }

      // RPC endpoint
      if (path === '/rpc' && method === 'POST') {
        const body = (await request.json()) as { method: string; params: unknown[] }
        if (!this.hasMethod(body.method)) {
          return this.jsonResponse({ error: `Method '${body.method}' not allowed` }, 400)
        }
        const result = await this.invoke(body.method, body.params ?? [])
        return this.jsonResponse({ result })
      }

      // REST API: Pipelines
      if (path === '/api/pipelines') {
        if (method === 'GET') {
          const pipelines = await this.listPipelines()
          return this.jsonResponse(pipelines)
        }
        if (method === 'POST') {
          const config = (await request.json()) as CDCPipelineConfig
          const created = await this.createPipeline(config)
          return this.jsonResponse(created, 201)
        }
      }

      // REST API: Pipeline by ID
      const pipelineMatch = path.match(/^\/api\/pipelines\/([^/]+)$/)
      if (pipelineMatch) {
        const pipelineId = pipelineMatch[1]!
        if (method === 'GET') {
          const pipeline = await this.getPipeline(pipelineId)
          if (!pipeline) return this.jsonResponse({ error: 'Pipeline not found' }, 404)
          return this.jsonResponse(pipeline)
        }
        if (method === 'DELETE') {
          await this.deletePipeline(pipelineId)
          return this.jsonResponse({ success: true })
        }
      }

      // REST API: Pipeline events
      const eventsMatch = path.match(/^\/api\/pipelines\/([^/]+)\/events$/)
      if (eventsMatch && method === 'POST') {
        const pipelineId = eventsMatch[1]!
        const event = (await request.json()) as CDCEvent
        const result = await this.ingestEvent(pipelineId, event)
        return this.jsonResponse(result)
      }

      // REST API: Pipeline flush
      const flushMatch = path.match(/^\/api\/pipelines\/([^/]+)\/flush$/)
      if (flushMatch && method === 'POST') {
        const pipelineId = flushMatch[1]!
        const batch = await this.flushBatch(pipelineId)
        return this.jsonResponse(batch)
      }

      // REST API: Stats
      if (path === '/api/stats' && method === 'GET') {
        const stats = await this.getStats()
        return this.jsonResponse(stats)
      }

      return this.jsonResponse({ error: 'Not found' }, 404)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return this.jsonResponse({ error: message }, 500)
    }
  }

  private jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Type augmentation for DurableObjectState
interface DurableObjectState {
  id: { toString(): string }
  storage: {
    get<T>(key: string): Promise<T | undefined>
    get<T>(keys: string[]): Promise<Map<string, T>>
    put<T>(key: string, value: T): Promise<void>
    put<T>(entries: Record<string, T>): Promise<void>
    delete(key: string): Promise<boolean>
    delete(keys: string[]): Promise<number>
    list<T>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>
    transaction<T>(closure: (txn: DurableObjectState['storage']) => Promise<T>): Promise<T>
  }
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>
}
