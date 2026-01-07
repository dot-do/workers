/**
 * Test helpers for database.do worker tests
 *
 * Provides mock implementations for DatabaseDO testing.
 */
import { vi } from 'vitest';
/**
 * Create a mock SQL cursor with test data
 */
export function createMockSqlCursor(data = []) {
    return {
        columnNames: data.length > 0 ? Object.keys(data[0]) : [],
        rowsRead: data.length,
        rowsWritten: 0,
        toArray: () => [...data],
        one: () => data[0] ?? null,
        raw: function* () {
            for (const row of data) {
                yield Object.values(row);
            }
        },
        [Symbol.iterator]: function* () {
            for (const row of data) {
                yield row;
            }
        },
    };
}
/**
 * Create a mock SQL storage
 */
export function createMockSqlStorage() {
    return {
        exec: vi.fn(() => createMockSqlCursor([])),
    };
}
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
        sql: createMockSqlStorage(),
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
 * Create mock environment
 */
export function createMockEnv() {
    return {
        DATABASE_DO: {
            get: vi.fn(),
            idFromName: vi.fn((name) => createMockId(name)),
        },
    };
}
