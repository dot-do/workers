import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
	startGitHubDeviceFlow,
	pollGitHubDeviceFlow,
	getGitHubUser,
} from '../src/github-device.js'

describe('GitHub Device Flow', () => {
	const mockClientId = 'Ov23liABCDEFGHIJKLMN'
	const mockDeviceCode = 'device_code_123'
	const mockUserCode = 'ABCD-1234'
	const mockAccessToken = 'gho_16C7e42F292c6912E7710c838347Ae178B4a'

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('startGitHubDeviceFlow()', () => {
		it('should initiate device flow with correct parameters', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					device_code: mockDeviceCode,
					user_code: mockUserCode,
					verification_uri: 'https://github.com/login/device',
					expires_in: 900,
					interval: 5,
				}),
			})

			const result = await startGitHubDeviceFlow({
				clientId: mockClientId,
				fetch: mockFetch as any,
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'https://github.com/login/device/code',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept': 'application/json',
					},
					body: expect.any(URLSearchParams),
				}
			)

			const callBody = mockFetch.mock.calls[0][1].body as URLSearchParams
			expect(callBody.get('client_id')).toBe(mockClientId)
			expect(callBody.get('scope')).toBe('user:email read:user')

			expect(result).toEqual({
				deviceCode: mockDeviceCode,
				userCode: mockUserCode,
				verificationUri: 'https://github.com/login/device',
				expiresIn: 900,
				interval: 5,
			})
		})

		it('should use custom scope when provided', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					device_code: mockDeviceCode,
					user_code: mockUserCode,
					verification_uri: 'https://github.com/login/device',
					expires_in: 900,
					interval: 5,
				}),
			})

			await startGitHubDeviceFlow({
				clientId: mockClientId,
				scope: 'repo read:org',
				fetch: mockFetch as any,
			})

			const callBody = mockFetch.mock.calls[0][1].body as URLSearchParams
			expect(callBody.get('scope')).toBe('repo read:org')
		})

		it('should throw error when client ID is missing', async () => {
			await expect(
				startGitHubDeviceFlow({ clientId: '' })
			).rejects.toThrow('GitHub client ID is required')
		})

		it('should throw error on failed request', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				statusText: 'Bad Request',
				text: async () => 'Invalid client_id',
			})

			await expect(
				startGitHubDeviceFlow({
					clientId: mockClientId,
					fetch: mockFetch as any,
				})
			).rejects.toThrow('GitHub device authorization failed')
		})
	})

	describe('pollGitHubDeviceFlow()', () => {
		it('should return access token on successful authorization', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					access_token: mockAccessToken,
					token_type: 'bearer',
					scope: 'user:email read:user',
				}),
			})

			const result = await pollGitHubDeviceFlow(mockDeviceCode, {
				clientId: mockClientId,
				interval: 0.1, // Fast polling for tests
				fetch: mockFetch as any,
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'https://github.com/login/oauth/access_token',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept': 'application/json',
					},
					body: expect.any(URLSearchParams),
				}
			)

			const callBody = mockFetch.mock.calls[0][1].body as URLSearchParams
			expect(callBody.get('client_id')).toBe(mockClientId)
			expect(callBody.get('device_code')).toBe(mockDeviceCode)
			expect(callBody.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:device_code')

			expect(result).toEqual({
				accessToken: mockAccessToken,
				tokenType: 'bearer',
				scope: 'user:email read:user',
			})
		})

		it('should handle authorization_pending and continue polling', async () => {
			let callCount = 0
			const mockFetch = vi.fn().mockImplementation(async () => {
				callCount++
				if (callCount < 3) {
					return {
						ok: true,
						json: async () => ({
							error: 'authorization_pending',
						}),
					}
				}
				return {
					ok: true,
					json: async () => ({
						access_token: mockAccessToken,
						token_type: 'bearer',
						scope: 'user:email',
					}),
				}
			})

			const result = await pollGitHubDeviceFlow(mockDeviceCode, {
				clientId: mockClientId,
				interval: 0.1,
				fetch: mockFetch as any,
			})

			expect(mockFetch).toHaveBeenCalledTimes(3)
			expect(result.accessToken).toBe(mockAccessToken)
		})

		it('should handle slow_down by increasing interval', async () => {
			let callCount = 0
			const mockFetch = vi.fn().mockImplementation(async () => {
				callCount++
				if (callCount === 1) {
					return {
						ok: true,
						json: async () => ({
							error: 'slow_down',
						}),
					}
				}
				return {
					ok: true,
					json: async () => ({
						access_token: mockAccessToken,
						token_type: 'bearer',
						scope: 'user:email',
					}),
				}
			})

			const result = await pollGitHubDeviceFlow(mockDeviceCode, {
				clientId: mockClientId,
				interval: 0.05, // Start with very small interval
				fetch: mockFetch as any,
			})

			expect(result.accessToken).toBe(mockAccessToken)
			expect(mockFetch).toHaveBeenCalledTimes(2)
		}, 10000) // Increase timeout as slow_down adds 5 seconds to interval

		it('should throw error on access_denied', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					error: 'access_denied',
				}),
			})

			await expect(
				pollGitHubDeviceFlow(mockDeviceCode, {
					clientId: mockClientId,
					interval: 0.1,
					fetch: mockFetch as any,
				})
			).rejects.toThrow('Access denied by user')
		})

		it('should throw error on expired_token', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					error: 'expired_token',
				}),
			})

			await expect(
				pollGitHubDeviceFlow(mockDeviceCode, {
					clientId: mockClientId,
					interval: 0.1,
					fetch: mockFetch as any,
				})
			).rejects.toThrow('Device code expired')
		})

		it('should throw error when polling timeout expires', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					error: 'authorization_pending',
				}),
			})

			await expect(
				pollGitHubDeviceFlow(mockDeviceCode, {
					clientId: mockClientId,
					interval: 0.1,
					expiresIn: 0.2, // Very short timeout for test
					fetch: mockFetch as any,
				})
			).rejects.toThrow('GitHub device authorization expired')
		}, 10000) // Increase test timeout

		it('should throw error when client ID is missing', async () => {
			await expect(
				pollGitHubDeviceFlow(mockDeviceCode, {
					clientId: '',
				})
			).rejects.toThrow('GitHub client ID is required')
		})
	})

	describe('getGitHubUser()', () => {
		it('should fetch user profile with access token', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					id: 123456,
					login: 'octocat',
					email: 'octocat@github.com',
					name: 'The Octocat',
					avatar_url: 'https://avatars.githubusercontent.com/u/583231',
				}),
			})

			const result = await getGitHubUser(mockAccessToken, {
				fetch: mockFetch as any,
			})

			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.github.com/user',
				{
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${mockAccessToken}`,
						'Accept': 'application/vnd.github+json',
						'X-GitHub-Api-Version': '2022-11-28',
					},
				}
			)

			expect(result).toEqual({
				id: 123456,
				login: 'octocat',
				email: 'octocat@github.com',
				name: 'The Octocat',
				avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
			})
		})

		it('should handle user with null email and name', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					id: 789012,
					login: 'privateuser',
					email: null,
					name: null,
					avatar_url: 'https://avatars.githubusercontent.com/u/789012',
				}),
			})

			const result = await getGitHubUser(mockAccessToken, {
				fetch: mockFetch as any,
			})

			expect(result).toEqual({
				id: 789012,
				login: 'privateuser',
				email: null,
				name: null,
				avatarUrl: 'https://avatars.githubusercontent.com/u/789012',
			})
		})

		it('should throw error when access token is missing', async () => {
			await expect(getGitHubUser('')).rejects.toThrow(
				'GitHub access token is required'
			)
		})

		it('should throw error on failed request', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				statusText: 'Unauthorized',
				text: async () => 'Bad credentials',
			})

			await expect(
				getGitHubUser(mockAccessToken, {
					fetch: mockFetch as any,
				})
			).rejects.toThrow('GitHub user fetch failed')
		})

		it('should return numeric id for sqid generation', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					id: 42,
					login: 'user42',
					email: 'user42@example.com',
					name: 'User 42',
					avatar_url: 'https://avatars.githubusercontent.com/u/42',
				}),
			})

			const result = await getGitHubUser(mockAccessToken, {
				fetch: mockFetch as any,
			})

			// Verify id is a number, not a string
			expect(typeof result.id).toBe('number')
			expect(result.id).toBe(42)
		})
	})
})
