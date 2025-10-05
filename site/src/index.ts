import components from "https://mdxui.org/shadcn/LandingPage"

const MDXContent = () => {
  return (
    <MDXProvider components={components}>
      <YourMDXContent />
    </MDXProvider>
  )
}


export class SiteService extends WorkerEntrypoint<Env> {
  // Create new site
  async createSite(config: SiteConfig): Promise<Site>

  // Get site by domain
  async getSite(domain: string): Promise<Site | null>

  // Update site
  async updateSite(id: string, updates: Partial<SiteConfig>): Promise<Site>

  // Delete site
  async deleteSite(id: string): Promise<void>

  // Deploy template
  async deployTemplate(templateId: string, domain: string, config: any): Promise<Site>

  // Get page content
  async getPage(domain: string, path: string): Promise<string>

  // Upload asset
  async uploadAsset(domain: string, path: string, content: ArrayBuffer): Promise<string>
}


/**
 * Type definitions for Site worker
 */

export interface Env {
  SITES: R2Bucket
  SITE_CACHE: KVNamespace
  DB: any
  STORAGE: any
  ENVIRONMENT: string
  CACHE_TTL: string
  pipeline: any
}

export interface SiteConfig {
  id: string
  domain: string
  title: string
  description?: string
  template: string
  theme?: {
    primaryColor?: string
    font?: string
    customCSS?: string
  }
  routes: SiteRoute[]
  assets?: {
    images?: string
    fonts?: string
    scripts?: string
  }
  seo?: {
    keywords?: string[]
    ogImage?: string
    twitterCard?: string
  }
}

export interface SiteRoute {
  path: string
  file: string
  layout?: string
}

export interface Site {
  id: string
  config: SiteConfig
  createdAt: string
  updatedAt: string
  status: 'draft' | 'published' | 'archived'
  analytics?: {
    views: number
    visitors: number
    lastViewed?: string
  }
}

export interface Template {
  id: string
  name: string
  description: string
  preview?: string
  files: {
    [path: string]: string
  }
  config: TemplateConfig
}

export interface TemplateConfig {
  customizable: string[]
  defaults: Record<string, any>
  requiredFields: string[]
}

export interface Component {
  name: string
  source: string
  props: ComponentProp[]
  examples?: string[]
}

export interface ComponentProp {
  name: string
  type: string
  required: boolean
  default?: any
  description?: string
}


/**
 * Zod validation schemas for Site worker
 */

import { z } from 'zod'

export const siteThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  font: z.string().optional(),
  customCSS: z.string().optional(),
})

export const siteRouteSchema = z.object({
  path: z.string().startsWith('/'),
  file: z.string().endsWith('.mdx'),
  layout: z.string().optional(),
})

export const siteConfigSchema = z.object({
  id: z.string(),
  domain: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  template: z.string(),
  theme: siteThemeSchema.optional(),
  routes: z.array(siteRouteSchema),
  assets: z.object({
    images: z.string().optional(),
    fonts: z.string().optional(),
    scripts: z.string().optional(),
  }).optional(),
  seo: z.object({
    keywords: z.array(z.string()).optional(),
    ogImage: z.string().url().optional(),
    twitterCard: z.string().optional(),
  }).optional(),
})

export const templateConfigSchema = z.object({
  customizable: z.array(z.string()),
  defaults: z.record(z.any()),
  requiredFields: z.array(z.string()),
})

export const templateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  preview: z.string().url().optional(),
  files: z.record(z.string()),
  config: templateConfigSchema,
})


