/**
 * Vercel Integration Worker
 * OAuth integration and deployment service for Vercel platform
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { VercelAPIClient } from './api'
import {
	createDeployment,
	getDeployment,
	listDeployments,
	cancelDeployment,
} from './deployments'
import { listProjects, getProject, listTeams, getUser } from './projects'
import type {
	Env,
	ConnectInput,
	ConnectResponse,
	VercelConnection,
	DeploymentInput,
	ListProjectsInput,
	GetDeploymentInput,
	ListDeploymentsInput,
	VercelDeployment,
	VercelProject,
} from './types'

/**
 * RPC Interface
 * Service-to-service communication via WorkerEntrypoint
 */
export class VercelService extends WorkerEntrypoint<Env> {
	/**
	 * Connect user's Vercel account via OAuth
	 */
	async connect(input: ConnectInput): Promise<ConnectResponse> {
		try {
			const { userId, code } = input

			// Exchange code for access token
			const tokenResponse = await VercelAPIClient.exchangeCode(
				this.env,
				code,
				'https://admin.do/api/auth/callback/vercel' // TODO: Make configurable
			)

			// Get user info from Vercel
			const client = new VercelAPIClient(
				this.env,
				tokenResponse.access_token,
				tokenResponse.team_id
			)
			const vercelUser = await client.getUser()

			// Store connection in database
			const connection: VercelConnection = {
				userId,
				accessToken: tokenResponse.access_token,
				vercelUserId: vercelUser.user.id,
				teamId: tokenResponse.team_id,
				connectedAt: Date.now(),
				lastUsedAt: Date.now(),
			}

			await this.storeConnection(connection)

			return {
				success: true,
				connection,
			}
		} catch (error) {
			console.error('Failed to connect Vercel account:', error)
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	}

	/**
	 * Disconnect user's Vercel account
	 */
	async disconnect(userId: string): Promise<boolean> {
		try {
			await this.env.DB.prepare(
				`DELETE FROM vercel_connections WHERE user_id = ?`
			)
				.bind(userId)
				.run()
			return true
		} catch (error) {
			console.error('Failed to disconnect Vercel account:', error)
			return false
		}
	}

	/**
	 * Get user's Vercel connection
	 */
	async getConnection(userId: string): Promise<VercelConnection | null> {
		try {
			const result = await this.env.DB.prepare(
				`SELECT * FROM vercel_connections WHERE user_id = ?`
			)
				.bind(userId)
				.first()

			if (!result) return null

			return {
				userId: result.user_id,
				accessToken: result.access_token,
				vercelUserId: result.vercel_user_id,
				teamId: result.team_id || undefined,
				connectedAt: result.connected_at,
				lastUsedAt: result.last_used_at,
			}
		} catch (error) {
			console.error('Failed to get connection:', error)
			return null
		}
	}

	/**
	 * Create a deployment
	 */
	async deploy(input: DeploymentInput): Promise<VercelDeployment> {
		const connection = await this.getConnection(input.userId)
		if (!connection) {
			throw new Error('Vercel account not connected')
		}

		// Update last used timestamp
		await this.updateLastUsed(input.userId)

		return createDeployment(this.env, connection.accessToken, input.options)
	}

	/**
	 * Get deployment status
	 */
	async getDeploymentStatus(input: GetDeploymentInput): Promise<VercelDeployment> {
		const connection = await this.getConnection(input.userId)
		if (!connection) {
			throw new Error('Vercel account not connected')
		}

		await this.updateLastUsed(input.userId)

		return getDeployment(
			this.env,
			connection.accessToken,
			input.deploymentId,
			input.teamId
		)
	}

	/**
	 * List user's projects
	 */
	async listProjects(input: ListProjectsInput): Promise<VercelProject[]> {
		const connection = await this.getConnection(input.userId)
		if (!connection) {
			throw new Error('Vercel account not connected')
		}

		await this.updateLastUsed(input.userId)

		return listProjects(this.env, connection.accessToken, {
			teamId: input.teamId,
			limit: input.limit,
			since: input.since,
			until: input.until,
		})
	}

	/**
	 * Get project details
	 */
	async getProject(
		userId: string,
		projectIdOrName: string,
		teamId?: string
	): Promise<VercelProject> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('Vercel account not connected')
		}

