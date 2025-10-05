/**
 * GCP Worker
 * Google Cloud Platform OAuth 2.0 integration service
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type {
	Env,
	GCPConnection,
	ConnectRequest,
	ConnectResponse,
	DisconnectRequest,
	DisconnectResponse,
	ListProjectsRequest,
	ListProjectsResponse,
	ListBucketsRequest,
	ListBucketsResponse,
	ListFunctionsRequest,
	ListFunctionsResponse,
	InvokeFunctionRequest,
	InvokeFunctionResponse,
} from './types'
import { GCPOAuth } from './oauth'
import { GCPAPIClient } from './api'
import { CloudStorageService, CloudFunctionsService, ComputeEngineService, BigQueryService, CloudSQLService } from './services'

/**
 * RPC Interface
 */
export class GCPService extends WorkerEntrypoint<Env> {
	/**
	 * Connect user's Google account via OAuth
	 */
	async connect(userId: string, code: string): Promise<ConnectResponse> {
		try {
			const oauth = new GCPOAuth(this.env)

			// Exchange authorization code for tokens
			const tokens = await oauth.exchangeCode(code)

			// Get user info
			const userInfo = await oauth.getUserInfo(tokens.access_token)

			// Create connection object
			const connection: GCPConnection = {
				userId,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresAt: Date.now() + tokens.expires_in * 1000,
				scope: tokens.scope,
				userInfo,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			}

			// Store connection in KV
			await this.env.TOKEN_KV.put(`gcp:${userId}`, JSON.stringify(connection), {
				expirationTtl: 86400 * 90, // 90 days
			})

			// Store connection in database
			await this.env.DB.execute(
				`INSERT INTO oauth_connections (user_id, provider, provider_user_id, access_token, refresh_token, expires_at, scope, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, provider) DO UPDATE SET
           provider_user_id = excluded.provider_user_id,
           access_token = excluded.access_token,
           refresh_token = excluded.refresh_token,
           expires_at = excluded.expires_at,
           scope = excluded.scope,
           metadata = excluded.metadata,
           updated_at = excluded.updated_at`,
				userId,
				'gcp',
				userInfo.sub,
				tokens.access_token,
				tokens.refresh_token || null,
				connection.expiresAt,
				tokens.scope,
				JSON.stringify({ userInfo }),
				connection.createdAt,
				connection.updatedAt
			)

			return {
				success: true,
				userInfo,
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	}

	/**
	 * Disconnect user's Google account
	 */
	async disconnect(userId: string): Promise<DisconnectResponse> {
		try {
			// Get connection from KV
			const connectionData = await this.env.TOKEN_KV.get(`gcp:${userId}`)
			if (connectionData) {
				const connection: GCPConnection = JSON.parse(connectionData)

				// Revoke token with Google
				const oauth = new GCPOAuth(this.env)
				await oauth.revokeToken(connection.accessToken)
			}

			// Delete from KV
			await this.env.TOKEN_KV.delete(`gcp:${userId}`)

			// Delete from database
			await this.env.DB.execute(`DELETE FROM oauth_connections WHERE user_id = ? AND provider = ?`, userId, 'gcp')

			return {
				success: true,
			}
		} catch (error) {
			return {
				success: false,
			}
		}
	}

	/**
	 * Get user's GCP connection
	 */
	async getConnection(userId: string): Promise<GCPConnection | null> {
		const connectionData = await this.env.TOKEN_KV.get(`gcp:${userId}`)
		if (!connectionData) return null

		return JSON.parse(connectionData)
	}

	/**
	 * List GCP projects accessible to user
	 */
	async listProjects(userId: string, pageSize?: number, pageToken?: string): Promise<ListProjectsResponse> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('User not connected to GCP')
		}

		const client = new GCPAPIClient(this.env, connection)
		return client.listProjects(pageSize, pageToken)
	}

