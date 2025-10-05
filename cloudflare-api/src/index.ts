/**
 * Cloudflare API Integration Worker
 *
 * Provides secure access to Cloudflare APIs using user-provided API tokens.
 * Users manually create tokens in Cloudflare dashboard and store them in .do admin.
 *
 * RPC Interface:
 * - connect(userId, apiToken) - Store and validate API token
 * - disconnect(userId) - Remove stored token
 * - verifyToken(apiToken) - Validate token without storing
 * - listZones(userId, options) - List user's Cloudflare zones
 * - listWorkers(userId, accountId, options) - List user's workers
 * - listR2Buckets(userId, accountId, options) - List user's R2 buckets
 *
 * HTTP Interface:
 * - POST /connect - Connect Cloudflare account
 * - POST /disconnect - Disconnect account
 * - GET /zones - List zones
 * - GET /workers - List workers
 * - GET /r2 - List R2 buckets
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type {
	Env,
	CloudflareConnection,
	ConnectResponse,
	VerifyTokenResponse,
	ListOptions,
	CloudflareZone,
	CloudflareWorker,
	CloudflareR2Bucket,
} from './types'
import { verifyToken, checkRateLimit, encryptToken, decryptToken, cloudflareRequest } from './api'
import { listZones, getZone, getZoneSettings, getDNSRecords } from './zones'
import { listWorkers, getWorker, listKVNamespaces } from './workers'
import { listR2Buckets, getR2Bucket } from './r2'

// Encryption secret (should be in env vars in production)
const ENCRYPTION_SECRET = 'cloudflare-api-encryption-secret-change-me-in-production'

/**
 * RPC Service Interface
 */
export class CloudflareService extends WorkerEntrypoint<Env> {
	/**
	 * Connect a user's Cloudflare account by storing their API token
	 */
	async connect(userId: string, apiToken: string): Promise<ConnectResponse> {
		try {
			// Verify token is valid
			const { user, accounts } = await verifyToken(apiToken)

			// Encrypt token for storage
			const encryptedToken = encryptToken(apiToken, ENCRYPTION_SECRET)

			// Store connection in database
			const connection: CloudflareConnection = {
				userId,
				apiToken: encryptedToken,
				accountId: accounts[0]?.id,
				email: user.email,
				verified: true,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			}

			// Store in database via DB service
			await this.env.DB.execute(
				`INSERT INTO cloudflare_connections (user_id, api_token, account_id, email, verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET
           api_token = excluded.api_token,
           account_id = excluded.account_id,
           email = excluded.email,
           verified = excluded.verified,
           updated_at = excluded.updated_at`,
				userId,
				connection.apiToken,
				connection.accountId,
				connection.email,
				connection.verified ? 1 : 0,
				connection.createdAt,
				connection.updatedAt
			)

			return {
				success: true,
				accountId: accounts[0]?.id,
				email: user.email,
				accounts,
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to connect Cloudflare account',
			}
		}
	}

