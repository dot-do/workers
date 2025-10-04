/**
 * Tests Runner Worker - Tests All Services via Remote Bindings
 *
 * Provides HTTP endpoints to trigger comprehensive tests of all core services
 * using service bindings (RPC) to validate integrations.
 */

interface Env {
	GATEWAY_SERVICE: Fetcher
	DB_SERVICE: Fetcher
	AUTH_SERVICE: Fetcher
	SCHEDULE_SERVICE: Fetcher
	WEBHOOKS_SERVICE: Fetcher
	EMAIL_SERVICE: Fetcher
	MCP_SERVICE: Fetcher
	QUEUE_SERVICE: Fetcher
}

interface TestResult {
	test: string
	passed: boolean
	duration: number
	result?: any
	error?: string
	note?: string
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url)

		// Health check
		if (url.pathname === '/health') {
			return Response.json({
				status: 'ok',
				service: 'tests-runner',
				services: ['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp', 'queue'],
				endpoints: {
					'GET /health': 'Health check',
					'GET /test/gateway': 'Test gateway service',
					'GET /test/db': 'Test database service',
					'GET /test/auth': 'Test auth service',
					'GET /test/schedule': 'Test schedule service',
					'GET /test/webhooks': 'Test webhooks service',
					'GET /test/email': 'Test email service',
					'GET /test/mcp': 'Test MCP service',
					'GET /test/queue': 'Test queue service',
					'GET /test/all': 'Run all tests',
				},
			})
		}

		// Test gateway service
		if (url.pathname === '/test/gateway') {
			return runTest('gateway', async () => {
				// Test 1: Health check
				const healthResponse = await env.GATEWAY_SERVICE.fetch('http://gateway/health')
				const healthData = await healthResponse.json()

				// Test 2: Root endpoint
				const rootResponse = await env.GATEWAY_SERVICE.fetch('http://gateway/')
				const rootData = await rootResponse.json()

				return {
					healthCheck: healthData,
					rootEndpoint: rootData,
					passed: healthResponse.status === 200 && rootResponse.status === 200,
				}
			})
		}

		// Test database service
		if (url.pathname === '/test/db') {
			return runTest('db', async () => {
				// Test 1: Health check
				const healthResponse = await env.DB_SERVICE.fetch('http://db/health')
				const healthData = await healthResponse.json()

				// Test 2: Query endpoint (lightweight query)
				const queryResponse = await env.DB_SERVICE.fetch('http://db/query', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						sql: 'SELECT 1 as test',
					}),
				})
				const queryData = await queryResponse.json()

				return {
					healthCheck: healthData,
					testQuery: queryData,
					passed: healthResponse.status === 200 && queryResponse.status === 200,
				}
			})
		}

		// Test auth service
		if (url.pathname === '/test/auth') {
			return runTest('auth', async () => {
				// Test 1: Health check
				const healthResponse = await env.AUTH_SERVICE.fetch('http://auth/health')
				const healthData = await healthResponse.json()

				// Test 2: Validate invalid token (should fail gracefully)
				const validateResponse = await env.AUTH_SERVICE.fetch('http://auth/validate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						token: 'invalid_test_token',
					}),
				})
				const validateData = await validateResponse.json()

				return {
					healthCheck: healthData,
					validateInvalid: validateData,
					passed: healthResponse.status === 200, // Validate should return error gracefully
				}
			})
		}

		// Test schedule service
		if (url.pathname === '/test/schedule') {
			return runTest('schedule', async () => {
				// Test 1: Health check
				const healthResponse = await env.SCHEDULE_SERVICE.fetch('http://schedule/health')
				const healthData = await healthResponse.json()

				// Test 2: List jobs
				const jobsResponse = await env.SCHEDULE_SERVICE.fetch('http://schedule/jobs')
				const jobsData = await jobsResponse.json()

				return {
					healthCheck: healthData,
					jobs: jobsData,
					passed: healthResponse.status === 200 && jobsResponse.status === 200,
				}
			})
		}

		// Test webhooks service
		if (url.pathname === '/test/webhooks') {
			return runTest('webhooks', async () => {
				// Test 1: Health check
				const healthResponse = await env.WEBHOOKS_SERVICE.fetch('http://webhooks/health')
				const healthData = await healthResponse.json()

				// Test 2: List handlers
				const handlersResponse = await env.WEBHOOKS_SERVICE.fetch('http://webhooks/handlers')
				const handlersData = await handlersResponse.json()

				return {
					healthCheck: healthData,
					handlers: handlersData,
					passed: healthResponse.status === 200 && handlersResponse.status === 200,
				}
			})
		}

		// Test email service
		if (url.pathname === '/test/email') {
			return runTest('email', async () => {
				// Test 1: Health check
				const healthResponse = await env.EMAIL_SERVICE.fetch('http://email/health')
				const healthData = await healthResponse.json()

				return {
					healthCheck: healthData,
					passed: healthResponse.status === 200,
					note: 'Email service test - health check only (no actual emails sent)',
				}
			})
		}

		// Test MCP service
		if (url.pathname === '/test/mcp') {
			return runTest('mcp', async () => {
				// Test 1: Health check
				const healthResponse = await env.MCP_SERVICE.fetch('http://mcp/health')
				const healthData = await healthResponse.json()

				// Test 2: List tools
				const toolsResponse = await env.MCP_SERVICE.fetch('http://mcp/tools')
				const toolsData = await toolsResponse.json()

				return {
					healthCheck: healthData,
					tools: toolsData,
					passed: healthResponse.status === 200 && toolsResponse.status === 200,
				}
			})
		}

		// Test queue service
		if (url.pathname === '/test/queue') {
			return runTest('queue', async () => {
				// Test 1: Health check
				const healthResponse = await env.QUEUE_SERVICE.fetch('http://queue/health')
				const healthData = await healthResponse.json()

				return {
					healthCheck: healthData,
					passed: healthResponse.status === 200,
					note: 'Queue service test - health check only',
				}
			})
		}

		// Test all services
		if (url.pathname === '/test/all') {
			const startTime = Date.now()

			// Run all tests in parallel
			const results = await Promise.all([
				fetchTestResult(`${url.origin}/test/gateway`),
				fetchTestResult(`${url.origin}/test/db`),
				fetchTestResult(`${url.origin}/test/auth`),
				fetchTestResult(`${url.origin}/test/schedule`),
				fetchTestResult(`${url.origin}/test/webhooks`),
				fetchTestResult(`${url.origin}/test/email`),
				fetchTestResult(`${url.origin}/test/mcp`),
				fetchTestResult(`${url.origin}/test/queue`),
			])

			const totalDuration = Date.now() - startTime
			const allPassed = results.every(r => r.passed)
			const passedCount = results.filter(r => r.passed).length
			const failedCount = results.filter(r => !r.passed).length

			return Response.json({
				summary: {
					total: results.length,
					passed: passedCount,
					failed: failedCount,
					allPassed,
					duration: totalDuration,
				},
				tests: results,
			})
		}

		// Default response
		return Response.json(
			{
				error: 'Not Found',
				message: 'Tests Runner Worker - Test all services via remote bindings',
				endpoints: {
					'GET /health': 'Health check',
					'GET /test/gateway': 'Test gateway service',
					'GET /test/db': 'Test database service',
					'GET /test/auth': 'Test auth service',
					'GET /test/schedule': 'Test schedule service',
					'GET /test/webhooks': 'Test webhooks service',
					'GET /test/email': 'Test email service',
					'GET /test/mcp': 'Test MCP service',
					'GET /test/queue': 'Test queue service',
					'GET /test/all': 'Run all tests',
				},
			},
			{ status: 404 }
		)
	},
} satisfies ExportedHandler<Env>

/**
 * Run a test and return formatted result
 */
async function runTest(testName: string, testFn: () => Promise<any>): Promise<Response> {
	const startTime = Date.now()

	try {
		const result = await testFn()
		const duration = Date.now() - startTime

		const testResult: TestResult = {
			test: testName,
			passed: result.passed ?? true,
			duration,
			result,
			note: result.note,
		}

		return Response.json(testResult)
	} catch (error) {
		const duration = Date.now() - startTime

		const testResult: TestResult = {
			test: testName,
			passed: false,
			duration,
			error: error instanceof Error ? error.message : String(error),
		}

		return Response.json(testResult)
	}
}

/**
 * Fetch test result from endpoint
 */
async function fetchTestResult(url: string): Promise<TestResult> {
	try {
		const response = await fetch(url)
		return await response.json()
	} catch (error) {
		return {
			test: url.split('/').pop() || 'unknown',
			passed: false,
			duration: 0,
			error: error instanceof Error ? error.message : String(error),
		}
	}
}
