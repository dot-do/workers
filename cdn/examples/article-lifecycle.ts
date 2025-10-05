/**
 * Example: Complete Article Lifecycle
 * Demonstrates content supply chain from creation to consumption
 */

import type { CreationEvent, EditEvent, ApprovalEvent, PublishEvent, DistributionEvent, ConsumptionEvent } from '../src/types/events'
import type { ProvenanceEntry, AIDisclosure, License } from '../src/types/content'

// ===== 1. CREATION =====
// Article created by human author with AI assistance

const creationEvent: CreationEvent = {
  id: crypto.randomUUID(),
  eventType: 'creation',
  contentId: 'article-best-practices-2025',
  timestamp: Date.now(),
  actorId: 'author-john-smith',
  actorType: 'human',
  action: 'add',
  bizStep: 'creating',
  disposition: 'in_progress',
  readPoint: 'cms',
  bizLocation: 'editorial',

  // Creation-specific
  contentType: 'article',
  title: 'Best Practices for Content Supply Chain Management in 2025',
  creatorType: 'hybrid',
  aiModel: 'GPT-4',
  metadata: {
    tags: ['supply-chain', 'content-management', 'best-practices'],
    categories: ['technology', 'business'],
    language: 'en',
  },
}

// Track human author
const humanProvenance: ProvenanceEntry = {
  id: crypto.randomUUID(),
  contentId: 'article-best-practices-2025',
  creatorId: 'author-john-smith',
  creatorType: 'human',
  creatorName: 'John Smith',
  role: 'author',
  contributionType: 'original',
  timestamp: Date.now(),
}

// Track AI assistance
const aiProvenance: ProvenanceEntry = {
  id: crypto.randomUUID(),
  contentId: 'article-best-practices-2025',
  creatorId: 'openai-gpt4',
  creatorType: 'ai_model',
  creatorName: 'GPT-4',
  role: 'ai_assistant',
  contributionType: 'enhancement',
  timestamp: Date.now(),
  metadata: {
    aiModel: 'GPT-4',
    modelVersion: '2024-11-20',
    purpose: 'Outline generation and editing suggestions',
    tokensUsed: 2500,
  },
}

// AI disclosure for compliance
const aiDisclosure: AIDisclosure = {
  id: crypto.randomUUID(),
  contentId: 'article-best-practices-2025',
  aiGenerated: false,
  aiAssisted: true,
  aiModels: [
    {
      name: 'GPT-4',
      version: '2024-11-20',
      purpose: 'Outline generation and editing suggestions',
    },
  ],
  humanReview: true,
  disclosureText: 'This article was written by a human author with assistance from AI for outlining and editing suggestions.',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metadata: {
    gdprCompliant: true,
    aiActCompliant: true,
    disclosureVersion: '1.0',
  },
}

// Set license
const license: License = {
  id: crypto.randomUUID(),
  contentId: 'article-best-practices-2025',
  license: 'CC-BY',
  effectiveDate: Date.now(),
  constraints: {
    commercial: true,
    derivatives: true,
    attribution: true,
    shareAlike: false,
  },
  attributions: [
    {
      name: 'John Smith',
      url: 'https://example.com/authors/john-smith',
      license: 'CC-BY',
    },
  ],
}

// ===== 2. EDITING =====
// Article goes through multiple revisions

const editEvent: EditEvent = {
  id: crypto.randomUUID(),
  eventType: 'edit',
  contentId: 'article-best-practices-2025',
  timestamp: Date.now() + 3600000, // 1 hour later
  actorId: 'editor-jane-doe',
  actorType: 'human',
  action: 'modify',
  bizStep: 'editing',
  disposition: 'in_progress',
  readPoint: 'cms',
  bizLocation: 'editorial',

  previousVersion: 1,
  newVersion: 2,
  changes: {
    title: false,
    content: true,
    metadata: true,
    diff: '+ Added section on AI compliance\n+ Updated best practices list\n- Removed outdated references',
  },
  editType: 'major',
}

// Track editor contribution
const editorProvenance: ProvenanceEntry = {
  id: crypto.randomUUID(),
  contentId: 'article-best-practices-2025',
  creatorId: 'editor-jane-doe',
  creatorType: 'human',
  creatorName: 'Jane Doe',
  role: 'editor',
  contributionType: 'edit',
  timestamp: Date.now() + 3600000,
}

