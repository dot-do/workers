/**
 * assistants.do - What do you want assistants to .do for you?
 *
 * Personal AI assistants that help with daily tasks.
 * Email, calendar, research, writing, and more.
 *
 * @see https://assistants.do
 *
 * @example
 * ```typescript
 * import assistants from 'assistants.do'
 *
 * // Tagged template - just ask
 * await assistants.do`Schedule a meeting with the team for next Tuesday`
 *
 * // With context
 * const emails = await getUnreadEmails()
 * await assistants.do`Summarize these emails and draft responses: ${emails}`
 *
 * // Specific assistant actions
 * await assistants.email`Draft a follow-up to ${clientName} about the proposal`
 * await assistants.calendar`Find a time for a 1-hour meeting with ${attendees}`
 * await assistants.research`Find the top 5 competitors to ${company}`
 * ```
 */

import { createClient, tagged, type ClientOptions, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Types
export interface TaskResult {
  id: string
  content: string
  data?: Record<string, unknown>
  actions?: CompletedAction[]
  usage: { tokens: number; cost: number }
}

export interface CompletedAction {
  type: string
  description: string
  result: unknown
}

export interface Email {
  id: string
  to: string[]
  cc?: string[]
  subject: string
  body: string
  draft: boolean
  scheduledFor?: Date
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  attendees?: string[]
  location?: string
  description?: string
  meetingLink?: string
}

export interface Reminder {
  id: string
  message: string
  when: Date
  recurring?: string
}

export interface ResearchResult {
  query: string
  findings: string[]
  sources: Array<{ title: string; url: string; snippet: string }>
  summary: string
}

// Client interface
export interface AssistantsClient {
  /**
   * Ask assistants to do anything
   *
   * @example
   * ```typescript
   * await assistants.do`Book a restaurant for 4 people tonight`
   * ```
   */
  do: TaggedTemplate<Promise<TaskResult>>

  /**
   * Stream a response
   */
  stream: TaggedTemplate<AsyncIterable<string>>

  // Domain-specific assistants

  /**
   * Email assistant
   *
   * @example
   * ```typescript
   * await assistants.email`Draft a thank you note to ${name}`
   * ```
   */
  email: TaggedTemplate<Promise<Email>>

  /**
   * Calendar assistant
   *
   * @example
   * ```typescript
   * await assistants.calendar`Schedule a standup every weekday at 9am`
   * ```
   */
  calendar: TaggedTemplate<Promise<CalendarEvent>>

  /**
   * Research assistant
   *
   * @example
   * ```typescript
   * const research = await assistants.research`Market size for ${industry}`
   * ```
   */
  research: TaggedTemplate<Promise<ResearchResult>>

  /**
   * Writing assistant
   *
   * @example
   * ```typescript
   * const post = await assistants.write`Blog post about ${topic}`
   * ```
   */
  write: TaggedTemplate<Promise<string>>

  /**
   * Reminder assistant
   *
   * @example
   * ```typescript
   * await assistants.remind`Call mom on Sunday`
   * ```
   */
  remind: TaggedTemplate<Promise<Reminder>>

  /**
   * Summary assistant
   *
   * @example
   * ```typescript
   * const summary = await assistants.summarize`${longDocument}`
   * ```
   */
  summarize: TaggedTemplate<Promise<string>>

  // Management

  /**
   * List pending tasks
   */
  tasks(options?: { status?: 'pending' | 'completed' | 'failed' }): Promise<TaskResult[]>

  /**
   * List scheduled emails
   */
  drafts(): Promise<Email[]>

  /**
   * List upcoming events
   */
  events(options?: { start?: Date; end?: Date }): Promise<CalendarEvent[]>

  /**
   * List reminders
   */
  reminders(): Promise<Reminder[]>

  /**
   * Cancel a scheduled action
   */
  cancel(taskId: string): Promise<void>

  /**
   * Connect an integration (Google, Outlook, etc.)
   */
  connect(integration: string): Promise<{ authUrl: string }>

  /**
   * List connected integrations
   */
  integrations(): Promise<Array<{ name: string; status: 'connected' | 'expired' }>>
}

/**
 * Create a configured assistants client
 */
export function Assistants(options?: ClientOptions): AssistantsClient {
  return createClient<AssistantsClient>('https://assistants.do', options)
}

/**
 * Default assistants client instance
 */
export const assistants: AssistantsClient = Assistants()

export default assistants

// Re-export types
export type { ClientOptions } from 'rpc.do'
