/**
 * 人 (worker/do) glyph - Agent Execution
 *
 * A visual programming glyph for dispatching tasks to AI agents and human workers.
 * The 人 character represents a person standing - workers and agents that execute tasks.
 *
 * API:
 * - Tagged template: 人`review this code`
 * - Named agents: 人.tom`review architecture`
 * - Dynamic access: 人[agentName]`task`
 * - Context: 人.with({ repo })`task`
 * - Timeout: 人.timeout(5000)`task`
 */

// Types for the worker system

export interface WorkerResult {
  id: string
  task: string
  agent?: string
  output: unknown
  timestamp: number
}

export interface AgentInfo {
  name: string
  role: string
  email: string
}

export interface WorkerOptions {
  timeout?: number
  context?: Record<string, unknown>
}

export interface NamedAgentProxy {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<WorkerResult>
  with(context: Record<string, unknown>): NamedAgentProxy
}

export interface WorkerProxy {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<WorkerResult>
  [agentName: string]: NamedAgentProxy
  with(context: Record<string, unknown>): WorkerProxy
  timeout(ms: number): WorkerProxy
  has(agentName: string): boolean
  list(): string[]
  info(agentName: string): AgentInfo | undefined
}

// Known agents registry - these are the agents from workers.do
const KNOWN_AGENTS: Record<string, AgentInfo> = {
  tom: {
    name: 'Tom',
    role: 'Tech Lead',
    email: 'tom@agents.do',
  },
  priya: {
    name: 'Priya',
    role: 'Product',
    email: 'priya@agents.do',
  },
  ralph: {
    name: 'Ralph',
    role: 'Developer',
    email: 'ralph@agents.do',
  },
  quinn: {
    name: 'Quinn',
    role: 'QA',
    email: 'quinn@agents.do',
  },
  mark: {
    name: 'Mark',
    role: 'Marketing',
    email: 'mark@agents.do',
  },
  rae: {
    name: 'Rae',
    role: 'Frontend',
    email: 'rae@agents.do',
  },
  sally: {
    name: 'Sally',
    role: 'Sales',
    email: 'sally@agents.do',
  },
}

// Generate a unique ID for each execution
let idCounter = 0
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const counter = (idCounter++).toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${counter}-${random}`
}

// Interpolate template strings with values
function interpolateTask(
  strings: TemplateStringsArray,
  values: unknown[]
): string {
  let result = ''
  for (let i = 0; i < strings.length; i++) {
    result += strings[i]
    if (i < values.length) {
      const value = values[i]
      if (value === null || value === undefined) {
        result += String(value)
      } else if (typeof value === 'object') {
        result += JSON.stringify(value)
      } else {
        result += String(value)
      }
    }
  }
  return result
}

// Core task execution function
async function executeTask(
  agent: string | null,
  strings: TemplateStringsArray,
  values: unknown[],
  options: WorkerOptions = {}
): Promise<WorkerResult> {
  const task = interpolateTask(strings, values)

  // Validate non-empty task
  if (!task.trim()) {
    throw new Error('Empty task')
  }

  // Validate agent exists if specified
  if (agent && !KNOWN_AGENTS[agent]) {
    throw new Error(`Worker not found: ${agent}`)
  }

  // Simulate task execution
  const result: WorkerResult = {
    id: generateId(),
    task,
    output: `Task completed: ${task}`,
    timestamp: Date.now(),
  }

  if (agent) {
    result.agent = agent
  }

  return result
}

// Cache for named agent proxies to ensure consistent identity
const namedAgentCache = new Map<string, NamedAgentProxy>()

// Create a named agent proxy that supports tagged templates and .with()
function createNamedAgentProxy(
  agentName: string,
  options: WorkerOptions = {}
): NamedAgentProxy {
  // Check cache for existing proxy (with same options)
  const cacheKey =
    options.context || options.timeout
      ? `${agentName}:${JSON.stringify(options)}`
      : agentName

  if (!options.context && !options.timeout && namedAgentCache.has(cacheKey)) {
    return namedAgentCache.get(cacheKey)!
  }

  const proxy = new Proxy(
    function () {} as unknown as NamedAgentProxy,
    {
      apply(
        _target,
        _thisArg,
        args: [TemplateStringsArray, ...unknown[]]
      ): Promise<WorkerResult> {
        const [strings, ...values] = args
        return executeTask(agentName, strings, values, options)
      },
      get(_target, prop: string | symbol) {
        if (prop === 'with') {
          return (context: Record<string, unknown>) =>
            createNamedAgentProxy(agentName, {
              ...options,
              context: { ...options.context, ...context },
            })
        }
        // Return undefined for other properties
        return undefined
      },
    }
  )

  // Cache proxies without options for identity consistency
  if (!options.context && !options.timeout) {
    namedAgentCache.set(cacheKey, proxy)
  }

  return proxy
}

// Create the main worker proxy
function createWorkerProxy(options: WorkerOptions = {}): WorkerProxy {
  const proxy = new Proxy(
    function () {} as unknown as WorkerProxy,
    {
      apply(
        _target,
        _thisArg,
        args: [TemplateStringsArray, ...unknown[]]
      ): Promise<WorkerResult> {
        const [strings, ...values] = args
        return executeTask(null, strings, values, options)
      },
      get(_target, prop: string | symbol) {
        // Handle symbol properties
        if (typeof prop === 'symbol') {
          return undefined
        }

        // Handle special methods
        switch (prop) {
          case 'with':
            return (context: Record<string, unknown>) =>
              createWorkerProxy({
                ...options,
                context: { ...options.context, ...context },
              })

          case 'timeout':
            return (ms: number) =>
              createWorkerProxy({
                ...options,
                timeout: ms,
              })

          case 'has':
            return (agentName: string) => agentName in KNOWN_AGENTS

          case 'list':
            return () => Object.keys(KNOWN_AGENTS)

          case 'info':
            return (agentName: string) => KNOWN_AGENTS[agentName]

          default:
            // Return named agent proxy for any other string property
            return createNamedAgentProxy(prop, options)
        }
      },
    }
  )

  return proxy
}

// Create the main worker proxy instance
export const 人: WorkerProxy = createWorkerProxy()
export const worker: WorkerProxy = 人
