import type { Queue } from '@cloudflare/workers-types'

// Environment bindings
export interface Env {
  DB: D1Database
  KV: KVNamespace
  SOCIAL_QUEUE: Queue
  EMAIL_SERVICE: any
  ANALYTICS_SERVICE: any
  STORAGE_SERVICE: any // R2 for media storage
}

// Supported platforms
export type SocialPlatform = 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok' | 'youtube'

// Post types
export type PostType = 'text' | 'image' | 'video' | 'carousel' | 'story' | 'reel' | 'short'

// Post status lifecycle
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'deleted'

// Scheduling types
export type SchedulingType = 'immediate' | 'scheduled' | 'queue' | 'optimal'

// Social media post
export interface SocialMediaPost {
  id: string // ULID
  userId: string
  platform: SocialPlatform
  type: PostType
  status: PostStatus

  // Content
  content: string
  hashtags?: string[]
  mentions?: string[]
  mediaUrls?: string[]
  linkUrl?: string
  linkPreview?: LinkPreview

  // Scheduling
  schedulingType: SchedulingType
  scheduledAt?: string // ISO 8601
  publishedAt?: string // ISO 8601
  optimalTimeScore?: number // 0-100 if using optimal scheduling

  // Platform-specific IDs
  platformPostId?: string // ID from the platform after publishing
  platformUrl?: string // Public URL to the post

  // Engagement tracking
  likes?: number
  comments?: number
  shares?: number
  views?: number
  clicks?: number
  lastSyncedAt?: string // Last time analytics were synced

  // Metadata
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// Link preview for posts with URLs
export interface LinkPreview {
  title: string
  description: string
  imageUrl?: string
  domain: string
}

// Platform connection/authentication
export interface PlatformConnection {
  id: string
  userId: string
  platform: SocialPlatform
  status: 'active' | 'expired' | 'revoked' | 'error'

  // OAuth tokens
  accessToken: string // Encrypted
  refreshToken?: string // Encrypted
  expiresAt?: string

  // Platform-specific identifiers
  platformUserId: string
  platformUsername: string
  displayName?: string
  profileUrl?: string
  avatarUrl?: string

  // Permissions
  permissions: string[] // Scopes granted

  // Metadata
  metadata?: Record<string, unknown>
  connectedAt: string
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
}

// Content queue for batching posts
export interface ContentQueue {
  id: string
  userId: string
  name: string
  status: 'active' | 'paused' | 'completed'

  // Queue settings
  platforms: SocialPlatform[]
  postsPerDay: number
  preferredTimes?: string[] // HH:MM format
  timezone: string // IANA timezone

  // Content
  posts: string[] // Array of post IDs
  currentPosition: number

  // Metadata
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// Analytics for posts
export interface PostAnalytics {
  postId: string
  platform: SocialPlatform
  date: string // YYYY-MM-DD

  // Engagement metrics
  likes: number
  comments: number
  shares: number
  views: number
  clicks: number

  // Calculated metrics
  engagementRate: number // (likes + comments + shares) / views * 100
  clickThroughRate: number // clicks / views * 100

  // Audience
  reach?: number
  impressions?: number

