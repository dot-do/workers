/**
 * SEO Schema Generator Worker
 * Generates Schema.org JSON-LD structured data
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import {
  SchemaType,
  type SchemaContext,
  type OrganizationSchema,
  type ArticleSchema,
  type HowToSchema,
  type FAQPageSchema,
  type QuestionSchema,
  type ProductSchema,
  type LocalBusinessSchema,
  type BreadcrumbListSchema,
  type SchemaValidationResult,
  type SchemaGenerationOptions,
} from '@dot-do/seo-types'

// Environment bindings
interface Env {
  SCHEMA_CACHE: KVNamespace
  SCHEMA_QUEUE: Queue
  DB: any
}

// RPC Methods
export class SEOSchemaService extends WorkerEntrypoint<Env> {
  /**
   * Generate Organization schema
   */
  async generateOrganization(data: Partial<OrganizationSchema>): Promise<OrganizationSchema> {
    return {
      '@context': 'https://schema.org',
      '@type': SchemaType.Organization,
      name: data.name || '',
      url: data.url || '',
      ...data,
    }
  }

  /**
   * Generate Article schema
   */
  async generateArticle(data: Partial<ArticleSchema>): Promise<ArticleSchema> {
    return {
      '@context': 'https://schema.org',
      '@type': data['@type'] || SchemaType.Article,
      headline: data.headline || '',
      datePublished: data.datePublished || new Date().toISOString(),
      author: data.author || { '@type': SchemaType.Person, name: 'Anonymous' },
      ...data,
    }
  }

  /**
   * Generate HowTo schema
   */
  async generateHowTo(data: Partial<HowToSchema>): Promise<HowToSchema> {
    return {
      '@context': 'https://schema.org',
      '@type': SchemaType.HowTo,
      name: data.name || '',
      step: data.step || [],
      ...data,
    }
  }

  /**
   * Generate FAQ schema
   */
  async generateFAQ(data: Partial<FAQPageSchema>): Promise<FAQPageSchema> {
    return {
      '@context': 'https://schema.org',
      '@type': SchemaType.FAQPage,
      mainEntity: data.mainEntity || [],
      ...data,
    }
  }

  /**
   * Generate Product schema
   */
  async generateProduct(data: Partial<ProductSchema>): Promise<ProductSchema> {
    return {
      '@context': 'https://schema.org',
      '@type': SchemaType.Product,
      name: data.name || '',
      ...data,
    }
  }

  /**
   * Generate Breadcrumb schema
   */
  async generateBreadcrumb(data: Partial<BreadcrumbListSchema>): Promise<BreadcrumbListSchema> {
    return {
      '@context': 'https://schema.org',
      '@type': SchemaType.BreadcrumbList,
      itemListElement: data.itemListElement || [],
      ...data,
    }
  }

  /**
   * Validate schema
   */
  async validateSchema(schema: SchemaContext): Promise<SchemaValidationResult> {
    const validator = new SchemaValidator()
    return validator.validate(schema)
  }

  /**
   * Generate schema with caching
   */
  async generate(options: SchemaGenerationOptions): Promise<string> {
    const cacheKey = `schema:${options.schemaType}:${JSON.stringify(options.data)}`

    // Check cache
    const cached = await this.env.SCHEMA_CACHE.get(cacheKey)
    if (cached) return cached

    // Generate schema
    let schema: SchemaContext
    switch (options.schemaType) {
      case SchemaType.Organization:
        schema = await this.generateOrganization(options.data)
        break
      case SchemaType.Article:
      case SchemaType.BlogPosting:
      case SchemaType.TechArticle:
        schema = await this.generateArticle(options.data)
        break
      case SchemaType.HowTo:
        schema = await this.generateHowTo(options.data)
        break
      case SchemaType.FAQPage:
        schema = await this.generateFAQ(options.data)
        break
      case SchemaType.Product:
        schema = await this.generateProduct(options.data)
        break
      case SchemaType.BreadcrumbList:
        schema = await this.generateBreadcrumb(options.data)
        break
      default:
        throw new Error(`Unsupported schema type: ${options.schemaType}`)
    }

    // Validate if requested
    if (options.validate) {
      const validation = await this.validateSchema(schema)
      if (!validation.valid) {
        throw new Error(`Schema validation failed: ${validation.errors.map((e: { message: string }) => e.message).join(', ')}`)
      }
    }

    // Serialize
    const jsonLd = options.minify ? JSON.stringify(schema) : JSON.stringify(schema, null, 2)

    // Cache
    await this.env.SCHEMA_CACHE.put(cacheKey, jsonLd, {
      expirationTtl: 86400, // 24 hours
    })

    return jsonLd
  }

  /**
   * Batch generate schemas
   */
  async batchGenerate(options: SchemaGenerationOptions[]): Promise<string[]> {
    return await Promise.all(options.map((opt) => this.generate(opt)))
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()

// POST /generate - Generate single schema
app.post('/generate', async (c) => {
  const options = await c.req.json<SchemaGenerationOptions>()
  const service = new SEOSchemaService(c.executionCtx, c.env)
  const jsonLd = await service.generate(options)

  return c.json(
    {
      success: true,
      jsonLd: options.minify ? jsonLd : JSON.parse(jsonLd),
    },
    200,
    {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    }
  )
})

// POST /batch - Generate multiple schemas
app.post('/batch', async (c) => {
  const options = await c.req.json<SchemaGenerationOptions[]>()
  const service = new SEOSchemaService(c.executionCtx, c.env)
  const schemas = await service.batchGenerate(options)

  return c.json({
    success: true,
    count: schemas.length,
    schemas: schemas.map((s) => JSON.parse(s)),
  })
})

// POST /validate - Validate schema
app.post('/validate', async (c) => {
  const schema = await c.req.json<SchemaContext>()
  const service = new SEOSchemaService(c.executionCtx, c.env)
  const validation = await service.validateSchema(schema)

  return c.json(validation)
})

// GET /templates - List available schema templates
app.get('/templates', (c) => {
  const templates = Object.values(SchemaType).map((type) => ({
    type,
    description: getSchemaDescription(type),
  }))

  return c.json({ templates })
})

// POST /organization - Generate Organization schema
app.post('/organization', async (c) => {
  const data = await c.req.json<Partial<OrganizationSchema>>()
  const service = new SEOSchemaService(c.executionCtx, c.env)
  const schema = await service.generateOrganization(data)
  return c.json(schema)
})

// POST /article - Generate Article schema
app.post('/article', async (c) => {
  const data = await c.req.json<Partial<ArticleSchema>>()
  const service = new SEOSchemaService(c.executionCtx, c.env)
  const schema = await service.generateArticle(data)
  return c.json(schema)
})

// POST /howto - Generate HowTo schema
app.post('/howto', async (c) => {
  const data = await c.req.json<Partial<HowToSchema>>()
  const service = new SEOSchemaService(c.executionCtx, c.env)
  const schema = await service.generateHowTo(data)
  return c.json(schema)
})

// POST /faq - Generate FAQ schema
app.post('/faq', async (c) => {
  const data = await c.req.json<Partial<FAQPageSchema>>()
  const service = new SEOSchemaService(c.executionCtx, c.env)
  const schema = await service.generateFAQ(data)
  return c.json(schema)
})

// POST /product - Generate Product schema
app.post('/product', async (c) => {
  const data = await c.req.json<Partial<ProductSchema>>()
  const service = new SEOSchemaService(c.executionCtx, c.env)
  const schema = await service.generateProduct(data)
  return c.json(schema)
})

// POST /breadcrumb - Generate Breadcrumb schema
app.post('/breadcrumb', async (c) => {
  const data = await c.req.json<Partial<BreadcrumbListSchema>>()
  const service = new SEOSchemaService(c.executionCtx, c.env)
  const schema = await service.generateBreadcrumb(data)
  return c.json(schema)
})

// Queue consumer
export async function queue(batch: MessageBatch<SchemaGenerationOptions>, env: Env): Promise<void> {
  const service = new SEOSchemaService({} as any, env)

  for (const message of batch.messages) {
    const options = message.body
    try {
      await service.generate(options)
    } catch (error) {
      console.error('Failed to generate schema:', error)
    }
  }
}

export default {
  fetch: app.fetch,
  queue,
}

// Helper: Schema Validator
class SchemaValidator {
  validate(schema: SchemaContext): SchemaValidationResult {
    const errors: SchemaValidationResult['errors'] = []
    const warnings: SchemaValidationResult['warnings'] = []

    // Required fields validation
    if (!schema['@context']) {
      errors.push({
        field: '@context',
        message: '@context is required',
        severity: 'error',
      })
    }

    if (!schema['@type']) {
      errors.push({
        field: '@type',
        message: '@type is required',
        severity: 'error',
      })
    }

    // Type-specific validation
    const schemaType = Array.isArray(schema['@type']) ? schema['@type'][0] : schema['@type']

    switch (schemaType) {
      case SchemaType.Organization:
        this.validateOrganization(schema as OrganizationSchema, errors, warnings)
        break
      case SchemaType.Article:
      case SchemaType.BlogPosting:
      case SchemaType.TechArticle:
        this.validateArticle(schema as ArticleSchema, errors, warnings)
        break
      // Add more type-specific validations
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      schemaType: schemaType as SchemaType,
      jsonLd: JSON.stringify(schema, null, 2),
    }
  }

  private validateOrganization(
    schema: OrganizationSchema,
    errors: SchemaValidationResult['errors'],
    warnings: SchemaValidationResult['warnings']
  ): void {
    if (!schema.name) {
      errors.push({ field: 'name', message: 'Organization name is required', severity: 'error' })
    }
    if (!schema.url) {
      errors.push({ field: 'url', message: 'Organization URL is required', severity: 'error' })
    }
    if (!schema.logo) {
      warnings.push({ field: 'logo', message: 'Logo is recommended for better visibility', severity: 'warning' })
    }
  }

  private validateArticle(
    schema: ArticleSchema,
    errors: SchemaValidationResult['errors'],
    warnings: SchemaValidationResult['warnings']
  ): void {
    if (!schema.headline) {
      errors.push({ field: 'headline', message: 'Article headline is required', severity: 'error' })
    }
    if (!schema.author) {
      errors.push({ field: 'author', message: 'Article author is required', severity: 'error' })
    }
    if (!schema.datePublished) {
      errors.push({ field: 'datePublished', message: 'Publication date is required', severity: 'error' })
    }
    if (!schema.image) {
      warnings.push({ field: 'image', message: 'Featured image is recommended', severity: 'warning' })
    }
  }
}

// Helper: Get schema description
function getSchemaDescription(type: SchemaType): string {
  const descriptions: Record<SchemaType, string> = {
    [SchemaType.Organization]: 'Information about your company or organization',
    [SchemaType.SoftwareApplication]: 'Software or app information',
    [SchemaType.WebApplication]: 'Web application information',
    [SchemaType.Article]: 'General article or blog post',
    [SchemaType.TechArticle]: 'Technical article or tutorial',
    [SchemaType.NewsArticle]: 'News article',
    [SchemaType.BlogPosting]: 'Blog post',
    [SchemaType.HowTo]: 'Step-by-step tutorial or guide',
    [SchemaType.FAQPage]: 'Frequently asked questions page',
    [SchemaType.Question]: 'Single question with answer',
    [SchemaType.Answer]: 'Answer to a question',
    [SchemaType.Person]: 'Person or author information',
    [SchemaType.Product]: 'Product information',
    [SchemaType.Service]: 'Service offering information',
    [SchemaType.LocalBusiness]: 'Local business information',
    [SchemaType.BreadcrumbList]: 'Breadcrumb navigation',
    [SchemaType.ListItem]: 'List item',
    [SchemaType.Review]: 'Product or service review',
    [SchemaType.AggregateRating]: 'Aggregate rating',
    [SchemaType.Rating]: 'Rating',
    [SchemaType.WebPage]: 'Web page information',
    [SchemaType.WebSite]: 'Website information',
    [SchemaType.ImageObject]: 'Image information',
    [SchemaType.VideoObject]: 'Video information',
    [SchemaType.CreativeWork]: 'Creative work',
  }

  return descriptions[type] || 'Schema type'
}
