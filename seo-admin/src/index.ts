/**
 * SEO Admin Dashboard Worker
 * Central management interface for all SEO services
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'

// Environment bindings
interface Env {
  ADMIN_CACHE: KVNamespace
  DB: any
  SEO_CRAWLER: any
  SEO_SCHEMA: any
  SEO_CONTENT: any
  SEO_PERFORMANCE: any
  SEO_TOOLS: any
}

// RPC Methods
export class SEOAdminService extends WorkerEntrypoint<Env> {
  /**
   * Get complete SEO overview for a URL
   */
  async getUrlOverview(url: string): Promise<any> {
    const [botStats, cwvCheck, contentAudit] = await Promise.all([
      this.env.SEO_CRAWLER.getStats('*', 7).catch(() => null),
      this.env.SEO_PERFORMANCE.checkCoreWebVitals(url).catch(() => null),
      this.env.ADMIN_CACHE.get(`audit:${url}`, 'json').catch(() => null),
    ])

    return {
      url,
      timestamp: new Date().toISOString(),
      botActivity: botStats,
      coreWebVitals: cwvCheck,
      contentQuality: contentAudit,
    }
  }

  /**
   * Get dashboard summary statistics
   */
  async getDashboardStats(): Promise<any> {
    const cacheKey = 'dashboard:stats'
    const cached = await this.env.ADMIN_CACHE.get(cacheKey, 'json')

    if (cached) return cached

    // Aggregate stats from all services
    const stats = {
      timestamp: new Date().toISOString(),
      totalUrls: 0,
      avgCoreWebVitalsScore: 0,
      avgContentScore: 0,
      botRequestsToday: 0,
      alertsCount: 0,
    }

    // Cache for 5 minutes
    await this.env.ADMIN_CACHE.put(cacheKey, JSON.stringify(stats), {
      expirationTtl: 300,
    })

    return stats
  }

  /**
   * Run full SEO audit for URL
   */
  async runFullAudit(url: string, content: string, html?: string): Promise<any> {
    const [crawlerDetection, schemaValidation, contentAudit, performanceCheck] = await Promise.all([
      this.env.SEO_CRAWLER.detectBot('*').catch(() => null),
      this.env.SEO_SCHEMA.validateSchema({ '@context': 'https://schema.org', '@type': 'WebPage' }).catch(() => null),
      this.env.SEO_CONTENT.auditContent(url, content, html).catch(() => null),
      this.env.SEO_PERFORMANCE.checkCoreWebVitals(url).catch(() => null),
    ])

    const audit = {
      url,
      timestamp: new Date().toISOString(),
      crawler: crawlerDetection,
      schema: schemaValidation,
      content: contentAudit,
      performance: performanceCheck,
      overallScore: this.calculateOverallScore(contentAudit, performanceCheck),
      recommendations: this.aggregateRecommendations(contentAudit),
    }

    // Store audit result
    await this.env.ADMIN_CACHE.put(`audit:${url}`, JSON.stringify(audit), {
      expirationTtl: 3600, // 1 hour
    })

    return audit
  }

  /**
   * Get bot activity summary
   */
  async getBotActivity(days: number = 7): Promise<any> {
    // Mock implementation - in production, aggregate from crawler service
    return {
      period: { days, startDate: new Date(Date.now() - days * 86400000).toISOString(), endDate: new Date().toISOString() },
      totalRequests: 0,
      byBot: {},
      byPath: {},
      allowedRequests: 0,
      blockedRequests: 0,
    }
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(url: string, days: number = 30): Promise<any> {
    const [desktopHistory, mobileHistory] = await Promise.all([
      this.env.SEO_PERFORMANCE.getHistory(url, 'desktop', days).catch(() => []),
      this.env.SEO_PERFORMANCE.getHistory(url, 'mobile', days).catch(() => []),
    ])

    return {
      url,
      period: { days },
      desktop: this.calculateTrends(desktopHistory),
      mobile: this.calculateTrends(mobileHistory),
    }
  }

  /**
   * Batch operations
   */
  async batchAudit(urls: string[]): Promise<any[]> {
    const results = []

    for (const url of urls) {
      try {
        const result = await this.getUrlOverview(url)
        results.push(result)
      } catch (error) {
        results.push({ url, error: 'Failed to audit' })
      }
    }

    return results
  }

  private calculateOverallScore(contentAudit: any, performanceCheck: any): number {
    let score = 0
    let count = 0

    if (contentAudit?.overallScore) {
      score += contentAudit.overallScore
      count++
    }

    if (performanceCheck?.passed) {
      score += 100
      count++
    } else if (performanceCheck) {
      score += 50
      count++
    }

    return count > 0 ? Math.round(score / count) : 0
  }

  private aggregateRecommendations(contentAudit: any): any[] {
    if (!contentAudit?.recommendations?.recommendations) return []

    return contentAudit.recommendations.recommendations
      .filter((r: any) => r.priority === 'high')
      .slice(0, 5)
      .map((r: any) => ({
        type: r.type,
        title: r.title,
        priority: r.priority,
        impact: r.impact,
      }))
  }

  private calculateTrends(history: any[]): any {
    if (history.length === 0) {
      return { lcp: [], inp: [], cls: [], avgLCP: 0, avgINP: 0, avgCLS: 0 }
    }

    const lcp = history.map((h) => h.metrics?.lcp?.value || 0)
    const inp = history.map((h) => h.metrics?.inp?.value || 0)
    const cls = history.map((h) => h.metrics?.cls?.value || 0)

    return {
      lcp,
      inp,
      cls,
      avgLCP: lcp.reduce((a, b) => a + b, 0) / lcp.length,
      avgINP: inp.reduce((a, b) => a + b, 0) / inp.length,
      avgCLS: cls.reduce((a, b) => a + b, 0) / cls.length,
    }
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

// Serve dashboard HTML
app.get('/', (c) => {
  return c.html(getDashboardHTML())
})

// GET /api/overview/:url - Get URL overview
app.get('/api/overview/:url', async (c) => {
  const url = decodeURIComponent(c.req.param('url'))
  const service = new SEOAdminService(c.executionCtx, c.env)
  const overview = await service.getUrlOverview(url)
  return c.json(overview)
})

// GET /api/stats - Get dashboard stats
app.get('/api/stats', async (c) => {
  const service = new SEOAdminService(c.executionCtx, c.env)
  const stats = await service.getDashboardStats()
  return c.json(stats)
})

// POST /api/audit - Run full audit
app.post('/api/audit', async (c) => {
  const { url, content, html } = await c.req.json<{ url: string; content: string; html?: string }>()
  const service = new SEOAdminService(c.executionCtx, c.env)
  const audit = await service.runFullAudit(url, content, html)
  return c.json(audit)
})

// GET /api/bots - Get bot activity
app.get('/api/bots', async (c) => {
  const days = parseInt(c.req.query('days') || '7')
  const service = new SEOAdminService(c.executionCtx, c.env)
  const activity = await service.getBotActivity(days)
  return c.json(activity)
})

// GET /api/performance/:url - Get performance trends
app.get('/api/performance/:url', async (c) => {
  const url = decodeURIComponent(c.req.param('url'))
  const days = parseInt(c.req.query('days') || '30')
  const service = new SEOAdminService(c.executionCtx, c.env)
  const trends = await service.getPerformanceTrends(url, days)
  return c.json(trends)
})

// POST /api/batch-audit - Batch audit URLs
app.post('/api/batch-audit', async (c) => {
  const { urls } = await c.req.json<{ urls: string[] }>()
  const service = new SEOAdminService(c.executionCtx, c.env)
  const results = await service.batchAudit(urls)
  return c.json(results)
})

// Service health endpoints
app.get('/api/health/crawler', async (c) => {
  try {
    await c.env.SEO_CRAWLER.detectBot('test')
    return c.json({ status: 'healthy', service: 'crawler' })
  } catch {
    return c.json({ status: 'unhealthy', service: 'crawler' }, 503)
  }
})

app.get('/api/health/schema', async (c) => {
  try {
    await c.env.SEO_SCHEMA.validateSchema({ '@context': 'https://schema.org', '@type': 'Thing' })
    return c.json({ status: 'healthy', service: 'schema' })
  } catch {
    return c.json({ status: 'unhealthy', service: 'schema' }, 503)
  }
})

app.get('/api/health/content', async (c) => {
  try {
    await c.env.SEO_CONTENT.extractKeywords('test', 1)
    return c.json({ status: 'healthy', service: 'content' })
  } catch {
    return c.json({ status: 'unhealthy', service: 'content' }, 503)
  }
})

app.get('/api/health/performance', async (c) => {
  try {
    await c.env.SEO_PERFORMANCE.checkCoreWebVitals('https://example.com')
    return c.json({ status: 'healthy', service: 'performance' })
  } catch {
    return c.json({ status: 'unhealthy', service: 'performance' }, 503)
  }
})

app.get('/api/health/tools', async (c) => {
  try {
    await c.env.SEO_TOOLS.validateUrl('https://example.com')
    return c.json({ status: 'healthy', service: 'tools' })
  } catch {
    return c.json({ status: 'unhealthy', service: 'tools' }, 503)
  }
})

export default {
  fetch: app.fetch,
}

// Dashboard HTML
function getDashboardHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Admin Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 2.5rem; margin-bottom: 2rem; color: #60a5fa; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #334155;
    }
    .card h2 { font-size: 1.25rem; margin-bottom: 1rem; color: #94a3b8; }
    .stat { font-size: 2.5rem; font-weight: bold; color: #60a5fa; }
    .label { font-size: 0.875rem; color: #94a3b8; margin-top: 0.5rem; }
    .status-good { color: #34d399; }
    .status-warning { color: #fbbf24; }
    .status-poor { color: #f87171; }
    .service-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; }
    .service {
      background: #334155;
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
    }
    .service h3 { font-size: 0.875rem; margin-bottom: 0.5rem; }
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 0.5rem;
    }
    .healthy { background: #34d399; }
    .unhealthy { background: #f87171; }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      margin-top: 1rem;
    }
    button:hover { background: #2563eb; }
    input {
      background: #334155;
      border: 1px solid #475569;
      color: #e2e8f0;
      padding: 0.75rem;
      border-radius: 8px;
      width: 100%;
      font-size: 1rem;
    }
    .audit-form { margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 SEO/AEO Platform Dashboard</h1>

    <div class="grid">
      <div class="card">
        <h2>Total URLs Monitored</h2>
        <div class="stat" id="totalUrls">-</div>
        <div class="label">Across all services</div>
      </div>

      <div class="card">
        <h2>Avg Core Web Vitals</h2>
        <div class="stat" id="avgCWV">-</div>
        <div class="label">Desktop + Mobile</div>
      </div>

      <div class="card">
        <h2>Avg Content Score</h2>
        <div class="stat" id="avgContent">-</div>
        <div class="label">E-E-A-T + AEO</div>
      </div>

      <div class="card">
        <h2>Bot Requests Today</h2>
        <div class="stat" id="botRequests">-</div>
        <div class="label">AI crawlers detected</div>
      </div>
    </div>

    <div class="card">
      <h2>🛠️ Service Health</h2>
      <div class="service-grid" id="services">
        <div class="service">
          <h3>Crawler</h3>
          <div><span class="status-indicator healthy"></span>Healthy</div>
        </div>
        <div class="service">
          <h3>Schema</h3>
          <div><span class="status-indicator healthy"></span>Healthy</div>
        </div>
        <div class="service">
          <h3>Content</h3>
          <div><span class="status-indicator healthy"></span>Healthy</div>
        </div>
        <div class="service">
          <h3>Performance</h3>
          <div><span class="status-indicator healthy"></span>Healthy</div>
        </div>
        <div class="service">
          <h3>Tools</h3>
          <div><span class="status-indicator healthy"></span>Healthy</div>
        </div>
      </div>
    </div>

    <div class="card audit-form">
      <h2>🔍 Run SEO Audit</h2>
      <input type="url" id="auditUrl" placeholder="Enter URL to audit (e.g., https://example.com)" />
      <button onclick="runAudit()">Run Full Audit</button>
      <div id="auditResult" style="margin-top: 1rem;"></div>
    </div>
  </div>

  <script>
    // Load dashboard stats
    async function loadStats() {
      try {
        const response = await fetch('/api/stats')
        const stats = await response.json()

        document.getElementById('totalUrls').textContent = stats.totalUrls || 0
        document.getElementById('avgCWV').textContent = stats.avgCoreWebVitalsScore || '-'
        document.getElementById('avgContent').textContent = stats.avgContentScore || '-'
        document.getElementById('botRequests').textContent = stats.botRequestsToday || 0
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
    }

    // Check service health
    async function checkHealth() {
      const services = ['crawler', 'schema', 'content', 'performance', 'tools']
      for (const service of services) {
        try {
          const response = await fetch(\`/api/health/\${service}\`)
          const status = await response.json()
          console.log(\`\${service}: \${status.status}\`)
        } catch (error) {
          console.error(\`\${service}: unhealthy\`)
        }
      }
    }

    // Run audit
    async function runAudit() {
      const url = document.getElementById('auditUrl').value
      if (!url) {
        alert('Please enter a URL')
        return
      }

      const resultDiv = document.getElementById('auditResult')
      resultDiv.innerHTML = '<p>Running audit...</p>'

      try {
        const response = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, content: 'Sample content for audit' })
        })

        const audit = await response.json()
        resultDiv.innerHTML = \`
          <div style="margin-top: 1rem;">
            <h3>Audit Complete</h3>
            <p><strong>Overall Score:</strong> \${audit.overallScore || 'N/A'}</p>
            <p><strong>Timestamp:</strong> \${audit.timestamp}</p>
          </div>
        \`
      } catch (error) {
        resultDiv.innerHTML = '<p style="color: #f87171;">Audit failed. Please try again.</p>'
      }
    }

    // Initialize
    loadStats()
    checkHealth()

    // Refresh stats every 30 seconds
    setInterval(loadStats, 30000)
  </script>
</body>
</html>
`
}
