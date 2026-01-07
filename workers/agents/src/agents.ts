/**
 * AgentsDO - Autonomous Agents Durable Object
 *
 * Implements the agents.do worker for autonomous agent management.
 * Provides agent lifecycle management, task delegation, and orchestration.
 *
 * @see sdks/agents.do/index.ts for client interface
 */

// Types
type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'
type RunStatus = 'queued' | 'running' | 'completed' | 'failed'
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface AgentConfig {
  name?: string
  task: string
  capabilities?: string[]
  tools?: string[]
  schedule?: string
  webhook?: string
  timeout?: number
  memory?: boolean
}

interface Agent {
  id: string
  name: string
  task: string
  status: AgentStatus
  capabilities: string[]
  tools: string[]
  createdAt: string
  lastRunAt?: string
  nextRunAt?: string
  runs: number
  memory?: boolean
  schedule?: string
  webhook?: string
  timeout?: number
}

interface AgentRun {
  id: string
  agentId: string
  status: RunStatus
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  logs: AgentLog[]
  usage: { tokens: number; cost: number; duration: number }
  startedAt: string
  completedAt?: string
}

interface AgentLog {
  timestamp: string
  level: LogLevel
  message: string
  data?: Record<string, unknown>
}

interface OrchestrationResult {
  id: string
  agents: Array<{ id: string; name: string; status: string }>
  result: Record<string, unknown>
  usage: { tokens: number; cost: number; duration: number }
}

interface AgentType {
  type: string
  description: string
  capabilities: string[]
}

interface ListAgentsOptions {
  status?: AgentStatus
  limit?: number
  offset?: number
}

interface ListRunsOptions {
  status?: RunStatus
  limit?: number
  offset?: number
}

interface OrchestrationOptions {
  context?: string | Record<string, unknown>
  tools?: string[]
  immediate?: boolean
}

interface DOState {
  id: { toString(): string }
  storage: {
    get<T>(key: string): Promise<T | undefined>
    get<T>(keys: string[]): Promise<Map<string, T>>
    put<T>(key: string, value: T): Promise<void>
    put<T>(entries: Record<string, T>): Promise<void>
    delete(key: string): Promise<boolean>
    delete(keys: string[]): Promise<number>
    list<T>(options?: { prefix?: string; limit?: number }): Promise<Map<string, T>>
  }
}

interface Env {
  AGENTS_DO?: {
    get(id: unknown): unknown
    idFromName(name: string): unknown
  }
  LLM?: {
    complete(options: Record<string, unknown>): Promise<{ text: string; usage?: { tokens: number } }>
    stream(options: Record<string, unknown>): unknown
  }
}

// Pre-defined agent types
const AGENT_TYPES: AgentType[] = [
  {
    type: 'researcher',
    description: 'Research and analysis agent that gathers information from various sources',
    capabilities: ['web-search', 'summarization', 'analysis', 'report-generation'],
  },
  {
    type: 'writer',
    description: 'Content creation agent that writes articles, reports, and documentation',
    capabilities: ['content-creation', 'editing', 'formatting', 'tone-adjustment'],
  },
  {
    type: 'monitor',
    description: 'Monitoring agent that watches for changes and events',
    capabilities: ['observation', 'alerting', 'pattern-detection', 'reporting'],
  },
  {
    type: 'assistant',
    description: 'General-purpose assistant agent for various tasks',
    capabilities: ['conversation', 'task-completion', 'scheduling', 'reminders'],
  },
  {
    type: 'analyst',
    description: 'Data analysis agent that processes and interprets data',
    capabilities: ['data-analysis', 'visualization', 'insights', 'predictions'],
  },
]

// Allowed RPC methods
const ALLOWED_METHODS = new Set([
  'create',
  'get',
  'list',
  'update',
  'delete',
  'run',
  'pause',
  'resume',
  'getRun',
  'runs',
  'cancelRun',
  'spawn',
  'types',
  'orchestrate',
])

/**
 * Generate a unique ID
 */
function generateId(prefix: string = ''): string {
  const random = Math.random().toString(36).slice(2, 10)
  const timestamp = Date.now().toString(36)
  return prefix ? `${prefix}-${timestamp}${random}` : `${timestamp}${random}`
}

/**
 * Generate agent name from task description
 */