// ===== 3. APPROVAL =====
// Article goes through editorial workflow

const approvalEvent: ApprovalEvent = {
  id: crypto.randomUUID(),
  eventType: 'approval',
  contentId: 'article-best-practices-2025',
  timestamp: Date.now() + 7200000, // 2 hours later
  actorId: 'editor-jane-doe',
  actorType: 'human',
  action: 'observe',
  bizStep: 'reviewing',

  workflowId: 'workflow-editorial-001',
  workflowType: 'editorial',
  decision: 'approved',
  approverRole: 'senior-editor',
  comments: 'Excellent article, ready for publication. AI disclosure properly included.',
  metadata: {
    checklistItems: [
      { item: 'Grammar and spelling', passed: true },
      { item: 'Factual accuracy', passed: true },
      { item: 'SEO optimization', passed: true },
      { item: 'AI disclosure', passed: true },
      { item: 'Citations and references', passed: true },
    ],
  },
}

// ===== 4. PUBLISHING =====
// Article published to main website

const publishEvent: PublishEvent = {
  id: crypto.randomUUID(),
  eventType: 'publish',
  contentId: 'article-best-practices-2025',
  timestamp: Date.now() + 10800000, // 3 hours later
  actorId: 'publisher-system',
  actorType: 'system',
  action: 'modify',
  disposition: 'active',
  bizStep: 'publishing',
  readPoint: 'website',

  scheduledTime: Date.now() + 10800000,
  actualTime: Date.now() + 10800000,
  publishType: 'scheduled',
  metadata: {
    seo: {
      title: 'Best Practices for Content Supply Chain Management in 2025 | Tech Blog',
      description: 'Learn how to implement effective content supply chain management with our comprehensive 2025 guide.',
      keywords: ['content supply chain', 'content management', 'best practices', '2025'],
    },
  },
}

// ===== 5. DISTRIBUTION =====
// Article distributed to multiple channels

// Website distribution
const websiteDistribution: DistributionEvent = {
  id: crypto.randomUUID(),
  eventType: 'distribution',
  contentId: 'article-best-practices-2025',
  timestamp: Date.now() + 10800000,
  actorId: 'distributor-system',
  actorType: 'system',
  action: 'add',

  channelId: 'channel-website-main',
  channelType: 'website',
  platform: 'company-blog',
  distributionUrl: 'https://blog.example.com/content-supply-chain-best-practices-2025',
  status: 'published',
  metadata: {
    publishedTime: Date.now() + 10800000,
  },
}

// LinkedIn distribution
const linkedinDistribution: DistributionEvent = {
  id: crypto.randomUUID(),
  eventType: 'distribution',
  contentId: 'article-best-practices-2025',
  timestamp: Date.now() + 14400000, // 4 hours later
  actorId: 'social-media-manager',
  actorType: 'human',
  action: 'add',

  channelId: 'channel-linkedin',
  channelType: 'social',
  platform: 'linkedin',
  distributionUrl: 'https://linkedin.com/pulse/content-supply-chain-2025',
  status: 'published',
  metadata: {
    publishedTime: Date.now() + 14400000,
    customizations: {
      headline: 'Transform Your Content Strategy: 2025 Supply Chain Best Practices',
      excerpt: 'Discover cutting-edge approaches to managing your content lifecycle',
    },
  },
}

// Newsletter distribution
const newsletterDistribution: DistributionEvent = {
  id: crypto.randomUUID(),
  eventType: 'distribution',
  contentId: 'article-best-practices-2025',
  timestamp: Date.now() + 86400000, // 1 day later
  actorId: 'newsletter-system',
  actorType: 'system',
  action: 'add',

  channelId: 'channel-newsletter-weekly',
  channelType: 'newsletter',
  platform: 'sendgrid',
  status: 'scheduled',
  metadata: {
    scheduledTime: Date.now() + 604800000, // Next week
    customizations: {
      subject: 'This Week: Content Supply Chain Best Practices',
    },
  },
}

// ===== 6. CONSUMPTION =====
// Users reading and interacting with content

