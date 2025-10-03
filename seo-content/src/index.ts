/**
 * SEO Content Optimizer Worker
 * E-E-A-T analysis, semantic SEO, and content quality optimization
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import {
  type EEATSignals,
  type ExperienceSignals,
  type ExpertiseSignals,
  type AuthoritativenessSignals,
  type TrustworthinessSignals,
  type ContentQualityMetrics,
  type HeadingStructure,
  type ContentFreshness,
  type SemanticKeywordAnalysis,
  type EntityMention,
  EntityType,
  type TopicCluster,
  type ContentOptimizationRecommendations,
  type ContentRecommendation,
  RecommendationType,
  type ContentAuditResult,
  type MetaTagsAnalysis,
} from '@dot-do/seo-types'

// Environment bindings
interface Env {
  CONTENT_CACHE: KVNamespace
  EEAT_SCORES: KVNamespace
  CONTENT_ANALYTICS: AnalyticsEngineDataset
  CONTENT_QUEUE: Queue
  DB: any
  AI: any
}

// RPC Methods
export class SEOContentService extends WorkerEntrypoint<Env> {
  /**
   * Analyze E-E-A-T signals in content
   */
  async analyzeEEAT(content: string, metadata?: Record<string, any>): Promise<EEATSignals> {
    const analyzer = new EEATAnalyzer(this.env.AI)
    return await analyzer.analyze(content, metadata)
  }

  /**
   * Analyze content quality metrics
   */
  async analyzeQuality(content: string, html?: string): Promise<ContentQualityMetrics> {
    const analyzer = new QualityAnalyzer()
    return analyzer.analyze(content, html)
  }

  /**
   * Perform semantic keyword analysis
   */
  async analyzeSemantics(content: string, primaryKeyword: string): Promise<SemanticKeywordAnalysis> {
    const analyzer = new SemanticAnalyzer(this.env.AI)
    return await analyzer.analyze(content, primaryKeyword)
  }

  /**
   * Analyze meta tags
   */
  async analyzeMeta(html: string, primaryKeyword: string): Promise<MetaTagsAnalysis> {
    const analyzer = new MetaAnalyzer()
    return analyzer.analyze(html, primaryKeyword)
  }

  /**
   * Generate content optimization recommendations
   */
  async getRecommendations(audit: ContentAuditResult): Promise<ContentOptimizationRecommendations> {
    const generator = new RecommendationGenerator()
    return generator.generate(audit)
  }

  /**
   * Full content audit (cached)
   */
  async auditContent(url: string, content: string, html?: string): Promise<ContentAuditResult> {
    const cacheKey = `audit:${url}`

    // Check cache
    const cached = await this.env.CONTENT_CACHE.get<ContentAuditResult>(cacheKey, 'json')
    if (cached) return cached

    // Perform audit
    const eeatSignals = await this.analyzeEEAT(content)
    const qualityMetrics = await this.analyzeQuality(content, html)
    const primaryKeyword = this.extractPrimaryKeyword(content)
    const semanticAnalysis = await this.analyzeSemantics(content, primaryKeyword)
    const metaTags = html ? await this.analyzeMeta(html, primaryKeyword) : ({} as MetaTagsAnalysis)

    // Calculate overall score
    const overallScore = this.calculateOverallScore(eeatSignals, qualityMetrics, semanticAnalysis)
    const grade = this.scoreToGrade(overallScore)

    const audit: ContentAuditResult = {
      url,
      timestamp: new Date().toISOString(),
      eeatSignals,
      qualityMetrics,
      semanticAnalysis,
      metaTags,
      recommendations: await this.getRecommendations({
        url,
        timestamp: new Date().toISOString(),
        eeatSignals,
        qualityMetrics,
        semanticAnalysis,
        metaTags,
        overallScore,
        grade,
      } as ContentAuditResult),
      overallScore,
      grade,
    }

    // Cache for 1 hour
    await this.env.CONTENT_CACHE.put(cacheKey, JSON.stringify(audit), {
      expirationTtl: 3600,
    })

    // Track analytics
    this.env.CONTENT_ANALYTICS.writeDataPoint({
      indexes: [url],
      blobs: [url],
      doubles: [overallScore],
    })

    return audit
  }

  private extractPrimaryKeyword(content: string): string {
    // Simple extraction: most common non-stop word
    const words = content
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
    const freq: Record<string, number> = {}
    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1
    }
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'content'
  }

  private calculateOverallScore(eeat: EEATSignals, quality: ContentQualityMetrics, semantic: SemanticKeywordAnalysis): number {
    return Math.round((eeat.overall.score * 0.4 + quality.aeoScore * 0.3 + semantic.semanticRelevance * 0.3) * 100) / 100
  }

  private scoreToGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'A+'
    if (score >= 90) return 'A'
    if (score >= 85) return 'B+'
    if (score >= 80) return 'B'
    if (score >= 75) return 'C+'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

