/**
 * RED Tests: evals.do AI Evaluations RPC Interface
 *
 * These tests define the contract for the evals.do worker's RPC interface.
 * The EvalsDO must implement the AI evaluations/benchmarks interface.
 *
 * Per ARCHITECTURE.md:
 * - evals.do implements AI evaluations/benchmarks
 * - Extends slim DO core
 * - Provides evaluation operations via RPC
 * - Supports @callable() decorated methods
 *
 * RED PHASE: These tests MUST FAIL because EvalsDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-ig6n).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv } from './helpers.js';
/**
 * Attempt to load EvalsDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadEvalsDO() {
    // This dynamic import will fail because src/evals.js doesn't exist yet
    const module = await import('../src/evals.js');
    return module.EvalsDO;
}
describe('EvalsDO RPC Interface', () => {
    let ctx;
    let env;
    let EvalsDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        // This will throw in RED phase because the module doesn't exist
        EvalsDO = await loadEvalsDO();
    });
    describe('createEvaluation()', () => {
        it('should create a basic accuracy evaluation', async () => {
            const instance = new EvalsDO(ctx, env);
            const config = {
                name: 'Simple Math Test',
                type: 'accuracy',
                prompt: 'What is 2 + 2?',
                expectedOutput: '4',
                models: ['gpt-4o', 'claude-sonnet-4-20250514'],
            };
            const evaluation = await instance.createEvaluation(config);
            expect(evaluation.id).toBeDefined();
            expect(evaluation.id).toHaveLength(36); // UUID
            expect(evaluation.name).toBe('Simple Math Test');
            expect(evaluation.type).toBe('accuracy');
            expect(evaluation.prompt).toBe('What is 2 + 2?');
            expect(evaluation.models).toEqual(['gpt-4o', 'claude-sonnet-4-20250514']);
            expect(evaluation.createdAt).toBeDefined();
        });
        it('should create an evaluation with prompt template', async () => {
            const instance = new EvalsDO(ctx, env);
            const config = {
                name: 'Parameterized Test',
                type: 'quality',
                prompt: {
                    template: 'Translate "{{text}}" to {{language}}',
                    variables: ['text', 'language'],
                },
                models: ['gpt-4o'],
            };
            const evaluation = await instance.createEvaluation(config);
            expect(evaluation.prompt).toEqual({
                template: 'Translate "{{text}}" to {{language}}',
                variables: ['text', 'language'],
            });
        });
        it('should create an evaluation with expected output matcher', async () => {
            const instance = new EvalsDO(ctx, env);
            const config = {
                name: 'Semantic Match Test',
                type: 'accuracy',
                prompt: 'Explain photosynthesis in one sentence.',
                expectedOutput: {
                    type: 'semantic',
                    value: 'Plants convert sunlight into energy',
                    threshold: 0.8,
                },
                models: ['gpt-4o'],
            };
            const evaluation = await instance.createEvaluation(config);
            expect(evaluation.expectedOutput).toEqual({
                type: 'semantic',
                value: 'Plants convert sunlight into energy',
                threshold: 0.8,
            });
        });
        it('should create an evaluation with dataset reference', async () => {
            const instance = new EvalsDO(ctx, env);
            const config = {
                name: 'Dataset Evaluation',
                type: 'accuracy',
                prompt: '{{question}}',
                dataset: { id: 'mmlu-test', name: 'MMLU Test Set' },
                models: ['gpt-4o'],
            };
            const evaluation = await instance.createEvaluation(config);
            expect(evaluation.dataset).toEqual({ id: 'mmlu-test', name: 'MMLU Test Set' });
        });
        it('should create a latency evaluation', async () => {
            const instance = new EvalsDO(ctx, env);
            const config = {
                name: 'Latency Benchmark',
                type: 'latency',
                prompt: 'Hello, how are you?',
                models: ['gpt-4o', 'claude-sonnet-4-20250514', 'llama-3-70b'],
            };
            const evaluation = await instance.createEvaluation(config);
            expect(evaluation.type).toBe('latency');
            expect(evaluation.models).toHaveLength(3);
        });
        it('should create a cost evaluation', async () => {
            const instance = new EvalsDO(ctx, env);
            const config = {
                name: 'Cost Analysis',
                type: 'cost',
                prompt: 'Summarize this article: {{article}}',
                models: ['gpt-4o', 'gpt-4o-mini'],
            };
            const evaluation = await instance.createEvaluation(config);
            expect(evaluation.type).toBe('cost');
        });
        it('should create a custom evaluation with scoring function', async () => {
            const instance = new EvalsDO(ctx, env);
            const config = {
                name: 'Custom Scoring',
                type: 'custom',
                prompt: 'Generate a haiku about nature.',
                scoringFunction: `
          function score(output) {
            const lines = output.split('\\n').filter(l => l.trim());
            return lines.length === 3 ? 1.0 : 0.0;
          }
        `,
                models: ['gpt-4o'],
            };
            const evaluation = await instance.createEvaluation(config);
            expect(evaluation.type).toBe('custom');
            expect(evaluation.scoringFunction).toBeDefined();
        });
        it('should reject evaluation without required fields', async () => {
            const instance = new EvalsDO(ctx, env);
            const invalidConfig = {
                name: 'Missing Required',
                type: 'accuracy',
                // Missing prompt and models
            };
            await expect(instance.createEvaluation(invalidConfig)).rejects.toThrow(/required|missing/i);
        });
        it('should reject evaluation with empty models array', async () => {
            const instance = new EvalsDO(ctx, env);
            const config = {
                name: 'No Models',
                type: 'accuracy',
                prompt: 'Test',
                models: [],
            };
            await expect(instance.createEvaluation(config)).rejects.toThrow(/models|empty/i);
        });
    });
    describe('getEvaluation()', () => {
        it('should return null for non-existent evaluation', async () => {
            const instance = new EvalsDO(ctx, env);
            const result = await instance.getEvaluation('nonexistent');
            expect(result).toBeNull();
        });
        it('should return evaluation by id', async () => {
            const instance = new EvalsDO(ctx, env);
            const created = await instance.createEvaluation({
                name: 'Test Eval',
                type: 'accuracy',
                prompt: 'Test prompt',
                models: ['gpt-4o'],
            });
            const retrieved = await instance.getEvaluation(created.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved.id).toBe(created.id);
            expect(retrieved.name).toBe('Test Eval');
        });
    });
    describe('listEvaluations()', () => {
        it('should return empty array when no evaluations exist', async () => {
            const instance = new EvalsDO(ctx, env);
            const result = await instance.listEvaluations();
            expect(result).toEqual([]);
        });
        it('should list all evaluations', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.createEvaluation({ name: 'Eval 1', type: 'accuracy', prompt: 'P1', models: ['gpt-4o'] });
            await instance.createEvaluation({ name: 'Eval 2', type: 'latency', prompt: 'P2', models: ['gpt-4o'] });
            const result = await instance.listEvaluations();
            expect(result).toHaveLength(2);
        });
        it('should respect limit option', async () => {
            const instance = new EvalsDO(ctx, env);
            for (let i = 0; i < 10; i++) {
                await instance.createEvaluation({ name: `Eval ${i}`, type: 'accuracy', prompt: 'Test', models: ['gpt-4o'] });
            }
            const result = await instance.listEvaluations({ limit: 5 });
            expect(result).toHaveLength(5);
        });
        it('should filter by type', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.createEvaluation({ name: 'Accuracy', type: 'accuracy', prompt: 'Test', models: ['gpt-4o'] });
            await instance.createEvaluation({ name: 'Latency', type: 'latency', prompt: 'Test', models: ['gpt-4o'] });
            const result = await instance.listEvaluations({ type: 'accuracy' });
            expect(result).toHaveLength(1);
            expect(result[0]?.type).toBe('accuracy');
        });
        it('should support ordering by createdAt', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.createEvaluation({ name: 'First', type: 'accuracy', prompt: 'Test', models: ['gpt-4o'] });
            await instance.createEvaluation({ name: 'Second', type: 'accuracy', prompt: 'Test', models: ['gpt-4o'] });
            const descResult = await instance.listEvaluations({ orderBy: 'createdAt', order: 'desc' });
            expect(descResult[0]?.name).toBe('Second');
        });
    });
    describe('deleteEvaluation()', () => {
        it('should return false for non-existent evaluation', async () => {
            const instance = new EvalsDO(ctx, env);
            const result = await instance.deleteEvaluation('nonexistent');
            expect(result).toBe(false);
        });
        it('should delete existing evaluation', async () => {
            const instance = new EvalsDO(ctx, env);
            const created = await instance.createEvaluation({
                name: 'To Delete',
                type: 'accuracy',
                prompt: 'Test',
                models: ['gpt-4o'],
            });
            const result = await instance.deleteEvaluation(created.id);
            expect(result).toBe(true);
            expect(await instance.getEvaluation(created.id)).toBeNull();
        });
    });
    describe('runEvaluation()', () => {
        it('should start an evaluation run', async () => {
            const instance = new EvalsDO(ctx, env);
            const evaluation = await instance.createEvaluation({
                name: 'Runnable',
                type: 'accuracy',
                prompt: 'Test',
                models: ['gpt-4o'],
            });
            const run = await instance.runEvaluation(evaluation.id);
            expect(run.id).toBeDefined();
            expect(run.evaluationId).toBe(evaluation.id);
            expect(run.status).toMatch(/pending|running/);
            expect(run.startedAt).toBeDefined();
        });
        it('should throw for non-existent evaluation', async () => {
            const instance = new EvalsDO(ctx, env);
            await expect(instance.runEvaluation('nonexistent')).rejects.toThrow(/not found/i);
        });
        it('should support running with subset of models', async () => {
            const instance = new EvalsDO(ctx, env);
            const evaluation = await instance.createEvaluation({
                name: 'Multi Model',
                type: 'accuracy',
                prompt: 'Test',
                models: ['gpt-4o', 'claude-sonnet-4-20250514', 'llama-3-70b'],
            });
            const run = await instance.runEvaluation(evaluation.id, { models: ['gpt-4o'] });
            expect(run.results).toHaveLength(1);
            expect(run.results[0]?.model).toBe('gpt-4o');
        });
    });
    describe('getEvaluationRun()', () => {
        it('should return null for non-existent run', async () => {
            const instance = new EvalsDO(ctx, env);
            const result = await instance.getEvaluationRun('nonexistent');
            expect(result).toBeNull();
        });
        it('should return run by id', async () => {
            const instance = new EvalsDO(ctx, env);
            const evaluation = await instance.createEvaluation({
                name: 'Test',
                type: 'accuracy',
                prompt: 'Test',
                models: ['gpt-4o'],
            });
            const run = await instance.runEvaluation(evaluation.id);
            const retrieved = await instance.getEvaluationRun(run.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved.id).toBe(run.id);
        });
    });
    describe('listEvaluationRuns()', () => {
        it('should list runs for an evaluation', async () => {
            const instance = new EvalsDO(ctx, env);
            const evaluation = await instance.createEvaluation({
                name: 'Test',
                type: 'accuracy',
                prompt: 'Test',
                models: ['gpt-4o'],
            });
            await instance.runEvaluation(evaluation.id);
            await instance.runEvaluation(evaluation.id);
            const runs = await instance.listEvaluationRuns(evaluation.id);
            expect(runs).toHaveLength(2);
        });
        it('should filter by status', async () => {
            const instance = new EvalsDO(ctx, env);
            const evaluation = await instance.createEvaluation({
                name: 'Test',
                type: 'accuracy',
                prompt: 'Test',
                models: ['gpt-4o'],
            });
            await instance.runEvaluation(evaluation.id);
            const pendingRuns = await instance.listEvaluationRuns(evaluation.id, { status: 'pending' });
            expect(pendingRuns.every(r => r.status === 'pending')).toBe(true);
        });
    });
    describe('RPC interface', () => {
        describe('hasMethod()', () => {
            it('should return true for allowed evaluation methods', async () => {
                const instance = new EvalsDO(ctx, env);
                expect(instance.hasMethod('createEvaluation')).toBe(true);
                expect(instance.hasMethod('getEvaluation')).toBe(true);
                expect(instance.hasMethod('listEvaluations')).toBe(true);
                expect(instance.hasMethod('deleteEvaluation')).toBe(true);
                expect(instance.hasMethod('runEvaluation')).toBe(true);
                expect(instance.hasMethod('getEvaluationRun')).toBe(true);
                expect(instance.hasMethod('listEvaluationRuns')).toBe(true);
            });
            it('should return false for non-existent methods', async () => {
                const instance = new EvalsDO(ctx, env);
                expect(instance.hasMethod('nonexistent')).toBe(false);
                expect(instance.hasMethod('dangerous')).toBe(false);
            });
        });
        describe('invoke()', () => {
            it('should invoke allowed method with params', async () => {
                const instance = new EvalsDO(ctx, env);
                const created = await instance.invoke('createEvaluation', [{
                        name: 'RPC Test',
                        type: 'accuracy',
                        prompt: 'Test',
                        models: ['gpt-4o'],
                    }]);
                expect(created.id).toBeDefined();
                expect(created.name).toBe('RPC Test');
            });
            it('should throw for disallowed method', async () => {
                const instance = new EvalsDO(ctx, env);
                await expect(instance.invoke('dangerous', [])).rejects.toThrow(/not allowed|not found/i);
            });
        });
    });
    describe('HTTP fetch() handler', () => {
        describe('RPC endpoint', () => {
            it('should handle POST /rpc with method call', async () => {
                const instance = new EvalsDO(ctx, env);
                const request = new Request('http://evals.do/rpc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        method: 'createEvaluation',
                        params: [{
                                name: 'HTTP Test',
                                type: 'accuracy',
                                prompt: 'Test',
                                models: ['gpt-4o'],
                            }],
                    }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const result = await response.json();
                expect(result.result.name).toBe('HTTP Test');
            });
            it('should return error for invalid method', async () => {
                const instance = new EvalsDO(ctx, env);
                const request = new Request('http://evals.do/rpc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'invalid', params: [] }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(400);
                const result = await response.json();
                expect(result.error).toBeDefined();
            });
        });
        describe('REST API endpoints', () => {
            it('should handle GET /api/evaluations', async () => {
                const instance = new EvalsDO(ctx, env);
                await instance.createEvaluation({
                    name: 'REST Test',
                    type: 'accuracy',
                    prompt: 'Test',
                    models: ['gpt-4o'],
                });
                const request = new Request('http://evals.do/api/evaluations', { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = await response.json();
                expect(Array.isArray(data)).toBe(true);
                expect(data).toHaveLength(1);
            });
            it('should handle GET /api/evaluations/:id', async () => {
                const instance = new EvalsDO(ctx, env);
                const evaluation = await instance.createEvaluation({
                    name: 'Single',
                    type: 'accuracy',
                    prompt: 'Test',
                    models: ['gpt-4o'],
                });
                const request = new Request(`http://evals.do/api/evaluations/${evaluation.id}`, { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = await response.json();
                expect(data.id).toBe(evaluation.id);
            });
            it('should handle POST /api/evaluations', async () => {
                const instance = new EvalsDO(ctx, env);
                const request = new Request('http://evals.do/api/evaluations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Created via REST',
                        type: 'accuracy',
                        prompt: 'Test',
                        models: ['gpt-4o'],
                    }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(201);
                const data = await response.json();
                expect(data.name).toBe('Created via REST');
            });
            it('should handle DELETE /api/evaluations/:id', async () => {
                const instance = new EvalsDO(ctx, env);
                const evaluation = await instance.createEvaluation({
                    name: 'To Delete',
                    type: 'accuracy',
                    prompt: 'Test',
                    models: ['gpt-4o'],
                });
                const request = new Request(`http://evals.do/api/evaluations/${evaluation.id}`, { method: 'DELETE' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
            });
            it('should handle POST /api/evaluations/:id/run', async () => {
                const instance = new EvalsDO(ctx, env);
                const evaluation = await instance.createEvaluation({
                    name: 'Runnable',
                    type: 'accuracy',
                    prompt: 'Test',
                    models: ['gpt-4o'],
                });
                const request = new Request(`http://evals.do/api/evaluations/${evaluation.id}/run`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const run = await response.json();
                expect(run.evaluationId).toBe(evaluation.id);
            });
            it('should handle GET /api/evaluations/:id/runs', async () => {
                const instance = new EvalsDO(ctx, env);
                const evaluation = await instance.createEvaluation({
                    name: 'With Runs',
                    type: 'accuracy',
                    prompt: 'Test',
                    models: ['gpt-4o'],
                });
                await instance.runEvaluation(evaluation.id);
                const request = new Request(`http://evals.do/api/evaluations/${evaluation.id}/runs`, { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const runs = await response.json();
                expect(Array.isArray(runs)).toBe(true);
            });
        });
        describe('HATEOAS discovery', () => {
            it('should return discovery info at GET /', async () => {
                const instance = new EvalsDO(ctx, env);
                const request = new Request('http://evals.do/', { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = await response.json();
                expect(data.api).toBeDefined();
                expect(data.links).toBeDefined();
                expect(data.discover).toBeDefined();
            });
            it('should include available RPC methods in discovery', async () => {
                const instance = new EvalsDO(ctx, env);
                const request = new Request('http://evals.do/', { method: 'GET' });
                const response = await instance.fetch(request);
                const data = await response.json();
                const methodNames = data.discover.methods.map(m => m.name);
                expect(methodNames).toContain('createEvaluation');
                expect(methodNames).toContain('runEvaluation');
                expect(methodNames).toContain('listEvaluations');
            });
        });
    });
});
