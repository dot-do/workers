/**
 * RED Phase TDD: Schema Initialization Tests - Lazy-Init Interface
 *
 * These tests define the contract for lazy schema initialization.
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * Issue: workers-4b1a
 *
 * Problem Being Solved:
 * Schema initialization is currently called on every operation, causing unnecessary overhead.
 * This test suite defines the interface for lazy schema initialization that:
 * - Only initializes schema once per DO instance
 * - Caches schema after first load
 * - Validates schema on first access
 * - Uses memory-efficient patterns
 *
 * The lazy initialization contract includes:
 * - Schema not loaded until first use
 * - Schema caching after first load
 * - Schema validation on first access
 * - Memory efficiency patterns
 * - Thread-safe initialization (blockConcurrencyWhile)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DOCore, } from '../src/index.js';
import { LazySchemaManager, createLazySchemaManager, } from '../src/schema.js';
// ============================================
// Mock Implementations
// ============================================
function createMockId(name) {
    return {
        name,
        toString: () => name ?? 'mock-id-12345',
        equals: (other) => other.toString() === (name ?? 'mock-id-12345'),
    };
}
function createMockSqlCursor(data = []) {
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
function createMockSqlStorage() {
    const execSpy = vi.fn((_query, ..._bindings) => {
        return createMockSqlCursor([]);
    });
    return {
        exec: execSpy,
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
        list: vi.fn(async () => {
            return new Map(store);
        }),
        getAlarm: vi.fn(async () => alarmTime),
        setAlarm: vi.fn(async (time) => {
            alarmTime = time instanceof Date ? time.getTime() : time;
        }),
        deleteAlarm: vi.fn(async () => {
            alarmTime = null;
        }),
        transaction: vi.fn(async (closure) => {
            return closure(storage);
        }),
        sql: createMockSqlStorage(),
    };
    return storage;
}
function createMockState(id) {
    return {
        id: id ?? createMockId(),
        storage: createMockStorage(),
        blockConcurrencyWhile: vi.fn(async (callback) => callback()),
        acceptWebSocket: vi.fn(),
        getWebSockets: vi.fn(() => []),
        setWebSocketAutoResponse: vi.fn(),
    };
}
// ============================================
// Test Suites
// ============================================
describe('Lazy Schema Initialization Contract', () => {
    let ctx;
    let storage;
    beforeEach(() => {
        ctx = createMockState();
        storage = ctx.storage;
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('LazySchemaManager Interface', () => {
        it('should export LazySchemaManager class', () => {
            expect(LazySchemaManager).toBeDefined();
            expect(typeof LazySchemaManager).toBe('function');
        });
        it('should export createLazySchemaManager factory', () => {
            expect(createLazySchemaManager).toBeDefined();
            expect(typeof createLazySchemaManager).toBe('function');
        });
        it('should create instance with storage', () => {
            const manager = createLazySchemaManager(storage);
            expect(manager).toBeInstanceOf(LazySchemaManager);
        });
        it('should have required methods', () => {
            const manager = createLazySchemaManager(storage);
            expect(typeof manager.isInitialized).toBe('function');
            expect(typeof manager.ensureInitialized).toBe('function');
            expect(typeof manager.getSchema).toBe('function');
            expect(typeof manager.reset).toBe('function');
        });
    });
    describe('Schema Not Loaded Until First Use', () => {
        it('should not initialize schema on creation', () => {
            const manager = createLazySchemaManager(storage);
            // Schema should not be initialized yet
            expect(manager.isInitialized()).toBe(false);
            // No SQL calls should have been made
            expect(storage.sql.exec).not.toHaveBeenCalled();
        });
        it('should not call SQL during manager construction', () => {
            const sqlExecSpy = vi.spyOn(storage.sql, 'exec');
            createLazySchemaManager(storage);
            expect(sqlExecSpy).not.toHaveBeenCalled();
        });
        it('should initialize schema only on first access', async () => {
            const manager = createLazySchemaManager(storage);
            expect(manager.isInitialized()).toBe(false);
            // First access triggers initialization
            await manager.ensureInitialized();
            expect(manager.isInitialized()).toBe(true);
        });
        it('should defer initialization until getSchema is called', async () => {
            const manager = createLazySchemaManager(storage);
            expect(manager.isInitialized()).toBe(false);
            // getSchema should trigger initialization
            await manager.getSchema();
            expect(manager.isInitialized()).toBe(true);
        });
    });
    describe('Schema Caching After First Load', () => {
        it('should cache schema after first initialization', async () => {
            const manager = createLazySchemaManager(storage);
            const sqlExecSpy = vi.spyOn(storage.sql, 'exec');
            // First initialization
            await manager.ensureInitialized();
            const firstCallCount = sqlExecSpy.mock.calls.length;
            // Second call should not re-initialize
            await manager.ensureInitialized();
            const secondCallCount = sqlExecSpy.mock.calls.length;
            expect(secondCallCount).toBe(firstCallCount);
        });
        it('should return same schema instance on multiple calls', async () => {
            const manager = createLazySchemaManager(storage);
            const schema1 = await manager.getSchema();
            const schema2 = await manager.getSchema();
            expect(schema1).toBe(schema2); // Same reference
        });
        it('should not execute CREATE TABLE multiple times', async () => {
            const manager = createLazySchemaManager(storage);
            const sqlExecSpy = vi.spyOn(storage.sql, 'exec');
            // Multiple accesses
            await manager.ensureInitialized();
            await manager.ensureInitialized();
            await manager.ensureInitialized();
            // Count CREATE TABLE calls
            const createTableCalls = sqlExecSpy.mock.calls.filter((call) => call[0].toLowerCase().includes('create table'));
            // Should only have one set of CREATE TABLE calls (first initialization)
            // The exact count depends on schema, but subsequent calls should not add more
            const firstInitCalls = createTableCalls.length;
            expect(firstInitCalls).toBeGreaterThan(0);
            // Calling again should not add more
            await manager.ensureInitialized();
            const afterCalls = sqlExecSpy.mock.calls.filter((call) => call[0].toLowerCase().includes('create table')).length;
            expect(afterCalls).toBe(firstInitCalls);
        });
        it('should preserve cached state across operations', async () => {
            const manager = createLazySchemaManager(storage);
            await manager.ensureInitialized();
            expect(manager.isInitialized()).toBe(true);
            // Simulate operations that shouldn't affect cache
            await manager.getSchema();
            await manager.getSchema();
            expect(manager.isInitialized()).toBe(true);
        });
    });
    describe('Schema Validation on First Access', () => {
        it('should validate schema definition on initialization', async () => {
            const invalidSchema = {
                tables: [
                    {
                        name: '', // Invalid: empty name
                        columns: [],
                    },
                ],
            };
            const manager = createLazySchemaManager(storage, { schema: invalidSchema });
            await expect(manager.ensureInitialized()).rejects.toThrow();
        });
        it('should accept valid schema definitions', async () => {
            const validSchema = {
                tables: [
                    {
                        name: 'documents',
                        columns: [
                            { name: 'id', type: 'TEXT', primaryKey: true },
                            { name: 'data', type: 'TEXT', notNull: true },
                        ],
                    },
                ],
            };
            const manager = createLazySchemaManager(storage, { schema: validSchema });
            await expect(manager.ensureInitialized()).resolves.not.toThrow();
        });
        it('should validate column definitions', async () => {
            const invalidColumnSchema = {
                tables: [
                    {
                        name: 'test',
                        columns: [
                            { name: '', type: 'TEXT' }, // Invalid: empty column name
                        ],
                    },
                ],
            };
            const manager = createLazySchemaManager(storage, { schema: invalidColumnSchema });
            await expect(manager.ensureInitialized()).rejects.toThrow();
        });
        it('should return schema version after initialization', async () => {
            const manager = createLazySchemaManager(storage);
            await manager.ensureInitialized();
            const schema = await manager.getSchema();
            expect(schema.version).toBeDefined();
            expect(typeof schema.version).toBe('number');
        });
    });
    describe('Memory Efficiency Patterns', () => {
        it('should not hold references to initialization data after complete', async () => {
            const manager = createLazySchemaManager(storage);
            await manager.ensureInitialized();
            // Manager should have minimal memory footprint
            // Check that internal state is compact
            const schema = await manager.getSchema();
            expect(schema).toBeDefined();
            // Schema should be a simple object, not holding large temporary data
            expect(typeof schema).toBe('object');
        });
        it('should support reset to allow re-initialization', async () => {
            const manager = createLazySchemaManager(storage);
            await manager.ensureInitialized();
            expect(manager.isInitialized()).toBe(true);
            manager.reset();
            expect(manager.isInitialized()).toBe(false);
        });
        it('should not leak memory on repeated reset/init cycles', async () => {
            const manager = createLazySchemaManager(storage);
            // Multiple cycles should not accumulate state
            for (let i = 0; i < 10; i++) {
                await manager.ensureInitialized();
                manager.reset();
            }
            expect(manager.isInitialized()).toBe(false);
        });
        it('should use WeakMap for optional caching hints', async () => {
            // This tests the interface, not the implementation
            const manager = createLazySchemaManager(storage, {
                cacheStrategy: 'weak', // Memory-efficient caching
            });
            await manager.ensureInitialized();
            expect(manager.isInitialized()).toBe(true);
        });
    });
    describe('Thread Safety with blockConcurrencyWhile', () => {
        it('should use blockConcurrencyWhile during initialization', async () => {
            const manager = createLazySchemaManager(storage, { state: ctx });
            await manager.ensureInitialized();
            expect(ctx.blockConcurrencyWhile).toHaveBeenCalled();
        });
        it('should only call blockConcurrencyWhile once', async () => {
            const manager = createLazySchemaManager(storage, { state: ctx });
            await manager.ensureInitialized();
            await manager.ensureInitialized();
            await manager.ensureInitialized();
            // Should only block once for initialization
            expect(ctx.blockConcurrencyWhile).toHaveBeenCalledTimes(1);
        });
        it('should handle concurrent initialization requests safely', async () => {
            const manager = createLazySchemaManager(storage, { state: ctx });
            // Simulate concurrent requests
            const promises = [
                manager.ensureInitialized(),
                manager.ensureInitialized(),
                manager.ensureInitialized(),
            ];
            await Promise.all(promises);
            // All should resolve successfully
            expect(manager.isInitialized()).toBe(true);
            // Should only initialize once
            expect(ctx.blockConcurrencyWhile).toHaveBeenCalledTimes(1);
        });
    });
    describe('Integration with DOCore', () => {
        it('should integrate with DOCore subclass', async () => {
            class SchemaAwareDO extends DOCore {
                schemaManager;
                constructor(ctx, env) {
                    super(ctx, env);
                    this.schemaManager = createLazySchemaManager(this.ctx.storage, { state: this.ctx });
                }
                async ensureSchema() {
                    await this.schemaManager.ensureInitialized();
                }
                isSchemaReady() {
                    return this.schemaManager.isInitialized();
                }
            }
            const doInstance = new SchemaAwareDO(ctx, {});
            expect(doInstance.isSchemaReady()).toBe(false);
            await doInstance.ensureSchema();
            expect(doInstance.isSchemaReady()).toBe(true);
        });
        it('should not initialize schema on DO construction', () => {
            class LazyDO extends DOCore {
                schemaManager;
                constructor(ctx, env) {
                    super(ctx, env);
                    this.schemaManager = createLazySchemaManager(this.ctx.storage);
                }
                isSchemaInitialized() {
                    return this.schemaManager.isInitialized();
                }
            }
            const doInstance = new LazyDO(ctx, {});
            // Schema should NOT be initialized just from constructing the DO
            expect(doInstance.isSchemaInitialized()).toBe(false);
            expect(storage.sql.exec).not.toHaveBeenCalled();
        });
        it('should initialize schema on first CRUD operation', async () => {
            class CrudDO extends DOCore {
                schemaManager;
                constructor(ctx, env) {
                    super(ctx, env);
                    this.schemaManager = createLazySchemaManager(this.ctx.storage, { state: this.ctx });
                }
                async create(collection, doc) {
                    await this.schemaManager.ensureInitialized();
                    // Implementation would go here
                    return doc;
                }
                isSchemaReady() {
                    return this.schemaManager.isInitialized();
                }
            }
            const doInstance = new CrudDO(ctx, {});
            expect(doInstance.isSchemaReady()).toBe(false);
            // First CRUD operation triggers schema init
            await doInstance.create('users', { id: '1', name: 'Test' });
            expect(doInstance.isSchemaReady()).toBe(true);
        });
    });
    describe('Schema Initialization Timing', () => {
        it('should measure initialization time', async () => {
            const manager = createLazySchemaManager(storage);
            const startTime = Date.now();
            await manager.ensureInitialized();
            const endTime = Date.now();
            const initTime = endTime - startTime;
            // Initialization should be fast (< 100ms in tests with mocks)
            expect(initTime).toBeLessThan(100);
        });
        it('should track initialization statistics', async () => {
            const manager = createLazySchemaManager(storage);
            await manager.ensureInitialized();
            const stats = manager.getStats();
            expect(stats).toBeDefined();
            expect(stats.initializationCount).toBe(1);
            expect(stats.lastInitTime).toBeDefined();
            expect(typeof stats.lastInitDurationMs).toBe('number');
        });
        it('should skip initialization on subsequent requests', async () => {
            const manager = createLazySchemaManager(storage);
            const start1 = Date.now();
            await manager.ensureInitialized();
            const firstDuration = Date.now() - start1;
            const start2 = Date.now();
            await manager.ensureInitialized();
            const secondDuration = Date.now() - start2;
            // Second call should be near-instant (just checking flag)
            expect(secondDuration).toBeLessThanOrEqual(firstDuration);
        });
    });
    describe('Error Handling', () => {
        it('should handle SQL errors during initialization', async () => {
            const errorStorage = createMockStorage();
            vi.spyOn(errorStorage.sql, 'exec').mockImplementation(() => {
                throw new Error('SQL execution failed');
            });
            const manager = createLazySchemaManager(errorStorage);
            await expect(manager.ensureInitialized()).rejects.toThrow('SQL execution failed');
        });
        it('should remain in uninitialized state after error', async () => {
            const errorStorage = createMockStorage();
            vi.spyOn(errorStorage.sql, 'exec').mockImplementation(() => {
                throw new Error('SQL execution failed');
            });
            const manager = createLazySchemaManager(errorStorage);
            try {
                await manager.ensureInitialized();
            }
            catch {
                // Expected
            }
            expect(manager.isInitialized()).toBe(false);
        });
        it('should allow retry after error', async () => {
            const errorStorage = createMockStorage();
            let shouldFail = true;
            vi.spyOn(errorStorage.sql, 'exec').mockImplementation(() => {
                if (shouldFail) {
                    throw new Error('Temporary error');
                }
                return createMockSqlCursor([]);
            });
            const manager = createLazySchemaManager(errorStorage);
            // First attempt fails
            try {
                await manager.ensureInitialized();
            }
            catch {
                // Expected
            }
            expect(manager.isInitialized()).toBe(false);
            // Fix the error
            shouldFail = false;
            // Retry should succeed
            await manager.ensureInitialized();
            expect(manager.isInitialized()).toBe(true);
        });
    });
    describe('Default Schema Definition', () => {
        it('should use default schema if none provided', async () => {
            const manager = createLazySchemaManager(storage);
            await manager.ensureInitialized();
            const schema = await manager.getSchema();
            expect(schema.tables).toBeDefined();
            expect(Array.isArray(schema.tables)).toBe(true);
        });
        it('should include documents table in default schema', async () => {
            const manager = createLazySchemaManager(storage);
            await manager.ensureInitialized();
            const schema = await manager.getSchema();
            const documentsTable = schema.tables.find((t) => t.name === 'documents');
            expect(documentsTable).toBeDefined();
        });
        it('should include schema_version table for migrations', async () => {
            const manager = createLazySchemaManager(storage);
            await manager.ensureInitialized();
            const schema = await manager.getSchema();
            const versionTable = schema.tables.find((t) => t.name === 'schema_version');
            expect(versionTable).toBeDefined();
        });
    });
});
