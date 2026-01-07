/**
 * RED Tests: workflows.do Workflow State Management
 *
 * These tests define the contract for the workflows.do worker's state management.
 * The WorkflowsDO must properly manage workflow definitions and execution state.
 *
 * Per ARCHITECTURE.md:
 * - workflow.do implements ai-workflows RPC
 * - Event-driven workflows with $.on.* and $.every.* patterns
 * - Scheduling and context management
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
 */
async function loadWorkflowsDO() {
    const module = await import('../src/workflows.js');
    return module.WorkflowsDO;
}
describe('WorkflowsDO State Management', () => {
    let ctx;
    let env;
    let WorkflowsDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        WorkflowsDO = await loadWorkflowsDO();
    });
    describe('Workflow State Persistence', () => {
        describe('saveWorkflowState()', () => {
            it('should persist workflow state to storage', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const state = {
                    definition: {
                        id: 'test-workflow',
                        name: 'Test',
                        steps: [{ id: 's1', action: 'test' }],
                    },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    version: 1,
                };
                await instance.saveWorkflowState(state);
                const retrieved = await instance.getWorkflowState('test-workflow');
                expect(retrieved).not.toBeNull();
                expect(retrieved.definition.id).toBe('test-workflow');
            });
            it('should increment version on update', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const state = {
                    definition: {
                        id: 'versioned',
                        steps: [{ id: 's1', action: 'test' }],
                    },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    version: 1,
                };
                await instance.saveWorkflowState(state);
                state.version = 2;
                state.updatedAt = Date.now();
                await instance.saveWorkflowState(state);
                const retrieved = await instance.getWorkflowState('versioned');
                expect(retrieved.version).toBe(2);
            });
            it('should update timestamps correctly', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const createdAt = Date.now() - 10000;
                const state = {
                    definition: {
                        id: 'timestamped',
                        steps: [{ id: 's1', action: 'test' }],
                    },
                    createdAt,
                    updatedAt: createdAt,
                    version: 1,
                };
                await instance.saveWorkflowState(state);
                const retrieved = await instance.getWorkflowState('timestamped');
                expect(retrieved.createdAt).toBe(createdAt);
            });
        });
        describe('getWorkflowState()', () => {
            it('should return null for non-existent workflow', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.getWorkflowState('nonexistent');
                expect(result).toBeNull();
            });
            it('should return complete workflow state', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const state = {
                    definition: {
                        id: 'complete-state',
                        name: 'Complete State Test',
                        description: 'A test workflow',
                        steps: [
                            { id: 's1', action: 'step1', params: { key: 'value' } },
                            { id: 's2', action: 'step2', dependsOn: ['s1'], onError: 'retry', maxRetries: 3 },
                        ],
                        timeout: 60000,
                        context: { env: 'test' },
                    },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    version: 1,
                };
                await instance.saveWorkflowState(state);
                const retrieved = await instance.getWorkflowState('complete-state');
                expect(retrieved.definition.name).toBe('Complete State Test');
                expect(retrieved.definition.description).toBe('A test workflow');
                expect(retrieved.definition.steps).toHaveLength(2);
                expect(retrieved.definition.timeout).toBe(60000);
                expect(retrieved.definition.context).toEqual({ env: 'test' });
            });
        });
        describe('deleteWorkflowState()', () => {
            it('should return false for non-existent workflow', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.deleteWorkflowState('nonexistent');
                expect(result).toBe(false);
            });
            it('should delete workflow state', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const state = {
                    definition: { id: 'deletable', steps: [{ id: 's1', action: 'test' }] },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    version: 1,
                };
                await instance.saveWorkflowState(state);
                const deleted = await instance.deleteWorkflowState('deletable');
                expect(deleted).toBe(true);
                const afterDelete = await instance.getWorkflowState('deletable');
                expect(afterDelete).toBeNull();
            });
        });
    });
    describe('Execution State Persistence', () => {
        describe('saveExecutionState()', () => {
            it('should persist execution state to storage', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const state = {
                    executionId: 'exec-1',
                    workflowId: 'workflow-1',
                    status: 'running',
                    startedAt: Date.now(),
                    currentStepIndex: 0,
                    completedSteps: [],
                    stepResults: {},
                };
                await instance.saveExecutionState(state);
                const retrieved = await instance.getExecutionState('exec-1');
                expect(retrieved).not.toBeNull();
                expect(retrieved.executionId).toBe('exec-1');
            });
            it('should persist step results', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const state = {
                    executionId: 'exec-with-steps',
                    workflowId: 'workflow-1',
                    status: 'running',
                    startedAt: Date.now(),
                    currentStepIndex: 1,
                    completedSteps: ['s1'],
                    stepResults: {
                        s1: {
                            status: 'completed',
                            output: { result: 'success' },
                            startedAt: Date.now() - 1000,
                            completedAt: Date.now(),
                        },
                    },
                };
                await instance.saveExecutionState(state);
                const retrieved = await instance.getExecutionState('exec-with-steps');
                expect(retrieved.stepResults.s1.status).toBe('completed');
                expect(retrieved.stepResults.s1.output).toEqual({ result: 'success' });
            });
            it('should persist resume point for paused workflows', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const state = {
                    executionId: 'paused-exec',
                    workflowId: 'workflow-1',
                    status: 'paused',
                    startedAt: Date.now(),
                    currentStepIndex: 2,
                    completedSteps: ['s1', 's2'],
                    stepResults: {},
                    resumePoint: {
                        stepId: 's3',
                        stepIndex: 2,
                        retryCount: 1,
                    },
                };
                await instance.saveExecutionState(state);
                const retrieved = await instance.getExecutionState('paused-exec');
                expect(retrieved.resumePoint).toEqual({
                    stepId: 's3',
                    stepIndex: 2,
                    retryCount: 1,
                });
            });
            it('should persist error state for failed workflows', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const state = {
                    executionId: 'failed-exec',
                    workflowId: 'workflow-1',
                    status: 'failed',
                    startedAt: Date.now() - 5000,
                    completedAt: Date.now(),
                    currentStepIndex: 1,
                    completedSteps: ['s1'],
                    stepResults: {
                        s1: { status: 'completed', output: 'ok' },
                        s2: { status: 'failed', error: 'Connection timeout' },
                    },
                    error: 'Step s2 failed: Connection timeout',
                };
                await instance.saveExecutionState(state);
                const retrieved = await instance.getExecutionState('failed-exec');
                expect(retrieved.status).toBe('failed');
                expect(retrieved.error).toContain('Connection timeout');
            });
        });
        describe('getExecutionState()', () => {
            it('should return null for non-existent execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.getExecutionState('nonexistent');
                expect(result).toBeNull();
            });
        });
        describe('findExecutionsByStatus()', () => {
            it('should find executions by status', async () => {
                const instance = new WorkflowsDO(ctx, env);
                // Create multiple executions with different statuses
                await instance.saveExecutionState({
                    executionId: 'exec-running-1',
                    workflowId: 'wf-1',
                    status: 'running',
                    startedAt: Date.now(),
                    currentStepIndex: 0,
                    completedSteps: [],
                    stepResults: {},
                });
                await instance.saveExecutionState({
                    executionId: 'exec-completed',
                    workflowId: 'wf-1',
                    status: 'completed',
                    startedAt: Date.now() - 5000,
                    completedAt: Date.now(),
                    currentStepIndex: 2,
                    completedSteps: ['s1', 's2'],
                    stepResults: {},
                });
                await instance.saveExecutionState({
                    executionId: 'exec-running-2',
                    workflowId: 'wf-2',
                    status: 'running',
                    startedAt: Date.now(),
                    currentStepIndex: 0,
                    completedSteps: [],
                    stepResults: {},
                });
                const running = await instance.findExecutionsByStatus('running');
                expect(running.length).toBeGreaterThanOrEqual(2);
                expect(running.every((e) => e.status === 'running')).toBe(true);
            });
            it('should return empty array when no executions match', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.findExecutionsByStatus('cancelled');
                expect(result).toEqual([]);
            });
        });
        describe('findExecutionsByWorkflow()', () => {
            it('should find executions by workflow id', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.saveExecutionState({
                    executionId: 'exec-wf1-a',
                    workflowId: 'target-workflow',
                    status: 'completed',
                    startedAt: Date.now(),
                    currentStepIndex: 0,
                    completedSteps: [],
                    stepResults: {},
                });
                await instance.saveExecutionState({
                    executionId: 'exec-wf2',
                    workflowId: 'other-workflow',
                    status: 'completed',
                    startedAt: Date.now(),
                    currentStepIndex: 0,
                    completedSteps: [],
                    stepResults: {},
                });
                await instance.saveExecutionState({
                    executionId: 'exec-wf1-b',
                    workflowId: 'target-workflow',
                    status: 'running',
                    startedAt: Date.now(),
                    currentStepIndex: 0,
                    completedSteps: [],
                    stepResults: {},
                });
                const result = await instance.findExecutionsByWorkflow('target-workflow');
                expect(result.length).toBeGreaterThanOrEqual(2);
                expect(result.every((e) => e.workflowId === 'target-workflow')).toBe(true);
            });
        });
        describe('deleteExecutionState()', () => {
            it('should return false for non-existent execution', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.deleteExecutionState('nonexistent');
                expect(result).toBe(false);
            });
            it('should delete execution state', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.saveExecutionState({
                    executionId: 'deletable-exec',
                    workflowId: 'wf-1',
                    status: 'completed',
                    startedAt: Date.now(),
                    currentStepIndex: 0,
                    completedSteps: [],
                    stepResults: {},
                });
                const deleted = await instance.deleteExecutionState('deletable-exec');
                expect(deleted).toBe(true);
                const afterDelete = await instance.getExecutionState('deletable-exec');
                expect(afterDelete).toBeNull();
            });
        });
        describe('pruneOldExecutions()', () => {
            it('should delete executions older than threshold', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const now = Date.now();
                const oneHourAgo = now - 60 * 60 * 1000;
                const twoHoursAgo = now - 2 * 60 * 60 * 1000;
                await instance.saveExecutionState({
                    executionId: 'old-exec',
                    workflowId: 'wf-1',
                    status: 'completed',
                    startedAt: twoHoursAgo,
                    completedAt: twoHoursAgo + 1000,
                    currentStepIndex: 0,
                    completedSteps: [],
                    stepResults: {},
                });
                await instance.saveExecutionState({
                    executionId: 'recent-exec',
                    workflowId: 'wf-1',
                    status: 'completed',
                    startedAt: now - 30 * 60 * 1000, // 30 minutes ago
                    completedAt: now - 30 * 60 * 1000 + 1000,
                    currentStepIndex: 0,
                    completedSteps: [],
                    stepResults: {},
                });
                // Prune executions older than 1 hour
                const pruned = await instance.pruneOldExecutions(60 * 60 * 1000);
                expect(pruned).toBeGreaterThanOrEqual(1);
                const oldExec = await instance.getExecutionState('old-exec');
                expect(oldExec).toBeNull();
                const recentExec = await instance.getExecutionState('recent-exec');
                expect(recentExec).not.toBeNull();
            });
            it('should not prune running executions', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
                await instance.saveExecutionState({
                    executionId: 'old-running',
                    workflowId: 'wf-1',
                    status: 'running',
                    startedAt: twoHoursAgo,
                    currentStepIndex: 0,
                    completedSteps: [],
                    stepResults: {},
                });
                await instance.pruneOldExecutions(60 * 60 * 1000);
                const stillRunning = await instance.getExecutionState('old-running');
                expect(stillRunning).not.toBeNull();
            });
            it('should return 0 when no executions to prune', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const pruned = await instance.pruneOldExecutions(60 * 60 * 1000);
                expect(pruned).toBe(0);
            });
        });
    });
    describe('State Consistency', () => {
        it('should maintain referential integrity between workflow and executions', async () => {
            const instance = new WorkflowsDO(ctx, env);
            // Create workflow state
            await instance.saveWorkflowState({
                definition: { id: 'integrity-test', steps: [{ id: 's1', action: 'test' }] },
                createdAt: Date.now(),
                updatedAt: Date.now(),
                version: 1,
            });
            // Create execution for this workflow
            await instance.saveExecutionState({
                executionId: 'exec-integrity',
                workflowId: 'integrity-test',
                status: 'completed',
                startedAt: Date.now(),
                currentStepIndex: 0,
                completedSteps: [],
                stepResults: {},
            });
            // Deleting workflow should not delete executions (for audit trail)
            await instance.deleteWorkflowState('integrity-test');
            const executions = await instance.findExecutionsByWorkflow('integrity-test');
            expect(executions.length).toBeGreaterThanOrEqual(1);
        });
        it('should handle concurrent state updates', async () => {
            const instance = new WorkflowsDO(ctx, env);
            // Create initial state
            await instance.saveExecutionState({
                executionId: 'concurrent-exec',
                workflowId: 'wf-1',
                status: 'running',
                startedAt: Date.now(),
                currentStepIndex: 0,
                completedSteps: [],
                stepResults: {},
            });
            // Simulate concurrent updates
            const updates = Array.from({ length: 5 }, (_, i) => instance.saveExecutionState({
                executionId: 'concurrent-exec',
                workflowId: 'wf-1',
                status: 'running',
                startedAt: Date.now(),
                currentStepIndex: i,
                completedSteps: Array.from({ length: i }, (_, j) => `s${j + 1}`),
                stepResults: {},
            }));
            await Promise.all(updates);
            // State should be consistent (last write wins)
            const final = await instance.getExecutionState('concurrent-exec');
            expect(final).not.toBeNull();
            expect(final.currentStepIndex).toBeDefined();
        });
    });
});
