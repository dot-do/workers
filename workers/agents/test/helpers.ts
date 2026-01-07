/**
 * Test helpers for agents.do worker tests
 *
 * Provides mock implementations for AgentsDO testing.
 */
import { vi } from 'vitest'

// Types
export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface AgentConfig {
  /** Agent name */
  name?: string
  /** What the agent does */
  task: string
  /** Agent capabilities */
  capabilities?: string[]
  /** Tools the agent can use */
  tools?: string[]
  /** Schedule for recurring tasks */
  schedule?: string
  /** Webhook for notifications */
  webhook?: string
  /** Max execution time in seconds */
  timeout?: number
  /** Memory/context persistence */
  memory?: boolean
}

export interface Agent {
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

export interface AgentRun {
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

export interface AgentLog {
  timestamp: string
  level: LogLevel
  message: string
  data?: Record<string, unknown>
}

export interface OrchestrationResult {
  id: string
  agents: Array<{ id: string; name: string; status: string }>
  result: Record<string, unknown>
  usage: { tokens: number; cost: number; duration: number }
}

export interface AgentType {
  type: string
  description: string
  capabilities: string[]
}

export interface MockDOId {
  name?: string
  toString(): string
  equals(other: MockDOId): boolean
}

export interface MockDOStorage {
  get: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  deleteAll: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
  transaction: ReturnType<typeof vi.fn>
  setAlarm: ReturnType<typeof vi.fn>
  getAlarm: ReturnType<typeof vi.fn>
  deleteAlarm: ReturnType<typeof vi.fn>
}

export interface MockDOState {
  id: MockDOId
  storage: MockDOStorage
  blockConcurrencyWhile: ReturnType<typeof vi.fn>
  acceptWebSocket: ReturnType<typeof vi.fn>
  getWebSockets: ReturnType<typeof vi.fn>
  setWebSocketAutoResponse: ReturnType<typeof vi.fn>
}

export interface MockAgentsEnv {
  AGENTS_DO: {
    get: ReturnType<typeof vi.fn>
    idFromName: ReturnType<typeof vi.fn>
  }
  LLM?: {
    complete: ReturnType<typeof vi.fn>
    stream: ReturnType<typeof vi.fn>
  }
}

/**
 * Create a mock DurableObjectId
 */
export function createMockId(name?: string): MockDOId {
  const idString = name ?? `mock-id-${Math.random().toString(36).slice(2, 10)}`
  return {
    name,
    toString: () => idString,
    equals: (other: MockDOId) => other.toString() === idString,
  }
}

/**
 * Create a mock DOStorage with optional initial data
 */
export function createMockStorage(initialData?: Record<string, unknown>): MockDOStorage {
  const store = new Map<string, unknown>()
  let alarm: number | null = null

  if (initialData) {
    for (const [key, value] of Object.entries(initialData)) {
      store.set(key, value)
    }
  }

  // Implementation functions with proper behavior
  const getImpl = async (keyOrKeys: string | string[]) => {
    if (Array.isArray(keyOrKeys)) {
      const result = new Map<string, unknown>()
      for (const key of keyOrKeys) {
        const value = store.get(key)
        if (value !== undefined) result.set(key, value)
      }
      return result
    }
    return store.get(keyOrKeys)
  }

  const putImpl = async (keyOrEntries: string | Record<string, unknown>, value?: unknown) => {
    if (typeof keyOrEntries === 'string') {
      store.set(keyOrEntries, value)
    } else {
      for (const [k, v] of Object.entries(keyOrEntries)) {
        store.set(k, v)
      }
    }
  }

  const deleteImpl = async (keyOrKeys: string | string[]) => {
    if (Array.isArray(keyOrKeys)) {
      let count = 0
      for (const key of keyOrKeys) {
        if (store.delete(key)) count++
      }
      return count
    }
    return store.delete(keyOrKeys)
  }

  const deleteAllImpl = async () => {
    store.clear()
  }

  const listImpl = async (options?: { prefix?: string; limit?: number }) => {
    let entries = Array.from(store.entries())
    if (options?.prefix) {
      entries = entries.filter(([key]) => key.startsWith(options.prefix!))
    }
    entries.sort(([a], [b]) => a.localeCompare(b))
    if (options?.limit !== undefined) {
      entries = entries.slice(0, options.limit)
    }
    return new Map(entries)
  }

  // Create storage object
  const storage: MockDOStorage = {
    get: vi.fn(getImpl),
    put: vi.fn(putImpl),
    delete: vi.fn(deleteImpl),
    deleteAll: vi.fn(deleteAllImpl),
    list: vi.fn(listImpl),
    transaction: vi.fn(async (closure: (txn: MockDOStorage) => Promise<unknown>) => {
      return closure(storage)
    }),
    setAlarm: vi.fn(async (time: number | Date) => {
      alarm = typeof time === 'number' ? time : time.getTime()
    }),
    getAlarm: vi.fn(async () => alarm),
    deleteAlarm: vi.fn(async () => {
      alarm = null
    }),
  }

  return storage
}

/**
 * Create a mock DOState
 */
export function createMockState(options?: {
  id?: MockDOId
  storage?: MockDOStorage
  initialData?: Record<string, unknown>
}): MockDOState {
  const id = options?.id ?? createMockId()
  const storage = options?.storage ?? createMockStorage(options?.initialData)

  return {
    id,
    storage,
    blockConcurrencyWhile: vi.fn(async (callback: () => Promise<unknown>) => callback()),
    acceptWebSocket: vi.fn(),
    getWebSockets: vi.fn(() => []),
    setWebSocketAutoResponse: vi.fn(),
  }
}

/**
 * Create mock environment
 */
export function createMockEnv(): MockAgentsEnv {
  return {
    AGENTS_DO: {
      get: vi.fn(),
      idFromName: vi.fn((name: string) => createMockId(name)),
    },
    LLM: {
      complete: vi.fn(async () => ({ text: 'Mock LLM response', usage: { tokens: 100 } })),
      stream: vi.fn(),
    },
  }
}

/**
 * Create a mock agent for testing
 */
export function createMockAgent(overrides?: Partial<Agent>): Agent {
  const now = new Date().toISOString()
  return {
    id: `agent-${Math.random().toString(36).slice(2, 10)}`,
    name: 'Test Agent',
    task: 'Test task description',
    status: 'idle',
    capabilities: [],
    tools: [],
    createdAt: now,
    runs: 0,
    ...overrides,
  }
}

/**
 * Create a mock agent run for testing
 */
export function createMockRun(overrides?: Partial<AgentRun>): AgentRun {
  const now = new Date().toISOString()
  return {
    id: `run-${Math.random().toString(36).slice(2, 10)}`,
    agentId: `agent-${Math.random().toString(36).slice(2, 10)}`,
    status: 'queued',
    logs: [],
    usage: { tokens: 0, cost: 0, duration: 0 },
    startedAt: now,
    ...overrides,
  }
}
