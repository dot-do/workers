/**
 * Type Tests for CDC Mixin Type Compatibility with DO Base Class
 *
 * RED PHASE: These tests define the type contract for the withCDC mixin function.
 * The mixin must produce a class that has all DO methods plus all CDC methods
 * with correct signatures.
 *
 * The withCDC mixin should:
 * 1. Accept any class that extends DO
 * 2. Return a class with all original DO methods preserved
 * 3. Add all 6 core CDC methods with correct signatures
 * 4. Maintain correct this binding for inherited methods
 *
 * RED PHASE: These tests MUST FAIL because withCDC is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-oqi8).
 *
 * Run with: npx tsc --noEmit tests/types/cdc-mixin-types.test-d.ts
 */

import type { DOState, DOEnv, DOStorage, Document, Constructor } from '../../objects/do/types'

// =============================================================================
// EXPECTED CDC TYPES (from workers/cdc/src/cdc.ts)
// =============================================================================

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
 * CDC Pipeline configuration
 */
export interface CDCPipelineConfig {
  id: string
  name?: string
  sources: string[]
  eventTypes?: string[]
  batching: {
    maxSize: number
    maxWaitMs: number
    maxBytes?: number
  }
  output: {
    format: 'parquet' | 'json' | 'avro'
    compression?: 'none' | 'snappy' | 'gzip' | 'zstd'
    partitioning?: {
      fields?: string[]
      timeField?: string
      timeGranularity?: 'hour' | 'day' | 'month'
    }
    pathPrefix?: string
  }
  deliveryGuarantee: 'at-least-once' | 'at-most-once' | 'exactly-once'
  enabled: boolean
}

/**
 * CDC Statistics
 */
export interface CDCStats {
  totalEventsReceived: number
  totalEventsProcessed: number
  totalBatches: number
  totalBytesWritten: number
  pendingEvents: number
  averageBatchSize: number
  averageLatencyMs: number
  errorCount: number
  lastEventTimestamp?: number
}

/**
 * Batch status tracking
 */
export interface BatchStatus {
  batchId: string
  pipelineId: string
  eventCount: number
  sizeBytes: number
  createdAt: number
  flushedAt?: number
  outputPath?: string
  status: 'pending' | 'flushing' | 'completed' | 'failed'
  error?: string
  firstSequence?: number
  lastSequence?: number
}

/**
 * Delivery acknowledgment
 */
export interface DeliveryAck {
  eventId: string
  status: 'acked' | 'nacked' | 'pending'
  timestamp: number
  consumerId?: string
  error?: string
  retryCount?: number
}

// =============================================================================
// MOCK DO BASE CLASS (simulating objects/do/do.ts)
// =============================================================================

/**
 * Minimal DO interface for testing mixin compatibility
 */
interface DOBase<Env extends DOEnv = DOEnv> {
  readonly id: string
  readonly ctx: DOState
  readonly env: Env
  getStorage(): DOStorage
  fetch(request: Request): Promise<Response>
  alarm(): Promise<void>
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void>
  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void>
  webSocketError(ws: WebSocket, error: unknown): Promise<void>
  get<T extends Document>(collection: string, docId: string): Promise<T | null>
  put<T extends Partial<Document>>(collection: string, data: T): Promise<T & Document>
  del(collection: string, docId: string): Promise<boolean>
  list<T extends Document>(collection: string, options?: { limit?: number; reverse?: boolean }): Promise<T[]>
  scheduleAlarm(time: Date | number): Promise<void>
  getAlarm(): Promise<number | null>
  cancelAlarm(): Promise<void>
  scheduleAlarmIn(ms: number): Promise<void>
}

// =============================================================================
// EXPECTED withCDC MIXIN SIGNATURE
// =============================================================================

/**
 * The CDC mixin interface - defines the 6 core CDC methods that will be added
 * to any DO class when wrapped with withCDC
 */
export interface CDCMixin {
  // Method 1: Create a CDC pipeline
  createPipeline(config: CDCPipelineConfig): Promise<CDCPipelineConfig>

  // Method 2: Ingest a single event into a pipeline
  ingestEvent(pipelineId: string, event: CDCEvent): Promise<{ eventId: string; sequenceNumber: number }>

  // Method 3: Get pipeline statistics
  getStats(pipelineId?: string): Promise<CDCStats>

  // Method 4: Flush pending events to a batch
  flushBatch(pipelineId: string): Promise<BatchStatus>

