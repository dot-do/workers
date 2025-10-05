/**
 * Azure Integration Worker
 *
 * Provides OAuth integration with Microsoft Azure/Entra ID
 * Exposes RPC, HTTP, and MCP interfaces for:
 * - OAuth authentication flow
 * - Microsoft Graph API access
 * - Azure Resource Manager operations
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { EntraOAuth } from './entra'
import { GraphClient } from './graph'
import { ARMClient } from './arm'
import type {
	Env,
	AzureConnection,
	AzureOAuthConfig,
	ConnectOptions,
	ConnectResult,
	DisconnectOptions,
	DisconnectResult,
	GetUserOptions,
	ListSubscriptionsOptions,
	ListResourceGroupsOptions,
	ListResourcesOptions,
	GetMailOptions,
	GetCalendarEventsOptions,
} from './types'

// ========================================
// RPC Interface
// ========================================

export class AzureService extends WorkerEntrypoint<Env> {
	/**
	 * Connect user account via OAuth authorization code
	 */
	async connect(options: ConnectOptions): Promise<ConnectResult> {
		try {
			const oauth = this.getOAuthClient()

			// Exchange code for tokens
			const tokens = await oauth.exchangeCodeForTokens({
				code: options.code,
				codeVerifier: options.codeVerifier || '',
				tenantId: options.tenantId,
			})

			// Get user info from Graph API
			const graph = new GraphClient(tokens.access_token)
			const userInfo = await graph.getMe()

			// Extract tenant ID from token
			const idToken = EntraOAuth.decodeJWT(tokens.id_token || '')
			const tenantId = options.tenantId || idToken.tid

			// Create connection
			const connection: AzureConnection = {
				userId: options.userId,
				tenantId,
				tokens,
				userInfo,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			}

			// Store in KV
			await this.env.AZURE_TOKENS.put(`user:${options.userId}`, JSON.stringify(connection), {
				expirationTtl: 90 * 24 * 60 * 60, // 90 days
			})

			// Also store in database for persistence
			await this.env.DB.execute(
				`INSERT INTO oauth_connections (user_id, provider, provider_user_id, tenant_id, access_token, refresh_token, expires_at, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(user_id, provider) DO UPDATE SET
				 	provider_user_id = excluded.provider_user_id,
				 	tenant_id = excluded.tenant_id,
				 	access_token = excluded.access_token,
				 	refresh_token = excluded.refresh_token,
				 	expires_at = excluded.expires_at,
				 	updated_at = excluded.updated_at`,
				options.userId,
				'azure',
				userInfo.id,
				tenantId,
				tokens.access_token,
				tokens.refresh_token || null,
				tokens.expires_at,
				Date.now(),
				Date.now()
			)

			return { success: true, connection }
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	}

	/**
	 * Disconnect user account
	 */
	async disconnect(options: DisconnectOptions): Promise<DisconnectResult> {
		try {
			// Delete from KV
			await this.env.AZURE_TOKENS.delete(`user:${options.userId}`)

			// Delete from database
			await this.env.DB.execute(
				'DELETE FROM oauth_connections WHERE user_id = ? AND provider = ?',
				options.userId,
				'azure'
			)

			return { success: true }
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	}

	/**
	 * Get user profile via Microsoft Graph
	 */
	async getUser(options: GetUserOptions) {
		const connection = await this.getConnection(options.userId)
		const tokens = await this.ensureValidTokens(connection)
		const graph = new GraphClient(tokens.access_token)
		return await graph.getMe()
	}

	/**
	 * List Azure subscriptions
	 */
	async listSubscriptions(options: ListSubscriptionsOptions) {
		const connection = await this.getConnection(options.userId)
		const tokens = await this.ensureValidTokens(connection)
		const arm = new ARMClient(tokens.access_token)
		const result = await arm.listSubscriptions()
		return result.value
	}

	/**
	 * List resource groups in a subscription
	 */
	async listResourceGroups(options: ListResourceGroupsOptions) {
		const connection = await this.getConnection(options.userId)
		const tokens = await this.ensureValidTokens(connection)
		const arm = new ARMClient(tokens.access_token)
		const result = await arm.listResourceGroups(options.subscriptionId)
		return result.value
	}

	/**
	 * List resources in a subscription or resource group
	 */
	async listResources(options: ListResourcesOptions) {
		const connection = await this.getConnection(options.userId)
		const tokens = await this.ensureValidTokens(connection)
		const arm = new ARMClient(tokens.access_token)

		if (options.resourceGroupName) {
			const result = await arm.listResourceGroupResources(options.subscriptionId, options.resourceGroupName)
			return result.value
		} else {
			const result = await arm.listResources(options.subscriptionId)
			return result.value
		}
	}

	/**
	 * Get user's email messages
	 */
	async getMail(options: GetMailOptions) {
		const connection = await this.getConnection(options.userId)
		const tokens = await this.ensureValidTokens(connection)
		const graph = new GraphClient(tokens.access_token)
		return await graph.getMessages({
			top: options.top || 10,
			skip: options.skip || 0,
			filter: options.filter,
			orderby: 'receivedDateTime desc',
		})
	}

	/**
	 * Get user's calendar events
	 */
	async getCalendarEvents(options: GetCalendarEventsOptions) {
		const connection = await this.getConnection(options.userId)
		const tokens = await this.ensureValidTokens(connection)
		const graph = new GraphClient(tokens.access_token)
		return await graph.getCalendarEvents({
			startDateTime: options.startDateTime,
			endDateTime: options.endDateTime,
			top: 50,
		})
	}

	// ========================================
	// Private Helper Methods
	// ========================================

	private getOAuthClient(): EntraOAuth {
		const config: AzureOAuthConfig = {
			clientId: this.env.AZURE_CLIENT_ID,
			clientSecret: this.env.AZURE_CLIENT_SECRET,
			tenantId: this.env.AZURE_TENANT_ID,
			redirectUri: this.env.AZURE_REDIRECT_URI || 'https://azure.do/callback',
			scopes: [
				'openid',
				'profile',
				'email',
				'offline_access',
				'User.Read',
				'Mail.Read',
				'Calendars.Read',
				'https://management.azure.com/user_impersonation',
			],
		}
		return new EntraOAuth(config)
	}

	private async getConnection(userId: string): Promise<AzureConnection> {
		const data = await this.env.AZURE_TOKENS.get(`user:${userId}`)
		if (!data) {
			throw new Error('Azure connection not found')
		}
		return JSON.parse(data)
	}

	private async ensureValidTokens(connection: AzureConnection) {
		// If token expires within 5 minutes, refresh it
		if (connection.tokens.expires_at < Date.now() + 5 * 60 * 1000) {
			if (!connection.tokens.refresh_token) {
				throw new Error('No refresh token available')
			}

			const oauth = this.getOAuthClient()
			const newTokens = await oauth.refreshAccessToken(connection.tokens.refresh_token, connection.tenantId)

			// Update connection
			connection.tokens = newTokens
			connection.updatedAt = Date.now()

			// Store updated connection
			await this.env.AZURE_TOKENS.put(`user:${connection.userId}`, JSON.stringify(connection), {
				expirationTtl: 90 * 24 * 60 * 60,
			})

			// Update database
			await this.env.DB.execute(
				`UPDATE oauth_connections
				 SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ?
				 WHERE user_id = ? AND provider = ?`,
				newTokens.access_token,
				newTokens.refresh_token || null,
				newTokens.expires_at,
				Date.now(),
				connection.userId,
				'azure'
			)
		}

		return connection.tokens
	}
}

// ========================================
// HTTP API
// ========================================

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

/**
 * Health check
 */
app.get('/health', (c) => {
	return c.json({
		status: 'ok',
		service: 'azure',
		timestamp: new Date().toISOString(),
	})
})

/**
 * Start OAuth flow
 */
app.get('/connect', async (c) => {
	const userId = c.req.query('user_id')
	const tenantId = c.req.query('tenant_id')

	if (!userId) {
		return c.json({ error: 'user_id required' }, 400)
	}

	const service = new AzureService(c.env.ctx, c.env)
	const oauth = (service as any).getOAuthClient()

	// Generate PKCE
	const { codeVerifier, codeChallenge } = await EntraOAuth.generatePKCE()

	// Store code verifier (expires in 10 minutes)
	const state = crypto.randomUUID()
	await c.env.AZURE_TOKENS.put(
		`state:${state}`,
		JSON.stringify({ userId, codeVerifier, tenantId }),
		{ expirationTtl: 600 }
	)

	// Get authorization URL
	const authUrl = oauth.getAuthorizationUrl({
		state,
		codeChallenge,
		tenantId,
	})

	return c.json({ auth_url: authUrl, state })
})

/**
 * OAuth callback
 */
app.get('/callback', async (c) => {
	const code = c.req.query('code')
	const state = c.req.query('state')
	const error = c.req.query('error')
	const errorDescription = c.req.query('error_description')

	if (error) {
		return c.html(`
			<h1>Authentication Failed</h1>
			<p>${errorDescription || error}</p>
		`)
	}

	if (!code || !state) {
		return c.json({ error: 'Missing code or state' }, 400)
	}

	// Get stored state
	const stateData = await c.env.AZURE_TOKENS.get(`state:${state}`)
	if (!stateData) {
		return c.json({ error: 'Invalid or expired state' }, 400)
	}

	const { userId, codeVerifier, tenantId } = JSON.parse(stateData)

	// Connect account
	const service = new AzureService(c.env.ctx, c.env)
	const result = await service.connect({
		userId,
		code,
		codeVerifier,
		tenantId,
		state,
	})

	// Delete state
	await c.env.AZURE_TOKENS.delete(`state:${state}`)

	if (!result.success) {
		return c.html(`
			<h1>Connection Failed</h1>
			<p>${result.error}</p>
		`)
	}

	return c.html(`
		<h1>Azure Connected!</h1>
		<p>Your Azure account has been successfully connected.</p>
		<p>You can close this window.</p>
	`)
})

/**
 * Get user info
 */
app.get('/user', async (c) => {
	const userId = c.req.query('user_id')
	if (!userId) {
		return c.json({ error: 'user_id required' }, 400)
	}

	const service = new AzureService(c.env.ctx, c.env)
	const user = await service.getUser({ userId })
	return c.json(user)
})

/**
 * List subscriptions
 */
app.get('/subscriptions', async (c) => {
	const userId = c.req.query('user_id')
	if (!userId) {
		return c.json({ error: 'user_id required' }, 400)
	}

	const service = new AzureService(c.env.ctx, c.env)
	const subscriptions = await service.listSubscriptions({ userId })
	return c.json({ subscriptions })
})

/**
 * List resource groups
 */
app.get('/subscriptions/:subscriptionId/resourceGroups', async (c) => {
	const userId = c.req.query('user_id')
	const subscriptionId = c.req.param('subscriptionId')

	if (!userId) {
		return c.json({ error: 'user_id required' }, 400)
	}

	const service = new AzureService(c.env.ctx, c.env)
	const resourceGroups = await service.listResourceGroups({ userId, subscriptionId })
	return c.json({ resourceGroups })
})

/**
 * List resources
 */
app.get('/subscriptions/:subscriptionId/resources', async (c) => {
	const userId = c.req.query('user_id')
	const subscriptionId = c.req.param('subscriptionId')
	const resourceGroupName = c.req.query('resource_group')

	if (!userId) {
		return c.json({ error: 'user_id required' }, 400)
	}

	const service = new AzureService(c.env.ctx, c.env)
	const resources = await service.listResources({
		userId,
		subscriptionId,
		resourceGroupName,
	})
	return c.json({ resources })
})

export default {
	fetch: app.fetch,
}
