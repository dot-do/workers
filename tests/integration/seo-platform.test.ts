/**
 * SEO Platform Integration Tests
 * Tests all 6 SEO workers working together
 */

import { describe, it, expect } from 'vitest'

describe('SEO Platform Integration', () => {
  const services = {
    crawler: process.env.SEO_CRAWLER_URL || 'http://localhost:8787',
    schema: process.env.SEO_SCHEMA_URL || 'http://localhost:8788',
    content: process.env.SEO_CONTENT_URL || 'http://localhost:8789',
    performance: process.env.SEO_PERFORMANCE_URL || 'http://localhost:8790',
    tools: process.env.SEO_TOOLS_URL || 'http://localhost:8791',
    admin: process.env.SEO_ADMIN_URL || 'http://localhost:8792',
  }

  describe('Service Health Checks', () => {
    it('should verify all services are running', async () => {
      const healthChecks = await Promise.all([
        fetch(`${services.admin}/health/crawler`),
        fetch(`${services.admin}/health/schema`),
        fetch(`${services.admin}/health/content`),
        fetch(`${services.admin}/health/performance`),
        fetch(`${services.admin}/health/tools`),
      ])

      for (const response of healthChecks) {
        expect(response.status).toBe(200)
      }
    })
  })

  describe('Full SEO Audit Workflow', () => {
    const testUrl = 'https://example.com/test-page'
    const testContent = `
      # Test Article

      This is a comprehensive test article about SEO best practices.
      SEO is important for visibility. Search engines use crawlers.

      ## Section 1
      Content optimization requires attention to E-E-A-T principles.

      ## Section 2
      Performance matters for user experience and rankings.
    `
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Article - SEO Best Practices</title>
          <meta name="description" content="Learn about SEO best practices">
        </head>
        <body>
          <h1>Test Article</h1>
          <p>This is a comprehensive test article about SEO best practices.</p>
        </body>
      </html>
    `

    it('should run full audit via admin dashboard', async () => {
      const response = await fetch(`${services.admin}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: testUrl,
          content: testContent,
          html: testHtml,
        }),
      })

      expect(response.status).toBe(200)
      const audit = await response.json()

      // Verify all service responses are included
      expect(audit).toHaveProperty('content')
      expect(audit).toHaveProperty('performance')
      expect(audit).toHaveProperty('schema')

      // Verify content analysis
      expect(audit.content).toHaveProperty('eeat')
      expect(audit.content).toHaveProperty('quality')
      expect(audit.content).toHaveProperty('recommendations')

      // Verify performance metrics
      expect(audit.performance).toHaveProperty('passed')

      // Verify schema generation
      expect(audit.schema).toHaveProperty('article')
    })
  })

  describe('Bot Detection and Access Control', () => {
    it('should detect and track bot activity', async () => {
      const botUserAgent = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0'

      const response = await fetch(`${services.crawler}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAgent: botUserAgent }),
      })

      expect(response.status).toBe(200)
      const detection = await response.json()

      expect(detection.isBot).toBe(true)
      expect(detection.botType).toBeDefined()
      expect(detection.botPurpose).toBeDefined()
    })

    it('should generate robots.txt with bot rules', async () => {
      const response = await fetch(`${services.crawler}/robots.txt`)

      expect(response.status).toBe(200)
      const robotsTxt = await response.text()

      expect(robotsTxt).toContain('User-agent:')
      expect(robotsTxt).toContain('Allow:')
    })
  })

  describe('Schema Generation', () => {
    it('should generate Article schema', async () => {
      const response = await fetch(`${services.schema}/article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: 'Test Article',
          description: 'Test description',
          datePublished: new Date().toISOString(),
        }),
      })

      expect(response.status).toBe(200)
      const schema = await response.json()

      expect(schema['@context']).toBe('https://schema.org')
      expect(schema['@type']).toBe('Article')
      expect(schema.headline).toBe('Test Article')
    })

    it('should generate Organization schema', async () => {
      const response = await fetch(`${services.schema}/organization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Company',
          url: 'https://example.com',
        }),
      })

      expect(response.status).toBe(200)
      const schema = await response.json()

      expect(schema['@context']).toBe('https://schema.org')
      expect(schema['@type']).toBe('Organization')
      expect(schema.name).toBe('Test Company')
    })
  })

  describe('Content Optimization', () => {
    const sampleContent = `
      Artificial Intelligence has revolutionized how we approach search engine optimization.
      Machine learning algorithms analyze content quality, user engagement, and semantic relevance.
      Expert SEO practitioners understand that E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
      is crucial for ranking well in modern search engines.
    `

    it('should analyze E-E-A-T signals', async () => {
      const response = await fetch(`${services.content}/eeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sampleContent }),
      })

      expect(response.status).toBe(200)
      const eeat = await response.json()

      expect(eeat).toHaveProperty('experience')
      expect(eeat).toHaveProperty('expertise')
      expect(eeat).toHaveProperty('authoritativeness')
      expect(eeat).toHaveProperty('trustworthiness')
      expect(eeat).toHaveProperty('overall')
    })

    it('should provide optimization recommendations', async () => {
      const response = await fetch(`${services.content}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com/article',
          content: sampleContent,
        }),
      })

      expect(response.status).toBe(200)
      const audit = await response.json()

      expect(audit).toHaveProperty('recommendations')
      expect(Array.isArray(audit.recommendations)).toBe(true)
      expect(audit).toHaveProperty('score')
    })
  })

  describe('Performance Monitoring', () => {
    it('should record Core Web Vitals', async () => {
      const vitalsReport = {
        url: 'https://example.com',
        deviceType: 'desktop',
        metrics: {
          lcp: { value: 2000, rating: 'good' },
          inp: { value: 150, rating: 'good' },
          cls: { value: 0.05, rating: 'good' },
        },
      }

      const response = await fetch(`${services.performance}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vitalsReport),
      })

      expect(response.status).toBe(200)
    })

    it('should retrieve performance history', async () => {
      const response = await fetch(`${services.performance}/history?url=https://example.com&days=7`)

      expect(response.status).toBe(200)
      const history = await response.json()

      expect(Array.isArray(history)).toBe(true)
    })
  })

  describe('SEO Tools', () => {
    it('should generate llms.txt', async () => {
      const config = {
        title: 'Test Site',
        description: 'AI-optimized content index',
        sections: [
          {
            heading: 'Documentation',
            items: [
              { title: 'Getting Started', url: '/docs/start', description: 'Quick start guide' },
            ],
          },
        ],
      }

      const response = await fetch(`${services.tools}/llms.txt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      expect(response.status).toBe(200)
      const llmsTxt = await response.text()

      expect(llmsTxt).toContain('# Test Site')
      expect(llmsTxt).toContain('Getting Started')
    })

    it('should generate XML sitemap', async () => {
      const urls = ['https://example.com/', 'https://example.com/about', 'https://example.com/contact']

      const response = await fetch(`${services.tools}/sitemap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      })

      expect(response.status).toBe(200)
      const sitemap = await response.text()

      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(sitemap).toContain('<urlset')
      expect(sitemap).toContain('https://example.com/')
    })

    it('should extract keywords from content', async () => {
      const response = await fetch(`${services.tools}/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'SEO optimization is crucial for search engine visibility. SEO strategies include content optimization.',
          count: 5,
        }),
      })

      expect(response.status).toBe(200)
      const result = await response.json()

      expect(result).toHaveProperty('keywords')
      expect(Array.isArray(result.keywords)).toBe(true)
      expect(result.keywords).toContain('optimization')
    })
  })

  describe('Admin Dashboard', () => {
    it('should get dashboard statistics', async () => {
      const response = await fetch(`${services.admin}/stats`)

      expect(response.status).toBe(200)
      const stats = await response.json()

      expect(stats).toHaveProperty('totalAudits')
      expect(stats).toHaveProperty('avgContentScore')
      expect(stats).toHaveProperty('topIssues')
    })

    it('should get URL overview', async () => {
      const response = await fetch(`${services.admin}/overview?url=https://example.com`)

      expect(response.status).toBe(200)
      const overview = await response.json()

      expect(overview).toHaveProperty('url')
      expect(overview.url).toBe('https://example.com')
    })
  })
})
