/**
 * videos.as - Create, host, and manage videos
 *
 * Upload, transcode, stream, and analyze videos at any scale.
 * videos.as/tutorials, videos.as/courses, videos.as/marketing
 *
 * @see https://videos.as
 *
 * @example
 * ```typescript
 * import { videos } from 'videos.as'
 *
 * // Upload a video
 * const video = await videos.upload({
 *   file: videoBuffer,
 *   title: 'Getting Started Tutorial'
 * })
 *
 * // Get embed code
 * console.log(video.embedCode)
 *
 * // Generate AI summary
 * const summary = await videos.summarize(video.id)
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface UploadConfig {
  /** Video file */
  file: ArrayBuffer | string  // ArrayBuffer or URL
  /** Video title */
  title: string
  /** Description */
  description?: string
  /** Folder/collection */
  folder?: string
  /** Tags */
  tags?: string[]
  /** Visibility */
  visibility?: 'public' | 'unlisted' | 'private'
  /** Thumbnail (auto-generated if not provided) */
  thumbnail?: ArrayBuffer | string
  /** Enable captions */
  captions?: boolean
  /** Allowed domains for embedding */
  allowedDomains?: string[]
}

export interface Video {
  id: string
  title: string
  description?: string
  duration: number
  status: 'processing' | 'ready' | 'error'
  visibility: 'public' | 'unlisted' | 'private'
  url: string
  embedCode: string
  thumbnailUrl: string
  hlsUrl: string
  folder?: string
  tags: string[]
  views: number
  createdAt: Date
  updatedAt: Date
}

export interface Folder {
  id: string
  name: string
  description?: string
  videoCount: number
  visibility: 'public' | 'unlisted' | 'private'
  url: string
  createdAt: Date
}

export interface Caption {
  id: string
  videoId: string
  language: string
  label: string
  url: string
  auto: boolean
  createdAt: Date
}

export interface Chapter {
  id: string
  videoId: string
  title: string
  startTime: number
  endTime: number
}

export interface VideoMetrics {
  views: number
  uniqueViewers: number
  avgWatchTime: number
  completionRate: number
  engagement: number
  viewsByDay: Array<{ date: string; views: number }>
  dropOffPoints: Array<{ time: number; dropOff: number }>
  topReferrers: Array<{ source: string; views: number }>
  period: string
}

export interface Transcript {
  videoId: string
  language: string
  segments: Array<{
    start: number
    end: number
    text: string
  }>
  fullText: string
}

export interface GeneratedContent {
  summary: string
  chapters: Array<{ title: string; startTime: number }>
  highlights: string[]
  keywords: string[]
}

export interface LiveStream {
  id: string
  title: string
  status: 'idle' | 'live' | 'ended'
  rtmpUrl: string
  streamKey: string
  playbackUrl: string
  viewerCount: number
  createdAt: Date
  startedAt?: Date
  endedAt?: Date
}

// Client interface
export interface VideosAsClient {
  /**
   * Upload a video
   */
  upload(config: UploadConfig): Promise<Video>

  /**
   * Get video details
   */
  get(videoId: string): Promise<Video>

  /**
   * List videos
   */
  list(options?: { folder?: string; visibility?: Video['visibility']; tag?: string; limit?: number }): Promise<Video[]>

  /**
   * Update video
   */
  update(videoId: string, config: Partial<UploadConfig>): Promise<Video>

  /**
   * Delete video
   */
  delete(videoId: string): Promise<void>

  /**
   * Create a folder
   */
  createFolder(config: { name: string; description?: string; visibility?: 'public' | 'unlisted' | 'private' }): Promise<Folder>

  /**
   * List folders
   */
  folders(): Promise<Folder[]>

  /**
   * Delete a folder
   */
  deleteFolder(folderId: string): Promise<void>

  /**
   * Move video to folder
   */
  moveToFolder(videoId: string, folderId: string): Promise<Video>

  /**
   * Get video metrics
   */
  metrics(videoId: string, period?: '1h' | '24h' | '7d' | '30d'): Promise<VideoMetrics>

  /**
   * Get transcript
   */
  transcript(videoId: string, language?: string): Promise<Transcript>

  /**
   * Add captions
   */
  addCaptions(videoId: string, captions: { language: string; label: string; content: string }): Promise<Caption>

  /**
   * List captions
   */
  captions(videoId: string): Promise<Caption[]>

  /**
   * Generate auto-captions
   */
  generateCaptions(videoId: string, languages?: string[]): Promise<Caption[]>

  /**
   * Add chapters
   */
  addChapters(videoId: string, chapters: Array<{ title: string; startTime: number }>): Promise<Chapter[]>

  /**
   * Get chapters
   */
  chapters(videoId: string): Promise<Chapter[]>

  /**
   * Generate AI chapters
   */
  generateChapters(videoId: string): Promise<Chapter[]>

  /**
   * Summarize video with AI
   */
  summarize(videoId: string): Promise<GeneratedContent>

  /**
   * Search within video
   */
  search(videoId: string, query: string): Promise<Array<{ time: number; text: string; relevance: number }>>

  /**
   * Create a clip
   */
  clip(videoId: string, options: { start: number; end: number; title?: string }): Promise<Video>

  /**
   * Get embed code with options
   */
  embed(videoId: string, options?: { autoplay?: boolean; muted?: boolean; controls?: boolean; width?: number; height?: number }): Promise<string>

  /**
   * Create a live stream
   */
  createLiveStream(config: { title: string }): Promise<LiveStream>

  /**
   * Get live stream
   */
  getLiveStream(streamId: string): Promise<LiveStream>

  /**
   * End live stream
   */
  endLiveStream(streamId: string): Promise<LiveStream>

  /**
   * Get signed URL for private video
   */
  signedUrl(videoId: string, expiresIn?: number): Promise<string>
}

/**
 * Create a configured videos.as client
 */
export function Videos(options?: ClientOptions): VideosAsClient {
  return createClient<VideosAsClient>('https://videos.as', options)
}

/**
 * Default videos.as client instance
 */
export const videos: VideosAsClient = Videos({
  apiKey: typeof process !== 'undefined' ? (process.env?.VIDEOS_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const upload = (config: UploadConfig) => videos.upload(config)
export const summarize = (videoId: string) => videos.summarize(videoId)

export default videos

// Re-export types
export type { ClientOptions } from 'rpc.do'
