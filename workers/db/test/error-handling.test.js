/**
 * RED Tests: database.do Error Handling
 *
 * These tests define the contract for the database.do worker's error handling.
 * The DatabaseDO must handle errors gracefully and return appropriate responses.
 *
 * RED PHASE: These tests MUST FAIL because DatabaseDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-c00u).
 *
 * @see ARCHITECTURE.md
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv } from './helpers.js';
/**
 * Attempt to load DatabaseDO - this will fail in RED phase
 */
async function loadDatabaseDO() {
    const module = await import('../src/database.js');
    return module.DatabaseDO;
}
describe('DatabaseDO Error Handling', () => {
    let ctx;
    let env;
    let DatabaseDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        DatabaseDO = await loadDatabaseDO();
    });
    describe('Input validation errors', () => {
        it('should reject invalid collection names', async () => {
            const instance = new DatabaseDO(ctx, env);
            await expect(instance.create('', { name: 'Test' })).rejects.toThrow(/invalid.*collection/i);
            await expect(instance.create('a/b', { name: 'Test' })).rejects.toThrow(/invalid.*collection/i);
            await expect(instance.create('__system', { name: 'Test' })).rejects.toThrow(/reserved|invalid/i);
        });
        it('should reject invalid document IDs', async () => {
            const instance = new DatabaseDO(ctx, env);
            await expect(instance.get('users', '')).rejects.toThrow(/invalid.*id/i);
            await expect(instance.get('users', '../../../etc/passwd')).rejects.toThrow(/invalid.*id/i);
        });
        it('should reject null/undefined documents', async () => {
            const instance = new DatabaseDO(ctx, env);
            await expect(instance.create('users', null)).rejects.toThrow(/invalid.*document/i);
            await expect(instance.create('users', undefined)).rejects.toThrow(/invalid.*document/i);
        });
        it('should validate document size limits', async () => {
            const instance = new DatabaseDO(ctx, env);
            const largeDoc = { data: 'x'.repeat(10 * 1024 * 1024) }; // 10MB
            await expect(instance.create('users', largeDoc)).rejects.toThrow(/too large|size limit/i);
        });
    });
    describe('HTTP error responses', () => {
        it('should return 400 for malformed JSON in request body', async () => {
            const instance = new DatabaseDO(ctx, env);
            const request = new Request('http://database.do/rpc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'not valid json {'
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toMatch(/json|parse/i);
        });
        it('should return 404 for non-existent resources', async () => {
            const instance = new DatabaseDO(ctx, env);
            const request = new Request('http://database.do/api/users/nonexistent', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(404);
        });
        it('should return 405 for unsupported HTTP methods', async () => {
            const instance = new DatabaseDO(ctx, env);
            const request = new Request('http://database.do/api/users', { method: 'PATCH' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(405);
        });
        it('should return 500 for internal server errors', async () => {
            const instance = new DatabaseDO(ctx, env);
            // Force an internal error by corrupting storage mock
            ctx.storage.get = async () => { throw new Error('Storage failure'); };
            const request = new Request('http://database.do/api/users/123', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(500);
        });
    });
    describe('RPC error handling', () => {
        it('should return error for method not found', async () => {
            const instance = new DatabaseDO(ctx, env);
            await expect(instance.invoke('nonexistent', [])).rejects.toThrow(/not found|not allowed/i);
        });
        it('should return error for invalid parameters', async () => {
            const instance = new DatabaseDO(ctx, env);
            // get() requires collection and id
            await expect(instance.invoke('get', [])).rejects.toThrow(/invalid|required|parameter/i);
            await expect(instance.invoke('get', ['users'])).rejects.toThrow(/invalid|required|parameter/i);
        });
        it('should return error for type mismatches', async () => {
            const instance = new DatabaseDO(ctx, env);
            // collection should be string, not number
            await expect(instance.invoke('get', [123, '456'])).rejects.toThrow(/type|invalid/i);
        });
    });
    describe('Concurrent operation errors', () => {
        it('should handle concurrent write conflicts gracefully', async () => {
            const instance = new DatabaseDO(ctx, env);
            await instance.create('users', { _id: '123', name: 'Original', version: 1 });
            // Simulate concurrent updates - at least one should succeed
            const results = await Promise.allSettled([
                instance.update('users', '123', { name: 'Update1', version: 2 }),
                instance.update('users', '123', { name: 'Update2', version: 2 }),
            ]);
            // At least one should succeed
            const successes = results.filter(r => r.status === 'fulfilled');
            expect(successes.length).toBeGreaterThanOrEqual(1);
        });
        it('should prevent double deletion', async () => {
            const instance = new DatabaseDO(ctx, env);
            await instance.create('users', { _id: '123', name: 'ToDelete' });
            const result1 = await instance.delete('users', '123');
            expect(result1).toBe(true);
            const result2 = await instance.delete('users', '123');
            expect(result2).toBe(false);
        });
    });
    describe('Storage error recovery', () => {
        it('should handle storage read errors', async () => {
            const instance = new DatabaseDO(ctx, env);
            await instance.create('users', { _id: '123', name: 'Test' });
            // Simulate storage failure
            const originalGet = ctx.storage.get;
            ctx.storage.get = async () => { throw new Error('Storage read failed'); };
            await expect(instance.get('users', '123')).rejects.toThrow(/storage|read|failed/i);
            // Restore
            ctx.storage.get = originalGet;
        });
        it('should handle storage write errors', async () => {
            const instance = new DatabaseDO(ctx, env);
            // Simulate storage failure
            ctx.storage.put = async () => { throw new Error('Storage write failed'); };
            await expect(instance.create('users', { name: 'Test' })).rejects.toThrow(/storage|write|failed/i);
        });
    });
    describe('Error message sanitization', () => {
        it('should not expose internal stack traces in HTTP responses', async () => {
            const instance = new DatabaseDO(ctx, env);
            ctx.storage.get = async () => { throw new Error('Internal: SECRET_KEY=abc123'); };
            const request = new Request('http://database.do/api/users/123', { method: 'GET' });
            const response = await instance.fetch(request);
            const data = await response.json();
            expect(data.error).not.toContain('SECRET_KEY');
            expect(data.error).not.toContain('abc123');
        });
        it('should return user-friendly error messages', async () => {
            const instance = new DatabaseDO(ctx, env);
            const request = new Request('http://database.do/rpc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: 'get', params: [] })
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            // Error message should be understandable
            expect(data.error.length).toBeGreaterThan(0);
            expect(data.error.length).toBeLessThan(500);
        });
    });
    describe('Rate limiting errors', () => {
        it('should return 429 when rate limit exceeded', async () => {
            const instance = new DatabaseDO(ctx, env);
            // Simulate many rapid requests
            const requests = [];
            for (let i = 0; i < 1000; i++) {
                requests.push(instance.fetch(new Request('http://database.do/api/users', { method: 'GET' })));
            }
            const responses = await Promise.all(requests);
            const rateLimited = responses.filter(r => r.status === 429);
            // At least some should be rate limited
            expect(rateLimited.length).toBeGreaterThan(0);
        });
    });
    describe('Timeout errors', () => {
        it('should timeout long-running operations', async () => {
            const instance = new DatabaseDO(ctx, env);
            // Simulate a very slow storage operation
            ctx.storage.get = async () => {
                await new Promise(resolve => setTimeout(resolve, 60000));
                return null;
            };
            await expect(instance.get('users', '123')).rejects.toThrow(/timeout/i);
        }, 10000); // 10 second test timeout
    });
});
