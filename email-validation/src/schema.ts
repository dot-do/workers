// Zod Validation Schemas

import { z } from 'zod'

export const emailSchema = z.string().email('Invalid email format')

export const validationOptionsSchema = z.object({
  checkMX: z.boolean().optional().default(true),
  checkDisposable: z.boolean().optional().default(true),
  checkRole: z.boolean().optional().default(true),
  checkCatchAll: z.boolean().optional().default(false), // expensive
  timeout: z.number().min(100).max(30000).optional().default(5000),
  provider: z.enum(['mailgun', 'sendgrid', 'zerobounce', 'internal']).optional().default('internal'),
})

export const validateEmailSchema = z.object({
  email: emailSchema,
  options: validationOptionsSchema.optional(),
})

export const bulkValidateSchema = z.object({
  emails: z.array(emailSchema).min(1).max(10000),
  options: validationOptionsSchema.optional(),
})

export const disposableDomainsSchema = z.array(z.string())

export const roleAddressesSchema = z.array(z.string())
