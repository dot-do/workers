/**
 * Shared test helpers for do-core tests
 *
 * Provides mock implementations for DOState, DOStorage, and related types.
 * Extracted to reduce duplication across test files.
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
 * Create a mock SQL cursor with optional data
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
 * Create a mock SQL storage interface
 */
export function createMockSqlStorage() {
    return {
        exec: () => createMockSqlCursor([]),
    };
}
/**
 * Create a mock DOStorage with optional initial data
 */
export function createMockStorage(options = {}) {
    const store = new Map();
    let alarmTime = options.initialAlarm ?? null;
    // Seed initial data
    if (options.initialData) {
        for (const [key, value] of Object.entries(options.initialData)) {
            store.set(key, value);
        }
    }
    const storage = {
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
        deleteAll: vi.fn(async () => {
            store.clear();
        }),
        list: vi.fn(async (options) => {
            let entries = Array.from(store.entries());
            // Apply prefix filter
            if (options?.prefix) {
                entries = entries.filter(([key]) => key.startsWith(options.prefix));
            }
            // Apply start filter (inclusive)
            if (options?.start) {
                entries = entries.filter(([key]) => key >= options.start);
            }
            // Apply startAfter filter (exclusive)
            if (options?.startAfter) {
                entries = entries.filter(([key]) => key > options.startAfter);
            }
            // Apply end filter (exclusive)
            if (options?.end) {
                entries = entries.filter(([key]) => key < options.end);
            }
            // Sort alphabetically (ascending by default)
            entries.sort(([a], [b]) => a.localeCompare(b));
            // Apply reverse
            if (options?.reverse) {
                entries.reverse();
            }
            // Apply limit
            if (options?.limit !== undefined) {
                entries = entries.slice(0, options.limit);
            }
            return new Map(entries);
        }),
        getAlarm: vi.fn(async () => alarmTime),
        setAlarm: vi.fn(async (time) => {
            alarmTime = time instanceof Date ? time.getTime() : time;
        }),
        deleteAlarm: vi.fn(async () => {
            alarmTime = null;
        }),
        transaction: vi.fn(async (closure) => {
            // Create a fresh mock storage for the transaction
            return closure(createMockStorage());
        }),
        sql: createMockSqlStorage(),
    };
    return storage;
}
/**
 * Create a mock DOState
 * @param idOrOptions - Either a DurableObjectId directly or an options object
 */
export function createMockState(idOrOptions) {
    // Support both: createMockState(id) and createMockState({ id, storage })
    let options;
    if (idOrOptions && 'toString' in idOrOptions) {
        options = { id: idOrOptions };
    }
    else {
        options = idOrOptions ?? {};
    }
    const id = options.id ?? createMockId();
    const storage = options.storage ?? createMockStorage({
        initialData: options.initialData,
    });
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
 * Create a mock DOState with WebSocket tracking
 * Returns state with additional helper to track accepted WebSockets
 */
export function createMockStateWithWebSockets(options = {}) {
    const id = options.id ?? createMockId();
    const storage = options.storage ?? createMockStorage({
        initialData: options.initialData,
    });
    const acceptedWebSockets = [];
    return {
        id,
        storage,
        _acceptedWebSockets: acceptedWebSockets,
        blockConcurrencyWhile: vi.fn(async (callback) => callback()),
        acceptWebSocket: vi.fn((ws, tags) => {
            acceptedWebSockets.push({ ws, tags: tags ?? [] });
        }),
        getWebSockets: vi.fn((tag) => {
            if (tag) {
                return acceptedWebSockets
                    .filter(s => s.tags.includes(tag))
                    .map(s => s.ws);
            }
            return acceptedWebSockets.map(s => s.ws);
        }),
        setWebSocketAutoResponse: vi.fn(),
    };
}
