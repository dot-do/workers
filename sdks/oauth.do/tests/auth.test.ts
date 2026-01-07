import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getUser, login, logout } from '../src/auth.js'
import { configure } from '../src/config.js'

describe('auth', () => {
	beforeEach(() => {
		// Reset environment
		delete process.env.DO_TOKEN

		// Configure with mock fetch
		const mockFetch = vi.fn()
		configure({
			apiUrl: 'https://test.apis.do',
			fetch: mockFetch as any,
		})
	})

	describe('getUser()', () => {
		it('should return null user when no token provided', async () => {
			const result = await getUser()
			expect(result.user).toBeNull()
		})

		it('should call /me endpoint with token', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ id: '123', email: 'test@example.com' }),
			})

			configure({ fetch: mockFetch as any })

			const result = await getUser('test-token')

			expect(mockFetch).toHaveBeenCalledWith('https://test.apis.do/me', {
				method: 'GET',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'application/json',
				},
			})

			expect(result.user).toEqual({ id: '123', email: 'test@example.com' })
			expect(result.token).toBe('test-token')
		})

		it('should return null user on 401 response', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
			})

			configure({ fetch: mockFetch as any })

			const result = await getUser('invalid-token')

			expect(result.user).toBeNull()
		})
	})

	describe('login()', () => {
		it('should call /login endpoint with credentials', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					user: { id: '123', email: 'test@example.com' },
					token: 'new-token',
				}),
			})

			configure({ fetch: mockFetch as any })

			const result = await login({ email: 'test@example.com', password: 'password' })

			expect(mockFetch).toHaveBeenCalledWith('https://test.apis.do/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
			})

			expect(result.user).toEqual({ id: '123', email: 'test@example.com' })
			expect(result.token).toBe('new-token')
		})

		it('should throw error on failed login', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				statusText: 'Unauthorized',
			})

			configure({ fetch: mockFetch as any })

			await expect(login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow()
		})
	})

	describe('logout()', () => {
		it('should call /logout endpoint with token', async () => {
			const mockFetch = vi.fn().mockResolvedValue({ ok: true })

			configure({ fetch: mockFetch as any })

			await logout('test-token')

			expect(mockFetch).toHaveBeenCalledWith('https://test.apis.do/logout', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer test-token',
					'Content-Type': 'application/json',
				},
			})
		})

		it('should not throw on logout errors', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				statusText: 'Server Error',
			})

			configure({ fetch: mockFetch as any })

			await expect(logout('test-token')).resolves.toBeUndefined()
		})
	})
})