// POST /audit - Full content audit
app.post('/audit', async (c) => {
  const { url, content, html } = await c.req.json<{ url: string; content: string; html?: string }>()
  const service = new SEOContentService(c.executionCtx, c.env)
  const audit = await service.auditContent(url, content, html)
  return c.json(audit)
})

// POST /eeat - E-E-A-T analysis
app.post('/eeat', async (c) => {
  const { content, metadata } = await c.req.json<{ content: string; metadata?: Record<string, any> }>()
  const service = new SEOContentService(c.executionCtx, c.env)
  const eeat = await service.analyzeEEAT(content, metadata)
  return c.json(eeat)
})

// POST /quality - Quality metrics
app.post('/quality', async (c) => {
  const { content, html } = await c.req.json<{ content: string; html?: string }>()
  const service = new SEOContentService(c.executionCtx, c.env)
  const quality = await service.analyzeQuality(content, html)
  return c.json(quality)
})

// POST /semantics - Semantic analysis
app.post('/semantics', async (c) => {
  const { content, primaryKeyword } = await c.req.json<{ content: string; primaryKeyword: string }>()
  const service = new SEOContentService(c.executionCtx, c.env)
  const semantic = await service.analyzeSemantics(content, primaryKeyword)
  return c.json(semantic)
})

// POST /meta - Meta tags analysis
app.post('/meta', async (c) => {
  const { html, primaryKeyword } = await c.req.json<{ html: string; primaryKeyword: string }>()
  const service = new SEOContentService(c.executionCtx, c.env)
  const meta = await service.analyzeMeta(html, primaryKeyword)
  return c.json(meta)
})

// POST /recommendations - Get recommendations
app.post('/recommendations', async (c) => {
  const audit = await c.req.json<ContentAuditResult>()
  const service = new SEOContentService(c.executionCtx, c.env)
  const recommendations = await service.getRecommendations(audit)
  return c.json(recommendations)
})

// Queue consumer
export async function queue(batch: MessageBatch, env: Env): Promise<void> {
  const service = new SEOContentService({} as any, env)

  for (const message of batch.messages) {
    const { url, content, html } = message.body as { url: string; content: string; html?: string }
    try {
      await service.auditContent(url, content, html)
    } catch (error) {
      console.error('Failed to audit content:', error)
    }
  }
}

export default {
  fetch: app.fetch,
  queue,
}

// Helper: E-E-A-T Analyzer
class EEATAnalyzer {
  constructor(private ai: any) {}