	/**
	 * Disconnect a user's Cloudflare account
	 */
	async disconnect(userId: string): Promise<{ success: boolean; error?: string }> {
		try {
			await this.env.DB.execute('DELETE FROM cloudflare_connections WHERE user_id = ?', userId)

			return { success: true }
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to disconnect account',
			}
		}
	}

	/**
	 * Verify an API token without storing it
	 */
	async verifyTokenRpc(apiToken: string): Promise<VerifyTokenResponse> {
		try {
			const { user, accounts } = await verifyToken(apiToken)

			return {
				valid: true,
				accountId: accounts[0]?.id,
				email: user.email,
				accounts,
			}
		} catch (error) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : 'Invalid API token',
			}
		}
	}

	/**
	 * Get stored connection for a user
	 */
	private async getConnection(userId: string): Promise<string | null> {
		try {
			const result = await this.env.DB.queryOne(
				'SELECT api_token, last_used_at FROM cloudflare_connections WHERE user_id = ? AND verified = 1',
				userId
			)

			if (!result) {
				return null
			}

			// Update last_used_at
			await this.env.DB.execute(
				'UPDATE cloudflare_connections SET last_used_at = ? WHERE user_id = ?',
				Date.now(),
				userId
			)

			// Decrypt token
			return decryptToken(result.api_token, ENCRYPTION_SECRET)
		} catch (error) {
			console.error('Failed to get connection:', error)
			return null
		}
	}

	/**
	 * List zones for a connected user
	 */
	async listZones(
		userId: string,
		options: ListOptions = {}
	): Promise<{ zones: CloudflareZone[]; total: number; error?: string }> {
		// Check rate limit
		if (!checkRateLimit(userId)) {
			return { zones: [], total: 0, error: 'Rate limit exceeded. Please try again later.' }
		}

		// Get stored token
		const apiToken = await this.getConnection(userId)
		if (!apiToken) {
			return { zones: [], total: 0, error: 'Cloudflare account not connected' }
		}

		try {
			const result = await listZones(apiToken, undefined, options)
			return result
		} catch (error) {
			return {
				zones: [],
				total: 0,
				error: error instanceof Error ? error.message : 'Failed to list zones',
			}
		}
	}

	/**
	 * List workers for a connected user
	 */
	async listWorkers(
		userId: string,
		accountId: string,
		options: ListOptions = {}
	): Promise<{ workers: CloudflareWorker[]; total: number; error?: string }> {
		// Check rate limit
		if (!checkRateLimit(userId)) {
			return { workers: [], total: 0, error: 'Rate limit exceeded. Please try again later.' }
		}

		// Get stored token
		const apiToken = await this.getConnection(userId)
		if (!apiToken) {
			return { workers: [], total: 0, error: 'Cloudflare account not connected' }
		}

		try {
			const result = await listWorkers(apiToken, accountId, options)
			return result
		} catch (error) {
			return {
				workers: [],
				total: 0,
				error: error instanceof Error ? error.message : 'Failed to list workers',
			}
		}
	}

	/**
	 * List R2 buckets for a connected user
	 */
	async listR2Buckets(
		userId: string,
		accountId: string,
		options: ListOptions = {}
	): Promise<{ buckets: CloudflareR2Bucket[]; total: number; error?: string }> {
		// Check rate limit
		if (!checkRateLimit(userId)) {
			return { buckets: [], total: 0, error: 'Rate limit exceeded. Please try again later.' }
		}

		// Get stored token
		const apiToken = await this.getConnection(userId)
		if (!apiToken) {
			return { buckets: [], total: 0, error: 'Cloudflare account not connected' }
		}

		try {
			const result = await listR2Buckets(apiToken, accountId, options)
			return result
		} catch (error) {
			return {
				buckets: [],
				total: 0,
				error: error instanceof Error ? error.message : 'Failed to list R2 buckets',
			}
		}
	}

	/**
	 * Get zone details
	 */
	async getZone(userId: string, zoneId: string): Promise<{ zone?: CloudflareZone; error?: string }> {
		if (!checkRateLimit(userId)) {
			return { error: 'Rate limit exceeded. Please try again later.' }
		}

		const apiToken = await this.getConnection(userId)
		if (!apiToken) {
			return { error: 'Cloudflare account not connected' }
		}

		try {
			const zone = await getZone(apiToken, zoneId)
			return { zone }
		} catch (error) {
			return { error: error instanceof Error ? error.message : 'Failed to get zone' }
		}
	}

	/**
	 * Get worker details
	 */
	async getWorker(
		userId: string,
		accountId: string,
		scriptName: string
	): Promise<{ worker?: CloudflareWorker; error?: string }> {
		if (!checkRateLimit(userId)) {
			return { error: 'Rate limit exceeded. Please try again later.' }
		}

		const apiToken = await this.getConnection(userId)
		if (!apiToken) {
			return { error: 'Cloudflare account not connected' }
		}

		try {
			const worker = await getWorker(apiToken, accountId, scriptName)
			return { worker }
		} catch (error) {
			return { error: error instanceof Error ? error.message : 'Failed to get worker' }
		}
	}

	/**
	 * Get R2 bucket details
	 */
	async getR2Bucket(
		userId: string,
		accountId: string,
		bucketName: string
	): Promise<{ bucket?: CloudflareR2Bucket; error?: string }> {
		if (!checkRateLimit(userId)) {
			return { error: 'Rate limit exceeded. Please try again later.' }
		}

		const apiToken = await this.getConnection(userId)
		if (!apiToken) {
			return { error: 'Cloudflare account not connected' }
		}

		try {
			const bucket = await getR2Bucket(apiToken, accountId, bucketName)
			return { bucket }
		} catch (error) {
			return { error: error instanceof Error ? error.message : 'Failed to get R2 bucket' }
		}
	}
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env; Variables: { userId: string } }>()

// CORS middleware
app.use('*', cors())

