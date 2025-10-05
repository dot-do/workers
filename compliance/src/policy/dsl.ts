/**
 * Policy DSL - TypeScript-based Policy Builder
 *
 * Fluent API for defining policies as code
 */

import type { Policy, PolicyPriority, PolicyStatus, RBACPolicy, ABACPolicy, RateLimitPolicy, DataMaskingPolicy, ContentFilterPolicy, FraudPreventionPolicy, CompliancePolicy } from './types'

// ===== Base Policy Builder =====

class BasePolicyBuilder<T extends Policy> {
  protected policy: Partial<T>

  constructor(id: string, name: string) {
    this.policy = {
      id,
      name,
      version: 1,
      status: 'draft' as PolicyStatus,
      priority: 'medium' as PolicyPriority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
    } as Partial<T>
  }

  description(desc: string): this {
    this.policy.description = desc
    return this
  }

  status(status: PolicyStatus): this {
    this.policy.status = status
    return this
  }

  priority(priority: PolicyPriority): this {
    this.policy.priority = priority
    return this
  }

  tags(...tags: string[]): this {
    this.policy.tags = tags
    return this
  }

  metadata(meta: Record<string, unknown>): this {
    this.policy.metadata = meta
    return this
  }

  createdBy(userId: string): this {
    this.policy.createdBy = userId
    return this
  }

  build(): T {
    return this.policy as T
  }
}

// ===== RBAC Policy Builder =====

export class RBACPolicyBuilder extends BasePolicyBuilder<RBACPolicy> {
  constructor(id: string, name: string) {
    super(id, name)
    this.policy.type = 'access-control'
    this.policy.model = 'RBAC'
  }

  role(role: string): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as RBACPolicy['rules']
    }
    this.policy.rules.role = role
    return this
  }

  resource(resource: string): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as RBACPolicy['rules']
    }
    this.policy.rules.resource = resource
    return this
  }

  action(action: string): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as RBACPolicy['rules']
    }
    this.policy.rules.action = action
    return this
  }

  condition(attribute: string, operator: RBACPolicy['rules']['conditions'][number]['operator'], value: unknown): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as RBACPolicy['rules']
    }
    if (!this.policy.rules.conditions) {
      this.policy.rules.conditions = []
    }
    this.policy.rules.conditions.push({ attribute, operator, value })
    return this
  }
}

// ===== ABAC Policy Builder =====

export class ABACPolicyBuilder extends BasePolicyBuilder<ABACPolicy> {
  constructor(id: string, name: string) {
    super(id, name)
    this.policy.type = 'access-control'
    this.policy.model = 'ABAC'
  }

  subject(attributes: Record<string, unknown>): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as ABACPolicy['rules']
    }
    this.policy.rules.subject = attributes
    return this
  }

  resourceAttrs(attributes: Record<string, unknown>): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as ABACPolicy['rules']
    }
    this.policy.rules.resource = attributes
    return this
  }

  environment(attributes: Record<string, unknown>): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as ABACPolicy['rules']
    }
    this.policy.rules.environment = attributes
    return this
  }

  condition(attribute: string, operator: ABACPolicy['rules']['conditions'][number]['operator'], value: unknown): this {
    if (!this.policy.rules) {
      this.policy.rules = { conditions: [] } as ABACPolicy['rules']
    }
    if (!this.policy.rules.conditions) {
      this.policy.rules.conditions = []
    }
    this.policy.rules.conditions.push({ attribute, operator, value })
    return this
  }
}

// ===== Rate Limit Policy Builder =====

export class RateLimitPolicyBuilder extends BasePolicyBuilder<RateLimitPolicy> {
  constructor(id: string, name: string) {
    super(id, name)
    this.policy.type = 'rate-limit'
  }

  limit(count: number): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as RateLimitPolicy['rules']
    }
    this.policy.rules.limit = count
    return this
  }

  window(seconds: number): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as RateLimitPolicy['rules']
    }
    this.policy.rules.window = seconds
    return this
  }

  scope(scope: RateLimitPolicy['rules']['scope'], key?: string): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as RateLimitPolicy['rules']
    }
    this.policy.rules.scope = scope
    if (key) {
      this.policy.rules.scopeKey = key
    }
    return this
  }

  action(action: RateLimitPolicy['rules']['action'], throttleRate?: number): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as RateLimitPolicy['rules']
    }
    this.policy.rules.action = action
    if (throttleRate !== undefined) {
      this.policy.rules.throttleRate = throttleRate
    }
    return this
  }
}

