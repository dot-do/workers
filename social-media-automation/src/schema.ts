import { z } from 'zod'

// Enums
export const socialPlatformSchema = z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube'])

export const postTypeSchema = z.enum(['text', 'image', 'video', 'carousel', 'story', 'reel', 'short'])

export const postStatusSchema = z.enum(['draft', 'scheduled', 'publishing', 'published', 'failed', 'deleted'])

export const schedulingTypeSchema = z.enum(['immediate', 'scheduled', 'queue', 'optimal'])

// Core entities
export const socialMediaPostSchema = z.object({
  id: z.string().ulid(),
  userId: z.string().min(1),
  platform: socialPlatformSchema,
  type: postTypeSchema,
  status: postStatusSchema,
  content: z.string().min(1),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  linkUrl: z.string().url().optional(),
  linkPreview: z
    .object({
      title: z.string(),
      description: z.string(),
      imageUrl: z.string().url().optional(),
      domain: z.string(),
    })
    .optional(),
  schedulingType: schedulingTypeSchema,
  scheduledAt: z.string().datetime().optional(),
  publishedAt: z.string().datetime().optional(),
  optimalTimeScore: z.number().min(0).max(100).optional(),
  platformPostId: z.string().optional(),
  platformUrl: z.string().url().optional(),
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  views: z.number().int().min(0).optional(),
  clicks: z.number().int().min(0).optional(),
  lastSyncedAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const platformConnectionSchema = z.object({
  id: z.string().ulid(),
  userId: z.string().min(1),
  platform: socialPlatformSchema,
  status: z.enum(['active', 'expired', 'revoked', 'error']),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  platformUserId: z.string().min(1),
  platformUsername: z.string().min(1),
  displayName: z.string().optional(),
  profileUrl: z.string().url().optional(),
  avatarUrl: z.string().url().optional(),
  permissions: z.array(z.string()),
  metadata: z.record(z.unknown()).optional(),
  connectedAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const contentQueueSchema = z.object({
  id: z.string().ulid(),
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  status: z.enum(['active', 'paused', 'completed']),
  platforms: z.array(socialPlatformSchema).min(1),
  postsPerDay: z.number().int().min(1).max(50),
  preferredTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
  timezone: z.string().min(1),
  posts: z.array(z.string()),
  currentPosition: z.number().int().min(0),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const postAnalyticsSchema = z.object({
  postId: z.string().ulid(),
  platform: socialPlatformSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  likes: z.number().int().min(0),
  comments: z.number().int().min(0),
  shares: z.number().int().min(0),
  views: z.number().int().min(0),
  clicks: z.number().int().min(0),
  engagementRate: z.number().min(0).max(100),
  clickThroughRate: z.number().min(0).max(100),
  reach: z.number().int().min(0).optional(),
  impressions: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
  syncedAt: z.string().datetime(),
})

// Request schemas
export const createPostRequestSchema = z
  .object({
    userId: z.string().min(1, 'User ID is required'),
    platform: socialPlatformSchema,
    type: postTypeSchema,
    content: z.string().min(1, 'Content is required'),
    hashtags: z.array(z.string()).optional(),
    mentions: z.array(z.string()).optional(),
    mediaUrls: z.array(z.string().url()).optional(),
    linkUrl: z.string().url().optional(),
    schedulingType: schedulingTypeSchema,
    scheduledAt: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      // If scheduling type is 'scheduled', scheduledAt is required
      if (data.schedulingType === 'scheduled' && !data.scheduledAt) {
        return false
      }
      return true
    },
    {
      message: "scheduledAt is required when schedulingType is 'scheduled'",
      path: ['scheduledAt'],
    }
  )
  .refine(
    (data) => {
      // If scheduledAt is provided, it must be in the future
      if (data.scheduledAt) {
        const scheduledTime = new Date(data.scheduledAt)
        const now = new Date()
        return scheduledTime > now
      }
      return true
    },
    {
      message: 'scheduledAt must be in the future',
      path: ['scheduledAt'],
    }
  )

export const updatePostRequestSchema = z.object({
  postId: z.string().ulid('Invalid post ID'),
  content: z.string().min(1).optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  linkUrl: z.string().url().optional(),
  schedulingType: schedulingTypeSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
})

export const publishPostRequestSchema = z.object({
  postId: z.string().ulid('Invalid post ID'),
  force: z.boolean().optional(),
})

export const connectPlatformRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  platform: socialPlatformSchema,
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  expiresIn: z.number().int().positive().optional(),
})

export const disconnectPlatformRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  platform: socialPlatformSchema,
})

export const createQueueRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Queue name is required').max(100, 'Queue name too long'),
  platforms: z.array(socialPlatformSchema).min(1, 'At least one platform is required'),
  postsPerDay: z.number().int().min(1, 'At least 1 post per day').max(50, 'Maximum 50 posts per day'),
  preferredTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')).optional(),
  timezone: z.string().min(1, 'Timezone is required'),
})

export const addToQueueRequestSchema = z.object({
  queueId: z.string().ulid('Invalid queue ID'),
  postIds: z.array(z.string().ulid()).min(1, 'At least one post ID is required'),
})

export const getAnalyticsRequestSchema = z.object({
  postId: z.string().ulid().optional(),
  userId: z.string().optional(),
  platform: socialPlatformSchema.optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  limit: z.number().int().min(1).max(1000).optional(),
})

export const getOptimalTimesRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  platform: socialPlatformSchema,
  lookbackDays: z.number().int().min(7).max(90).optional(),
})

export const syncPlatformAnalyticsRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  platform: socialPlatformSchema,
  postIds: z.array(z.string().ulid()).optional(),
})

// Helper function to create validators
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    return schema.parse(data)
  }
}

// Export validators
export const validateCreatePost = createValidator(createPostRequestSchema)
export const validateUpdatePost = createValidator(updatePostRequestSchema)
export const validatePublishPost = createValidator(publishPostRequestSchema)
export const validateConnectPlatform = createValidator(connectPlatformRequestSchema)
export const validateDisconnectPlatform = createValidator(disconnectPlatformRequestSchema)
export const validateCreateQueue = createValidator(createQueueRequestSchema)
export const validateAddToQueue = createValidator(addToQueueRequestSchema)
export const validateGetAnalytics = createValidator(getAnalyticsRequestSchema)
export const validateGetOptimalTimes = createValidator(getOptimalTimesRequestSchema)
export const validateSyncPlatformAnalytics = createValidator(syncPlatformAnalyticsRequestSchema)
