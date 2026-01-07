/**
 * Test helpers for cdc.do worker tests
 *
 * Provides mock implementations for CDCDO testing.
 */
import { vi } from 'vitest';
/**
 * Create a mock DurableObjectId
 */
export function createMockId(name) {
    const idString = name ?? `mock-id-${Math.random().toString(36).slice(2, 10)}`;
    return {
        name,
        toString: () => idString,
        equals: (other) => other.toString() === idString,
    };
}
/**
 * Create a mock DOStorage with optional initial data
 */
export function createMockStorage(initialData) {
    const store = new Map();
    if (initialData) {
        for (const [key, value] of Object.entries(initialData)) {
            store.set(key, value);
        }
    }
    // Implementation functions with proper behavior
    const getImpl = async (keyOrKeys) => {
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
    };
    const putImpl = async (keyOrEntries, value) => {
        if (typeof keyOrEntries === 'string') {
            store.set(keyOrEntries, value);
        }
        else {
            for (const [k, v] of Object.entries(keyOrEntries)) {
                store.set(k, v);
            }
        }
    };
    const deleteImpl = async (keyOrKeys) => {
        if (Array.isArray(keyOrKeys)) {
            let count = 0;
            for (const key of keyOrKeys) {
                if (store.delete(key))
                    count++;
            }
            return count;
        }
        return store.delete(keyOrKeys);
    };
    const deleteAllImpl = async () => {
        store.clear();
    };
    const listImpl = async (options) => {
        let entries = Array.from(store.entries());
        if (options?.prefix) {
            entries = entries.filter(([key]) => key.startsWith(options.prefix));
        }
        entries.sort(([a], [b]) => a.localeCompare(b));
        if (options?.limit !== undefined) {
            entries = entries.slice(0, options.limit);
        }
        return new Map(entries);
    };
    // Create storage object first without transaction to avoid circular reference
    const storage = {
        get: vi.fn(getImpl),
        put: vi.fn(putImpl),
        delete: vi.fn(deleteImpl),
        deleteAll: vi.fn(deleteAllImpl),
        list: vi.fn(listImpl),
        transaction: null,
    };
    // Add transaction with access to storage
    storage.transaction = vi.fn(async (closure) => {
        return closure(storage);
    });
    return storage;
}
/**
 * Create a mock DOState
 */
export function createMockState(options) {
    const id = options?.id ?? createMockId();
    const storage = options?.storage ?? createMockStorage(options?.initialData);
    return {
        id,
        storage,
        blockConcurrencyWhile: vi.fn(async (callback) => callback()),
        acceptWebSocket: vi.fn(),
        getWebSockets: vi.fn(() => []),
        setWebSocketAutoResponse: vi.fn(),
    };
}
/**
 * Create a mock R2 bucket
 */
export function createMockR2Bucket() {
    const store = new Map();
    return {
        put: vi.fn(async (key, value, options) => {
            let data;
            if (typeof value === 'string') {
                data = new TextEncoder().encode(value).buffer;
            }
            else if (value instanceof ArrayBuffer) {
                data = value;
            }
            else {
                // ReadableStream - consume it
                const reader = value.getReader();
                const chunks = [];
                let done = false;
                while (!done) {
                    const result = await reader.read();
                    if (result.value)
                        chunks.push(result.value);
                    done = result.done;
                }
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of chunks) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }
                data = combined.buffer;
            }
            store.set(key, { data, metadata: options });
            return {
                key,
                size: data.byteLength,
                etag: `etag-${Date.now()}`,
                uploaded: new Date(),
                httpMetadata: options?.httpMetadata,
                customMetadata: options?.customMetadata,
                arrayBuffer: async () => data,
                text: async () => new TextDecoder().decode(data),
                json: async () => JSON.parse(new TextDecoder().decode(data)),
            };
        }),
        get: vi.fn(async (key) => {
            const entry = store.get(key);
            if (!entry)
                return null;
            return {
                key,
                size: entry.data.byteLength,
                etag: `etag-${Date.now()}`,
                uploaded: new Date(),
                httpMetadata: entry.metadata?.httpMetadata,
                customMetadata: entry.metadata?.customMetadata,
                arrayBuffer: async () => entry.data,
                text: async () => new TextDecoder().decode(entry.data),
                json: async () => JSON.parse(new TextDecoder().decode(entry.data)),
            };
        }),
        delete: vi.fn(async (keys) => {
            const keyList = Array.isArray(keys) ? keys : [keys];
            for (const key of keyList) {
                store.delete(key);
            }
        }),
        list: vi.fn(async (options) => {
            let entries = Array.from(store.entries());
            if (options?.prefix) {
                entries = entries.filter(([key]) => key.startsWith(options.prefix));
            }
            entries.sort(([a], [b]) => a.localeCompare(b));
            const limit = options?.limit ?? 1000;
            const truncated = entries.length > limit;
            entries = entries.slice(0, limit);
            return {
                objects: entries.map(([key, { data, metadata }]) => ({
                    key,
                    size: data.byteLength,
                    etag: `etag-${Date.now()}`,
                    uploaded: new Date(),
                    httpMetadata: metadata?.httpMetadata,
                    customMetadata: metadata?.customMetadata,
                    arrayBuffer: async () => data,
                    text: async () => new TextDecoder().decode(data),
                    json: async () => JSON.parse(new TextDecoder().decode(data)),
                })),
                truncated,
                cursor: truncated ? 'next-cursor' : undefined,
            };
        }),
        head: vi.fn(async (key) => {
            const entry = store.get(key);
            if (!entry)
                return null;
            return {
                key,
                size: entry.data.byteLength,
                etag: `etag-${Date.now()}`,
                uploaded: new Date(),
                httpMetadata: entry.metadata?.httpMetadata,
                customMetadata: entry.metadata?.customMetadata,
                arrayBuffer: async () => entry.data,
                text: async () => new TextDecoder().decode(entry.data),
                json: async () => JSON.parse(new TextDecoder().decode(entry.data)),
            };
        }),
    };
}
/**
 * Create a mock Queue
 */
export function createMockQueue() {
    const messages = [];
    return {
        messages,
        send: vi.fn(async (message) => {
            messages.push(message);
        }),
        sendBatch: vi.fn(async (batch) => {
            for (const { body } of batch) {
                messages.push(body);
            }
        }),
    };
}
/**
 * Create mock environment
 */
export function createMockEnv() {
    return {
        CDC_DO: {
            get: vi.fn(),
            idFromName: vi.fn((name) => createMockId(name)),
        },
        CDC_BUCKET: createMockR2Bucket(),
        CDC_QUEUE: createMockQueue(),
    };
}
/**
 * Create a sample CDC event for testing
 */
export function createSampleEvent(overrides) {
    return {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        source: 'test-source',
        type: 'test.event',
        data: { key: 'value' },
        metadata: {},
        ...overrides,
    };
}
/**
 * Create multiple sample events
 */
export function createSampleEvents(count, source) {
    return Array.from({ length: count }, (_, i) => createSampleEvent({
        id: `evt-${Date.now()}-${i}`,
        sequenceNumber: i + 1,
        source: source ?? 'test-source',
        type: i % 2 === 0 ? 'user.created' : 'user.updated',
    }));
}