// User 1: Read full article on website
const consumption1: ConsumptionEvent = {
  id: crypto.randomUUID(),
  eventType: 'consumption',
  contentId: 'article-best-practices-2025',
  timestamp: Date.now() + 18000000, // 5 hours later
  actorId: 'reader-anonymous-001',
  actorType: 'human',
  action: 'observe',

  channelId: 'channel-website-main',
  consumerId: 'user-authenticated-456',
  consumerType: 'human',
  interactionType: 'complete',
  timeSpent: 420, // 7 minutes
  completionRate: 1.0,
  metadata: {
    deviceType: 'desktop',
    referrer: 'google',
    location: 'US-CA',
    sessionId: 'session-xyz789',
  },
}

// User 2: Clicked through from LinkedIn
const consumption2: ConsumptionEvent = {
  id: crypto.randomUUID(),
  eventType: 'consumption',
  contentId: 'article-best-practices-2025',
  timestamp: Date.now() + 21600000, // 6 hours later
  actorId: 'reader-linkedin-002',
  actorType: 'human',
  action: 'observe',

  channelId: 'channel-linkedin',
  consumerType: 'human',
  interactionType: 'click',
  timeSpent: 15, // Clicked through but didn't read
  completionRate: 0.0,
  metadata: {
    deviceType: 'mobile',
    referrer: 'linkedin',
    location: 'UK',
  },
}

// User 3: Shared article
const consumption3: ConsumptionEvent = {
  id: crypto.randomUUID(),
  eventType: 'consumption',
  contentId: 'article-best-practices-2025',
  timestamp: Date.now() + 25200000, // 7 hours later
  actorId: 'reader-engaged-003',
  actorType: 'human',
  action: 'observe',

  channelId: 'channel-website-main',
  consumerId: 'user-authenticated-789',
  consumerType: 'human',
  interactionType: 'share',
  timeSpent: 540, // 9 minutes - read and shared
  completionRate: 1.0,
  metadata: {
    deviceType: 'desktop',
    referrer: 'twitter',
    location: 'US-NY',
  },
}

// ===== COMPLETE LIFECYCLE SUMMARY =====

export const articleLifecycleExample = {
  contentId: 'article-best-practices-2025',

  // Phase 1: Creation (Human + AI)
  creation: {
    event: creationEvent,
    provenance: [humanProvenance, aiProvenance],
    aiDisclosure,
    license,
  },

  // Phase 2: Editing
  editing: {
    event: editEvent,
    provenance: editorProvenance,
  },

  // Phase 3: Approval
  approval: {
    event: approvalEvent,
  },

  // Phase 4: Publishing
  publishing: {
    event: publishEvent,
  },

  // Phase 5: Distribution (Multi-channel)
  distribution: {
    website: websiteDistribution,
    linkedin: linkedinDistribution,
    newsletter: newsletterDistribution,
  },

  // Phase 6: Consumption (User interactions)
  consumption: {
    completeRead: consumption1,
    clickThrough: consumption2,
    shareAction: consumption3,
  },

  // Timeline
  timeline: {
    created: creationEvent.timestamp,
    edited: editEvent.timestamp,
    approved: approvalEvent.timestamp,
    published: publishEvent.timestamp,
    distributed: {
      website: websiteDistribution.timestamp,
      linkedin: linkedinDistribution.timestamp,
      newsletter: newsletterDistribution.timestamp,
    },
    firstConsumption: consumption1.timestamp,
  },

  // Metrics (would be calculated from consumption events)
  metrics: {
    totalViews: 1247,
    uniqueViewers: 892,
    avgTimeSpent: 384, // seconds
    completionRate: 0.68,
    interactions: 156,
    shares: 34,
    comments: 12,
    byChannel: {
      website: { views: 856, interactions: 98 },
      linkedin: { views: 391, interactions: 58 },
    },
  },

  // Compliance
  compliance: {
    gdprCompliant: true,
    aiActCompliant: true,
    hasAIDisclosure: true,
    hasProperLicense: true,
    hasAttribution: true,
  },
}

// Usage in API:
// POST /events/creation    → creationEvent
// POST /provenance         → humanProvenance, aiProvenance
// POST /provenance/ai-disclosure → aiDisclosure
// POST /provenance/license → license
// POST /events/edit        → editEvent
// POST /events/approval    → approvalEvent
// POST /events/publish     → publishEvent
// POST /events/distribution → websiteDistribution, linkedinDistribution, newsletterDistribution
// POST /events/consumption  → consumption1, consumption2, consumption3
// GET /events/article-best-practices-2025/timeline → Full timeline
// GET /provenance/article-best-practices-2025/compliance → Compliance report
// GET /analytics/article-best-practices-2025/summary → Metrics