  // Metadata
  metadata?: Record<string, unknown>
  syncedAt: string
}

// Platform-specific post requirements
export interface PlatformRequirements {
  platform: SocialPlatform
  textMaxLength: number
  textMinLength?: number
  hashtagsMax?: number
  mentionsMax?: number
  mediaMax?: number
  videoMaxSize?: number // Bytes
  videoMaxDuration?: number // Seconds
  imageMaxSize?: number // Bytes
  imageFormats?: string[]
  videoFormats?: string[]
}

// Optimal posting times based on audience analytics
export interface OptimalTime {
  platform: SocialPlatform
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  hour: number // 0-23
  score: number // 0-100 (higher is better)
  engagement: {
    avgLikes: number
    avgComments: number
    avgShares: number
  }
}

// Request types

export interface CreatePostRequest {
  userId: string
  platform: SocialPlatform
  type: PostType
  content: string
  hashtags?: string[]
  mentions?: string[]
  mediaUrls?: string[]
  linkUrl?: string
  schedulingType: SchedulingType
  scheduledAt?: string // Required if schedulingType === 'scheduled'
}

export interface UpdatePostRequest {
  postId: string
  content?: string
  hashtags?: string[]
  mentions?: string[]
  mediaUrls?: string[]
  linkUrl?: string
  schedulingType?: SchedulingType
  scheduledAt?: string
}

export interface PublishPostRequest {
  postId: string
  force?: boolean // Publish even if not scheduled yet
}

export interface ConnectPlatformRequest {
  userId: string
  platform: SocialPlatform
  accessToken: string
  refreshToken?: string
  expiresIn?: number // Seconds
}

export interface DisconnectPlatformRequest {
  userId: string
  platform: SocialPlatform
}

export interface CreateQueueRequest {
  userId: string
  name: string
  platforms: SocialPlatform[]
  postsPerDay: number
  preferredTimes?: string[]
  timezone: string
}

export interface AddToQueueRequest {
  queueId: string
  postIds: string[]
}

export interface GetAnalyticsRequest {
  postId?: string
  userId?: string
  platform?: SocialPlatform
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  limit?: number
}

export interface GetOptimalTimesRequest {
  userId: string
  platform: SocialPlatform
  lookbackDays?: number // Default 30
}

export interface SyncPlatformAnalyticsRequest {
  userId: string
  platform: SocialPlatform
  postIds?: string[] // Specific posts, or all if not provided
}

// Response types

export interface CreatePostResponse {
  post: SocialMediaPost
}

export interface PublishPostResponse {
  post: SocialMediaPost
  platformPostId: string
  platformUrl: string
}

export interface GetPostsResponse {
  posts: SocialMediaPost[]
  total: number
  hasMore: boolean
}

export interface GetAnalyticsResponse {
  analytics: PostAnalytics[]
  summary: {
    totalLikes: number
    totalComments: number
    totalShares: number
    totalViews: number
    totalClicks: number
    avgEngagementRate: number
    avgClickThroughRate: number
  }
}

export interface GetOptimalTimesResponse {
  optimalTimes: OptimalTime[]
  recommendation: string // Human-readable recommendation
}

// Queue message types
export type SocialQueueMessage =
  | { type: 'publish_post'; postId: string }
  | { type: 'sync_analytics'; userId: string; platform: SocialPlatform; postIds?: string[] }
  | { type: 'process_queue'; queueId: string }
  | { type: 'refresh_token'; connectionId: string }

// Platform-specific configurations
export const PLATFORM_REQUIREMENTS: Record<SocialPlatform, PlatformRequirements> = {
  twitter: {
    platform: 'twitter',
    textMaxLength: 280,
    hashtagsMax: 10,
    mentionsMax: 10,
    mediaMax: 4,
    videoMaxSize: 512 * 1024 * 1024, // 512MB
    videoMaxDuration: 140, // 2m 20s
    imageMaxSize: 5 * 1024 * 1024, // 5MB
    imageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    videoFormats: ['mp4', 'mov'],
  },
  linkedin: {
    platform: 'linkedin',
    textMaxLength: 3000,
    textMinLength: 1,
    mediaMax: 9,
    videoMaxSize: 5 * 1024 * 1024 * 1024, // 5GB
    videoMaxDuration: 600, // 10 minutes
    imageMaxSize: 10 * 1024 * 1024, // 10MB
    imageFormats: ['jpg', 'jpeg', 'png', 'gif'],
    videoFormats: ['mp4', 'mov', 'avi'],
  },
  facebook: {
    platform: 'facebook',
    textMaxLength: 63206,
    mediaMax: 10,
    videoMaxSize: 10 * 1024 * 1024 * 1024, // 10GB
    videoMaxDuration: 240 * 60, // 240 minutes
    imageMaxSize: 10 * 1024 * 1024, // 10MB
    imageFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'],
    videoFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'mkv'],
  },
  instagram: {
    platform: 'instagram',
    textMaxLength: 2200,
    hashtagsMax: 30,
    mediaMax: 10, // Carousel
    videoMaxSize: 4 * 1024 * 1024 * 1024, // 4GB
    videoMaxDuration: 60, // 60s for feed, 90s for reels
    imageMaxSize: 8 * 1024 * 1024, // 8MB
    imageFormats: ['jpg', 'jpeg', 'png'],
    videoFormats: ['mp4', 'mov'],
  },
  tiktok: {
    platform: 'tiktok',
    textMaxLength: 2200,
    hashtagsMax: 10,
    mediaMax: 1,
    videoMaxSize: 4 * 1024 * 1024 * 1024, // 4GB
    videoMaxDuration: 10 * 60, // 10 minutes
    videoFormats: ['mp4', 'mov', 'avi'],
  },
  youtube: {
    platform: 'youtube',
    textMaxLength: 5000, // Description
    textMinLength: 1,
    mediaMax: 1,
    videoMaxSize: 256 * 1024 * 1024 * 1024, // 256GB
    videoMaxDuration: 12 * 60 * 60, // 12 hours
    videoFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv'],
  },
}

// Default optimal posting times (can be overridden by user analytics)
export const DEFAULT_OPTIMAL_TIMES: OptimalTime[] = [
  // Twitter - weekdays 8-10am, 6-9pm
  { platform: 'twitter', dayOfWeek: 1, hour: 8, score: 85, engagement: { avgLikes: 12, avgComments: 3, avgShares: 5 } },
  { platform: 'twitter', dayOfWeek: 1, hour: 9, score: 90, engagement: { avgLikes: 15, avgComments: 4, avgShares: 6 } },
  { platform: 'twitter', dayOfWeek: 1, hour: 18, score: 88, engagement: { avgLikes: 14, avgComments: 4, avgShares: 6 } },

  // LinkedIn - weekdays 7-9am, 12pm, 5-6pm
  { platform: 'linkedin', dayOfWeek: 2, hour: 7, score: 82, engagement: { avgLikes: 20, avgComments: 5, avgShares: 8 } },
  { platform: 'linkedin', dayOfWeek: 2, hour: 8, score: 92, engagement: { avgLikes: 30, avgComments: 8, avgShares: 12 } },
  { platform: 'linkedin', dayOfWeek: 2, hour: 12, score: 85, engagement: { avgLikes: 25, avgComments: 6, avgShares: 10 } },

  // Facebook - weekdays 1-4pm, weekend 9am-1pm
  { platform: 'facebook', dayOfWeek: 3, hour: 13, score: 80, engagement: { avgLikes: 18, avgComments: 6, avgShares: 4 } },
  { platform: 'facebook', dayOfWeek: 3, hour: 14, score: 85, engagement: { avgLikes: 22, avgComments: 7, avgShares: 5 } },
  { platform: 'facebook', dayOfWeek: 6, hour: 10, score: 88, engagement: { avgLikes: 25, avgComments: 8, avgShares: 6 } },

  // Instagram - weekdays 11am-1pm, 7-9pm
  { platform: 'instagram', dayOfWeek: 4, hour: 11, score: 83, engagement: { avgLikes: 40, avgComments: 8, avgShares: 3 } },
  { platform: 'instagram', dayOfWeek: 4, hour: 12, score: 89, engagement: { avgLikes: 50, avgComments: 10, avgShares: 4 } },
  { platform: 'instagram', dayOfWeek: 4, hour: 19, score: 91, engagement: { avgLikes: 55, avgComments: 12, avgShares: 5 } },

  // TikTok - all week 6-10am, 7-11pm
  { platform: 'tiktok', dayOfWeek: 5, hour: 7, score: 87, engagement: { avgLikes: 100, avgComments: 15, avgShares: 20 } },
  { platform: 'tiktok', dayOfWeek: 5, hour: 8, score: 93, engagement: { avgLikes: 120, avgComments: 18, avgShares: 25 } },
  { platform: 'tiktok', dayOfWeek: 5, hour: 20, score: 95, engagement: { avgLikes: 140, avgComments: 22, avgShares: 30 } },

  // YouTube - weekend 9am-3pm
  { platform: 'youtube', dayOfWeek: 0, hour: 10, score: 85, engagement: { avgLikes: 200, avgComments: 50, avgShares: 30 } },
  { platform: 'youtube', dayOfWeek: 0, hour: 14, score: 88, engagement: { avgLikes: 220, avgComments: 55, avgShares: 35 } },
]
