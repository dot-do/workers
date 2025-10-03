/**
 * Type definitions for Veo 3 video generation service
 */

export interface Env {
  VIDEOS: R2Bucket
  DB: any
  GOOGLE_API_KEY: string
  pipeline: any
  do: any
}

export interface VideoGenerationRequest {
  prompt: string
  aspectRatio?: '16:9' | '9:16'
  duration?: number
  negativePrompt?: string
  metadata?: Record<string, any>
}

export interface VideoGenerationResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  prompt: string
  aspectRatio: string
  videoUrl?: string
  r2Key?: string
  error?: string
  createdAt: string
  completedAt?: string
  metadata?: Record<string, any>
}

export interface BatchVideoGenerationRequest {
  prompts: Array<{
    prompt: string
    aspectRatio?: '16:9' | '9:16'
    duration?: number
    negativePrompt?: string
  }>
  metadata?: Record<string, any>
}

export interface BatchVideoGenerationResponse {
  batchId: string
  videos: VideoGenerationResponse[]
  total: number
  pending: number
  completed: number
  failed: number
}

export interface VideoRecord {
  id: string
  prompt: string
  aspectRatio: string
  status: string
  videoUrl: string | null
  r2Key: string | null
  error: string | null
  createdAt: string
  completedAt: string | null
  metadata: string | null
}

export interface PromptTemplate {
  industry: string
  occupation: string
  task: string
  tool: string
  environment: string
  audioCue?: string
}
