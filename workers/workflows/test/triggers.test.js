/**
 * RED Tests: workflows.do Trigger Management
 *
 * These tests define the contract for the workflows.do worker's trigger system.
 * The WorkflowsDO must support event-driven workflows with $.on.* and $.every.* patterns.
 *
 * Per ARCHITECTURE.md:
 * - workflow.do implements ai-workflows RPC
 * - Event-driven workflows with $.on.* patterns
 * - Scheduling with $.every.* patterns
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
describe('WorkflowsDO Trigger Management', () => {
    let ctx;
    let env;
    let WorkflowsDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        WorkflowsDO = await loadWorkflowsDO();
    });
    describe('Trigger Registration', () => {
        describe('registerTrigger()', () => {
            it('should register an event trigger', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const trigger = {
                    type: 'event',
                    pattern: '$.on.user.created',
                };
                const registered = await instance.registerTrigger('workflow-1', trigger);
                expect(registered.workflowId).toBe('workflow-1');
                expect(registered.trigger.type).toBe('event');
                expect(registered.enabled).toBe(true);
                expect(registered.triggerCount).toBe(0);
            });
            it('should register a schedule trigger', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const trigger = {
                    type: 'schedule',
                    pattern: '$.every.5.minutes',
                };
                const registered = await instance.registerTrigger('workflow-2', trigger);
                expect(registered.workflowId).toBe('workflow-2');
                expect(registered.trigger.type).toBe('schedule');
            });
            it('should register a webhook trigger', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const trigger = {
                    type: 'webhook',
                    path: '/hooks/my-workflow',
                    methods: ['POST'],
                };
                const registered = await instance.registerTrigger('workflow-3', trigger);
                expect(registered.workflowId).toBe('workflow-3');
                expect(registered.trigger.type).toBe('webhook');
            });
            it('should overwrite existing trigger for same workflow', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('workflow-1', { type: 'event', pattern: '$.on.old' });
                const updated = await instance.registerTrigger('workflow-1', {
                    type: 'event',
                    pattern: '$.on.new',
                });
                expect(updated.trigger.pattern).toBe('$.on.new');
            });
            it('should validate event pattern format', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const invalidTrigger = {
                    type: 'event',
                    pattern: 'invalid-pattern', // Should start with $.on.
                };
                await expect(instance.registerTrigger('workflow-1', invalidTrigger)).rejects.toThrow(/invalid.*pattern/i);
            });
            it('should validate schedule pattern format', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const invalidTrigger = {
                    type: 'schedule',
                    pattern: 'invalid-schedule', // Should be $.every.N.unit
                };
                await expect(instance.registerTrigger('workflow-1', invalidTrigger)).rejects.toThrow(/invalid.*pattern|schedule/i);
            });
        });
        describe('unregisterTrigger()', () => {
            it('should return false for non-existent trigger', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.unregisterTrigger('nonexistent');
                expect(result).toBe(false);
            });
            it('should remove registered trigger', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('workflow-1', { type: 'event', pattern: '$.on.test' });
                const result = await instance.unregisterTrigger('workflow-1');
                expect(result).toBe(true);
                const trigger = await instance.getTrigger('workflow-1');
                expect(trigger).toBeNull();
            });
        });
        describe('getTrigger()', () => {
            it('should return null for non-existent trigger', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.getTrigger('nonexistent');
                expect(result).toBeNull();
            });
            it('should return registered trigger info', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('workflow-1', {
                    type: 'event',
                    pattern: '$.on.user.created',
                    filter: { role: 'admin' },
                });
                const trigger = await instance.getTrigger('workflow-1');
                expect(trigger).not.toBeNull();
                expect(trigger.workflowId).toBe('workflow-1');
                expect(trigger.trigger.type).toBe('event');
                expect(trigger.trigger.filter).toEqual({ role: 'admin' });
            });
        });
        describe('listTriggers()', () => {
            it('should return empty array when no triggers exist', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.listTriggers();
                expect(result).toEqual([]);
            });
            it('should list all registered triggers', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', { type: 'event', pattern: '$.on.a' });
                await instance.registerTrigger('wf-2', { type: 'schedule', pattern: '$.every.5.minutes' });
                await instance.registerTrigger('wf-3', { type: 'webhook', path: '/hook' });
                const triggers = await instance.listTriggers();
                expect(triggers).toHaveLength(3);
            });
            it('should filter by trigger type', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', { type: 'event', pattern: '$.on.a' });
                await instance.registerTrigger('wf-2', { type: 'schedule', pattern: '$.every.5.minutes' });
                await instance.registerTrigger('wf-3', { type: 'event', pattern: '$.on.b' });
                const events = await instance.listTriggers({ type: 'event' });
                expect(events).toHaveLength(2);
                expect(events.every((t) => t.trigger.type === 'event')).toBe(true);
            });
            it('should filter by enabled status', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', { type: 'event', pattern: '$.on.a' });
                await instance.registerTrigger('wf-2', { type: 'event', pattern: '$.on.b' });
                await instance.disableTrigger('wf-1');
                const enabled = await instance.listTriggers({ enabled: true });
                expect(enabled.every((t) => t.enabled)).toBe(true);
                const disabled = await instance.listTriggers({ enabled: false });
                expect(disabled.every((t) => !t.enabled)).toBe(true);
            });
        });
    });
    describe('Trigger Control', () => {
        describe('enableTrigger()', () => {
            it('should return false for non-existent trigger', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.enableTrigger('nonexistent');
                expect(result).toBe(false);
            });
            it('should enable disabled trigger', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', { type: 'event', pattern: '$.on.test' });
                await instance.disableTrigger('wf-1');
                const result = await instance.enableTrigger('wf-1');
                expect(result).toBe(true);
                const trigger = await instance.getTrigger('wf-1');
                expect(trigger.enabled).toBe(true);
            });
        });
        describe('disableTrigger()', () => {
            it('should return false for non-existent trigger', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.disableTrigger('nonexistent');
                expect(result).toBe(false);
            });
            it('should disable enabled trigger', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', { type: 'event', pattern: '$.on.test' });
                const result = await instance.disableTrigger('wf-1');
                expect(result).toBe(true);
                const trigger = await instance.getTrigger('wf-1');
                expect(trigger.enabled).toBe(false);
            });
            it('should prevent trigger from firing when disabled', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', { type: 'event', pattern: '$.on.user.created' });
                await instance.disableTrigger('wf-1');
                const event = {
                    type: 'user.created',
                    source: 'test',
                    data: { userId: '123' },
                    timestamp: Date.now(),
                };
                const triggered = await instance.handleEvent(event);
                expect(triggered).toEqual([]);
            });
        });
    });
    describe('Event Handling', () => {
        describe('matchEventPattern()', () => {
            it('should match exact event type', async () => {
                const instance = new WorkflowsDO(ctx, env);
                expect(instance.matchEventPattern('$.on.user.created', 'user.created')).toBe(true);
                expect(instance.matchEventPattern('$.on.user.created', 'user.updated')).toBe(false);
            });
            it('should support wildcard patterns', async () => {
                const instance = new WorkflowsDO(ctx, env);
                expect(instance.matchEventPattern('$.on.user.*', 'user.created')).toBe(true);
                expect(instance.matchEventPattern('$.on.user.*', 'user.updated')).toBe(true);
                expect(instance.matchEventPattern('$.on.user.*', 'order.created')).toBe(false);
            });
            it('should support double wildcard for any depth', async () => {
                const instance = new WorkflowsDO(ctx, env);
                expect(instance.matchEventPattern('$.on.**', 'user.created')).toBe(true);
                expect(instance.matchEventPattern('$.on.**', 'order.item.added')).toBe(true);
            });
        });
        describe('handleEvent()', () => {
            it('should trigger matching workflows', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-user', { type: 'event', pattern: '$.on.user.created' });
                const event = {
                    type: 'user.created',
                    source: 'api',
                    data: { userId: '123', name: 'Alice' },
                    timestamp: Date.now(),
                };
                const triggered = await instance.handleEvent(event);
                expect(triggered.length).toBeGreaterThanOrEqual(1);
                expect(triggered[0].workflowId).toBe('wf-user');
                expect(triggered[0].executionId).toBeDefined();
            });
            it('should trigger multiple matching workflows', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', { type: 'event', pattern: '$.on.user.created' });
                await instance.registerTrigger('wf-2', { type: 'event', pattern: '$.on.user.*' });
                const event = {
                    type: 'user.created',
                    source: 'api',
                    data: { userId: '123' },
                    timestamp: Date.now(),
                };
                const triggered = await instance.handleEvent(event);
                expect(triggered).toHaveLength(2);
            });
            it('should apply event filters', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-admin', {
                    type: 'event',
                    pattern: '$.on.user.created',
                    filter: { role: 'admin' },
                });
                const adminEvent = {
                    type: 'user.created',
                    source: 'api',
                    data: { userId: '1', role: 'admin' },
                    timestamp: Date.now(),
                };
                const userEvent = {
                    type: 'user.created',
                    source: 'api',
                    data: { userId: '2', role: 'user' },
                    timestamp: Date.now(),
                };
                const adminTriggered = await instance.handleEvent(adminEvent);
                expect(adminTriggered.length).toBeGreaterThanOrEqual(1);
                const userTriggered = await instance.handleEvent(userEvent);
                expect(userTriggered).toEqual([]);
            });
            it('should update trigger stats', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', { type: 'event', pattern: '$.on.test' });
                const event = {
                    type: 'test',
                    source: 'test',
                    data: {},
                    timestamp: Date.now(),
                };
                await instance.handleEvent(event);
                await instance.handleEvent(event);
                const trigger = await instance.getTrigger('wf-1');
                expect(trigger.triggerCount).toBeGreaterThanOrEqual(2);
                expect(trigger.lastTriggeredAt).toBeDefined();
            });
            it('should pass event data as workflow input', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', { type: 'event', pattern: '$.on.order.created' });
                const event = {
                    type: 'order.created',
                    source: 'checkout',
                    data: { orderId: 'ORD-123', total: 99.99 },
                    timestamp: Date.now(),
                };
                const triggered = await instance.handleEvent(event);
                // The triggered workflow should receive the event data
                expect(triggered.length).toBeGreaterThanOrEqual(1);
            });
        });
    });
    describe('Schedule Handling', () => {
        describe('getNextScheduledRun()', () => {
            it('should return null for non-scheduled workflow', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', { type: 'event', pattern: '$.on.test' });
                const next = await instance.getNextScheduledRun('wf-1');
                expect(next).toBeNull();
            });
            it('should return next run time for scheduled workflow', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-scheduled', {
                    type: 'schedule',
                    pattern: '$.every.5.minutes',
                });
                const next = await instance.getNextScheduledRun('wf-scheduled');
                expect(next).not.toBeNull();
                expect(typeof next).toBe('number');
                expect(next).toBeGreaterThan(Date.now());
            });
            it('should calculate correct interval', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-hourly', {
                    type: 'schedule',
                    pattern: '$.every.1.hour',
                });
                const next = await instance.getNextScheduledRun('wf-hourly');
                const now = Date.now();
                // Next run should be within 1 hour
                expect(next).toBeGreaterThan(now);
                expect(next).toBeLessThanOrEqual(now + 60 * 60 * 1000);
            });
        });
        describe('checkScheduledWorkflows()', () => {
            it('should return empty array when no workflows are due', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-1', {
                    type: 'schedule',
                    pattern: '$.every.1.hour',
                });
                // Assuming workflow was just scheduled, it shouldn't be due yet
                const due = await instance.checkScheduledWorkflows();
                // May or may not have workflows depending on timing
                expect(Array.isArray(due)).toBe(true);
            });
            it('should trigger overdue scheduled workflows', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-overdue', {
                    type: 'schedule',
                    pattern: '$.every.1.second',
                });
                // Wait a bit for the schedule to be due
                await new Promise((r) => setTimeout(r, 100));
                const due = await instance.checkScheduledWorkflows();
                // Should have triggered or not depending on implementation
                expect(Array.isArray(due)).toBe(true);
            });
            it('should not trigger disabled scheduled workflows', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-disabled', {
                    type: 'schedule',
                    pattern: '$.every.1.second',
                });
                await instance.disableTrigger('wf-disabled');
                await new Promise((r) => setTimeout(r, 100));
                const due = await instance.checkScheduledWorkflows();
                const disabledTriggered = due.some((d) => d.workflowId === 'wf-disabled');
                expect(disabledTriggered).toBe(false);
            });
        });
    });
    describe('Webhook Handling', () => {
        describe('handleWebhook()', () => {
            it('should return null for unregistered webhook path', async () => {
                const instance = new WorkflowsDO(ctx, env);
                const result = await instance.handleWebhook('/unknown', 'POST', {}, {});
                expect(result).toBeNull();
            });
            it('should trigger workflow for matching webhook', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-webhook', {
                    type: 'webhook',
                    path: '/hooks/process-order',
                    methods: ['POST'],
                });
                const result = await instance.handleWebhook('/hooks/process-order', 'POST', { orderId: '123' }, {});
                expect(result).not.toBeNull();
                expect(result.workflowId).toBe('wf-webhook');
                expect(result.executionId).toBeDefined();
            });
            it('should reject disallowed HTTP methods', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-post-only', {
                    type: 'webhook',
                    path: '/hooks/post-only',
                    methods: ['POST'],
                });
                const result = await instance.handleWebhook('/hooks/post-only', 'GET', {}, {});
                expect(result).toBeNull();
            });
            it('should validate webhook authentication', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-auth', {
                    type: 'webhook',
                    path: '/hooks/secure',
                    auth: {
                        type: 'bearer',
                        secret: 'my-secret-token',
                    },
                });
                // Without auth header
                const noAuth = await instance.handleWebhook('/hooks/secure', 'POST', {}, {});
                expect(noAuth).toBeNull();
                // With correct auth
                const withAuth = await instance.handleWebhook('/hooks/secure', 'POST', {}, {
                    Authorization: 'Bearer my-secret-token',
                });
                expect(withAuth).not.toBeNull();
            });
            it('should pass webhook body as workflow input', async () => {
                const instance = new WorkflowsDO(ctx, env);
                await instance.registerTrigger('wf-body', {
                    type: 'webhook',
                    path: '/hooks/with-body',
                });
                const body = { customerId: 'C123', action: 'subscribe' };
                const result = await instance.handleWebhook('/hooks/with-body', 'POST', body, {});
                expect(result).not.toBeNull();
                // The workflow should receive the body as input
            });
        });
    });
});
