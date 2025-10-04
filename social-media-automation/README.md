# Social Media Automation Service

Manages social media post scheduling, publishing, and analytics across multiple platforms (Twitter, LinkedIn, Facebook, Instagram, TikTok, YouTube).

## Features

- **Multi-Platform Support**: 6 major social media platforms
- **Flexible Scheduling**: Immediate, scheduled, queue, or optimal time publishing
- **Content Queues**: Batch posts for consistent publishing
- **Analytics Tracking**: Engagement metrics and performance insights
- **Optimal Time Detection**: AI-powered best posting times
- **Platform Integration**: OAuth connections for seamless publishing
- **Media Handling**: Images, videos, carousels, stories, reels
- **Engagement Tracking**: Likes, comments, shares, views, clicks

## Supported Platforms

| Platform | Text Limit | Media Max | Special Features |
|----------|-----------|-----------|------------------|
| Twitter | 280 chars | 4 files | Threads, polls |
| LinkedIn | 3000 chars | 9 files | Long-form content |
| Facebook | 63K chars | 10 files | Groups, pages |
| Instagram | 2200 chars | 10 files | Stories, reels |
| TikTok | 2200 chars | 1 video | Short-form video |
| YouTube | 5000 chars | 1 video | Long-form video |

## RPC Interface

```typescript
// Create a post
const post = await env.SOCIAL_SERVICE.createPost({
  userId: 'user_123',
  platform: 'twitter',
  type: 'text',
  content: 'Hello world! #testing',
  hashtags: ['testing'],
  schedulingType: 'optimal', // immediate | scheduled | queue | optimal
})

// Publish immediately
const published = await env.SOCIAL_SERVICE.publishPost({
  postId: post.post.id,
  force: true,
})

// Connect a platform
const connection = await env.SOCIAL_SERVICE.connectPlatform({
  userId: 'user_123',
  platform: 'twitter',
  accessToken: 'oauth_token',
  refreshToken: 'refresh_token',
  expiresIn: 3600,
})

// Create a content queue
const queue = await env.SOCIAL_SERVICE.createQueue({
  userId: 'user_123',
  name: 'Daily Posts',
  platforms: ['twitter', 'linkedin'],
  postsPerDay: 3,
  preferredTimes: ['09:00', '13:00', '17:00'],
  timezone: 'America/Los_Angeles',
})

// Add posts to queue
await env.SOCIAL_SERVICE.addToQueue({
  queueId: queue.id,
  postIds: ['post_1', 'post_2', 'post_3'],
})

// Get analytics
const analytics = await env.SOCIAL_SERVICE.getAnalytics({
  userId: 'user_123',
  platform: 'twitter',
  startDate: '2025-10-01',
  endDate: '2025-10-03',
})

// Get optimal posting times
const optimalTimes = await env.SOCIAL_SERVICE.getOptimalTimes({
  userId: 'user_123',
  platform: 'twitter',
  lookbackDays: 30,
})
```

## HTTP API

### Create Post

```bash
POST /posts
{
  "userId": "user_123",
  "platform": "twitter",
  "type": "text",
  "content": "Hello world! #testing",
  "hashtags": ["testing"],
  "schedulingType": "scheduled",
  "scheduledAt": "2025-10-04T10:00:00Z"
}

# Response
{
  "success": true,
  "data": {
    "post": {
      "id": "01J1234...",
      "userId": "user_123",
      "platform": "twitter",
      "status": "scheduled",
      "content": "Hello world! #testing",
      "scheduledAt": "2025-10-04T10:00:00Z"
    }
  }
}
```

### Update Post

```bash
PUT /posts/:id
{
  "content": "Updated content",
  "hashtags": ["updated"]
}
```

### Publish Post

```bash
POST /posts/:id/publish
{
  "force": true
}

# Response
{
  "success": true,
  "data": {
    "post": { ... },
    "platformPostId": "twitter_123",
    "platformUrl": "https://twitter.com/user/status/twitter_123"
  }
}
```

### Connect Platform

