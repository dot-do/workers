/**
 * Deployment operations for Netlify
 *
 * Handles creating, monitoring, and managing deployments.
 */

import { NetlifyApiClient } from './api'
import type { NetlifyDeployment, DeployOptions, DeployResponse } from './types'

/**
 * Deploy site with files
 */
export async function deploySite(
	accessToken: string,
	options: DeployOptions
): Promise<DeployResponse> {
	const client = new NetlifyApiClient(accessToken)

	try {
		// Create deployment
		const deployment = await client.createDeploy(options.siteId, options.files || {}, {
			draft: options.draft,
			title: options.title,
			branch: options.branch,
		})

		return {
			success: true,
			deployment,
			siteId: options.siteId,
			deployId: deployment.id,
		}
	} catch (error) {
		throw new Error(`Deployment failed: ${error instanceof Error ? error.message : String(error)}`)
	}
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(
	accessToken: string,
	siteId: string,
	deployId: string
): Promise<NetlifyDeployment> {
	const client = new NetlifyApiClient(accessToken)
	return await client.getDeployment(siteId, deployId)
}

/**
 * Wait for deployment to complete
 */
export async function waitForDeployment(
	accessToken: string,
	siteId: string,
	deployId: string,
	maxWaitMs = 300000, // 5 minutes
	pollIntervalMs = 5000 // 5 seconds
): Promise<NetlifyDeployment> {
	const client = new NetlifyApiClient(accessToken)
	const startTime = Date.now()

	while (Date.now() - startTime < maxWaitMs) {
		const deployment = await client.getDeployment(siteId, deployId)

		// Check if deployment is complete
		if (deployment.state === 'ready') {
			return deployment
		}

		// Check if deployment failed
		if (deployment.state === 'error') {
			throw new Error(`Deployment failed: ${deployment.error_message || 'Unknown error'}`)
		}

		// Wait before polling again
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
	}

	throw new Error('Deployment timeout: exceeded maximum wait time')
}

/**
 * Cancel ongoing deployment
 */
export async function cancelDeployment(accessToken: string, deployId: string): Promise<void> {
	const client = new NetlifyApiClient(accessToken)
	await client.cancelDeploy(deployId)
}

/**
 * Restore previous deployment
 */
export async function restoreDeployment(
	accessToken: string,
	siteId: string,
	deployId: string
): Promise<NetlifyDeployment> {
	const client = new NetlifyApiClient(accessToken)
	return await client.restoreDeploy(siteId, deployId)
}

/**
 * List recent deployments
 */
export async function listRecentDeployments(
	accessToken: string,
	siteId: string,
	limit = 10
): Promise<NetlifyDeployment[]> {
	const client = new NetlifyApiClient(accessToken)
	const deployments = await client.listDeploys(siteId, 1, limit)
	return deployments.slice(0, limit)
}