// ===== Data Masking Policy Builder =====

export class DataMaskingPolicyBuilder extends BasePolicyBuilder<DataMaskingPolicy> {
  constructor(id: string, name: string) {
    super(id, name)
    this.policy.type = 'data-masking'
  }

  fields(...fields: string[]): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as DataMaskingPolicy['rules']
    }
    this.policy.rules.fields = fields
    return this
  }

  maskingType(type: DataMaskingPolicy['rules']['maskingType']): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as DataMaskingPolicy['rules']
    }
    this.policy.rules.maskingType = type
    return this
  }

  maskingPattern(pattern: string): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as DataMaskingPolicy['rules']
    }
    this.policy.rules.maskingPattern = pattern
    return this
  }

  condition(attribute: string, operator: DataMaskingPolicy['rules']['conditions'][number]['operator'], value: unknown): this {
    if (!this.policy.rules) {
      this.policy.rules = {} as DataMaskingPolicy['rules']
    }
    if (!this.policy.rules.conditions) {
      this.policy.rules.conditions = []
    }
    this.policy.rules.conditions.push({ attribute, operator, value })
    return this
  }
}

// ===== Content Filter Policy Builder =====

export class ContentFilterPolicyBuilder extends BasePolicyBuilder<ContentFilterPolicy> {
  constructor(id: string, name: string) {
    super(id, name)
    this.policy.type = 'content-filter'
  }

  action(action: ContentFilterPolicy['rules']['action']): this {
    if (!this.policy.rules) {
      this.policy.rules = { filters: [] } as ContentFilterPolicy['rules']
    }
    this.policy.rules.action = action
    return this
  }

  addFilter(type: ContentFilterPolicy['rules']['filters'][number]['type'], pattern: string, caseSensitive: boolean = false): this {
    if (!this.policy.rules) {
      this.policy.rules = { filters: [] } as ContentFilterPolicy['rules']
    }
    if (!this.policy.rules.filters) {
      this.policy.rules.filters = []
    }
    this.policy.rules.filters.push({ type, pattern, caseSensitive })
    return this
  }
}

// ===== Fraud Prevention Policy Builder =====

export class FraudPreventionPolicyBuilder extends BasePolicyBuilder<FraudPreventionPolicy> {
  constructor(id: string, name: string) {
    super(id, name)
    this.policy.type = 'fraud-prevention'
  }

  riskLevel(level: FraudPreventionPolicy['rules']['riskLevel']): this {
    if (!this.policy.rules) {
      this.policy.rules = { signals: [] } as FraudPreventionPolicy['rules']
    }
    this.policy.rules.riskLevel = level
    return this
  }

  action(action: FraudPreventionPolicy['rules']['action']): this {
    if (!this.policy.rules) {
      this.policy.rules = { signals: [] } as FraudPreventionPolicy['rules']
    }
    this.policy.rules.action = action
    return this
  }

  addSignal(type: FraudPreventionPolicy['rules']['signals'][number]['type'], threshold: number, weight: number): this {
    if (!this.policy.rules) {
      this.policy.rules = { signals: [] } as FraudPreventionPolicy['rules']
    }
    if (!this.policy.rules.signals) {
      this.policy.rules.signals = []
    }
    this.policy.rules.signals.push({ type, threshold, weight })
    return this
  }

  minScore(score: number): this {
    if (!this.policy.rules) {
      this.policy.rules = { signals: [] } as FraudPreventionPolicy['rules']
    }
    this.policy.rules.minScore = score
    return this
  }
}

// ===== Compliance Policy Builder =====

export class CompliancePolicyBuilder extends BasePolicyBuilder<CompliancePolicy> {
  constructor(id: string, name: string) {
    super(id, name)
    this.policy.type = 'compliance'
  }

