import { z } from 'zod'

// Thing types
export const ThingType = z.enum([
  'model',
  'dataset',
  'experiment',
  'deployment',
  'user',
  'organization',
  'checkpoint'
])

export type ThingType = z.infer<typeof ThingType>

// Relationship types
export const RelationshipType = z.enum([
  'trainedOn',
  'derivedFrom',
  'deployedTo',
  'replacedBy',
  'evaluatedOn',
  'approvedBy',
  'dependsOn',
  'usedBy'
])

export type RelationshipType = z.infer<typeof RelationshipType>

// Thing schema
export const Thing = z.object({
  id: z.string(),
  type: ThingType,
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.number(),
  updated_at: z.number(),
  created_by: z.string().optional(),
  status: z.enum(['active', 'archived', 'deprecated']),
  version: z.string().optional(),
  tags: z.array(z.string()).optional()
})

export type Thing = z.infer<typeof Thing>

// Model-specific metadata
export const ModelMetadata = z.object({
  framework: z.string(), // tensorflow, pytorch, cloudflare-ai
  model_type: z.string(), // text-generation, embedding, classification
  provider: z.string().optional(), // openai, anthropic, cloudflare
  model_name: z.string(), // gpt-4, claude-3, @cf/meta/llama-3-8b
  architecture: z.string().optional(),
  parameters: z.number().optional(),
  input_schema: z.record(z.any()).optional(),
  output_schema: z.record(z.any()).optional(),
  r2_path: z.string().optional(), // Path to model artifacts in R2
  vector_id: z.string().optional() // Vectorize embedding ID
})

export type ModelMetadata = z.infer<typeof ModelMetadata>

// Relationship schema
export const Relationship = z.object({
  id: z.string(),
  source_id: z.string(),
  target_id: z.string(),
  type: RelationshipType,
  properties: z.record(z.any()).optional(),
  created_at: z.number(),
  created_by: z.string().optional()
})

export type Relationship = z.infer<typeof Relationship>

// Model version
export const ModelVersion = z.object({
  id: z.string(),
  model_id: z.string(),
  version: z.string(),
  thing_id: z.string(),
  is_latest: z.boolean(),
  is_production: z.boolean(),
  created_at: z.number()
})

export type ModelVersion = z.infer<typeof ModelVersion>

// Performance metric
export const ModelMetric = z.object({
  id: z.string(),
  model_id: z.string(),
  metric_type: z.enum(['accuracy', 'latency', 'cost', 'quality_score', 'throughput']),
  metric_value: z.number(),
  context: z.record(z.any()).optional(),
  recorded_at: z.number()
})

export type ModelMetric = z.infer<typeof ModelMetric>

// Governance event
export const GovernanceEvent = z.object({
  id: z.string(),
  thing_id: z.string(),
  event_type: z.enum([
    'approval_requested',
    'approved',
    'rejected',
    'compliance_check',
    'fairness_test',
    'bias_audit',
    'gdpr_review',
    'ai_act_compliance'
  ]),
  event_data: z.record(z.any()).optional(),
  user_id: z.string().optional(),
  created_at: z.number()
})

export type GovernanceEvent = z.infer<typeof GovernanceEvent>

// Approval
export const Approval = z.object({
  id: z.string(),
  model_id: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  requested_by: z.string(),
  reviewed_by: z.string().optional(),
  review_notes: z.string().optional(),
  compliance_checks: z.array(z.object({
    check_type: z.string(),
    passed: z.boolean(),
    details: z.string().optional()
  })).optional(),
  created_at: z.number(),
  reviewed_at: z.number().optional()
})

export type Approval = z.infer<typeof Approval>

// Model cost
export const ModelCost = z.object({
  id: z.string(),
  model_id: z.string(),
  provider: z.string(),
  cost_type: z.enum(['inference', 'training', 'storage']),
  amount: z.number(),
  currency: z.string(),
  usage_data: z.object({
    tokens: z.number().optional(),
    requests: z.number().optional(),
    storage_gb: z.number().optional()
  }).optional(),
  recorded_at: z.number()
})

export type ModelCost = z.infer<typeof ModelCost>

// Vibe Coding model comparison
export const VibeModelComparison = z.object({
  experiment_id: z.string(),
  models: z.array(z.object({
    model_id: z.string(),
    provider: z.string(),
    model_name: z.string(),
    avg_quality: z.number(),
    avg_latency: z.number(),
    total_cost: z.number(),
    sample_count: z.number()
  })),
  winner: z.string().optional(),
  created_at: z.number()
})

export type VibeModelComparison = z.infer<typeof VibeModelComparison>
