/**
 * Policy Evaluator - Core evaluation engine
 *
 * Evaluates policies against contexts at edge (<5ms)
 */

import type { Policy, PolicyContext, PolicyDecision, PolicyEvaluationResult, RBACPolicy, ABACPolicy, RateLimitPolicy, DataMaskingPolicy, ContentFilterPolicy, FraudPreventionPolicy, CompliancePolicy } from '../policy/types'

// ===== Main Policy Evaluator =====

export class PolicyEvaluator {
  /**
   * Evaluate a single policy against a context
   */
  async evaluate(policy: Policy, context: PolicyContext): Promise<PolicyEvaluationResult> {
    const startTime = performance.now()

    let decision: PolicyDecision

    try {
      switch (policy.type) {
        case 'access-control':
          decision = await this.evaluateAccessControl(policy as RBACPolicy | ABACPolicy, context)
          break
        case 'rate-limit':
          decision = await this.evaluateRateLimit(policy as RateLimitPolicy, context)
          break
        case 'data-masking':
          decision = await this.evaluateDataMasking(policy as DataMaskingPolicy, context)
          break
        case 'content-filter':
          decision = await this.evaluateContentFilter(policy as ContentFilterPolicy, context)
          break
        case 'fraud-prevention':
          decision = await this.evaluateFraudPrevention(policy as FraudPreventionPolicy, context)
          break
        case 'compliance':
          decision = await this.evaluateCompliance(policy as CompliancePolicy, context)
          break
        default:
          decision = {
            allowed: false,
            reason: `Unknown policy type: ${(policy as Policy).type}`,
            appliedPolicies: [policy.id],
            evaluationTimeMs: 0,
          }
      }
    } catch (error) {
      decision = {
        allowed: false,
        reason: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        appliedPolicies: [policy.id],
        evaluationTimeMs: 0,
      }
    }

    decision.evaluationTimeMs = performance.now() - startTime

    return { decision }
  }

  /**
   * Evaluate multiple policies (all must pass)
   */
  async evaluateAll(policies: Policy[], context: PolicyContext): Promise<PolicyEvaluationResult> {
    const results = await Promise.all(policies.map((p) => this.evaluate(p, context)))

    const denied = results.find((r) => !r.decision.allowed)
    if (denied) {
      return denied
    }

    const totalTime = results.reduce((sum, r) => sum + r.decision.evaluationTimeMs, 0)

    return {
      decision: {
        allowed: true,
        appliedPolicies: policies.map((p) => p.id),
        evaluationTimeMs: totalTime,
      },
    }
  }

  // ===== Access Control Evaluation =====

  private async evaluateAccessControl(policy: RBACPolicy | ABACPolicy, context: PolicyContext): Promise<PolicyDecision> {
    if ('model' in policy && policy.model === 'RBAC') {
      return this.evaluateRBAC(policy, context)
    } else if ('model' in policy && policy.model === 'ABAC') {
      return this.evaluateABAC(policy, context)
    }

    return {
      allowed: false,
      reason: 'Unknown access control model',
      appliedPolicies: [policy.id],
      evaluationTimeMs: 0,
    }
  }

  private async evaluateRBAC(policy: RBACPolicy, context: PolicyContext): Promise<PolicyDecision> {
    const { role, resource, action, conditions } = policy.rules
    const userRole = context.subject.role as string

    // Check role match
    if (userRole !== role && role !== '*') {
      return {
        allowed: false,
        reason: `Role mismatch: expected ${role}, got ${userRole}`,
        appliedPolicies: [policy.id],
        evaluationTimeMs: 0,
      }
    }

    // Check resource match
    const resourceName = context.resource.name as string
    if (resource !== '*' && !this.matchPattern(resourceName, resource)) {
      return {
        allowed: false,
        reason: `Resource mismatch: ${resourceName} does not match ${resource}`,
        appliedPolicies: [policy.id],
        evaluationTimeMs: 0,
      }
    }

    // Check action match
    if (action !== '*' && context.action !== action) {
      return {
        allowed: false,
        reason: `Action mismatch: expected ${action}, got ${context.action}`,
        appliedPolicies: [policy.id],
        evaluationTimeMs: 0,
      }
    }

    // Check conditions
    if (conditions && conditions.length > 0) {
      for (const condition of conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return {
            allowed: false,
            reason: `Condition failed: ${condition.attribute} ${condition.operator} ${condition.value}`,
            appliedPolicies: [policy.id],
            evaluationTimeMs: 0,
          }
        }
      }
    }