function generateAgentName(task: string): string {
  // Take first few words and capitalize
  const words = task.split(/\s+/).slice(0, 3)
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

/**
 * AgentsDO - Durable Object for autonomous agent management
 */
export class AgentsDO {
  private ctx: DOState
  private env: Env

  constructor(ctx: DOState, env: Env) {
    this.ctx = ctx
    this.env = env
  }

  // ============ Agent CRUD ============

  async create(config: AgentConfig): Promise<Agent> {
    const id = generateId('agent')
    const now = new Date().toISOString()

    const agent: Agent = {
      id,
      name: config.name || generateAgentName(config.task),
      task: config.task,
      status: 'idle',
      capabilities: config.capabilities || [],
      tools: config.tools || [],
      createdAt: now,
      runs: 0,
      memory: config.memory,
      schedule: config.schedule,
      webhook: config.webhook,
      timeout: config.timeout,
    }

    await this.ctx.storage.put(`agent:${id}`, agent)
    return agent
  }

  async get(agentId: string): Promise<Agent | null> {
    const agent = await this.ctx.storage.get<Agent>(`agent:${agentId}`)
    return agent || null
  }

  async list(options: ListAgentsOptions = {}): Promise<Agent[]> {
    const { status, limit = 100, offset = 0 } = options
    const entries = await this.ctx.storage.list<Agent>({ prefix: 'agent:' })

    let agents = Array.from(entries.values())

    if (status) {
      agents = agents.filter(a => a.status === status)
    }

    // Apply offset and limit
    return agents.slice(offset, offset + limit)
  }

  async update(agentId: string, config: Partial<AgentConfig>): Promise<Agent | null> {
    const agent = await this.get(agentId)
    if (!agent) return null

    const updated: Agent = {
      ...agent,
      name: config.name ?? agent.name,
      task: config.task ?? agent.task,
      capabilities: config.capabilities ?? agent.capabilities,
      tools: config.tools ?? agent.tools,
      schedule: config.schedule ?? agent.schedule,
      webhook: config.webhook ?? agent.webhook,
      timeout: config.timeout ?? agent.timeout,
      memory: config.memory ?? agent.memory,
    }

    await this.ctx.storage.put(`agent:${agentId}`, updated)
    return updated
  }

  async delete(agentId: string): Promise<boolean> {
    const agent = await this.get(agentId)
    if (!agent) return false

    await this.ctx.storage.delete(`agent:${agentId}`)

    // Also delete all runs for this agent
    const runs = await this.ctx.storage.list<AgentRun>({ prefix: `run:${agentId}:` })
    const runKeys = Array.from(runs.keys())
    if (runKeys.length > 0) {
      await this.ctx.storage.delete(runKeys)
    }

    return true
  }

  // ============ Agent Lifecycle ============

  async run(agentId: string, input?: Record<string, unknown>): Promise<AgentRun> {
    const agent = await this.get(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    const runId = generateId('run')
    const now = new Date().toISOString()

    const run: AgentRun = {
      id: runId,
      agentId,
      status: 'running',
      input,
      logs: [],
      usage: { tokens: 0, cost: 0, duration: 0 },
      startedAt: now,
    }

    // Update agent state
    const updatedAgent: Agent = {
      ...agent,
      status: 'running',
      runs: agent.runs + 1,
      lastRunAt: now,
    }

    await this.ctx.storage.put({
      [`run:${agentId}:${runId}`]: run,
      [`agent:${agentId}`]: updatedAgent,
    })

    return run
  }

  async pause(agentId: string): Promise<Agent | null> {
    const agent = await this.get(agentId)
    if (!agent) return null

    const updated: Agent = {
      ...agent,
      status: 'paused',
    }

    await this.ctx.storage.put(`agent:${agentId}`, updated)
    return updated
  }

  async resume(agentId: string): Promise<Agent | null> {
    const agent = await this.get(agentId)
    if (!agent) return null

    const updated: Agent = {
      ...agent,
      status: 'running',
    }

    await this.ctx.storage.put(`agent:${agentId}`, updated)
    return updated
  }

  // ============ Run Management ============

  async getRun(runId: string): Promise<AgentRun | null> {
    // Search for run across all agents
    const entries = await this.ctx.storage.list<AgentRun>({ prefix: 'run:' })
    for (const run of entries.values()) {
      if (run.id === runId) {
        return run
      }
    }
    return null
  }

  async runs(agentId: string, options: ListRunsOptions = {}): Promise<AgentRun[]> {
    const { status, limit = 100, offset = 0 } = options
    const entries = await this.ctx.storage.list<AgentRun>({ prefix: `run:${agentId}:` })

    let runs = Array.from(entries.values())

    if (status) {
      runs = runs.filter(r => r.status === status)
    }

    // Sort by startedAt descending (newest first)
    runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

    return runs.slice(offset, offset + limit)
  }

  async cancelRun(runId: string): Promise<boolean> {
    const run = await this.getRun(runId)
    if (!run) return false

    const updated: AgentRun = {
      ...run,
      status: 'failed',
      completedAt: new Date().toISOString(),
    }

    await this.ctx.storage.put(`run:${run.agentId}:${runId}`, updated)

    // Update agent status back to idle
    const agent = await this.get(run.agentId)
    if (agent && agent.status === 'running') {
      await this.ctx.storage.put(`agent:${run.agentId}`, {
        ...agent,
        status: 'idle',
      })
    }

    return true
  }

  // ============ Agent Types ============

  async spawn(type: string, config: Partial<AgentConfig>): Promise<Agent> {
    const agentType = AGENT_TYPES.find(t => t.type === type)
    if (!agentType) {
      throw new Error(`Unknown agent type: ${type}`)
    }

    const fullConfig: AgentConfig = {
      task: config.task || `${agentType.description}`,
      name: config.name || `${agentType.type.charAt(0).toUpperCase() + agentType.type.slice(1)} Agent`,
      capabilities: [...agentType.capabilities, ...(config.capabilities || [])],
      tools: config.tools || [],
      schedule: config.schedule,
      webhook: config.webhook,
      timeout: config.timeout,
      memory: config.memory,
    }

    return this.create(fullConfig)
  }

  async types(): Promise<AgentType[]> {
    return AGENT_TYPES
  }

  // ============ Orchestration ============

  async orchestrate(prompt: string, options: OrchestrationOptions = {}): Promise<OrchestrationResult> {
    const id = generateId('orch')
    const now = new Date().toISOString()

    // Parse the prompt to identify required agents
    // For now, create a simple orchestration with a single agent
    const agent = await this.create({
      task: prompt,
      tools: options.tools,
    })

    // Start the run
    const run = await this.run(agent.id, {
      context: options.context,
    })

    const result: OrchestrationResult = {
      id,
      agents: [{ id: agent.id, name: agent.name, status: 'running' }],
      result: {
        orchestrationId: id,
        prompt,
        startedAt: now,
      },
      usage: { tokens: 0, cost: 0, duration: 0 },
    }

    return result
  }

  // ============ RPC Interface ============

  hasMethod(name: string): boolean {
    return ALLOWED_METHODS.has(name)
  }

  async invoke(method: string, params: unknown[]): Promise<unknown> {
    if (!this.hasMethod(method)) {
      throw new Error(`Method not allowed: ${method}`)
    }

    const fn = (this as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Method not found: ${method}`)
    }

    return fn.apply(this, params)
  }

  // ============ HTTP Handler ============

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    try {
      // HATEOAS discovery
      if (path === '/' && method === 'GET') {
        return this.handleDiscovery()
      }

      // RPC endpoint
      if (path === '/rpc' && method === 'POST') {
        return this.handleRpc(request)
      }

      // REST API endpoints
      if (path.startsWith('/api/')) {
        return this.handleRestApi(request, path, method)
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }

  private handleDiscovery(): Response {
    const discovery = {
      api: 'agents.do',
      version: '0.0.1',
      description: 'Autonomous Agents API',
      links: {
        self: '/',
        agents: '/api/agents',
        types: '/api/types',
        rpc: '/rpc',
      },
      discover: {
        methods: [
          { name: 'create', description: 'Create a new agent' },
          { name: 'get', description: 'Get an agent by ID' },
          { name: 'list', description: 'List all agents' },
          { name: 'update', description: 'Update an agent' },
          { name: 'delete', description: 'Delete an agent' },
          { name: 'run', description: 'Run an agent' },
          { name: 'pause', description: 'Pause an agent' },
          { name: 'resume', description: 'Resume an agent' },
          { name: 'getRun', description: 'Get a run by ID' },
          { name: 'runs', description: 'List runs for an agent' },
          { name: 'cancelRun', description: 'Cancel a run' },
          { name: 'spawn', description: 'Spawn a pre-defined agent type' },
          { name: 'types', description: 'List available agent types' },
          { name: 'orchestrate', description: 'Orchestrate multiple agents' },
        ],
      },
    }

    return new Response(JSON.stringify(discovery), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleRpc(request: Request): Promise<Response> {
    const body = (await request.json()) as { method: string; params: unknown[] }
    const { method: rpcMethod, params } = body

    if (!this.hasMethod(rpcMethod)) {
      return new Response(JSON.stringify({ error: `Method not allowed: ${rpcMethod}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await this.invoke(rpcMethod, params)
    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private async handleRestApi(request: Request, path: string, method: string): Promise<Response> {
    const segments = path.split('/').filter(Boolean)
    // segments: ['api', 'agents', ...] or ['api', 'types']

    // GET /api/types
    if (segments[1] === 'types' && method === 'GET') {
      const types = await this.types()
      return new Response(JSON.stringify(types), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // /api/agents routes
    if (segments[1] === 'agents') {
      const agentId = segments[2]
      const action = segments[3]

      // GET /api/agents
      if (!agentId && method === 'GET') {
        const agents = await this.list()
        return new Response(JSON.stringify(agents), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // POST /api/agents
      if (!agentId && method === 'POST') {
        const body = (await request.json()) as AgentConfig
        const agent = await this.create(body)
        return new Response(JSON.stringify(agent), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // GET /api/agents/:id
      if (agentId && !action && method === 'GET') {
        const agent = await this.get(agentId)
        if (!agent) {
          return new Response(JSON.stringify({ error: 'Agent not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify(agent), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // DELETE /api/agents/:id
      if (agentId && !action && method === 'DELETE') {
        const deleted = await this.delete(agentId)
        if (!deleted) {
          return new Response(JSON.stringify({ error: 'Agent not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // POST /api/agents/:id/run
      if (agentId && action === 'run' && method === 'POST') {
        const body = (await request.json()) as { input?: Record<string, unknown> }
        const run = await this.run(agentId, body.input)
        return new Response(JSON.stringify(run), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // GET /api/agents/:id/runs
      if (agentId && action === 'runs' && method === 'GET') {
        const runs = await this.runs(agentId)
        return new Response(JSON.stringify(runs), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
