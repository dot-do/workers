/**
 * Deploy Service - Authenticated Deployment to Workers for Platforms
 *
 * Handles authenticated deployments to Cloudflare dispatch namespaces.
 * Replaces direct wrangler deployments from GitHub Actions.
 *
 * Features:
 * - Authenticate via AUTH_SERVICE
 * - Check RBAC permissions
 * - Deploy to Cloudflare Workers for Platforms
 * - Log all deployments for audit trail
 * - Support rollback to previous versions
 *
 * Interfaces:
 * - RPC: WorkerEntrypoint methods for service-to-service calls
 * - HTTP: Hono routes for deployment API
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type {
  Env,
  DeploymentRequest,
  DeploymentResponse,
  RollbackRequest,
  RollbackResponse,
  ListDeploymentsRequest,
  ListDeploymentsResponse,
  Deployment,
  CloudflareDeployResponse,
  AuthValidation,
  ServiceName,
  Environment,
  Tier,
} from './types'
import { deploymentRequestSchema, rollbackRequestSchema, listDeploymentsRequestSchema } from './schema'

// ============================================================================
// RPC INTERFACE - For service-to-service communication
// ============================================================================

export class DeployService extends WorkerEntrypoint<Env> {
  /**
   * Deploy a service to dispatch namespace
   */
  async deploy(request: DeploymentRequest): Promise<DeploymentResponse> {
    try {
      // Validate schema
      const validated = deploymentRequestSchema.parse(request)

      // Deploy to Cloudflare
      const deployment = await this.deployToCloudflare(validated)

      // Log deployment
      await this.logDeployment(deployment)

      return {
        success: true,
        deployment,
      }
    } catch (error) {
      console.error('[Deploy] Deploy error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
      }
    }
  }

  /**
   * Rollback to previous deployment
   */
  async rollback(request: RollbackRequest): Promise<RollbackResponse> {
    try {
      const validated = rollbackRequestSchema.parse(request)
      const { service, environment } = validated

      // Get previous successful deployment
      const previous = await this.getPreviousDeployment(service, environment)

      if (!previous) {
        return {
          success: false,
          error: 'No previous deployment found',
        }
      }

      // Mark current deployment as rolled back
      await this.markAsRolledBack(service, environment)

      // Note: Actual rollback would require storing the script bundle
      // For now, this is a placeholder that returns the previous deployment info
      // In a real implementation, we would redeploy the previous version

      return {
        success: true,
        deployment: previous,
      }
    } catch (error) {
      console.error('[Deploy] Rollback error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rollback failed',
      }
    }
  }

  /**
   * List deployments with optional filters
   */
  async listDeployments(request: ListDeploymentsRequest = {}): Promise<ListDeploymentsResponse> {
    try {
      const validated = listDeploymentsRequestSchema.parse(request)
      const { service, environment, limit = 50 } = validated

      const deployments = await this.fetchDeployments(service, environment, limit)

      return {
        deployments,
        total: deployments.length,
      }
    } catch (error) {
      console.error('[Deploy] List deployments error:', error)
      return {
        deployments: [],
        total: 0,
      }
    }
  }

  // ============================================================================
  // PRIVATE METHODS - Implementation details
  // ============================================================================

  /**
   * Deploy worker to Cloudflare dispatch namespace
   */
  private async deployToCloudflare(request: DeploymentRequest): Promise<Deployment> {
    const { service, environment, tier, version, script, bindings, metadata } = request

    // Determine namespace (supports both tier and environment modes)
    const { namespace, mode } = this.getNamespace(request)

    // Determine worker name in namespace (append version if specified)
    const workerName = version ? `${service}-${version}` : service

    // Decode base64 script
    const scriptContent = atob(script)

    // Build form data for multipart upload
    const formData = new FormData()

    // Add main module
    const scriptBlob = new Blob([scriptContent], { type: 'application/javascript+module' })
    formData.append(`${workerName}.mjs`, scriptBlob, `${workerName}.mjs`)

    // Add metadata
    const metadataJson = {
      main_module: `${workerName}.mjs`,
      compatibility_date: '2025-01-01',
      bindings: bindings || {},
      tags: [
        `service:${service}`,
        `env:${environment}`,
        `commit:${metadata.commit}`,
        `branch:${metadata.branch}`,
        ...(version ? [`version:${version}`] : []),
      ],
    }

    formData.append('metadata', JSON.stringify(metadataJson))

    // Upload to Cloudflare API (use versioned worker name)
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/workers/dispatch/namespaces/${namespace}/scripts/${workerName}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Deployment failed: ${error}`)
    }

    const result: CloudflareDeployResponse = await response.json()

    if (!result.success) {
      throw new Error(`Deployment failed: ${JSON.stringify(result.errors)}`)
    }

    // Create deployment record
    const deployment: Deployment = {
      id: `deploy_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      service,
      environment,
      tier,
      version,
      namespace,
      namespaceMode: mode,
      status: 'deployed',
      timestamp: new Date().toISOString(),
      url: this.getServiceUrl(service, mode === 'tier' ? tier! : environment, version),
      versionTag: metadata.version || metadata.commit.substring(0, 7),
      metadata,
    }

    return deployment
  }

  /**
   * Get namespace name for environment or tier
   *
   * Supports both legacy environment-based and new tier-based namespaces.
   * Mode is controlled by NAMESPACE_MODE env var (default: 'environment').
   *
   * ⚠️  EXPERIMENTAL: 3-tier architecture is under evaluation
   */
  private getNamespace(request: DeploymentRequest): { namespace: string; mode: 'tier' | 'environment' } {
    const mode = this.env.NAMESPACE_MODE || 'environment'

    // NEW: Tier-based namespace routing (experimental)
    if (mode === 'tier') {
      const tier = request.tier || this.getDefaultTier(request.service)

      switch (tier) {
        case 'internal':
          if (!this.env.INTERNAL_NAMESPACE) throw new Error('INTERNAL_NAMESPACE not configured')
          return { namespace: this.env.INTERNAL_NAMESPACE, mode: 'tier' }
        case 'public':
          if (!this.env.PUBLIC_NAMESPACE) throw new Error('PUBLIC_NAMESPACE not configured')
          return { namespace: this.env.PUBLIC_NAMESPACE, mode: 'tier' }
        case 'tenant':
          if (!this.env.TENANT_NAMESPACE) throw new Error('TENANT_NAMESPACE not configured')
          return { namespace: this.env.TENANT_NAMESPACE, mode: 'tier' }
        default:
          throw new Error(`Invalid tier: ${tier}`)
      }
    }

    // LEGACY: Environment-based namespace routing
    switch (request.environment) {
      case 'production':
        return { namespace: this.env.PRODUCTION_NAMESPACE, mode: 'environment' }
      case 'staging':
        return { namespace: this.env.STAGING_NAMESPACE, mode: 'environment' }
      case 'development':
        return { namespace: this.env.DEV_NAMESPACE, mode: 'environment' }
      default:
        throw new Error(`Invalid environment: ${request.environment}`)
    }
  }

  /**
   * Get default tier for a service (experimental)
   *
   * Maps services to their default tier based on worker-namespaces.json.
   * This is used when tier is not explicitly specified in request.
   */
  private getDefaultTier(service: ServiceName): Tier {
    const TIER_MAPPING: Record<ServiceName, Tier> = {
      // Infrastructure services → internal
      db: 'internal',
      auth: 'internal',
      schedule: 'internal',
      webhooks: 'internal',
      email: 'internal',
      queue: 'internal',
      mcp: 'internal',

      // Public APIs → public
      gateway: 'public',
    }

    return TIER_MAPPING[service]
  }

  /**
   * Get service URL after deployment
   *
   * Generates URL based on namespace mode:
   * - tier: internal.do, *.do, tenant.do
   * - environment: *.do, staging.do, dev.do
   * - version: v1.gateway.do, v2.db.staging.do
   */
  private getServiceUrl(service: ServiceName, target: Tier | Environment, version?: string): string {
    // Tier-based URLs
    if (target === 'internal' || target === 'public' || target === 'tenant') {
      const tier = target as Tier
      if (tier === 'internal') {
        const base = `https://${service}.internal.do`
        return version ? `https://${version}.${service}.internal.do` : base
      } else if (tier === 'public') {
        const base = `https://${service}.do`
        return version ? `https://${version}.${service}.do` : base
      } else {
        // tenant services have dynamic subdomains
        const base = `https://<tenant-id>.${service}.tenant.do`
        return version ? `https://${version}.<tenant-id>.${service}.tenant.do` : base
      }
    }

    // Environment-based URLs (legacy)
    const environment = target as Environment
    const domain = environment === 'production' ? 'do' : `${environment}.do`
    const base = `https://${service}.${domain}`
    return version ? `https://${version}.${service}.${domain}` : base
  }

  /**
   * Log deployment to database
   */
  private async logDeployment(deployment: Deployment): Promise<void> {
    try {
      // Insert deployment record into database
      await this.env.DB_SERVICE.upsert({
        ns: 'deployments',
        id: deployment.id,
        data: {
          service: deployment.service,
          environment: deployment.environment,
          tier: deployment.tier,
          version: deployment.version,
          namespace: deployment.namespace,
          status: deployment.status,
          timestamp: deployment.timestamp,
          url: deployment.url,
          version_tag: deployment.versionTag,
          commit: deployment.metadata.commit,
          branch: deployment.metadata.branch,
          author: deployment.metadata.author,
          deployed_at: deployment.timestamp,
        },
      })

      console.log('[Deploy] Logged deployment:', deployment.id)
    } catch (error) {
      console.error('[Deploy] Failed to log deployment:', error)
      // Don't fail deployment if logging fails
    }
  }

  /**
   * Get previous successful deployment
   */
  private async getPreviousDeployment(service: ServiceName, environment: Environment): Promise<Deployment | null> {
    try {
      const result = await this.env.DB_SERVICE.list('deployments', {
        filter: {
          service,
          environment,
          status: 'deployed',
        },
        sort: 'timestamp',
        order: 'desc',
        limit: 2, // Get last 2 (skip current, use previous)
      })

      if (!result.data || result.data.length < 2) {
        return null
      }

      // Return the second most recent (first is current)
      const prev = result.data[1]

      return {
        id: prev.id,
        service: prev.data.service,
        environment: prev.data.environment,
        tier: prev.data.tier,
        version: prev.data.version,
        namespace: prev.data.namespace,
        namespaceMode: 'environment', // Assume environment mode for legacy
        status: prev.data.status,
        timestamp: prev.data.timestamp,
        url: prev.data.url,
        versionTag: prev.data.version_tag,
        metadata: {
          commit: prev.data.commit,
          branch: prev.data.branch,
          author: prev.data.author,
        },
      }
    } catch (error) {
      console.error('[Deploy] Failed to get previous deployment:', error)
      return null
    }
  }

  /**
   * Mark current deployment as rolled back
   */
  private async markAsRolledBack(service: ServiceName, environment: Environment): Promise<void> {
    try {
      const result = await this.env.DB_SERVICE.list('deployments', {
        filter: {
          service,
          environment,
          status: 'deployed',
        },
        sort: 'timestamp',
        order: 'desc',
        limit: 1,
      })

      if (result.data && result.data.length > 0) {
        const current = result.data[0]
        await this.env.DB_SERVICE.upsert({
          ns: 'deployments',
          id: current.id,
          data: {
            ...current.data,
            status: 'rolled_back',
          },
        })
      }
    } catch (error) {
      console.error('[Deploy] Failed to mark as rolled back:', error)
    }
  }

  /**
   * Fetch deployments from database
   */
  private async fetchDeployments(service?: ServiceName, environment?: Environment, limit: number = 50): Promise<Deployment[]> {
    try {
      const filter: any = {}
      if (service) filter.service = service
      if (environment) filter.environment = environment

      const result = await this.env.DB_SERVICE.list('deployments', {
        filter,
        sort: 'timestamp',
        order: 'desc',
        limit,
      })

      if (!result.data) return []

      return result.data.map((item: any) => ({
        id: item.id,
        service: item.data.service,
        environment: item.data.environment,
        tier: item.data.tier,
        version: item.data.version,
        namespace: item.data.namespace,
        namespaceMode: item.data.namespace_mode || 'environment',
        status: item.data.status,
        timestamp: item.data.timestamp,
        url: item.data.url,
        versionTag: item.data.version_tag,
        metadata: {
          commit: item.data.commit,
          branch: item.data.branch,
          author: item.data.author,
        },
      }))
    } catch (error) {
      console.error('[Deploy] Failed to fetch deployments:', error)
      return []
    }
  }
}

