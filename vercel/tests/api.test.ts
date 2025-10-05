/**
 * Tests for Vercel API Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VercelAPIClient } from '../src/api'
import type { Env } from '../src/types'

// Mock environment
const mockEnv: Env = {
	VERCEL_API_BASE: 'https://api.vercel.com',
	VERCEL_CLIENT_ID: 'test_client_id',
	VERCEL_CLIENT_SECRET: 'test_client_secret',
	DB: {} as any,
	AUTH: {} as any,
	ctx: {} as any,
}

describe('VercelAPIClient', () => {
	let client: VercelAPIClient
	const mockAccessToken = 'test_access_token'

	beforeEach(() => {
		client = new VercelAPIClient(mockEnv, mockAccessToken)
		// Reset fetch mock
		vi.restoreAllMocks()
	})

	describe('Authentication', () => {
		it('should include Bearer token in request headers', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ user: { id: 'user_123' } }),
			})
			global.fetch = mockFetch

			await client.getUser()

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/v2/user'),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Bearer ${mockAccessToken}`,
					}),
				})
			)
		})

		it('should include teamId in query params when provided', async () => {
			const teamId = 'team_123'
			const clientWithTeam = new VercelAPIClient(mockEnv, mockAccessToken, teamId)

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ projects: [] }),
			})
			global.fetch = mockFetch

			await clientWithTeam.listProjects()

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('teamId=team_123'),
				expect.any(Object)
			)
		})
	})

	describe('Error Handling', () => {
		it('should throw error on failed request', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				json: async () => ({
					error: {
						code: 'UNAUTHORIZED',
						message: 'Invalid token',
					},
				}),
			})
			global.fetch = mockFetch

			await expect(client.getUser()).rejects.toThrow('Invalid token')
		})

		it('should handle non-JSON error responses', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				json: async () => {
					throw new Error('Not JSON')
				},
			})
			global.fetch = mockFetch

			await expect(client.getUser()).rejects.toThrow('HTTP 500')
		})
	})

	describe('Code Exchange', () => {
		it('should exchange authorization code for access token', async () => {
			const code = 'auth_code_123'
			const redirectUri = 'https://admin.do/callback'

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					access_token: 'access_token_123',
					token_type: 'Bearer',
					user_id: 'user_123',
				}),
			})
			global.fetch = mockFetch

			const result = await VercelAPIClient.exchangeCode(mockEnv, code, redirectUri)

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/v2/oauth/access_token'),
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/x-www-form-urlencoded',
					}),
				})
			)

			expect(result.access_token).toBe('access_token_123')
		})
	})

	describe('API Methods', () => {
		beforeEach(() => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: true }),
			})
			global.fetch = mockFetch
		})

		it('should get user info', async () => {
			await client.getUser()
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v2/user'),
				expect.any(Object)
			)
		})

		it('should list teams', async () => {
			await client.listTeams()
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v2/teams'),
				expect.any(Object)
			)
		})

		it('should list projects', async () => {
			await client.listProjects()
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v9/projects'),
				expect.any(Object)
			)
		})

		it('should get project by ID', async () => {
			await client.getProject('prj_123')
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v9/projects/prj_123'),
				expect.any(Object)
			)
		})

		it('should create deployment', async () => {
			await client.createDeployment({ name: 'test-app' })
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v13/deployments'),
				expect.objectContaining({
					method: 'POST',
				})
			)
		})

		it('should get deployment', async () => {
			await client.getDeployment('dpl_123')
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v13/deployments/dpl_123'),
				expect.any(Object)
			)
		})

		it('should list deployments', async () => {
			await client.listDeployments()
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v6/deployments'),
				expect.any(Object)
			)
		})

		it('should cancel deployment', async () => {
			await client.cancelDeployment('dpl_123')
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v12/deployments/dpl_123/cancel'),
				expect.objectContaining({
					method: 'PATCH',
				})
			)
		})

		it('should list domains', async () => {
			await client.listDomains()
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v5/domains'),
				expect.any(Object)
			)
		})

		it('should add domain', async () => {
			await client.addDomain('example.com', 'prj_123')
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v10/projects/prj_123/domains'),
				expect.objectContaining({
					method: 'POST',
				})
			)
		})

		it('should remove domain', async () => {
			await client.removeDomain('example.com')
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('/v6/domains/example.com'),
				expect.objectContaining({
					method: 'DELETE',
				})
			)
		})
	})

	describe('Query Parameters', () => {
		it('should include limit in query params', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ projects: [] }),
			})
			global.fetch = mockFetch

			await client.listProjects({ limit: 10 })

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('limit=10'),
				expect.any(Object)
			)
		})

		it('should include multiple query params', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ deployments: [] }),
			})
			global.fetch = mockFetch

			await client.listDeployments({
				projectId: 'prj_123',
				limit: 10,
				state: 'READY',
			})

			const url = mockFetch.mock.calls[0][0]
			expect(url).toContain('projectId=prj_123')
			expect(url).toContain('limit=10')
			expect(url).toContain('state=READY')
		})
	})
})
