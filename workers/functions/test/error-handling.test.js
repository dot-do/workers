/**
 * RED Tests: functions.do Error Handling
 *
 * These tests define the contract for the functions.do worker's error handling.
 * The FunctionsDO must handle errors gracefully and return appropriate responses.
 *
 * RED PHASE: These tests MUST FAIL because FunctionsDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-v9z5).
 *
 * @see ARCHITECTURE.md
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv } from './helpers.js';
/**
 * Attempt to load FunctionsDO - this will fail in RED phase
 */
async function loadFunctionsDO() {
    const module = await import('../src/functions.js');
    return module.FunctionsDO;
}
describe('FunctionsDO Error Handling', () => {
    let ctx;
    let env;
    let FunctionsDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        FunctionsDO = await loadFunctionsDO();
    });
    describe('Input validation errors', () => {
        it('should reject empty prompt in generate()', async () => {
            const instance = new FunctionsDO(ctx, env);
            await expect(instance.generate('')).rejects.toThrow(/invalid.*prompt|empty|required/i);
        });
        it('should reject null prompt in generate()', async () => {
            const instance = new FunctionsDO(ctx, env);
            await expect(instance.generate(null)).rejects.toThrow(/invalid.*prompt|null|required/i);
        });
        it('should reject empty text in extract()', async () => {
            const instance = new FunctionsDO(ctx, env);
            await expect(instance.extract('', { type: 'object' })).rejects.toThrow(/invalid.*text|empty|required/i);
        });
        it('should reject invalid schema in extract()', async () => {
            const instance = new FunctionsDO(ctx, env);
            await expect(instance.extract('Some text', null)).rejects.toThrow(/invalid.*schema|null|required/i);
        });
        it('should reject empty categories array in classify()', async () => {
            const instance = new FunctionsDO(ctx, env);
            await expect(instance.classify('Text', [])).rejects.toThrow(/invalid.*categories|empty|required/i);
        });
        it('should reject empty text in embed()', async () => {
            const instance = new FunctionsDO(ctx, env);
            await expect(instance.embed('')).rejects.toThrow(/invalid.*text|empty|required/i);
        });
        it('should reject empty array in embed()', async () => {
            const instance = new FunctionsDO(ctx, env);
            await expect(instance.embed([])).rejects.toThrow(/invalid.*text|empty|required/i);
        });
        it('should validate function name in register()', async () => {
            const instance = new FunctionsDO(ctx, env);
            await expect(instance.register({ name: '' })).rejects.toThrow(/invalid.*name|empty|required/i);
            await expect(instance.register({ name: 'invalid/name' })).rejects.toThrow(/invalid.*name/i);
            await expect(instance.register({ name: '__reserved' })).rejects.toThrow(/reserved|invalid/i);
        });
        it('should reject invalid model names', async () => {
            const instance = new FunctionsDO(ctx, env);
            await expect(instance.generate('Test', { model: '' })).rejects.toThrow(/invalid.*model/i);
            await expect(instance.generate('Test', { model: 'nonexistent-model' })).rejects.toThrow(/model.*not found|unknown.*model/i);
        });
    });
    describe('HTTP error responses', () => {
        it('should return 400 for malformed JSON in request body', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/rpc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'not valid json {'
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toMatch(/json|parse/i);
        });
        it('should return 400 for missing required fields', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // missing prompt
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toMatch(/required|missing|prompt/i);
        });
        it('should return 404 for non-existent function', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/functions/nonexistent/invoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(404);
        });
        it('should return 405 for unsupported HTTP methods', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', { method: 'DELETE' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(405);
        });
        it('should return 500 for internal AI errors', async () => {
            const instance = new FunctionsDO(ctx, env);
            // Force an AI binding error
            env.AI.run = async () => { throw new Error('AI service unavailable'); };
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Test' })
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(500);
        });
    });
    describe('RPC error handling', () => {
        it('should return error for method not found', async () => {
            const instance = new FunctionsDO(ctx, env);
            await expect(instance.call('nonexistent', [])).rejects.toThrow(/not found|not allowed/i);
        });
        it('should return error for invalid parameters', async () => {
            const instance = new FunctionsDO(ctx, env);
            // generate() requires a prompt string
            await expect(instance.call('generate', [])).rejects.toThrow(/invalid|required|parameter/i);
        });
        it('should return error for type mismatches', async () => {
            const instance = new FunctionsDO(ctx, env);
            // prompt should be string, not number
            await expect(instance.call('generate', [123])).rejects.toThrow(/type|invalid/i);
        });
    });
    describe('AI provider errors', () => {
        it('should handle AI service timeout', async () => {
            const instance = new FunctionsDO(ctx, env);
            env.AI.run = async () => {
                await new Promise(resolve => setTimeout(resolve, 60000));
                return { response: 'too late' };
            };
            await expect(instance.generate('Test')).rejects.toThrow(/timeout/i);
        }, 10000);
        it('should handle AI rate limiting', async () => {
            const instance = new FunctionsDO(ctx, env);
            env.AI.run = async () => {
                const error = new Error('Rate limit exceeded');
                error.status = 429;
                throw error;
            };
            await expect(instance.generate('Test')).rejects.toThrow(/rate limit/i);
        });
        it('should handle AI content filter', async () => {
            const instance = new FunctionsDO(ctx, env);
            env.AI.run = async () => {
                const error = new Error('Content filtered');
                error.status = 400;
                error.code = 'content_filter';
                throw error;
            };
            await expect(instance.generate('Inappropriate content')).rejects.toThrow(/content.*filter|blocked/i);
        });
        it('should handle model not found', async () => {
            const instance = new FunctionsDO(ctx, env);
            env.AI.run = async () => {
                throw new Error('Model not found');
            };
            await expect(instance.generate('Test', { model: '@cf/nonexistent/model' })).rejects.toThrow(/model.*not found/i);
        });
    });
    describe('Concurrent operation errors', () => {
        it('should handle concurrent function registrations', async () => {
            const instance = new FunctionsDO(ctx, env);
            // Try to register the same function name concurrently
            const results = await Promise.allSettled([
                instance.register({ name: 'concurrent-func' }),
                instance.register({ name: 'concurrent-func' }),
            ]);
            // At least one should succeed, at least one might fail
            const successes = results.filter(r => r.status === 'fulfilled');
            const failures = results.filter(r => r.status === 'rejected');
            expect(successes.length).toBeGreaterThanOrEqual(1);
            // Second registration should fail if both complete
            if (failures.length > 0) {
                const failedResult = failures[0];
                expect(failedResult.reason.message).toMatch(/exists|duplicate/i);
            }
        });
        it('should handle batch operations with partial failures', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/rpc/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([
                    { method: 'generate', params: ['Valid prompt'] },
                    { method: 'invalid_method', params: [] },
                    { method: 'generate', params: ['Another valid prompt'] },
                ])
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200); // Batch should complete
            const results = await response.json();
            expect(results.length).toBe(3);
            expect(results[0]).toHaveProperty('result');
            expect(results[1]).toHaveProperty('error');
            expect(results[2]).toHaveProperty('result');
        });
    });
    describe('Storage error recovery', () => {
        it('should handle storage read errors during function lookup', async () => {
            const instance = new FunctionsDO(ctx, env);
            await instance.register({ name: 'testFunc' });
            // Simulate storage failure
            ctx.storage.get = async () => { throw new Error('Storage read failed'); };
            await expect(instance.invoke('testFunc', {})).rejects.toThrow(/storage|read|failed/i);
        });
        it('should handle storage write errors during function registration', async () => {
            const instance = new FunctionsDO(ctx, env);
            // Simulate storage failure
            ctx.storage.put = async () => { throw new Error('Storage write failed'); };
            await expect(instance.register({ name: 'newFunc' })).rejects.toThrow(/storage|write|failed/i);
        });
    });
    describe('Error message sanitization', () => {
        it('should not expose internal stack traces in HTTP responses', async () => {
            const instance = new FunctionsDO(ctx, env);
            env.AI.run = async () => { throw new Error('Internal: API_KEY=secret123'); };
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Test' })
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            expect(data.error).not.toContain('API_KEY');
            expect(data.error).not.toContain('secret123');
        });
        it('should return user-friendly error messages', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // missing prompt
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            // Error message should be understandable
            expect(data.error.length).toBeGreaterThan(0);
            expect(data.error.length).toBeLessThan(500);
        });
    });
    describe('Input size limits', () => {
        it('should reject prompts that are too long', async () => {
            const instance = new FunctionsDO(ctx, env);
            const longPrompt = 'x'.repeat(100 * 1024); // 100KB
            await expect(instance.generate(longPrompt)).rejects.toThrow(/too long|size limit|max.*length/i);
        });
        it('should reject text extraction on very large documents', async () => {
            const instance = new FunctionsDO(ctx, env);
            const largeText = 'x'.repeat(1 * 1024 * 1024); // 1MB
            await expect(instance.extract(largeText, { type: 'object' })).rejects.toThrow(/too large|size limit/i);
        });
        it('should reject embedding requests with too many items', async () => {
            const instance = new FunctionsDO(ctx, env);
            const manyTexts = Array(1000).fill('text');
            await expect(instance.embed(manyTexts)).rejects.toThrow(/too many|batch.*limit|max.*items/i);
        });
    });
    describe('Graceful degradation', () => {
        it('should return partial results when some batch items fail', async () => {
            const instance = new FunctionsDO(ctx, env);
            let callCount = 0;
            env.AI.run = async () => {
                callCount++;
                if (callCount === 2) {
                    throw new Error('Transient error');
                }
                return { response: 'Success' };
            };
            const results = await Promise.allSettled([
                instance.generate('Query 1'),
                instance.generate('Query 2'),
                instance.generate('Query 3'),
            ]);
            const successes = results.filter(r => r.status === 'fulfilled');
            expect(successes.length).toBe(2);
        });
    });
});