  async analyze(content: string, metadata?: Record<string, any>): Promise<EEATSignals> {
    // Mock implementation - in production, use AI service
    const experience: ExperienceSignals = {
      hasFirstHandExperience: content.includes('I ') || content.includes('we '),
      personalAnecdotes: (content.match(/I |we /gi) || []).length,
      originalPhotos: 0,
      caseStudies: (content.match(/case study/gi) || []).length,
      realResults: (content.match(/result|outcome/gi) || []).length,
      score: 70,
    }

    const expertise: ExpertiseSignals = {
      authorCredentials: Boolean(metadata?.author?.credentials),
      professionalCertifications: metadata?.author?.certifications || [],
      industryAwards: metadata?.author?.awards || [],
      publishedWorks: metadata?.author?.publishedWorks || 0,
      speakingEngagements: metadata?.author?.speakingEngagements || 0,
      yearsOfExperience: metadata?.author?.yearsOfExperience,
      score: 75,
    }

    const authoritativeness: AuthoritativenessSignals = {
      backlinksCount: metadata?.backlinks || 0,
      domainAuthority: metadata?.domainAuthority || 50,
      mediaMentions: metadata?.mediaMentions || 0,
      industryRecognition: metadata?.industryRecognition || [],
      socialProof: {
        followers: metadata?.socialProof?.followers || 0,
        engagement: metadata?.socialProof?.engagement || 0,
      },
      score: 80,
    }

    const trustworthiness: TrustworthinessSignals = {
      httpsEnabled: metadata?.httpsEnabled ?? true,
      privacyPolicy: metadata?.privacyPolicy ?? true,
      contactInformation: metadata?.contactInformation ?? true,
      transparentSourcing: (content.match(/source:|according to/gi) || []).length > 0,
      factCheckingProcess: metadata?.factCheckingProcess ?? false,
      errorCorrection: metadata?.errorCorrection ?? false,
      lastUpdated: metadata?.lastUpdated || new Date().toISOString(),
      score: 85,
    }

    const overall = {
      score: Math.round((experience.score + expertise.score + authoritativeness.score + trustworthiness.score) / 4),
      rating: 'good' as const,
    }

    return {
      experience,
      expertise,
      authoritativeness,
      trustworthiness,
      overall,
    }
  }
}

// Helper: Quality Analyzer
class QualityAnalyzer {
  analyze(content: string, html?: string): ContentQualityMetrics {
    const wordCount = content.split(/\s+/).length
    const headingStructure = html ? this.extractHeadings(html) : this.createDefaultHeadingStructure()

    return {
      wordCount,
      readabilityScore: this.calculateReadability(content),
      keywordDensity: 0.02, // Mock
      headingStructure,
      internalLinks: (html?.match(/<a[^>]*href=["'][^"']*["']/gi) || []).length,
      externalLinks: 0, // Mock
      images: (html?.match(/<img/gi) || []).length,
      videos: (html?.match(/<video|<iframe/gi) || []).length,
      codeBlocks: (html?.match(/<code|<pre/gi) || []).length,
      hasFAQ: Boolean(html?.includes('faq') || content.toLowerCase().includes('frequently asked')),
      hasTableOfContents: Boolean(html?.includes('table of contents') || html?.includes('toc')),
      hasAuthorBio: Boolean(html?.includes('author') || html?.includes('bio')),
      freshness: this.analyzeFreshness(),
      uniqueness: 95, // Mock
      aeoScore: this.calculateAEOScore(content, headingStructure),
    }
  }

  private extractHeadings(html: string): HeadingStructure {
    return {
      h1Count: (html.match(/<h1/gi) || []).length,
      h2Count: (html.match(/<h2/gi) || []).length,
      h3Count: (html.match(/<h3/gi) || []).length,
      h4Count: (html.match(/<h4/gi) || []).length,
      h5Count: (html.match(/<h5/gi) || []).length,
      h6Count: (html.match(/<h6/gi) || []).length,
      hierarchy: [],
      followsAEOPattern: true,
    }
  }

  private createDefaultHeadingStructure(): HeadingStructure {
    return {
      h1Count: 1,
      h2Count: 0,
      h3Count: 0,
      h4Count: 0,
      h5Count: 0,
      h6Count: 0,
      hierarchy: [],
      followsAEOPattern: false,
    }
  }