		await this.updateLastUsed(userId)

		return getProject(this.env, connection.accessToken, projectIdOrName, teamId)
	}

	/**
	 * List deployments
	 */
	async listDeployments(input: ListDeploymentsInput): Promise<VercelDeployment[]> {
		const connection = await this.getConnection(input.userId)
		if (!connection) {
			throw new Error('Vercel account not connected')
		}

		await this.updateLastUsed(input.userId)

		return listDeployments(this.env, connection.accessToken, {
			projectId: input.projectId,
			teamId: input.teamId,
			limit: input.limit,
			since: input.since,
			until: input.until,
			state: input.state,
		})
	}

	/**
	 * Cancel a deployment
	 */
	async cancelDeployment(
		userId: string,
		deploymentId: string,
		teamId?: string
	): Promise<void> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('Vercel account not connected')
		}

		await this.updateLastUsed(userId)

		return cancelDeployment(
			this.env,
			connection.accessToken,
			deploymentId,
			teamId
		)
	}

	/**
	 * List user's teams
	 */
	async listTeams(userId: string): Promise<any[]> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('Vercel account not connected')
		}

		await this.updateLastUsed(userId)

		return listTeams(this.env, connection.accessToken)
	}

	/**
	 * Get current user info
	 */
	async getUser(userId: string): Promise<any> {
		const connection = await this.getConnection(userId)
		if (!connection) {
			throw new Error('Vercel account not connected')
		}

		await this.updateLastUsed(userId)

		return getUser(this.env, connection.accessToken)
	}

	// Private helper methods

	private async storeConnection(connection: VercelConnection): Promise<void> {
		await this.env.DB.prepare(
			`INSERT OR REPLACE INTO vercel_connections (
				user_id, access_token, vercel_user_id, team_id,
				connected_at, last_used_at
			) VALUES (?, ?, ?, ?, ?, ?)`
		)
			.bind(
				connection.userId,
				connection.accessToken,
				connection.vercelUserId,
				connection.teamId || null,
				connection.connectedAt,
				connection.lastUsedAt
			)
			.run()
	}

	private async updateLastUsed(userId: string): Promise<void> {
		await this.env.DB.prepare(
			`UPDATE vercel_connections SET last_used_at = ? WHERE user_id = ?`
		)
			.bind(Date.now(), userId)
			.run()
	}
}

/**
 * HTTP API
 * External requests via Hono routes
 */
const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('*', cors())

// Health check
app.get('/health', (c) => {
	return c.json({ status: 'ok', service: 'vercel' })
})

// Authentication middleware
const requireAuth = async (c: any, next: any) => {
	const authHeader = c.req.header('Authorization')
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const token = authHeader.substring(7)

	// Validate token via AUTH service
	try {
		const user = await c.env.AUTH.validateToken(token)
		if (!user) {
			return c.json({ error: 'Invalid token' }, 401)
		}
		c.set('userId', user.id)
		await next()
	} catch (error) {
		return c.json({ error: 'Authentication failed' }, 401)
	}
}

// OAuth callback endpoint
app.get('/callback', async (c) => {
	const code = c.req.query('code')
	const state = c.req.query('state')

	if (!code) {
		return c.json({ error: 'Missing code parameter' }, 400)
	}

	// TODO: Validate state parameter for CSRF protection

	// Redirect to admin with code
	return c.redirect(`https://admin.do/integrations/vercel?code=${code}`)
})

// Connect Vercel account
app.post('/connect', requireAuth, async (c) => {
	const userId = c.get('userId')
	const { code } = await c.req.json()

	if (!code) {
		return c.json({ error: 'Missing code parameter' }, 400)
	}

	const service = new VercelService(c.env.ctx, c.env)
	const result = await service.connect({ userId, code })

	if (!result.success) {
		return c.json({ error: result.error }, 400)
	}

	return c.json(result.connection)
})

