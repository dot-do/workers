#!/usr/bin/env tsx

/**
 * Generate Routing Table from .domains.tsv
 *
 * Reads sdk/.domains.tsv (105 domains) and generates workers/api/assets/domain-routes.json
 * with complete routing configuration for the centralized API worker.
 *
 * Usage:
 *   pnpm tsx workers/api/scripts/generate-routing-table.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

interface DomainRoute {
  domain: string
  service: string
  binding: string
  method?: string // Optional: RPC method pattern (e.g., "llm_*", "vectors_*")
  requiresAuth: boolean
  requiresAdmin: boolean
  metadata: {
    description: string
    category: string
    type?: string // Optional: "alias", "database-view", "direct"
  }
  updatedAt: string
}

/**
 * Special domain mappings for aliases and database views
 */
const DOMAIN_MAPPINGS: Record<string, Partial<DomainRoute>> = {
  // AI Service Aliases (multiple domains → same worker, different methods)
  'llm.do': {
    service: 'ai',
    binding: 'AI_SERVICE',
    method: 'llm_*',
    requiresAuth: true,
    metadata: { type: 'alias' },
  },
  'vectors.do': {
    service: 'ai',
    binding: 'AI_SERVICE',
    method: 'vectors_*',
    requiresAuth: true,
    metadata: { type: 'alias' },
  },
  'embeddings.do': {
    service: 'ai',
    binding: 'AI_SERVICE',
    method: 'embed_*',
    requiresAuth: true,
    metadata: { type: 'alias' },
  },
  'llms.do': {
    service: 'ai',
    binding: 'AI_SERVICE',
    method: 'llm_*',
    requiresAuth: true,
    metadata: { type: 'alias' },
  },

  // Database View Wrappers (query database collections)
  'models.do': {
    service: 'models',
    binding: 'MODELS_SERVICE',
    method: 'models_*',
    requiresAuth: false,
    metadata: { type: 'database-view' },
  },

  // Core Infrastructure Services
  'api.do': {
    service: 'gateway',
    binding: 'GATEWAY_SERVICE',
    requiresAuth: false,
  },
  'apis.do': {
    service: 'gateway',
    binding: 'GATEWAY_SERVICE',
    requiresAuth: false,
  },
  'db.do': {
    service: 'db',
    binding: 'DB_SERVICE',
    requiresAuth: true,
  },
  'databases.do': {
    service: 'db',
    binding: 'DB_SERVICE',
    requiresAuth: true,
  },
  'auth.do': {
    service: 'auth',
    binding: 'AUTH_SERVICE',
    requiresAuth: false, // Auth endpoints are public (login, register)
  },
  'oauth.do': {
    service: 'auth',
    binding: 'AUTH_SERVICE',
    method: 'oauth_*',
    requiresAuth: false,
  },

  // Email Services
  'email.do': {
    service: 'email',
    binding: 'EMAIL_SERVICE',
    requiresAuth: true,
  },
  'emails.do': {
    service: 'email',
    binding: 'EMAIL_SERVICE',
    requiresAuth: true,
  },

  // Webhook Services
  'webhook.do': {
    service: 'webhooks',
    binding: 'WEBHOOKS_SERVICE',
    requiresAuth: false, // External webhooks are authenticated via signatures
  },
  'webhooks.do': {
    service: 'webhooks',
    binding: 'WEBHOOKS_SERVICE',
    requiresAuth: false,
  },

  // Queue Services
  'queue.do': {
    service: 'queue',
    binding: 'QUEUE_SERVICE',
    requiresAuth: true,
  },

  // Schedule Services
  'schedule.do': {
    service: 'schedule',
    binding: 'SCHEDULE_SERVICE',
    requiresAuth: true,
  },

  // MCP Service
  'mcp.do': {
    service: 'mcp',
    binding: 'MCP_SERVICE',
    requiresAuth: true,
  },

  // Waitlist (wildcard domain)
  'waitlist.do': {
    service: 'waitlist',
    binding: 'WAITLIST_SERVICE',
    requiresAuth: false,
  },
}

/**
 * Generate service name and binding from domain
 */
function generateServiceInfo(domain: string): { service: string; binding: string } {
  // Remove .do suffix and convert to service name
  const serviceName = domain.replace('.do', '').replace(/[^a-z0-9]/gi, '')

  // Convert to UPPER_SNAKE_CASE for binding
  const binding = serviceName.toUpperCase() + '_SERVICE'

  return { service: serviceName, binding }
}

/**
 * Determine auth requirements based on domain/service type
 */
