/**
 * agi.as - What do you want AGI to be for you?
 *
 * AGI personas that think and act as specific roles.
 * agi.as/developer, agi.as/ceo, agi.as/pdm, and more.
 *
 * @see https://agi.as
 *
 * @example
 * ```typescript
 * import { as } from 'agi.as'
 *
 * // Get a developer persona
 * const dev = as.developer()
 * const code = await dev.do('Build a REST API for user management')
 *
 * // Get a CEO persona
 * const ceo = as.ceo()
 * const strategy = await ceo.do('Analyze our Q4 performance and recommend pivots')
 *
 * // Get a product manager
 * const pdm = as.pdm()
 * const spec = await pdm.do('Write a PRD for a new onboarding flow')
 *
 * // Custom persona
 * const advisor = as.persona({
 *   role: 'Startup Advisor',
 *   expertise: ['fundraising', 'growth', 'hiring'],
 *   style: 'direct and actionable'
 * })
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface PersonaConfig {
  /** Role name */
  role: string
  /** Areas of expertise */
  expertise?: string[]
  /** Communication style */
  style?: string
  /** Background/context */
  background?: string
  /** Goals this persona optimizes for */
  goals?: string[]
  /** Constraints or limitations */
  constraints?: string[]
}

export interface DoOptions {
  /** Additional context */
  context?: string | Record<string, unknown>
  /** Output format */
  format?: 'text' | 'json' | 'markdown' | 'code'
  /** Max tokens */
  maxTokens?: number
}

export interface DoResult {
  id: string
  content: string
  data?: Record<string, unknown>
  usage: {
    tokens: number
    cost: number
  }
}

export interface Persona {
  /** The persona's role */
  role: string

  /**
   * Ask the persona to do something
   */
  do(prompt: string, options?: DoOptions): Promise<DoResult>

  /**
   * Stream a response
   */
  stream(prompt: string, options?: DoOptions): AsyncIterable<string>

  /**
   * Have a conversation with context
   */
  chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<DoResult>

  /**
   * Get the persona's perspective on something
   */
  think(prompt: string): Promise<DoResult>

  /**
   * Review something from this persona's perspective
   */
  review(content: string, criteria?: string[]): Promise<{
    feedback: string
    score?: number
    suggestions: string[]
  }>
}

// Built-in persona types
export interface DeveloperPersona extends Persona {
  role: 'Developer'
  /** Code review */
  codeReview(code: string, language?: string): Promise<{ feedback: string; suggestions: string[] }>
  /** Debug an issue */
  debug(error: string, context?: string): Promise<{ diagnosis: string; solution: string }>
  /** Architect a solution */
  architect(requirements: string): Promise<{ design: string; components: string[]; tradeoffs: string[] }>
}

export interface CEOPersona extends Persona {
  role: 'CEO'
  /** Strategic analysis */
  strategize(situation: string): Promise<{ analysis: string; recommendations: string[] }>
  /** Decision making */
  decide(options: string[], criteria?: string[]): Promise<{ decision: string; rationale: string }>
  /** Vision setting */
  vision(context: string): Promise<{ vision: string; pillars: string[] }>
}

export interface CTOPersona extends Persona {
  role: 'CTO'
  /** Technical strategy */
  techStrategy(goals: string): Promise<{ strategy: string; roadmap: string[] }>
  /** Architecture review */
  archReview(architecture: string): Promise<{ assessment: string; risks: string[]; recommendations: string[] }>
  /** Build vs buy decision */
  buildOrBuy(requirement: string): Promise<{ recommendation: 'build' | 'buy'; rationale: string }>
}

export interface PDMPersona extends Persona {
  role: 'Product Manager'
  /** Write a PRD */
  prd(feature: string): Promise<{ prd: string; userStories: string[] }>
  /** Prioritize features */
  prioritize(features: string[]): Promise<{ ranked: string[]; rationale: string }>
  /** User research synthesis */
  synthesize(feedback: string[]): Promise<{ insights: string[]; opportunities: string[] }>
}

export interface DesignerPersona extends Persona {
  role: 'Designer'
  /** Design critique */
  critique(design: string): Promise<{ feedback: string; principles: string[] }>
  /** UX recommendations */
  ux(flow: string): Promise<{ recommendations: string[]; wireframe?: string }>
}

export interface MarketingPersona extends Persona {
  role: 'Marketing Lead'
  /** Campaign strategy */
  campaign(product: string, audience: string): Promise<{ strategy: string; channels: string[]; messaging: string }>
  /** Copy writing */
  copy(brief: string): Promise<{ copy: string; variants: string[] }>
}

export interface LawyerPersona extends Persona {
  role: 'Legal Counsel'
  /** Contract review */
  reviewContract(contract: string): Promise<{ risks: string[]; recommendations: string[] }>
  /** Legal advice */
  advise(situation: string): Promise<{ advice: string; caveats: string[] }>
}

export interface CFOPersona extends Persona {
  role: 'CFO'
  /** Financial analysis */
  analyze(data: string): Promise<{ analysis: string; metrics: Record<string, number> }>
  /** Budget recommendation */
  budget(goals: string, constraints: string): Promise<{ budget: Record<string, number>; rationale: string }>
}

// Client interface
export interface AGIAsClient {
  /**
   * Create a custom persona
   */
  persona(config: PersonaConfig): Persona

  /**
   * Built-in personas
   */
  developer(specialization?: string): DeveloperPersona
  ceo(): CEOPersona
  cto(): CTOPersona
  pdm(): PDMPersona
  designer(): DesignerPersona
  marketing(): MarketingPersona
  lawyer(): LawyerPersona
  cfo(): CFOPersona

  /**
   * Get a persona by role name
   */
  get(role: string): Persona

  /**
   * List available personas
   */
  list(): Promise<Array<{ role: string; description: string }>>

  /**
   * Create a team of personas that collaborate
   */
  team(roles: string[]): {
    discuss(topic: string): Promise<{ discussion: string; consensus?: string; disagreements?: string[] }>
    brainstorm(challenge: string): Promise<{ ideas: string[]; topIdea: string }>
    review(content: string): Promise<Array<{ role: string; feedback: string }>>
  }
}

/**
 * Create a configured AGI.as client
 *
 * @example
 * ```typescript
 * import { AS } from 'agi.as'
 * const client = AS({ apiKey: 'xxx' })
 * const dev = client.developer()
 * ```
 */
export function AS(options?: ClientOptions): AGIAsClient {
  return createClient<AGIAsClient>('https://agi.as', options)
}

/**
 * Default AGI.as client instance
 * Uses environment variable AGI_API_KEY or DO_API_KEY if available
 *
 * @example
 * ```typescript
 * import { as } from 'agi.as'
 * const ceo = as.ceo()
 * const strategy = await ceo.do('What should our 2024 priorities be?')
 * ```
 */
export const as: AGIAsClient = AS()

// Convenience exports for direct persona access
export const developer = (spec?: string) => as.developer(spec)
export const ceo = () => as.ceo()
export const cto = () => as.cto()
export const pdm = () => as.pdm()
export const designer = () => as.designer()
export const marketing = () => as.marketing()
export const lawyer = () => as.lawyer()
export const cfo = () => as.cfo()
export const persona = (config: PersonaConfig) => as.persona(config)

// Re-export types
export type { ClientOptions } from 'rpc.do'
