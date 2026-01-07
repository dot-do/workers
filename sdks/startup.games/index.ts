/**
 * startup.games SDK
 *
 * Gamified entrepreneurship - test business models, compete, and learn startup skills.
 *
 * @example
 * ```typescript
 * import { games, Games } from 'startup.games'
 *
 * // Start a business simulation
 * const sim = await games.simulate({
 *   model: 'saas-b2b',
 *   market: 'developer-tools',
 *   initialCapital: 50000
 * })
 *
 * // Make strategic decisions
 * await sim.decide({ action: 'hire', role: 'engineer' })
 * await sim.decide({ action: 'launch', feature: 'api-v2' })
 *
 * // See outcomes
 * const results = await sim.advance({ months: 3 })
 * ```
 */

import { createClient, getDefaultApiKeySync, type ClientOptions } from '@dotdo/rpc-client'

// =============================================================================
// Types
// =============================================================================

export interface BusinessModel {
  type: 'saas' | 'marketplace' | 'ecommerce' | 'agency' | 'media' | 'fintech'
  variant?: string
  metrics: ModelMetrics
}

export interface ModelMetrics {
  cac: number // Customer acquisition cost
  ltv: number // Lifetime value
  churn: number // Monthly churn rate
  margins: number // Gross margins
  payback: number // Months to payback CAC
}

export interface SimulationConfig {
  model: string
  market: string
  initialCapital?: number
  teamSize?: number
  difficulty?: 'easy' | 'normal' | 'hard' | 'nightmare'
}

export interface Simulation {
  id: string
  state: SimulationState
  decide(decision: Decision): Promise<DecisionOutcome>
  advance(options: { months: number }): Promise<SimulationResults>
  getMetrics(): Promise<SimulationMetrics>
  save(): Promise<string>
  load(saveId: string): Promise<void>
}

export interface SimulationState {
  month: number
  capital: number
  revenue: number
  customers: number
  team: TeamMember[]
  product: ProductState
  market: MarketConditions
}

export interface TeamMember {
  role: string
  skill: number
  salary: number
  morale: number
}

export interface ProductState {
  features: string[]
  quality: number
  marketFit: number
}

export interface MarketConditions {
  demand: number
  competition: number
  sentiment: number
}

export interface Decision {
  action: 'hire' | 'fire' | 'launch' | 'pivot' | 'raise' | 'market' | 'build'
  [key: string]: unknown
}

export interface DecisionOutcome {
  success: boolean
  effects: Effect[]
  narrative: string
}

export interface Effect {
  metric: string
  delta: number
  reason: string
}

export interface SimulationResults {
  month: number
  state: SimulationState
  events: GameEvent[]
  score: number
}

export interface SimulationMetrics {
  burnRate: number
  runway: number
  mrr: number
  arr: number
  growthRate: number
  nps: number
}

export interface GameEvent {
  type: 'opportunity' | 'challenge' | 'milestone' | 'crisis'
  title: string
  description: string
  choices?: Choice[]
}

export interface Choice {
  id: string
  label: string
  risk: number
  reward: number
}

export interface Challenge {
  id: string
  name: string
  description: string
  difficulty: number
  timeLimit?: number
  rewards: Reward[]
}

export interface Reward {
  type: 'xp' | 'badge' | 'unlock' | 'credits'
  amount: number
  item?: string
}

export interface Leaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'alltime'
  entries: LeaderboardEntry[]
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  score: number
  startupName: string
  achievement?: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlockedAt?: Date
}

// =============================================================================
// Client Interface
// =============================================================================

export interface GamesClient {
  /**
   * Start a new business simulation
   */
  simulate(config: SimulationConfig): Promise<Simulation>

  /**
   * Load an existing simulation
   */
  loadSimulation(id: string): Promise<Simulation>

  /**
   * Get available business models to simulate
   */
  models(): Promise<BusinessModel[]>

  /**
   * Get available challenges
   */
  challenges(): Promise<Challenge[]>

  /**
   * Attempt a challenge
   */
  attemptChallenge(challengeId: string): Promise<{
    success: boolean
    score: number
    rewards: Reward[]
  }>

  /**
   * Get leaderboards
   */
  leaderboard(options?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'alltime'
    limit?: number
  }): Promise<Leaderboard>

  /**
   * Get user achievements
   */
  achievements(userId?: string): Promise<Achievement[]>

  /**
   * Get user stats
   */
  stats(userId?: string): Promise<{
    simulations: number
    bestScore: number
    totalPlaytime: number
    achievements: number
    rank: number
  }>
}

// =============================================================================
// Client Factory & Default Instance
// =============================================================================

/**
 * Create a startup.games client with custom options
 */
export function Games(options?: ClientOptions): GamesClient {
  return createClient<GamesClient>('https://startup.games', options)
}

/**
 * Default startup.games client instance
 * Uses DO_API_KEY or ORG_AI_API_KEY from environment
 */
export const games: GamesClient = Games({
  apiKey: getDefaultApiKeySync(),
})

export default games
