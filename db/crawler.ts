#!/usr/bin/env node
/**
 * HATEOAS API Crawler - POC
 *
 * Crawls a HATEOAS API by following _links, validates structure,
 * and tests semantic relationship patterns.
 *
 * Usage:
 *   pnpm tsx crawler.ts https://db.apis.do
 */

interface Link {
  href: string
  title?: string
  method?: string
  type?: string
  templated?: boolean
}

interface HateoasResponse {
  '@context'?: string
  '@type'?: string
  '@id'?: string
  _links?: Record<string, Link | Link[]>
  [key: string]: any
}

interface CrawlResult {
  url: string
  status: number
  type: string
  links: string[]
  relationships?: Record<string, string | string[]>
  errors?: string[]
}

interface CrawlStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  uniqueUrls: Set<string>
  relationshipTypes: Set<string>
  errors: Array<{ url: string; error: string }>
}

class HateoasCrawler {
  private baseUrl: string
  private visited = new Set<string>()
  private results: CrawlResult[] = []
  private stats: CrawlStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    uniqueUrls: new Set(),
    relationshipTypes: new Set(),
    errors: [],
  }
  private maxDepth: number
  private maxUrls: number

  constructor(baseUrl: string, options: { maxDepth?: number; maxUrls?: number } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.maxDepth = options.maxDepth || 3
    this.maxUrls = options.maxUrls || 50
  }

  /**
   * Start crawling from the base URL
   */
  async crawl(): Promise<void> {
    console.log(`🕷️  Starting HATEOAS crawler on ${this.baseUrl}`)
    console.log(`   Max depth: ${this.maxDepth}, Max URLs: ${this.maxUrls}\n`)

    await this.crawlUrl(this.baseUrl, 0)

    this.printReport()
  }

  /**
   * Crawl a single URL
   */
  private async crawlUrl(url: string, depth: number): Promise<void> {
    // Check limits
    if (depth > this.maxDepth) {
      console.log(`⏩ Skipping ${url} (max depth reached)`)
      return
    }

    if (this.visited.size >= this.maxUrls) {
      console.log(`⏩ Skipping ${url} (max URLs reached)`)
      return
    }

    if (this.visited.has(url)) {
      return
    }

    this.visited.add(url)
    this.stats.totalRequests++
    this.stats.uniqueUrls.add(url)

    const indent = '  '.repeat(depth)
    console.log(`${indent}📄 Crawling: ${url}`)

    try {
      const response = await fetch(url)
      const status = response.status

      if (!response.ok) {
        this.stats.failedRequests++
        const error = `HTTP ${status}`
        this.stats.errors.push({ url, error })
        console.log(`${indent}❌ Error: ${error}`)
        return
      }

      const data: HateoasResponse = await response.json()
      this.stats.successfulRequests++

      const result: CrawlResult = {
        url,
        status,
        type: data['@type'] || 'Unknown',
        links: [],
        errors: [],
      }

      // Validate HATEOAS structure
      if (!data._links) {
        result.errors?.push('Missing _links object')
      }

      if (!data['@context']) {
        result.errors?.push('Missing @context')
      }

      if (!data['@id']) {
        result.errors?.push('Missing @id')
      }

      // Extract relationships from top-level properties
      const relationships: Record<string, string | string[]> = {}
      for (const [key, value] of Object.entries(data)) {
        // Skip metadata fields
        if (key.startsWith('@') || key.startsWith('_') || ['ns', 'id', 'type', 'data', 'content', 'visibility', 'createdAt', 'updatedAt'].includes(key)) {
          continue
        }

        // Check if it looks like a relationship (contains : separator)
        if (typeof value === 'string' && value.includes(':')) {
          relationships[key] = value
          this.stats.relationshipTypes.add(key)
        } else if (Array.isArray(value) && value.every(v => typeof v === 'string' && v.includes(':'))) {
          relationships[key] = value
          this.stats.relationshipTypes.add(key)
        }
      }

      if (Object.keys(relationships).length > 0) {
        result.relationships = relationships
        console.log(`${indent}  🔗 Relationships: ${Object.keys(relationships).join(', ')}`)
      }

      // Extract and follow links
      if (data._links) {
        const links = this.extractLinks(data._links)
        result.links = links

        console.log(`${indent}  📎 Found ${links.length} links`)

        // Follow a subset of links (avoid overwhelming)
        const linksToFollow = links.slice(0, 5)
        for (const link of linksToFollow) {
          await this.crawlUrl(link, depth + 1)
        }

        // Test semantic relationship endpoints (*.predicate pattern)
        if (data['@type'] === 'Thing' || data['@type'] === 'Person') {
          for (const [predicate, _value] of Object.entries(relationships)) {
            const predicateUrl = `${url}.${predicate}`
            console.log(`${indent}  🔍 Testing predicate endpoint: ${predicateUrl}`)
            await this.crawlUrl(predicateUrl, depth + 1)
          }
        }
      }

      this.results.push(result)
    } catch (error: any) {
      this.stats.failedRequests++
      const errorMsg = error.message
      this.stats.errors.push({ url, error: errorMsg })
      console.log(`${indent}❌ Error: ${errorMsg}`)
    }
  }

  /**
   * Extract all href URLs from _links object
   */
  private extractLinks(links: Record<string, Link | Link[]>): string[] {
    const hrefs: string[] = []

    for (const [key, value] of Object.entries(links)) {
      // Skip certain links
      if (['self', 'home'].includes(key)) {
        continue
      }

      if (Array.isArray(value)) {
        for (const link of value) {
          if (link.href) {
            hrefs.push(link.href)
          }
        }
      } else if (value.href) {
        // Skip links that require methods other than GET
        if (!value.method || value.method === 'GET') {
          hrefs.push(value.href)
        }
      }
    }

    return hrefs
  }

  /**
   * Print crawl report
   */
  private printReport(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 CRAWL REPORT')
    console.log('='.repeat(60))
    console.log(`\n📈 Statistics:`)
    console.log(`   Total Requests:     ${this.stats.totalRequests}`)
    console.log(`   Successful:         ${this.stats.successfulRequests}`)
    console.log(`   Failed:             ${this.stats.failedRequests}`)
    console.log(`   Unique URLs:        ${this.stats.uniqueUrls.size}`)
    console.log(`   Relationship Types: ${this.stats.relationshipTypes.size}`)

    if (this.stats.relationshipTypes.size > 0) {
      console.log(`\n🔗 Discovered Relationships:`)
      for (const relType of Array.from(this.stats.relationshipTypes).sort()) {
        console.log(`   - ${relType}`)
      }
    }

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Errors (${this.stats.errors.length}):`)
      for (const { url, error } of this.stats.errors.slice(0, 10)) {
        console.log(`   ${url}`)
        console.log(`   → ${error}`)
      }
      if (this.stats.errors.length > 10) {
        console.log(`   ... and ${this.stats.errors.length - 10} more`)
      }
    }

    // Validation summary
    console.log(`\n✅ HATEOAS Validation:`)
    const resultsWithErrors = this.results.filter(r => r.errors && r.errors.length > 0)
    if (resultsWithErrors.length === 0) {
      console.log(`   All endpoints follow HATEOAS conventions!`)
    } else {
      console.log(`   ${resultsWithErrors.length} endpoints have issues:`)
      for (const result of resultsWithErrors.slice(0, 5)) {
        console.log(`   ${result.url}`)
        for (const error of result.errors || []) {
          console.log(`     - ${error}`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: pnpm tsx crawler.ts <base-url> [--max-depth=N] [--max-urls=N]')
    console.log('')
    console.log('Example:')
    console.log('  pnpm tsx crawler.ts https://db.apis.do')
    console.log('  pnpm tsx crawler.ts https://db.apis.do --max-depth=2 --max-urls=30')
    process.exit(1)
  }

  const baseUrl = args[0]
  const maxDepth = parseInt(args.find(a => a.startsWith('--max-depth='))?.split('=')[1] || '3')
  const maxUrls = parseInt(args.find(a => a.startsWith('--max-urls='))?.split('=')[1] || '50')

  const crawler = new HateoasCrawler(baseUrl, { maxDepth, maxUrls })
  await crawler.crawl()
}

main().catch(console.error)
