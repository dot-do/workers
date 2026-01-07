/**
 * Tests: agents.do Autonomous Agents RPC Interface
 *
 * These tests define the contract for the agents.do worker's RPC interface.
 * The AgentsDO must implement the autonomous agents compatible interface.
 *
 * Per ARCHITECTURE.md:
 * - agents.do implements autonomous agents RPC
 * - Extends slim DO core
 * - Provides agent lifecycle management
 * - Supports task delegation and orchestration
 * - Supports @callable() decorated methods
 *
 * @see sdks/agents.do/index.ts for client interface definition
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockAgentsEnv,
  type Agent,
  type AgentRun,
  type AgentConfig,
  type OrchestrationResult,
  type AgentType,
} from './helpers.js'

/**
 * Interface definition for AgentsDO - this defines the contract
 * The implementation must satisfy this interface
 */
export interface AgentsDOContract {
  // Agent CRUD
  create(config: AgentConfig): Promise<Agent>
  get(agentId: string): Promise<Agent | null>
  list(options?: ListAgentsOptions): Promise<Agent[]>
  update(agentId: string, config: Partial<AgentConfig>): Promise<Agent | null>
  delete(agentId: string): Promise<boolean>

  // Agent lifecycle
  run(agentId: string, input?: Record<string, unknown>): Promise<AgentRun>
  pause(agentId: string): Promise<Agent | null>
  resume(agentId: string): Promise<Agent | null>

  // Run management
  getRun(runId: string): Promise<AgentRun | null>
  runs(agentId: string, options?: ListRunsOptions): Promise<AgentRun[]>
  cancelRun(runId: string): Promise<boolean>

  // Agent types
  spawn(type: string, config: Partial<AgentConfig>): Promise<Agent>
  types(): Promise<AgentType[]>

  // Orchestration
  orchestrate(prompt: string, options?: OrchestrationOptions): Promise<OrchestrationResult>

  // RPC interface
  hasMethod(name: string): boolean
  invoke(method: string, params: unknown[]): Promise<unknown>

  // HTTP handlers
  fetch(request: Request): Promise<Response>
}

export interface ListAgentsOptions {
  status?: Agent['status']
  limit?: number
  offset?: number
}

export interface ListRunsOptions {
  status?: AgentRun['status']
  limit?: number
  offset?: number
}

export interface OrchestrationOptions {
  context?: string | Record<string, unknown>
  tools?: string[]
  immediate?: boolean
}

/**
 * Load AgentsDO from implementation
 */
async function loadAgentsDO(): Promise<new (ctx: MockDOState, env: MockAgentsEnv) => AgentsDOContract> {
  const module = await import('../src/agents.js')
  return module.AgentsDO
}

