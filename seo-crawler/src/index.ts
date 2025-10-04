/**
 * SEO Crawler Detection Worker
 * Detects AI crawlers, manages bot access rules, generates robots.txt
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import {
  BotAccessLevel,
  type BotType,
  type BotPurpose,
  type BotAccessRule,
  type BotActivity,
  type BotStats,
  type RobotsTxtConfig,
} from '@dot-do/seo-types'

// Environment bindings
interface Env {
  BOT_RULES: KVNamespace
  BOT_ACTIVITY: KVNamespace
  BOT_ANALYTICS: AnalyticsEngineDataset
  BOT_QUEUE: Queue
  DB: any
}

// RPC Methods
export class SEOCrawlerService extends WorkerEntrypoint<Env> {
  /**
   * Detect bot from User-Agent
   */
  async detectBot(userAgent: string): Promise<{ isBot: boolean; botType?: BotType; botPurpose?: BotPurpose }> {
    const detector = new BotDetector()
    return detector.detect(userAgent)
  }

  /**
   * Check if bot has access to path
   */
  async checkAccess(botType: BotType, path: string): Promise<{ allowed: boolean; rule?: BotAccessRule }> {
    const key = `rule:${botType}`
    const rule = await this.env.BOT_RULES.get<BotAccessRule>(key, 'json')

    if (!rule) {
      return { allowed: true } // Default: allow if no rule
    }

    const allowed = checkPathAccess(path, rule)
    return { allowed, rule }
  }

  /**
   * Get or create bot access rule
   */
  async getRule(botType: BotType): Promise<BotAccessRule | null> {
    const key = `rule:${botType}`
    return await this.env.BOT_RULES.get<BotAccessRule>(key, 'json')
  }

  /**
   * Set bot access rule
   */
  async setRule(rule: BotAccessRule): Promise<void> {
    const key = `rule:${rule.userAgent}`
    await this.env.BOT_RULES.put(key, JSON.stringify(rule))
  }

  /**
   * Track bot activity
   */
  async trackActivity(activity: BotActivity): Promise<void> {
    // Write to Analytics Engine
    this.env.BOT_ANALYTICS.writeDataPoint({
      indexes: [activity.userAgent, activity.path],
      blobs: [activity.userAgent, activity.path, activity.ipAddress],
      doubles: [activity.responseTime],
    })

    // Send to queue for async processing
    await this.env.BOT_QUEUE.send(activity)

    // Update KV counters
    const date = new Date(activity.timestamp).toISOString().split('T')[0]
    const key = `activity:${activity.userAgent}:${date}`
    const existing = (await this.env.BOT_ACTIVITY.get<BotStats>(key, 'json')) || {
      userAgent: activity.userAgent,
      botType: activity.botType,
      purpose: activity.purpose,
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      rateLimitedRequests: 0,
      avgResponseTime: 0,
      pathsAccessed: [],
      firstSeen: activity.timestamp,
      lastSeen: activity.timestamp,
    }

    existing.totalRequests++
    existing.lastSeen = activity.timestamp
    if (activity.allowed) {
      existing.allowedRequests++
    } else {
      existing.blockedRequests++
    }

    // Update average response time
    existing.avgResponseTime = (existing.avgResponseTime * (existing.totalRequests - 1) + activity.responseTime) / existing.totalRequests

    // Track unique paths
    if (!existing.pathsAccessed.includes(activity.path)) {
      existing.pathsAccessed.push(activity.path)
    }

    await this.env.BOT_ACTIVITY.put(key, JSON.stringify(existing), {
      expirationTtl: 86400 * 90, // 90 days
    })
  }

  /**
   * Get bot statistics
   */
  async getStats(botType: BotType, days: number = 7): Promise<BotStats[]> {
    const stats: BotStats[] = []
    const now = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const key = `activity:${botType}:${dateStr}`
      const data = await this.env.BOT_ACTIVITY.get<BotStats>(key, 'json')
      if (data) stats.push(data)
    }

    return stats
  }

  /**
   * Generate robots.txt content
   */
  async generateRobotsTxt(config?: RobotsTxtConfig): Promise<string> {
    const generator = new RobotsTxtGenerator(this.env.BOT_RULES)
    return await generator.generate(config)
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

// Middleware: Detect and log bot activity
app.use('*', async (c, next) => {
  const userAgent = c.req.header('User-Agent') || ''
  const detector = new BotDetector()
  const result = detector.detect(userAgent)

  if (result.isBot) {
    const activity: BotActivity = {
      id: crypto.randomUUID(),
      userAgent: result.botType!,
      botType: result.botType,
      purpose: result.botPurpose,
      timestamp: new Date().toISOString(),
      path: c.req.path,
      method: c.req.method,
      statusCode: 200, // Will be updated after response
      responseTime: 0, // Will be updated after response
      ipAddress: c.req.header('CF-Connecting-IP') || '',
      referer: c.req.header('Referer'),
      allowed: true, // Will be updated after access check
    }

    // Track asynchronously
    c.executionCtx.waitUntil((async () => {
      const service = new SEOCrawlerService(c.executionCtx, c.env)
      await service.trackActivity(activity)
    })())
  }

  await next()
})

// GET /robots.txt - Generate robots.txt
app.get('/robots.txt', async (c) => {
  const service = new SEOCrawlerService(c.executionCtx, c.env)
  const config = c.req.query('config') ? JSON.parse(c.req.query('config')!) : undefined
  const robotsTxt = await service.generateRobotsTxt(config)

  return c.text(robotsTxt, 200, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'public, max-age=3600',
  })
})

