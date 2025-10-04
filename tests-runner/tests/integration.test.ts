import { describe, it, expect, beforeAll } from 'vitest'
import { env, SELF } from 'cloudflare:test'

/**
 * Tests Runner Integration Tests
 * Tests the tests-runner worker's ability to test all services via remote bindings
 */
describe('Tests Runner - Integration', () => {
	let workerUrl: string

	beforeAll(() => {
		// Use SELF fetcher for worker requests
		workerUrl = 'http://tests-runner'
	})

	describe('Health Check', () => {
		it('should return health check with service info', async () => {
			const response = await SELF.fetch(`${workerUrl}/health`)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.status).toBe('ok')
			expect(data.service).toBe('tests-runner')
			expect(data.services).toEqual(['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp', 'queue'])
			expect(data.endpoints).toBeDefined()
		})
	})

	describe('Individual Service Tests', () => {
		it('should test gateway service', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/gateway`)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.test).toBe('gateway')
			expect(data.duration).toBeGreaterThanOrEqual(0)
			expect(typeof data.passed).toBe('boolean')
		})

		it('should test db service', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/db`)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.test).toBe('db')
			expect(data.duration).toBeGreaterThanOrEqual(0)
			expect(typeof data.passed).toBe('boolean')
		})

		it('should test auth service', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/auth`)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.test).toBe('auth')
			expect(data.duration).toBeGreaterThanOrEqual(0)
			expect(typeof data.passed).toBe('boolean')
		})

		it('should test schedule service', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/schedule`)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.test).toBe('schedule')
			expect(data.duration).toBeGreaterThanOrEqual(0)
			expect(typeof data.passed).toBe('boolean')
		})

		it('should test webhooks service', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/webhooks`)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.test).toBe('webhooks')
			expect(data.duration).toBeGreaterThanOrEqual(0)
			expect(typeof data.passed).toBe('boolean')
		})

		it('should test email service', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/email`)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.test).toBe('email')
			expect(data.duration).toBeGreaterThanOrEqual(0)
			expect(typeof data.passed).toBe('boolean')
		})

		it('should test mcp service', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/mcp`)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.test).toBe('mcp')
			expect(data.duration).toBeGreaterThanOrEqual(0)
			expect(typeof data.passed).toBe('boolean')
		})

		it('should test queue service', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/queue`)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data.test).toBe('queue')
			expect(data.duration).toBeGreaterThanOrEqual(0)
			expect(typeof data.passed).toBe('boolean')
		})
	})

	describe('All Services Test', () => {
		it('should run all tests in parallel', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/all`)
			expect(response.status).toBe(200)

			const data = await response.json()

			// Verify summary
			expect(data.summary).toBeDefined()
			expect(data.summary.total).toBe(8)
			expect(typeof data.summary.passed).toBe('number')
			expect(typeof data.summary.failed).toBe('number')
			expect(data.summary.passed + data.summary.failed).toBe(8)
			expect(typeof data.summary.allPassed).toBe('boolean')
			expect(data.summary.duration).toBeGreaterThanOrEqual(0)

			// Verify all tests are present
			expect(data.tests).toBeDefined()
			expect(data.tests.length).toBe(8)

			const services = ['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp', 'queue']
			services.forEach(service => {
				const test = data.tests.find((t: any) => t.test === service)
				expect(test).toBeDefined()
				expect(typeof test.passed).toBe('boolean')
				expect(test.duration).toBeGreaterThanOrEqual(0)
			})
		})

		it('should complete all tests within reasonable time', async () => {
			const startTime = Date.now()
			const response = await SELF.fetch(`${workerUrl}/test/all`)
			const duration = Date.now() - startTime

			expect(response.status).toBe(200)
			// All tests in parallel should complete under 5 seconds
			expect(duration).toBeLessThan(5000)

			const data = await response.json()
			expect(data.summary.duration).toBeLessThan(5000)
		})
	})

	describe('Error Handling', () => {
		it('should return 404 for unknown endpoints', async () => {
			const response = await SELF.fetch(`${workerUrl}/unknown`)
			expect(response.status).toBe(404)

			const data = await response.json()
			expect(data.error).toBe('Not Found')
		})

		it('should handle test failures gracefully', async () => {
			// Even if a service fails, the test endpoint should return 200 with passed: false
			const response = await SELF.fetch(`${workerUrl}/test/gateway`)
			expect(response.status).toBe(200)

			const data = await response.json()
			expect(data).toHaveProperty('test')
			expect(data).toHaveProperty('passed')
			expect(data).toHaveProperty('duration')
		})
	})

	describe('Response Format', () => {
		it('should return consistent test result format', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/gateway`)
			const data = await response.json()

			// Required fields
			expect(data.test).toBeDefined()
			expect(typeof data.test).toBe('string')
			expect(typeof data.passed).toBe('boolean')
			expect(typeof data.duration).toBe('number')

			// Optional fields
			if (data.passed) {
				expect(data.result).toBeDefined()
			} else {
				expect(data.error).toBeDefined()
			}
		})

		it('should return consistent summary format for all tests', async () => {
			const response = await SELF.fetch(`${workerUrl}/test/all`)
			const data = await response.json()

			// Summary structure
			expect(data.summary).toBeDefined()
			expect(typeof data.summary.total).toBe('number')
			expect(typeof data.summary.passed).toBe('number')
			expect(typeof data.summary.failed).toBe('number')
			expect(typeof data.summary.allPassed).toBe('boolean')
			expect(typeof data.summary.duration).toBe('number')

			// Tests array
			expect(Array.isArray(data.tests)).toBe(true)
			expect(data.tests.length).toBe(data.summary.total)
		})
	})
})