describe('AgentsDO RPC Interface', () => {
  let ctx: MockDOState
  let env: MockAgentsEnv
  let AgentsDO: new (ctx: MockDOState, env: MockAgentsEnv) => AgentsDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AgentsDO = await loadAgentsDO()
  })

  describe('Agent CRUD', () => {
    describe('create()', () => {
      it('should create an agent with auto-generated id', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({
          task: 'Monitor GitHub repos and summarize issues',
        })
        expect(agent.id).toBeDefined()
        expect(agent.id.length).toBeGreaterThan(0)
        expect(agent.task).toBe('Monitor GitHub repos and summarize issues')
        expect(agent.status).toBe('idle')
      })

      it('should set agent name when provided', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({
          name: 'GitHub Monitor',
          task: 'Monitor GitHub repos',
        })
        expect(agent.name).toBe('GitHub Monitor')
      })

      it('should auto-generate name from task if not provided', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({
          task: 'Summarize daily news',
        })
        expect(agent.name).toBeDefined()
        expect(agent.name.length).toBeGreaterThan(0)
      })

      it('should set capabilities when provided', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({
          task: 'Research competitor products',
          capabilities: ['web-search', 'summarization', 'analysis'],
        })
        expect(agent.capabilities).toEqual(['web-search', 'summarization', 'analysis'])
      })

      it('should set tools when provided', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({
          task: 'Send weekly reports',
          tools: ['email', 'slack', 'calendar'],
        })
        expect(agent.tools).toEqual(['email', 'slack', 'calendar'])
      })

      it('should set schedule for recurring agents', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({
          task: 'Check server health',
          schedule: '0 * * * *', // Every hour
        })
        expect(agent.schedule).toBe('0 * * * *')
      })

      it('should set webhook when provided', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({
          task: 'Process incoming data',
          webhook: 'https://example.com/webhook',
        })
        expect(agent.webhook).toBe('https://example.com/webhook')
      })

      it('should set timeout when provided', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({
          task: 'Long running analysis',
          timeout: 3600, // 1 hour
        })
        expect(agent.timeout).toBe(3600)
      })

      it('should set memory flag when provided', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({
          task: 'Maintain conversation context',
          memory: true,
        })
        expect(agent.memory).toBe(true)
      })

      it('should initialize runs to 0', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({
          task: 'New agent',
        })
        expect(agent.runs).toBe(0)
      })

      it('should set createdAt timestamp', async () => {
        const instance = new AgentsDO(ctx, env)
        const before = Date.now()
        const agent = await instance.create({
          task: 'Test agent',
        })
        const after = Date.now()
        const createdTime = new Date(agent.createdAt).getTime()
        expect(createdTime).toBeGreaterThanOrEqual(before)
        expect(createdTime).toBeLessThanOrEqual(after)
      })
    })

    describe('get()', () => {
      it('should return null for non-existent agent', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.get('nonexistent')
        expect(result).toBeNull()
      })

      it('should return agent by id', async () => {
        const instance = new AgentsDO(ctx, env)
        const created = await instance.create({
          name: 'Test Agent',
          task: 'Test task',
        })
        const retrieved = await instance.get(created.id)
        expect(retrieved).not.toBeNull()
        expect(retrieved!.id).toBe(created.id)
        expect(retrieved!.name).toBe('Test Agent')
      })
    })

    describe('list()', () => {
      it('should return empty array when no agents exist', async () => {
        const instance = new AgentsDO(ctx, env)
        const agents = await instance.list()
        expect(agents).toEqual([])
      })

      it('should list all agents', async () => {
        const instance = new AgentsDO(ctx, env)
        await instance.create({ task: 'Agent 1' })
        await instance.create({ task: 'Agent 2' })
        await instance.create({ task: 'Agent 3' })

        const agents = await instance.list()
        expect(agents).toHaveLength(3)
      })

      it('should filter by status', async () => {
        const instance = new AgentsDO(ctx, env)
        await instance.create({ task: 'Idle agent' })
        const runnable = await instance.create({ task: 'Running agent' })
        await instance.run(runnable.id)

        const running = await instance.list({ status: 'running' })
        expect(running.every(a => a.status === 'running')).toBe(true)
      })

      it('should respect limit', async () => {
        const instance = new AgentsDO(ctx, env)
        for (let i = 0; i < 10; i++) {
          await instance.create({ task: `Agent ${i}` })
        }

        const agents = await instance.list({ limit: 5 })
        expect(agents.length).toBeLessThanOrEqual(5)
      })
    })

    describe('update()', () => {
      it('should return null for non-existent agent', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.update('nonexistent', { name: 'New Name' })
        expect(result).toBeNull()
      })

      it('should update agent properties', async () => {
        const instance = new AgentsDO(ctx, env)
        const created = await instance.create({
          name: 'Original Name',
          task: 'Original task',
        })

        const updated = await instance.update(created.id, {
          name: 'Updated Name',
          task: 'Updated task',
        })

        expect(updated).not.toBeNull()
        expect(updated!.name).toBe('Updated Name')
        expect(updated!.task).toBe('Updated task')
      })

      it('should merge updates with existing config', async () => {
        const instance = new AgentsDO(ctx, env)
        const created = await instance.create({
          name: 'Test Agent',
          task: 'Original task',
          capabilities: ['web-search'],
          timeout: 300,
        })

        const updated = await instance.update(created.id, {
          timeout: 600,
        })

        expect(updated!.name).toBe('Test Agent')
        expect(updated!.capabilities).toEqual(['web-search'])
        expect(updated!.timeout).toBe(600)
      })
    })

    describe('delete()', () => {
      it('should return false for non-existent agent', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.delete('nonexistent')
        expect(result).toBe(false)
      })

      it('should delete existing agent', async () => {
        const instance = new AgentsDO(ctx, env)
        const created = await instance.create({ task: 'To delete' })

        const deleted = await instance.delete(created.id)
        expect(deleted).toBe(true)

        const retrieved = await instance.get(created.id)
        expect(retrieved).toBeNull()
      })
    })
  })

  describe('Agent Lifecycle', () => {
    describe('run()', () => {
      it('should start agent execution', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Run test' })

        const run = await instance.run(agent.id)
        expect(run.id).toBeDefined()
        expect(run.agentId).toBe(agent.id)
        expect(run.status).toMatch(/queued|running/)
        expect(run.startedAt).toBeDefined()
      })

      it('should throw for non-existent agent', async () => {
        const instance = new AgentsDO(ctx, env)
        await expect(instance.run('nonexistent')).rejects.toThrow(/not found/i)
      })

      it('should accept input parameters', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Process data' })

        const run = await instance.run(agent.id, { data: 'test', count: 5 })
        expect(run.input).toEqual({ data: 'test', count: 5 })
      })

      it('should increment agent run count', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Counter test' })
        expect(agent.runs).toBe(0)

        await instance.run(agent.id)
        const updated = await instance.get(agent.id)
        expect(updated!.runs).toBe(1)
      })

      it('should update agent status to running', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Status test' })

        await instance.run(agent.id)
        const updated = await instance.get(agent.id)
        expect(updated!.status).toBe('running')
      })

      it('should update lastRunAt timestamp', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Timestamp test' })
        expect(agent.lastRunAt).toBeUndefined()

        const before = Date.now()
        await instance.run(agent.id)
        const after = Date.now()

        const updated = await instance.get(agent.id)
        const lastRunTime = new Date(updated!.lastRunAt!).getTime()
        expect(lastRunTime).toBeGreaterThanOrEqual(before)
        expect(lastRunTime).toBeLessThanOrEqual(after)
      })
    })

    describe('pause()', () => {
      it('should return null for non-existent agent', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.pause('nonexistent')
        expect(result).toBeNull()
      })

      it('should pause running agent', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Pausable' })
        await instance.run(agent.id)

        const paused = await instance.pause(agent.id)
        expect(paused).not.toBeNull()
        expect(paused!.status).toBe('paused')
      })
    })

    describe('resume()', () => {
      it('should return null for non-existent agent', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.resume('nonexistent')
        expect(result).toBeNull()
      })

      it('should resume paused agent', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Resumable' })
        await instance.run(agent.id)
        await instance.pause(agent.id)

        const resumed = await instance.resume(agent.id)
        expect(resumed).not.toBeNull()
        expect(resumed!.status).toBe('running')
      })
    })
  })

  describe('Run Management', () => {
    describe('getRun()', () => {
      it('should return null for non-existent run', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.getRun('nonexistent')
        expect(result).toBeNull()
      })

      it('should return run by id', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Test' })
        const run = await instance.run(agent.id)

        const retrieved = await instance.getRun(run.id)
        expect(retrieved).not.toBeNull()
        expect(retrieved!.id).toBe(run.id)
      })
    })

    describe('runs()', () => {
      it('should return empty array for agent with no runs', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'No runs' })

        const runs = await instance.runs(agent.id)
        expect(runs).toEqual([])
      })

      it('should list runs for agent', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Multiple runs' })
        await instance.run(agent.id)
        await instance.run(agent.id)
        await instance.run(agent.id)

        const runs = await instance.runs(agent.id)
        expect(runs).toHaveLength(3)
        expect(runs.every(r => r.agentId === agent.id)).toBe(true)
      })

      it('should respect limit option', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Many runs' })
        for (let i = 0; i < 10; i++) {
          await instance.run(agent.id)
        }

        const runs = await instance.runs(agent.id, { limit: 3 })
        expect(runs.length).toBeLessThanOrEqual(3)
      })
    })

    describe('cancelRun()', () => {
      it('should return false for non-existent run', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.cancelRun('nonexistent')
        expect(result).toBe(false)
      })

      it('should cancel running execution', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.create({ task: 'Cancellable' })
        const run = await instance.run(agent.id)

        const cancelled = await instance.cancelRun(run.id)
        expect(cancelled).toBe(true)

        const updated = await instance.getRun(run.id)
        expect(updated!.status).toBe('failed')
      })
    })
  })

  describe('Agent Types', () => {
    describe('spawn()', () => {
      it('should spawn a pre-defined agent type', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.spawn('researcher', {
          task: 'Research AI trends',
        })

        expect(agent.id).toBeDefined()
        expect(agent.task).toBe('Research AI trends')
      })

      it('should throw for unknown agent type', async () => {
        const instance = new AgentsDO(ctx, env)
        await expect(instance.spawn('unknown-type', { task: 'test' })).rejects.toThrow(/unknown|not found/i)
      })

      it('should inherit capabilities from type', async () => {
        const instance = new AgentsDO(ctx, env)
        const agent = await instance.spawn('researcher', {
          task: 'Research task',
        })

        // Researcher type should have some default capabilities
        expect(agent.capabilities.length).toBeGreaterThan(0)
      })
    })

    describe('types()', () => {
      it('should return available agent types', async () => {
        const instance = new AgentsDO(ctx, env)
        const types = await instance.types()

        expect(Array.isArray(types)).toBe(true)
        expect(types.length).toBeGreaterThan(0)
        types.forEach(t => {
          expect(t.type).toBeDefined()
          expect(t.description).toBeDefined()
          expect(Array.isArray(t.capabilities)).toBe(true)
        })
      })
    })
  })

  describe('Orchestration', () => {
    describe('orchestrate()', () => {
      it('should orchestrate multiple agents from prompt', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.orchestrate('Research AI, write a report, create presentation')

        expect(result.id).toBeDefined()
        expect(Array.isArray(result.agents)).toBe(true)
        expect(result.result).toBeDefined()
        expect(result.usage).toBeDefined()
      })

      it('should accept context option', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.orchestrate('Analyze data', {
          context: { dataset: 'sales-2024', format: 'csv' },
        })

        expect(result.id).toBeDefined()
      })

      it('should accept tools option', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.orchestrate('Send notifications', {
          tools: ['email', 'slack'],
        })

        expect(result.id).toBeDefined()
      })
    })
  })

  describe('RPC interface', () => {
    describe('hasMethod()', () => {
      it('should return true for agent methods', async () => {
        const instance = new AgentsDO(ctx, env)
        expect(instance.hasMethod('create')).toBe(true)
        expect(instance.hasMethod('get')).toBe(true)
        expect(instance.hasMethod('list')).toBe(true)
        expect(instance.hasMethod('update')).toBe(true)
        expect(instance.hasMethod('delete')).toBe(true)
        expect(instance.hasMethod('run')).toBe(true)
        expect(instance.hasMethod('pause')).toBe(true)
        expect(instance.hasMethod('resume')).toBe(true)
      })

      it('should return true for run management methods', async () => {
        const instance = new AgentsDO(ctx, env)
        expect(instance.hasMethod('getRun')).toBe(true)
        expect(instance.hasMethod('runs')).toBe(true)
        expect(instance.hasMethod('cancelRun')).toBe(true)
      })

      it('should return true for orchestration methods', async () => {
        const instance = new AgentsDO(ctx, env)
        expect(instance.hasMethod('spawn')).toBe(true)
        expect(instance.hasMethod('types')).toBe(true)
        expect(instance.hasMethod('orchestrate')).toBe(true)
      })

      it('should return false for non-existent methods', async () => {
        const instance = new AgentsDO(ctx, env)
        expect(instance.hasMethod('nonexistent')).toBe(false)
        expect(instance.hasMethod('eval')).toBe(false)
      })
    })

    describe('invoke()', () => {
      it('should invoke allowed method with params', async () => {
        const instance = new AgentsDO(ctx, env)
        const result = await instance.invoke('create', [{ task: 'Via invoke' }]) as Agent
        expect(result).toHaveProperty('id')
        expect(result).toHaveProperty('task', 'Via invoke')
      })

      it('should throw error for disallowed method', async () => {
        const instance = new AgentsDO(ctx, env)
        await expect(instance.invoke('dangerous', [])).rejects.toThrow(/not allowed|not found/i)
      })
    })
  })

  describe('HTTP fetch() handler', () => {
    describe('RPC endpoint', () => {
      it('should handle POST /rpc with method call', async () => {
        const instance = new AgentsDO(ctx, env)
        const request = new Request('http://agents.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'create',
            params: [{ task: 'HTTP test' }],
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const result = await response.json() as { result: Agent }
        expect(result).toHaveProperty('result')
        expect(result.result).toHaveProperty('id')
        expect(result.result).toHaveProperty('task', 'HTTP test')
      })

      it('should return error for invalid method', async () => {
        const instance = new AgentsDO(ctx, env)
        const request = new Request('http://agents.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'invalid', params: [] }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(400)

        const result = await response.json() as { error: string }
        expect(result).toHaveProperty('error')
      })
    })

    describe('REST API endpoints', () => {
      it('should handle GET /api/agents', async () => {
        const instance = new AgentsDO(ctx, env)
        await instance.create({ task: 'Test agent' })

        const request = new Request('http://agents.do/api/agents', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const agents = await response.json() as Agent[]
        expect(Array.isArray(agents)).toBe(true)
        expect(agents.length).toBeGreaterThan(0)
      })

      it('should handle GET /api/agents/:id', async () => {
        const instance = new AgentsDO(ctx, env)
        const created = await instance.create({ task: 'Get by ID' })

        const request = new Request(`http://agents.do/api/agents/${created.id}`, { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const agent = await response.json() as Agent
        expect(agent.id).toBe(created.id)
      })

      it('should handle POST /api/agents', async () => {
        const instance = new AgentsDO(ctx, env)
        const request = new Request('http://agents.do/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: 'New agent' }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(201)

        const agent = await response.json() as Agent
        expect(agent.id).toBeDefined()
        expect(agent.task).toBe('New agent')
      })

      it('should handle POST /api/agents/:id/run', async () => {
        const instance = new AgentsDO(ctx, env)
        const created = await instance.create({ task: 'Runnable' })

        const request = new Request(`http://agents.do/api/agents/${created.id}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: { key: 'value' } }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const run = await response.json() as AgentRun
        expect(run.agentId).toBe(created.id)
      })

      it('should handle DELETE /api/agents/:id', async () => {
        const instance = new AgentsDO(ctx, env)
        const created = await instance.create({ task: 'Deletable' })

        const request = new Request(`http://agents.do/api/agents/${created.id}`, { method: 'DELETE' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const getResponse = await instance.fetch(
          new Request(`http://agents.do/api/agents/${created.id}`, { method: 'GET' })
        )
        expect(getResponse.status).toBe(404)
      })

      it('should handle GET /api/agents/:id/runs', async () => {
        const instance = new AgentsDO(ctx, env)
        const created = await instance.create({ task: 'Runs test' })
        await instance.run(created.id)

        const request = new Request(`http://agents.do/api/agents/${created.id}/runs`, { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const runs = await response.json() as AgentRun[]
        expect(Array.isArray(runs)).toBe(true)
      })

      it('should handle GET /api/types', async () => {
        const instance = new AgentsDO(ctx, env)
        const request = new Request('http://agents.do/api/types', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const types = await response.json() as AgentType[]
        expect(Array.isArray(types)).toBe(true)
      })
    })

    describe('HATEOAS discovery', () => {
      it('should return discovery info at GET /', async () => {
        const instance = new AgentsDO(ctx, env)
        const request = new Request('http://agents.do/', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = await response.json() as Record<string, unknown>
        expect(data.api).toBeDefined()
        expect(data.links).toBeDefined()
        expect(data.discover).toBeDefined()
      })

      it('should include available RPC methods in discovery', async () => {
        const instance = new AgentsDO(ctx, env)
        const request = new Request('http://agents.do/', { method: 'GET' })
        const response = await instance.fetch(request)

        const data = await response.json() as { discover: { methods: Array<{ name: string }> } }
        const methodNames = data.discover.methods.map(m => m.name)
        expect(methodNames).toContain('create')
        expect(methodNames).toContain('run')
        expect(methodNames).toContain('orchestrate')
      })
    })
  })
})
