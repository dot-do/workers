/**
 * RED Tests: cdc.do Delivery Guarantees
 *
 * These tests define the contract for the CDC worker's delivery guarantee mechanisms.
 * CDC systems must provide reliable event delivery with configurable guarantees.
 *
 * Per ARCHITECTURE.md:
 * - CDC pipeline supports at-least-once, at-most-once, and exactly-once delivery
 * - Event acknowledgment tracking
 * - Replay capabilities for recovery
 * - Consumer checkpoint management
 *
 * RED PHASE: These tests MUST FAIL because CDCDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-k6ud).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv, createSampleEvent, createSampleEvents, } from './helpers.js';
/**
 * Attempt to load CDCDO - this will fail in RED phase
 */
async function loadCDCDO() {
    const module = await import('../src/cdc.js');
    return module.CDCDO;
}
describe('CDC Delivery Guarantees', () => {
    let ctx;
    let env;
    let CDCDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        CDCDO = await loadCDCDO();
    });
    describe('At-Least-Once Delivery', () => {
        it('should deliver events until acknowledged', async () => {
            const instance = new CDCDO(ctx, env);
            await instance.createPipeline({
                id: 'at-least-once',
                sources: ['test-source'],
                batching: { maxSize: 100, maxWaitMs: 60000 },
                output: { format: 'parquet' },
                deliveryGuarantee: 'at-least-once',
                enabled: true,
            });
            const event = createSampleEvent({ source: 'test-source' });
            await instance.ingestEvent('at-least-once', event);
            await instance.registerConsumer('at-least-once', 'consumer-1');
            // Event should be in pending deliveries
            let pending = await instance.getPendingDeliveries('at-least-once', 'consumer-1');
            expect(pending.find((e) => e.id === event.id)).toBeDefined();
            // After ack, should no longer be pending
            await instance.acknowledgeEvent('at-least-once', event.id, 'consumer-1');
            pending = await instance.getPendingDeliveries('at-least-once', 'consumer-1');
            expect(pending.find((e) => e.id === event.id)).toBeUndefined();
        });
        it('should redeliver nacked events', async () => {
            const instance = new CDCDO(ctx, env);
            await instance.createPipeline({
                id: 'redeliver',
                sources: ['test-source'],
                batching: { maxSize: 100, maxWaitMs: 60000 },
                output: { format: 'parquet' },
                deliveryGuarantee: 'at-least-once',
                enabled: true,
                retryPolicy: {
                    maxRetries: 3,
                    backoffMs: 100,
                    maxBackoffMs: 1000,
                },
            });
            const event = createSampleEvent({ source: 'test-source' });
            await instance.ingestEvent('redeliver', event);
            await instance.registerConsumer('redeliver', 'consumer-1');
            // Nack the event
            const nack = await instance.negativeAck('redeliver', event.id, 'consumer-1', 'Processing failed');
            expect(nack.status).toBe('nacked');
            // Event should still be in pending deliveries for retry
            const pending = await instance.getPendingDeliveries('redeliver', 'consumer-1');
            expect(pending.find((e) => e.id === event.id)).toBeDefined();
        });
        it('should track retry count for nacked events', async () => {
            const instance = new CDCDO(ctx, env);
            await instance.createPipeline({
                id: 'retry-count',
                sources: ['test-source'],
                batching: { maxSize: 100, maxWaitMs: 60000 },
                output: { format: 'parquet' },
                deliveryGuarantee: 'at-least-once',
                enabled: true,
                retryPolicy: {
                    maxRetries: 5,
                    backoffMs: 100,
                    maxBackoffMs: 1000,
                },
            });
            const event = createSampleEvent({ source: 'test-source' });
            await instance.ingestEvent('retry-count', event);
            await instance.registerConsumer('retry-count', 'consumer-1');
            // Nack multiple times
            await instance.negativeAck('retry-count', event.id, 'consumer-1');
            await instance.retryDelivery('retry-count', event.id, 'consumer-1');
            await instance.negativeAck('retry-count', event.id, 'consumer-1');
            await instance.retryDelivery('retry-count', event.id, 'consumer-1');
            const status = await instance.getDeliveryStatus('retry-count', event.id);
            expect(status['consumer-1']?.retryCount).toBeGreaterThanOrEqual(2);
        });
        it('should move to dead letter after max retries', async () => {
            const instance = new CDCDO(ctx, env);
            await instance.createPipeline({
                id: 'max-retries',
                sources: ['test-source'],
                batching: { maxSize: 100, maxWaitMs: 60000 },
                output: { format: 'parquet' },
                deliveryGuarantee: 'at-least-once',
                enabled: true,
                retryPolicy: {
                    maxRetries: 2,
                    backoffMs: 100,
                    maxBackoffMs: 1000,
                },
            });
            const event = createSampleEvent({ source: 'test-source' });
            await instance.ingestEvent('max-retries', event);
            await instance.registerConsumer('max-retries', 'consumer-1');
            // Nack until max retries exceeded
            for (let i = 0; i < 3; i++) {
                await instance.negativeAck('max-retries', event.id, 'consumer-1');
                if (i < 2)
                    await instance.retryDelivery('max-retries', event.id, 'consumer-1');
            }
            // Event should be removed from pending (moved to DLQ)
            const pending = await instance.getPendingDeliveries('max-retries', 'consumer-1');
            expect(pending.find((e) => e.id === event.id)).toBeUndefined();
        });
    });
    describe('At-Most-Once Delivery', () => {
        it('should not redeliver events after timeout', async () => {
            const instance = new CDCDO(ctx, env);
            await instance.createPipeline({
                id: 'at-most-once',
                sources: ['test-source'],
                batching: { maxSize: 100, maxWaitMs: 60000 },
                output: { format: 'parquet' },
                deliveryGuarantee: 'at-most-once',
                enabled: true,
            });
            const event = createSampleEvent({ source: 'test-source' });
            await instance.ingestEvent('at-most-once', event);
            await instance.registerConsumer('at-most-once', 'consumer-1');
            // Get pending - event should be delivered
            const pending = await instance.getPendingDeliveries('at-most-once', 'consumer-1');
            expect(pending).toHaveLength(1);
            // Don't ack - event should not be redelivered
            // (In at-most-once, events are marked as delivered immediately)
            const pendingAgain = await instance.getPendingDeliveries('at-most-once', 'consumer-1');
            // Should be empty since at-most-once marks as delivered immediately
            expect(pendingAgain).toHaveLength(0);
        });
    });
    describe('Exactly-Once Delivery', () => {
        it('should deduplicate events with same id', async () => {
            const instance = new CDCDO(ctx, env);
            await instance.createPipeline({
                id: 'exactly-once',
                sources: ['test-source'],
                batching: { maxSize: 100, maxWaitMs: 60000 },
                output: { format: 'parquet' },
                deliveryGuarantee: 'exactly-once',
                enabled: true,
            });
            const event = createSampleEvent({ source: 'test-source', id: 'unique-event-1' });
            // Ingest same event twice
            const result1 = await instance.ingestEvent('exactly-once', event);
            const result2 = await instance.ingestEvent('exactly-once', event);
            // Should have same sequence number (deduplicated)
            expect(result2.sequenceNumber).toBe(result1.sequenceNumber);
        });
        it('should track idempotency keys', async () => {
            const instance = new CDCDO(ctx, env);
            await instance.createPipeline({
                id: 'idempotent',
                sources: ['test-source'],
                batching: { maxSize: 100, maxWaitMs: 60000 },
                output: { format: 'parquet' },
                deliveryGuarantee: 'exactly-once',
                enabled: true,
            });
            await instance.registerConsumer('idempotent', 'consumer-1');
            const event = createSampleEvent({ source: 'test-source' });
            await instance.ingestEvent('idempotent', event);
            // Ack same event twice
            const ack1 = await instance.acknowledgeEvent('idempotent', event.id, 'consumer-1');
            const ack2 = await instance.acknowledgeEvent('idempotent', event.id, 'consumer-1');
            // Both should succeed but event should only be counted once
            expect(ack1.status).toBe('acked');
            expect(ack2.status).toBe('acked');
            const state = await instance.getConsumerState('idempotent', 'consumer-1');
            expect(state.ackedCount).toBe(1);
        });
    });
    describe('Consumer Management', () => {
        describe('registerConsumer()', () => {
            it('should register a new consumer', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'consumer-reg',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                const state = await instance.registerConsumer('consumer-reg', 'my-consumer');
                expect(state.consumerId).toBe('my-consumer');
                expect(state.pipelineId).toBe('consumer-reg');
                expect(state.checkpoint).toBe(0);
            });
            it('should return existing state if already registered', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'existing-consumer',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.registerConsumer('existing-consumer', 'consumer-1');
                await instance.setCheckpoint('existing-consumer', 'consumer-1', 50);
                const state = await instance.registerConsumer('existing-consumer', 'consumer-1');
                expect(state.checkpoint).toBe(50);
            });
        });
        describe('unregisterConsumer()', () => {
            it('should unregister a consumer', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'unreg-test',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.registerConsumer('unreg-test', 'temp-consumer');
                const result = await instance.unregisterConsumer('unreg-test', 'temp-consumer');
                expect(result).toBe(true);
                const state = await instance.getConsumerState('unreg-test', 'temp-consumer');
                expect(state).toBeNull();
            });
            it('should return false for non-existent consumer', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'unreg-none',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                const result = await instance.unregisterConsumer('unreg-none', 'nonexistent');
                expect(result).toBe(false);
            });
        });
        describe('listConsumers()', () => {
            it('should list all consumers for a pipeline', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'list-consumers',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.registerConsumer('list-consumers', 'consumer-1');
                await instance.registerConsumer('list-consumers', 'consumer-2');
                await instance.registerConsumer('list-consumers', 'consumer-3');
                const consumers = await instance.listConsumers('list-consumers');
                expect(consumers).toHaveLength(3);
                expect(consumers.map((c) => c.consumerId)).toContain('consumer-1');
                expect(consumers.map((c) => c.consumerId)).toContain('consumer-2');
                expect(consumers.map((c) => c.consumerId)).toContain('consumer-3');
            });
            it('should return empty array when no consumers', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'no-consumers',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                const consumers = await instance.listConsumers('no-consumers');
                expect(consumers).toEqual([]);
            });
        });
    });
    describe('Checkpoint Management', () => {
        describe('setCheckpoint() / getCheckpoint()', () => {
            it('should set and retrieve checkpoint', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'checkpoint-basic',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.registerConsumer('checkpoint-basic', 'consumer-1');
                await instance.setCheckpoint('checkpoint-basic', 'consumer-1', 100);
                const checkpoint = await instance.getCheckpoint('checkpoint-basic', 'consumer-1');
                expect(checkpoint).toBe(100);
            });
            it('should return 0 for new consumer checkpoint', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'new-checkpoint',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.registerConsumer('new-checkpoint', 'fresh-consumer');
                const checkpoint = await instance.getCheckpoint('new-checkpoint', 'fresh-consumer');
                expect(checkpoint).toBe(0);
            });
            it('should not allow checkpoint to go backwards', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'no-backward',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.registerConsumer('no-backward', 'consumer-1');
                await instance.setCheckpoint('no-backward', 'consumer-1', 100);
                await expect(instance.setCheckpoint('no-backward', 'consumer-1', 50)).rejects.toThrow(/backward|invalid/i);
            });
        });
        describe('commitCheckpoint()', () => {
            it('should commit checkpoint and clear pending events before it', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'commit-checkpoint',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                const events = createSampleEvents(10, 'test-source');
                await instance.ingestBatch('commit-checkpoint', events);
                await instance.registerConsumer('commit-checkpoint', 'consumer-1');
                // Set checkpoint to sequence 5
                await instance.setCheckpoint('commit-checkpoint', 'consumer-1', 5);
                await instance.commitCheckpoint('commit-checkpoint', 'consumer-1');
                // Only events after checkpoint should be pending
                const pending = await instance.getPendingDeliveries('commit-checkpoint', 'consumer-1');
                expect(pending.every((e) => (e.sequenceNumber ?? 0) > 5)).toBe(true);
            });
        });
    });
    describe('Event Replay', () => {
        describe('replayEvents()', () => {
            it('should replay events from a sequence number', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'replay-basic',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.ingestBatch('replay-basic', createSampleEvents(20, 'test-source'));
                const replayed = await instance.replayEvents('replay-basic', 10);
                expect(replayed.length).toBe(11); // Events 10-20
                expect(replayed[0].sequenceNumber).toBe(10);
            });
            it('should replay events within a sequence range', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'replay-range',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.ingestBatch('replay-range', createSampleEvents(20, 'test-source'));
                const replayed = await instance.replayEvents('replay-range', 5, 15);
                expect(replayed.length).toBe(11); // Events 5-15
                expect(replayed[0].sequenceNumber).toBe(5);
                expect(replayed[replayed.length - 1].sequenceNumber).toBe(15);
            });
            it('should preserve event order during replay', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'replay-order',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.ingestBatch('replay-order', createSampleEvents(10, 'test-source'));
                const replayed = await instance.replayEvents('replay-order', 1);
                for (let i = 1; i < replayed.length; i++) {
                    expect(replayed[i].sequenceNumber).toBeGreaterThan(replayed[i - 1].sequenceNumber);
                }
            });
        });
        describe('replayForConsumer()', () => {
            it('should replay from consumer checkpoint', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'replay-consumer',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.ingestBatch('replay-consumer', createSampleEvents(20, 'test-source'));
                await instance.registerConsumer('replay-consumer', 'consumer-1');
                await instance.setCheckpoint('replay-consumer', 'consumer-1', 10);
                const replayed = await instance.replayForConsumer('replay-consumer', 'consumer-1');
                expect(replayed[0].sequenceNumber).toBeGreaterThan(10);
            });
            it('should allow custom starting point for consumer replay', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'replay-custom',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                await instance.ingestBatch('replay-custom', createSampleEvents(20, 'test-source'));
                await instance.registerConsumer('replay-custom', 'consumer-1');
                await instance.setCheckpoint('replay-custom', 'consumer-1', 15);
                // Replay from earlier point than checkpoint
                const replayed = await instance.replayForConsumer('replay-custom', 'consumer-1', 5);
                expect(replayed[0].sequenceNumber).toBe(5);
            });
        });
    });
    describe('Delivery Status Tracking', () => {
        describe('getDeliveryStatus()', () => {
            it('should track delivery status per consumer', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'status-tracking',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                const event = createSampleEvent({ source: 'test-source' });
                await instance.ingestEvent('status-tracking', event);
                await instance.registerConsumer('status-tracking', 'consumer-1');
                await instance.registerConsumer('status-tracking', 'consumer-2');
                await instance.acknowledgeEvent('status-tracking', event.id, 'consumer-1');
                const status = await instance.getDeliveryStatus('status-tracking', event.id);
                expect(status['consumer-1']?.status).toBe('acked');
                expect(status['consumer-2']?.status).toBe('pending');
            });
            it('should include timestamps in delivery status', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'status-timestamps',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                const event = createSampleEvent({ source: 'test-source' });
                await instance.ingestEvent('status-timestamps', event);
                await instance.registerConsumer('status-timestamps', 'consumer-1');
                const beforeAck = Date.now();
                await instance.acknowledgeEvent('status-timestamps', event.id, 'consumer-1');
                const status = await instance.getDeliveryStatus('status-timestamps', event.id);
                expect(status['consumer-1']?.timestamp).toBeGreaterThanOrEqual(beforeAck);
            });
        });
        describe('Batch Acknowledgment', () => {
            it('should acknowledge multiple events atomically', async () => {
                const instance = new CDCDO(ctx, env);
                await instance.createPipeline({
                    id: 'batch-ack',
                    sources: ['test-source'],
                    batching: { maxSize: 100, maxWaitMs: 60000 },
                    output: { format: 'parquet' },
                    deliveryGuarantee: 'at-least-once',
                    enabled: true,
                });
                const events = createSampleEvents(5, 'test-source');
                await instance.ingestBatch('batch-ack', events);
                await instance.registerConsumer('batch-ack', 'consumer-1');
                const eventIds = events.map((e) => e.id);
                const acks = await instance.acknowledgeEvents('batch-ack', eventIds, 'consumer-1');
                expect(acks).toHaveLength(5);
                expect(acks.every((a) => a.status === 'acked')).toBe(true);
                const pending = await instance.getPendingDeliveries('batch-ack', 'consumer-1');
                expect(pending).toHaveLength(0);
            });
        });
    });
});
