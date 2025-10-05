/**
 * Deployment Management
 * Create and manage Vercel deployments
 */

import { VercelAPIClient } from './api'
import type {
	CreateDeploymentOptions,
	VercelDeployment,
	Env,
} from './types'

export async function createDeployment(
	env: Env,
	accessToken: string,
	options: CreateDeploymentOptions
): Promise<VercelDeployment> {
	const client = new VercelAPIClient(env, accessToken, options.teamId)

	// Validate required fields
	if (!options.name) {
		throw new Error('Deployment name is required')
	}

	if (!options.files && !options.gitSource) {
		throw new Error('Either files or gitSource must be provided')
	}

	// Build deployment payload
	const payload: any = {
		name: options.name,
		target: options.target || 'preview',
	}

	// Add files if provided
	if (options.files) {
		payload.files = options.files
	}

	// Add git source if provided
	if (options.gitSource) {
		payload.gitSource = options.gitSource
	}

	// Add project settings if provided
	if (options.projectSettings) {
		payload.projectSettings = options.projectSettings
	}

	// Add environment variables if provided
	if (options.env) {
		payload.env = options.env
	}

	// Add build environment variables if provided
	if (options.build?.env) {
		payload.build = { env: options.build.env }
	}

	// Add cache option if provided
	if (options.withCache !== undefined) {
		payload.withCache = options.withCache
	}

	// Create deployment
	const deployment = await client.createDeployment(payload)

	// Store deployment in database
	await storeDeployment(env, accessToken, deployment)

	return deployment
}

export async function getDeployment(
	env: Env,
	accessToken: string,
	deploymentId: string,
	teamId?: string
): Promise<VercelDeployment> {
	const client = new VercelAPIClient(env, accessToken, teamId)
	return client.getDeployment(deploymentId)
}

export async function listDeployments(
	env: Env,
	accessToken: string,
	options: {
		projectId?: string
		teamId?: string
		limit?: number
		since?: number
		until?: number
		state?: 'BUILDING' | 'ERROR' | 'READY' | 'QUEUED' | 'CANCELED'
	} = {}
): Promise<VercelDeployment[]> {
	const client = new VercelAPIClient(env, accessToken, options.teamId)

	const response = await client.listDeployments({
		projectId: options.projectId,
		limit: options.limit,
		since: options.since,
		until: options.until,
		state: options.state,
	})

	return response.deployments || []
}

export async function cancelDeployment(
	env: Env,
	accessToken: string,
	deploymentId: string,
	teamId?: string
): Promise<void> {
	const client = new VercelAPIClient(env, accessToken, teamId)
	await client.cancelDeployment(deploymentId)
}

/**
 * Store deployment in database for tracking
 */
async function storeDeployment(
	env: Env,
	accessToken: string,
	deployment: VercelDeployment
): Promise<void> {
	try {
		// Get connection to find userId
		const connection = await env.DB.prepare(
			`SELECT user_id FROM vercel_connections WHERE access_token = ?`
		)
			.bind(accessToken)
			.first()

		if (!connection) {
			console.warn('No connection found for access token')
			return
		}

		// Store deployment
		await env.DB.prepare(
			`INSERT INTO vercel_deployments (
				id, user_id, deployment_id, name, url, state,
				target, project_id, team_id, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
			.bind(
				crypto.randomUUID(),
				connection.user_id,
				deployment.id,
				deployment.name,
				deployment.url,
				deployment.state,
				deployment.target,
				deployment.projectId || null,
				deployment.meta?.teamId || null,
				deployment.createdAt
			)
			.run()
	} catch (error) {
		console.error('Failed to store deployment:', error)
		// Don't throw - deployment succeeded even if we can't track it
	}
}