function determineAuthRequirements(domain: string, category: string): { requiresAuth: boolean; requiresAdmin: boolean } {
  // Public services (no auth required)
  const publicDomains = ['api.do', 'apis.do', 'auth.do', 'oauth.do', 'webhook.do', 'webhooks.do', 'waitlist.do', 'models.do']

  if (publicDomains.includes(domain)) {
    return { requiresAuth: false, requiresAdmin: false }
  }

  // Admin-only services
  const adminDomains = ['deploy.do', 'dispatcher.do']

  if (adminDomains.includes(domain)) {
    return { requiresAuth: true, requiresAdmin: true }
  }

  // Utility services (public or minimal auth)
  const utilityCategories = ['Utility', 'Dev Tool', 'Content/Resource']

  if (utilityCategories.includes(category)) {
    return { requiresAuth: false, requiresAdmin: false }
  }

  // Default: require authentication
  return { requiresAuth: true, requiresAdmin: false }
}

/**
 * Generate routing table from .domains.tsv
 */
function generateRoutingTable(): DomainRoute[] {
  // Read .domains.tsv from sdk/
  const tsvPath = resolve(__dirname, '../../../sdk/.domains.tsv')
  const tsvContent = readFileSync(tsvPath, 'utf-8')

  const routes: DomainRoute[] = []
  const lines = tsvContent.trim().split('\n')

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const [domain, category, description] = line.split('\t')

    // Check if domain has special mapping
    const mapping = DOMAIN_MAPPINGS[domain]

    // Generate default service info
    const defaultInfo = generateServiceInfo(domain)
    const authInfo = determineAuthRequirements(domain, category)

    // Create route entry
    const route: DomainRoute = {
      domain,
      service: mapping?.service || defaultInfo.service,
      binding: mapping?.binding || defaultInfo.binding,
      method: mapping?.method,
      requiresAuth: mapping?.requiresAuth ?? authInfo.requiresAuth,
      requiresAdmin: mapping?.requiresAdmin ?? authInfo.requiresAdmin,
      metadata: {
        description,
        category,
        type: mapping?.metadata?.type,
      },
      updatedAt: new Date().toISOString(),
    }

    routes.push(route)
  }

  // Sort by domain name for consistency
  routes.sort((a, b) => a.domain.localeCompare(b.domain))

  return routes
}

/**
 * Write routing table to workers/api/assets/domain-routes.json
 */
function writeRoutingTable(routes: DomainRoute[]): void {
  const outputPath = resolve(__dirname, '../assets/domain-routes.json')
  const json = JSON.stringify(routes, null, 2)
  writeFileSync(outputPath, json + '\n', 'utf-8')
  console.log(`✅ Generated routing table with ${routes.length} routes`)
  console.log(`📝 Output: ${outputPath}`)
}

/**
 * Print summary statistics
 */
function printSummary(routes: DomainRoute[]): void {
  console.log('\n📊 Routing Table Summary:')
  console.log(`   Total domains: ${routes.length}`)

  // Count by type
  const aliases = routes.filter((r) => r.metadata.type === 'alias').length
  const databaseViews = routes.filter((r) => r.metadata.type === 'database-view').length
  const direct = routes.filter((r) => !r.metadata.type).length

  console.log(`   Aliases: ${aliases}`)
  console.log(`   Database views: ${databaseViews}`)
  console.log(`   Direct mappings: ${direct}`)

  // Count by auth requirements
  const requiresAuth = routes.filter((r) => r.requiresAuth).length
  const requiresAdmin = routes.filter((r) => r.requiresAdmin).length
  const publicRoutes = routes.filter((r) => !r.requiresAuth).length

  console.log(`\n🔒 Authentication:`)
  console.log(`   Public (no auth): ${publicRoutes}`)
  console.log(`   Requires auth: ${requiresAuth}`)
  console.log(`   Admin only: ${requiresAdmin}`)

  // Count unique services
  const uniqueServices = new Set(routes.map((r) => r.service))
  console.log(`\n🔧 Services:`)
  console.log(`   Unique services: ${uniqueServices.size}`)

  // List top 10 services by route count
  const serviceCounts = routes.reduce(
    (acc, route) => {
      acc[route.service] = (acc[route.service] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const topServices = Object.entries(serviceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  console.log(`\n📈 Top 10 Services by Route Count:`)
  topServices.forEach(([service, count]) => {
    console.log(`   ${service}: ${count} routes`)
  })
}

/**
 * Main execution
 */
function main(): void {
  console.log('🚀 Generating routing table from sdk/.domains.tsv...\n')

  try {
    const routes = generateRoutingTable()
    writeRoutingTable(routes)
    printSummary(routes)

    console.log('\n✨ Routing table generation complete!')
    console.log('\n📖 Next steps:')
    console.log('   1. Review generated domain-routes.json')
    console.log('   2. Verify auth requirements are correct')
    console.log('   3. Deploy api worker to Workers Assets')
    console.log('   4. Begin converting workers to RPC-only\n')
  } catch (error) {
    console.error('❌ Error generating routing table:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { generateRoutingTable, DOMAIN_MAPPINGS }
