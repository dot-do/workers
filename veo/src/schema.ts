/**
 * Zod validation schemas for Veo 3 video generation
 */

import { z } from 'zod'

export const aspectRatioSchema = z.enum(['16:9', '9:16']).default('16:9')

export const videoGenerationRequestSchema = z.object({
  prompt: z.string().min(10).max(2000),
  aspectRatio: aspectRatioSchema.optional(),
  duration: z.number().min(1).max(30).optional(),
  negativePrompt: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
})

export const batchVideoGenerationRequestSchema = z.object({
  prompts: z.array(
    z.object({
      prompt: z.string().min(10).max(2000),
      aspectRatio: aspectRatioSchema.optional(),
      duration: z.number().min(1).max(30).optional(),
      negativePrompt: z.string().max(500).optional(),
    })
  ).min(1).max(10),
  metadata: z.record(z.any()).optional(),
})

export const promptTemplateSchema = z.object({
  industry: z.string(),
  occupation: z.string(),
  task: z.string(),
  tool: z.string(),
  environment: z.string(),
  audioCue: z.string().optional(),
})
