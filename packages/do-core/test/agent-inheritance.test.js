/**
 * RED Phase TDD: Agent Inheritance Interface Contract Tests
 *
 * These tests define the contract for the agent inheritance interface.
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * The agent inheritance contract includes:
 * - Base Agent class with common functionality
 * - Extension/override patterns
 * - Lifecycle hooks (init, cleanup)
 * - Message handling interface
 */
import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../src/agent.js';
// Mock implementations for testing
function createMockId(name) {
    return {
        name,
        toString: () => name ?? 'mock-agent-id',
        equals: (other) => other.toString() === (name ?? 'mock-agent-id'),
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
            return closure(createMockStorage());
        }),
        sql: createMockSqlStorage(),
    };
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
describe('Agent Inheritance Interface Contract', () => {
    describe('Base Agent Class', () => {
        it('should be a class that can be instantiated', () => {
            const ctx = createMockState();
            const env = {};
            const agent = new Agent(ctx, env);
            expect(agent).toBeDefined();
            expect(agent).toBeInstanceOf(Agent);
        });
        it('should accept ctx and env in constructor', () => {
            const ctx = createMockState();
            const env = { API_KEY: 'test' };
            // Agent should store ctx and env as protected properties
            class TestAgent extends Agent {
                getCtx() { return this.ctx; }
                getEnv() { return this.env; }
            }
            const agent = new TestAgent(ctx, env);
            expect(agent.getCtx()).toBe(ctx);
            expect(agent.getEnv()).toBe(env);
        });
        it('should accept optional config in constructor', () => {
            const ctx = createMockState();
            const env = {};
            const config = {
                name: 'TestAgent',
                version: '1.0.0',
            };
            class TestAgent extends Agent {
                getConfig() { return this.config; }
            }
            const agent = new TestAgent(ctx, env, config);
            expect(agent.getConfig()).toBeDefined();
            expect(agent.getConfig()?.name).toBe('TestAgent');
        });
        it('should have a unique agent ID', () => {
            const ctx = createMockState(createMockId('agent-123'));
            const agent = new Agent(ctx, {});
            expect(agent.id).toBe('agent-123');
        });
        it('should provide access to agent state', async () => {
            const ctx = createMockState();
            const agent = new Agent(ctx, {});
            // Agent should expose state getter
            const state = await agent.getState();
            expect(state).toBeDefined();
            expect(state.initialized).toBe(false);
        });
    });
    describe('Lifecycle Hooks', () => {
        describe('init() hook', () => {
            it('should have init lifecycle method', () => {
                const agent = new Agent(createMockState(), {});
                expect(typeof agent.init).toBe('function');
            });
            it('should throw not implemented in base Agent', async () => {
                const agent = new Agent(createMockState(), {});
                await expect(agent.init()).rejects.toThrow('not implemented');
            });
            it('should allow subclass to override init', async () => {
                class CustomAgent extends Agent {
                    initCalled = false;
                    async init() {
                        this.initCalled = true;
                    }
                }
                const agent = new CustomAgent(createMockState(), {});
                await agent.init();
                expect(agent.initCalled).toBe(true);
            });
            it('should support async initialization', async () => {
                class AsyncInitAgent extends Agent {
                    data = null;
                    async init() {
                        // Simulate async initialization
                        await new Promise(resolve => setTimeout(resolve, 10));
                        this.data = 'initialized';
                    }
                }
                const agent = new AsyncInitAgent(createMockState(), {});
                await agent.init();
                expect(agent.data).toBe('initialized');
            });
            it('should allow init to load persisted state', async () => {
                const ctx = createMockState();
                const storage = ctx.storage;
                // Pre-populate storage with persisted state
                const mockGet = storage.get;
                mockGet.mockResolvedValueOnce({ counter: 42, name: 'restored' });
                class StatefulAgent extends Agent {
                    counter = 0;
                    name = '';
                    async init() {
                        const saved = await this.ctx.storage.get('agent-state');
                        if (saved) {
                            this.counter = saved.counter;
                            this.name = saved.name;
                        }
                    }
                }
                const agent = new StatefulAgent(ctx, {});
                await agent.init();
                expect(agent.counter).toBe(42);
                expect(agent.name).toBe('restored');
            });
            it('should track initialization state', async () => {
                class TrackingAgent extends Agent {
                    async init() {
                        await super.markInitialized();
                    }
                }
                const agent = new TrackingAgent(createMockState(), {});
                expect((await agent.getState()).initialized).toBe(false);
                await agent.init();
                expect((await agent.getState()).initialized).toBe(true);
            });
        });
        describe('cleanup() hook', () => {
            it('should have cleanup lifecycle method', () => {
                const agent = new Agent(createMockState(), {});
                expect(typeof agent.cleanup).toBe('function');
            });
            it('should throw not implemented in base Agent', async () => {
                const agent = new Agent(createMockState(), {});
                await expect(agent.cleanup()).rejects.toThrow('not implemented');
            });
            it('should allow subclass to override cleanup', async () => {
                class CustomAgent extends Agent {
                    cleanedUp = false;
                    async cleanup() {
                        this.cleanedUp = true;
                    }
                }
                const agent = new CustomAgent(createMockState(), {});
                await agent.cleanup();
                expect(agent.cleanedUp).toBe(true);
            });
            it('should allow cleanup to persist state before shutdown', async () => {
                const ctx = createMockState();
                class PersistentAgent extends Agent {
                    counter = 10;
                    async cleanup() {
                        await this.ctx.storage.put('agent-state', { counter: this.counter });
                    }
                }
                const agent = new PersistentAgent(ctx, {});
                await agent.cleanup();
                expect(ctx.storage.put).toHaveBeenCalledWith('agent-state', { counter: 10 });
            });
            it('should release resources on cleanup', async () => {
                class ResourceAgent extends Agent {
                    resources = ['db-connection', 'file-handle'];
                    released = [];
                    async cleanup() {
                        for (const resource of this.resources) {
                            this.released.push(resource);
                        }
                        this.resources = [];
                    }
                }
                const agent = new ResourceAgent(createMockState(), {});
                await agent.cleanup();
                expect(agent.released).toEqual(['db-connection', 'file-handle']);
                expect(agent.resources).toEqual([]);
            });
        });
        describe('onStart() hook', () => {
            it('should have onStart lifecycle method', () => {
                const agent = new Agent(createMockState(), {});
                expect(typeof agent.onStart).toBe('function');
            });
            it('should be called after init completes', async () => {
                const callOrder = [];
                class OrderedAgent extends Agent {
                    async init() {
                        callOrder.push('init');
                    }
                    async onStart() {
                        callOrder.push('onStart');
                    }
                }
                const agent = new OrderedAgent(createMockState(), {});
                await agent.start();
                expect(callOrder).toEqual(['init', 'onStart']);
            });
        });
        describe('onStop() hook', () => {
            it('should have onStop lifecycle method', () => {
                const agent = new Agent(createMockState(), {});
                expect(typeof agent.onStop).toBe('function');
            });
            it('should be called before cleanup', async () => {
                const callOrder = [];
                class OrderedAgent extends Agent {
                    async onStop() {
                        callOrder.push('onStop');
                    }
                    async cleanup() {
                        callOrder.push('cleanup');
                    }
                }
                const agent = new OrderedAgent(createMockState(), {});
                await agent.stop();
                expect(callOrder).toEqual(['onStop', 'cleanup']);
            });
        });
    });
    describe('Message Handling Interface', () => {
        describe('handleMessage() method', () => {
            it('should have handleMessage method', () => {
                const agent = new Agent(createMockState(), {});
                expect(typeof agent.handleMessage).toBe('function');
            });
            it('should throw not implemented in base Agent', async () => {
                const agent = new Agent(createMockState(), {});
                const message = {
                    id: 'msg-1',
                    type: 'test',
                    payload: {},
                    timestamp: Date.now(),
                };
                await expect(agent.handleMessage(message)).rejects.toThrow('not implemented');
            });
            it('should accept AgentMessage and return response', async () => {
                class EchoAgent extends Agent {
                    async handleMessage(message) {
                        return { echo: message.payload };
                    }
                }
                const agent = new EchoAgent(createMockState(), {});
                const message = {
                    id: 'msg-1',
                    type: 'echo',
                    payload: { text: 'hello' },
                    timestamp: Date.now(),
                };
                const response = await agent.handleMessage(message);
                expect(response).toEqual({ echo: { text: 'hello' } });
            });
        });
        describe('registerHandler() method', () => {
            it('should have registerHandler method', () => {
                const agent = new Agent(createMockState(), {});
                expect(typeof agent.registerHandler).toBe('function');
            });
            it('should register a handler for a message type', async () => {
                class HandlerAgent extends Agent {
                    constructor(ctx, env) {
                        super(ctx, env);
                        this.registerHandler('greet', this.handleGreet.bind(this));
                    }
                    async handleGreet(message) {
                        const name = message.payload.name;
                        return `Hello, ${name}!`;
                    }
                    async handleMessage(message) {
                        const handler = this.getHandler(message.type);
                        if (handler) {
                            return handler(message);
                        }
                        throw new Error(`Unknown message type: ${message.type}`);
                    }
                }
                const agent = new HandlerAgent(createMockState(), {});
                const message = {
                    id: 'msg-1',
                    type: 'greet',
                    payload: { name: 'World' },
                    timestamp: Date.now(),
                };
                const response = await agent.handleMessage(message);
                expect(response).toBe('Hello, World!');
            });
        });
        describe('getHandler() method', () => {
            it('should have getHandler method', () => {
                const agent = new Agent(createMockState(), {});
                expect(typeof agent.getHandler).toBe('function');
            });
            it('should return registered handler or undefined', () => {
                class HandlerAgent extends Agent {
                    constructor(ctx, env) {
                        super(ctx, env);
                        this.registerHandler('test', async () => 'test');
                    }
                }
                const agent = new HandlerAgent(createMockState(), {});
                expect(agent.getHandler('test')).toBeDefined();
                expect(agent.getHandler('unknown')).toBeUndefined();
            });
        });
        describe('unregisterHandler() method', () => {
            it('should have unregisterHandler method', () => {
                const agent = new Agent(createMockState(), {});
                expect(typeof agent.unregisterHandler).toBe('function');
            });
            it('should remove a registered handler', () => {
                class HandlerAgent extends Agent {
                    constructor(ctx, env) {
                        super(ctx, env);
                        this.registerHandler('temp', async () => 'temp');
                    }
                }
                const agent = new HandlerAgent(createMockState(), {});
                expect(agent.getHandler('temp')).toBeDefined();
                agent.unregisterHandler('temp');
                expect(agent.getHandler('temp')).toBeUndefined();
            });
        });
    });
    describe('Extension/Override Patterns', () => {
        describe('Method overriding', () => {
            it('should allow subclass to override fetch', async () => {
                class CustomFetchAgent extends Agent {
                    async fetch(request) {
                        return Response.json({ custom: true, path: new URL(request.url).pathname });
                    }
                }
                const agent = new CustomFetchAgent(createMockState(), {});
                const response = await agent.fetch(new Request('https://example.com/test'));
                const data = await response.json();
                expect(data.custom).toBe(true);
                expect(data.path).toBe('/test');
            });
            it('should allow calling super methods', async () => {
                class ExtendedAgent extends Agent {
                    async init() {
                        // Call super (would normally throw, but we catch it)
                        try {
                            await super.init();
                        }
                        catch {
                            // Expected - base throws not implemented
                        }
                        // Do additional initialization
                        await this.ctx.storage.put('extended-init', true);
                    }
                }
                const ctx = createMockState();
                const agent = new ExtendedAgent(ctx, {});
                await agent.init();
                expect(ctx.storage.put).toHaveBeenCalledWith('extended-init', true);
            });
            it('should support decorator-style method enhancement', async () => {
                // Simulating decorator pattern for method enhancement
                // Note: This decorator is defined but not applied in this test -
                // it demonstrates the pattern that could be used
                const _logged = (_target, propertyKey, descriptor) => {
                    const original = descriptor.value;
                    descriptor.value = async function (...args) {
                        console.log(`Calling ${propertyKey}`);
                        const result = await original.apply(this, args);
                        console.log(`Finished ${propertyKey}`);
                        return result;
                    };
                    return descriptor;
                };
                class LoggedAgent extends Agent {
                    logs = [];
                    async handleMessage(message) {
                        this.logs.push(`handling: ${message.type}`);
                        return { handled: message.type };
                    }
                }
                const agent = new LoggedAgent(createMockState(), {});
                await agent.handleMessage({
                    id: 'msg-1',
                    type: 'test',
                    payload: {},
                    timestamp: Date.now(),
                });
                expect(agent.logs).toContain('handling: test');
            });
        });
        describe('Composition patterns', () => {
            it('should support mixin-style functionality', () => {
                function withLogging(Base) {
                    return class extends Base {
                        _logs = [];
                        log(message) {
                            this._logs.push(`[${new Date().toISOString()}] ${message}`);
                        }
                        getLogs() {
                            return [...this._logs];
                        }
                    };
                }
                const LoggableAgent = withLogging(Agent);
                const agent = new LoggableAgent(createMockState(), {});
                agent.log('test message');
                expect(agent.getLogs()).toHaveLength(1);
                expect(agent.getLogs()[0]).toContain('test message');
            });
            it('should support trait-like behavior through composition', async () => {
                // Trait for persistence
                class PersistenceTrait {
                    storage;
                    constructor(storage) {
                        this.storage = storage;
                    }
                    async save(key, value) {
                        await this.storage.put(key, value);
                    }
                    async load(key) {
                        return this.storage.get(key);
                    }
                }
                class ComposedAgent extends Agent {
                    persistence;
                    constructor(ctx, env) {
                        super(ctx, env);
                        this.persistence = new PersistenceTrait(ctx.storage);
                    }
                    async saveState(state) {
                        await this.persistence.save('state', state);
                    }
                    async loadState() {
                        return this.persistence.load('state');
                    }
                }
                const ctx = createMockState();
                const agent = new ComposedAgent(ctx, {});
                await agent.saveState({ value: 123 });
                expect(ctx.storage.put).toHaveBeenCalledWith('state', { value: 123 });
            });
        });
        describe('Multi-level inheritance', () => {
            it('should support deep inheritance chains', async () => {
                // Base agent
                class BaseAgent extends Agent {
                    getLevel() { return 'base'; }
                }
                // Intermediate agent
                class MiddleAgent extends BaseAgent {
                    getLevel() { return 'middle'; }
                    getBaseLevel() { return super.getLevel(); }
                }
                // Concrete agent
                class ConcreteAgent extends MiddleAgent {
                    getLevel() { return 'concrete'; }
                    getMiddleLevel() { return super.getLevel(); }
                }
                const agent = new ConcreteAgent(createMockState(), {});
                expect(agent.getLevel()).toBe('concrete');
                expect(agent.getMiddleLevel()).toBe('middle');
                expect(agent.getBaseLevel()).toBe('base');
                expect(agent).toBeInstanceOf(Agent);
                expect(agent).toBeInstanceOf(BaseAgent);
                expect(agent).toBeInstanceOf(MiddleAgent);
                expect(agent).toBeInstanceOf(ConcreteAgent);
            });
            it('should properly inherit protected members', async () => {
                class ProtectedAgent extends Agent {
                    secret = 'hidden';
                    revealSecret() {
                        return this.secret;
                    }
                }
                class DerivedAgent extends ProtectedAgent {
                    modifySecret(value) {
                        this.secret = value;
                    }
                }
                const agent = new DerivedAgent(createMockState(), {});
                expect(agent.revealSecret()).toBe('hidden');
                agent.modifySecret('revealed');
                expect(agent.revealSecret()).toBe('revealed');
            });
        });
    });
    describe('Agent State Management', () => {
        it('should expose AgentState interface', async () => {
            const agent = new Agent(createMockState(), {});
            const state = await agent.getState();
            // AgentState should have required properties
            expect('initialized' in state).toBe(true);
            expect('startedAt' in state).toBe(true);
            expect('lastActivity' in state).toBe(true);
        });
        it('should update state on activity', async () => {
            class ActiveAgent extends Agent {
                async doWork() {
                    await this.updateActivity();
                }
            }
            const agent = new ActiveAgent(createMockState(), {});
            const stateBefore = await agent.getState();
            await new Promise(resolve => setTimeout(resolve, 10));
            await agent.doWork();
            const stateAfter = await agent.getState();
            expect(stateAfter.lastActivity).toBeGreaterThan(stateBefore.lastActivity ?? 0);
        });
        it('should support custom state properties', async () => {
            class StatefulAgent extends Agent {
                customState = {
                    initialized: false,
                    taskCount: 0,
                    lastError: null,
                };
                getState() {
                    return { ...this.customState };
                }
                async incrementTasks() {
                    this.customState.taskCount++;
                }
                async setError(error) {
                    this.customState.lastError = error;
                }
            }
            const agent = new StatefulAgent(createMockState(), {});
            await agent.incrementTasks();
            await agent.incrementTasks();
            await agent.setError('Something went wrong');
            const state = await agent.getState();
            expect(state.taskCount).toBe(2);
            expect(state.lastError).toBe('Something went wrong');
        });
    });
    describe('Error Handling', () => {
        it('should handle errors in init gracefully', async () => {
            class FailingInitAgent extends Agent {
                async init() {
                    throw new Error('Initialization failed');
                }
            }
            const agent = new FailingInitAgent(createMockState(), {});
            await expect(agent.init()).rejects.toThrow('Initialization failed');
        });
        it('should handle errors in message handling', async () => {
            class FailingHandlerAgent extends Agent {
                async handleMessage(_message) {
                    throw new Error('Handler error');
                }
            }
            const agent = new FailingHandlerAgent(createMockState(), {});
            await expect(agent.handleMessage({
                id: 'msg-1',
                type: 'test',
                payload: {},
                timestamp: Date.now(),
            })).rejects.toThrow('Handler error');
        });
        it('should support error recovery hooks', async () => {
            class RecoverableAgent extends Agent {
                recovered = false;
                async handleMessage(message) {
                    try {
                        throw new Error('Simulated error');
                    }
                    catch (error) {
                        await this.onError(error, message);
                        return { error: 'recovered' };
                    }
                }
                async onError(error, _context) {
                    this.recovered = true;
                    await this.ctx.storage.put('last-error', error.message);
                }
            }
            const ctx = createMockState();
            const agent = new RecoverableAgent(ctx, {});
            const result = await agent.handleMessage({
                id: 'msg-1',
                type: 'test',
                payload: {},
                timestamp: Date.now(),
            });
            expect(agent.recovered).toBe(true);
            expect(result).toEqual({ error: 'recovered' });
            expect(ctx.storage.put).toHaveBeenCalledWith('last-error', 'Simulated error');
        });
    });
});
