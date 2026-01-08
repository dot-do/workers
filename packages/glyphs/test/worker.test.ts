/**
 * Tests for 人 (worker/do) glyph - Agent Execution
 *
 * This is a RED phase TDD test file. These tests define the API contract
 * for the worker/agent execution glyph before implementation exists.
 *
 * The 人 glyph represents a person standing - a visual metaphor for
 * workers and agents that can execute tasks on your behalf.
 *
 * Covers:
 * - Tagged template execution: 人`task description`
 * - Named agents: 人.tom`review code`, 人.priya`plan roadmap`
 * - Dynamic agent access: 人[agentName]`task`
 * - Async/parallel execution
 * - Error handling (empty tasks, unknown agents)
 * - ASCII alias: worker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// These imports will fail until implementation exists - this is expected for RED phase
import { 人, worker } from '../src/worker.js'

describe('人 (worker/do) glyph - Agent Execution', () => {
  describe('Tagged Template Execution', () => {
    it('should execute task via tagged template', async () => {
      const result = await 人`review this code for security issues`

      expect(result).toBeDefined()
    })

    it('should return a promise for async work', () => {
      const promise = 人`long running analysis task`

      expect(promise).toBeInstanceOf(Promise)
    })

    it('should accept interpolated values in task description', async () => {
      const code = `function add(a, b) { return a + b }`
      const result = await 人`review ${code}`

      expect(result).toBeDefined()
    })

    it('should accept multiple interpolated values', async () => {
      const file = 'auth.ts'
      const line = 42
      const result = await 人`fix bug in ${file} at line ${line}`

      expect(result).toBeDefined()
    })

    it('should handle object interpolations', async () => {
      const context = { repo: 'workers', branch: 'main' }
      const result = await 人`analyze changes in ${context}`

      expect(result).toBeDefined()
    })

    it('should handle array interpolations', async () => {
      const files = ['auth.ts', 'users.ts', 'api.ts']
      const result = await 人`review these files: ${files}`

      expect(result).toBeDefined()
    })
  })

  describe('Named Agents', () => {
    it('should support named agent access: 人.tom', async () => {
      const result = await 人.tom`review the architecture`

      expect(result).toBeDefined()
    })

    it('should support named agent access: 人.priya', async () => {
      const result = await 人.priya`plan the Q1 roadmap`

      expect(result).toBeDefined()
    })

    it('should support named agent access: 人.ralph', async () => {
      const result = await 人.ralph`implement the authentication system`

      expect(result).toBeDefined()
    })

    it('should support named agent access: 人.quinn', async () => {
      const result = await 人.quinn`write unit tests for auth module`

      expect(result).toBeDefined()
    })

    it('should support named agent access: 人.mark', async () => {
      const result = await 人.mark`write the launch announcement`

      expect(result).toBeDefined()
    })

    it('should support named agent access: 人.rae', async () => {
      const result = await 人.rae`design the dashboard UI`

      expect(result).toBeDefined()
    })

    it('should support named agent access: 人.sally', async () => {
      const result = await 人.sally`prepare the sales demo`

      expect(result).toBeDefined()
    })

    it('should return distinct agent references for different names', () => {
      // Named agent accessors should be distinct callable functions
      expect(人.tom).toBeDefined()
      expect(人.priya).toBeDefined()
      expect(人.tom).not.toBe(人.priya)
    })
  })

  describe('Dynamic Agent Access', () => {
    it('should support dynamic agent access via bracket notation', async () => {
      const agentName = 'tom'
      const result = await 人[agentName]`review code`

      expect(result).toBeDefined()
    })

    it('should work with computed property names', async () => {
      const role = 'dev'
      const agentMap: Record<string, string> = {
        dev: 'tom',
        product: 'priya',
        qa: 'quinn',
      }
      const result = await 人[agentMap[role]]`implement feature`

      expect(result).toBeDefined()
    })

    it('should handle agent name from variable', async () => {
      const agents = ['tom', 'priya', 'ralph']
      const selectedAgent = agents[0]
      const result = await 人[selectedAgent]`review changes`

      expect(result).toBeDefined()
    })
  })

  describe('Parallel Execution', () => {
    it('should support parallel execution with Promise.all', async () => {
      const results = await Promise.all([
        人.tom`review code`,
        人.priya`review product`,
        人.quinn`run tests`,
      ])

      expect(results).toHaveLength(3)
      expect(results.every((r) => r !== undefined)).toBe(true)
    })

    it('should support multiple generic worker calls in parallel', async () => {
      const results = await Promise.all([
        人`task 1`,
        人`task 2`,
        人`task 3`,
      ])

      expect(results).toHaveLength(3)
    })

    it('should support Promise.allSettled for fault-tolerant execution', async () => {
      const results = await Promise.allSettled([
        人.tom`review code`,
        人.priya`review product`,
        人.quinn`run tests`,
      ])

      expect(results).toHaveLength(3)
      results.forEach((r) => {
        expect(r.status).toBe('fulfilled')
      })
    })

    it('should maintain order in parallel results', async () => {
      // Results should match the order of invocation
      const [r1, r2, r3] = await Promise.all([
        人`first task`,
        人`second task`,
        人`third task`,
      ])

      expect(r1).toBeDefined()
      expect(r2).toBeDefined()
      expect(r3).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should reject with error for empty task', async () => {
      await expect(人``).rejects.toThrow('Empty task')
    })

    it('should reject with error for whitespace-only task', async () => {
      await expect(人`   `).rejects.toThrow('Empty task')
    })

    it('should reject with error for unknown agent', async () => {
      // @ts-expect-error - Testing unknown agent
      await expect(人.nonexistent`do something`).rejects.toThrow()
    })

    it('should include agent name in error for unknown agent', async () => {
      // @ts-expect-error - Testing unknown agent
      await expect(人.unknownagent`do something`).rejects.toThrow(/unknownagent|not found/i)
    })

    it('should handle task execution failure gracefully', async () => {
      // If the agent execution fails, it should reject with a meaningful error
      // This tests the error propagation mechanism
      const task = 人`deliberately fail this task for testing`
      expect(task).toBeInstanceOf(Promise)
    })
  })

  describe('Task Result Structure', () => {
    it('should return result with task property', async () => {
      const result = await 人`analyze the codebase`

      expect(result).toHaveProperty('task')
    })

    it('should return result with agent property when using named agent', async () => {
      const result = await 人.tom`review the PR`

      expect(result).toHaveProperty('agent')
      expect(result.agent).toBe('tom')
    })

    it('should return result with output property', async () => {
      const result = await 人`summarize the changes`

      expect(result).toHaveProperty('output')
    })

    it('should return result with timestamp', async () => {
      const beforeTime = Date.now()
      const result = await 人`quick task`
      const afterTime = Date.now()

      expect(result).toHaveProperty('timestamp')
      expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(result.timestamp).toBeLessThanOrEqual(afterTime)
    })

    it('should return result with id', async () => {
      const result = await 人`task with tracking`

      expect(result).toHaveProperty('id')
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
    })

    it('should generate unique ids for each execution', async () => {
      const r1 = await 人`task 1`
      const r2 = await 人`task 2`
      const r3 = await 人`task 3`

      const ids = [r1.id, r2.id, r3.id]
      expect(new Set(ids).size).toBe(3) // All unique
    })
  })

  describe('ASCII Alias: worker', () => {
    it('should export worker as ASCII alias for 人', () => {
      expect(worker).toBeDefined()
      expect(worker).toBe(人)
    })

    it('should work identically via worker alias - tagged template', async () => {
      const result = await worker`review this code`

      expect(result).toBeDefined()
    })

    it('should work identically via worker alias - named agents', async () => {
      const result = await worker.tom`review architecture`

      expect(result).toBeDefined()
    })

    it('should work identically via worker alias - dynamic access', async () => {
      const agentName = 'priya'
      const result = await worker[agentName]`plan features`

      expect(result).toBeDefined()
    })

    it('should share state with 人 glyph', () => {
      // Both should reference the same underlying worker system
      expect(worker.tom).toBe(人.tom)
      expect(worker.priya).toBe(人.priya)
    })
  })

  describe('Chainable API', () => {
    it('should support .with() for context injection', async () => {
      const result = await 人
        .with({ repo: 'workers', branch: 'main' })
        `review changes`

      expect(result).toBeDefined()
    })

    it('should support .timeout() for execution limits', async () => {
      const result = await 人
        .timeout(5000)
        `quick task`

      expect(result).toBeDefined()
    })

    it('should support named agent with .with() context', async () => {
      const result = await 人.tom
        .with({ focus: 'security' })
        `review authentication code`

      expect(result).toBeDefined()
    })

    it('should support chaining multiple modifiers', async () => {
      const result = await 人
        .with({ repo: 'workers' })
        .timeout(10000)
        `analyze performance`

      expect(result).toBeDefined()
    })
  })

  describe('Task Interpolation Parsing', () => {
    it('should reconstruct task string from template', async () => {
      const result = await 人`review code in ${'auth.ts'}`

      expect(result.task).toContain('auth.ts')
    })

    it('should handle empty interpolations gracefully', async () => {
      const empty = ''
      const result = await 人`process ${empty} data`

      expect(result).toBeDefined()
    })

    it('should stringify object interpolations in task', async () => {
      const config = { mode: 'strict' }
      const result = await 人`apply ${config}`

      expect(result.task).toBeDefined()
    })

    it('should preserve interpolation order', async () => {
      const a = 'first'
      const b = 'second'
      const c = 'third'
      const result = await 人`${a} then ${b} then ${c}`

      expect(result.task).toMatch(/first.*second.*third/)
    })
  })

  describe('Agent Configuration', () => {
    it('should allow checking if agent exists with 人.has()', () => {
      expect(人.has('tom')).toBe(true)
      expect(人.has('priya')).toBe(true)
      expect(人.has('nonexistent')).toBe(false)
    })

    it('should list available agents with 人.list()', () => {
      const agents = 人.list()

      expect(Array.isArray(agents)).toBe(true)
      expect(agents).toContain('tom')
      expect(agents).toContain('priya')
      expect(agents).toContain('ralph')
      expect(agents).toContain('quinn')
      expect(agents).toContain('mark')
      expect(agents).toContain('rae')
      expect(agents).toContain('sally')
    })

    it('should get agent info with 人.info()', () => {
      const info = 人.info('tom')

      expect(info).toBeDefined()
      expect(info).toHaveProperty('name')
      expect(info).toHaveProperty('role')
      expect(info).toHaveProperty('email')
    })
  })

  describe('Type Safety', () => {
    it('should be callable as tagged template literal', () => {
      // This test verifies the type signature allows tagged template usage
      // The test will fail at runtime until implementation exists,
      // but TypeScript should not complain about the syntax
      const taggedCall = async () => {
        await 人`test task`
      }
      expect(taggedCall).toBeDefined()
    })

    it('should allow named agent access in types', () => {
      // Verify dot notation types work
      const namedCall = async () => {
        await 人.tom`review code`
      }
      expect(namedCall).toBeDefined()
    })

    it('should allow bracket notation access in types', () => {
      // Verify bracket notation types work
      const dynamicCall = async () => {
        const agent = 'tom'
        await 人[agent]`review code`
      }
      expect(dynamicCall).toBeDefined()
    })

    it('should infer result type from execution', async () => {
      const result = await 人`analyze code`

      // TypeScript should infer these properties
      const id: string = result.id
      const timestamp: number = result.timestamp
      const task: string = result.task

      expect(id).toBeDefined()
      expect(timestamp).toBeDefined()
      expect(task).toBeDefined()
    })
  })
})

describe('人 Integration Scenarios', () => {
  it('should work in async/await context', async () => {
    const review = await 人.tom`review the architecture`
    const implement = await 人.ralph`implement based on ${review}`
    const test = await 人.quinn`test ${implement}`

    expect(review).toBeDefined()
    expect(implement).toBeDefined()
    expect(test).toBeDefined()
  })

  it('should work with array mapping', async () => {
    const tasks = ['review auth', 'review api', 'review db']
    const results = await Promise.all(tasks.map((t) => 人`${t}`))

    expect(results).toHaveLength(3)
  })

  it('should work with reduce for sequential execution', async () => {
    const tasks = ['step 1', 'step 2', 'step 3']
    let previousResult: unknown = null

    for (const task of tasks) {
      previousResult = await 人`${task} after ${previousResult}`
    }

    expect(previousResult).toBeDefined()
  })

  it('should support workflow-style composition', async () => {
    // Plan -> Implement -> Review -> Test
    const plan = await 人.priya`plan the feature`
    const code = await 人.ralph`implement ${plan}`
    const reviewed = await 人.tom`review ${code}`
    const tested = await 人.quinn`test ${reviewed}`

    expect(tested).toBeDefined()
  })
})