/**
 * Site Worker - MDX Website Hosting
 *
 * Runtime MDX compilation and static site hosting
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { cache } from 'hono/cache'
import { ulid } from 'ulid'
import { siteConfigSchema, templateSchema } from './schema'
import type {
  Env,
  SiteConfig,
  Site,
  Template,
  SiteRoute,
  Component,
} from './types'

// Built-in templates
const TEMPLATES: Record<string, Template> = {
  'landing-page': {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Single-page marketing site with hero, features, and CTA',
    files: {
      'index.mdx': `---
$type: https://schema.org.ai/LandingPage
title: {{title}}
---

# {{hero.headline}}

{{hero.subheadline}}

<Button href="{{cta.url}}">{{cta.text}}</Button>
`,
    },
    config: {
      customizable: ['title', 'hero.headline', 'hero.subheadline', 'cta.text', 'cta.url'],
      defaults: {
        title: 'My Product',
        hero: {
          headline: 'Build faster',
          subheadline: 'Ship products in hours, not weeks',
        },
        cta: {
          text: 'Get Started',
          url: '/signup',
        },
      },
      requiredFields: ['title'],
    },
  },
  blog: {
    id: 'blog',
    name: 'Blog',
    description: 'Multi-page blog with post listings',
    files: {
      'index.mdx': `---
$type: https://schema.org.ai/Blog
title: {{title}}
---

# {{title}}

{{description}}
`,
      'blog/[slug].mdx': `---
$type: https://schema.org.ai/BlogPost
title: {{post.title}}
author: {{post.author}}
datePublished: {{post.date}}
---

# {{post.title}}

{{post.content}}
`,
    },
    config: {
      customizable: ['title', 'description'],
      defaults: {
        title: 'My Blog',
        description: 'Thoughts and writings',
      },
      requiredFields: ['title'],
    },
  },
}

export class SiteService extends WorkerEntrypoint<Env> {
  /**
   * RPC: Create new site
   */
  async createSite(config: SiteConfig): Promise<Site> {
    const validated = siteConfigSchema.parse(config)
    const id = validated.id || ulid()
    const now = new Date().toISOString()

    const site: Site = {
      id,
      config: validated,
      createdAt: now,
      updatedAt: now,
      status: 'draft',
    }

    // Save to database
    await this.env.DB.execute(
      `INSERT INTO sites (id, domain, config, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      validated.domain,
      JSON.stringify(validated),
      site.status,
      site.createdAt,
      site.updatedAt
    )

    return site
  }

  /**
   * RPC: Get site by domain
   */
  async getSite(domain: string): Promise<Site | null> {
    const result = await this.env.DB.execute(
      'SELECT * FROM sites WHERE domain = ? LIMIT 1',
      domain
    )

    if (!result.rows || result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as any

    return {
      id: row.id,
      config: JSON.parse(row.config),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      analytics: row.analytics ? JSON.parse(row.analytics) : undefined,
    }
  }

  /**
   * RPC: Update site
   */
  async updateSite(id: string, updates: Partial<SiteConfig>): Promise<Site> {
    const site = await this.getSiteById(id)
    if (!site) {
      throw new Error('Site not found')
    }

    const updatedConfig = { ...site.config, ...updates }
    const validated = siteConfigSchema.parse(updatedConfig)
    const now = new Date().toISOString()

    await this.env.DB.execute(
      'UPDATE sites SET config = ?, updated_at = ? WHERE id = ?',
      JSON.stringify(validated),
      now,
      id
    )

    return {
      ...site,
      config: validated,
      updatedAt: now,
    }
  }

  /**
   * RPC: Delete site
   */
  async deleteSite(id: string): Promise<void> {
    // Delete from database
    await this.env.DB.execute('DELETE FROM sites WHERE id = ?', id)

    // Delete from R2 (optional - could archive instead)
    const list = await this.env.SITES.list({ prefix: `${id}/` })
    for (const obj of list.objects) {
      await this.env.SITES.delete(obj.key)
    }
  }

  /**
   * RPC: Deploy template
   */
  async deployTemplate(
    templateId: string,
    domain: string,
    customization: Record<string, any>
  ): Promise<Site> {
    const template = TEMPLATES[templateId]
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Apply customization to template
    const config: SiteConfig = {
      id: ulid(),
      domain,
      title: customization.title || template.config.defaults.title,
      template: templateId,
      routes: Object.keys(template.files).map((file) => ({
        path: file === 'index.mdx' ? '/' : `/${file.replace('.mdx', '')}`,
        file,
      })),
    }

    // Create site
    const site = await this.createSite(config)

    // Upload template files to R2
    for (const [path, content] of Object.entries(template.files)) {
      let processedContent = content

      // Apply customization
      for (const [key, value] of Object.entries(customization)) {
        processedContent = processedContent.replace(
          new RegExp(`{{${key}}}`, 'g'),
          String(value)
        )
      }

      await this.env.SITES.put(
        `${site.id}/pages/${path}`,
        processedContent,
        {
          httpMetadata: { contentType: 'text/markdown' },
        }
      )
    }

    return site
  }

  /**
   * RPC: Get page content
   */
  async getPage(domain: string, path: string): Promise<string> {
    const site = await this.getSite(domain)
    if (!site) {
      throw new Error('Site not found')
    }

    // Find matching route
    const route = site.config.routes.find((r) => r.path === path)
    if (!route) {
      throw new Error('Page not found')
    }

    // Get from R2
    const obj = await this.env.SITES.get(`${site.id}/pages/${route.file}`)
    if (!obj) {
      throw new Error('Page file not found')
    }

    return await obj.text()
  }

  /**
   * RPC: Upload asset
   */
  async uploadAsset(
    domain: string,
    path: string,
    content: ArrayBuffer
  ): Promise<string> {
    const site = await this.getSite(domain)
    if (!site) {
      throw new Error('Site not found')
    }

    const key = `${site.id}/assets/${path}`
    await this.env.SITES.put(key, content)

    return `https://site.apis.do/${domain}/assets/${path}`
  }

  /**
   * Helper: Get site by ID
   */
  private async getSiteById(id: string): Promise<Site | null> {
    const result = await this.env.DB.execute(
      'SELECT * FROM sites WHERE id = ? LIMIT 1',
      id
    )

    if (!result.rows || result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as any

    return {
      id: row.id,
      config: JSON.parse(row.config),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
    }
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'site' })
})

