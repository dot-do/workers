/**
 * SEO Performance Monitor Worker
 * Core Web Vitals tracking and performance monitoring
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import {
  WebVitalMetric,
  PerformanceRating,
  WebVitalsThresholds,
  type WebVitalMeasurement,
  type CoreWebVitalsReport,
  type PerformanceTimelineEntry,
  type PerformanceBudget,
  type PerformanceMonitoringConfig,
  type PerformanceAlert,
  type CloudflareWebAnalytics,
} from '@dot-do/seo-types'

// Environment bindings
interface Env {
  VITALS_CACHE: KVNamespace
  VITALS_HISTORY: KVNamespace
  VITALS_ANALYTICS: AnalyticsEngineDataset
  VITALS_BUCKET: R2Bucket
  VITALS_QUEUE: Queue
  DB: any
}

// RPC Methods
export class SEOPerformanceService extends WorkerEntrypoint<Env> {
  /**
   * Record Core Web Vitals measurement
   */
  async recordVitals(report: CoreWebVitalsReport): Promise<void> {
    // Write to Analytics Engine
    this.env.VITALS_ANALYTICS.writeDataPoint({
      indexes: [report.url, report.deviceType],
      blobs: [report.url, report.deviceType],
      doubles: [report.metrics.lcp.value, report.metrics.inp.value, report.metrics.cls.value],
    })

    // Update history in KV
    const date = new Date(report.timestamp).toISOString().split('T')[0]
    const key = `history:${report.url}:${report.deviceType}:${date}`

    const existing = (await this.env.VITALS_HISTORY.get<CoreWebVitalsReport[]>(key, 'json')) || []
    existing.push(report)

    await this.env.VITALS_HISTORY.put(key, JSON.stringify(existing), {
      expirationTtl: 86400 * 90, // 90 days
    })

    // Check for alerts
    await this.checkAlerts(report)

    // Send to queue for further processing
    await this.env.VITALS_QUEUE.send(report)
  }

  /**
   * Get Core Web Vitals history
   */
  async getHistory(url: string, deviceType: string, days: number = 7): Promise<CoreWebVitalsReport[]> {
    const reports: CoreWebVitalsReport[] = []
    const now = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const key = `history:${url}:${deviceType}:${dateStr}`

      const data = await this.env.VITALS_HISTORY.get<CoreWebVitalsReport[]>(key, 'json')
      if (data) reports.push(...data)
    }

    return reports
  }

  /**
   * Get aggregate metrics for URL
   */
  async getAggregateMetrics(url: string, days: number = 7): Promise<{ lcp: number; inp: number; cls: number }> {
    const reports = await this.getHistory(url, 'desktop', days)
    const mobileReports = await this.getHistory(url, 'mobile', days)
    const allReports = [...reports, ...mobileReports]

    if (allReports.length === 0) {
      return { lcp: 0, inp: 0, cls: 0 }
    }

    const sum = allReports.reduce(
      (acc, r) => ({
        lcp: acc.lcp + r.metrics.lcp.value,
        inp: acc.inp + r.metrics.inp.value,
        cls: acc.cls + r.metrics.cls.value,
      }),
      { lcp: 0, inp: 0, cls: 0 }
    )

    return {
      lcp: sum.lcp / allReports.length,
      inp: sum.inp / allReports.length,
      cls: sum.cls / allReports.length,
    }
  }

  /**
   * Check if URL passes Core Web Vitals
   */
  async checkCoreWebVitals(url: string): Promise<{ passed: boolean; metrics: { lcp: number; inp: number; cls: number } }> {
    const metrics = await this.getAggregateMetrics(url, 28) // 28 days for p75

    const passed =
      metrics.lcp <= WebVitalsThresholds.LCP.good && metrics.inp <= WebVitalsThresholds.INP.good && metrics.cls <= WebVitalsThresholds.CLS.good

    return { passed, metrics }
  }

  /**
   * Set monitoring configuration
   */
  async setMonitoringConfig(config: PerformanceMonitoringConfig): Promise<void> {
    const key = `config:${config.url}`
    await this.env.VITALS_CACHE.put(key, JSON.stringify(config))
  }

  /**
   * Get monitoring configuration
   */
  async getMonitoringConfig(url: string): Promise<PerformanceMonitoringConfig | null> {
    const key = `config:${url}`
    return await this.env.VITALS_CACHE.get<PerformanceMonitoringConfig>(key, 'json')
  }

  /**
   * Check for performance budget violations
   */
  async checkBudget(url: string, budget: PerformanceBudget): Promise<boolean> {
    const metrics = await this.getAggregateMetrics(url, 1) // Last day

    return metrics.lcp <= budget.lcp && metrics.inp <= budget.inp && metrics.cls <= budget.cls
  }

  /**
   * Generate performance snapshot (stored in R2)
   */
  async generateSnapshot(url: string): Promise<string> {
    const reports = await this.getHistory(url, 'desktop', 30)
    const mobileReports = await this.getHistory(url, 'mobile', 30)

    const snapshot = {
      url,
      timestamp: new Date().toISOString(),
      desktop: reports,
      mobile: mobileReports,
    }

    const key = `snapshots/${url}/${Date.now()}.json`
    await this.env.VITALS_BUCKET.put(key, JSON.stringify(snapshot))

    return key
  }

  /**
   * Check for performance alerts
   */
  private async checkAlerts(report: CoreWebVitalsReport): Promise<void> {
    const config = await this.getMonitoringConfig(report.url)
    if (!config?.alerts.enabled) return

    const alerts: PerformanceAlert[] = []

    if (config.alerts.thresholds.lcp && report.metrics.lcp.value > config.alerts.thresholds.lcp) {
      alerts.push({
        id: `alert-${Date.now()}-lcp`,
        timestamp: new Date().toISOString(),
        url: report.url,
        metric: WebVitalMetric.LCP,
        value: report.metrics.lcp.value,
        threshold: config.alerts.thresholds.lcp,
        severity: report.metrics.lcp.value > WebVitalsThresholds.LCP.poor ? 'critical' : 'warning',
        message: `LCP ${report.metrics.lcp.value}ms exceeds threshold ${config.alerts.thresholds.lcp}ms`,
      })
    }

    if (config.alerts.thresholds.inp && report.metrics.inp.value > config.alerts.thresholds.inp) {
      alerts.push({
        id: `alert-${Date.now()}-inp`,
        timestamp: new Date().toISOString(),
        url: report.url,
        metric: WebVitalMetric.INP,
        value: report.metrics.inp.value,
        threshold: config.alerts.thresholds.inp,
        severity: report.metrics.inp.value > WebVitalsThresholds.INP.poor ? 'critical' : 'warning',
        message: `INP ${report.metrics.inp.value}ms exceeds threshold ${config.alerts.thresholds.inp}ms`,
      })
    }

    if (config.alerts.thresholds.cls && report.metrics.cls.value > config.alerts.thresholds.cls) {
      alerts.push({
        id: `alert-${Date.now()}-cls`,
        timestamp: new Date().toISOString(),
        url: report.url,
        metric: WebVitalMetric.CLS,
        value: report.metrics.cls.value,
        threshold: config.alerts.thresholds.cls,
        severity: report.metrics.cls.value > WebVitalsThresholds.CLS.poor ? 'critical' : 'warning',
        message: `CLS ${report.metrics.cls.value} exceeds threshold ${config.alerts.thresholds.cls}`,
      })
    }

    // Store alerts and potentially notify
    for (const alert of alerts) {
      await this.env.VITALS_CACHE.put(`alert:${alert.id}`, JSON.stringify(alert), {
        expirationTtl: 86400 * 7,
      })
    }
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

// POST /vitals - Record Core Web Vitals
app.post('/vitals', async (c) => {
  const report = await c.req.json<CoreWebVitalsReport>()
  const service = new SEOPerformanceService(c.executionCtx, c.env)
  await service.recordVitals(report)
  return c.json({ success: true })
})

// GET /vitals/:url - Get vitals history
app.get('/vitals/:url', async (c) => {
  const url = decodeURIComponent(c.req.param('url'))
  const deviceType = (c.req.query('device') as 'desktop' | 'mobile') || 'desktop'
  const days = parseInt(c.req.query('days') || '7')

  const service = new SEOPerformanceService(c.executionCtx, c.env)
  const history = await service.getHistory(url, deviceType, days)

  return c.json(history)
})

// GET /aggregate/:url - Get aggregate metrics
app.get('/aggregate/:url', async (c) => {
  const url = decodeURIComponent(c.req.param('url'))
  const days = parseInt(c.req.query('days') || '7')

  const service = new SEOPerformanceService(c.executionCtx, c.env)
  const metrics = await service.getAggregateMetrics(url, days)

  return c.json(metrics)
})

// GET /check/:url - Check if passes CWV
app.get('/check/:url', async (c) => {
  const url = decodeURIComponent(c.req.param('url'))
  const service = new SEOPerformanceService(c.executionCtx, c.env)
  const result = await service.checkCoreWebVitals(url)
  return c.json(result)
})

// POST /config - Set monitoring config
app.post('/config', async (c) => {
  const config = await c.req.json<PerformanceMonitoringConfig>()
  const service = new SEOPerformanceService(c.executionCtx, c.env)
  await service.setMonitoringConfig(config)
  return c.json({ success: true })
})

// GET /config/:url - Get monitoring config
app.get('/config/:url', async (c) => {
  const url = decodeURIComponent(c.req.param('url'))
  const service = new SEOPerformanceService(c.executionCtx, c.env)
  const config = await service.getMonitoringConfig(url)
  return c.json(config)
})

// POST /budget - Check budget
app.post('/budget', async (c) => {
  const { url, budget } = await c.req.json<{ url: string; budget: PerformanceBudget }>()
  const service = new SEOPerformanceService(c.executionCtx, c.env)
  const passed = await service.checkBudget(url, budget)
  return c.json({ passed })
})

// POST /snapshot/:url - Generate snapshot
app.post('/snapshot/:url', async (c) => {
  const url = decodeURIComponent(c.req.param('url'))
  const service = new SEOPerformanceService(c.executionCtx, c.env)
  const key = await service.generateSnapshot(url)
  return c.json({ key })
})

// Queue consumer
export async function queue(batch: MessageBatch<CoreWebVitalsReport>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const report = message.body
    console.log('Processing vitals report:', report)
    // Additional processing (e.g., store in DB, trigger analytics)
  }
}

export default {
  fetch: app.fetch,
  queue,
}
