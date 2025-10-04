/**
 * SEO Tools & Utilities Worker
 * llms.txt generator, sitemap generator, meta tags, robots.txt parser, URL utils
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import type { LLMSTxtConfig, LLMSTxtSection, LLMSTxtItem } from '@dot-do/seo-types'

// Environment bindings
interface Env {
  TOOLS_CACHE: KVNamespace
  SEO_BUCKET: R2Bucket
  DB: any
}

// RPC Methods
export class SEOToolsService extends WorkerEntrypoint<Env> {
  /**
   * Generate llms.txt file
   */
  async generateLLMSTxt(config: LLMSTxtConfig): Promise<string> {
    const generator = new LLMSTxtGenerator()
    return generator.generate(config)
  }

  /**
   * Generate XML sitemap
   */
  async generateSitemap(urls: string[], options?: { changefreq?: string; priority?: number }): Promise<string> {
    const generator = new SitemapGenerator()
    return generator.generate(urls, options)
  }

  /**
   * Parse robots.txt
   */
  async parseRobotsTxt(content: string): Promise<Record<string, any>> {
    const parser = new RobotsTxtParser()
    return parser.parse(content)
  }

  /**
   * Generate meta tags HTML
   */
  async generateMetaTags(options: {
    title: string
    description: string
    keywords?: string[]
    ogImage?: string
    twitterCard?: 'summary' | 'summary_large_image'
  }): Promise<string> {
    const generator = new MetaTagsGenerator()
    return generator.generate(options)
  }

  /**
   * Canonicalize URL
   */
  canonicalizeUrl(url: string): string {
    const canonical = new URLCanonicalizer()
    return canonical.canonicalize(url)
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text: string, count: number = 10): string[] {
    const extractor = new KeywordExtractor()
    return extractor.extract(text, count)
  }

  /**
   * Generate structured data script tag
   */
  generateStructuredData(schema: any): string {
    return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
  }

  /**
   * Validate URL format
   */
  validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      new URL(url)
      return { valid: true }
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' }
    }
  }

  /**
   * Store file in R2
   */
  async storeFile(key: string, content: string, contentType: string = 'text/plain'): Promise<void> {
    await this.env.SEO_BUCKET.put(key, content, {
      httpMetadata: {
        contentType,
      },
    })
  }

  /**
   * Retrieve file from R2
   */
  async getFile(key: string): Promise<string | null> {
    const object = await this.env.SEO_BUCKET.get(key)
    if (!object) return null
    return await object.text()
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

// POST /llms.txt - Generate llms.txt
app.post('/llms.txt', async (c) => {
  const config = await c.req.json<LLMSTxtConfig>()
  const service = new SEOToolsService(c.executionCtx, c.env)
  const content = await service.generateLLMSTxt(config)

  // Store in R2
  await service.storeFile('llms.txt', content, 'text/plain')

  return c.text(content, 200, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'public, max-age=3600',
  })
})

// GET /llms.txt - Serve llms.txt from R2
app.get('/llms.txt', async (c) => {
  const service = new SEOToolsService(c.executionCtx, c.env)
  const content = await service.getFile('llms.txt')

  if (!content) {
    return c.text('llms.txt not found', 404)
  }

  return c.text(content, 200, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'public, max-age=3600',
  })
})

// POST /sitemap - Generate XML sitemap
app.post('/sitemap', async (c) => {
  const { urls, options } = await c.req.json<{ urls: string[]; options?: any }>()
  const service = new SEOToolsService(c.executionCtx, c.env)
  const sitemap = await service.generateSitemap(urls, options)

  // Store in R2
  await service.storeFile('sitemap.xml', sitemap, 'application/xml')

  return c.text(sitemap, 200, {
    'Content-Type': 'application/xml',
    'Cache-Control': 'public, max-age=3600',
  })
})

// GET /sitemap.xml - Serve sitemap from R2
app.get('/sitemap.xml', async (c) => {
  const service = new SEOToolsService(c.executionCtx, c.env)
  const sitemap = await service.getFile('sitemap.xml')

  if (!sitemap) {
    return c.text('sitemap.xml not found', 404)
  }

  return c.text(sitemap, 200, {
    'Content-Type': 'application/xml',
    'Cache-Control': 'public, max-age=3600',
  })
})

// POST /parse-robots - Parse robots.txt
app.post('/parse-robots', async (c) => {
  const { content } = await c.req.json<{ content: string }>()
  const service = new SEOToolsService(c.executionCtx, c.env)
  const parsed = await service.parseRobotsTxt(content)
  return c.json(parsed)
})

// POST /meta-tags - Generate meta tags HTML
app.post('/meta-tags', async (c) => {
  const options = await c.req.json()
  const service = new SEOToolsService(c.executionCtx, c.env)
  const html = await service.generateMetaTags(options)
  return c.text(html, 200, { 'Content-Type': 'text/html' })
})

// POST /canonicalize - Canonicalize URL
app.post('/canonicalize', async (c) => {
  const { url } = await c.req.json<{ url: string }>()
  const service = new SEOToolsService(c.executionCtx, c.env)
  const canonical = service.canonicalizeUrl(url)
  return c.json({ canonical })
})

// POST /keywords - Extract keywords
app.post('/keywords', async (c) => {
  const { text, count } = await c.req.json<{ text: string; count?: number }>()
  const service = new SEOToolsService(c.executionCtx, c.env)
  const keywords = service.extractKeywords(text, count)
  return c.json({ keywords })
})

// POST /structured-data - Generate structured data script
app.post('/structured-data', async (c) => {
  const schema = await c.req.json()
  const service = new SEOToolsService(c.executionCtx, c.env)
  const html = service.generateStructuredData(schema)
  return c.text(html, 200, { 'Content-Type': 'text/html' })
})

