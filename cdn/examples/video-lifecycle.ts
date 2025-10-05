/**
 * Example: Video Content Lifecycle
 * Demonstrates video production supply chain with multiple contributors
 */

import type { CreationEvent, EditEvent, DistributionEvent, ConsumptionEvent } from '../src/types/events'
import type { ProvenanceEntry, ContentRelationship } from '../src/types/content'

// ===== VIDEO PRODUCTION WORKFLOW =====

// 1. Script created (AI-generated initial draft)
const scriptCreation: CreationEvent = {
  id: crypto.randomUUID(),
  eventType: 'creation',
  contentId: 'video-tutorial-cloudflare-d1',
  timestamp: Date.now(),
  actorId: 'ai-claude',
  actorType: 'ai',
  action: 'add',
  bizStep: 'creating',
  disposition: 'in_progress',
  readPoint: 'scriptwriting-tool',

  contentType: 'video',
  title: 'Getting Started with Cloudflare D1: A Complete Tutorial',
  creatorType: 'ai',
  aiModel: 'Claude 3.5 Sonnet',
  metadata: {
    tags: ['cloudflare', 'd1', 'database', 'tutorial'],
    categories: ['education', 'technology'],
    language: 'en',
  },
}

// AI script writer
const aiScriptWriter: ProvenanceEntry = {
  id: crypto.randomUUID(),
  contentId: 'video-tutorial-cloudflare-d1',
  creatorId: 'claude-sonnet',
  creatorType: 'ai_model',
  creatorName: 'Claude 3.5 Sonnet',
  role: 'author',
  contributionType: 'original',
  timestamp: Date.now(),
  metadata: {
    aiModel: 'Claude 3.5 Sonnet',
    purpose: 'Script generation',
    prompt: 'Create a comprehensive D1 tutorial script',
  },
}

// 2. Human scriptwriter refines
const scriptEditByHuman: EditEvent = {
  id: crypto.randomUUID(),
  eventType: 'edit',
  contentId: 'video-tutorial-cloudflare-d1',
  timestamp: Date.now() + 1800000, // 30 min later
  actorId: 'scriptwriter-alice',
  actorType: 'human',
  action: 'modify',
  bizStep: 'editing',
  readPoint: 'scriptwriting-tool',

  previousVersion: 1,
  newVersion: 2,
  changes: {
    content: true,
    diff: '+ Added personal anecdotes\n+ Simplified technical jargon\n+ Added call-to-action',
  },
  editType: 'major',
}

const humanScriptwriter: ProvenanceEntry = {
  id: crypto.randomUUID(),
  contentId: 'video-tutorial-cloudflare-d1',
  creatorId: 'scriptwriter-alice',
  creatorType: 'human',
  creatorName: 'Alice Chen',
  role: 'editor',
  contributionType: 'edit',
  timestamp: Date.now() + 1800000,
}

// 3. Video filming
const filmingEvent: EditEvent = {
  id: crypto.randomUUID(),
  eventType: 'edit',
  contentId: 'video-tutorial-cloudflare-d1',
  timestamp: Date.now() + 86400000, // 1 day later
  actorId: 'presenter-bob',
  actorType: 'human',
  action: 'modify',
  bizStep: 'producing',
  readPoint: 'studio',
  bizLocation: 'production',

  previousVersion: 2,
  newVersion: 3,
  changes: {
    content: true,
    media: true,
  },
  editType: 'major',
}

const presenter: ProvenanceEntry = {
  id: crypto.randomUUID(),
  contentId: 'video-tutorial-cloudflare-d1',
  creatorId: 'presenter-bob',
  creatorType: 'human',
  creatorName: 'Bob Martinez',
  role: 'contributor',
  contributionType: 'original',
  timestamp: Date.now() + 86400000,
  metadata: {
    contribution: 'On-screen presentation',
  },
}

// 4. Video editing (AI-assisted)
const videoEditingEvent: EditEvent = {
  id: crypto.randomUUID(),
  eventType: 'edit',
  contentId: 'video-tutorial-cloudflare-d1',
  timestamp: Date.now() + 172800000, // 2 days later
  actorId: 'editor-carol',
  actorType: 'human',
  action: 'modify',
  bizStep: 'post-production',

  previousVersion: 3,
  newVersion: 4,
  changes: {
    content: true,
    media: true,
  },
  editType: 'major',
}