// POST /detect - Detect bot from User-Agent
app.post('/detect', async (c) => {
  const { userAgent } = await c.req.json<{ userAgent: string }>()
  const service = new SEOCrawlerService(c.executionCtx, c.env)
  const result = await service.detectBot(userAgent)
  return c.json(result)
})

// GET /rules/:botType - Get bot access rule
app.get('/rules/:botType', async (c) => {
  const botType = c.req.param('botType') as BotType
  const service = new SEOCrawlerService(c.executionCtx, c.env)
  const rule = await service.getRule(botType)
  return c.json(rule)
})

// PUT /rules - Update bot access rule
app.put('/rules', async (c) => {
  const rule = await c.req.json<BotAccessRule>()
  const service = new SEOCrawlerService(c.executionCtx, c.env)
  await service.setRule(rule)
  return c.json({ success: true })
})

// GET /stats/:botType - Get bot statistics
app.get('/stats/:botType', async (c) => {
  const botType = c.req.param('botType') as BotType
  const days = parseInt(c.req.query('days') || '7')
  const service = new SEOCrawlerService(c.executionCtx, c.env)
  const stats = await service.getStats(botType, days)
  return c.json(stats)
})

// Queue consumer
export async function queue(batch: MessageBatch<BotActivity>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const activity = message.body
    // Process bot activity (e.g., store in DB, trigger alerts)
    console.log('Processing bot activity:', activity)
  }
}

export default {
  fetch: app.fetch,
  queue,
}

// Helper: Bot Detector
class BotDetector {
  private botPatterns: Record<string, { type: BotType; purpose: BotPurpose }> = {
    'ChatGPT-User': { type: 'ChatGPT-User/2.0' as BotType, purpose: 'live_retrieval' as BotPurpose },
    GPTBot: { type: 'GPTBot' as BotType, purpose: 'training' as BotPurpose },
    ClaudeBot: { type: 'ClaudeBot' as BotType, purpose: 'training' as BotPurpose },
    'Claude-Web': { type: 'Claude-Web' as BotType, purpose: 'live_retrieval' as BotPurpose },
    PerplexityBot: { type: 'PerplexityBot' as BotType, purpose: 'search_index' as BotPurpose },
    Googlebot: { type: 'Googlebot' as BotType, purpose: 'traditional' as BotPurpose },
    'Google-Extended': { type: 'Google-Extended' as BotType, purpose: 'training' as BotPurpose },
    Bingbot: { type: 'Bingbot' as BotType, purpose: 'traditional' as BotPurpose },
    // Add more bot patterns as needed
  }

  detect(userAgent: string): { isBot: boolean; botType?: BotType; botPurpose?: BotPurpose } {
    for (const [pattern, info] of Object.entries(this.botPatterns)) {
      if (userAgent.includes(pattern)) {
        return { isBot: true, ...info }
      }
    }
    return { isBot: false }
  }
}

// Helper: Check path access based on rule
function checkPathAccess(path: string, rule: BotAccessRule): boolean {
  if (!rule.paths || rule.paths.length === 0) {
    return rule.access !== BotAccessLevel.Disallow
  }

  const isAllowed = rule.paths.some((pattern: string) => {
    if (pattern.startsWith('/') && pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1)
      return path.startsWith(prefix)
    }
    return path === pattern
  })

  return rule.access === BotAccessLevel.Disallow ? !isAllowed : isAllowed
}

// Helper: robots.txt Generator
class RobotsTxtGenerator {
  constructor(private kvStore: KVNamespace) {}

  async generate(config?: RobotsTxtConfig): Promise<string> {
    let content = '# robots.txt generated by SEO Crawler Service\n\n'

    // Add sitemaps if provided
    if (config?.sitemaps && config.sitemaps.length > 0) {
      for (const sitemap of config.sitemaps) {
        content += `Sitemap: ${sitemap}\n`
      }
      content += '\n'
    }

    // Use config rules if provided, otherwise get from KV
    let rules: BotAccessRule[] = config?.rules || []

    if (!config?.rules) {
      // Get all bot rules from KV
      const list = await this.kvStore.list({ prefix: 'rule:' })
      for (const key of list.keys) {
        const rule = await this.kvStore.get<BotAccessRule>(key.name, 'json')
        if (rule) rules.push(rule)
      }
    }

    // Sort by priority
    rules.sort((a, b) => b.priority - a.priority)

    // Generate directives
    for (const rule of rules) {
      content += `User-agent: ${rule.userAgent}\n`

      if (rule.paths && rule.paths.length > 0) {
        // Generate Allow/Disallow for specific paths
        for (const path of rule.paths) {
          if (rule.access === BotAccessLevel.Disallow) {
            content += `Disallow: ${path}\n`
          } else {
            content += `Allow: ${path}\n`
          }
        }
      } else if (rule.access === BotAccessLevel.Disallow) {
        // Disallow all paths
        content += 'Disallow: /\n'
      }

      if (rule.rateLimit) {
        content += `Crawl-delay: ${rule.rateLimit.requests}\n`
      }

      content += '\n'
    }

    // Default rule for all bots
    content += 'User-agent: *\n'
    content += config?.defaultPolicy === BotAccessLevel.Disallow ? 'Disallow: /\n' : 'Allow: /\n'

    return content
  }
}
