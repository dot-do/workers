/**
 * Targeting Engine for context-based flag evaluation
 */

import type { EvaluationContext, JsonValue } from '@openfeature/server-sdk'
import type { FlagDefinition, TargetingRule, TargetingCondition, FlagVariant } from './types'

export interface TargetingResult {
  value?: JsonValue
  variant?: string
  reason: string
}

/**
 * TargetingEngine evaluates targeting rules against context
 */
export class TargetingEngine {
  /**
   * Evaluate flag with targeting rules
   */
  async evaluate(flag: FlagDefinition, context: EvaluationContext): Promise<TargetingResult> {
    // No targeting rules - return default
    if (!flag.targeting || flag.targeting.length === 0) {
      return { value: flag.defaultValue, reason: 'DEFAULT' }
    }

    // Evaluate each targeting rule in order
    for (const rule of flag.targeting) {
      if (!rule.enabled) continue

      const matches = this.evaluateRule(rule, context)
      if (matches) {
        // Rule matched - return variant or value
        if (rule.variant && flag.variants) {
          const variant = flag.variants.find((v) => v.name === rule.variant)
          if (variant) {
            return { value: variant.value, variant: variant.name, reason: 'TARGETING_MATCH' }
          }
        }
        if (rule.value !== undefined) {
          return { value: rule.value, reason: 'TARGETING_MATCH' }
        }
      }
    }

    // No rules matched - use variant distribution if available
    if (flag.variants && flag.variants.length > 0) {
      const variant = this.selectVariant(flag.variants, context)
      return { value: variant.value, variant: variant.name, reason: 'VARIANT_DISTRIBUTION' }
    }

    // Fallback to default
    return { value: flag.defaultValue, reason: 'DEFAULT' }
  }

  /**
   * Evaluate a single targeting rule
   */
  private evaluateRule(rule: TargetingRule, context: EvaluationContext): boolean {
    // All conditions must match (AND logic)
    return rule.conditions.every((condition) => this.evaluateCondition(condition, context))
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: TargetingCondition, context: EvaluationContext): boolean {
    const contextValue = this.getContextValue(condition.property, context)

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value
      case 'notEquals':
        return contextValue !== condition.value
      case 'contains':
        return typeof contextValue === 'string' && typeof condition.value === 'string' && contextValue.includes(condition.value)
      case 'notContains':
        return typeof contextValue === 'string' && typeof condition.value === 'string' && !contextValue.includes(condition.value)
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue)
      case 'notIn':
        return Array.isArray(condition.value) && !condition.value.includes(contextValue)
      case 'greaterThan':
        return typeof contextValue === 'number' && typeof condition.value === 'number' && contextValue > condition.value
      case 'lessThan':
        return typeof contextValue === 'number' && typeof condition.value === 'number' && contextValue < condition.value
      case 'matches':
        return typeof contextValue === 'string' && typeof condition.value === 'string' && new RegExp(condition.value).test(contextValue)
      default:
        return false
    }
  }

  /**
   * Get value from context by property path
   * Supports dot notation: "user.email", "session.country"
   */
  private getContextValue(property: string, context: EvaluationContext): JsonValue {
    const parts = property.split('.')
    let value: any = context

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return undefined
      }
    }

    return value as JsonValue
  }

  /**
   * Select variant based on weighted distribution
   * Uses targetingKey for consistent bucketing
   */
  private selectVariant(variants: FlagVariant[], context: EvaluationContext): FlagVariant {
    const targetingKey = context.targetingKey || 'anonymous'

    // Calculate total weight
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)

    // Hash targeting key to get consistent bucket (0-100)
    const bucket = this.hashToBucket(targetingKey, totalWeight)

    // Select variant based on bucket
    let cumulativeWeight = 0
    for (const variant of variants) {
      cumulativeWeight += variant.weight
      if (bucket < cumulativeWeight) {
        return variant
      }
    }

    // Fallback to first variant
    return variants[0]
  }

  /**
   * Hash string to bucket (0-max)
   * Simple hash function for consistent bucketing
   */
  private hashToBucket(str: string, max: number): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) % max
  }
}
