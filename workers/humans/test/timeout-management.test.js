/**
 * RED Tests: humans.do Timeout Management
 *
 * These tests define the contract for timeout handling in HITL tasks.
 * The HumansDO must support task expiration, alarms, and timeout callbacks.
 *
 * Per ARCHITECTURE.md:
 * - hitl.do provides human oversight with timeout management
 * - Tasks can expire if not responded to in time
 *
 * RED PHASE: These tests MUST FAIL because HumansDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-78pl).
 *
 * @see ARCHITECTURE.md line 1338
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockState, createMockEnv, } from './helpers.js';
/**
 * Attempt to load HumansDO - this will fail in RED phase
 */
async function loadHumansDO() {
    const module = await import('../src/humans.js');
    return module.HumansDO;
}
describe('HumansDO Timeout Management', () => {
    let ctx;
    let env;
    let HumansDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        HumansDO = await loadHumansDO();
    });
    describe('Task creation with timeout', () => {
        it('should create task with expiresAt when timeoutMs provided', async () => {
            const instance = new HumansDO(ctx, env);
            const before = Date.now();
            const created = await instance.createTask({
                type: 'approval',
                title: 'Time-sensitive task',
                timeoutMs: 3600000, // 1 hour
            });
            const after = Date.now();
            expect(created.expiresAt).toBeDefined();
            const expiresTime = new Date(created.expiresAt).getTime();
            expect(expiresTime).toBeGreaterThanOrEqual(before + 3600000);
            expect(expiresTime).toBeLessThanOrEqual(after + 3600000);
        });
        it('should set storage alarm when timeout is specified', async () => {
            const instance = new HumansDO(ctx, env);
            await instance.createTask({
                type: 'approval',
                title: 'Time-sensitive task',
                timeoutMs: 3600000,
            });
            const alarmTime = await ctx.storage.getAlarm();
            expect(alarmTime).not.toBeNull();
        });
        it('should not set expiresAt when no timeout', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'No timeout task',
            });
            expect(created.expiresAt).toBeUndefined();
        });
        it('should store timeoutMs in task', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'Task with timeout',
                timeoutMs: 1800000, // 30 minutes
            });
            expect(created.timeoutMs).toBe(1800000);
        });
    });
    describe('setTaskTimeout()', () => {
        it('should return null for non-existent task', async () => {
            const instance = new HumansDO(ctx, env);
            const result = await instance.setTaskTimeout('nonexistent', 3600000);
            expect(result).toBeNull();
        });
        it('should add timeout to task without one', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'No timeout initially',
            });
            expect(created.expiresAt).toBeUndefined();
            const before = Date.now();
            const updated = await instance.setTaskTimeout(created._id, 1800000);
            const after = Date.now();
            expect(updated).not.toBeNull();
            expect(updated.expiresAt).toBeDefined();
            const expiresTime = new Date(updated.expiresAt).getTime();
            expect(expiresTime).toBeGreaterThanOrEqual(before + 1800000);
            expect(expiresTime).toBeLessThanOrEqual(after + 1800000);
        });
        it('should replace existing timeout', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'Has timeout',
                timeoutMs: 3600000, // 1 hour
            });
            const originalExpires = new Date(created.expiresAt).getTime();
            const before = Date.now();
            const updated = await instance.setTaskTimeout(created._id, 7200000); // 2 hours
            const after = Date.now();
            const newExpires = new Date(updated.expiresAt).getTime();
            expect(newExpires).toBeGreaterThan(originalExpires);
            expect(newExpires).toBeGreaterThanOrEqual(before + 7200000);
            expect(newExpires).toBeLessThanOrEqual(after + 7200000);
        });
    });
    describe('clearTaskTimeout()', () => {
        it('should return null for non-existent task', async () => {
            const instance = new HumansDO(ctx, env);
            const result = await instance.clearTaskTimeout('nonexistent');
            expect(result).toBeNull();
        });
        it('should remove expiresAt from task', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'Has timeout',
                timeoutMs: 3600000,
            });
            expect(created.expiresAt).toBeDefined();
            const cleared = await instance.clearTaskTimeout(created._id);
            expect(cleared).not.toBeNull();
            expect(cleared.expiresAt).toBeUndefined();
            expect(cleared.timeoutMs).toBeUndefined();
        });
        it('should work on task without timeout (no-op)', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'No timeout',
            });
            const result = await instance.clearTaskTimeout(created._id);
            expect(result).not.toBeNull();
            expect(result.expiresAt).toBeUndefined();
        });
    });
    describe('extendTimeout()', () => {
        it('should return null for non-existent task', async () => {
            const instance = new HumansDO(ctx, env);
            const result = await instance.extendTimeout('nonexistent', 3600000);
            expect(result).toBeNull();
        });
        it('should extend existing timeout', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'Has timeout',
                timeoutMs: 3600000, // 1 hour
            });
            const originalExpires = new Date(created.expiresAt).getTime();
            const extended = await instance.extendTimeout(created._id, 1800000); // Add 30 minutes
            const newExpires = new Date(extended.expiresAt).getTime();
            expect(newExpires).toBeGreaterThanOrEqual(originalExpires + 1800000 - 100); // Allow 100ms tolerance
            expect(newExpires).toBeLessThanOrEqual(originalExpires + 1800000 + 100);
        });
        it('should throw error for task without timeout', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'No timeout',
            });
            await expect(instance.extendTimeout(created._id, 1800000)).rejects.toThrow(/no timeout|not set/i);
        });
    });
    describe('Expiration queries', () => {
        describe('getExpiredTasks()', () => {
            it('should return empty array when no tasks expired', async () => {
                const instance = new HumansDO(ctx, env);
                await instance.createTask({
                    type: 'approval',
                    title: 'Future timeout',
                    timeoutMs: 3600000,
                });
                const expired = await instance.getExpiredTasks();
                expect(expired).toEqual([]);
            });
            it('should return tasks that have expired', async () => {
                const instance = new HumansDO(ctx, env);
                // Create a task with a past expiration (for testing)
                const created = await instance.createTask({
                    type: 'approval',
                    title: 'Expired task',
                    timeoutMs: 1, // 1ms timeout - will expire immediately
                });
                // Wait for expiration
                await new Promise(resolve => setTimeout(resolve, 10));
                const expired = await instance.getExpiredTasks();
                expect(expired.length).toBeGreaterThanOrEqual(1);
                expect(expired.some(t => t._id === created._id)).toBe(true);
            });
            it('should not include completed tasks', async () => {
                const instance = new HumansDO(ctx, env);
                const expired = await instance.getExpiredTasks();
                expect(expired.every(t => t.status !== 'completed')).toBe(true);
            });
        });
        describe('getExpiringTasks()', () => {
            it('should return tasks expiring within threshold', async () => {
                const instance = new HumansDO(ctx, env);
                await instance.createTask({
                    type: 'approval',
                    title: 'Expiring soon',
                    timeoutMs: 60000, // 1 minute
                });
                await instance.createTask({
                    type: 'approval',
                    title: 'Not expiring soon',
                    timeoutMs: 3600000, // 1 hour
                });
                const expiringSoon = await instance.getExpiringTasks(120000); // Within 2 minutes
                expect(expiringSoon.length).toBe(1);
                expect(expiringSoon[0].title).toBe('Expiring soon');
            });
            it('should return empty array when no tasks expiring soon', async () => {
                const instance = new HumansDO(ctx, env);
                await instance.createTask({
                    type: 'approval',
                    title: 'Far future',
                    timeoutMs: 86400000, // 24 hours
                });
                const expiringSoon = await instance.getExpiringTasks(60000); // Within 1 minute
                expect(expiringSoon).toEqual([]);
            });
            it('should not include tasks without timeout', async () => {
                const instance = new HumansDO(ctx, env);
                await instance.createTask({
                    type: 'approval',
                    title: 'No timeout',
                });
                const expiringSoon = await instance.getExpiringTasks(3600000);
                expect(expiringSoon).toEqual([]);
            });
        });
    });
    describe('Alarm handling', () => {
        it('should mark expired tasks as expired on alarm', async () => {
            const instance = new HumansDO(ctx, env);
            // Create task with very short timeout
            const created = await instance.createTask({
                type: 'approval',
                title: 'Will expire',
                timeoutMs: 1,
            });
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 10));
            // Trigger alarm
            await instance.alarm();
            // Check task status
            const task = await instance.getTask(created._id);
            expect(task.status).toBe('expired');
        });
        it('should reschedule alarm for next expiring task', async () => {
            const instance = new HumansDO(ctx, env);
            await instance.createTask({
                type: 'approval',
                title: 'Expires first',
                timeoutMs: 1,
            });
            await instance.createTask({
                type: 'approval',
                title: 'Expires later',
                timeoutMs: 3600000,
            });
            // Wait and trigger alarm
            await new Promise(resolve => setTimeout(resolve, 10));
            await instance.alarm();
            // Check that alarm is rescheduled
            const nextAlarm = await ctx.storage.getAlarm();
            expect(nextAlarm).not.toBeNull();
        });
        it('should not reschedule alarm when no more timed tasks', async () => {
            const instance = new HumansDO(ctx, env);
            await instance.createTask({
                type: 'approval',
                title: 'No timeout',
            });
            // Initially no alarm should be set
            const alarm = await ctx.storage.getAlarm();
            expect(alarm).toBeNull();
        });
    });
    describe('Timeout callbacks', () => {
        it('should call onTimeout callback when task expires', async () => {
            const instance = new HumansDO(ctx, env);
            const onTimeoutSpy = vi.fn();
            instance.onTimeout(onTimeoutSpy);
            await instance.createTask({
                type: 'approval',
                title: 'Will timeout',
                timeoutMs: 1,
            });
            await new Promise(resolve => setTimeout(resolve, 10));
            await instance.alarm();
            expect(onTimeoutSpy).toHaveBeenCalled();
        });
        it('should call onExpiringSoon callback when task near expiration', async () => {
            const instance = new HumansDO(ctx, env);
            const onExpiringSoonSpy = vi.fn();
            // Set threshold to 5 minutes
            instance.onExpiringSoon(300000, onExpiringSoonSpy);
            await instance.createTask({
                type: 'approval',
                title: 'Expiring in 3 minutes',
                timeoutMs: 180000, // 3 minutes
            });
            // Check for expiring soon tasks
            await instance.alarm();
            expect(onExpiringSoonSpy).toHaveBeenCalled();
        });
    });
    describe('HTTP endpoints for timeout', () => {
        it('should handle POST /api/tasks/:id/timeout', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({ type: 'approval', title: 'Test' });
            const request = new Request(`http://humans.do/api/tasks/${created._id}/timeout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timeoutMs: 3600000 }),
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const task = await response.json();
            expect(task.expiresAt).toBeDefined();
        });
        it('should handle DELETE /api/tasks/:id/timeout', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'Test',
                timeoutMs: 3600000,
            });
            const request = new Request(`http://humans.do/api/tasks/${created._id}/timeout`, {
                method: 'DELETE',
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const task = await response.json();
            expect(task.expiresAt).toBeUndefined();
        });
        it('should handle PUT /api/tasks/:id/timeout/extend', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'Test',
                timeoutMs: 3600000,
            });
            const originalExpires = created.expiresAt;
            const request = new Request(`http://humans.do/api/tasks/${created._id}/timeout/extend`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ additionalMs: 1800000 }),
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const task = await response.json();
            expect(new Date(task.expiresAt).getTime()).toBeGreaterThan(new Date(originalExpires).getTime());
        });
        it('should handle GET /api/tasks/expired', async () => {
            const instance = new HumansDO(ctx, env);
            const request = new Request('http://humans.do/api/tasks/expired', { method: 'GET' });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const tasks = await response.json();
            expect(Array.isArray(tasks)).toBe(true);
        });
        it('should handle GET /api/tasks/expiring?withinMs=3600000', async () => {
            const instance = new HumansDO(ctx, env);
            await instance.createTask({
                type: 'approval',
                title: 'Expiring soon',
                timeoutMs: 1800000,
            });
            const request = new Request('http://humans.do/api/tasks/expiring?withinMs=3600000', {
                method: 'GET',
            });
            const response = await instance.fetch(request);
            expect(response.status).toBe(200);
            const tasks = await response.json();
            expect(Array.isArray(tasks)).toBe(true);
        });
    });
});
