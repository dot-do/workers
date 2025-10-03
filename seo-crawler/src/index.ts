/**
 * SEO Crawler Detection Worker
 * Detects AI crawlers, manages bot access rules, generates robots.txt
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import {
  type BotType,
  type BotPurpose,
  type BotAccessLevel,
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
      blobs: [activity.userAgent, activity.path, activity.ip],
      doubles: [activity.duration || 0],
    })

    // Send to queue for async processing
    await this.env.BOT_QUEUE.send(activity)

    // Update KV counters
    const date = new Date(activity.timestamp).toISOString().split('T')[0]
    const key = `activity:${activity.userAgent}:${date}`
    const existing = (await this.env.BOT_ACTIVITY.get<BotStats>(key, 'json')) || {
      userAgent: activity.userAgent,
      date,
      requests: 0,
      bytes: 0,
      duration: 0,
    }

    existing.requests++
    existing.bytes += activity.responseSize || 0
    existing.duration += activity.duration || 0

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
      userAgent: result.botType!,
      botPurpose: result.botPurpose,
      timestamp: new Date().toISOString(),
      path: c.req.path,
      method: c.req.method,
      ip: c.req.header('CF-Connecting-IP') || '',
      country: c.req.header('CF-IPCountry') || undefined,
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
    return rule.access !== 'blocked'
  }

  const isAllowed = rule.paths.some((pattern: string) => {
    if (pattern.startsWith('/') && pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1)
      return path.startsWith(prefix)
    }
    return path === pattern
  })

  return rule.access === 'blocked' ? !isAllowed : isAllowed
}

// Helper: robots.txt Generator
class RobotsTxtGenerator {
  constructor(private kvStore: KVNamespace) {}

  async generate(config?: RobotsTxtConfig): Promise<string> {
    let content = '# robots.txt generated by SEO Crawler Service\n\n'

    if (config?.sitemapUrl) {
      content += `Sitemap: ${config.sitemapUrl}\n\n`
    }

    // Get all bot rules from KV
    const list = await this.kvStore.list({ prefix: 'rule:' })
    const rules: BotAccessRule[] = []

    for (const key of list.keys) {
      const rule = await this.kvStore.get<BotAccessRule>(key.name, 'json')
      if (rule) rules.push(rule)
    }

    // Sort by priority
    rules.sort((a, b) => b.priority - a.priority)

    // Generate directives
    for (const rule of rules) {
      content += `User-agent: ${rule.userAgent}\n`

      if (rule.access === 'blocked') {
        content += 'Disallow: /\n'
      } else if (rule.paths && rule.paths.length > 0) {
        for (const path of rule.paths) {
          if (rule.access === 'blocked') {
            content += `Disallow: ${path}\n`
          } else {
            content += `Allow: ${path}\n`
          }
        }
      }

      if (rule.rateLimit) {
        content += `Crawl-delay: ${rule.rateLimit.requests}\n`
      }

      content += '\n'
    }

    // Default rule for all bots
    content += 'User-agent: *\n'
    content += config?.defaultAllow === false ? 'Disallow: /\n' : 'Allow: /\n'

    return content
  }
}
