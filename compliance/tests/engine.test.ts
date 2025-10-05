/**
 * Policy Engine Tests
 */

import { describe, it, expect } from 'vitest'
import { PolicyEvaluator } from '../src/engine/evaluator'
import { Policy } from '../src/policy/dsl'
import type { PolicyContext } from '../src/policy/types'

describe('Policy Engine', () => {
  const evaluator = new PolicyEvaluator()

  describe('RBAC Policies', () => {
    it('should allow admin full access', async () => {
      const policy = Policy.rbac('admin-access', 'Admin Access').role('admin').resource('*').action('*').status('active').build()

      const context: PolicyContext = {
        subject: { id: 'user_123', role: 'admin' },
        resource: { name: 'users' },
        action: 'read',
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(true)
      expect(result.decision.appliedPolicies).toContain('admin-access')
    })

    it('should deny user write access', async () => {
      const policy = Policy.rbac('user-readonly', 'User Read-Only').role('user').resource('*').action('read').status('active').build()

      const context: PolicyContext = {
        subject: { id: 'user_456', role: 'user' },
        resource: { name: 'users' },
        action: 'write',
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(false)
      expect(result.decision.reason).toContain('Action mismatch')
    })

    it('should enforce role conditions', async () => {
      const policy = Policy.rbac('manager-access', 'Manager Access')
        .role('manager')
        .resource('reports')
        .action('read')
        .condition('subject.department', 'eq', 'sales')
        .status('active')
        .build()

      const context: PolicyContext = {
        subject: { id: 'user_789', role: 'manager', department: 'engineering' },
        resource: { name: 'reports' },
        action: 'read',
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(false)
      expect(result.decision.reason).toContain('Condition failed')
    })
  })

  describe('ABAC Policies', () => {
    it('should match attribute conditions', async () => {
      const policy = Policy.abac('dept-access', 'Department Access')
        .subject({ department: 'engineering' })
        .resourceAttrs({ department: 'engineering' })
        .condition('subject.department', 'eq', 'engineering')
        .status('active')
        .build()

      const context: PolicyContext = {
        subject: { id: 'user_123', department: 'engineering' },
        resource: { name: 'code-repo', department: 'engineering' },
        action: 'read',
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(true)
    })

    it('should deny mismatched attributes', async () => {
      const policy = Policy.abac('dept-access', 'Department Access')
        .subject({ department: 'engineering' })
        .resourceAttrs({ department: 'engineering' })
        .condition('subject.department', 'eq', 'engineering')
        .status('active')
        .build()

      const context: PolicyContext = {
        subject: { id: 'user_456', department: 'marketing' },
        resource: { name: 'code-repo', department: 'engineering' },
        action: 'read',
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(false)
    })
  })

  describe('Content Filter Policies', () => {
    it('should detect profanity via keyword', async () => {
      const policy = Policy.contentFilter('profanity', 'Profanity Filter').action('deny').addFilter('keyword', 'badword', false).status('active').build()

      const context: PolicyContext = {
        subject: { id: 'user_123' },
        resource: { name: 'comment' },
        action: 'create',
        data: 'This contains a badword in the text',
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(false)
      expect(result.decision.reason).toContain('Content blocked')
    })

    it('should detect email addresses', async () => {
      const policy = Policy.contentFilter('email-detect', 'Email Detection').action('flag').addFilter('email', '.*', false).status('active').build()

      const context: PolicyContext = {
        subject: { id: 'user_123' },
        resource: { name: 'post' },
        action: 'create',
        data: 'Contact me at user@example.com for details',
      }

      const result = await evaluator.evaluate(policy, context)

      // Email filter would flag content but still allow
      expect(result.decision.allowed).toBe(true)
    })

    it('should pass clean content', async () => {
      const policy = Policy.contentFilter('profanity', 'Profanity Filter').action('deny').addFilter('keyword', 'badword', false).status('active').build()

      const context: PolicyContext = {
        subject: { id: 'user_123' },
        resource: { name: 'comment' },
        action: 'create',
        data: 'This is perfectly clean content',
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(true)
    })
  })

  describe('Rate Limit Policies', () => {
    it('should create rate limit policy', async () => {
      const policy = Policy.rateLimit('api-limit', 'API Limit').limit(100).window(60).scope('api-key').action('deny').status('active').build()

      const context: PolicyContext = {
        subject: { id: 'api_key_123' },
        resource: { name: 'api' },
        action: 'request',
      }

      const result = await evaluator.evaluate(policy, context)

      // Rate limit check passes (actual limiting done in Durable Object)
      expect(result.decision.allowed).toBe(true)
      expect(result.decision.metadata).toHaveProperty('limit')
      expect(result.decision.metadata).toHaveProperty('window')
    })
  })

  describe('Data Masking Policies', () => {
    it('should apply masking when conditions met', async () => {
      const policy = Policy.dataMasking('pii-mask', 'PII Masking')
        .fields('ssn', 'creditCard')
        .maskingType('partial')
        .condition('subject.role', 'ne', 'admin')
        .status('active')
        .build()

      const context: PolicyContext = {
        subject: { id: 'user_123', role: 'user' },
        resource: { name: 'customer' },
        action: 'read',
        data: { ssn: '123-45-6789', creditCard: '4111-1111-1111-1111' },
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(true)
      expect(result.decision.reason).toContain('Data masking applied')
      expect(result.decision.metadata).toHaveProperty('fields')
    })

    it('should skip masking for admin users', async () => {
      const policy = Policy.dataMasking('pii-mask', 'PII Masking')
        .fields('ssn', 'creditCard')
        .maskingType('partial')
        .condition('subject.role', 'ne', 'admin')
        .status('active')
        .build()

      const context: PolicyContext = {
        subject: { id: 'user_456', role: 'admin' },
        resource: { name: 'customer' },
        action: 'read',
        data: { ssn: '123-45-6789', creditCard: '4111-1111-1111-1111' },
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(true)
      expect(result.decision.reason).toContain('Masking conditions not met')
    })
  })

  describe('Fraud Prevention Policies', () => {
    it('should calculate fraud score', async () => {
      const policy = Policy.fraudPrevention('payment-fraud', 'Payment Fraud')
        .riskLevel('high')
        .action('challenge')
        .addSignal('velocity', 5, 0.3)
        .addSignal('geolocation', 100, 0.2)
        .minScore(60)
        .status('active')
        .build()

      const context: PolicyContext = {
        subject: { id: 'user_123' },
        resource: { name: 'payment' },
        action: 'process',
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision).toHaveProperty('metadata')
      expect(result.decision.metadata).toHaveProperty('fraudScore')
    })
  })

  describe('Compliance Policies', () => {
    it('should validate GDPR consent', async () => {
      const policy = Policy.compliance('gdpr-consent', 'GDPR Consent')
        .framework('GDPR')
        .auditRequired(true)
        .addRequirement('gdpr-art-6', 'Lawful basis', ['consent'], [{ attribute: 'consent.given', operator: 'eq', value: true }])
        .status('active')
        .build()

      const context: PolicyContext = {
        subject: { id: 'user_123' },
        resource: { name: 'personal-data' },
        action: 'process',
        data: { consent: { given: true } },
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(true)
      expect(result.decision.reason).toContain('compliance requirements met')
    })

    it('should fail without consent', async () => {
      const policy = Policy.compliance('gdpr-consent', 'GDPR Consent')
        .framework('GDPR')
        .auditRequired(true)
        .addRequirement('gdpr-art-6', 'Lawful basis', ['consent'], [{ attribute: 'consent.given', operator: 'eq', value: true }])
        .status('active')
        .build()

      const context: PolicyContext = {
        subject: { id: 'user_123' },
        resource: { name: 'personal-data' },
        action: 'process',
        data: { consent: { given: false } },
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.allowed).toBe(false)
      expect(result.decision.reason).toContain('Compliance requirement failed')
    })
  })

  describe('Batch Evaluation', () => {
    it('should evaluate multiple policies', async () => {
      const policies = [
        Policy.rbac('admin-access', 'Admin Access').role('admin').resource('*').action('*').status('active').build(),
        Policy.rateLimit('api-limit', 'API Limit').limit(100).window(60).scope('api-key').action('deny').status('active').build(),
      ]

      const context: PolicyContext = {
        subject: { id: 'user_123', role: 'admin' },
        resource: { name: 'users' },
        action: 'read',
      }

      const result = await evaluator.evaluateAll(policies, context)

      expect(result.decision.allowed).toBe(true)
      expect(result.decision.appliedPolicies).toHaveLength(2)
    })

    it('should deny if any policy fails', async () => {
      const policies = [
        Policy.rbac('admin-access', 'Admin Access').role('admin').resource('*').action('*').status('active').build(),
        Policy.rbac('user-readonly', 'User Read-Only').role('user').resource('*').action('read').status('active').build(),
      ]

      const context: PolicyContext = {
        subject: { id: 'user_123', role: 'user' },
        resource: { name: 'users' },
        action: 'write',
      }

      const result = await evaluator.evaluateAll(policies, context)

      expect(result.decision.allowed).toBe(false)
    })
  })

  describe('Performance', () => {
    it('should evaluate in <5ms', async () => {
      const policy = Policy.rbac('perf-test', 'Performance Test').role('admin').resource('*').action('*').status('active').build()

      const context: PolicyContext = {
        subject: { id: 'user_123', role: 'admin' },
        resource: { name: 'test' },
        action: 'read',
      }

      const result = await evaluator.evaluate(policy, context)

      expect(result.decision.evaluationTimeMs).toBeLessThan(5)
    })
  })
})
