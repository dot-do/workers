/**
 * RED Tests: functions.do ai-functions RPC Interface
 *
 * These tests define the contract for the functions.do worker's RPC interface.
 * The FunctionsDO must implement the ai-functions compatible interface.
 *
 * Per ARCHITECTURE.md:
 * - functions.do implements ai-functions RPC
 * - Extends slim DO core
 * - Provides AI primitives (generate, list, extract, etc.)
 * - Supports AIPromise, batch processing, providers
 * - Supports @callable() decorated methods
 *
 * RED PHASE: These tests MUST FAIL because FunctionsDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-v9z5).
 *
 * @see ARCHITECTURE.md lines 979, 1334
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv } from './helpers.js';
/**
 * Attempt to load FunctionsDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadFunctionsDO() {
    // This dynamic import will fail because src/functions.js doesn't exist yet
    const module = await import('../src/functions.js');
    return module.FunctionsDO;
}
describe('FunctionsDO RPC Interface', () => {
    let ctx;
    let env;
    let FunctionsDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        // This will throw in RED phase because the module doesn't exist
        FunctionsDO = await loadFunctionsDO();
    });
    describe('ai-functions core operations', () => {
        describe('generate()', () => {
            it('should generate text from a prompt', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.generate('What is 2 + 2?');
                expect(result).toHaveProperty('text');
                expect(typeof result.text).toBe('string');
                expect(result.text.length).toBeGreaterThan(0);
            });
            it('should support model selection', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.generate('Hello', { model: '@cf/meta/llama-3.1-8b-instruct' });
                expect(result).toHaveProperty('text');
                expect(result.model).toBe('@cf/meta/llama-3.1-8b-instruct');
            });
            it('should support maxTokens option', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.generate('Write a long essay', { maxTokens: 50 });
                expect(result).toHaveProperty('text');
            });
            it('should support temperature option', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.generate('Be creative', { temperature: 0.9 });
                expect(result).toHaveProperty('text');
            });
            it('should return usage statistics when available', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.generate('Count to 5');
                if (result.usage) {
                    expect(result.usage).toHaveProperty('promptTokens');
                    expect(result.usage).toHaveProperty('completionTokens');
                    expect(result.usage).toHaveProperty('totalTokens');
                }
            });
            it('should support JSON output format', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.generate('Return a JSON object with name and age', {
                    format: 'json',
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            age: { type: 'number' }
                        }
                    }
                });
                expect(result).toHaveProperty('text');
                // Should be valid JSON
                expect(() => JSON.parse(result.text)).not.toThrow();
            });
        });
        describe('list()', () => {
            it('should extract a list of items from a prompt', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.list('List 5 programming languages');
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
            });
            it('should respect maxItems option', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.list('List all countries', { maxItems: 3 });
                expect(result.length).toBeLessThanOrEqual(3);
            });
            it('should support typed results with schema', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.list('List 3 fictional characters with ages', {
                    schema: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                age: { type: 'number' }
                            }
                        }
                    }
                });
                expect(Array.isArray(result)).toBe(true);
                result.forEach(person => {
                    expect(person).toHaveProperty('name');
                    expect(person).toHaveProperty('age');
                });
            });
        });
        describe('extract()', () => {
            it('should extract structured data from text', async () => {
                const instance = new FunctionsDO(ctx, env);
                const text = 'John Smith is 30 years old and lives in New York.';
                const schema = {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Full name' },
                        age: { type: 'number', description: 'Age in years' },
                        city: { type: 'string', description: 'City of residence' }
                    },
                    required: ['name', 'age']
                };
                const result = await instance.extract(text, schema);
                expect(result).toHaveProperty('name');
                expect(result).toHaveProperty('age');
                expect(typeof result.age).toBe('number');
            });
            it('should support strict mode for exact schema matching', async () => {
                const instance = new FunctionsDO(ctx, env);
                const text = 'Email: test@example.com, Phone: 555-1234';
                const schema = {
                    type: 'object',
                    properties: {
                        email: { type: 'string' },
                        phone: { type: 'string' }
                    },
                    required: ['email', 'phone']
                };
                const result = await instance.extract(text, schema, { strict: true });
                expect(result.email).toMatch(/@/);
                expect(result.phone).toBeDefined();
            });
            it('should return null for missing required fields in strict mode', async () => {
                const instance = new FunctionsDO(ctx, env);
                const text = 'Just some random text without the expected data';
                const schema = {
                    type: 'object',
                    properties: {
                        specificField: { type: 'string' }
                    },
                    required: ['specificField']
                };
                await expect(instance.extract(text, schema, { strict: true })).rejects.toThrow(/extract|missing|required/i);
            });
        });
        describe('classify()', () => {
            it('should classify text into a category', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.classify('I love this product! Best purchase ever!', ['positive', 'negative', 'neutral']);
                expect(result).toHaveProperty('category');
                expect(result).toHaveProperty('confidence');
                expect(['positive', 'negative', 'neutral']).toContain(result.category);
                expect(result.confidence).toBeGreaterThanOrEqual(0);
                expect(result.confidence).toBeLessThanOrEqual(1);
            });
            it('should return all category scores when requested', async () => {
                const instance = new FunctionsDO(ctx, env);
                const categories = ['spam', 'not_spam'];
                const result = await instance.classify('Buy now! Limited offer!', categories);
                if (result.allScores) {
                    categories.forEach(cat => {
                        expect(result.allScores).toHaveProperty(cat);
                    });
                }
            });
            it('should support multi-label classification', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.classify('Breaking: Tech company announces new AI product', ['tech', 'business', 'politics', 'sports'], { multiLabel: true });
                expect(result).toHaveProperty('category');
            });
        });
        describe('summarize()', () => {
            it('should summarize text', async () => {
                const instance = new FunctionsDO(ctx, env);
                const longText = 'This is a very long article about artificial intelligence. '.repeat(50);
                const result = await instance.summarize(longText);
                expect(typeof result).toBe('string');
                expect(result.length).toBeLessThan(longText.length);
            });
            it('should respect maxLength option', async () => {
                const instance = new FunctionsDO(ctx, env);
                const text = 'A detailed explanation of quantum computing principles.'.repeat(20);
                const result = await instance.summarize(text, { maxLength: 100 });
                expect(result.length).toBeLessThanOrEqual(150); // Allow some tolerance
            });
            it('should support different summary styles', async () => {
                const instance = new FunctionsDO(ctx, env);
                const text = 'First point. Second point. Third point. Fourth point.';
                const brief = await instance.summarize(text, { style: 'brief' });
                const bullets = await instance.summarize(text, { style: 'bullets' });
                expect(typeof brief).toBe('string');
                expect(typeof bullets).toBe('string');
            });
        });
        describe('translate()', () => {
            it('should translate text to target language', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.translate('Hello, world!', 'Spanish');
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThan(0);
            });
            it('should support source language hint', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.translate('Bonjour', 'English', { sourceLanguage: 'French' });
                expect(typeof result).toBe('string');
            });
        });
        describe('embed()', () => {
            it('should generate embeddings for single text', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.embed('Hello, world!');
                expect(Array.isArray(result)).toBe(true);
                if (Array.isArray(result) && typeof result[0] === 'number') {
                    expect(result.length).toBeGreaterThan(0);
                    expect(typeof result[0]).toBe('number');
                }
            });
            it('should generate embeddings for multiple texts', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.embed(['Hello', 'World', 'Test']);
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBe(3);
                result.forEach(embedding => {
                    expect(Array.isArray(embedding)).toBe(true);
                });
            });
            it('should support model selection for embeddings', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.embed('Test', { model: '@cf/baai/bge-small-en-v1.5' });
                expect(Array.isArray(result)).toBe(true);
            });
        });
    });
    describe('Function registration and invocation', () => {
        describe('register()', () => {
            it('should register a new function', async () => {
                const instance = new FunctionsDO(ctx, env);
                await instance.register({
                    name: 'greet',
                    description: 'Greet a person',
                    parameters: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' }
                        }
                    }
                });
                const functions = await instance.listFunctions();
                expect(functions.some(f => f.name === 'greet')).toBe(true);
            });
            it('should reject duplicate function names', async () => {
                const instance = new FunctionsDO(ctx, env);
                await instance.register({ name: 'myFunc' });
                await expect(instance.register({ name: 'myFunc' })).rejects.toThrow(/exists|duplicate/i);
            });
        });
        describe('invoke()', () => {
            it('should invoke a registered function', async () => {
                const instance = new FunctionsDO(ctx, env);
                await instance.register({
                    name: 'add',
                    parameters: {
                        type: 'object',
                        properties: {
                            a: { type: 'number' },
                            b: { type: 'number' }
                        }
                    }
                });
                const result = await instance.invoke('add', { a: 2, b: 3 });
                expect(result).toBeDefined();
            });
            it('should throw error for unknown function', async () => {
                const instance = new FunctionsDO(ctx, env);
                await expect(instance.invoke('nonexistent', {})).rejects.toThrow(/not found|unknown/i);
            });
            it('should validate parameters against schema', async () => {
                const instance = new FunctionsDO(ctx, env);
                await instance.register({
                    name: 'requiresString',
                    parameters: {
                        type: 'object',
                        properties: {
                            input: { type: 'string' }
                        },
                        required: ['input']
                    }
                });
                await expect(instance.invoke('requiresString', {})).rejects.toThrow(/required|validation|parameter/i);
            });
        });
        describe('listFunctions()', () => {
            it('should list all registered functions', async () => {
                const instance = new FunctionsDO(ctx, env);
                await instance.register({ name: 'func1' });
                await instance.register({ name: 'func2' });
                const functions = await instance.listFunctions();
                expect(functions.length).toBeGreaterThanOrEqual(2);
                expect(functions.some(f => f.name === 'func1')).toBe(true);
                expect(functions.some(f => f.name === 'func2')).toBe(true);
            });
            it('should return empty array when no functions registered', async () => {
                const instance = new FunctionsDO(ctx, env);
                const functions = await instance.listFunctions();
                expect(Array.isArray(functions)).toBe(true);
            });
        });
    });
    describe('RPC interface', () => {
        describe('hasMethod()', () => {
            it('should return true for allowed AI methods', async () => {
                const instance = new FunctionsDO(ctx, env);
                expect(instance.hasMethod('generate')).toBe(true);
                expect(instance.hasMethod('list')).toBe(true);
                expect(instance.hasMethod('extract')).toBe(true);
                expect(instance.hasMethod('classify')).toBe(true);
                expect(instance.hasMethod('summarize')).toBe(true);
                expect(instance.hasMethod('translate')).toBe(true);
                expect(instance.hasMethod('embed')).toBe(true);
            });
            it('should return true for function management methods', async () => {
                const instance = new FunctionsDO(ctx, env);
                expect(instance.hasMethod('invoke')).toBe(true);
                expect(instance.hasMethod('register')).toBe(true);
                expect(instance.hasMethod('listFunctions')).toBe(true);
            });
            it('should return false for non-existent methods', async () => {
                const instance = new FunctionsDO(ctx, env);
                expect(instance.hasMethod('nonexistent')).toBe(false);
                expect(instance.hasMethod('eval')).toBe(false);
            });
        });
        describe('call()', () => {
            it('should call allowed method with params', async () => {
                const instance = new FunctionsDO(ctx, env);
                const result = await instance.call('generate', ['What is AI?']);
                expect(result).toHaveProperty('text');
            });
            it('should throw error for disallowed method', async () => {
                const instance = new FunctionsDO(ctx, env);
                await expect(instance.call('dangerous', [])).rejects.toThrow(/not allowed|not found/i);
            });
        });
    });
    describe('HTTP fetch() handler', () => {
        describe('RPC endpoint', () => {
            it('should handle POST /rpc with method call', async () => {
                const instance = new FunctionsDO(ctx, env);
                const request = new Request('http://functions.do/rpc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'generate', params: ['Hello'] })
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const result = await response.json();
                expect(result).toHaveProperty('result');
                expect(result.result).toHaveProperty('text');
            });
            it('should return error for invalid method', async () => {
                const instance = new FunctionsDO(ctx, env);
                const request = new Request('http://functions.do/rpc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'invalid', params: [] })
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(400);
                const result = await response.json();
                expect(result).toHaveProperty('error');
            });
            it('should handle POST /rpc/batch for batch operations', async () => {
                const instance = new FunctionsDO(ctx, env);
                const request = new Request('http://functions.do/rpc/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([
                        { method: 'generate', params: ['Query 1'] },
                        { method: 'generate', params: ['Query 2'] },
                    ])
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const results = await response.json();
                expect(results).toHaveLength(2);
            });
        });
        describe('REST API endpoints', () => {
            it('should handle POST /api/generate', async () => {
                const instance = new FunctionsDO(ctx, env);
                const request = new Request('http://functions.do/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: 'Hello' })
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = await response.json();
                expect(data).toHaveProperty('text');
            });
            it('should handle POST /api/extract', async () => {
                const instance = new FunctionsDO(ctx, env);
                const request = new Request('http://functions.do/api/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: 'John is 30 years old',
                        schema: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                age: { type: 'number' }
                            }
                        }
                    })
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
            });
            it('should handle POST /api/classify', async () => {
                const instance = new FunctionsDO(ctx, env);
                const request = new Request('http://functions.do/api/classify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: 'Great product!',
                        categories: ['positive', 'negative']
                    })
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
            });
            it('should handle POST /api/embed', async () => {
                const instance = new FunctionsDO(ctx, env);
                const request = new Request('http://functions.do/api/embed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: 'Hello world' })
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = await response.json();
                expect(Array.isArray(data)).toBe(true);
            });
            it('should handle GET /api/functions to list registered functions', async () => {
                const instance = new FunctionsDO(ctx, env);
                const request = new Request('http://functions.do/api/functions', { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = await response.json();
                expect(Array.isArray(data)).toBe(true);
            });
            it('should handle POST /api/functions/:name/invoke', async () => {
                const instance = new FunctionsDO(ctx, env);
                await instance.register({ name: 'myFunc' });
                const request = new Request('http://functions.do/api/functions/myFunc/invoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ input: 'test' })
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
            });
        });
        describe('HATEOAS discovery', () => {
            it('should return discovery info at GET /', async () => {
                const instance = new FunctionsDO(ctx, env);
                const request = new Request('http://functions.do/', { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = await response.json();
                expect(data.api).toBeDefined();
                expect(data.links).toBeDefined();
                expect(data.discover).toBeDefined();
            });
            it('should include available AI methods in discovery', async () => {
                const instance = new FunctionsDO(ctx, env);
                const request = new Request('http://functions.do/', { method: 'GET' });
                const response = await instance.fetch(request);
                const data = await response.json();
                const methodNames = data.discover.methods.map((m) => m.name);
                expect(methodNames).toContain('generate');
                expect(methodNames).toContain('list');
                expect(methodNames).toContain('extract');
                expect(methodNames).toContain('classify');
                expect(methodNames).toContain('summarize');
                expect(methodNames).toContain('translate');
                expect(methodNames).toContain('embed');
            });
            it('should include registered functions in discovery', async () => {
                const instance = new FunctionsDO(ctx, env);
                await instance.register({ name: 'customFunc', description: 'A custom function' });
                const request = new Request('http://functions.do/', { method: 'GET' });
                const response = await instance.fetch(request);
                const data = await response.json();
                expect(data.discover.functions.some((f) => f.name === 'customFunc')).toBe(true);
            });
        });
    });
});
