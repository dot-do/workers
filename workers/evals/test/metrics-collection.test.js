/**
 * RED Tests: evals.do Metrics Collection
 *
 * These tests define the contract for the evals.do worker's metrics collection.
 * The EvalsDO must collect and store metrics during evaluation runs.
 *
 * RED PHASE: These tests MUST FAIL because EvalsDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-ig6n).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv } from './helpers.js';
/**
 * Attempt to load EvalsDO - this will fail in RED phase
 */
async function loadEvalsDO() {
    const module = await import('../src/evals.js');
    return module.EvalsDO;
}
describe('EvalsDO Metrics Collection', () => {
    let ctx;
    let env;
    let EvalsDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        EvalsDO = await loadEvalsDO();
    });
    describe('collectMetric()', () => {
        it('should collect a latency metric', async () => {
            const instance = new EvalsDO(ctx, env);
            const metric = await instance.collectMetric('run-123', {
                model: 'gpt-4o',
                name: 'latencyMs',
                value: 250,
                unit: 'ms',
            });
            expect(metric.id).toBeDefined();
            expect(metric.runId).toBe('run-123');
            expect(metric.model).toBe('gpt-4o');
            expect(metric.name).toBe('latencyMs');
            expect(metric.value).toBe(250);
            expect(metric.unit).toBe('ms');
            expect(metric.timestamp).toBeDefined();
        });
        it('should collect token usage metrics', async () => {
            const instance = new EvalsDO(ctx, env);
            const inputTokens = await instance.collectMetric('run-123', {
                model: 'gpt-4o',
                name: 'inputTokens',
                value: 100,
                unit: 'tokens',
            });
            const outputTokens = await instance.collectMetric('run-123', {
                model: 'gpt-4o',
                name: 'outputTokens',
                value: 50,
                unit: 'tokens',
            });
            expect(inputTokens.value).toBe(100);
            expect(outputTokens.value).toBe(50);
        });
        it('should collect cost metrics', async () => {
            const instance = new EvalsDO(ctx, env);
            const metric = await instance.collectMetric('run-123', {
                model: 'gpt-4o',
                name: 'cost',
                value: 0.0025,
                unit: 'USD',
                metadata: { inputCost: 0.001, outputCost: 0.0015 },
            });
            expect(metric.value).toBe(0.0025);
            expect(metric.metadata).toEqual({ inputCost: 0.001, outputCost: 0.0015 });
        });
        it('should collect score metrics', async () => {
            const instance = new EvalsDO(ctx, env);
            const metric = await instance.collectMetric('run-123', {
                model: 'gpt-4o',
                name: 'score',
                value: 0.95,
                metadata: { scoringMethod: 'exact_match' },
            });
            expect(metric.value).toBe(0.95);
        });
        it('should use provided timestamp if given', async () => {
            const instance = new EvalsDO(ctx, env);
            const timestamp = '2025-01-07T10:00:00Z';
            const metric = await instance.collectMetric('run-123', {
                model: 'gpt-4o',
                name: 'latencyMs',
                value: 200,
                timestamp,
            });
            expect(metric.timestamp).toBe(timestamp);
        });
        it('should reject invalid metric values', async () => {
            const instance = new EvalsDO(ctx, env);
            await expect(instance.collectMetric('run-123', {
                model: 'gpt-4o',
                name: 'latencyMs',
                value: NaN,
            })).rejects.toThrow(/invalid|NaN/i);
        });
    });
    describe('getMetrics()', () => {
        it('should return all metrics for a run', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'inputTokens', value: 100 });
            await instance.collectMetric('run-123', { model: 'claude-sonnet-4-20250514', name: 'latencyMs', value: 180 });
            const metrics = await instance.getMetrics('run-123');
            expect(metrics).toHaveLength(3);
        });
        it('should filter by model', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            await instance.collectMetric('run-123', { model: 'claude-sonnet-4-20250514', name: 'latencyMs', value: 180 });
            const metrics = await instance.getMetrics('run-123', { model: 'gpt-4o' });
            expect(metrics).toHaveLength(1);
            expect(metrics[0]?.model).toBe('gpt-4o');
        });
        it('should filter by metric name', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'inputTokens', value: 100 });
            const metrics = await instance.getMetrics('run-123', { name: 'latencyMs' });
            expect(metrics).toHaveLength(1);
            expect(metrics[0]?.name).toBe('latencyMs');
        });
        it('should filter by time range', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-123', {
                model: 'gpt-4o',
                name: 'latencyMs',
                value: 200,
                timestamp: '2025-01-07T09:00:00Z',
            });
            await instance.collectMetric('run-123', {
                model: 'gpt-4o',
                name: 'latencyMs',
                value: 250,
                timestamp: '2025-01-07T11:00:00Z',
            });
            const metrics = await instance.getMetrics('run-123', {
                startTime: '2025-01-07T10:00:00Z',
                endTime: '2025-01-07T12:00:00Z',
            });
            expect(metrics).toHaveLength(1);
            expect(metrics[0]?.value).toBe(250);
        });
        it('should respect limit option', async () => {
            const instance = new EvalsDO(ctx, env);
            for (let i = 0; i < 10; i++) {
                await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'latencyMs', value: 200 + i });
            }
            const metrics = await instance.getMetrics('run-123', { limit: 5 });
            expect(metrics).toHaveLength(5);
        });
    });
    describe('aggregateMetrics()', () => {
        it('should aggregate metrics by model', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'latencyMs', value: 250 });
            await instance.collectMetric('run-123', { model: 'claude-sonnet-4-20250514', name: 'latencyMs', value: 180 });
            const aggregated = await instance.aggregateMetrics('run-123', { groupBy: 'model' });
            expect(aggregated.groups).toHaveLength(2);
            const gptGroup = aggregated.groups.find(g => g.key === 'gpt-4o');
            expect(gptGroup?.metrics[0]?.avg).toBe(225);
        });
        it('should calculate percentiles', async () => {
            const instance = new EvalsDO(ctx, env);
            for (let i = 1; i <= 100; i++) {
                await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'latencyMs', value: i * 10 });
            }
            const aggregated = await instance.aggregateMetrics('run-123', { operation: 'p50' });
            const metrics = aggregated.groups[0]?.metrics[0];
            expect(metrics?.p50).toBeDefined();
            expect(metrics?.p50).toBeCloseTo(500, -1);
        });
        it('should include summary statistics', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'inputTokens', value: 100 });
            const aggregated = await instance.aggregateMetrics('run-123');
            expect(aggregated.summary.totalMetrics).toBe(2);
            expect(aggregated.summary.startTime).toBeDefined();
            expect(aggregated.summary.endTime).toBeDefined();
        });
    });
    describe('getModelMetrics()', () => {
        it('should return aggregated metrics for a model', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-1', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            await instance.collectMetric('run-1', { model: 'gpt-4o', name: 'inputTokens', value: 100 });
            await instance.collectMetric('run-2', { model: 'gpt-4o', name: 'latencyMs', value: 250 });
            await instance.collectMetric('run-2', { model: 'gpt-4o', name: 'inputTokens', value: 120 });
            const modelMetrics = await instance.getModelMetrics('gpt-4o');
            expect(modelMetrics.model).toBe('gpt-4o');
            expect(modelMetrics.totalRuns).toBe(2);
            expect(modelMetrics.metrics.latencyMs.avg).toBe(225);
            expect(modelMetrics.metrics.inputTokens.total).toBe(220);
        });
        it('should calculate percentiles for latency', async () => {
            const instance = new EvalsDO(ctx, env);
            for (let i = 1; i <= 100; i++) {
                await instance.collectMetric(`run-${i}`, { model: 'gpt-4o', name: 'latencyMs', value: i * 10 });
            }
            const modelMetrics = await instance.getModelMetrics('gpt-4o');
            expect(modelMetrics.metrics.latencyMs.p50).toBeDefined();
            expect(modelMetrics.metrics.latencyMs.p95).toBeDefined();
            expect(modelMetrics.metrics.latencyMs.p99).toBeDefined();
        });
        it('should filter by evaluation id', async () => {
            const instance = new EvalsDO(ctx, env);
            // Simulate runs with evaluation context
            await instance.collectMetric('eval1-run1', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            await instance.collectMetric('eval2-run1', { model: 'gpt-4o', name: 'latencyMs', value: 300 });
            const modelMetrics = await instance.getModelMetrics('gpt-4o', { evaluationId: 'eval1' });
            expect(modelMetrics.metrics.latencyMs.avg).toBe(200);
        });
    });
    describe('compareModels()', () => {
        it('should compare models by latency', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-1', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            await instance.collectMetric('run-1', { model: 'claude-sonnet-4-20250514', name: 'latencyMs', value: 180 });
            await instance.collectMetric('run-1', { model: 'llama-3-70b', name: 'latencyMs', value: 250 });
            const comparison = await instance.compareModels(['gpt-4o', 'claude-sonnet-4-20250514', 'llama-3-70b'], 'latencyMs');
            expect(comparison.metric).toBe('latencyMs');
            expect(comparison.models).toHaveLength(3);
            expect(comparison.winner).toBe('claude-sonnet-4-20250514');
            expect(comparison.models.find(m => m.model === 'claude-sonnet-4-20250514')?.rank).toBe(1);
        });
        it('should compare models by accuracy score', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-1', { model: 'gpt-4o', name: 'score', value: 0.95 });
            await instance.collectMetric('run-1', { model: 'claude-sonnet-4-20250514', name: 'score', value: 0.92 });
            const comparison = await instance.compareModels(['gpt-4o', 'claude-sonnet-4-20250514'], 'score');
            expect(comparison.winner).toBe('gpt-4o');
            expect(comparison.difference).toBeCloseTo(0.03, 2);
            expect(comparison.percentageDifference).toBeGreaterThan(0);
        });
        it('should compare models by cost', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-1', { model: 'gpt-4o', name: 'cost', value: 0.003 });
            await instance.collectMetric('run-1', { model: 'gpt-4o-mini', name: 'cost', value: 0.0005 });
            const comparison = await instance.compareModels(['gpt-4o', 'gpt-4o-mini'], 'cost');
            expect(comparison.winner).toBe('gpt-4o-mini'); // Lower cost wins
        });
    });
    describe('getMetricTimeSeries()', () => {
        it('should return time series data', async () => {
            const instance = new EvalsDO(ctx, env);
            const baseTime = new Date('2025-01-07T10:00:00Z');
            for (let i = 0; i < 10; i++) {
                const timestamp = new Date(baseTime.getTime() + i * 60000).toISOString();
                await instance.collectMetric(`eval1-run-${i}`, {
                    model: 'gpt-4o',
                    name: 'latencyMs',
                    value: 200 + Math.random() * 50,
                    timestamp,
                });
            }
            const timeSeries = await instance.getMetricTimeSeries('eval1', 'latencyMs');
            expect(timeSeries.evaluationId).toBe('eval1');
            expect(timeSeries.metric).toBe('latencyMs');
            expect(timeSeries.dataPoints).toBeInstanceOf(Array);
            expect(timeSeries.dataPoints.length).toBeGreaterThan(0);
        });
        it('should aggregate by specified interval', async () => {
            const instance = new EvalsDO(ctx, env);
            const baseTime = new Date('2025-01-07T10:00:00Z');
            // Create metrics across multiple hours
            for (let hour = 0; hour < 3; hour++) {
                for (let minute = 0; minute < 10; minute++) {
                    const timestamp = new Date(baseTime.getTime() + hour * 3600000 + minute * 60000).toISOString();
                    await instance.collectMetric(`eval1-run-${hour}-${minute}`, {
                        model: 'gpt-4o',
                        name: 'latencyMs',
                        value: 200,
                        timestamp,
                    });
                }
            }
            const timeSeries = await instance.getMetricTimeSeries('eval1', 'latencyMs', { interval: 'hour' });
            expect(timeSeries.interval).toBe('hour');
            expect(timeSeries.dataPoints).toHaveLength(3);
        });
        it('should filter by model', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('eval1-run-1', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            await instance.collectMetric('eval1-run-2', { model: 'claude-sonnet-4-20250514', name: 'latencyMs', value: 180 });
            const timeSeries = await instance.getMetricTimeSeries('eval1', 'latencyMs', { model: 'gpt-4o' });
            expect(timeSeries.dataPoints).toHaveLength(1);
        });
    });
    describe('HTTP endpoints for metrics', () => {
        it('should handle GET /api/runs/:runId/metrics', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            const request = new Request('http://evals.do/api/runs/run-123/metrics', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
        });
        it('should handle GET /api/runs/:runId/metrics/aggregate', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-123', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            const request = new Request('http://evals.do/api/runs/run-123/metrics/aggregate', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.summary).toBeDefined();
        });
        it('should handle GET /api/models/:model/metrics', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-1', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            const request = new Request('http://evals.do/api/models/gpt-4o/metrics', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.model).toBe('gpt-4o');
        });
        it('should handle POST /api/models/compare', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('run-1', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            await instance.collectMetric('run-1', { model: 'claude-sonnet-4-20250514', name: 'latencyMs', value: 180 });
            const request = new Request('http://evals.do/api/models/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    models: ['gpt-4o', 'claude-sonnet-4-20250514'],
                    metric: 'latencyMs',
                }),
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.winner).toBeDefined();
        });
        it('should handle GET /api/evaluations/:id/timeseries/:metric', async () => {
            const instance = new EvalsDO(ctx, env);
            await instance.collectMetric('eval1-run-1', { model: 'gpt-4o', name: 'latencyMs', value: 200 });
            const request = new Request('http://evals.do/api/evaluations/eval1/timeseries/latencyMs', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.metric).toBe('latencyMs');
        });
    });
});
