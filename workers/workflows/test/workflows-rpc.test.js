/**
 * RED Tests: workflows.do ai-workflows RPC Interface
 *
 * These tests define the contract for the workflows.do worker's RPC interface.
 * The WorkflowsDO must implement the ai-workflows compatible interface.
 *
 * Per ARCHITECTURE.md:
 * - workflows.do implements ai-workflows RPC
 * - Extends slim DO core
 * - Provides workflow orchestration via RPC
 * - Supports @callable() decorated methods
 *
 * RED PHASE: These tests MUST FAIL because WorkflowsDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-hsjs).
 *
 * @see ARCHITECTURE.md lines 980, 1335
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv } from './helpers.js';
/**
 * Attempt to load WorkflowsDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadWorkflowsDO() {
    // This dynamic import will fail because src/workflows.js doesn't exist yet
    const module = await import('../src/workflows.js');
    return module.WorkflowsDO;
}
describe('WorkflowsDO RPC Interface', () => {
    let ctx;
    let env;
    let WorkflowsDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        // This will throw in RED phase because the module doesn't exist
        WorkflowsDO = await loadWorkflowsDO();
    });
    describe('Workflow Definition CRUD', () => {
        describe('createWorkflow()', () => {
            it('should create a new workflow definition', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const definition = {
                    id: 'test-workflow',
                    name: 'Test Workflow',
                    steps: [
                        { id: 'step1', action: 'greet', params: { name: 'World' } },
                    ],
                };
                const created = await instance.createWorkflow(definition);
                expect(created.id).toBe('test-workflow');
                expect(created.name).toBe('Test Workflow');
                expect(created.steps).toHaveLength(1);
            });
            it('should auto-generate id if not provided', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const definition = {
                    id: '',
                    name: 'Auto ID Workflow',
                    steps: [{ id: 'step1', action: 'test' }],
                };
                const created = await instance.createWorkflow(definition);
                expect(created.id).toBeDefined();
                expect(created.id.length).toBeGreaterThan(0);
            });
            it('should reject workflow with no steps', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const definition = {
                    id: 'empty-workflow',
                    name: 'Empty',
                    steps: [],
                };
                await expect(instance.createWorkflow(definition)).rejects.toThrow(/steps.*required|empty/i);
            });
            it('should validate step dependencies exist', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const definition = {
                    id: 'invalid-deps',
                    steps: [
                        { id: 'step1', action: 'test', dependsOn: ['nonexistent'] },
                    ],
                };
                await expect(instance.createWorkflow(definition)).rejects.toThrow(/dependency|not found/i);
            });
        });
        describe('getWorkflow()', () => {
            it('should return null for non-existent workflow', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.getWorkflow('nonexistent');
                expect(result).toBeNull();
            });
            it('should return workflow by id', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'my-workflow',
                    name: 'My Workflow',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const result = await instance.getWorkflow('my-workflow');
                expect(result).not.toBeNull();
                expect(result.id).toBe('my-workflow');
                expect(result.name).toBe('My Workflow');
            });
        });
        describe('updateWorkflow()', () => {
            it('should return null for non-existent workflow', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.updateWorkflow('nonexistent', { name: 'Updated' });
                expect(result).toBeNull();
            });
            it('should update workflow properties', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'updatable',
                    name: 'Original',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const updated = await instance.updateWorkflow('updatable', { name: 'Updated Name' });
                expect(updated).not.toBeNull();
                expect(updated.name).toBe('Updated Name');
                expect(updated.id).toBe('updatable');
            });
            it('should merge updates with existing definition', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'merge-test',
                    name: 'Original',
                    description: 'A workflow',
                    timeout: 5000,
                    steps: [{ id: 's1', action: 'test' }],
                });
                const updated = await instance.updateWorkflow('merge-test', { timeout: 10000 });
                expect(updated.name).toBe('Original');
                expect(updated.description).toBe('A workflow');
                expect(updated.timeout).toBe(10000);
            });
        });
        describe('deleteWorkflow()', () => {
            it('should return false for non-existent workflow', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.deleteWorkflow('nonexistent');
                expect(result).toBe(false);
            });
            it('should delete existing workflow and return true', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'deletable',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const result = await instance.deleteWorkflow('deletable');
                expect(result).toBe(true);
            });
            it('should remove workflow from storage', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'to-delete',
                    steps: [{ id: 's1', action: 'test' }],
                });
                await instance.deleteWorkflow('to-delete');
                const afterDelete = await instance.getWorkflow('to-delete');
                expect(afterDelete).toBeNull();
            });
        });
        describe('listWorkflows()', () => {
            it('should return empty array when no workflows exist', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.listWorkflows();
                expect(result).toEqual([]);
            });
            it('should list all workflows', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({ id: 'wf1', steps: [{ id: 's1', action: 'test' }] });
                await instance.createWorkflow({ id: 'wf2', steps: [{ id: 's1', action: 'test' }] });
                const result = await instance.listWorkflows();
                expect(result).toHaveLength(2);
            });
            it('should respect limit option', async () => {
                const instance = new WorkflowsDO(ctx, env);
                for (let i = 0; i < 10; i++) {
                    await instance.createWorkflow({ id: `wf-${i}`, steps: [{ id: 's1', action: 'test' }] });
                }
                const result = await instance.listWorkflows({ limit: 5 });
                expect(result.length).toBeLessThanOrEqual(5);
            });
        });
    });
    describe('Workflow Execution', () => {
        describe('startWorkflow()', () => {
            it('should start a workflow execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'runnable',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const execution = await instance.startWorkflow('runnable');
                expect(execution.executionId).toBeDefined();
                expect(execution.workflowId).toBe('runnable');
                expect(execution.status).toMatch(/pending|running/);
                expect(execution.startedAt).toBeDefined();
            });
            it('should throw for non-existent workflow', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await expect(instance.startWorkflow('nonexistent')).rejects.toThrow(/not found/i);
            });
            it('should accept input parameters', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'with-input',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const execution = await instance.startWorkflow('with-input', { name: 'Alice', count: 5 });
                expect(execution.input).toEqual({ name: 'Alice', count: 5 });
            });
            it('should generate unique execution IDs', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'multi-exec',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const exec1 = await instance.startWorkflow('multi-exec');
                const exec2 = await instance.startWorkflow('multi-exec');
                expect(exec1.executionId).not.toBe(exec2.executionId);
            });
        });
        describe('getExecution()', () => {
            it('should return null for non-existent execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.getExecution('nonexistent');
                expect(result).toBeNull();
            });
            it('should return execution by id', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'get-exec-test',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const started = await instance.startWorkflow('get-exec-test');
                const result = await instance.getExecution(started.executionId);
                expect(result).not.toBeNull();
                expect(result.executionId).toBe(started.executionId);
            });
        });
        describe('listExecutions()', () => {
            it('should return empty array when no executions exist', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.listExecutions();
                expect(result).toEqual([]);
            });
            it('should list all executions', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'list-exec-test',
                    steps: [{ id: 's1', action: 'test' }],
                });
                await instance.startWorkflow('list-exec-test');
                await instance.startWorkflow('list-exec-test');
                const result = await instance.listExecutions();
                expect(result.length).toBeGreaterThanOrEqual(2);
            });
            it('should filter by workflow id', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({ id: 'wf-a', steps: [{ id: 's1', action: 'test' }] });
                await instance.createWorkflow({ id: 'wf-b', steps: [{ id: 's1', action: 'test' }] });
                await instance.startWorkflow('wf-a');
                await instance.startWorkflow('wf-b');
                await instance.startWorkflow('wf-a');
                const result = await instance.listExecutions('wf-a');
                expect(result.every((e) => e.workflowId === 'wf-a')).toBe(true);
            });
            it('should filter by status', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'status-filter',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const exec = await instance.startWorkflow('status-filter');
                await instance.cancelExecution(exec.executionId);
                const cancelled = await instance.listExecutions(undefined, { status: 'cancelled' });
                expect(cancelled.every((e) => e.status === 'cancelled')).toBe(true);
            });
        });
        describe('cancelExecution()', () => {
            it('should return false for non-existent execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.cancelExecution('nonexistent');
                expect(result).toBe(false);
            });
            it('should cancel running execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'cancellable',
                    steps: [{ id: 's1', action: 'long-running' }],
                });
                const exec = await instance.startWorkflow('cancellable');
                const result = await instance.cancelExecution(exec.executionId);
                expect(result).toBe(true);
                const updated = await instance.getExecution(exec.executionId);
                expect(updated.status).toBe('cancelled');
            });
        });
        describe('pauseExecution()', () => {
            it('should return false for non-existent execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.pauseExecution('nonexistent');
                expect(result).toBe(false);
            });
            it('should pause running execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'pausable',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const exec = await instance.startWorkflow('pausable');
                const result = await instance.pauseExecution(exec.executionId);
                expect(result).toBe(true);
                const updated = await instance.getExecution(exec.executionId);
                expect(updated.status).toBe('paused');
            });
        });
        describe('resumeExecution()', () => {
            it('should return false for non-existent execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.resumeExecution('nonexistent');
                expect(result).toBe(false);
            });
            it('should resume paused execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'resumable',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const exec = await instance.startWorkflow('resumable');
                await instance.pauseExecution(exec.executionId);
                const result = await instance.resumeExecution(exec.executionId);
                expect(result).toBe(true);
                const updated = await instance.getExecution(exec.executionId);
                expect(updated.status).toMatch(/pending|running/);
            });
        });
        describe('retryExecution()', () => {
            it('should throw for non-existent execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await expect(instance.retryExecution('nonexistent')).rejects.toThrow(/not found/i);
            });
            it('should create new execution for failed workflow', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'retryable',
                    steps: [{ id: 's1', action: 'failing-action' }],
                });
                const original = await instance.startWorkflow('retryable');
                // Wait for it to fail (or mock the failure)
                const retried = await instance.retryExecution(original.executionId);
                expect(retried.executionId).not.toBe(original.executionId);
                expect(retried.workflowId).toBe('retryable');
            });
        });
    });
    describe('Step Management', () => {
        describe('getStepResult()', () => {
            it('should return null for non-existent execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.getStepResult('nonexistent', 'step1');
                expect(result).toBeNull();
            });
            it('should return null for non-existent step', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'step-result-test',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const exec = await instance.startWorkflow('step-result-test');
                const result = await instance.getStepResult(exec.executionId, 'nonexistent');
                expect(result).toBeNull();
            });
            it('should return step result when available', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'with-steps',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const exec = await instance.startWorkflow('with-steps');
                // After execution completes
                const result = await instance.getStepResult(exec.executionId, 's1');
                if (result) {
                    expect(result.stepId).toBe('s1');
                    expect(result.status).toBeDefined();
                }
            });
        });
    });
    describe('RPC interface', () => {
        describe('hasMethod()', () => {
            it('should return true for allowed workflow methods', async () => {
                const instance = new WorkflowsDO(ctx, env);
                expect(instance.hasMethod('createWorkflow')).toBe(true);
                expect(instance.hasMethod('getWorkflow')).toBe(true);
                expect(instance.hasMethod('startWorkflow')).toBe(true);
                expect(instance.hasMethod('cancelExecution')).toBe(true);
            });
            it('should return false for non-existent methods', async () => {
                const instance = new WorkflowsDO(ctx, env);
                expect(instance.hasMethod('nonexistent')).toBe(false);
                expect(instance.hasMethod('eval')).toBe(false);
            });
        });
        describe('invoke()', () => {
            it('should invoke allowed method with params', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'invoke-test',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const result = await instance.invoke('getWorkflow', ['invoke-test']);
                expect(result).toHaveProperty('id', 'invoke-test');
            });
            it('should throw error for disallowed method', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await expect(instance.invoke('dangerous', [])).rejects.toThrow(/Method not allowed|not found/i);
            });
        });
    });
    describe('HTTP fetch() handler', () => {
        describe('RPC endpoint', () => {
            it('should handle POST /rpc with method call', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({
                    id: 'http-test',
                    steps: [{ id: 's1', action: 'test' }],
                });
                const request = new Request('http://workflows.do/rpc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'getWorkflow', params: ['http-test'] }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const result = (await response.json());
                expect(result).toHaveProperty('result');
                expect(result.result).toHaveProperty('id', 'http-test');
            });
            it('should return error for invalid method', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const request = new Request('http://workflows.do/rpc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'invalid', params: [] }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(400);
                const result = (await response.json());
                expect(result).toHaveProperty('error');
            });
        });
        describe('REST API endpoint', () => {
            it('should handle GET /api/workflows', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({ id: 'rest-test', steps: [{ id: 's1', action: 'test' }] });
                const request = new Request('http://workflows.do/api/workflows', { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = (await response.json());
                expect(Array.isArray(data)).toBe(true);
            });
            it('should handle GET /api/workflows/:id', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({ id: 'get-rest', steps: [{ id: 's1', action: 'test' }] });
                const request = new Request('http://workflows.do/api/workflows/get-rest', { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = (await response.json());
                expect(data.id).toBe('get-rest');
            });
            it('should handle POST /api/workflows', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const request = new Request('http://workflows.do/api/workflows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: 'new-workflow',
                        name: 'New Workflow',
                        steps: [{ id: 's1', action: 'test' }],
                    }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(201);
                const data = (await response.json());
                expect(data.id).toBe('new-workflow');
            });
            it('should handle POST /api/workflows/:id/start', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({ id: 'startable', steps: [{ id: 's1', action: 'test' }] });
                const request = new Request('http://workflows.do/api/workflows/startable/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ input: { key: 'value' } }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = (await response.json());
                expect(data.workflowId).toBe('startable');
                expect(data.executionId).toBeDefined();
            });
            it('should handle GET /api/executions', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({ id: 'exec-list', steps: [{ id: 's1', action: 'test' }] });
                await instance.startWorkflow('exec-list');
                const request = new Request('http://workflows.do/api/executions', { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = (await response.json());
                expect(Array.isArray(data)).toBe(true);
            });
            it('should handle DELETE /api/workflows/:id', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.createWorkflow({ id: 'deletable', steps: [{ id: 's1', action: 'test' }] });
                const request = new Request('http://workflows.do/api/workflows/deletable', { method: 'DELETE' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const getResponse = await instance.fetch(new Request('http://workflows.do/api/workflows/deletable', { method: 'GET' }));
                expect(getResponse.status).toBe(404);
            });
        });
        describe('HATEOAS discovery', () => {
            it('should return discovery info at GET /', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const request = new Request('http://workflows.do/', { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = (await response.json());
                expect(data.api).toBeDefined();
                expect(data.links).toBeDefined();
                expect(data.discover).toBeDefined();
            });
            it('should include available RPC methods in discovery', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const request = new Request('http://workflows.do/', { method: 'GET' });
                const response = await instance.fetch(request);
                const data = (await response.json());
                const methodNames = data.discover.methods.map((m) => m.name);
                expect(methodNames).toContain('createWorkflow');
                expect(methodNames).toContain('startWorkflow');
                expect(methodNames).toContain('getExecution');
            });
        });
    });
});