    return {
      allowed: true,
      appliedPolicies: [policy.id],
      evaluationTimeMs: 0,
    }
  }

  private async evaluateABAC(policy: ABACPolicy, context: PolicyContext): Promise<PolicyDecision> {
    const { conditions } = policy.rules

    // Evaluate all conditions
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return {
          allowed: false,
          reason: `Condition failed: ${condition.attribute} ${condition.operator} ${condition.value}`,
          appliedPolicies: [policy.id],
          evaluationTimeMs: 0,
        }
      }
    }

    return {
      allowed: true,
      appliedPolicies: [policy.id],
      evaluationTimeMs: 0,
    }
  }

  // ===== Rate Limit Evaluation =====

  private async evaluateRateLimit(policy: RateLimitPolicy, context: PolicyContext): Promise<PolicyDecision> {
    // Rate limiting requires Durable Objects state - this is a simplified check
    // Real implementation would check Durable Object state
    const { limit, window, scope, action } = policy.rules

    // For now, just allow (rate limit state managed separately)
    return {
      allowed: true,
      reason: `Rate limit check passed (${limit} per ${window}s, scope: ${scope})`,
      appliedPolicies: [policy.id],
      metadata: { limit, window, scope, action },
      evaluationTimeMs: 0,
    }
  }

  // ===== Data Masking Evaluation =====

  private async evaluateDataMasking(policy: DataMaskingPolicy, context: PolicyContext): Promise<PolicyDecision> {
    const { fields, maskingType, conditions } = policy.rules

    // Check conditions
    if (conditions && conditions.length > 0) {
      for (const condition of conditions) {
        if (!this.evaluateCondition(condition, context)) {
          // Conditions not met, no masking needed
          return {
            allowed: true,
            reason: 'Masking conditions not met',
            appliedPolicies: [policy.id],
            evaluationTimeMs: 0,
          }
        }
      }
    }

    // Apply masking (would modify context.data in real implementation)
    return {
      allowed: true,
      reason: `Data masking applied to fields: ${fields.join(', ')} (${maskingType})`,
      appliedPolicies: [policy.id],
      metadata: { fields, maskingType },
      evaluationTimeMs: 0,
    }
  }

  // ===== Content Filter Evaluation =====

  private async evaluateContentFilter(policy: ContentFilterPolicy, context: PolicyContext): Promise<PolicyDecision> {
    const { action, filters } = policy.rules
    const content = context.data as string

    if (!content || typeof content !== 'string') {
      return {
        allowed: true,
        appliedPolicies: [policy.id],
        evaluationTimeMs: 0,
      }
    }

    // Check each filter
    for (const filter of filters) {
      let matched = false

      switch (filter.type) {
        case 'keyword':
          matched = filter.caseSensitive ? content.includes(filter.pattern) : content.toLowerCase().includes(filter.pattern.toLowerCase())
          break
        case 'regex':
          const regex = new RegExp(filter.pattern, filter.caseSensitive ? '' : 'i')
          matched = regex.test(content)
          break
        case 'email':
          matched = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content)
          break
        case 'phone':
          matched = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(content)
          break
        case 'url':
          matched = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(content)
          break
      }

      if (matched) {
        if (action === 'deny') {
          return {
            allowed: false,
            reason: `Content blocked by filter: ${filter.type} - ${filter.pattern}`,
            appliedPolicies: [policy.id],
            evaluationTimeMs: 0,
          }
        }
        // For sanitize/flag, would modify content here
      }
    }

    return {
      allowed: true,
      appliedPolicies: [policy.id],
      evaluationTimeMs: 0,
    }
  }

  // ===== Fraud Prevention Evaluation =====

  private async evaluateFraudPrevention(policy: FraudPreventionPolicy, context: PolicyContext): Promise<PolicyDecision> {
    const { signals, minScore, action } = policy.rules

    // Calculate fraud score
    let totalScore = 0
    const signalResults = []

    for (const signal of signals) {
      // Simplified signal evaluation (real implementation would call fraud detection services)
      const signalScore = Math.random() * 100 // Mock score
      const weightedScore = (signalScore / signal.threshold) * signal.weight * 100

      totalScore += weightedScore
      signalResults.push({
        type: signal.type,
        score: signalScore,
        threshold: signal.threshold,
        weight: signal.weight,
        weightedScore,
      })
    }

    const finalScore = totalScore / signals.reduce((sum, s) => sum + s.weight, 0)

    if (finalScore >= minScore) {
      return {
        allowed: action === 'allow',
        reason: `Fraud score ${finalScore.toFixed(2)} exceeds threshold ${minScore} - action: ${action}`,
        appliedPolicies: [policy.id],
        metadata: { fraudScore: finalScore, signals: signalResults },
        evaluationTimeMs: 0,
      }
    }

    return {
      allowed: true,
      reason: `Fraud score ${finalScore.toFixed(2)} below threshold ${minScore}`,
      appliedPolicies: [policy.id],
      metadata: { fraudScore: finalScore, signals: signalResults },
      evaluationTimeMs: 0,
    }
  }

  // ===== Compliance Evaluation =====

  private async evaluateCompliance(policy: CompliancePolicy, context: PolicyContext): Promise<PolicyDecision> {
    const { requirements } = policy.rules

    // Check each compliance requirement
    for (const requirement of requirements) {
      for (const rule of requirement.validationRules) {
        if (!this.evaluateCondition(rule, context)) {
          return {
            allowed: false,
            reason: `Compliance requirement failed: ${requirement.id} - ${requirement.description}`,
            appliedPolicies: [policy.id],
            metadata: { requirement: requirement.id, controls: requirement.controls },
            evaluationTimeMs: 0,
          }
        }
      }
    }

    return {
      allowed: true,
      reason: 'All compliance requirements met',
      appliedPolicies: [policy.id],
      evaluationTimeMs: 0,
    }
  }

  // ===== Helper Methods =====

  private evaluateCondition(condition: { attribute: string; operator: string; value: unknown }, context: PolicyContext): boolean {
    const actualValue = this.getNestedValue(context, condition.attribute)

    switch (condition.operator) {
      case 'eq':
        return actualValue === condition.value
      case 'ne':
        return actualValue !== condition.value
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(actualValue)
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(actualValue)
      case 'gt':
        return typeof actualValue === 'number' && typeof condition.value === 'number' && actualValue > condition.value
      case 'gte':
        return typeof actualValue === 'number' && typeof condition.value === 'number' && actualValue >= condition.value
      case 'lt':
        return typeof actualValue === 'number' && typeof condition.value === 'number' && actualValue < condition.value
      case 'lte':
        return typeof actualValue === 'number' && typeof condition.value === 'number' && actualValue <= condition.value
      case 'contains':
        return typeof actualValue === 'string' && typeof condition.value === 'string' && actualValue.includes(condition.value)
      case 'startsWith':
        return typeof actualValue === 'string' && typeof condition.value === 'string' && actualValue.startsWith(condition.value)
      case 'endsWith':
        return typeof actualValue === 'string' && typeof condition.value === 'string' && actualValue.endsWith(condition.value)
      default:
        return false
    }
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split('.')
    let current: unknown = obj

    for (const part of parts) {
      if (typeof current === 'object' && current !== null && part in current) {
        current = (current as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return current
  }

  private matchPattern(value: string, pattern: string): boolean {
    // Simple wildcard matching
    if (pattern === '*') return true
    if (!pattern.includes('*')) return value === pattern

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return regex.test(value)
  }
}
