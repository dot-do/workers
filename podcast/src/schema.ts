/**
 * Zod validation schemas for Podcast AI generation
 */

import { z } from 'zod'

export const formatSchema = z.enum(['deep-dive', 'interview', 'debate', 'news-discussion', 'storytelling'])
export const roleSchema = z.enum(['host', 'guest', 'narrator', 'character', 'expert'])

export const speakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: roleSchema,
  provider: z.enum(['openai', 'elevenlabs', 'google']),
  voice: z.string(),
  description: z.string().optional(),
})

export const dialogueLineSchema = z.object({
  speaker: z.string(),
  text: z.string().min(1).max(5000),
  emotion: z.string().optional(),
  pause: z.number().min(0).max(10).optional(),
})

export const podcastGenerationRequestSchema = z.object({
  title: z.string().min(1).max(200),
  format: formatSchema,
  topic: z.string().max(500).optional(),
  speakers: z.array(speakerSchema).min(1).max(10),
  dialogue: z.array(dialogueLineSchema).min(1).max(500),
  duration: z.number().min(1).max(180).optional(),
  backgroundMusic: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})
