/**
 * RED Tests: humans.do Response Handling
 *
 * These tests define the contract for how humans respond to HITL tasks.
 * The HumansDO must support approval, rejection, deferral, and custom responses.
 *
 * Per ARCHITECTURE.md:
 * - hitl.do provides human oversight, approval gates, review queues
 * - Response handling for approval workflows
 *
 * RED PHASE: These tests MUST FAIL because HumansDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-78pl).
 *
 * @see ARCHITECTURE.md line 1338
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockHumansEnv,
  type HITLTask,
  type HITLResponse,
  type TaskPriority,
} from './helpers.js'

/**
 * Interface for response handling operations
 */
interface HumansDOResponseContract {
  // Task creation
  createTask(task: CreateTaskInput): Promise<HITLTask>

  // Task retrieval
  getTask(taskId: string): Promise<HITLTask | null>

  // Assignment
  assignTask(taskId: string, assignee: string): Promise<HITLTask | null>

  // Response handling
  respondToTask(taskId: string, response: HITLResponse): Promise<HITLTask | null>

  // Convenience methods
  approve(taskId: string, comment?: string, respondedBy?: string): Promise<HITLTask | null>
  reject(taskId: string, reason: string, respondedBy?: string): Promise<HITLTask | null>
  defer(taskId: string, reason?: string, respondedBy?: string): Promise<HITLTask | null>

  // Input responses
  submitInput(taskId: string, value: unknown, respondedBy: string): Promise<HITLTask | null>

  // Decision responses
  decide(taskId: string, decision: string, rationale: string, respondedBy: string): Promise<HITLTask | null>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

interface CreateTaskInput {
  type: 'approval' | 'review' | 'decision' | 'input' | 'escalation'
  title: string
  description?: string
  context?: Record<string, unknown>
  requiredBy?: string
  assignee?: string
  priority?: TaskPriority
  timeoutMs?: number
  metadata?: Record<string, unknown>
}

/**
 * Attempt to load HumansDO - this will fail in RED phase
 */
async function loadHumansDO(): Promise<new (ctx: MockDOState, env: MockHumansEnv) => HumansDOResponseContract> {
  const module = await import('../src/humans.js')
  return module.HumansDO
}

describe('HumansDO Response Handling', () => {
  let ctx: MockDOState
  let env: MockHumansEnv
  let HumansDO: new (ctx: MockDOState, env: MockHumansEnv) => HumansDOResponseContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    HumansDO = await loadHumansDO()
  })

