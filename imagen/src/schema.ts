/**
 * Zod validation schemas for Imagen AI image generation
 */

import { z } from 'zod'

export const providerSchema = z.enum(['google-imagen', 'openai-dalle']).default('google-imagen')
export const sizeSchema = z.enum(['1024x1024', '1792x1024', '1024x1792', 'square', 'landscape', 'portrait']).default('1024x1024')
export const qualitySchema = z.enum(['standard', 'hd']).default('standard')
export const styleSchema = z.enum(['vivid', 'natural']).default('vivid')

export const imageGenerationRequestSchema = z.object({
  prompt: z.string().min(10).max(4000),
  provider: providerSchema.optional(),
  size: sizeSchema.optional(),
  quality: qualitySchema.optional(),
  style: styleSchema.optional(),
  negativePrompt: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional(),
})

export const batchImageGenerationRequestSchema = z.object({
  prompts: z.array(
    z.object({
      prompt: z.string().min(10).max(4000),
      provider: providerSchema.optional(),
      size: sizeSchema.optional(),
      quality: qualitySchema.optional(),
      style: styleSchema.optional(),
      negativePrompt: z.string().max(1000).optional(),
    })
  ).min(1).max(10),
  metadata: z.record(z.any()).optional(),
})