const videoEditor: ProvenanceEntry = {
  id: crypto.randomUUID(),
  contentId: 'video-tutorial-cloudflare-d1',
  creatorId: 'editor-carol',
  creatorType: 'human',
  creatorName: 'Carol Johnson',
  role: 'editor',
  contributionType: 'enhancement',
  timestamp: Date.now() + 172800000,
  metadata: {
    contribution: 'Video editing, effects, color grading',
  },
}

// AI-assisted editing tools
const aiVideoTool: ProvenanceEntry = {
  id: crypto.randomUUID(),
  contentId: 'video-tutorial-cloudflare-d1',
  creatorId: 'adobe-sensei',
  creatorType: 'ai_tool',
  creatorName: 'Adobe Sensei',
  role: 'ai_assistant',
  contributionType: 'enhancement',
  timestamp: Date.now() + 172800000,
  metadata: {
    contribution: 'Auto-captions, scene detection, color correction suggestions',
  },
}

// ===== DISTRIBUTION TO MULTIPLE PLATFORMS =====

// YouTube
const youtubeDistribution: DistributionEvent = {
  id: crypto.randomUUID(),
  eventType: 'distribution',
  contentId: 'video-tutorial-cloudflare-d1',
  timestamp: Date.now() + 259200000, // 3 days later
  actorId: 'publisher-system',
  actorType: 'system',
  action: 'add',

  channelId: 'channel-youtube',
  channelType: 'social',
  platform: 'youtube',
  distributionUrl: 'https://youtube.com/watch?v=abc123',
  status: 'published',
  metadata: {
    publishedTime: Date.now() + 259200000,
    customizations: {
      title: 'Cloudflare D1 Tutorial: Build Your First Database App',
      description: 'Learn Cloudflare D1 from scratch...',
      tags: ['cloudflare', 'd1', 'tutorial', 'serverless'],
    },
  },
}

// Company website
const websiteDistribution: DistributionEvent = {
  id: crypto.randomUUID(),
  eventType: 'distribution',
  contentId: 'video-tutorial-cloudflare-d1',
  timestamp: Date.now() + 259200000,
  actorId: 'publisher-system',
  actorType: 'system',
  action: 'add',

  channelId: 'channel-website',
  channelType: 'website',
  distributionUrl: 'https://example.com/tutorials/cloudflare-d1',
  status: 'published',
}

// LinkedIn
const linkedinDistribution: DistributionEvent = {
  id: crypto.randomUUID(),
  eventType: 'distribution',
  contentId: 'video-tutorial-cloudflare-d1',
  timestamp: Date.now() + 259200000,
  actorId: 'social-media-manager',
  actorType: 'human',
  action: 'add',

  channelId: 'channel-linkedin',
  channelType: 'social',
  platform: 'linkedin',
  distributionUrl: 'https://linkedin.com/posts/cloudflare-d1-tutorial',
  status: 'published',
  metadata: {
    customizations: {
      snippet: '5-minute clip: D1 Setup',
    },
  },
}

// ===== CONSUMPTION PATTERNS =====

// YouTube view - watched 80%
const youtubeView1: ConsumptionEvent = {
  id: crypto.randomUUID(),
  eventType: 'consumption',
  contentId: 'video-tutorial-cloudflare-d1',
  timestamp: Date.now() + 262800000, // 3 days + 1 hour
  actorId: 'viewer-youtube-001',
  actorType: 'human',
  action: 'observe',

  channelId: 'channel-youtube',
  consumerType: 'human',
  interactionType: 'view',
  timeSpent: 960, // 16 minutes (80% of 20 min video)
  completionRate: 0.8,
  metadata: {
    deviceType: 'desktop',
    referrer: 'youtube-search',
    location: 'US',
  },
}

// YouTube view - complete + like
const youtubeView2: ConsumptionEvent = {
  id: crypto.randomUUID(),
  eventType: 'consumption',
  contentId: 'video-tutorial-cloudflare-d1',
  timestamp: Date.now() + 266400000, // 3 days + 2 hours
  actorId: 'viewer-youtube-002',
  actorType: 'human',
  action: 'observe',

  channelId: 'channel-youtube',
  consumerType: 'human',
  interactionType: 'complete',
  timeSpent: 1200, // Full 20 minutes
  completionRate: 1.0,
  metadata: {
    deviceType: 'mobile',
    referrer: 'youtube-recommended',
    interaction: 'liked',
  },
}

