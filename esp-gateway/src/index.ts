// ESP Gateway Service
// Unified interface for sending emails across multiple ESPs

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import type { Env, EmailMessage, SendResult, ESPProvider, ESPConfig, ESPHealth, SendOptions, BulkSendResult } from './types'
import { MailgunProvider } from './providers/mailgun'
import { SendGridProvider } from './providers/sendgrid'
import { ResendProvider } from './providers/resend'

// RPC Interface
export class ESPGatewayService extends WorkerEntrypoint<Env> {
  private providers: Map<ESPProvider, any> = new Map()

  /**
   * Send email via best available ESP
   */
  async send(message: EmailMessage, options: SendOptions = {}): Promise<SendResult> {
    // Get ESP configs
    const configs = await this.getESPConfigs()
    const healthData = await this.getESPHealth()

    // Determine provider to use
    const provider = await this.selectProvider(configs, healthData, options)

    if (!provider) {
      return {
        success: false,
        provider: 'mailgun', // default for error reporting
        messageId: '',
        error: 'No healthy ESP providers available',
      }
    }

    // Send via selected provider
    let result = await this.sendViaProvider(provider, message)

    // Fallback to other providers if enabled and send failed
    if (!result.success && options.fallback !== false) {
      const fallbackProviders = this.getFallbackProviders(configs, healthData, provider)
      for (const fallback of fallbackProviders) {
        result = await this.sendViaProvider(fallback, message)
        if (result.success) break
      }
    }

    // Update ESP health and rate limits
    await this.updateESPMetrics(result.provider, result.success)

    return result
  }

  /**
   * Bulk send emails
   */
  async bulkSend(messages: EmailMessage[], options: SendOptions = {}): Promise<BulkSendResult> {
    const sent: SendResult[] = []
    const failed: SendResult[] = []
    const byProvider: Record<ESPProvider, number> = {
      'mailgun': 0,
      'sendgrid': 0,
      'postmark': 0,
      'amazon-ses': 0,
      'resend': 0,
    }

    // Process in batches of 100
    const batchSize = 100
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      const results = await Promise.all(batch.map(msg => this.send(msg, options)))

      results.forEach(result => {
        if (result.success) {
          sent.push(result)
          byProvider[result.provider]++
        } else {
          failed.push(result)
        }
      })
    }