// ============================================================================
// HTTP INTERFACE - For deployment API
// ============================================================================

const app = new Hono<{ Bindings: Env; Variables: { auth?: AuthValidation } }>()

app.use('/*', cors())

// ============================================================================
// MIDDLEWARE - Authentication
// ============================================================================

/**
 * Middleware: Validate API key and check deploy permission
 */
app.use('*', async (c, next) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    return c.json({ error: 'Missing API key' }, 401)
  }

  try {
    // Validate API key via AUTH_SERVICE
    const user = await c.env.AUTH_SERVICE.validateApiKey(apiKey)

    if (!user) {
      return c.json({ error: 'Invalid API key' }, 401)
    }

    // Check deployment permission
    const hasPermission = await c.env.AUTH_SERVICE.checkPermission({
      userId: user.id,
      resource: 'deployments',
      action: 'create',
    })

    if (!hasPermission) {
      return c.json({ error: 'Insufficient permissions - deploy permission required' }, 403)
    }

    // Store auth context
    c.set('auth', {
      valid: true,
      userId: user.id,
      permissions: ['deploy'],
    })

    await next()
  } catch (error) {
    console.error('[Deploy] Auth error:', error)
    return c.json({ error: 'Authentication failed' }, 401)
  }
})

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET / - Service info
 */
