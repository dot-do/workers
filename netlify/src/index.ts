/**
 * Netlify OAuth Integration Worker
 *
 * Provides OAuth 2.0 integration with Netlify for deployment and site management.
 *
 * Features:
 * - OAuth 2.0 authentication flow
 * - Site listing and management
 * - Deployment creation and monitoring
 * - RPC, HTTP, and MCP interfaces
 *
 * @see /notes/2025-10-04-netlify-oauth-setup.md
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { NetlifyApiClient } from './api'
import { deploySite, getDeploymentStatus, listRecentDeployments } from './deployments'
import { listSites, getSite, getSiteStats } from './sites'
import type {
	Env,
	NetlifyConnection,
	ConnectResponse,
	DisconnectResponse,
	DeployResponse,
	ListSitesResponse,
	GetDeploymentResponse,
	DeployOptions,
	ListOptions,
} from './types'

/**
 * RPC Interface - NetlifyService
 *
 * Called by other workers via service bindings:
 * const result = await env.NETLIFY.connect(userId, code)
 */
export class NetlifyService extends WorkerEntrypoint<Env> {
	/**
	 * Connect user's Netlify account via OAuth code
	 */
	async connect(userId: string, code: string): Promise<ConnectResponse> {
		try {
			// Exchange code for access token
			const tokenResponse = await NetlifyApiClient.exchangeCode(
				code,
				this.env.NETLIFY_CLIENT_ID,
				this.env.NETLIFY_CLIENT_SECRET,
				this.env.NETLIFY_REDIRECT_URI
			)

			// Get user information
			const client = new NetlifyApiClient(tokenResponse.access_token)
			const netlifyUser = await client.getCurrentUser()

			// Store connection in database
			const connection: NetlifyConnection = {
				userId,
				accessToken: tokenResponse.access_token,
				createdAt: tokenResponse.created_at,
				netlifyUserId: netlifyUser.id,
				email: netlifyUser.email,
			}

			await this.env.DB.execute(
				`INSERT INTO oauth_connections (user_id, provider, provider_user_id, access_token, email, created_at, updated_at)
				VALUES (?, 'netlify', ?, ?, ?, ?, ?)
				ON CONFLICT(user_id, provider) DO UPDATE SET
					provider_user_id = excluded.provider_user_id,
					access_token = excluded.access_token,
					email = excluded.email,
					updated_at = excluded.updated_at`,
				userId,
				netlifyUser.id,
				tokenResponse.access_token,
				netlifyUser.email,
				Date.now(),
				Date.now()
			)

			// Cache connection for quick access
			await this.env.NETLIFY_CACHE.put(`connection:${userId}`, JSON.stringify(connection), {
				expirationTtl: 3600, // 1 hour
			})

			return {
				success: true,
				userId,
				netlifyUserId: netlifyUser.id,
				email: netlifyUser.email,
			}
		} catch (error) {
			throw new Error(`Failed to connect Netlify account: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Disconnect user's Netlify account
	 */
	async disconnect(userId: string): Promise<DisconnectResponse> {
		try {
			// Remove from database
			await this.env.DB.execute(`DELETE FROM oauth_connections WHERE user_id = ? AND provider = 'netlify'`, userId)

			// Remove from cache
			await this.env.NETLIFY_CACHE.delete(`connection:${userId}`)

			return {
				success: true,
				userId,
			}
		} catch (error) {
			throw new Error(`Failed to disconnect Netlify account: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Get user's Netlify connection
	 */
	async getConnection(userId: string): Promise<NetlifyConnection | null> {
		// Try cache first
		const cached = await this.env.NETLIFY_CACHE.get(`connection:${userId}`)
		if (cached) {
			return JSON.parse(cached)
		}

		// Fetch from database
		const result = await this.env.DB.execute(
			`SELECT user_id, provider_user_id, access_token, email, created_at
			FROM oauth_connections
			WHERE user_id = ? AND provider = 'netlify'`,
			userId
		)

		if (!result.rows || result.rows.length === 0) {
			return null
		}

		const row = result.rows[0]
		const connection: NetlifyConnection = {
			userId: row.user_id,
			accessToken: row.access_token,
			createdAt: row.created_at,
			netlifyUserId: row.provider_user_id,
			email: row.email,
		}

		// Cache for future requests
		await this.env.NETLIFY_CACHE.put(`connection:${userId}`, JSON.stringify(connection), {
			expirationTtl: 3600,
		})

		return connection
	}

	/**
	 * Deploy site
	 */
	async deploy(userId: string, options: DeployOptions): Promise<DeployResponse> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('Netlify account not connected')
		}

		return await deploySite(connection.accessToken, options)
	}

	/**
	 * List user's sites
	 */
	async listSites(userId: string, options: ListOptions = {}): Promise<ListSitesResponse> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('Netlify account not connected')
		}

		const sites = await listSites(connection.accessToken, options)