// Serve site homepage
app.get('/:domain', async (c) => {
  const domain = c.req.param('domain')
  const service = new SiteService(c.env.ctx, c.env)

  try {
    const content = await service.getPage(domain, '/')
    return c.html(wrapMDXContent(content))
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      404
    )
  }
})

// Serve site page
app.get('/:domain/:path{.*}', async (c) => {
  const domain = c.req.param('domain')
  const path = `/${c.req.param('path')}`
  const service = new SiteService(c.env.ctx, c.env)

  // Check if it's an asset request
  if (path.startsWith('/assets/')) {
    const site = await service.getSite(domain)
    if (!site) {
      return c.json({ success: false, error: 'Site not found' }, 404)
    }

    const assetPath = path.replace('/assets/', '')
    const obj = await c.env.SITES.get(`${site.id}/assets/${assetPath}`)

    if (!obj) {
      return c.json({ success: false, error: 'Asset not found' }, 404)
    }

    return new Response(obj.body, {
      headers: {
        'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
        'cache-control': 'public, max-age=31536000',
      },
    })
  }

  try {
    const content = await service.getPage(domain, path)
    return c.html(wrapMDXContent(content))
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      404
    )
  }
})

// Create site
app.post('/api/sites', async (c) => {
  try {
    const body = await c.req.json()
    const service = new SiteService(c.env.ctx, c.env)
    const site = await service.createSite(body)
    return c.json({ success: true, data: site })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      400
    )
  }
})

// Get site
app.get('/api/sites/:id', async (c) => {
  const id = c.req.param('id')
  const service = new SiteService(c.env.ctx, c.env)

  try {
    const site = await service.getSiteById(id)
    if (!site) {
      return c.json({ success: false, error: 'Site not found' }, 404)
    }
    return c.json({ success: true, data: site })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

// Update site
app.put('/api/sites/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const body = await c.req.json()
    const service = new SiteService(c.env.ctx, c.env)
    const site = await service.updateSite(id, body)
    return c.json({ success: true, data: site })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      400
    )
  }
})

// Delete site
app.delete('/api/sites/:id', async (c) => {
  const id = c.req.param('id')
  try {
    const service = new SiteService(c.env.ctx, c.env)
    await service.deleteSite(id)
    return c.json({ success: true, message: 'Site deleted' })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

// List templates
app.get('/api/templates', (c) => {
  return c.json({
    success: true,
    data: {
      templates: Object.values(TEMPLATES).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        preview: t.preview,
        customizable: t.config.customizable,
      })),
      total: Object.keys(TEMPLATES).length,
    },
  })
})

// Get template
app.get('/api/templates/:id', (c) => {
  const id = c.req.param('id')
  const template = TEMPLATES[id]

  if (!template) {
    return c.json({ success: false, error: 'Template not found' }, 404)
  }

  return c.json({ success: true, data: template })
})

// Deploy template
app.post('/api/templates/:id/deploy', async (c) => {
  const id = c.req.param('id')
  try {
    const body = await c.req.json()
    const service = new SiteService(c.env.ctx, c.env)
    const site = await service.deployTemplate(
      id,
      body.domain,
      body.customization || {}
    )
    return c.json({ success: true, data: site })
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      400
    )
  }
})

/**
 * Wrap MDX content in HTML template with runtime compilation
 */
function wrapMDXContent(mdxContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MDX Site</title>
  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
</head>
<body>
  <script id="content" type="text/ld+mdx">
${mdxContent}
  </script>

  <div id="root" class="prose mx-auto p-6"></div>

  <script type="module">
    import { render } from "https://esm.sh/preact@10?bundle"
    import { compile } from "https://esm.sh/@mdx-js/mdx@3?bundle"

    const mdx = document.getElementById("content").textContent

    const compiled = await compile(mdx, {
      jsx: true,
      jsxRuntime: "automatic",
      jsxImportSource: "preact",
      outputFormat: "function-body"
    })

    const { default: MDXContent } =
      await import(\`data:text/javascript;base64,\${btoa(String(compiled))}\`)

    render(<MDXContent />, document.getElementById("root"))
  </script>
</body>
</html>`
}

export default {
  fetch: app.fetch,
}
