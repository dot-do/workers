/**
 * Test helpers for functions.do worker tests
 *
 * Provides mock implementations for FunctionsDO testing.
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
    const storage = {
        get: vi.fn(getImpl),
        put: vi.fn(putImpl),
        delete: vi.fn(deleteImpl),
        deleteAll: vi.fn(deleteAllImpl),
        list: vi.fn(listImpl),
        transaction: null,
    };
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
 * Create a mock AI binding
 */
export function createMockAI(responses) {
    const defaultResponses = new Map([
        ['@cf/meta/llama-3.1-8b-instruct', { response: 'Mock AI response' }],
        ['@cf/baai/bge-small-en-v1.5', { data: [[0.1, 0.2, 0.3]] }],
    ]);
    const responseMap = responses ?? defaultResponses;
    return {
        run: vi.fn(async (model, _input) => {
            const response = responseMap.get(model);
            if (response)
                return response;
            return { response: `Mock response for ${model}` };
        }),
    };
}
/**
 * Create mock environment
 */
export function createMockEnv(options) {
    return {
        FUNCTIONS_DO: {
            get: vi.fn(),
            idFromName: vi.fn((name) => createMockId(name)),
        },
        AI: createMockAI(options?.aiResponses),
    };
}
/**
 * Create a mock function definition
 */
export function createMockFunction(overrides) {
    return {
        name: 'testFunction',
        description: 'A test function',
        parameters: {
            type: 'object',
            properties: {
                input: { type: 'string' }
            }
        },
        handler: async (params) => ({ result: params }),
        ...overrides,
    };
}