		return {
			success: true,
			sites,
			total: sites.length,
		}
	}

	/**
	 * Get deployment status
	 */
	async getDeployment(userId: string, siteId: string, deployId: string): Promise<GetDeploymentResponse> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('Netlify account not connected')
		}

		const deployment = await getDeploymentStatus(connection.accessToken, siteId, deployId)

		return {
			success: true,
			deployment,
			siteId,
		}
	}

	/**
	 * Get site details
	 */
	async getSite(userId: string, siteId: string) {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('Netlify account not connected')
		}

		return await getSite(connection.accessToken, siteId)
	}

	/**
	 * Get site statistics
	 */
	async getSiteStats(userId: string, siteId: string) {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('Netlify account not connected')
		}

		return await getSiteStats(connection.accessToken, siteId)
	}

	/**
	 * List recent deployments
	 */
	async listDeployments(userId: string, siteId: string, limit = 10) {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('Netlify account not connected')
		}

		return await listRecentDeployments(connection.accessToken, siteId, limit)
	}
}

/**
 * HTTP API - Hono routes
 */
const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('*', cors())

// Health check
app.get('/health', (c) => {
	return c.json({ status: 'ok', service: 'netlify' })
})

// OAuth callback endpoint
app.get('/callback', async (c) => {
	const code = c.req.query('code')
	const state = c.req.query('state')
	const userId = c.req.query('userId')

	if (!code || !userId) {
		return c.json({ error: 'Missing code or userId' }, 400)
	}

	try {
		const service = new NetlifyService(c.env.ctx, c.env)
		const result = await service.connect(userId, code)
		return c.json(result)
	} catch (error) {
		return c.json({ error: error instanceof Error ? error.message : String(error) }, 500)
	}
})

// Disconnect endpoint
app.post('/disconnect', async (c) => {
	const { userId } = await c.req.json()

	if (!userId) {
		return c.json({ error: 'Missing userId' }, 400)
	}

	try {
		const service = new NetlifyService(c.env.ctx, c.env)
		const result = await service.disconnect(userId)
		return c.json(result)
	} catch (error) {
		return c.json({ error: error instanceof Error ? error.message : String(error) }, 500)
	}
})

// List sites
app.get('/sites', async (c) => {
	const userId = c.req.query('userId')

	if (!userId) {
		return c.json({ error: 'Missing userId' }, 400)
	}

	try {
		const service = new NetlifyService(c.env.ctx, c.env)
		const result = await service.listSites(userId)
		return c.json(result)
	} catch (error) {
		return c.json({ error: error instanceof Error ? error.message : String(error) }, 500)
	}
})

// Get site
app.get('/sites/:siteId', async (c) => {
	const userId = c.req.query('userId')
	const siteId = c.req.param('siteId')

	if (!userId) {
		return c.json({ error: 'Missing userId' }, 400)
	}

	try {
		const service = new NetlifyService(c.env.ctx, c.env)
		const site = await service.getSite(userId, siteId)
		return c.json({ success: true, site })
	} catch (error) {
		return c.json({ error: error instanceof Error ? error.message : String(error) }, 500)
	}
})

// Deploy site
app.post('/deploy', async (c) => {
	const { userId, ...options } = await c.req.json()

	if (!userId) {
		return c.json({ error: 'Missing userId' }, 400)
	}

	try {
		const service = new NetlifyService(c.env.ctx, c.env)
		const result = await service.deploy(userId, options)
		return c.json(result)
	} catch (error) {
		return c.json({ error: error instanceof Error ? error.message : String(error) }, 500)
	}
})

// Get deployment
app.get('/sites/:siteId/deploys/:deployId', async (c) => {
	const userId = c.req.query('userId')
	const siteId = c.req.param('siteId')
	const deployId = c.req.param('deployId')

	if (!userId) {
		return c.json({ error: 'Missing userId' }, 400)
	}

	try {
		const service = new NetlifyService(c.env.ctx, c.env)
		const result = await service.getDeployment(userId, siteId, deployId)
		return c.json(result)
	} catch (error) {
		return c.json({ error: error instanceof Error ? error.message : String(error) }, 500)
	}
})

// List deployments
app.get('/sites/:siteId/deploys', async (c) => {
	const userId = c.req.query('userId')
	const siteId = c.req.param('siteId')
	const limit = parseInt(c.req.query('limit') || '10')

	if (!userId) {
		return c.json({ error: 'Missing userId' }, 400)
	}

	try {
		const service = new NetlifyService(c.env.ctx, c.env)
		const deployments = await service.listDeployments(userId, siteId, limit)
		return c.json({ success: true, deployments })
	} catch (error) {
		return c.json({ error: error instanceof Error ? error.message : String(error) }, 500)
	}
})

// Get site stats
app.get('/sites/:siteId/stats', async (c) => {
	const userId = c.req.query('userId')
	const siteId = c.req.param('siteId')

	if (!userId) {
		return c.json({ error: 'Missing userId' }, 400)
	}

	try {
		const service = new NetlifyService(c.env.ctx, c.env)
		const stats = await service.getSiteStats(userId, siteId)
		return c.json({ success: true, stats })
	} catch (error) {
		return c.json({ error: error instanceof Error ? error.message : String(error) }, 500)
	}
})

// Export default fetch handler
export default {
	fetch: app.fetch,
}