    return {
      sent,
      failed,
      summary: {
        total: messages.length,
        success: sent.length,
        failed: failed.length,
        byProvider,
      },
    }
  }

  /**
   * Get ESP configurations
   */
  private async getESPConfigs(): Promise<ESPConfig[]> {
    const cacheKey = 'esp:configs'
    const cached = await this.env.KV.get(cacheKey, 'json')
    if (cached) return cached as ESPConfig[]

    // Default configs (in production, load from DB)
    const configs: ESPConfig[] = [
      {
        provider: 'mailgun',
        apiKey: this.env.MAILGUN_API_KEY || '',
        domain: this.env.MAILGUN_DOMAIN || '',
        enabled: !!this.env.MAILGUN_API_KEY,
        priority: 8,
        rateLimit: 1000,
        dailyLimit: 50000,
        cost: 0.80, // $0.80 per 1000 emails
      },
      {
        provider: 'sendgrid',
        apiKey: this.env.SENDGRID_API_KEY || '',
        enabled: !!this.env.SENDGRID_API_KEY,
        priority: 7,
        rateLimit: 1000,
        dailyLimit: 100000,
        cost: 1.00,
      },
      {
        provider: 'resend',
        apiKey: this.env.RESEND_API_KEY || '',
        enabled: !!this.env.RESEND_API_KEY,
        priority: 9,
        rateLimit: 500,
        dailyLimit: 10000,
        cost: 1.00,
      },
    ]

    await this.env.KV.put(cacheKey, JSON.stringify(configs), { expirationTtl: 3600 })
    return configs
  }

  /**
   * Get ESP health status
   */
  private async getESPHealth(): Promise<Map<ESPProvider, ESPHealth>> {
    const health = new Map<ESPProvider, ESPHealth>()
    const providers: ESPProvider[] = ['mailgun', 'sendgrid', 'postmark', 'amazon-ses', 'resend']

    for (const provider of providers) {
      const cacheKey = `esp:health:${provider}`
      const cached = await this.env.KV.get(cacheKey, 'json')
      if (cached) {
        health.set(provider, cached as ESPHealth)
      } else {
        health.set(provider, {
          provider,
          healthy: true,
          lastCheck: Date.now(),
          consecutiveFailures: 0,
          currentRate: 0,
          dailyCount: 0,
        })
      }
    }

    return health
  }

  /**
   * Select best ESP provider based on config, health, and options
   */
  private async selectProvider(
    configs: ESPConfig[],
    health: Map<ESPProvider, ESPHealth>,
    options: SendOptions
  ): Promise<ESPProvider | null> {
    // If specific provider requested, use it
    if (options.provider) {
      const config = configs.find(c => c.provider === options.provider && c.enabled)
      const healthData = health.get(options.provider)
      if (config && healthData?.healthy) {
        return options.provider
      }
    }

    // Filter to enabled, healthy providers not at rate limit
    const available = configs
      .filter(c => {
        const h = health.get(c.provider)
        return (
          c.enabled &&
          c.apiKey &&
          h?.healthy &&
          h.currentRate < c.rateLimit &&
          (!c.dailyLimit || h.dailyCount < c.dailyLimit)
        )
      })
      .sort((a, b) => {
        // Sort by priority (higher first), then cost (lower first)
        if (a.priority !== b.priority) return b.priority - a.priority
        return a.cost - b.cost
      })

    return available[0]?.provider || null
  }

  /**
   * Get fallback providers (excluding failed provider)
   */
  private getFallbackProviders(
    configs: ESPConfig[],
    health: Map<ESPProvider, ESPHealth>,
    excludeProvider: ESPProvider
  ): ESPProvider[] {
    return configs
      .filter(c => {
        const h = health.get(c.provider)
        return (
          c.provider !== excludeProvider &&
          c.enabled &&
          c.apiKey &&
          h?.healthy &&
          h.currentRate < c.rateLimit
        )
      })
      .sort((a, b) => b.priority - a.priority)
      .map(c => c.provider)
  }

  /**
   * Send via specific ESP provider
   */
  private async sendViaProvider(provider: ESPProvider, message: EmailMessage): Promise<SendResult> {
    try {
      const configs = await this.getESPConfigs()
      const config = configs.find(c => c.provider === provider)

      if (!config) {
        return {
          success: false,
          provider,
          messageId: '',
          error: `Provider ${provider} not configured`,
        }
      }

      // Get or create provider instance
      let providerInstance = this.providers.get(provider)
      if (!providerInstance) {
        providerInstance = this.createProvider(provider, config)
        this.providers.set(provider, providerInstance)
      }

      return await providerInstance.send(message)
    } catch (error: any) {
      return {
        success: false,
        provider,
        messageId: '',
        error: error.message,
      }
    }
  }

  /**
   * Create ESP provider instance
   */
  private createProvider(provider: ESPProvider, config: ESPConfig) {
    switch (provider) {
      case 'mailgun':
        return new MailgunProvider(config)
      case 'sendgrid':
        return new SendGridProvider(config)
      case 'resend':
        return new ResendProvider(config)
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  /**
   * Update ESP metrics (health, rate limit tracking)
   */
  private async updateESPMetrics(provider: ESPProvider, success: boolean) {
    const cacheKey = `esp:health:${provider}`
    const health = await this.env.KV.get(cacheKey, 'json') as ESPHealth || {
      provider,
      healthy: true,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      currentRate: 0,
      dailyCount: 0,
    }

    // Update metrics
    health.lastCheck = Date.now()
    health.currentRate++
    health.dailyCount++

    if (success) {
      health.consecutiveFailures = 0
      health.healthy = true
    } else {
      health.consecutiveFailures++
      // Mark unhealthy after 3 consecutive failures
      if (health.consecutiveFailures >= 3) {
        health.healthy = false
      }
    }

    await this.env.KV.put(cacheKey, JSON.stringify(health), { expirationTtl: 3600 })
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

app.get('/health', (c) => c.json({ status: 'ok', service: 'esp-gateway' }))

app.post('/send', async (c) => {
  const { message, options } = await c.req.json()
  const service = new ESPGatewayService(c.executionCtx, c.env)
  const result = await service.send(message, options)
  return c.json(result)
})

app.post('/send/bulk', async (c) => {
  const { messages, options } = await c.req.json()
  const service = new ESPGatewayService(c.executionCtx, c.env)
  const result = await service.bulkSend(messages, options)
  return c.json(result)
})

app.get('/providers', async (c) => {
  const service = new ESPGatewayService(c.executionCtx, c.env)
  const configs = await (service as any).getESPConfigs()
  const health = await (service as any).getESPHealth()

  const providers = configs.map(config => ({
    provider: config.provider,
    enabled: config.enabled,
    priority: config.priority,
    cost: config.cost,
    health: health.get(config.provider),
  }))

  return c.json({ providers })
})

export default { fetch: app.fetch }
