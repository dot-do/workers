/**
 * Zod validation schemas for Voice AI generation
 */

import { z } from 'zod'

export const providerSchema = z.enum(['openai', 'elevenlabs', 'google']).default('openai')
export const formatSchema = z.enum(['mp3', 'wav', 'opus', 'aac', 'flac']).default('mp3')

export const voiceGenerationRequestSchema = z.object({
  text: z.string().min(1).max(10000),
  provider: providerSchema.optional(),
  voice: z.string().optional(),
  model: z.string().optional(),
  format: formatSchema.optional(),
  speed: z.number().min(0.25).max(4.0).optional(),
  pitch: z.number().min(-20).max(20).optional(),
  emotion: z.string().max(200).optional(),
  style: z.string().max(200).optional(),
  language: z.string().max(10).optional(),
  ssml: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})

export const batchVoiceGenerationRequestSchema = z.object({
  voices: z.array(
    z.object({
      text: z.string().min(1).max(10000),
      provider: providerSchema.optional(),
      voice: z.string().optional(),
      model: z.string().optional(),
      format: formatSchema.optional(),
      speed: z.number().min(0.25).max(4.0).optional(),
      pitch: z.number().min(-20).max(20).optional(),
      emotion: z.string().max(200).optional(),
      style: z.string().max(200).optional(),
    })
  ).min(1).max(10),
  metadata: z.record(z.any()).optional(),
})

export const voicePromptTemplateSchema = z.object({
  name: z.string(),
  useCase: z.string(),
  text: z.string(),
  provider: providerSchema,
  voice: z.string(),
  style: z.string().optional(),
  emotion: z.string().optional(),
})