```bash
POST /platforms/connect
{
  "userId": "user_123",
  "platform": "twitter",
  "accessToken": "oauth_token",
  "refreshToken": "refresh_token",
  "expiresIn": 3600
}
```

### Create Queue

```bash
POST /queues
{
  "userId": "user_123",
  "name": "Daily Posts",
  "platforms": ["twitter", "linkedin"],
  "postsPerDay": 3,
  "preferredTimes": ["09:00", "13:00", "17:00"],
  "timezone": "America/Los_Angeles"
}
```

### Get Analytics

```bash
GET /analytics?userId=user_123&platform=twitter&startDate=2025-10-01&endDate=2025-10-03

# Response
{
  "success": true,
  "data": {
    "analytics": [
      {
        "postId": "post_123",
        "platform": "twitter",
        "date": "2025-10-03",
        "likes": 42,
        "comments": 8,
        "shares": 12,
        "views": 500,
        "clicks": 25,
        "engagementRate": 12.4,
        "clickThroughRate": 5.0
      }
    ],
    "summary": {
      "totalLikes": 42,
      "totalComments": 8,
      "totalShares": 12,
      "totalViews": 500,
      "totalClicks": 25,
      "avgEngagementRate": 12.4,
      "avgClickThroughRate": 5.0
    }
  }
}
```

### Get Optimal Times

```bash
GET /optimal-times?userId=user_123&platform=twitter

# Response
{
  "success": true,
  "data": {
    "optimalTimes": [
      {
        "platform": "twitter",
        "dayOfWeek": 1,
        "hour": 9,
        "score": 90,
        "engagement": {
          "avgLikes": 15,
          "avgComments": 4,
          "avgShares": 6
        }
      }
    ],
    "recommendation": "Best time to post on twitter: Monday at 9:00 AM (score: 90/100)"
  }
}
```

## Scheduling Types

### 1. Immediate

Post is published immediately:

```typescript
{
  schedulingType: 'immediate'
}
```

### 2. Scheduled

Post at specific time:

```typescript
{
  schedulingType: 'scheduled',
  scheduledAt: '2025-10-04T10:00:00Z'
}
```

### 3. Queue

Add to content queue:

```typescript
{
  schedulingType: 'queue'
}
// Then add to queue separately
```

### 4. Optimal

Automatically schedule at best time:

```typescript
{
  schedulingType: 'optimal'
}
// System finds next optimal time slot
```

## Content Queues

Queues enable consistent posting schedules:

```typescript
// Create queue
const queue = await createQueue({
  name: 'Daily Twitter',
  platforms: ['twitter'],
  postsPerDay: 3,
  preferredTimes: ['09:00', '13:00', '17:00'],
  timezone: 'America/Los_Angeles',
})

// Add posts to queue
await addToQueue({
  queueId: queue.id,
  postIds: ['post_1', 'post_2', 'post_3'],
})

// Queue processes automatically at preferred times
```

## Analytics Tracking

### Metrics Tracked

- **Likes**: Post likes/favorites
- **Comments**: Discussion engagement
- **Shares**: Retweets, reposts, shares
- **Views**: Impressions and reach
- **Clicks**: Link clicks (if post contains URL)
- **Engagement Rate**: `(likes + comments + shares) / views * 100`
- **Click-Through Rate**: `clicks / views * 100`

### Syncing

Analytics sync automatically after publishing and periodically via queue:

```typescript
// Manual sync
await syncPlatformAnalytics({
  userId: 'user_123',
  platform: 'twitter',
  postIds: ['post_1', 'post_2'], // Optional: specific posts
})
```

## Optimal Posting Times

Default optimal times by platform:

**Twitter**:
- Weekdays 8-10am, 6-9pm

**LinkedIn**:
- Weekdays 7-9am, 12pm, 5-6pm

**Facebook**:
- Weekdays 1-4pm, Weekend 9am-1pm

**Instagram**:
- Weekdays 11am-1pm, 7-9pm

**TikTok**:
- All week 6-10am, 7-11pm

**YouTube**:
- Weekend 9am-3pm

