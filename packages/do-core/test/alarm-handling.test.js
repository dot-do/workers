/**
 * RED Phase TDD: Alarm Handling Contract Tests
 *
 * These tests define the contract for DO alarm scheduling and handling.
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * The alarm handling contract includes:
 * - Setting alarms for future execution
 * - Getting current alarm time
 * - Deleting/canceling alarms
 * - Alarm handler execution
 * - Rescheduling patterns
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DOCore } from '../src/index.js';
import { createMockState } from './helpers.js';
describe('Alarm Handling Contract', () => {
    let ctx;
    let storage;
    beforeEach(() => {
        ctx = createMockState();
        storage = ctx.storage;
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    describe('Alarm Scheduling', () => {
        it('should set an alarm with timestamp', async () => {
            const futureTime = Date.now() + 60000; // 1 minute from now
            await storage.setAlarm(futureTime);
            expect(storage.setAlarm).toHaveBeenCalledWith(futureTime);
        });
        it('should set an alarm with Date object', async () => {
            const futureDate = new Date(Date.now() + 60000);
            await storage.setAlarm(futureDate);
            expect(storage.setAlarm).toHaveBeenCalledWith(futureDate);
        });
        it('should get the currently scheduled alarm', async () => {
            const futureTime = Date.now() + 60000;
            await storage.setAlarm(futureTime);
            const alarm = await storage.getAlarm();
            expect(alarm).toBe(futureTime);
        });
        it('should return null when no alarm is scheduled', async () => {
            const alarm = await storage.getAlarm();
            expect(alarm).toBeNull();
        });
        it('should delete a scheduled alarm', async () => {
            await storage.setAlarm(Date.now() + 60000);
            await storage.deleteAlarm();
            const alarm = await storage.getAlarm();
            expect(alarm).toBeNull();
        });
        it('should replace existing alarm when setting new one', async () => {
            const time1 = Date.now() + 60000;
            const time2 = Date.now() + 120000;
            await storage.setAlarm(time1);
            await storage.setAlarm(time2);
            const alarm = await storage.getAlarm();
            expect(alarm).toBe(time2);
        });
    });
    describe('Alarm Handler', () => {
        it('should have alarm() method', () => {
            const instance = new DOCore(ctx, {});
            expect(typeof instance.alarm).toBe('function');
        });
        it('should throw not implemented error in base DOCore', async () => {
            const instance = new DOCore(ctx, {});
            await expect(instance.alarm()).rejects.toThrow('not implemented');
        });
        it('should allow subclass to override alarm handler', async () => {
            class AlarmDO extends DOCore {
                alarmCalled = false;
                async alarm() {
                    this.alarmCalled = true;
                }
            }
            const instance = new AlarmDO(ctx, {});
            await instance.alarm();
            expect(instance.alarmCalled).toBe(true);
        });
        it('should allow alarm handler to access storage', async () => {
            class AlarmDO extends DOCore {
                async alarm() {
                    const count = await this.ctx.storage.get('alarm-count') ?? 0;
                    await this.ctx.storage.put('alarm-count', count + 1);
                }
            }
            const instance = new AlarmDO(ctx, {});
            await instance.alarm();
            expect(storage.put).toHaveBeenCalledWith('alarm-count', 1);
        });
        it('should allow alarm handler to reschedule itself', async () => {
            class RecurringAlarmDO extends DOCore {
                async alarm() {
                    // Process the alarm
                    const processed = await this.ctx.storage.get('processed') ?? 0;
                    await this.ctx.storage.put('processed', processed + 1);
                    // Reschedule for next execution
                    const nextRun = Date.now() + 60000; // 1 minute later
                    await this.ctx.storage.setAlarm(nextRun);
                }
            }
            const instance = new RecurringAlarmDO(ctx, {});
            await instance.alarm();
            expect(storage.put).toHaveBeenCalledWith('processed', 1);
            expect(storage.setAlarm).toHaveBeenCalled();
        });
    });
    describe('Alarm Patterns', () => {
        it('should support delayed task execution pattern', async () => {
            class TaskQueueDO extends DOCore {
                async scheduleTask(task, delayMs) {
                    const scheduledFor = Date.now() + delayMs;
                    const fullTask = { ...task, scheduledFor };
                    await this.ctx.storage.put(`task:${task.id}`, fullTask);
                    // Set alarm if this is the earliest task
                    const currentAlarm = await this.ctx.storage.getAlarm();
                    if (!currentAlarm || scheduledFor < currentAlarm) {
                        await this.ctx.storage.setAlarm(scheduledFor);
                    }
                }
                async alarm() {
                    const now = Date.now();
                    const tasks = await this.ctx.storage.list({ prefix: 'task:' });
                    for (const [key, task] of tasks) {
                        if (task.scheduledFor <= now) {
                            // Execute task
                            await this.processTask(task);
                            await this.ctx.storage.delete(key);
                        }
                    }
                    // Reschedule for next task if any remain
                    await this.scheduleNextAlarm();
                }
                async processTask(_task) {
                    // Task execution logic
                }
                async scheduleNextAlarm() {
                    const tasks = await this.ctx.storage.list({ prefix: 'task:' });
                    let earliest = null;
                    for (const task of tasks.values()) {
                        if (!earliest || task.scheduledFor < earliest) {
                            earliest = task.scheduledFor;
                        }
                    }
                    if (earliest) {
                        await this.ctx.storage.setAlarm(earliest);
                    }
                }
            }
            const instance = new TaskQueueDO(ctx, {});
            await instance.scheduleTask({ id: '1', type: 'email', data: {} }, 5000);
            expect(storage.put).toHaveBeenCalled();
            expect(storage.setAlarm).toHaveBeenCalled();
        });
        it('should support periodic execution pattern', async () => {
            class PeriodicDO extends DOCore {
                intervalMs = 60000; // 1 minute
                async start() {
                    await this.ctx.storage.put('running', true);
                    await this.ctx.storage.setAlarm(Date.now() + this.intervalMs);
                }
                async stop() {
                    await this.ctx.storage.put('running', false);
                    await this.ctx.storage.deleteAlarm();
                }
                async alarm() {
                    const running = await this.ctx.storage.get('running');
                    if (!running)
                        return;
                    // Perform periodic work
                    const iteration = await this.ctx.storage.get('iteration') ?? 0;
                    await this.ctx.storage.put('iteration', iteration + 1);
                    // Schedule next execution
                    await this.ctx.storage.setAlarm(Date.now() + this.intervalMs);
                }
            }
            const instance = new PeriodicDO(ctx, {});
            await instance.start();
            expect(storage.setAlarm).toHaveBeenCalled();
            await instance.alarm();
            expect(storage.put).toHaveBeenCalledWith('iteration', 1);
            expect(storage.setAlarm).toHaveBeenCalledTimes(2); // start + alarm reschedule
        });
        it('should support exponential backoff pattern', async () => {
            class BackoffDO extends DOCore {
                baseDelay = 1000;
                maxDelay = 60000;
                maxAttempts = 5;
                async scheduleWithBackoff() {
                    const attempt = await this.ctx.storage.get('attempt') ?? 0;
                    const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
                    await this.ctx.storage.put('attempt', attempt + 1);
                    await this.ctx.storage.setAlarm(Date.now() + delay);
                }
                async alarm() {
                    const attempt = await this.ctx.storage.get('attempt') ?? 0;
                    try {
                        // Try the operation
                        const success = await this.tryOperation();
                        if (success) {
                            await this.ctx.storage.delete('attempt');
                            return;
                        }
                    }
                    catch {
                        // Operation failed
                    }
                    if (attempt < this.maxAttempts) {
                        await this.scheduleWithBackoff();
                    }
                    else {
                        // Max attempts reached - log failure
                        await this.ctx.storage.put('failed', true);
                    }
                }
                async tryOperation() {
                    // Simulated operation
                    return false;
                }
            }
            const instance = new BackoffDO(ctx, {});
            // First attempt
            await instance.scheduleWithBackoff();
            expect(storage.setAlarm).toHaveBeenCalled();
            // Simulate multiple retries
            await instance.alarm();
            await instance.alarm();
            // Verify attempt counter increased
            expect(storage.put).toHaveBeenCalled();
        });
    });
    describe('Alarm Error Handling', () => {
        it('should handle errors in alarm handler gracefully', async () => {
            class ErrorAlarmDO extends DOCore {
                async alarm() {
                    throw new Error('Alarm processing failed');
                }
            }
            const instance = new ErrorAlarmDO(ctx, {});
            await expect(instance.alarm()).rejects.toThrow('Alarm processing failed');
        });
        it('should allow cleanup after alarm error', async () => {
            class CleanupAlarmDO extends DOCore {
                cleanupCalled = false;
                async alarm() {
                    try {
                        throw new Error('Processing failed');
                    }
                    finally {
                        this.cleanupCalled = true;
                    }
                }
            }
            const instance = new CleanupAlarmDO(ctx, {});
            await expect(instance.alarm()).rejects.toThrow();
            expect(instance.cleanupCalled).toBe(true);
        });
    });
    describe('Alarm with HTTP Integration', () => {
        it('should schedule alarm via HTTP request', async () => {
            class SchedulerDO extends DOCore {
                async fetch(request) {
                    const url = new URL(request.url);
                    if (url.pathname === '/schedule') {
                        const delay = Number(url.searchParams.get('delay') ?? 60000);
                        await this.ctx.storage.setAlarm(Date.now() + delay);
                        return Response.json({ scheduled: true, delay });
                    }
                    if (url.pathname === '/cancel') {
                        await this.ctx.storage.deleteAlarm();
                        return Response.json({ cancelled: true });
                    }
                    if (url.pathname === '/status') {
                        const alarm = await this.ctx.storage.getAlarm();
                        return Response.json({ scheduled: alarm !== null, time: alarm });
                    }
                    return new Response('Not Found', { status: 404 });
                }
                async alarm() {
                    await this.ctx.storage.put('last-alarm', Date.now());
                }
            }
            const instance = new SchedulerDO(ctx, {});
            // Schedule an alarm
            const scheduleResponse = await instance.fetch(new Request('https://example.com/schedule?delay=30000'));
            const scheduleData = await scheduleResponse.json();
            expect(scheduleData.scheduled).toBe(true);
            // Check status
            const statusResponse = await instance.fetch(new Request('https://example.com/status'));
            const statusData = await statusResponse.json();
            expect(statusData.scheduled).toBe(true);
            // Cancel alarm
            const cancelResponse = await instance.fetch(new Request('https://example.com/cancel'));
            const cancelData = await cancelResponse.json();
            expect(cancelData.cancelled).toBe(true);
        });
    });
});