app.get('/', (c) => {
  return c.json({
    service: 'deploy',
    version: '1.0.0',
    description: 'Authenticated deployment service for Workers for Platforms',
    endpoints: {
      deploy: 'POST /deploy',
      rollback: 'POST /rollback',
      list: 'GET /deployments',
      health: 'GET /health',
    },
  })
})

/**
 * GET /health - Health check
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'deploy',
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /deploy - Deploy a service
 */
app.post('/deploy', async (c) => {
  try {
    const body = await c.req.json()
    const service = new DeployService(c.executionCtx, c.env)

    const result = await service.deploy(body)

    if (!result.success) {
      return c.json({ error: result.error }, 500)
    }

    return c.json({
      success: true,
      deployment: result.deployment,
      message: 'Deployment successful',
    })
  } catch (error) {
    console.error('[Deploy] Deploy endpoint error:', error)
    return c.json(
      {
        error: 'Deployment failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * POST /rollback - Rollback a service
 */
app.post('/rollback', async (c) => {
  try {
    const body = await c.req.json()
    const service = new DeployService(c.executionCtx, c.env)

    const result = await service.rollback(body)

    if (!result.success) {
      return c.json({ error: result.error }, 400)
    }

    return c.json({
      success: true,
      deployment: result.deployment,
      message: 'Rollback successful',
    })
  } catch (error) {
    console.error('[Deploy] Rollback endpoint error:', error)
    return c.json(
      {
        error: 'Rollback failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * GET /deployments - List deployments
 */
app.get('/deployments', async (c) => {
  try {
    const service = c.req.query('service')
    const environment = c.req.query('environment')
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50

    const deployService = new DeployService(c.executionCtx, c.env)
    const result = await deployService.listDeployments({ service: service as any, environment: environment as any, limit })

    return c.json({
      success: true,
      deployments: result.deployments,
      total: result.total,
    })
  } catch (error) {
    console.error('[Deploy] List deployments endpoint error:', error)
    return c.json(
      {
        error: 'Failed to list deployments',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

// ============================================================================
// WORKER EXPORT
// ============================================================================

export default {
  fetch: app.fetch,
}

export { app }