  private calculateReadability(content: string): number {
    // Simplified Flesch Reading Ease
    const words = content.split(/\s+/).length
    const sentences = content.split(/[.!?]+/).length
    const syllables = content.split(/\s+/).reduce((sum, word) => sum + this.countSyllables(word), 0)

    return Math.max(0, Math.min(100, 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)))
  }

  private countSyllables(word: string): number {
    return (word.match(/[aeiouy]{1,2}/gi) || []).length
  }

  private analyzeFreshness(): ContentFreshness {
    const now = new Date()
    return {
      publishDate: now.toISOString(),
      lastModified: now.toISOString(),
      daysSincePublished: 0,
      daysSinceModified: 0,
      updateFrequency: 'monthly',
      isStale: false,
      needsUpdate: false,
    }
  }

  private calculateAEOScore(content: string, headings: HeadingStructure): number {
    let score = 50

    // H2 → H3 → bullets pattern
    if (headings.followsAEOPattern) score += 20

    // Direct answers
    if (content.match(/^(Yes|No|The answer is)/m)) score += 15

    // Bullet points
    if (content.match(/^[-*•]/m)) score += 10

    // Statistics
    if (content.match(/\d+%|\d+x/)) score += 5

    return Math.min(100, score)
  }
}

// Helper: Semantic Analyzer
class SemanticAnalyzer {
  constructor(private ai: any) {}

  async analyze(content: string, primaryKeyword: string): Promise<SemanticKeywordAnalysis> {
    // Mock implementation
    return {
      primaryKeyword,
      secondaryKeywords: ['secondary1', 'secondary2'],
      lsiKeywords: ['related1', 'related2', 'related3'],
      entities: [
        {
          entity: 'Example Entity',
          type: EntityType.Organization,
          mentions: 3,
          context: ['context1', 'context2'],
        },
      ],
      topicClusters: [
        {
          topic: 'Main Topic',
          subtopics: ['subtopic1', 'subtopic2'],
          coverage: 80,
          authority: 75,
          related: ['related1'],
        },
      ],
      keywordDensity: { [primaryKeyword]: 0.02 },
      semanticRelevance: 85,
    }
  }
}

// Helper: Meta Analyzer
class MetaAnalyzer {
  analyze(html: string, primaryKeyword: string): MetaTagsAnalysis {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)

    const title = titleMatch?.[1] || ''
    const description = descMatch?.[1] || ''

    return {
      title: {
        content: title,
        length: title.length,
        hasKeyword: title.toLowerCase().includes(primaryKeyword.toLowerCase()),
        optimal: title.length >= 50 && title.length <= 60,
      },
      description: {
        content: description,
        length: description.length,
        hasKeyword: description.toLowerCase().includes(primaryKeyword.toLowerCase()),
        optimal: description.length >= 150 && description.length <= 160,
      },
      ogTags: {},
      twitterTags: {},
    }
  }
}

// Helper: Recommendation Generator
class RecommendationGenerator {
  generate(audit: ContentAuditResult): ContentOptimizationRecommendations {
    const recommendations: ContentRecommendation[] = []

    // E-E-A-T recommendations
    if (audit.eeatSignals.experience.score < 70) {
      recommendations.push({
        type: RecommendationType.AddFirstHandExperience,
        title: 'Add First-Hand Experience',
        description: 'Include personal experiences and real-world examples',
        priority: 'high',
        effort: 'medium',
        impact: 'high',
        implementation: 'Add sections with "I" or "we" language describing your direct experience',
      })
    }

    // Quality recommendations
    if (audit.qualityMetrics.wordCount < 1500) {
      recommendations.push({
        type: RecommendationType.OptimizeWordCount,
        title: 'Increase Content Length',
        description: 'Aim for at least 1500 words for comprehensive coverage',
        priority: 'medium',
        effort: 'high',
        impact: 'medium',
        implementation: 'Add more detailed sections, examples, and explanations',
      })
    }

    // Meta recommendations
    if (!audit.metaTags.title.optimal) {
      recommendations.push({
        type: RecommendationType.OptimizeMetaTags,
        title: 'Optimize Title Tag',
        description: 'Title should be 50-60 characters',
        priority: 'high',
        effort: 'low',
        impact: 'high',
        implementation: 'Rewrite title to be more concise and include primary keyword',
      })
    }

    const priority = recommendations.some((r) => r.priority === 'high') ? 'high' : 'medium'

    return {
      priority,
      recommendations,
      estimatedImpact: {
        trafficIncrease: 15,
        citationIncrease: 25,
        rankingImprovement: 3,
      },
    }
  }
}
