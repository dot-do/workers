/**
 * Test Worker - Validates DO Worker Outbound Handler
 *
 * This worker tests the DO worker's code execution engine with outbound handler.
 * It calls the /execute endpoint with various test scenarios.
 */

interface Env {
	DO: Fetcher
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url)

		// Health check
		if (url.pathname === '/health') {
			return Response.json({
				status: 'ok',
				service: 'test',
				tests: [
					'GET /test/basic - Basic code execution',
					'GET /test/internal-fetch - Test internal service call',
					'GET /test/external-fetch - Test external API call',
					'GET /test/context - Test context availability',
					'GET /test/all - Run all tests'
				]
			})
		}

		// Test 1: Basic code execution
		if (url.pathname === '/test/basic') {
			const result = await env.DO.fetch('https://do.drivly.workers.dev/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code: 'return 2 + 2',
					timeout: 5000
				})
			})

			const data = await result.json()
			return Response.json({
				test: 'basic',
				passed: data.success && data.result === 4,
				result: data
			})
		}

		// Test 2: Internal service call (outbound handler should intercept)
		if (url.pathname === '/test/internal-fetch') {
			const result = await env.DO.fetch('https://do.drivly.workers.dev/execute', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer test-token'
				},
				body: JSON.stringify({
					code: `
						// This fetch should be intercepted by outbound handler
						const response = await fetch('http://db/health')
						const data = await response.json()
						return {
							intercepted: true,
							dbHealth: data
						}
					`,
					timeout: 10000,
					captureFetch: true
				})
			})

			const data = await result.json()
			return Response.json({
				test: 'internal-fetch',
				passed: data.success && data.result?.intercepted === true,
				result: data,
				note: 'Should show request to http://db/health in logs'
			})
		}

		// Test 3: External service call (should pass through)
		if (url.pathname === '/test/external-fetch') {
			const result = await env.DO.fetch('https://do.drivly.workers.dev/execute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code: `
						// This fetch should pass through to external API
						const response = await fetch('https://api.github.com/zen')
						const text = await response.text()
						return {
							external: true,
							zen: text
						}
					`,
					timeout: 10000,
					captureFetch: true
				})
			})

			const data = await result.json()
			return Response.json({
				test: 'external-fetch',
				passed: data.success && data.result?.external === true,
				result: data,
				note: 'Should show request to https://api.github.com/zen in logs'
			})
		}

		// Test 4: Context availability
		if (url.pathname === '/test/context') {
			const result = await env.DO.fetch('https://do.drivly.workers.dev/execute', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer test-token'
				},
				body: JSON.stringify({
					code: `
						// Check if context is available
						return {
							hasContext: typeof env.__context !== 'undefined',
							context: env.__context,
							hasDO: typeof env.DO !== 'undefined',
							hasLogRequest: typeof env.__logRequest !== 'undefined'
						}
					`,
					timeout: 5000
				})
			})

			const data = await result.json()
			return Response.json({
				test: 'context',
				passed: data.success && data.result?.hasContext === true,
				result: data,
				note: 'User code should have access to __context, DO binding, and __logRequest'
			})
		}

		// Test 5: Run all tests
		if (url.pathname === '/test/all') {
			const tests = await Promise.all([
				fetch(`${url.origin}/test/basic`).then(r => r.json()),
				fetch(`${url.origin}/test/internal-fetch`).then(r => r.json()),
				fetch(`${url.origin}/test/external-fetch`).then(r => r.json()),
				fetch(`${url.origin}/test/context`).then(r => r.json())
			])

			const allPassed = tests.every(t => t.passed)

			return Response.json({
				summary: {
					total: tests.length,
					passed: tests.filter(t => t.passed).length,
					failed: tests.filter(t => !t.passed).length,
					allPassed
				},
				tests
			})
		}

		// Default response
		return Response.json({
			message: 'Test Worker for DO Outbound Handler',
			endpoints: {
				'GET /health': 'Health check',
				'GET /test/basic': 'Test basic code execution',
				'GET /test/internal-fetch': 'Test internal service call interception',
				'GET /test/external-fetch': 'Test external API pass-through',
				'GET /test/context': 'Test context availability',
				'GET /test/all': 'Run all tests'
			}
		})
	},
} satisfies ExportedHandler<Env>
