/**
 * Project Management
 * List and manage Vercel projects
 */

import { VercelAPIClient } from './api'
import type { VercelProject, Env } from './types'

export async function listProjects(
	env: Env,
	accessToken: string,
	options: {
		teamId?: string
		limit?: number
		since?: number
		until?: number
		search?: string
	} = {}
): Promise<VercelProject[]> {
	const client = new VercelAPIClient(env, accessToken, options.teamId)

	const response = await client.listProjects({
		limit: options.limit,
		since: options.since,
		until: options.until,
		search: options.search,
	})

	return response.projects || []
}

export async function getProject(
	env: Env,
	accessToken: string,
	projectIdOrName: string,
	teamId?: string
): Promise<VercelProject> {
	const client = new VercelAPIClient(env, accessToken, teamId)
	return client.getProject(projectIdOrName)
}

/**
 * Get user's Vercel teams
 */
export async function listTeams(
	env: Env,
	accessToken: string,
	options: {
		limit?: number
		since?: number
		until?: number
	} = {}
) {
	const client = new VercelAPIClient(env, accessToken)

	const response = await client.listTeams({
		limit: options.limit,
		since: options.since,
		until: options.until,
	})

	return response.teams || []
}

/**
 * Get current user info
 */
export async function getUser(env: Env, accessToken: string) {
	const client = new VercelAPIClient(env, accessToken)
	return client.getUser()
}