// Disconnect Vercel account
app.post('/disconnect', requireAuth, async (c) => {
	const userId = c.get('userId')
	const service = new VercelService(c.env.ctx, c.env)
	const success = await service.disconnect(userId)

	return c.json({ success })
})

// Get connection status
app.get('/connection', requireAuth, async (c) => {
	const userId = c.get('userId')
	const service = new VercelService(c.env.ctx, c.env)
	const connection = await service.getConnection(userId)

	if (!connection) {
		return c.json({ connected: false })
	}

	return c.json({
		connected: true,
		vercelUserId: connection.vercelUserId,
		teamId: connection.teamId,
		connectedAt: connection.connectedAt,
		lastUsedAt: connection.lastUsedAt,
	})
})

// Create deployment
app.post('/deploy', requireAuth, async (c) => {
	const userId = c.get('userId')
	const options = await c.req.json()

	const service = new VercelService(c.env.ctx, c.env)

	try {
		const deployment = await service.deploy({ userId, options })
		return c.json(deployment)
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : 'Deployment failed' },
			500
		)
	}
})

// Get deployment
app.get('/deployments/:id', requireAuth, async (c) => {
	const userId = c.get('userId')
	const deploymentId = c.req.param('id')
	const teamId = c.req.query('teamId')

	const service = new VercelService(c.env.ctx, c.env)

	try {
		const deployment = await service.getDeploymentStatus({
			userId,
			deploymentId,
			teamId,
		})
		return c.json(deployment)
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : 'Failed to get deployment' },
			500
		)
	}
})

// List deployments
app.get('/deployments', requireAuth, async (c) => {
	const userId = c.get('userId')
	const projectId = c.req.query('projectId')
	const teamId = c.req.query('teamId')
	const limit = c.req.query('limit')
	const state = c.req.query('state') as any

	const service = new VercelService(c.env.ctx, c.env)

	try {
		const deployments = await service.listDeployments({
			userId,
			projectId,
			teamId,
			limit: limit ? parseInt(limit) : undefined,
			state,
		})
		return c.json(deployments)
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : 'Failed to list deployments' },
			500
		)
	}
})

// Cancel deployment
app.post('/deployments/:id/cancel', requireAuth, async (c) => {
	const userId = c.get('userId')
	const deploymentId = c.req.param('id')
	const teamId = c.req.query('teamId')

	const service = new VercelService(c.env.ctx, c.env)

	try {
		await service.cancelDeployment(userId, deploymentId, teamId)
		return c.json({ success: true })
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : 'Failed to cancel deployment' },
			500
		)
	}
})

// List projects
app.get('/projects', requireAuth, async (c) => {
	const userId = c.get('userId')
	const teamId = c.req.query('teamId')
	const limit = c.req.query('limit')

	const service = new VercelService(c.env.ctx, c.env)

	try {
		const projects = await service.listProjects({
			userId,
			teamId,
			limit: limit ? parseInt(limit) : undefined,
		})
		return c.json(projects)
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : 'Failed to list projects' },
			500
		)
	}
})

// Get project
app.get('/projects/:idOrName', requireAuth, async (c) => {
	const userId = c.get('userId')
	const projectIdOrName = c.req.param('idOrName')
	const teamId = c.req.query('teamId')

	const service = new VercelService(c.env.ctx, c.env)

	try {
		const project = await service.getProject(userId, projectIdOrName, teamId)
		return c.json(project)
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : 'Failed to get project' },
			500
		)
	}
})

// List teams
app.get('/teams', requireAuth, async (c) => {
	const userId = c.get('userId')
	const service = new VercelService(c.env.ctx, c.env)

	try {
		const teams = await service.listTeams(userId)
		return c.json(teams)
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : 'Failed to list teams' },
			500
		)
	}
})

// Get user
app.get('/user', requireAuth, async (c) => {
	const userId = c.get('userId')
	const service = new VercelService(c.env.ctx, c.env)

	try {
		const user = await service.getUser(userId)
		return c.json(user)
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : 'Failed to get user' },
			500
		)
	}
})

export default {
	fetch: app.fetch,
}