// POST /validate-url - Validate URL
app.post('/validate-url', async (c) => {
  const { url } = await c.req.json<{ url: string }>()
  const service = new SEOToolsService(c.executionCtx, c.env)
  const result = service.validateUrl(url)
  return c.json(result)
})

export default {
  fetch: app.fetch,
}

// Helper: llms.txt Generator
class LLMSTxtGenerator {
  generate(config: LLMSTxtConfig): string {
    let content = `# ${config.title}\n\n`

    if (config.description) {
      content += `${config.description}\n\n`
    }

    for (const section of config.sections) {
      content += `## ${section.heading}\n\n`

      for (const item of section.items) {
        content += `- [${item.title}](${item.url})`
        if (item.description) {
          content += `: ${item.description}`
        }
        content += '\n'
      }

      content += '\n'
    }

    if (config.metadata) {
      content += '---\n\n'
      for (const [key, value] of Object.entries(config.metadata)) {
        content += `${key}: ${value}\n`
      }
    }

    return content
  }
}

// Helper: Sitemap Generator
class SitemapGenerator {
  generate(urls: string[], options?: { changefreq?: string; priority?: number }): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    for (const url of urls) {
      xml += '  <url>\n'
      xml += `    <loc>${this.escapeXml(url)}</loc>\n`
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`

      if (options?.changefreq) {
        xml += `    <changefreq>${options.changefreq}</changefreq>\n`
      }

      if (options?.priority !== undefined) {
        xml += `    <priority>${options.priority}</priority>\n`
      }

      xml += '  </url>\n'
    }

    xml += '</urlset>'
    return xml
  }

  private escapeXml(text: string): string {
    return text.replace(/[<>&'"]/g, (char) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      }
      return escapeMap[char] || char
    })
  }
}

// Helper: Robots.txt Parser
class RobotsTxtParser {
  parse(content: string): Record<string, any> {
    const lines = content.split('\n')
    const rules: Record<string, any> = {
      userAgents: [],
      sitemaps: [],
      crawlDelay: null,
    }

    let currentAgent: any = null

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const [key, ...valueParts] = trimmed.split(':')
      const value = valueParts.join(':').trim()

      const keyLower = key.toLowerCase()

      if (keyLower === 'user-agent') {
        if (currentAgent) {
          rules.userAgents.push(currentAgent)
        }
        currentAgent = {
          name: value,
          allow: [],
          disallow: [],
        }
      } else if (keyLower === 'sitemap') {
        rules.sitemaps.push(value)
      } else if (keyLower === 'crawl-delay' && currentAgent) {
        rules.crawlDelay = parseInt(value)
      } else if (keyLower === 'allow' && currentAgent) {
        currentAgent.allow.push(value)
      } else if (keyLower === 'disallow' && currentAgent) {
        currentAgent.disallow.push(value)
      }
    }

    if (currentAgent) {
      rules.userAgents.push(currentAgent)
    }

    return rules
  }
}

// Helper: Meta Tags Generator
class MetaTagsGenerator {
  generate(options: any): string {
    let html = ''

    // Basic meta tags
    html += `<meta charset="UTF-8">\n`
    html += `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n`
    html += `<title>${this.escapeHtml(options.title)}</title>\n`
    html += `<meta name="description" content="${this.escapeHtml(options.description)}">\n`

    if (options.keywords && options.keywords.length > 0) {
      html += `<meta name="keywords" content="${options.keywords.join(', ')}">\n`
    }

    // Open Graph tags
    html += `<meta property="og:title" content="${this.escapeHtml(options.title)}">\n`
    html += `<meta property="og:description" content="${this.escapeHtml(options.description)}">\n`

    if (options.ogImage) {
      html += `<meta property="og:image" content="${options.ogImage}">\n`
    }

    // Twitter Card tags
    const twitterCard = options.twitterCard || 'summary'
    html += `<meta name="twitter:card" content="${twitterCard}">\n`
    html += `<meta name="twitter:title" content="${this.escapeHtml(options.title)}">\n`
    html += `<meta name="twitter:description" content="${this.escapeHtml(options.description)}">\n`

    if (options.ogImage) {
      html += `<meta name="twitter:image" content="${options.ogImage}">\n`
    }

    return html
  }

  private escapeHtml(text: string): string {
    return text.replace(/[<>&'"]/g, (char) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&#39;',
        '"': '&quot;',
      }
      return escapeMap[char] || char
    })
  }
}

// Helper: URL Canonicalizer
class URLCanonicalizer {
  canonicalize(url: string): string {
    try {
      const parsed = new URL(url)

      // Normalize protocol to https
      parsed.protocol = 'https:'

      // Remove www. if present
      parsed.hostname = parsed.hostname.replace(/^www\./, '')

      // Remove trailing slash
      parsed.pathname = parsed.pathname.replace(/\/$/, '') || '/'

      // Sort query parameters
      const params = new URLSearchParams(parsed.search)
      const sorted = new URLSearchParams([...params.entries()].sort())
      parsed.search = sorted.toString()

      // Remove fragment
      parsed.hash = ''

      return parsed.toString()
    } catch {
      return url
    }
  }
}

// Helper: Keyword Extractor
class KeywordExtractor {
  private stopWords = new Set([
    'the',
    'is',
    'at',
    'which',
    'on',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'with',
    'to',
    'for',
    'of',
    'as',
    'by',
    'from',
    'this',
    'that',
    'these',
    'those',
    'be',
    'are',
    'was',
    'were',
    'been',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
  ])

  extract(text: string, count: number): string[] {
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3 && !this.stopWords.has(w))

    const freq: Record<string, number> = {}
    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map((entry) => entry[0])
  }
}
