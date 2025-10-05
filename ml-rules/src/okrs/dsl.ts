/**
 * OKR Definition DSL - TypeScript DSL for defining business OKRs as reward functions
 *
 * Example:
 * ```typescript
 * const okr = createOKR('Q1 2025 Growth')
 *   .withObjective('Maximize sustainable revenue growth')
 *   .withKeyResult('revenue', 100000, 'maximize', { weight: 0.5, unit: 'USD' })
 *   .withKeyResult('retention', 0.85, 'maximize', { weight: 0.3 })
 *   .withKeyResult('churn', 0.05, 'minimize', { weight: 0.2 })
 *   .withConstraint('support_satisfaction', 'gte', 0.9, { penalty: 10 })
 *   .withNorthStar('customer_lifetime_value')
 *   .build()
 * ```
 */

import type { OKR, KeyResult, Constraint, NorthStarMetric } from '../types'

export class OKRBuilder {
  private id: string
  private objective: string = ''
  private keyResults: KeyResult[] = []
  private constraints: Constraint[] = []
  private northStar?: NorthStarMetric

  constructor(id: string) {
    this.id = id
  }

  /**
   * Define the objective (qualitative goal)
   */
  withObjective(objective: string): this {
    this.objective = objective
    return this
  }

  /**
   * Add a key result (quantitative measure)
   */
  withKeyResult(
    metric: string,
    target: number,
    direction: 'maximize' | 'minimize',
    options: {
      weight?: number
      unit?: string
      description?: string
    } = {}
  ): this {
    const kr: KeyResult = {
      id: `kr_${this.keyResults.length + 1}`,
      description: options.description || `${direction} ${metric}`,
      metric,
      target,
      current: 0,
      weight: options.weight || 1.0 / (this.keyResults.length + 1), // Auto-balance weights
      direction,
      unit: options.unit,
    }

    this.keyResults.push(kr)
    this.normalizeWeights()
    return this
  }

  /**
   * Add a constraint (hard requirement)
   */
  withConstraint(metric: string, operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq', threshold: number, options: { penalty?: number; description?: string } = {}): this {
    const constraint: Constraint = {
      id: `constraint_${this.constraints.length + 1}`,
      description: options.description || `${metric} ${operator} ${threshold}`,
      metric,
      operator,
      threshold,
      penalty: options.penalty || 1.0,
    }

    this.constraints.push(constraint)
    return this
  }

  /**
   * Define north star metric (single most important metric)
   */
  withNorthStar(metric: string, options: { description?: string; formula?: string } = {}): this {
    this.northStar = {
      metric,
      description: options.description || `North star metric: ${metric}`,
      formula: options.formula,
    }
    return this
  }

  /**
   * Normalize key result weights to sum to 1.0
   */
  private normalizeWeights(): void {
    const total = this.keyResults.reduce((sum, kr) => sum + kr.weight, 0)
    if (total > 0) {
      this.keyResults.forEach(kr => {
        kr.weight = kr.weight / total
      })
    }
  }

  /**
   * Build the OKR
   */
  build(): OKR {
    if (!this.objective) {
      throw new Error('OKR must have an objective')
    }
    if (this.keyResults.length === 0) {
      throw new Error('OKR must have at least one key result')
    }

    const now = Date.now()
    return {
      id: this.id,
      objective: this.objective,
      keyResults: this.keyResults,
      constraints: this.constraints,
      northStar: this.northStar,
      created_at: now,
      updated_at: now,
    }
  }
}

/**
 * Create a new OKR builder
 */
export function createOKR(id: string): OKRBuilder {
  return new OKRBuilder(id)
}

/**
 * Example OKRs for different business use cases
 */