  framework(framework: CompliancePolicy['rules']['framework']): this {
    if (!this.policy.rules) {
      this.policy.rules = { requirements: [] } as CompliancePolicy['rules']
    }
    this.policy.rules.framework = framework
    return this
  }

  auditRequired(required: boolean = true): this {
    if (!this.policy.rules) {
      this.policy.rules = { requirements: [] } as CompliancePolicy['rules']
    }
    this.policy.rules.auditRequired = required
    return this
  }

  addRequirement(id: string, description: string, controls: string[], validationRules: CompliancePolicy['rules']['requirements'][number]['validationRules']): this {
    if (!this.policy.rules) {
      this.policy.rules = { requirements: [] } as CompliancePolicy['rules']
    }
    if (!this.policy.rules.requirements) {
      this.policy.rules.requirements = []
    }
    this.policy.rules.requirements.push({ id, description, controls, validationRules })
    return this
  }
}

// ===== Fluent API Entry Points =====

export const Policy = {
  rbac: (id: string, name: string) => new RBACPolicyBuilder(id, name),
  abac: (id: string, name: string) => new ABACPolicyBuilder(id, name),
  rateLimit: (id: string, name: string) => new RateLimitPolicyBuilder(id, name),
  dataMasking: (id: string, name: string) => new DataMaskingPolicyBuilder(id, name),
  contentFilter: (id: string, name: string) => new ContentFilterPolicyBuilder(id, name),
  fraudPrevention: (id: string, name: string) => new FraudPreventionPolicyBuilder(id, name),
  compliance: (id: string, name: string) => new CompliancePolicyBuilder(id, name),
}

// ===== Example Usage =====

/*
// RBAC Policy
const adminAccess = Policy.rbac('admin-access', 'Admin Full Access')
  .description('Full access for admin role')
  .role('admin')
  .resource('*')
  .action('*')
  .status('active')
  .priority('high')
  .build()

// Rate Limit Policy
const apiRateLimit = Policy.rateLimit('api-rate-limit', 'API Rate Limit')
  .description('100 requests per minute per API key')
  .limit(100)
  .window(60)
  .scope('api-key')
  .action('deny')
  .status('active')
  .priority('medium')
  .build()

// Data Masking Policy
const piiMasking = Policy.dataMasking('pii-masking', 'PII Data Masking')
  .description('Mask PII fields for non-admin users')
  .fields('ssn', 'creditCard', 'email')
  .maskingType('partial')
  .maskingPattern('XXX-XX-XXXX')
  .condition('user.role', 'ne', 'admin')
  .status('active')
  .priority('high')
  .build()

// Content Filter Policy
const profanityFilter = Policy.contentFilter('profanity-filter', 'Profanity Filter')
  .description('Block or sanitize profanity in user content')
  .action('sanitize')
  .addFilter('keyword', 'badword1', false)
  .addFilter('keyword', 'badword2', false)
  .addFilter('regex', '\\b(bad|word)\\b', true)
  .status('active')
  .priority('medium')
  .build()

// Fraud Prevention Policy
const fraudDetection = Policy.fraudPrevention('fraud-detection', 'Payment Fraud Detection')
  .description('Detect fraudulent payment transactions')
  .riskLevel('high')
  .action('challenge')
  .addSignal('velocity', 5, 0.3)
  .addSignal('geolocation', 100, 0.2)
  .addSignal('device-fingerprint', 50, 0.3)
  .addSignal('ml-score', 70, 0.2)
  .minScore(60)
  .status('active')
  .priority('critical')
  .build()

// Compliance Policy
const gdprCompliance = Policy.compliance('gdpr-compliance', 'GDPR Compliance')
  .description('GDPR data protection requirements')
  .framework('GDPR')
  .auditRequired(true)
  .addRequirement('gdpr-art-6', 'Lawful basis for processing', ['consent', 'contract'], [
    { attribute: 'consent.given', operator: 'eq', value: true }
  ])
  .addRequirement('gdpr-art-17', 'Right to erasure', ['data-deletion'], [
    { attribute: 'deletion.requested', operator: 'eq', value: true }
  ])
  .status('active')
  .priority('critical')
  .build()
*/
