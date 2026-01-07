/**
 * agent.as - What do you want your agent to be?
 *
 * Define agent personalities, capabilities, and behaviors.
 * agent.as/researcher, agent.as/assistant, agent.as/analyst
 *
 * @see https://agent.as
 *
 * @example
 * ```typescript
 * import { agent } from 'agent.as'
 *
 * // Define an agent with tagged template
 * const researcher = agent.as`
 *   A research agent that finds and synthesizes information
 *   from academic papers, news, and technical blogs
 * `
 *
 * // Use pre-built agent types
 * const assistant = agent.assistant({ name: 'Alex' })
 * const analyst = agent.analyst({ domain: 'finance' })
 *
 * // Create custom agent definitions
 * const custom = agent.define({
 *   role: 'Customer Success Manager',
 *   personality: 'friendly and proactive',
 *   capabilities: ['email', 'calendar', 'crm'],
 *   goals: ['customer satisfaction', 'retention']
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface AgentDefinition {
  /** Agent role/name */
  role: string
  /** Personality traits */
  personality?: string
  /** What the agent can do */
  capabilities?: string[]
  /** Tools the agent can use */
  tools?: string[]
  /** What the agent optimizes for */
  goals?: string[]
  /** Boundaries and limitations */
  constraints?: string[]
  /** Domain expertise */
  domain?: string
  /** Communication style */
  style?: 'formal' | 'casual' | 'technical' | 'friendly'
  /** Knowledge sources */
  knowledge?: string[]
  /** Triggers that activate the agent */
  triggers?: string[]
}

export interface AgentBlueprint {
  id: string
  definition: AgentDefinition
  version: string
  createdAt: Date
  updatedAt: Date
}

export interface AgentInstance {
  id: string
  blueprintId: string
  status: 'active' | 'paused' | 'archived'
  context: Record<string, unknown>
  memory: string[]
  createdAt: Date
}

export interface DoOptions {
  /** Additional context */
  context?: string | Record<string, unknown>
  /** Output format */
  format?: 'text' | 'json' | 'markdown'
}

export interface DoResult {
  id: string
  content: string
  data?: Record<string, unknown>
  usage: { tokens: number; cost: number }
}

// Tagged template helper type
type TaggedTemplate<T> = {
  (strings: TemplateStringsArray, ...values: unknown[]): T
  (prompt: string, options?: DoOptions): T
}

/**
 * Helper to create tagged template functions
 */
function tagged<T>(fn: (prompt: string, options?: DoOptions) => T): TaggedTemplate<T> {
  return function (stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): T {
    if (typeof stringsOrPrompt === 'string') {
      return fn(stringsOrPrompt, values[0] as DoOptions | undefined)
    }
    const prompt = stringsOrPrompt.reduce((acc, str, i) =>
      acc + str + (values[i] !== undefined ? String(values[i]) : ''), ''
    )
    return fn(prompt)
  } as TaggedTemplate<T>
}

// Instantiated agent interface
export interface InstantiatedAgent {
  /** The agent's role */
  role: string
  /** Blueprint ID */
  blueprintId: string

  /**
   * Ask the agent to do something
   */
  do: TaggedTemplate<Promise<DoResult>>

  /**
   * Stream a response
   */
  stream: TaggedTemplate<AsyncIterable<string>>

  /**
   * Have a conversation
   */
  chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<DoResult>

  /**
   * Add to agent's memory/context
   */
  remember(info: string): Promise<void>

  /**
   * Clear agent's memory
   */
  forget(): Promise<void>
}

// Pre-built agent type interfaces
export interface AssistantAgent extends InstantiatedAgent {
  role: 'Assistant'
  /** Schedule a task */
  schedule(task: string, when: string | Date): Promise<{ id: string }>
  /** Set a reminder */
  remind(message: string, when: string | Date): Promise<{ id: string }>
  /** Summarize content */
  summarize(content: string): Promise<string>
}

export interface ResearcherAgent extends InstantiatedAgent {
  role: 'Researcher'
  /** Research a topic */
  research(topic: string): Promise<{ findings: string[]; sources: string[] }>
  /** Find sources */
  findSources(query: string): Promise<Array<{ title: string; url: string; summary: string }>>
  /** Synthesize information */
  synthesize(sources: string[]): Promise<string>
}

export interface AnalystAgent extends InstantiatedAgent {
  role: 'Analyst'
  /** Analyze data */
  analyze(data: string | Record<string, unknown>): Promise<{ insights: string[]; recommendations: string[] }>
  /** Generate report */
  report(topic: string, data?: unknown): Promise<string>
  /** Compare options */
  compare(options: string[]): Promise<{ comparison: string; recommendation: string }>
}

export interface WriterAgent extends InstantiatedAgent {
  role: 'Writer'
  /** Write content */
  write(brief: string): Promise<string>
  /** Edit content */
  edit(content: string, instructions?: string): Promise<string>
  /** Generate variations */
  variations(content: string, count?: number): Promise<string[]>
}

export interface CoderAgent extends InstantiatedAgent {
  role: 'Coder'
  /** Write code */
  code(spec: string, language?: string): Promise<string>
  /** Review code */
  review(code: string): Promise<{ feedback: string; suggestions: string[] }>
  /** Debug code */
  debug(code: string, error: string): Promise<{ fix: string; explanation: string }>
  /** Refactor code */
  refactor(code: string, goals?: string[]): Promise<string>
}

// Client interface
export interface AgentAsClient {
  /**
   * Define an agent from natural language description
   *
   * @example
   * ```typescript
   * const myAgent = agent.as`
   *   A friendly assistant that helps with scheduling
   *   and email management
   * `
   * ```
   */
  as: TaggedTemplate<Promise<InstantiatedAgent>>

  /**
   * Define a custom agent with configuration
   */
  define(definition: AgentDefinition): Promise<AgentBlueprint>

  /**
   * Instantiate an agent from a blueprint
   */
  instantiate(blueprintId: string, context?: Record<string, unknown>): Promise<InstantiatedAgent>

  /**
   * Pre-built agent types
   */
  assistant(options?: { name?: string }): AssistantAgent
  researcher(options?: { domain?: string }): ResearcherAgent
  analyst(options?: { domain?: string }): AnalystAgent
  writer(options?: { style?: string }): WriterAgent
  coder(options?: { languages?: string[] }): CoderAgent

  /**
   * Get an agent type by name
   */
  get(role: string): InstantiatedAgent

  /**
   * List all blueprints
   */
  blueprints(): Promise<AgentBlueprint[]>

  /**
   * List all instances
   */
  instances(): Promise<AgentInstance[]>

  /**
   * Archive an instance
   */
  archive(instanceId: string): Promise<void>

  /**
   * List available pre-built agent types
   */
  types(): Promise<Array<{ role: string; description: string; capabilities: string[] }>>
}

/**
 * Create a configured agent.as client
 */
export function Agent(options?: ClientOptions): AgentAsClient {
  return createClient<AgentAsClient>('https://agent.as', options)
}

/**
 * Default agent.as client instance
 */
export const agent: AgentAsClient = Agent({
  apiKey: typeof process !== 'undefined' ? (process.env?.AGENT_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const assistant = (opts?: { name?: string }) => agent.assistant(opts)
export const researcher = (opts?: { domain?: string }) => agent.researcher(opts)
export const analyst = (opts?: { domain?: string }) => agent.analyst(opts)
export const writer = (opts?: { style?: string }) => agent.writer(opts)
export const coder = (opts?: { languages?: string[] }) => agent.coder(opts)

export default agent

// Re-export types
export type { ClientOptions } from 'rpc.do'