These adapt based on user's historical engagement.

## Platform Requirements

Each platform has specific limits:

```typescript
PLATFORM_REQUIREMENTS = {
  twitter: {
    textMaxLength: 280,
    hashtagsMax: 10,
    mediaMax: 4,
    videoMaxSize: 512MB,
    videoMaxDuration: 140s,
  },
  linkedin: {
    textMaxLength: 3000,
    mediaMax: 9,
    videoMaxSize: 5GB,
    videoMaxDuration: 600s,
  },
  // ... etc
}
```

## Database Schema

### social_media_posts

```sql
CREATE TABLE social_media_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  content TEXT NOT NULL,
  hashtags TEXT,
  mentions TEXT,
  media_urls TEXT,
  link_url TEXT,
  scheduling_type TEXT NOT NULL,
  scheduled_at TEXT,
  published_at TEXT,
  optimal_time_score INTEGER,
  platform_post_id TEXT,
  platform_url TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  last_synced_at TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_posts_user ON social_media_posts(user_id);
CREATE INDEX idx_posts_platform ON social_media_posts(platform);
CREATE INDEX idx_posts_status ON social_media_posts(status);
CREATE INDEX idx_posts_scheduled ON social_media_posts(scheduled_at);
```

### platform_connections

```sql
CREATE TABLE platform_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT,
  platform_user_id TEXT NOT NULL,
  platform_username TEXT NOT NULL,
  display_name TEXT,
  profile_url TEXT,
  avatar_url TEXT,
  permissions TEXT,
  metadata TEXT,
  connected_at TEXT NOT NULL,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_connections_user ON platform_connections(user_id);
CREATE INDEX idx_connections_platform ON platform_connections(platform);
CREATE INDEX idx_connections_status ON platform_connections(status);
```

### post_analytics

```sql
CREATE TABLE post_analytics (
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  date TEXT NOT NULL,
  likes INTEGER NOT NULL,
  comments INTEGER NOT NULL,
  shares INTEGER NOT NULL,
  views INTEGER NOT NULL,
  clicks INTEGER NOT NULL,
  engagement_rate REAL NOT NULL,
  click_through_rate REAL NOT NULL,
  reach INTEGER,
  impressions INTEGER,
  metadata TEXT,
  synced_at TEXT NOT NULL,
  PRIMARY KEY (post_id, date)
);

CREATE INDEX idx_analytics_post ON post_analytics(post_id);
CREATE INDEX idx_analytics_date ON post_analytics(date);
```

## Queue Messages

The service processes four types of queue messages:

```typescript
// Publish a scheduled post
{ type: 'publish_post', postId: 'ulid' }

// Sync analytics from platform
{ type: 'sync_analytics', userId: 'user_123', platform: 'twitter', postIds?: [...] }

// Process next post in queue
{ type: 'process_queue', queueId: 'ulid' }

// Refresh OAuth token
{ type: 'refresh_token', connectionId: 'ulid' }
```

## Deployment

```bash
# Development
pnpm dev

# Production
pnpm deploy

# Type check
pnpm typecheck

# Run tests
pnpm test
```

## Environment Variables

None required - all configuration via service bindings.

## Service Bindings

- `DB` - D1 database
- `KV` - KV namespace for caching
- `SOCIAL_QUEUE` - Queue for async processing
- `EMAIL_SERVICE` - Email notifications
- `ANALYTICS_SERVICE` - Event tracking
- `STORAGE_SERVICE` - R2 for media storage

## Related Services

- **analytics** - Track post performance and user engagement
- **email** - Notification emails for publishing updates
- **storage** - Media file hosting (R2)

## Success Metrics

**Week 1:**
- 100+ posts created
- 50+ posts published
- 3+ platforms connected

**Month 1:**
- 1,000+ posts created
- 500+ posts published
- 50+ active queues
- 80%+ successful publishes

**Month 3:**
- 10,000+ posts created
- 5,000+ posts published
- 100+ active users
- 90%+ successful publishes
- Analytics synced for 95%+ posts
