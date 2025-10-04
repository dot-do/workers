/**
 * Type definitions for Podcast AI generation service
 */

export type PodcastFormat = 'deep-dive' | 'interview' | 'debate' | 'news-discussion' | 'storytelling'
export type SpeakerRole = 'host' | 'guest' | 'narrator' | 'character' | 'expert'

export interface Env {
  AUDIO: R2Bucket
  DB: any
  VOICE: any // Voice service binding
  OPENAI_API_KEY: string
  ELEVENLABS_API_KEY: string
  GOOGLE_CLOUD_API_KEY: string
  pipeline: any
  do: any
}

export interface Speaker {
  id: string
  name: string
  role: SpeakerRole
  provider: 'openai' | 'elevenlabs' | 'google'
  voice: string
  description?: string
}

export interface DialogueLine {
  speaker: string // speaker id
  text: string
  emotion?: string
  pause?: number // seconds before this line
}

export interface PodcastGenerationRequest {
  title: string
  format: PodcastFormat
  topic?: string
  speakers: Speaker[]
  dialogue: DialogueLine[]
  duration?: number // target duration in minutes
  backgroundMusic?: boolean
  metadata?: Record<string, any>
}

export interface PodcastGenerationResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  title: string
  format: PodcastFormat
  speakers: Speaker[]
  audioUrl?: string
  r2Key?: string
  duration?: number // actual duration in seconds
  error?: string
  createdAt: string
  completedAt?: string
  metadata?: Record<string, any>
}

export interface PodcastRecord {
  id: string
  title: string
  format: string
  topic: string | null
  speakers: string // JSON
  dialogue: string // JSON
  status: string
  audioUrl: string | null
  r2Key: string | null
  duration: number | null
  error: string | null
  createdAt: string
  completedAt: string | null
  metadata: string | null
}

export interface PodcastTemplate {
  name: string
  format: PodcastFormat
  topic: string
  speakers: Speaker[]
  dialogue: DialogueLine[]
}
