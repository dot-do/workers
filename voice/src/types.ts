/**
 * Type definitions for Voice AI generation service
 */

export type VoiceProvider = 'openai' | 'elevenlabs' | 'google'
export type AudioFormat = 'mp3' | 'wav' | 'opus' | 'aac' | 'flac'

// OpenAI voices
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
export type OpenAIModel = 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts'

// ElevenLabs voices (examples - actual list is much larger)
export type ElevenLabsVoice = 'rachel' | 'clyde' | 'domi' | 'dave' | 'fin' | 'sarah' | 'antoni' | 'thomas' | 'charlie' | 'emily'
export type ElevenLabsModel = 'eleven_multilingual_v2' | 'eleven_turbo_v2' | 'eleven_flash_v2'

// Google voices (examples)
export type GoogleVoice = 'en-US-Neural2-A' | 'en-US-Neural2-C' | 'en-US-Neural2-D' | 'en-US-Neural2-E' | 'en-US-Neural2-F' | 'en-US-Studio-O' | 'en-US-Chirp-3-HD'

export interface Env {
  AUDIO: R2Bucket
  DB: any
  OPENAI_API_KEY: string
  ELEVENLABS_API_KEY: string
  GOOGLE_CLOUD_API_KEY: string
  pipeline: any
  do: any
}

export interface VoiceGenerationRequest {
  text: string
  provider?: VoiceProvider
  voice?: string
  model?: string
  format?: AudioFormat
  speed?: number // 0.25 to 4.0
  pitch?: number // -20 to 20 (semitones)
  emotion?: string // for steerable TTS
  style?: string // professional, conversational, dramatic, etc.
  language?: string
  ssml?: boolean // use SSML tags
  metadata?: Record<string, any>
}

export interface VoiceGenerationResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  text: string
  provider: VoiceProvider
  voice: string
  audioUrl?: string
  r2Key?: string
  duration?: number // seconds
  error?: string
  createdAt: string
  completedAt?: string
  metadata?: Record<string, any>
}

export interface BatchVoiceGenerationRequest {
  voices: Array<{
    text: string
    provider?: VoiceProvider
    voice?: string
    model?: string
    format?: AudioFormat
    speed?: number
    pitch?: number
    emotion?: string
    style?: string
  }>
  metadata?: Record<string, any>
}

export interface BatchVoiceGenerationResponse {
  batchId: string
  voices: VoiceGenerationResponse[]
  total: number
  pending: number
  completed: number
  failed: number
}

export interface VoiceRecord {
  id: string
  text: string
  provider: string
  voice: string
  model: string | null
  format: string
  status: string
  audioUrl: string | null
  r2Key: string | null
  duration: number | null
  error: string | null
  createdAt: string
  completedAt: string | null
  metadata: string | null
}

export interface VoicePromptTemplate {
  name: string
  useCase: string
  text: string
  provider: VoiceProvider
  voice: string
  style?: string
  emotion?: string
}
