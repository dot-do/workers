/**
 * Policy Engine - Core Types
 *
 * Policy-as-Code type definitions for edge-native enforcement
 */

import { z } from 'zod'

// ===== Policy Decisions =====

export type PolicyDecision = {
  allowed: boolean
  reason?: string
  appliedPolicies: string[]
  metadata?: Record<string, unknown>
  evaluationTimeMs: number
}

// ===== Policy Types =====

export const PolicyTypeSchema = z.enum([
  'access-control',
  'rate-limit',
  'data-masking',
  'content-filter',
  'fraud-prevention',
  'compliance',
])

export type PolicyType = z.infer<typeof PolicyTypeSchema>

// ===== Access Control Models =====

export const AccessControlModelSchema = z.enum([
  'RBAC', // Role-Based Access Control
  'ABAC', // Attribute-Based Access Control
  'ReBAC', // Relationship-Based Access Control
])

export type AccessControlModel = z.infer<typeof AccessControlModelSchema>

// ===== Policy Status =====

export const PolicyStatusSchema = z.enum(['draft', 'active', 'paused', 'archived'])

export type PolicyStatus = z.infer<typeof PolicyStatusSchema>

// ===== Policy Priority =====

export const PolicyPrioritySchema = z.enum(['low', 'medium', 'high', 'critical'])

export type PolicyPriority = z.infer<typeof PolicyPrioritySchema>

// ===== Base Policy Interface =====

export const BasePolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: PolicyTypeSchema,
  status: PolicyStatusSchema,
  priority: PolicyPrioritySchema,
  version: z.number().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type BasePolicy = z.infer<typeof BasePolicySchema>

// ===== RBAC Policy =====

export const RBACPolicySchema = BasePolicySchema.extend({
  type: z.literal('access-control'),
  rules: z.object({
    model: z.literal('RBAC'),
    role: z.string(),
    resource: z.string(),
    action: z.string(),
    conditions: z
      .array(
        z.object({
          attribute: z.string(),
          operator: z.enum(['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith']),
          value: z.unknown().optional(),
        })
      )
      .optional(),
  }),
})

export type RBACPolicy = z.infer<typeof RBACPolicySchema>

// ===== ABAC Policy =====

export const ABACPolicySchema = BasePolicySchema.extend({
  type: z.literal('access-control'),
  rules: z.object({
    model: z.literal('ABAC'),
    subject: z.record(z.unknown()), // User attributes
    resource: z.record(z.unknown()), // Resource attributes
    environment: z.record(z.unknown()).optional(), // Context attributes
    conditions: z.array(
      z.object({
        attribute: z.string(),
        operator: z.enum(['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith']),
        value: z.unknown().optional(),
      })
    ),
  }),
})

export type ABACPolicy = z.infer<typeof ABACPolicySchema>

// ===== ReBAC Policy =====

export const ReABCPolicySchema = BasePolicySchema.extend({
  type: z.literal('access-control'),
  rules: z.object({
    model: z.literal('ReBAC'),
    subject: z.string(),
    relation: z.string(),
    object: z.string(),
    conditions: z
      .array(
        z.object({
          attribute: z.string(),
          operator: z.enum(['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith']),
          value: z.unknown().optional(),
        })
      )
      .optional(),
  }),
})

export type ReABCPolicy = z.infer<typeof ReABCPolicySchema>

// ===== Rate Limit Policy =====

export const RateLimitPolicySchema = BasePolicySchema.extend({
  type: z.literal('rate-limit'),
  rules: z.object({
    limit: z.number(),
    window: z.number(), // seconds
    scope: z.enum(['global', 'user', 'ip', 'api-key', 'custom']),
    scopeKey: z.string().optional(), // For custom scope
    action: z.enum(['allow', 'deny', 'throttle']),
    throttleRate: z.number().optional(), // For throttle action
  }),
})

export type RateLimitPolicy = z.infer<typeof RateLimitPolicySchema>

// ===== Data Masking Policy =====

export const DataMaskingPolicySchema = BasePolicySchema.extend({
  type: z.literal('data-masking'),
  rules: z.object({
    fields: z.array(z.string()),
    maskingType: z.enum(['full', 'partial', 'hash', 'tokenize', 'redact']),
    maskingPattern: z.string().optional(), // e.g., "***" or "XXX-XX-1234"
    conditions: z
      .array(
        z.object({
          attribute: z.string(),
          operator: z.enum(['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith']),
          value: z.unknown(),
        })
      )
      .optional(),
  }),
})

