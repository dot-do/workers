/**
 * Tests for EventsMixin
 *
 * Covers:
 * - Event pub/sub (emit/on/once/off)
 * - Event sourcing (appendEvent, getEvents, rebuildState)
 * - WebSocket broadcast integration
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventsMixin, } from '../src/index.js';
// Mock implementations
function createMockId() {
    return {
        name: undefined,
        toString: () => 'mock-id',
        equals: (other) => other.toString() === 'mock-id',
    };
}
function createMockSqlCursor() {
    return {
        columnNames: [],
        rowsRead: 0,
        rowsWritten: 0,
        toArray: () => [],
        one: () => null,
        raw: function* () { },
        [Symbol.iterator]: function* () { },
    };
}
function createMockSqlStorage() {
    return {
        exec: () => createMockSqlCursor(),
    };
}
function createMockStorage() {
    const store = new Map();
    let alarmTime = null;
    return {
        _store: store,
        get: vi.fn(async (keyOrKeys) => {
            if (Array.isArray(keyOrKeys)) {
                const result = new Map();
                for (const key of keyOrKeys) {
                    const value = store.get(key);
                    if (value !== undefined)
                        result.set(key, value);
                }
                return result;
            }
            return store.get(keyOrKeys);
        }),
        put: vi.fn(async (keyOrEntries, value) => {
            if (typeof keyOrEntries === 'string') {
                store.set(keyOrEntries, value);
            }
            else {
                for (const [k, v] of Object.entries(keyOrEntries)) {
                    store.set(k, v);
                }
            }
        }),
        delete: vi.fn(async (keyOrKeys) => {
            if (Array.isArray(keyOrKeys)) {
                let count = 0;
                for (const key of keyOrKeys) {
                    if (store.delete(key))
                        count++;
                }
                return count;
            }
            return store.delete(keyOrKeys);
        }),
        deleteAll: vi.fn(async () => store.clear()),
        list: vi.fn(async (options) => {
            const result = new Map();
            for (const [key, value] of store) {
                if (!options?.prefix || key.startsWith(options.prefix)) {
                    result.set(key, value);
                }
            }
            return result;
        }),
        getAlarm: vi.fn(async () => alarmTime),
        setAlarm: vi.fn(async (time) => {
            alarmTime = time instanceof Date ? time.getTime() : time;
        }),
        deleteAlarm: vi.fn(async () => {
            alarmTime = null;
        }),
        transaction: vi.fn(async (closure) => {
            return closure(createMockStorage());
        }),
        sql: createMockSqlStorage(),
    };
}
// Mock WebSocket for broadcast tests
class MockWebSocket {
    readyState = 1; // OPEN
    sentMessages = [];
    attachment = null;
    tags = [];
    send(data) {
        if (this.readyState !== 1) {
            throw new Error('WebSocket is not open');
        }
        this.sentMessages.push(data);
    }
    close() {
        this.readyState = 3; // CLOSED
    }
    serializeAttachment(attachment) {
        this.attachment = attachment;
    }
    deserializeAttachment() {
        return this.attachment;
    }
    setTags(tags) {
        this.tags = tags;
    }
    getTags() {
        return this.tags;
    }
}
function createMockState() {
    const webSockets = new Map();
    return {
        id: createMockId(),
        storage: createMockStorage(),
        blockConcurrencyWhile: vi.fn(async (callback) => callback()),
        acceptWebSocket: vi.fn((ws, tags) => {
            const mockWs = ws;
            if (tags)
                mockWs.setTags(tags);
            const id = crypto.randomUUID();
            webSockets.set(id, mockWs);
        }),
        getWebSockets: vi.fn((tag) => {
            const result = [];
            for (const ws of webSockets.values()) {
                if (!tag || ws.getTags().includes(tag)) {
                    result.push(ws);
                }
            }
            return result;
        }),
        setWebSocketAutoResponse: vi.fn(),
        webSockets,
    };
}
// Test class extending EventsMixin
class TestEventsDO extends EventsMixin {
    state = { counter: 0, items: [] };
    async rebuildState() {
        this.state = { counter: 0, items: [] };
        const events = await this.getEvents();
        for (const event of events) {
            if (event.type === 'counter:increment') {
                this.state.counter += event.data.value ?? 1;
            }
            else if (event.type === 'item:added') {
                if (event.data.item) {
                    this.state.items.push(event.data.item);
                }
            }
        }
    }
}
describe('EventsMixin', () => {
    let ctx;
    let instance;
    beforeEach(() => {
        ctx = createMockState();
        instance = new TestEventsDO(ctx, {});
    });
    describe('Event Pub/Sub', () => {
        it('should emit events to subscribers', async () => {
            const handler = vi.fn();
            instance.on('test:event', handler);
            await instance.emit('test:event', { message: 'hello' });
            expect(handler).toHaveBeenCalledWith({ message: 'hello' });
        });
        it('should support multiple subscribers', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            instance.on('test:event', handler1);
            instance.on('test:event', handler2);
            await instance.emit('test:event', { value: 42 });
            expect(handler1).toHaveBeenCalledWith({ value: 42 });
            expect(handler2).toHaveBeenCalledWith({ value: 42 });
        });
        it('should return unsubscribe function from on()', async () => {
            const handler = vi.fn();
            const unsubscribe = instance.on('test:event', handler);
            await instance.emit('test:event', 'first');
            expect(handler).toHaveBeenCalledTimes(1);
            unsubscribe();
            await instance.emit('test:event', 'second');
            expect(handler).toHaveBeenCalledTimes(1);
        });
        it('should support once() for single-fire events', async () => {
            const handler = vi.fn();
            instance.once('test:event', handler);
            await instance.emit('test:event', 'first');
            await instance.emit('test:event', 'second');
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith('first');
        });
        it('should support off() to remove specific handler', async () => {
            const handler = vi.fn();
            instance.on('test:event', handler);
            await instance.emit('test:event', 'first');
            expect(handler).toHaveBeenCalledTimes(1);
            instance.off('test:event', handler);
            await instance.emit('test:event', 'second');
            expect(handler).toHaveBeenCalledTimes(1);
        });
        it('should handle errors in handlers gracefully', async () => {
            const errorHandler = vi.fn(() => {
                throw new Error('Handler error');
            });
            const okHandler = vi.fn();
            instance.on('test:event', errorHandler);
            instance.on('test:event', okHandler);
            // Should not throw
            await instance.emit('test:event', 'data');
            expect(errorHandler).toHaveBeenCalled();
            expect(okHandler).toHaveBeenCalled();
        });
        it('should support async handlers', async () => {
            const results = [];
            instance.on('test:event', async () => {
                await new Promise((r) => setTimeout(r, 10));
                results.push('first');
            });
            instance.on('test:event', async () => {
                results.push('second');
            });
            await instance.emit('test:event', null);
            expect(results).toEqual(['first', 'second']);
        });
        it('should track listener count', () => {
            expect(instance.listenerCount('test:event')).toBe(0);
            const unsub1 = instance.on('test:event', () => { });
            expect(instance.listenerCount('test:event')).toBe(1);
            instance.on('test:event', () => { });
            expect(instance.listenerCount('test:event')).toBe(2);
            unsub1();
            expect(instance.listenerCount('test:event')).toBe(1);
        });
        it('should list registered event names', () => {
            instance.on('event:a', () => { });
            instance.on('event:b', () => { });
            instance.on('event:c', () => { });
            const names = instance.eventNames();
            expect(names).toContain('event:a');
            expect(names).toContain('event:b');
            expect(names).toContain('event:c');
        });
        it('should remove all listeners for an event', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            instance.on('test:event', handler1);
            instance.on('test:event', handler2);
            instance.removeAllListeners('test:event');
            await instance.emit('test:event', 'data');
            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
        it('should remove all listeners when no event specified', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            instance.on('event:a', handler1);
            instance.on('event:b', handler2);
            instance.removeAllListeners();
            await instance.emit('event:a', 'data');
            await instance.emit('event:b', 'data');
            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
    });
    describe('Event Sourcing', () => {
        it('should append events to storage', async () => {
            const event = await instance.appendEvent({
                type: 'user:created',
                data: { userId: '123', name: 'Alice' },
            });
            expect(event.id).toBeDefined();
            expect(event.type).toBe('user:created');
            expect(event.data).toEqual({ userId: '123', name: 'Alice' });
            expect(event.timestamp).toBeGreaterThan(0);
            // Verify stored
            const storage = ctx.storage;
            const keys = Array.from(storage._store.keys());
            expect(keys.some((k) => k.startsWith('events:'))).toBe(true);
        });
        it('should get events from storage', async () => {
            await instance.appendEvent({ type: 'event:1', data: { n: 1 } });
            await instance.appendEvent({ type: 'event:2', data: { n: 2 } });
            await instance.appendEvent({ type: 'event:3', data: { n: 3 } });
            const events = await instance.getEvents();
            expect(events).toHaveLength(3);
            expect(events[0]?.data).toEqual({ n: 1 });
            expect(events[2]?.data).toEqual({ n: 3 });
        });
        it('should filter events by timestamp', async () => {
            const event1 = await instance.appendEvent({ type: 'event:1', data: 1 });
            await new Promise((r) => setTimeout(r, 10));
            await instance.appendEvent({ type: 'event:2', data: 2 });
            await instance.appendEvent({ type: 'event:3', data: 3 });
            const events = await instance.getEvents(event1.timestamp);
            expect(events).toHaveLength(2);
            expect(events[0]?.data).toBe(2);
        });
        it('should filter events by type', async () => {
            await instance.appendEvent({ type: 'type:a', data: 'a1' });
            await instance.appendEvent({ type: 'type:b', data: 'b1' });
            await instance.appendEvent({ type: 'type:a', data: 'a2' });
            const events = await instance.getEvents(undefined, { type: 'type:a' });
            expect(events).toHaveLength(2);
            expect(events[0]?.data).toBe('a1');
            expect(events[1]?.data).toBe('a2');
        });
        it('should filter events by aggregateId', async () => {
            await instance.appendEvent({ type: 'event', data: 1, aggregateId: 'order-1' });
            await instance.appendEvent({ type: 'event', data: 2, aggregateId: 'order-2' });
            await instance.appendEvent({ type: 'event', data: 3, aggregateId: 'order-1' });
            const events = await instance.getEvents(undefined, { aggregateId: 'order-1' });
            expect(events).toHaveLength(2);
            expect(events[0]?.data).toBe(1);
            expect(events[1]?.data).toBe(3);
        });
        it('should limit events returned', async () => {
            for (let i = 0; i < 10; i++) {
                await instance.appendEvent({ type: 'event', data: i });
            }
            const events = await instance.getEvents(undefined, { limit: 5 });
            expect(events).toHaveLength(5);
        });
        it('should emit events to subscribers when appending', async () => {
            const handler = vi.fn();
            instance.on('item:added', handler);
            await instance.appendEvent({
                type: 'item:added',
                data: { item: 'test-item' },
            });
            expect(handler).toHaveBeenCalledWith({ item: 'test-item' });
        });
        it('should rebuild state from event log', async () => {
            await instance.appendEvent({ type: 'counter:increment', data: { value: 5 } });
            await instance.appendEvent({ type: 'item:added', data: { item: 'apple' } });
            await instance.appendEvent({ type: 'counter:increment', data: { value: 3 } });
            await instance.appendEvent({ type: 'item:added', data: { item: 'banana' } });
            // Reset state
            instance.state = { counter: 0, items: [] };
            await instance.rebuildState();
            expect(instance.state.counter).toBe(8);
            expect(instance.state.items).toEqual(['apple', 'banana']);
        });
        it('should clear events', async () => {
            await instance.appendEvent({ type: 'event:1', data: 1 });
            await instance.appendEvent({ type: 'event:2', data: 2 });
            await instance.clearEvents();
            const events = await instance.getEvents();
            expect(events).toHaveLength(0);
        });
        it('should count events', async () => {
            expect(await instance.getEventCount()).toBe(0);
            await instance.appendEvent({ type: 'event', data: 1 });
            await instance.appendEvent({ type: 'event', data: 2 });
            expect(await instance.getEventCount()).toBe(2);
        });
        it('should support custom event IDs', async () => {
            const event = await instance.appendEvent({
                id: 'custom-id-123',
                type: 'custom:event',
                data: { test: true },
            });
            expect(event.id).toBe('custom-id-123');
        });
        it('should support event metadata', async () => {
            const event = await instance.appendEvent({
                type: 'user:action',
                data: { action: 'click' },
                metadata: { userId: 'user-123', sessionId: 'session-456' },
            });
            expect(event.metadata).toEqual({
                userId: 'user-123',
                sessionId: 'session-456',
            });
        });
    });
    describe('WebSocket Broadcast', () => {
        it('should broadcast to all connected WebSockets', async () => {
            const ws1 = new MockWebSocket();
            const ws2 = new MockWebSocket();
            ctx.acceptWebSocket(ws1);
            ctx.acceptWebSocket(ws2);
            const sent = await instance.broadcast('message', { text: 'hello' });
            expect(sent).toBe(2);
            expect(ws1.sentMessages).toHaveLength(1);
            expect(ws2.sentMessages).toHaveLength(1);
            const msg1 = JSON.parse(ws1.sentMessages[0]);
            expect(msg1.event).toBe('message');
            expect(msg1.data).toEqual({ text: 'hello' });
        });
        it('should broadcast to specific room tag', async () => {
            const ws1 = new MockWebSocket();
            const ws2 = new MockWebSocket();
            const ws3 = new MockWebSocket();
            ctx.acceptWebSocket(ws1, ['room:lobby']);
            ctx.acceptWebSocket(ws2, ['room:lobby']);
            ctx.acceptWebSocket(ws3, ['room:private']);
            const sent = await instance.broadcast('chat', { message: 'hi' }, { tag: 'room:lobby' });
            expect(sent).toBe(2);
            expect(ws1.sentMessages).toHaveLength(1);
            expect(ws2.sentMessages).toHaveLength(1);
            expect(ws3.sentMessages).toHaveLength(0);
        });
        it('should skip closed WebSockets', async () => {
            const ws1 = new MockWebSocket();
            const ws2 = new MockWebSocket();
            ws2.readyState = 3; // CLOSED
            ctx.acceptWebSocket(ws1);
            ctx.acceptWebSocket(ws2);
            const sent = await instance.broadcast('event', { data: true });
            expect(sent).toBe(1);
            expect(ws1.sentMessages).toHaveLength(1);
        });
        it('should use broadcastToRoom convenience method', async () => {
            const ws1 = new MockWebSocket();
            const ws2 = new MockWebSocket();
            ctx.acceptWebSocket(ws1, ['room:general']);
            ctx.acceptWebSocket(ws2, ['room:other']);
            const sent = await instance.broadcastToRoom('general', 'announcement', { text: 'news' });
            expect(sent).toBe(1);
            expect(ws1.sentMessages).toHaveLength(1);
        });
        it('should emit and broadcast together', async () => {
            const handler = vi.fn();
            instance.on('combined:event', handler);
            const ws = new MockWebSocket();
            ctx.acceptWebSocket(ws);
            const result = await instance.emitAndBroadcast('combined:event', { value: 42 });
            expect(handler).toHaveBeenCalledWith({ value: 42 });
            expect(result.listeners).toBe(1);
            expect(result.sockets).toBe(1);
            expect(ws.sentMessages).toHaveLength(1);
        });
        it('should append and broadcast together', async () => {
            const handler = vi.fn();
            instance.on('persistent:event', handler);
            const ws = new MockWebSocket();
            ctx.acceptWebSocket(ws);
            const result = await instance.appendAndBroadcast({
                type: 'persistent:event',
                data: { saved: true },
            });
            expect(result.event.type).toBe('persistent:event');
            expect(result.sockets).toBe(1);
            expect(handler).toHaveBeenCalled();
            expect(ws.sentMessages).toHaveLength(1);
            // Verify persisted
            const events = await instance.getEvents();
            expect(events).toHaveLength(1);
        });
    });
});
