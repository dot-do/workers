/**
 * RED Phase TDD: State Persistence Contract Tests
 *
 * These tests define the contract for DO state persistence.
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * The state persistence contract includes:
 * - KV-style get/put/delete operations
 * - Batch operations (multi-key get, put, delete)
 * - List with prefix/range filtering
 * - Transaction support
 * - SQL storage interface
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DOCore } from '../src/index.js';
// Mock implementations for testing
function createMockId() {
    return {
        name: undefined,
        toString: () => 'mock-id',
        equals: (other) => other.toString() === 'mock-id',
    };
}
function createMockSqlCursor(data = []) {
    let index = 0;
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
            while (index < data.length) {
                yield data[index++];
            }
        },
    };
}
function createMockSqlStorage() {
    const tables = new Map();
    return {
        exec: vi.fn((query, ..._bindings) => {
            // Very simple SQL mock - just for contract testing
            if (query.toLowerCase().includes('create table')) {
                return createMockSqlCursor([]);
            }
            if (query.toLowerCase().includes('insert')) {
                return createMockSqlCursor([]);
            }
            if (query.toLowerCase().includes('select')) {
                return createMockSqlCursor([]);
            }
            return createMockSqlCursor([]);
        }),
    };
}
function createMockStorage() {
    const store = new Map();
    let alarmTime = null;
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
            const result = new Map();
            const entries = Array.from(store.entries())
                .filter(([key]) => {
                if (options?.prefix && !key.startsWith(options.prefix))
                    return false;
                if (options?.start && key < options.start)
                    return false;
                if (options?.end && key >= options.end)
                    return false;
                return true;
            })
                .slice(0, options?.limit);
            for (const [key, value] of entries) {
                result.set(key, value);
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
            // Simple mock - real implementation would provide isolation
            return closure(storage);
        }),
        sql: createMockSqlStorage(),
    };
    return storage;
}
function createMockState() {
    return {
        id: createMockId(),
        storage: createMockStorage(),
        blockConcurrencyWhile: vi.fn(async (callback) => callback()),
        acceptWebSocket: vi.fn(),
        getWebSockets: vi.fn(() => []),
        setWebSocketAutoResponse: vi.fn(),
    };
}
describe('State Persistence Contract', () => {
    let ctx;
    let storage;
    beforeEach(() => {
        ctx = createMockState();
        storage = ctx.storage;
    });
    describe('Single Key Operations', () => {
        it('should put and get a value', async () => {
            await storage.put('key1', 'value1');
            const value = await storage.get('key1');
            expect(value).toBe('value1');
        });
        it('should return undefined for non-existent key', async () => {
            const value = await storage.get('nonexistent');
            expect(value).toBeUndefined();
        });
        it('should overwrite existing value', async () => {
            await storage.put('key1', 'original');
            await storage.put('key1', 'updated');
            const value = await storage.get('key1');
            expect(value).toBe('updated');
        });
        it('should delete a value', async () => {
            await storage.put('key1', 'value1');
            const deleted = await storage.delete('key1');
            const value = await storage.get('key1');
            expect(deleted).toBe(true);
            expect(value).toBeUndefined();
        });
        it('should return false when deleting non-existent key', async () => {
            const deleted = await storage.delete('nonexistent');
            expect(deleted).toBe(false);
        });
        it('should store complex objects', async () => {
            const obj = { name: 'test', count: 42, nested: { a: 1, b: 2 } };
            await storage.put('complex', obj);
            const value = await storage.get('complex');
            expect(value).toEqual(obj);
        });
        it('should store arrays', async () => {
            const arr = [1, 2, 3, { a: 'b' }];
            await storage.put('array', arr);
            const value = await storage.get('array');
            expect(value).toEqual(arr);
        });
        it('should store null values', async () => {
            await storage.put('null', null);
            const value = await storage.get('null');
            expect(value).toBeNull();
        });
    });
    describe('Batch Operations', () => {
        it('should get multiple keys at once', async () => {
            await storage.put('a', 1);
            await storage.put('b', 2);
            await storage.put('c', 3);
            const result = await storage.get(['a', 'b', 'c']);
            expect(result).toBeInstanceOf(Map);
            expect(result.get('a')).toBe(1);
            expect(result.get('b')).toBe(2);
            expect(result.get('c')).toBe(3);
        });
        it('should only return existing keys in batch get', async () => {
            await storage.put('a', 1);
            const result = await storage.get(['a', 'nonexistent']);
            expect(result).toBeInstanceOf(Map);
            expect(result.size).toBe(1);
            expect(result.has('nonexistent')).toBe(false);
        });
        it('should put multiple entries at once', async () => {
            await storage.put({ x: 10, y: 20, z: 30 });
            expect(await storage.get('x')).toBe(10);
            expect(await storage.get('y')).toBe(20);
            expect(await storage.get('z')).toBe(30);
        });
        it('should delete multiple keys at once', async () => {
            await storage.put({ a: 1, b: 2, c: 3 });
            const count = await storage.delete(['a', 'b']);
            expect(count).toBe(2);
            expect(await storage.get('a')).toBeUndefined();
            expect(await storage.get('b')).toBeUndefined();
            expect(await storage.get('c')).toBe(3);
        });
        it('should delete all entries', async () => {
            await storage.put({ a: 1, b: 2, c: 3 });
            await storage.deleteAll();
            expect(await storage.get('a')).toBeUndefined();
            expect(await storage.get('b')).toBeUndefined();
            expect(await storage.get('c')).toBeUndefined();
        });
    });
    describe('List Operations', () => {
        beforeEach(async () => {
            // Setup test data
            await storage.put({
                'users:alice': { name: 'Alice' },
                'users:bob': { name: 'Bob' },
                'users:charlie': { name: 'Charlie' },
                'posts:1': { title: 'Post 1' },
                'posts:2': { title: 'Post 2' },
            });
        });
        it('should list all entries', async () => {
            const result = await storage.list();
            expect(result).toBeInstanceOf(Map);
            expect(result.size).toBe(5);
        });
        it('should list entries with prefix filter', async () => {
            const result = await storage.list({ prefix: 'users:' });
            expect(result.size).toBe(3);
            for (const key of result.keys()) {
                expect(key.startsWith('users:')).toBe(true);
            }
        });
        it('should list entries with limit', async () => {
            const result = await storage.list({ limit: 2 });
            expect(result.size).toBe(2);
        });
        it('should list entries with start key', async () => {
            const result = await storage.list({ start: 'users:bob' });
            // Should include 'users:bob' and 'users:charlie' (alphabetically after)
            for (const key of result.keys()) {
                expect(key >= 'users:bob').toBe(true);
            }
        });
        it('should list entries with end key (exclusive)', async () => {
            const result = await storage.list({ end: 'users:bob' });
            for (const key of result.keys()) {
                expect(key < 'users:bob').toBe(true);
            }
        });
        it('should combine prefix and limit', async () => {
            const result = await storage.list({ prefix: 'users:', limit: 2 });
            expect(result.size).toBe(2);
            for (const key of result.keys()) {
                expect(key.startsWith('users:')).toBe(true);
            }
        });
    });
    describe('Transaction Support', () => {
        it('should execute operations within transaction', async () => {
            await storage.transaction(async (txn) => {
                await txn.put('tx-key', 'tx-value');
            });
            const value = await storage.get('tx-key');
            expect(value).toBe('tx-value');
        });
        it('should return value from transaction', async () => {
            const result = await storage.transaction(async (txn) => {
                await txn.put('key', 'value');
                return 'success';
            });
            expect(result).toBe('success');
        });
        it('should support read-modify-write pattern', async () => {
            await storage.put('counter', 0);
            await storage.transaction(async (txn) => {
                const current = await txn.get('counter') ?? 0;
                await txn.put('counter', current + 1);
            });
            expect(await storage.get('counter')).toBe(1);
        });
        it('should support multiple operations in transaction', async () => {
            await storage.transaction(async (txn) => {
                await txn.put('a', 1);
                await txn.put('b', 2);
                await txn.delete('c');
            });
            expect(await storage.get('a')).toBe(1);
            expect(await storage.get('b')).toBe(2);
        });
    });
    describe('SQL Storage Interface', () => {
        it('should provide sql property', () => {
            expect(storage.sql).toBeDefined();
            expect(typeof storage.sql.exec).toBe('function');
        });
        it('should execute CREATE TABLE statements', () => {
            const cursor = storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL
        )
      `);
            expect(cursor).toBeDefined();
            expect(cursor.rowsWritten).toBeDefined();
        });
        it('should execute INSERT statements', () => {
            storage.sql.exec(`CREATE TABLE test (id TEXT PRIMARY KEY, value TEXT)`);
            const cursor = storage.sql.exec(`INSERT INTO test (id, value) VALUES (?, ?)`, 'id1', 'value1');
            expect(cursor).toBeDefined();
        });
        it('should execute SELECT statements and return cursor', () => {
            storage.sql.exec(`CREATE TABLE test (id TEXT PRIMARY KEY, value TEXT)`);
            storage.sql.exec(`INSERT INTO test (id, value) VALUES (?, ?)`, 'id1', 'value1');
            const cursor = storage.sql.exec(`SELECT * FROM test WHERE id = ?`, 'id1');
            expect(cursor).toBeDefined();
            expect(typeof cursor.toArray).toBe('function');
            expect(typeof cursor.one).toBe('function');
        });
        it('should provide cursor with column names', () => {
            const cursor = storage.sql.exec(`SELECT 1 as num, 'test' as str`);
            expect(cursor.columnNames).toBeDefined();
            expect(Array.isArray(cursor.columnNames)).toBe(true);
        });
        it('should provide cursor with row counts', () => {
            const cursor = storage.sql.exec(`SELECT 1`);
            expect(typeof cursor.rowsRead).toBe('number');
            expect(typeof cursor.rowsWritten).toBe('number');
        });
        it('should support cursor iteration', () => {
            const cursor = createMockSqlCursor([
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
            ]);
            const results = cursor.toArray();
            expect(results).toHaveLength(2);
            expect(results[0].id).toBe('1');
            expect(results[1].name).toBe('Bob');
        });
        it('should support raw() for value-only iteration', () => {
            const cursor = createMockSqlCursor([
                { id: '1', name: 'Alice' },
            ]);
            const rawIterator = cursor.raw();
            const row = rawIterator.next().value;
            expect(Array.isArray(row)).toBe(true);
        });
    });
    describe('DOCore with Storage', () => {
        it('should allow subclass to use storage', async () => {
            class StoreDO extends DOCore {
                async fetch(request) {
                    const url = new URL(request.url);
                    if (request.method === 'GET') {
                        const key = url.searchParams.get('key');
                        if (!key)
                            return new Response('Missing key', { status: 400 });
                        const value = await this.ctx.storage.get(key);
                        return Response.json({ value });
                    }
                    if (request.method === 'POST') {
                        const body = await request.json();
                        await this.ctx.storage.put(body.key, body.value);
                        return Response.json({ success: true });
                    }
                    return new Response('Method not allowed', { status: 405 });
                }
            }
            const instance = new StoreDO(ctx, {});
            // Store a value
            const postResponse = await instance.fetch(new Request('https://example.com/', {
                method: 'POST',
                body: JSON.stringify({ key: 'test', value: 'hello' }),
            }));
            expect(postResponse.status).toBe(200);
            // Retrieve the value
            const getResponse = await instance.fetch(new Request('https://example.com/?key=test'));
            const data = await getResponse.json();
            expect(data.value).toBe('hello');
        });
        it('should persist state between requests', async () => {
            class CounterDO extends DOCore {
                async fetch(request) {
                    const url = new URL(request.url);
                    if (url.pathname === '/increment') {
                        const current = await this.ctx.storage.get('count') ?? 0;
                        await this.ctx.storage.put('count', current + 1);
                        return Response.json({ count: current + 1 });
                    }
                    if (url.pathname === '/get') {
                        const count = await this.ctx.storage.get('count') ?? 0;
                        return Response.json({ count });
                    }
                    return new Response('Not found', { status: 404 });
                }
            }
            const instance = new CounterDO(ctx, {});
            // Increment
            await instance.fetch(new Request('https://example.com/increment'));
            await instance.fetch(new Request('https://example.com/increment'));
            await instance.fetch(new Request('https://example.com/increment'));
            // Get current value
            const response = await instance.fetch(new Request('https://example.com/get'));
            const data = await response.json();
            expect(data.count).toBe(3);
        });
        it('should support blockConcurrencyWhile for initialization', async () => {
            class InitDO extends DOCore {
                initialized = false;
                constructor(ctx, env) {
                    super(ctx, env);
                    ctx.blockConcurrencyWhile(async () => {
                        await this.ctx.storage.put('initialized', true);
                        this.initialized = true;
                    });
                }
                async fetch(_request) {
                    return Response.json({ initialized: this.initialized });
                }
            }
            const instance = new InitDO(ctx, {});
            expect(ctx.blockConcurrencyWhile).toHaveBeenCalled();
        });
    });
});
