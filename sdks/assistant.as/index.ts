/**
 * assistant.as - What do you want your assistant to be?
 *
 * Create personalized AI assistants with custom personalities,
 * knowledge, and capabilities.
 *
 * @see https://assistant.as
 *
 * @example
 * ```typescript
 * import { assistant } from 'assistant.as'
 *
 * // Define with tagged template
 * const jarvis = await assistant.as`
 *   A professional executive assistant named Jarvis
 *   who helps manage my schedule, emails, and meetings
 *   with a formal but warm communication style
 * `
 *
 * // Use pre-built templates
 * const exec = assistant.executive({ name: 'Alex' })
 * const tech = assistant.technical({ specialization: 'cloud architecture' })
 * const creative = assistant.creative({ style: 'brainstorming partner' })
 *
 * // Then use them
 * await jarvis.do`Clear my calendar for Friday afternoon`
 * await exec.do`Prepare briefing notes for my 3pm meeting`
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Types
export interface AssistantDefinition {
  /** Assistant name */
  name: string
  /** Role/title */
  role?: string
  /** Personality description */
  personality?: string
  /** Communication style */
  style?: 'formal' | 'casual' | 'technical' | 'friendly' | 'concise'
  /** Areas of expertise */
  expertise?: string[]
  /** Available integrations */
  integrations?: string[]
  /** Custom instructions */
  instructions?: string
  /** Knowledge sources */
  knowledge?: string[]
  /** Working hours (for scheduling) */
  workingHours?: { start: string; end: string; timezone: string }
  /** Preferred language */
  language?: string
}

export interface AssistantProfile {
  id: string
  definition: AssistantDefinition
  createdAt: Date
  updatedAt: Date
  usageStats: {
    totalTasks: number
    thisMonth: number
  }
}

export interface DoResult {
  id: string
  content: string
  data?: Record<string, unknown>
  usage: { tokens: number; cost: number }
}

// Instantiated assistant interface
export interface PersonalAssistant {
  /** Assistant name */
  name: string
  /** Profile ID */
  profileId: string

  /**
   * Ask the assistant to do something
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
   * Teach the assistant something
   */
  teach(knowledge: string): Promise<void>

  /**
   * Update preferences
   */
  configure(updates: Partial<AssistantDefinition>): Promise<AssistantProfile>

  /**
   * Get conversation history
   */
  history(limit?: number): Promise<Array<{ role: string; content: string; timestamp: Date }>>

  /**
   * Clear conversation history
   */
  clearHistory(): Promise<void>
}

// Pre-built assistant types
export interface ExecutiveAssistant extends PersonalAssistant {
  role: 'Executive Assistant'
  /** Manage calendar */
  calendar(instruction: string): Promise<DoResult>
  /** Handle email */
  email(instruction: string): Promise<DoResult>
  /** Prepare briefings */
  brief(topic: string): Promise<string>
  /** Meeting prep */
  prepMeeting(meetingId: string): Promise<{ agenda: string; notes: string; attendees: string[] }>
}

export interface TechnicalAssistant extends PersonalAssistant {
  role: 'Technical Assistant'
  /** Explain technical concepts */
  explain(topic: string): Promise<string>
  /** Debug code */
  debug(code: string, error: string): Promise<{ solution: string; explanation: string }>
  /** Architecture advice */
  architect(requirements: string): Promise<{ design: string; considerations: string[] }>
  /** Documentation */
  document(code: string): Promise<string>
}

export interface CreativeAssistant extends PersonalAssistant {
  role: 'Creative Assistant'
  /** Brainstorm ideas */
  brainstorm(topic: string): Promise<string[]>
  /** Generate content */
  create(brief: string): Promise<string>
  /** Provide feedback */
  feedback(content: string): Promise<{ feedback: string; suggestions: string[] }>
  /** Variations */
  variations(content: string, count?: number): Promise<string[]>
}

export interface ResearchAssistant extends PersonalAssistant {
  role: 'Research Assistant'
  /** Deep research */
  research(topic: string): Promise<{ findings: string; sources: string[] }>
  /** Fact check */
  verify(claim: string): Promise<{ verified: boolean; evidence: string[] }>
  /** Compare options */
  compare(options: string[]): Promise<{ analysis: string; recommendation: string }>
  /** Literature review */
  review(topic: string): Promise<{ summary: string; papers: string[] }>
}

export interface PersonalAssistantTemplate extends PersonalAssistant {
  role: 'Personal Assistant'
  /** Daily briefing */
  briefing(): Promise<string>
  /** Task management */
  tasks(action: 'list' | 'add' | 'complete', task?: string): Promise<string[] | void>
  /** Reminders */
  remind(what: string, when: string): Promise<{ id: string }>
  /** Life admin */
  admin(request: string): Promise<DoResult>
}

// Client interface
export interface AssistantAsClient {
  /**
   * Create an assistant from natural language
   *
   * @example
   * ```typescript
   * const friday = await assistant.as`
   *   A witty assistant named Friday who helps with
   *   technical tasks and has a dry sense of humor
   * `
   * ```
   */
  as: TaggedTemplate<Promise<PersonalAssistant>>

  /**
   * Create with structured definition
   */
  create(definition: AssistantDefinition): Promise<AssistantProfile>

  /**
   * Load an existing assistant
   */
  load(profileId: string): Promise<PersonalAssistant>

  /**
   * Pre-built assistant templates
   */
  executive(options?: { name?: string }): ExecutiveAssistant
  technical(options?: { specialization?: string }): TechnicalAssistant
  creative(options?: { style?: string }): CreativeAssistant
  research(options?: { domain?: string }): ResearchAssistant
  personal(options?: { name?: string }): PersonalAssistantTemplate

  /**
   * List all assistants
   */
  list(): Promise<AssistantProfile[]>

  /**
   * Delete an assistant
   */
  delete(profileId: string): Promise<void>

  /**
   * Clone an assistant
   */
  clone(profileId: string, newName: string): Promise<AssistantProfile>

  /**
   * List available templates
   */
  templates(): Promise<Array<{ role: string; description: string }>>
}

/**
 * Create a configured assistant.as client
 */
export function Assistant(options?: ClientOptions): AssistantAsClient {
  return createClient<AssistantAsClient>('https://assistant.as', options)
}

/**
 * Default assistant.as client instance
 */
export const assistant: AssistantAsClient = Assistant()

// Convenience exports
export const executive = (opts?: { name?: string }) => assistant.executive(opts)
export const technical = (opts?: { specialization?: string }) => assistant.technical(opts)
export const creative = (opts?: { style?: string }) => assistant.creative(opts)
export const research = (opts?: { domain?: string }) => assistant.research(opts)
export const personal = (opts?: { name?: string }) => assistant.personal(opts)

export default assistant

// Re-export types
export type { ClientOptions } from 'rpc.do'
