/**
 * Deploy Service Schemas
 *
 * Zod validation schemas for all request types
 */

import { z } from 'zod'

export const serviceNameSchema = z.enum(['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp', 'queue'])

export const environmentSchema = z.enum(['production', 'staging', 'development'])

export const deploymentMetadataSchema = z.object({
  commit: z.string().min(1),
  branch: z.string().min(1),
  author: z.string().min(1),
  version: z.string().optional(),
})

export const deploymentRequestSchema = z.object({
  service: serviceNameSchema,
  environment: environmentSchema,
  script: z.string().min(1, 'Script content is required'),
  bindings: z.record(z.any()).optional(),
  metadata: deploymentMetadataSchema,
})

export const rollbackRequestSchema = z.object({
  service: serviceNameSchema,
  environment: environmentSchema,
})

export const listDeploymentsRequestSchema = z.object({
  service: serviceNameSchema.optional(),
  environment: environmentSchema.optional(),
  limit: z.number().min(1).max(100).default(50).optional(),
})

export type DeploymentRequestInput = z.infer<typeof deploymentRequestSchema>
export type RollbackRequestInput = z.infer<typeof rollbackRequestSchema>
export type ListDeploymentsRequestInput = z.infer<typeof listDeploymentsRequestSchema>