	/**
	 * List Cloud Storage buckets in a project
	 */
	async listBuckets(userId: string, projectId: string, prefix?: string, maxResults?: number): Promise<ListBucketsResponse> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('User not connected to GCP')
		}

		const client = new GCPAPIClient(this.env, connection)
		return client.listBuckets(projectId, prefix, maxResults)
	}

	/**
	 * List Cloud Functions in a project
	 */
	async listFunctions(userId: string, projectId: string, location?: string): Promise<ListFunctionsResponse> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('User not connected to GCP')
		}

		const client = new GCPAPIClient(this.env, connection)
		const functions = await client.listFunctions(projectId, location)
		return { functions }
	}

	/**
	 * Invoke a Cloud Function
	 */
	async invokeFunction(userId: string, projectId: string, functionName: string, data?: any): Promise<InvokeFunctionResponse> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('User not connected to GCP')
		}

		const client = new GCPAPIClient(this.env, connection)
		return client.invokeFunction(projectId, functionName, data)
	}
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', cors())

// Health check
app.get('/health', (c) => {
	return c.json({ status: 'ok', service: 'gcp' })
})

// OAuth authorization URL
app.get('/connect', async (c) => {
	const userId = c.req.query('user_id')
	if (!userId) {
		return c.json({ error: 'user_id is required' }, 400)
	}

	const state = crypto.randomUUID()

	// Store state in KV for validation (expires in 10 minutes)
	await c.env.TOKEN_KV.put(`state:${state}`, userId, { expirationTtl: 600 })

	const oauth = new GCPOAuth(c.env)
	const authUrl = oauth.generateAuthUrl(state)

	return c.json({ url: authUrl })
})

// OAuth callback
app.get('/callback', async (c) => {
	const code = c.req.query('code')
	const state = c.req.query('state')
	const error = c.req.query('error')

	if (error) {
		return c.json({ error: `OAuth error: ${error}` }, 400)
	}

	if (!code || !state) {
		return c.json({ error: 'Missing code or state parameter' }, 400)
	}

	// Validate state
	const userId = await c.env.TOKEN_KV.get(`state:${state}`)
	if (!userId) {
		return c.json({ error: 'Invalid or expired state parameter' }, 400)
	}

	// Delete state
	await c.env.TOKEN_KV.delete(`state:${state}`)

	// Connect user
	const service = new GCPService(c.env.ctx, c.env)
	const result = await service.connect(userId, code)

	if (result.success) {
		return c.json({ success: true, userInfo: result.userInfo })
	} else {
		return c.json({ error: result.error }, 500)
	}
})

// Disconnect
app.post('/disconnect', async (c) => {
	const { userId } = await c.req.json()
	if (!userId) {
		return c.json({ error: 'userId is required' }, 400)
	}

	const service = new GCPService(c.env.ctx, c.env)
	const result = await service.disconnect(userId)

	return c.json(result)
})

// List projects
app.get('/projects', async (c) => {
	const userId = c.req.query('user_id')
	if (!userId) {
		return c.json({ error: 'user_id is required' }, 400)
	}

	const service = new GCPService(c.env.ctx, c.env)
	const result = await service.listProjects(userId)

	return c.json(result)
})

// List buckets
app.get('/buckets', async (c) => {
	const userId = c.req.query('user_id')
	const projectId = c.req.query('project_id')

	if (!userId || !projectId) {
		return c.json({ error: 'user_id and project_id are required' }, 400)
	}

	const service = new GCPService(c.env.ctx, c.env)
	const result = await service.listBuckets(userId, projectId)

	return c.json(result)
})

// List functions
app.get('/functions', async (c) => {
	const userId = c.req.query('user_id')
	const projectId = c.req.query('project_id')
	const location = c.req.query('location')

	if (!userId || !projectId) {
		return c.json({ error: 'user_id and project_id are required' }, 400)
	}

	const service = new GCPService(c.env.ctx, c.env)
	const result = await service.listFunctions(userId, projectId, location)

	return c.json(result)
})

// Invoke function
app.post('/functions/invoke', async (c) => {
	const { userId, projectId, functionName, data } = await c.req.json()

	if (!userId || !projectId || !functionName) {
		return c.json({ error: 'userId, projectId, and functionName are required' }, 400)
	}

	const service = new GCPService(c.env.ctx, c.env)
	const result = await service.invokeFunction(userId, projectId, functionName, data)

	return c.json(result)
})

export default {
	fetch: app.fetch,
}
