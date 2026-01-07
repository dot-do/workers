/**
 * RED Tests: humans.do HITL (Human-in-the-Loop) RPC Interface
 *
 * These tests define the contract for the humans.do worker's RPC interface.
 * The HumansDO must implement the human-in-the-loop compatible interface.
 *
 * Per ARCHITECTURE.md:
 * - humans.do implements human-in-the-loop RPC
 * - Extends slim DO core
 * - Provides human oversight, approval gates, review queues, escalation
 *
 * RED PHASE: These tests MUST FAIL because HumansDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-78pl).
 *
 * @see ARCHITECTURE.md lines 983, 1338
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockState, createMockEnv, } from './helpers.js';
/**
 * Attempt to load HumansDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadHumansDO() {
    // This dynamic import will fail because src/humans.js doesn't exist yet
    const module = await import('../src/humans.js');
    return module.HumansDO;
}
describe('HumansDO RPC Interface', () => {
    let ctx;
    let env;
    let HumansDO;
    beforeEach(async () => {
        ctx = createMockState();
        env = createMockEnv();
        // This will throw in RED phase because the module doesn't exist
        HumansDO = await loadHumansDO();
    });
    describe('Task creation - createTask()', () => {
        it('should create a task with auto-generated _id', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'Approve deployment to production',
            });
            expect(created._id).toBeDefined();
            expect(created._id.length).toBeGreaterThan(0);
            expect(created.type).toBe('approval');
            expect(created.title).toBe('Approve deployment to production');
            expect(created.status).toBe('pending');
        });
        it('should set default priority to normal', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'review',
                title: 'Review PR #123',
            });
            expect(created.priority).toBe('normal');
        });
        it('should set custom priority when specified', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'decision',
                title: 'Decide on architecture',
                priority: 'urgent',
            });
            expect(created.priority).toBe('urgent');
        });
        it('should set createdAt and updatedAt timestamps', async () => {
            const instance = new HumansDO(ctx, env);
            const before = Date.now();
            const created = await instance.createTask({
                type: 'input',
                title: 'Provide API key',
            });
            const after = Date.now();
            const createdTime = new Date(created.createdAt).getTime();
            const updatedTime = new Date(created.updatedAt).getTime();
            expect(createdTime).toBeGreaterThanOrEqual(before);
            expect(createdTime).toBeLessThanOrEqual(after);
            expect(updatedTime).toBeGreaterThanOrEqual(before);
            expect(updatedTime).toBeLessThanOrEqual(after);
        });
        it('should include context when provided', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'Approve expense',
                context: { amount: 1500, currency: 'USD', department: 'Engineering' },
            });
            expect(created.context).toEqual({ amount: 1500, currency: 'USD', department: 'Engineering' });
        });
        it('should set requiredBy when specified', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'escalation',
                title: 'Customer complaint escalation',
                requiredBy: 'manager-team',
            });
            expect(created.requiredBy).toBe('manager-team');
        });
        it('should calculate expiresAt from timeoutMs', async () => {
            const instance = new HumansDO(ctx, env);
            const before = Date.now();
            const created = await instance.createTask({
                type: 'approval',
                title: 'Time-sensitive approval',
                timeoutMs: 3600000, // 1 hour
            });
            const after = Date.now();
            expect(created.expiresAt).toBeDefined();
            const expiresTime = new Date(created.expiresAt).getTime();
            expect(expiresTime).toBeGreaterThanOrEqual(before + 3600000);
            expect(expiresTime).toBeLessThanOrEqual(after + 3600000);
        });
        it('should pre-assign task when assignee is provided', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'review',
                title: 'Code review needed',
                assignee: 'alice@example.com',
            });
            expect(created.assignee).toBe('alice@example.com');
            expect(created.status).toBe('assigned');
        });
    });
    describe('Task retrieval - getTask() and listTasks()', () => {
        it('should return null for non-existent task', async () => {
            const instance = new HumansDO(ctx, env);
            const result = await instance.getTask('nonexistent');
            expect(result).toBeNull();
        });
        it('should return task by id', async () => {
            const instance = new HumansDO(ctx, env);
            const created = await instance.createTask({
                type: 'approval',
                title: 'Test task',
            });
            const retrieved = await instance.getTask(created._id);
            expect(retrieved).not.toBeNull();
            expect(retrieved._id).toBe(created._id);
            expect(retrieved.title).toBe('Test task');
        });
        it('should list all tasks', async () => {
            const instance = new HumansDO(ctx, env);
            await instance.createTask({ type: 'approval', title: 'Task 1' });
            await instance.createTask({ type: 'review', title: 'Task 2' });
            await instance.createTask({ type: 'decision', title: 'Task 3' });
            const tasks = await instance.listTasks();
            expect(tasks).toHaveLength(3);
        });
        it('should filter tasks by status', async () => {
            const instance = new HumansDO(ctx, env);
            await instance.createTask({ type: 'approval', title: 'Pending 1' });
            await instance.createTask({ type: 'approval', title: 'Pending 2' });
            const task = await instance.createTask({ type: 'approval', title: 'To assign' });
            await instance.assignTask(task._id, 'bob@example.com');
            const pending = await instance.listTasks({ status: 'pending' });
            expect(pending.every(t => t.status === 'pending')).toBe(true);
        });
        it('should filter tasks by assignee', async () => {
            const instance = new HumansDO(ctx, env);
            await instance.createTask({ type: 'approval', title: 'Task 1', assignee: 'alice@example.com' });
            await instance.createTask({ type: 'approval', title: 'Task 2', assignee: 'bob@example.com' });
            await instance.createTask({ type: 'approval', title: 'Task 3', assignee: 'alice@example.com' });
            const aliceTasks = await instance.listTasks({ assignee: 'alice@example.com' });
            expect(aliceTasks).toHaveLength(2);
            expect(aliceTasks.every(t => t.assignee === 'alice@example.com')).toBe(true);
        });
        it('should filter tasks by type', async () => {
            const instance = new HumansDO(ctx, env);
            await instance.createTask({ type: 'approval', title: 'Approval task' });
            await instance.createTask({ type: 'review', title: 'Review task' });
            await instance.createTask({ type: 'approval', title: 'Another approval' });
            const approvals = await instance.listTasks({ type: 'approval' });
            expect(approvals).toHaveLength(2);
            expect(approvals.every(t => t.type === 'approval')).toBe(true);
        });
        it('should respect limit option', async () => {
            const instance = new HumansDO(ctx, env);
            for (let i = 0; i < 10; i++) {
                await instance.createTask({ type: 'approval', title: `Task ${i}` });
            }
            const tasks = await instance.listTasks({ limit: 3 });
            expect(tasks.length).toBeLessThanOrEqual(3);
        });
        it('should respect offset option', async () => {
            const instance = new HumansDO(ctx, env);
            for (let i = 0; i < 10; i++) {
                await instance.createTask({ type: 'approval', title: `Task ${i}` });
            }
            const tasks = await instance.listTasks({ offset: 5, limit: 10 });
            expect(tasks.length).toBeLessThanOrEqual(5);
        });
    });
    describe('RPC interface', () => {
        describe('hasMethod()', () => {
            it('should return true for allowed HITL methods', async () => {
                const instance = new HumansDO(ctx, env);
                expect(instance.hasMethod('createTask')).toBe(true);
                expect(instance.hasMethod('getTask')).toBe(true);
                expect(instance.hasMethod('listTasks')).toBe(true);
                expect(instance.hasMethod('assignTask')).toBe(true);
                expect(instance.hasMethod('respondToTask')).toBe(true);
                expect(instance.hasMethod('approve')).toBe(true);
                expect(instance.hasMethod('reject')).toBe(true);
                expect(instance.hasMethod('defer')).toBe(true);
                expect(instance.hasMethod('getQueue')).toBe(true);
            });
            it('should return false for non-existent methods', async () => {
                const instance = new HumansDO(ctx, env);
                expect(instance.hasMethod('nonexistent')).toBe(false);
                expect(instance.hasMethod('dangerousOperation')).toBe(false);
            });
        });
        describe('invoke()', () => {
            it('should invoke allowed method with params', async () => {
                const instance = new HumansDO(ctx, env);
                const result = await instance.invoke('createTask', [{
                        type: 'approval',
                        title: 'Test via invoke',
                    }]);
                expect(result).toHaveProperty('_id');
                expect(result).toHaveProperty('title', 'Test via invoke');
            });
            it('should throw error for disallowed method', async () => {
                const instance = new HumansDO(ctx, env);
                await expect(instance.invoke('dangerous', [])).rejects.toThrow(/Method not allowed|not found/i);
            });
            it('should throw error for non-existent method', async () => {
                const instance = new HumansDO(ctx, env);
                await expect(instance.invoke('nonexistent', [])).rejects.toThrow(/not allowed|not found/i);
            });
        });
    });
    describe('HTTP fetch() handler', () => {
        describe('RPC endpoint', () => {
            it('should handle POST /rpc with createTask', async () => {
                const instance = new HumansDO(ctx, env);
                const request = new Request('http://humans.do/rpc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        method: 'createTask',
                        params: [{ type: 'approval', title: 'Test task' }],
                    }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const result = await response.json();
                expect(result).toHaveProperty('result');
                expect(result.result).toHaveProperty('_id');
                expect(result.result).toHaveProperty('title', 'Test task');
            });
            it('should return error for invalid method', async () => {
                const instance = new HumansDO(ctx, env);
                const request = new Request('http://humans.do/rpc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'invalid', params: [] }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(400);
                const result = await response.json();
                expect(result).toHaveProperty('error');
            });
        });
        describe('REST API endpoints', () => {
            it('should handle GET /api/tasks', async () => {
                const instance = new HumansDO(ctx, env);
                await instance.createTask({ type: 'approval', title: 'Task 1' });
                const request = new Request('http://humans.do/api/tasks', { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const tasks = await response.json();
                expect(Array.isArray(tasks)).toBe(true);
                expect(tasks.length).toBeGreaterThan(0);
            });
            it('should handle GET /api/tasks/:id', async () => {
                const instance = new HumansDO(ctx, env);
                const created = await instance.createTask({ type: 'approval', title: 'Test' });
                const request = new Request(`http://humans.do/api/tasks/${created._id}`, { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const task = await response.json();
                expect(task._id).toBe(created._id);
            });
            it('should handle POST /api/tasks', async () => {
                const instance = new HumansDO(ctx, env);
                const request = new Request('http://humans.do/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'approval', title: 'New task' }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(201);
                const task = await response.json();
                expect(task._id).toBeDefined();
                expect(task.title).toBe('New task');
            });
            it('should handle POST /api/tasks/:id/respond', async () => {
                const instance = new HumansDO(ctx, env);
                const created = await instance.createTask({ type: 'approval', title: 'Test' });
                const request = new Request(`http://humans.do/api/tasks/${created._id}/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        decision: 'approve',
                        comment: 'Looks good',
                        respondedBy: 'alice@example.com',
                    }),
                });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const task = await response.json();
                expect(task.status).toBe('completed');
                expect(task.response?.decision).toBe('approve');
            });
        });
        describe('HATEOAS discovery', () => {
            it('should return discovery info at GET /', async () => {
                const instance = new HumansDO(ctx, env);
                const request = new Request('http://humans.do/', { method: 'GET' });
                const response = await instance.fetch(request);
                expect(response.status).toBe(200);
                const data = await response.json();
                expect(data.api).toBeDefined();
                expect(data.links).toBeDefined();
                expect(data.discover).toBeDefined();
            });
            it('should include available RPC methods in discovery', async () => {
                const instance = new HumansDO(ctx, env);
                const request = new Request('http://humans.do/', { method: 'GET' });
                const response = await instance.fetch(request);
                const data = await response.json();
                const methodNames = data.discover.methods.map(m => m.name);
                expect(methodNames).toContain('createTask');
                expect(methodNames).toContain('getTask');
                expect(methodNames).toContain('approve');
                expect(methodNames).toContain('reject');
            });
        });
    });
});
