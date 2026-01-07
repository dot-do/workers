/**
 * Test helpers for router worker tests
 *
 * Provides mock implementations for RouterDO testing.
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
    return {
        get: vi.fn(getImpl),
        put: vi.fn(putImpl),
        delete: vi.fn(deleteImpl),
        deleteAll: vi.fn(deleteAllImpl),
        list: vi.fn(listImpl),
    };
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
    };
}
/**
 * Create mock environment
 */
export function createMockEnv() {
    return {
        ROUTER_DO: {
            get: vi.fn(),
            idFromName: vi.fn((name) => createMockId(name)),
        },
        DATABASE_DO: {
            get: vi.fn(),
            idFromName: vi.fn((name) => createMockId(name)),
        },
        FUNCTIONS_DO: {
            get: vi.fn(),
            idFromName: vi.fn((name) => createMockId(name)),
        },
        ROUTE_CONFIG: {
            get: vi.fn(async () => null),
            put: vi.fn(async () => { }),
        },
    };
}
/**
 * Create a mock request with hostname
 */
export function createRequest(url, options) {
    const request = new Request(url, options);
    return request;
}
/**
 * Create a mock forwarding target that responds
 */
export function createMockTarget(response) {
    return {
        fetch: vi.fn(async () => {
            return typeof response === 'function' ? response() : response;
        }),
    };
}