  // Method 5: Acknowledge event delivery
  acknowledgeEvent(pipelineId: string, eventId: string, consumerId: string): Promise<DeliveryAck>

  // Method 6: Get events by sequence range
  getEventsBySequence(pipelineId: string, startSequence: number, endSequence: number): Promise<CDCEvent[]>
}

/**
 * Expected type signature for withCDC mixin function
 *
 * Takes a class constructor that produces DOBase-compatible instances
 * Returns a new class constructor that produces instances with both
 * DOBase methods and CDCMixin methods
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WithCDC = <TBase extends Constructor<DOBase<any>>>(
  Base: TBase
) => TBase & Constructor<CDCMixin>

// =============================================================================
// TEST 1: withCDC function should exist and have correct signature
// =============================================================================
// This test will fail until the mixin is implemented

// Import should fail - withCDC doesn't exist yet
// @ts-expect-error - withCDC is not implemented yet (RED phase)
import { withCDC } from '../../packages/do-cdc/src/mixin'

// If it did exist, it should have this type:
declare const withCDCMock: WithCDC

// =============================================================================
// TEST 2: Applying withCDC to DO should produce correct result type
// =============================================================================

// Mock a class that extends DO
declare class MockDO implements DOBase {
  readonly id: string
  readonly ctx: DOState
  readonly env: DOEnv
  getStorage(): DOStorage
  fetch(request: Request): Promise<Response>
  alarm(): Promise<void>
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void>
  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void>
  webSocketError(ws: WebSocket, error: unknown): Promise<void>
  get<T extends Document>(collection: string, docId: string): Promise<T | null>
  put<T extends Partial<Document>>(collection: string, data: T): Promise<T & Document>
  del(collection: string, docId: string): Promise<boolean>
  list<T extends Document>(collection: string, options?: { limit?: number; reverse?: boolean }): Promise<T[]>
  scheduleAlarm(time: Date | number): Promise<void>
  getAlarm(): Promise<number | null>
  cancelAlarm(): Promise<void>
  scheduleAlarmIn(ms: number): Promise<void>

  // Custom method that should be preserved
  customMethod(x: number): string
}

// Apply mixin (will fail without implementation)
const CDCEnabledDO = withCDCMock(MockDO)

// Create instance
declare const ctx: DOState
declare const env: DOEnv
const instance = new CDCEnabledDO(ctx, env)

// =============================================================================
// TEST 3: Result class should have all original DO methods
// =============================================================================

// These should all type-check correctly after withCDC is applied

// Core DO properties
const _id: string = instance.id
const _storage: DOStorage = instance.getStorage()

// Fetch method preserved
const _fetchResult: Promise<Response> = instance.fetch(new Request('https://example.com'))

// Alarm method preserved
const _alarmResult: Promise<void> = instance.alarm()

// WebSocket methods preserved
declare const ws: WebSocket
const _wsMessageResult: Promise<void> = instance.webSocketMessage(ws, 'test')
const _wsCloseResult: Promise<void> = instance.webSocketClose(ws, 1000, 'normal', true)
const _wsErrorResult: Promise<void> = instance.webSocketError(ws, new Error('test'))

// CRUD methods preserved
const _getResult: Promise<Document | null> = instance.get('collection', 'id')
const _putResult: Promise<Document> = instance.put('collection', { id: '123' })
const _delResult: Promise<boolean> = instance.del('collection', 'id')
const _listResult: Promise<Document[]> = instance.list('collection')

// Alarm helpers preserved
const _scheduleResult: Promise<void> = instance.scheduleAlarm(Date.now())
const _getAlarmResult: Promise<number | null> = instance.getAlarm()
const _cancelResult: Promise<void> = instance.cancelAlarm()
const _scheduleInResult: Promise<void> = instance.scheduleAlarmIn(1000)

// Custom method preserved
const _customResult: string = instance.customMethod(42)

// =============================================================================
// TEST 4: Result class should have all 6 CDC methods with correct signatures
// =============================================================================

// Method 1: createPipeline
const pipelineConfig: CDCPipelineConfig = {
  id: 'test-pipeline',
  sources: ['source1'],
  batching: { maxSize: 100, maxWaitMs: 1000 },
  output: { format: 'parquet' },
  deliveryGuarantee: 'at-least-once',
  enabled: true,
}
const _createPipelineResult: Promise<CDCPipelineConfig> = instance.createPipeline(pipelineConfig)

// Method 2: ingestEvent
const event: CDCEvent = {
  id: 'evt-1',
  timestamp: Date.now(),
  source: 'source1',
  type: 'user.created',
  data: { userId: '123' },
}
const _ingestResult: Promise<{ eventId: string; sequenceNumber: number }> = instance.ingestEvent('test-pipeline', event)

// Method 3: getStats
const _statsResult: Promise<CDCStats> = instance.getStats('test-pipeline')
const _globalStatsResult: Promise<CDCStats> = instance.getStats() // No pipeline = global stats

// Method 4: flushBatch
const _flushResult: Promise<BatchStatus> = instance.flushBatch('test-pipeline')

// Method 5: acknowledgeEvent
const _ackResult: Promise<DeliveryAck> = instance.acknowledgeEvent('test-pipeline', 'evt-1', 'consumer-1')

// Method 6: getEventsBySequence
const _eventsResult: Promise<CDCEvent[]> = instance.getEventsBySequence('test-pipeline', 1, 100)

// =============================================================================
// TEST 5: Type inference should work correctly with generic Env
// =============================================================================

interface CustomEnv extends DOEnv {
  MY_BINDING: { fetch: (url: string) => Promise<Response> }
}

declare class CustomDO implements DOBase<CustomEnv> {
  readonly id: string
  readonly ctx: DOState
  readonly env: CustomEnv
  getStorage(): DOStorage
  fetch(request: Request): Promise<Response>
  alarm(): Promise<void>
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void>
  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void>
  webSocketError(ws: WebSocket, error: unknown): Promise<void>
  get<T extends Document>(collection: string, docId: string): Promise<T | null>
  put<T extends Partial<Document>>(collection: string, data: T): Promise<T & Document>
  del(collection: string, docId: string): Promise<boolean>
  list<T extends Document>(collection: string, options?: { limit?: number; reverse?: boolean }): Promise<T[]>
  scheduleAlarm(time: Date | number): Promise<void>
  getAlarm(): Promise<number | null>
  cancelAlarm(): Promise<void>
  scheduleAlarmIn(ms: number): Promise<void>
}

const CDCCustomDO = withCDCMock(CustomDO)
declare const customEnv: CustomEnv
const customInstance = new CDCCustomDO(ctx, customEnv)

// Custom env binding should be accessible
const _myBinding = customInstance.env.MY_BINDING
const _bindingFetchResult: Promise<Response> = _myBinding.fetch('https://example.com')

// CDC methods should still work
const _customCdcResult: Promise<CDCStats> = customInstance.getStats()

// =============================================================================
// TEST 6: Subclassing the result should work correctly
// =============================================================================

// You should be able to extend the CDC-enabled class
class ExtendedCDCDO extends CDCEnabledDO {
  myExtendedMethod(): string {
    // Should have access to both DO and CDC methods
    this.getStats()
    this.scheduleAlarmIn(1000)
    return this.id
  }
}

declare const extendedInstance: ExtendedCDCDO
const _extendedResult: string = extendedInstance.myExtendedMethod()
const _extendedCdcResult: Promise<CDCStats> = extendedInstance.getStats()
const _extendedDoResult: Promise<void> = extendedInstance.alarm()

// =============================================================================
// TEST 7: withCDC should reject non-DO classes
// =============================================================================

class NotADO {
  someMethod(): void {}
}

// This should fail type checking - NotADO doesn't extend DO
// @ts-expect-error - NotADO is not compatible with DOBase
const _invalidResult = withCDCMock(NotADO)

// =============================================================================
// TEST 8: CDC method signatures should be strict
// =============================================================================

// Wrong argument types should fail
// @ts-expect-error - first arg should be string, not number
instance.ingestEvent(123, event)

// @ts-expect-error - event should have required fields
instance.ingestEvent('test-pipeline', { id: 'evt-1' })

// @ts-expect-error - getEventsBySequence requires numbers
instance.getEventsBySequence('test-pipeline', 'one', 'two')

// Wrong return type expectations should fail (via assignment)
// @ts-expect-error - getStats returns Promise<CDCStats>, not Promise<string>
const _wrongStatsType: Promise<string> = instance.getStats()

// @ts-expect-error - flushBatch returns Promise<BatchStatus>, not Promise<void>
const _wrongFlushType: Promise<void> = instance.flushBatch('test-pipeline')

// =============================================================================
// VERIFICATION: These tests define the type contract
// When withCDC is implemented (GREEN phase), the @ts-expect-error for the
// import should be removed and all other type checks should pass
// =============================================================================

export {
  CDCEnabledDO,
  instance,
  customInstance,
  ExtendedCDCDO,
}