// Auth middleware - validates user from Authorization header
app.use('*', async (c, next) => {
	const authHeader = c.req.header('Authorization')
	if (!authHeader) {
		return c.json({ error: 'Authorization header required' }, 401)
	}

	const token = authHeader.replace('Bearer ', '')

	try {
		// Validate token with auth service
		const user = await c.env.AUTH.validateToken(token)
		if (!user) {
			return c.json({ error: 'Invalid token' }, 401)
		}

		c.set('userId', user.id)
		await next()
	} catch (error) {
		return c.json({ error: 'Authentication failed' }, 401)
	}
})

/**
 * POST /connect - Connect Cloudflare account
 */
app.post('/connect', async (c) => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const { apiToken } = body

	if (!apiToken) {
		return c.json({ error: 'apiToken is required' }, 400)
	}

	const service = new CloudflareService(c.env.ctx, c.env)
	const result = await service.connect(userId, apiToken)

	return c.json(result, result.success ? 200 : 400)
})

/**
 * POST /disconnect - Disconnect Cloudflare account
 */
app.post('/disconnect', async (c) => {
	const userId = c.get('userId')

	const service = new CloudflareService(c.env.ctx, c.env)
	const result = await service.disconnect(userId)

	return c.json(result, result.success ? 200 : 400)
})

/**
 * POST /verify - Verify API token without storing
 */
app.post('/verify', async (c) => {
	const body = await c.req.json()
	const { apiToken } = body

	if (!apiToken) {
		return c.json({ error: 'apiToken is required' }, 400)
	}

	const service = new CloudflareService(c.env.ctx, c.env)
	const result = await service.verifyTokenRpc(apiToken)

	return c.json(result)
})

/**
 * GET /zones - List zones
 */
app.get('/zones', async (c) => {
	const userId = c.get('userId')
	const page = c.req.query('page') ? parseInt(c.req.query('page')!) : undefined
	const per_page = c.req.query('per_page') ? parseInt(c.req.query('per_page')!) : undefined
	const status = c.req.query('status')

	const service = new CloudflareService(c.env.ctx, c.env)
	const result = await service.listZones(userId, { page, per_page, status })

	return c.json(result)
})

/**
 * GET /zones/:id - Get zone details
 */
app.get('/zones/:id', async (c) => {
	const userId = c.get('userId')
	const zoneId = c.req.param('id')

	const service = new CloudflareService(c.env.ctx, c.env)
	const result = await service.getZone(userId, zoneId)

	return c.json(result)
})

/**
 * GET /workers - List workers
 */
app.get('/workers', async (c) => {
	const userId = c.get('userId')
	const accountId = c.req.query('accountId')

	if (!accountId) {
		return c.json({ error: 'accountId query parameter is required' }, 400)
	}

	const page = c.req.query('page') ? parseInt(c.req.query('page')!) : undefined
	const per_page = c.req.query('per_page') ? parseInt(c.req.query('per_page')!) : undefined

	const service = new CloudflareService(c.env.ctx, c.env)
	const result = await service.listWorkers(userId, accountId, { page, per_page })

	return c.json(result)
})

/**
 * GET /workers/:accountId/:scriptName - Get worker details
 */
app.get('/workers/:accountId/:scriptName', async (c) => {
	const userId = c.get('userId')
	const accountId = c.req.param('accountId')
	const scriptName = c.req.param('scriptName')

	const service = new CloudflareService(c.env.ctx, c.env)
	const result = await service.getWorker(userId, accountId, scriptName)

	return c.json(result)
})

/**
 * GET /r2 - List R2 buckets
 */
app.get('/r2', async (c) => {
	const userId = c.get('userId')
	const accountId = c.req.query('accountId')

	if (!accountId) {
		return c.json({ error: 'accountId query parameter is required' }, 400)
	}

	const page = c.req.query('page') ? parseInt(c.req.query('page')!) : undefined
	const per_page = c.req.query('per_page') ? parseInt(c.req.query('per_page')!) : undefined

	const service = new CloudflareService(c.env.ctx, c.env)
	const result = await service.listR2Buckets(userId, accountId, { page, per_page })

	return c.json(result)
})

/**
 * GET /r2/:accountId/:bucketName - Get R2 bucket details
 */
app.get('/r2/:accountId/:bucketName', async (c) => {
	const userId = c.get('userId')
	const accountId = c.req.param('accountId')
	const bucketName = c.req.param('bucketName')

	const service = new CloudflareService(c.env.ctx, c.env)
	const result = await service.getR2Bucket(userId, accountId, bucketName)

	return c.json(result)
})

/**
 * GET /health - Health check
 */
app.get('/health', (c) => {
	return c.json({ status: 'ok', service: 'cloudflare-api', timestamp: Date.now() })
})

export default {
	fetch: app.fetch,
}
