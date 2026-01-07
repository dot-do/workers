/**
 * RED Tests: functions.do Result Serialization
 *
 * These tests define the contract for the functions.do worker's result serialization.
 * The FunctionsDO must properly serialize AI outputs for HTTP responses.
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
describe('FunctionsDO Result Serialization', () => {
    let ctx;
    let env;
    let FunctionsDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        FunctionsDO = await loadFunctionsDO();
    });
    describe('JSON response serialization', () => {
        it('should return valid JSON for generate() results', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Test' })
            });
            const response = await instance.fetch(request);
            expect(response.headers.get('Content-Type')).toMatch(/application\/json/i);
            const text = await response.text();
            expect(() => JSON.parse(text)).not.toThrow();
        });
        it('should return valid JSON for extract() results', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'John is 30 years old',
                    schema: { type: 'object', properties: { name: { type: 'string' } } }
                })
            });
            const response = await instance.fetch(request);
            expect(response.headers.get('Content-Type')).toMatch(/application\/json/i);
        });
        it('should serialize arrays correctly for embed() results', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/embed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Hello' })
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
            data.forEach(val => {
                expect(typeof val).toBe('number');
                expect(Number.isFinite(val)).toBe(true);
            });
        });
        it('should serialize nested objects correctly', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'John Smith, 30, works at Acme Corp in NYC',
                    schema: {
                        type: 'object',
                        properties: {
                            person: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    age: { type: 'number' }
                                }
                            },
                            company: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    location: { type: 'string' }
                                }
                            }
                        }
                    }
                })
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            // Should have nested structure
            expect(typeof data).toBe('object');
        });
    });
    describe('Streaming response serialization', () => {
        it('should return streaming response when stream option is true', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Test', stream: true })
            });
            const response = await instance.fetch(request);
            expect(response.headers.get('Content-Type')).toMatch(/text\/event-stream|application\/x-ndjson/i);
            expect(response.body).toBeDefined();
        });
        it('should emit valid SSE events for streaming', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Count to 3', stream: true })
            });
            const response = await instance.fetch(request);
            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulated = '';
                // Read first few chunks
                for (let i = 0; i < 3; i++) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    accumulated += decoder.decode(value);
                }
                // Should contain SSE format data
                expect(accumulated.length).toBeGreaterThan(0);
            }
        });
        it('should emit done event at end of stream', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Say hi', stream: true })
            });
            const response = await instance.fetch(request);
            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    fullText += decoder.decode(value);
                }
                // Should have some termination indicator
                expect(fullText.includes('[DONE]') || fullText.includes('data: {"done":true}')).toBe(true);
            }
        });
    });
    describe('Error response serialization', () => {
        it('should return structured error objects', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // Missing prompt
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            expect(data).toHaveProperty('error');
            expect(typeof data.error).toBe('string');
        });
        it('should include error code when available', async () => {
            const instance = new FunctionsDO(ctx, env);
            env.AI.run = async () => {
                const error = new Error('Rate limited');
                error.code = 'RATE_LIMIT_EXCEEDED';
                throw error;
            };
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Test' })
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            expect(data).toHaveProperty('code');
        });
        it('should not include stack traces in production errors', async () => {
            const instance = new FunctionsDO(ctx, env);
            env.AI.run = async () => {
                throw new Error('Internal error with sensitive info');
            };
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Test' })
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            expect(data.stack).toBeUndefined();
            expect(data.error).not.toContain('at ');
        });
    });
    describe('Special value serialization', () => {
        it('should handle null values in extracted data', async () => {
            const instance = new FunctionsDO(ctx, env);
            // Mock AI to return null field
            env.AI.run = async () => {
                return { name: 'John', middleName: null, age: 30 };
            };
            const result = await instance.extract('John, 30 years old', { type: 'object' });
            expect(result.middleName).toBeNull();
        });
        it('should handle undefined values by omitting them', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'John is here',
                    schema: { type: 'object', properties: { name: { type: 'string' }, age: { type: 'number' } } }
                })
            });
            const response = await instance.fetch(request);
            const text = await response.text();
            // undefined values should not appear as "undefined" strings
            expect(text).not.toContain('"undefined"');
        });
        it('should serialize Date objects as ISO strings', async () => {
            const instance = new FunctionsDO(ctx, env);
            // Mock AI to return a date
            env.AI.run = async () => {
                return { event: 'meeting', date: new Date('2024-01-15T10:00:00Z') };
            };
            const request = new Request('http://functions.do/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'Meeting on January 15, 2024 at 10am UTC',
                    schema: { type: 'object' }
                })
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            // Date should be serialized as ISO string
            expect(typeof data.date).toBe('string');
            expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}/);
        });
        it('should handle special numeric values', async () => {
            const instance = new FunctionsDO(ctx, env);
            // Embedding might return very small or large numbers
            env.AI.run = async () => {
                return { data: [[0.000001, 0.999999, -0.5, 1e-10]] };
            };
            const request = new Request('http://functions.do/api/embed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Test' })
            });
            const response = await instance.fetch(request);
            const text = await response.text();
            // Should not contain NaN or Infinity
            expect(text).not.toContain('NaN');
            expect(text).not.toContain('Infinity');
        });
        it('should handle BigInt by converting to number or string', async () => {
            const instance = new FunctionsDO(ctx, env);
            // In case AI returns BigInt (unlikely but possible)
            env.AI.run = async () => {
                return { count: BigInt(123456789) };
            };
            const request = new Request('http://functions.do/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: 'Large number: 123456789',
                    schema: { type: 'object' }
                })
            });
            const response = await instance.fetch(request);
            // Should not throw on JSON.stringify
            expect(response.status).toBe(200);
        });
    });
    describe('Content-Type negotiation', () => {
        it('should respect Accept header for JSON', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ prompt: 'Test' })
            });
            const response = await instance.fetch(request);
            expect(response.headers.get('Content-Type')).toMatch(/application\/json/i);
        });
        it('should support text/plain Accept header', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/plain'
                },
                body: JSON.stringify({ prompt: 'Test' })
            });
            const response = await instance.fetch(request);
            // Should return just the text, not full JSON
            expect(response.headers.get('Content-Type')).toMatch(/text\/plain/i);
            const text = await response.text();
            // Should not be JSON
            expect(text.startsWith('{')).toBe(false);
        });
        it('should default to JSON for */* Accept header', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': '*/*'
                },
                body: JSON.stringify({ prompt: 'Test' })
            });
            const response = await instance.fetch(request);
            expect(response.headers.get('Content-Type')).toMatch(/application\/json/i);
        });
    });
    describe('Response metadata', () => {
        it('should include usage statistics in response', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Test' })
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            if (data.usage) {
                expect(data.usage).toHaveProperty('promptTokens');
                expect(data.usage).toHaveProperty('completionTokens');
                expect(data.usage).toHaveProperty('totalTokens');
                expect(typeof data.usage.totalTokens).toBe('number');
            }
        });
        it('should include model name in response', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Test', model: '@cf/meta/llama-3.1-8b-instruct' })
            });
            const response = await instance.fetch(request);
            const data = await response.json();
            expect(data.model).toBeDefined();
        });
        it('should include request ID in response headers', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Test' })
            });
            const response = await instance.fetch(request);
            // Should have some form of request tracking
            const requestId = response.headers.get('X-Request-Id') || response.headers.get('X-Correlation-Id');
            expect(requestId).toBeDefined();
        });
    });
    describe('Function definition serialization', () => {
        it('should serialize function definitions correctly', async () => {
            const instance = new FunctionsDO(ctx, env);
            const request = new Request('http://functions.do/api/functions', { method: 'GET' });
            const response = await instance.fetch(request);
            const functions = await response.json();
            expect(Array.isArray(functions)).toBe(true);
            functions.forEach(fn => {
                expect(fn).toHaveProperty('name');
                expect(typeof fn.name).toBe('string');
                if (fn.description) {
                    expect(typeof fn.description).toBe('string');
                }
                if (fn.parameters) {
                    expect(typeof fn.parameters).toBe('object');
                }
            });
        });
        it('should serialize JSON schema parameters correctly', async () => {
            const instance = new FunctionsDO(ctx, env);
            // First register a function with complex schema
            const registerRequest = new Request('http://functions.do/api/functions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'complexFunc',
                    parameters: {
                        type: 'object',
                        properties: {
                            input: {
                                type: 'object',
                                properties: {
                                    nested: { type: 'array', items: { type: 'string' } }
                                }
                            }
                        }
                    }
                })
            });
            await instance.fetch(registerRequest);
            const listRequest = new Request('http://functions.do/api/functions', { method: 'GET' });
            const response = await instance.fetch(listRequest);
            const functions = await response.json();
            const complexFunc = functions.find(f => f.name === 'complexFunc');
            expect(complexFunc?.parameters).toBeDefined();
            expect(complexFunc?.parameters?.type).toBe('object');
        });
    });
});