// Website embedded view
const websiteView: ConsumptionEvent = {
  id: crypto.randomUUID(),
  eventType: 'consumption',
  contentId: 'video-tutorial-cloudflare-d1',
  timestamp: Date.now() + 270000000,
  actorId: 'visitor-website-003',
  actorType: 'human',
  action: 'observe',

  channelId: 'channel-website',
  consumerType: 'human',
  interactionType: 'view',
  timeSpent: 600, // 10 minutes (50% completion)
  completionRate: 0.5,
  metadata: {
    deviceType: 'desktop',
    referrer: 'google',
  },
}

// ===== CONTENT RELATIONSHIPS =====

// Related to written blog post
const relatedArticle: ContentRelationship = {
  id: crypto.randomUUID(),
  sourceId: 'video-tutorial-cloudflare-d1',
  targetId: 'article-d1-deep-dive',
  relationshipType: 'references',
  strength: 0.9,
  createdAt: Date.now(),
  metadata: {
    reason: 'Companion article with code examples',
  },
}

// Part of tutorial series
const seriesRelationship: ContentRelationship = {
  id: crypto.randomUUID(),
  sourceId: 'video-tutorial-cloudflare-d1',
  targetId: 'series-cloudflare-workers',
  relationshipType: 'derived_from',
  strength: 1.0,
  createdAt: Date.now(),
  metadata: {
    seriesPosition: 3,
    seriesTitle: 'Cloudflare Workers Tutorial Series',
  },
}

// ===== COMPLETE VIDEO LIFECYCLE =====

export const videoLifecycleExample = {
  contentId: 'video-tutorial-cloudflare-d1',
  contentType: 'video',
  title: 'Getting Started with Cloudflare D1: A Complete Tutorial',
  duration: 1200, // 20 minutes

  // Production phases
  production: {
    scriptCreation: {
      event: scriptCreation,
      provenance: aiScriptWriter,
    },
    scriptRefinement: {
      event: scriptEditByHuman,
      provenance: humanScriptwriter,
    },
    filming: {
      event: filmingEvent,
      provenance: presenter,
    },
    editing: {
      event: videoEditingEvent,
      provenance: [videoEditor, aiVideoTool],
    },
  },

  // Multi-platform distribution
  distribution: {
    youtube: youtubeDistribution,
    website: websiteDistribution,
    linkedin: linkedinDistribution,
  },

  // Audience engagement
  consumption: {
    youtube: [youtubeView1, youtubeView2],
    website: [websiteView],
  },

  // Content graph
  relationships: [relatedArticle, seriesRelationship],

  // Contributors (5 total: 1 AI model, 1 AI tool, 3 humans)
  contributors: [
    { name: 'Claude 3.5 Sonnet', type: 'ai_model', role: 'Script writer' },
    { name: 'Alice Chen', type: 'human', role: 'Script editor' },
    { name: 'Bob Martinez', type: 'human', role: 'Presenter' },
    { name: 'Carol Johnson', type: 'human', role: 'Video editor' },
    { name: 'Adobe Sensei', type: 'ai_tool', role: 'Editing assistant' },
  ],

  // Analytics summary
  metrics: {
    totalViews: 15234,
    totalWatchTime: 182808, // hours
    avgViewDuration: 840, // 14 minutes (70% completion)
    completionRate: 0.7,
    likes: 1247,
    comments: 89,
    shares: 234,
    byPlatform: {
      youtube: {
        views: 12456,
        watchTime: 150000,
        engagement: 0.11, // 11% engagement rate
      },
      website: {
        views: 2345,
        watchTime: 28000,
        engagement: 0.05,
      },
      linkedin: {
        views: 433,
        watchTime: 4808,
        engagement: 0.15,
      },
    },
  },

  // ROI tracking
  roi: {
    productionCost: 5000, // $5k (scriptwriting, filming, editing)
    aiCost: 50, // $50 (Claude API, Adobe Sensei)
    distributionCost: 0, // Free organic
    totalViews: 15234,
    leads: 127,
    conversions: 12,
    revenue: 3600, // $3.6k
    costPerView: 0.33,
    costPerLead: 39.76,
    costPerConversion: 420.83,
  },
}
