/**
 * Platform Deployer Worker
 *
 * Manages Workers for Platforms deployments for multi-tenant architecture.
 *
 * Endpoints:
 * - POST /provision - Provision new tenant namespace
 * - POST /deploy - Deploy worker to namespace
 * - DELETE /deprovision - Remove tenant namespace
 * - GET /status - Get deployment status
 */

import { Hono } from 'hono'

type Bindings = {
  CLOUDFLARE_ACCOUNT_ID: string
  CLOUDFLARE_API_TOKEN: string
  PLATFORM_DOMAIN: string
  DB_SERVICE: any
  TENANT_DATABASE: DurableObjectNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

/**
 * Provision new tenant namespace
 *
 * Creates:
 * - Dispatch namespace
 * - Durable Object for SQLite database
 * - Initial worker deployment
 */
app.post('/provision', async (c) => {
  const body = await c.req.json<{
    tenantId: string
    tenantSlug: string
    customDomain?: string
  }>()

  if (!body.tenantId || !body.tenantSlug) {
    return c.json({ error: 'Missing tenantId or tenantSlug' }, 400)
  }

  try {
    // Step 1: Create dispatch namespace
    const namespace = await createDispatchNamespace(c.env, body.tenantSlug)

    // Step 2: Create Durable Object instance for tenant database
    const doId = c.env.TENANT_DATABASE.idFromName(`db-${body.tenantSlug}`)
    const durableObject = c.env.TENANT_DATABASE.get(doId)

    // Initialize database
    await durableObject.fetch('https://internal/initialize', {
      method: 'POST',
      body: JSON.stringify({ tenantId: body.tenantId }),
    })

    // Step 3: Deploy worker to namespace
    const workerUrl = await deployWorker(c.env, {
      namespaceId: namespace.id,
      tenantSlug: body.tenantSlug,
      tenantId: body.tenantId,
      durableObjectId: doId.toString(),
    })

    // Step 4: Configure custom domain (if provided)
    if (body.customDomain) {
      await configureDomain(c.env, {
        domain: body.customDomain,
        namespaceId: namespace.id,
      })
    }

    return c.json({
      success: true,
      namespaceId: namespace.id,
      durableObjectId: doId.toString(),
      workerUrl,
    })
  } catch (error) {
    console.error('Provisioning error:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * Deploy worker to namespace
 */
app.post('/deploy', async (c) => {
  const body = await c.req.json<{
    namespaceId: string
    tenantSlug: string
    code?: string
  }>()

  if (!body.namespaceId || !body.tenantSlug) {
    return c.json({ error: 'Missing namespaceId or tenantSlug' }, 400)
  }

  try {
    const workerUrl = await deployWorker(c.env, {
      namespaceId: body.namespaceId,
      tenantSlug: body.tenantSlug,
      code: body.code,
    })

    return c.json({
      success: true,
      workerUrl,
    })
  } catch (error) {
    console.error('Deployment error:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * Deprovision tenant namespace
 */
app.delete('/deprovision/:slug', async (c) => {
  const tenantSlug = c.req.param('slug')

  try {
    // Delete worker
    await deleteWorker(c.env, tenantSlug)

    // Delete dispatch namespace
    await deleteDispatchNamespace(c.env, tenantSlug)

    // Note: DO will be garbage collected automatically

    return c.json({ success: true })
  } catch (error) {
    console.error('Deprovisioning error:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * Get deployment status
 */
app.get('/status/:slug', async (c) => {
  const tenantSlug = c.req.param('slug')

  try {
    const status = await getDeploymentStatus(c.env, tenantSlug)
    return c.json(status)
  } catch (error) {
    console.error('Status error:', error)
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * Health check
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'platform-deployer',
    timestamp: Date.now(),
  })
})

export default app

// ============================================================================
// Internal Functions
// ============================================================================

/**
 * Create dispatch namespace using Cloudflare API
 */
async function createDispatchNamespace(
  env: Bindings,
  tenantSlug: string
): Promise<{ id: string }> {
  // In production, call Cloudflare API:
  // POST https://api.cloudflare.com/client/v4/accounts/:account_id/workers/dispatch/namespaces

  // For now, simulate
  return {
    id: `ns_${Date.now()}_${tenantSlug}`,
  }
}

/**
 * Delete dispatch namespace
 */
async function deleteDispatchNamespace(env: Bindings, tenantSlug: string): Promise<void> {
  // In production, call Cloudflare API:
  // DELETE https://api.cloudflare.com/client/v4/accounts/:account_id/workers/dispatch/namespaces/:namespace_id

  console.log('Deleted namespace for', tenantSlug)
}

/**
 * Deploy worker to namespace
 */
async function deployWorker(
  env: Bindings,
  params: {
    namespaceId: string
    tenantSlug: string
    tenantId?: string
    code?: string
    durableObjectId?: string
  }
): Promise<string> {
  // In production, call Cloudflare API:
  // PUT https://api.cloudflare.com/client/v4/accounts/:account_id/workers/dispatch/namespaces/:namespace_id/scripts/:script_name

  const workerCode = params.code || getDefaultTenantWorker()

  console.log('Deployed worker for', params.tenantSlug)

  return `https://${params.tenantSlug}.${env.PLATFORM_DOMAIN}`
}

/**
 * Delete worker
 */
async function deleteWorker(env: Bindings, tenantSlug: string): Promise<void> {
  // In production, call Cloudflare API
  console.log('Deleted worker for', tenantSlug)
}

/**
 * Configure custom domain
 */
async function configureDomain(
  env: Bindings,
  params: {
    domain: string
    namespaceId: string
  }
): Promise<void> {
  // In production, configure DNS and worker route
  console.log('Configured domain', params.domain)
}

/**
 * Get deployment status
 */
async function getDeploymentStatus(
  env: Bindings,
  tenantSlug: string
): Promise<{
  deployed: boolean
  workerUrl?: string
  lastDeployed?: string
}> {
  // In production, query Cloudflare API for worker status

  return {
    deployed: true,
    workerUrl: `https://${tenantSlug}.${env.PLATFORM_DOMAIN}`,
    lastDeployed: new Date().toISOString(),
  }
}

/**
 * Default tenant worker code
 */
function getDefaultTenantWorker(): string {
  return `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return Response.json({
        status: 'ok',
        tenant: env.TENANT_SLUG,
        timestamp: Date.now(),
      })
    }

    return Response.json({
      message: 'Tenant marketplace',
      tenant: env.TENANT_SLUG,
    })
  },
}
`.trim()
}