  describe('respondToTask()', () => {
    it('should return null for non-existent task', async () => {
      const instance = new HumansDO(ctx, env)
      const result = await instance.respondToTask('nonexistent', {
        decision: 'approve',
        respondedBy: 'alice@example.com',
        respondedAt: new Date().toISOString(),
      })
      expect(result).toBeNull()
    })

    it('should update task with response', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })
      const now = new Date().toISOString()

      const responded = await instance.respondToTask(created._id, {
        decision: 'approve',
        comment: 'Looks good to me',
        respondedBy: 'alice@example.com',
        respondedAt: now,
      })

      expect(responded).not.toBeNull()
      expect(responded!.response).toBeDefined()
      expect(responded!.response!.decision).toBe('approve')
      expect(responded!.response!.comment).toBe('Looks good to me')
      expect(responded!.response!.respondedBy).toBe('alice@example.com')
    })

    it('should set status to completed on approval', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const responded = await instance.respondToTask(created._id, {
        decision: 'approve',
        respondedBy: 'alice@example.com',
        respondedAt: new Date().toISOString(),
      })

      expect(responded!.status).toBe('completed')
    })

    it('should set status to rejected on rejection', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const responded = await instance.respondToTask(created._id, {
        decision: 'reject',
        comment: 'Not approved',
        respondedBy: 'alice@example.com',
        respondedAt: new Date().toISOString(),
      })

      expect(responded!.status).toBe('rejected')
    })

    it('should keep status pending on defer', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const responded = await instance.respondToTask(created._id, {
        decision: 'defer',
        comment: 'Need more information',
        respondedBy: 'alice@example.com',
        respondedAt: new Date().toISOString(),
      })

      expect(responded!.status).toBe('pending')
    })

    it('should throw error if task already completed', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      // First response
      await instance.respondToTask(created._id, {
        decision: 'approve',
        respondedBy: 'alice@example.com',
        respondedAt: new Date().toISOString(),
      })

      // Second response should fail
      await expect(
        instance.respondToTask(created._id, {
          decision: 'reject',
          respondedBy: 'bob@example.com',
          respondedAt: new Date().toISOString(),
        })
      ).rejects.toThrow(/already completed|cannot respond/i)
    })

    it('should store custom value in response', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'input', title: 'Provide configuration' })

      const responded = await instance.respondToTask(created._id, {
        value: { apiKey: 'secret123', region: 'us-east-1' },
        respondedBy: 'alice@example.com',
        respondedAt: new Date().toISOString(),
      })

      expect(responded!.response!.value).toEqual({ apiKey: 'secret123', region: 'us-east-1' })
      expect(responded!.status).toBe('completed')
    })
  })

  describe('approve() shortcut', () => {
    it('should return null for non-existent task', async () => {
      const instance = new HumansDO(ctx, env)
      const result = await instance.approve('nonexistent')
      expect(result).toBeNull()
    })

    it('should approve task with default responder', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({
        type: 'approval',
        title: 'Test',
        assignee: 'alice@example.com',
      })

      const approved = await instance.approve(created._id)
      expect(approved).not.toBeNull()
      expect(approved!.status).toBe('completed')
      expect(approved!.response!.decision).toBe('approve')
    })

    it('should approve task with comment', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const approved = await instance.approve(created._id, 'LGTM!')
      expect(approved!.response!.comment).toBe('LGTM!')
    })

    it('should approve task with specified responder', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const approved = await instance.approve(created._id, 'Approved', 'manager@example.com')
      expect(approved!.response!.respondedBy).toBe('manager@example.com')
    })

    it('should set respondedAt timestamp', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const before = Date.now()
      const approved = await instance.approve(created._id)
      const after = Date.now()

      const respondedTime = new Date(approved!.response!.respondedAt).getTime()
      expect(respondedTime).toBeGreaterThanOrEqual(before)
      expect(respondedTime).toBeLessThanOrEqual(after)
    })
  })

  describe('reject() shortcut', () => {
    it('should return null for non-existent task', async () => {
      const instance = new HumansDO(ctx, env)
      const result = await instance.reject('nonexistent', 'Not applicable')
      expect(result).toBeNull()
    })

    it('should reject task with reason', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const rejected = await instance.reject(created._id, 'Does not meet requirements')
      expect(rejected).not.toBeNull()
      expect(rejected!.status).toBe('rejected')
      expect(rejected!.response!.decision).toBe('reject')
      expect(rejected!.response!.comment).toBe('Does not meet requirements')
    })

    it('should require a reason for rejection', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      // Empty reason should still work but be stored
      const rejected = await instance.reject(created._id, '')
      expect(rejected!.response!.comment).toBe('')
    })

    it('should set specified responder', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const rejected = await instance.reject(created._id, 'Rejected', 'reviewer@example.com')
      expect(rejected!.response!.respondedBy).toBe('reviewer@example.com')
    })
  })

  describe('defer() shortcut', () => {
    it('should return null for non-existent task', async () => {
      const instance = new HumansDO(ctx, env)
      const result = await instance.defer('nonexistent')
      expect(result).toBeNull()
    })

    it('should defer task without reason', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const deferred = await instance.defer(created._id)
      expect(deferred).not.toBeNull()
      expect(deferred!.status).toBe('pending')
      expect(deferred!.response!.decision).toBe('defer')
    })

    it('should defer task with reason', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const deferred = await instance.defer(created._id, 'Waiting for additional context')
      expect(deferred!.response!.comment).toBe('Waiting for additional context')
    })

    it('should unassign task when deferred', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({
        type: 'approval',
        title: 'Test',
        assignee: 'alice@example.com',
      })

      const deferred = await instance.defer(created._id, 'Need more info')
      expect(deferred!.assignee).toBeUndefined()
    })
  })

  describe('submitInput()', () => {
    it('should return null for non-existent task', async () => {
      const instance = new HumansDO(ctx, env)
      const result = await instance.submitInput('nonexistent', 'test value', 'alice@example.com')
      expect(result).toBeNull()
    })

    it('should store simple value input', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'input', title: 'Enter API key' })

      const submitted = await instance.submitInput(created._id, 'api-key-12345', 'alice@example.com')
      expect(submitted).not.toBeNull()
      expect(submitted!.response!.value).toBe('api-key-12345')
      expect(submitted!.status).toBe('completed')
    })

    it('should store complex object input', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'input', title: 'Provide configuration' })

      const config = {
        database: { host: 'localhost', port: 5432 },
        cache: { enabled: true, ttl: 3600 },
      }
      const submitted = await instance.submitInput(created._id, config, 'alice@example.com')
      expect(submitted!.response!.value).toEqual(config)
    })

    it('should store array input', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'input', title: 'Select options' })

      const options = ['option1', 'option2', 'option3']
      const submitted = await instance.submitInput(created._id, options, 'alice@example.com')
      expect(submitted!.response!.value).toEqual(options)
    })
  })

  describe('decide()', () => {
    it('should return null for non-existent task', async () => {
      const instance = new HumansDO(ctx, env)
      const result = await instance.decide('nonexistent', 'option-a', 'Best option', 'alice@example.com')
      expect(result).toBeNull()
    })

    it('should store decision with rationale', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({
        type: 'decision',
        title: 'Choose deployment strategy',
        context: { options: ['blue-green', 'canary', 'rolling'] },
      })

      const decided = await instance.decide(
        created._id,
        'canary',
        'Lower risk for this release',
        'architect@example.com'
      )

      expect(decided).not.toBeNull()
      expect(decided!.response!.value).toBe('canary')
      expect(decided!.response!.comment).toBe('Lower risk for this release')
      expect(decided!.status).toBe('completed')
    })
  })

  describe('HTTP endpoints for responses', () => {
    it('should handle POST /api/tasks/:id/approve', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const request = new Request(`http://humans.do/api/tasks/${created._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'Approved!', respondedBy: 'alice@example.com' }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
      const task = await response.json() as HITLTask
      expect(task.status).toBe('completed')
      expect(task.response?.decision).toBe('approve')
    })

    it('should handle POST /api/tasks/:id/reject', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const request = new Request(`http://humans.do/api/tasks/${created._id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Not approved', respondedBy: 'alice@example.com' }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
      const task = await response.json() as HITLTask
      expect(task.status).toBe('rejected')
      expect(task.response?.decision).toBe('reject')
    })

    it('should handle POST /api/tasks/:id/defer', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      const request = new Request(`http://humans.do/api/tasks/${created._id}/defer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Need more info' }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
      const task = await response.json() as HITLTask
      expect(task.status).toBe('pending')
      expect(task.response?.decision).toBe('defer')
    })

    it('should handle POST /api/tasks/:id/input', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'input', title: 'Enter value' })

      const request = new Request(`http://humans.do/api/tasks/${created._id}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: { key: 'secret' }, respondedBy: 'alice@example.com' }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
      const task = await response.json() as HITLTask
      expect(task.status).toBe('completed')
      expect(task.response?.value).toEqual({ key: 'secret' })
    })

    it('should return 404 for non-existent task', async () => {
      const instance = new HumansDO(ctx, env)

      const request = new Request('http://humans.do/api/tasks/nonexistent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)
    })

    it('should return 409 for already completed task', async () => {
      const instance = new HumansDO(ctx, env)
      const created = await instance.createTask({ type: 'approval', title: 'Test' })

      // First approval
      await instance.approve(created._id)

      // Second approval attempt
      const request = new Request(`http://humans.do/api/tasks/${created._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(409) // Conflict
    })
  })
})
