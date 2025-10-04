/**
 * Type definitions for Imagen AI image generation service
 */

export type ImageProvider = 'google-imagen' | 'openai-dalle'
export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792' | 'square' | 'landscape' | 'portrait'
export type ImageQuality = 'standard' | 'hd'
export type ImageStyle = 'vivid' | 'natural'

export interface Env {
  IMAGES: R2Bucket
  DB: any
  GOOGLE_API_KEY: string
  OPENAI_API_KEY: string
  pipeline: any
  do: any
}

export interface ImageGenerationRequest {
  prompt: string
  provider?: ImageProvider
  size?: ImageSize
  quality?: ImageQuality
  style?: ImageStyle
  negativePrompt?: string
  metadata?: Record<string, any>
}

export interface ImageGenerationResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  prompt: string
  provider: ImageProvider
  size: string
  imageUrl?: string
  r2Key?: string
  error?: string
  createdAt: string
  completedAt?: string
  metadata?: Record<string, any>
}

export interface BatchImageGenerationRequest {
  prompts: Array<{
    prompt: string
    provider?: ImageProvider
    size?: ImageSize
    quality?: ImageQuality
    style?: ImageStyle
    negativePrompt?: string
  }>
  metadata?: Record<string, any>
}

export interface BatchImageGenerationResponse {
  batchId: string
  images: ImageGenerationResponse[]
  total: number
  pending: number
  completed: number
  failed: number
}

export interface ImageRecord {
  id: string
  prompt: string
  provider: string
  size: string
  status: string
  imageUrl: string | null
  r2Key: string | null
  error: string | null
  createdAt: string
  completedAt: string | null
  metadata: string | null
}