export const exampleOKRs = {
  /**
   * Revenue Optimization OKR
   */
  revenueOptimization: createOKR('revenue_optimization_q1_2025')
    .withObjective('Maximize sustainable revenue growth while maintaining quality')
    .withKeyResult('monthly_recurring_revenue', 100000, 'maximize', {
      weight: 0.5,
      unit: 'USD',
      description: 'Increase MRR to $100k',
    })
    .withKeyResult('customer_acquisition_cost', 50, 'minimize', {
      weight: 0.2,
      unit: 'USD',
      description: 'Reduce CAC below $50',
    })
    .withKeyResult('conversion_rate', 0.05, 'maximize', {
      weight: 0.3,
      description: 'Increase conversion rate to 5%',
    })
    .withConstraint('customer_satisfaction', 'gte', 0.9, {
      penalty: 10,
      description: 'Maintain CSAT above 90%',
    })
    .withConstraint('refund_rate', 'lte', 0.02, {
      penalty: 5,
      description: 'Keep refund rate below 2%',
    })
    .withNorthStar('customer_lifetime_value', {
      description: 'Total revenue per customer over lifetime',
      formula: 'arpu * (1 / churn_rate)',
    })
    .build(),

  /**
   * User Engagement OKR
   */
  userEngagement: createOKR('user_engagement_q1_2025')
    .withObjective('Increase user engagement and retention')
    .withKeyResult('daily_active_users', 10000, 'maximize', {
      weight: 0.4,
      description: 'Reach 10k DAU',
    })
    .withKeyResult('session_duration', 600, 'maximize', {
      weight: 0.3,
      unit: 'seconds',
      description: 'Increase avg session to 10 min',
    })
    .withKeyResult('retention_7d', 0.6, 'maximize', {
      weight: 0.3,
      description: 'Improve 7-day retention to 60%',
    })
    .withConstraint('crash_rate', 'lte', 0.01, {
      penalty: 20,
      description: 'Keep crash rate below 1%',
    })
    .withNorthStar('engaged_time_per_user', {
      description: 'Total engaged time per user per week',
    })
    .build(),

  /**
   * Product Quality OKR
   */
  productQuality: createOKR('product_quality_q1_2025')
    .withObjective('Deliver high-quality, reliable product experience')
    .withKeyResult('net_promoter_score', 50, 'maximize', {
      weight: 0.4,
      description: 'Achieve NPS of 50+',
    })
    .withKeyResult('bug_resolution_time', 24, 'minimize', {
      weight: 0.3,
      unit: 'hours',
      description: 'Reduce bug fix time to <24h',
    })
    .withKeyResult('feature_adoption_rate', 0.4, 'maximize', {
      weight: 0.3,
      description: 'Increase new feature adoption to 40%',
    })
    .withConstraint('uptime', 'gte', 0.999, {
      penalty: 50,
      description: 'Maintain 99.9% uptime',
    })
    .withNorthStar('customer_satisfaction_score', {
      description: 'Overall customer satisfaction',
    })
    .build(),

  /**
   * Marketplace Growth OKR
   */
  marketplaceGrowth: createOKR('marketplace_growth_q1_2025')
    .withObjective('Grow marketplace supply and demand')
    .withKeyResult('total_listings', 5000, 'maximize', {
      weight: 0.3,
      description: 'Reach 5k active listings',
    })
    .withKeyResult('transaction_volume', 500000, 'maximize', {
      weight: 0.4,
      unit: 'USD',
      description: 'Process $500k in transactions',
    })
    .withKeyResult('seller_activation_rate', 0.7, 'maximize', {
      weight: 0.3,
      description: 'Increase seller activation to 70%',
    })
    .withConstraint('fraud_rate', 'lte', 0.001, {
      penalty: 100,
      description: 'Keep fraud rate below 0.1%',
    })
    .withConstraint('average_delivery_time', 'lte', 3, {
      penalty: 10,
      unit: 'days',
      description: 'Maintain delivery time under 3 days',
    })
    .withNorthStar('gross_merchandise_value', {
      description: 'Total value of goods sold',
    })
    .build(),

  /**
   * Pricing Optimization OKR
   */
  pricingOptimization: createOKR('pricing_optimization_q1_2025')
    .withObjective('Optimize pricing for revenue and retention')
    .withKeyResult('average_revenue_per_user', 50, 'maximize', {
      weight: 0.5,
      unit: 'USD',
      description: 'Increase ARPU to $50',
    })
    .withKeyResult('price_sensitivity_index', 0.3, 'minimize', {
      weight: 0.2,
      description: 'Reduce price sensitivity',
    })
    .withKeyResult('upgrade_conversion_rate', 0.15, 'maximize', {
      weight: 0.3,
      description: 'Increase upgrade rate to 15%',
    })
    .withConstraint('churn_rate', 'lte', 0.05, {
      penalty: 20,
      description: 'Keep monthly churn below 5%',
    })
    .withNorthStar('revenue_per_active_user', {
      description: 'Revenue generated per active user',
      formula: 'total_revenue / active_users',
    })
    .build(),
}

/**
 * Utility: Validate OKR definition
 */
export function validateOKR(okr: OKR): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!okr.objective) {
    errors.push('Objective is required')
  }

  if (okr.keyResults.length === 0) {
    errors.push('At least one key result is required')
  }

  const totalWeight = okr.keyResults.reduce((sum, kr) => sum + kr.weight, 0)
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    errors.push(`Key result weights must sum to 1.0 (current: ${totalWeight})`)
  }

  okr.keyResults.forEach((kr, idx) => {
    if (kr.weight < 0 || kr.weight > 1) {
      errors.push(`Key result ${idx + 1} weight must be between 0 and 1`)
    }
    if (kr.target <= 0) {
      errors.push(`Key result ${idx + 1} target must be positive`)
    }
  })

  okr.constraints.forEach((c, idx) => {
    if (c.penalty < 0) {
      errors.push(`Constraint ${idx + 1} penalty must be non-negative`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Utility: Calculate OKR progress
 */
export function calculateOKRProgress(okr: OKR): {
  overall: number
  keyResults: Array<{ id: string; metric: string; progress: number; achieved: boolean }>
} {
  const krProgress = okr.keyResults.map(kr => {
    const progress = kr.direction === 'maximize' ? Math.min(kr.current / kr.target, 1.0) : Math.max(1.0 - kr.current / kr.target, 0.0)

    return {
      id: kr.id,
      metric: kr.metric,
      progress,
      achieved: progress >= 1.0,
    }
  })

  const overall = okr.keyResults.reduce((sum, kr, idx) => {
    return sum + kr.weight * krProgress[idx].progress
  }, 0)

  return { overall, keyResults: krProgress }
}