export type DataMaskingPolicy = z.infer<typeof DataMaskingPolicySchema>

// ===== Content Filter Policy =====

export const ContentFilterPolicySchema = BasePolicySchema.extend({
  type: z.literal('content-filter'),
  rules: z.object({
    action: z.enum(['allow', 'deny', 'sanitize', 'flag']),
    filters: z.array(
      z.object({
        type: z.enum(['keyword', 'regex', 'ml-classifier', 'url', 'email', 'phone']),
        pattern: z.string(),
        caseSensitive: z.boolean().optional(),
      })
    ),
  }),
})

export type ContentFilterPolicy = z.infer<typeof ContentFilterPolicySchema>

// ===== Fraud Prevention Policy =====

export const FraudPreventionPolicySchema = BasePolicySchema.extend({
  type: z.literal('fraud-prevention'),
  rules: z.object({
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
    action: z.enum(['allow', 'challenge', 'deny', 'flag']),
    signals: z.array(
      z.object({
        type: z.enum(['velocity', 'geolocation', 'device-fingerprint', 'behavior-analysis', 'ml-score']),
        threshold: z.number(),
        weight: z.number(),
      })
    ),
    minScore: z.number(), // Combined weighted score threshold
  }),
})

export type FraudPreventionPolicy = z.infer<typeof FraudPreventionPolicySchema>

// ===== Compliance Policy =====

export const CompliancePolicySchema = BasePolicySchema.extend({
  type: z.literal('compliance'),
  rules: z.object({
    framework: z.enum(['GDPR', 'HIPAA', 'PCI-DSS', 'SOC2', 'ISO27001', 'CCPA']),
    requirements: z.array(
      z.object({
        id: z.string(),
        description: z.string(),
        controls: z.array(z.string()),
        validationRules: z.array(
          z.object({
            attribute: z.string(),
            operator: z.enum(['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith']),
            value: z.unknown(),
          })
        ),
      })
    ),
    auditRequired: z.boolean(),
  }),
})

export type CompliancePolicy = z.infer<typeof CompliancePolicySchema>

// ===== Union of All Policy Types =====
// Note: Using z.union instead of z.discriminatedUnion because multiple schemas share the same 'type' value

export const PolicySchema = z.union([
  RBACPolicySchema,
  ABACPolicySchema,
  ReABCPolicySchema,
  RateLimitPolicySchema,
  DataMaskingPolicySchema,
  ContentFilterPolicySchema,
  FraudPreventionPolicySchema,
  CompliancePolicySchema,
])

export type Policy = z.infer<typeof PolicySchema>

// ===== Policy Context (for evaluation) =====

export const PolicyContextSchema = z.object({
  subject: z.record(z.unknown()), // User/principal attributes
  resource: z.record(z.unknown()), // Resource being accessed
  action: z.string(), // Action being performed
  environment: z.record(z.unknown()).optional(), // Environmental context (time, IP, etc.)
  data: z.unknown().optional(), // Data payload (for masking/filtering)
})

export type PolicyContext = z.infer<typeof PolicyContextSchema>

// ===== Audit Log Entry =====

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  policyId: z.string(),
  policyName: z.string(),
  policyType: PolicyTypeSchema,
  decision: z.enum(['allow', 'deny', 'challenge']),
  reason: z.string().optional(),
  context: PolicyContextSchema,
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  location: z
    .object({
      country: z.string(),
      region: z.string().optional(),
      city: z.string().optional(),
    })
    .optional(),
})

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>

// ===== Policy Template =====

export const PolicyTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: PolicyTypeSchema,
  category: z.string(),
  template: PolicySchema,
  variables: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
      description: z.string(),
      required: z.boolean(),
      defaultValue: z.unknown().optional(),
    })
  ),
  examples: z.array(z.record(z.unknown())).optional(),
})

export type PolicyTemplate = z.infer<typeof PolicyTemplateSchema>

// ===== Policy Evaluation Result =====

export type PolicyEvaluationResult = {
  decision: PolicyDecision
  auditLog?: AuditLogEntry
  maskedData?: unknown
  filteredContent?: string
  metadata?: Record<string, unknown>
}

// ===== Policy Cache Entry =====

export type PolicyCacheEntry = {
  policy: Policy
  cachedAt: number
  ttl: number
}

// ===== Rate Limit State =====

export type RateLimitState = {
  count: number
  resetAt: number
  blocked: boolean
}

// ===== Fraud Score =====

export type FraudScore = {
  score: number
  signals: Array<{
    type: string
    score: number
    weight: number
    details?: Record<string, unknown>
  }>
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
}
