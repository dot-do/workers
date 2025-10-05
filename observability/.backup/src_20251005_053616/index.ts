/**
 * Observability Worker - Centralized Logging and Error Tracking
 *
 * Provides:
 * - Log aggregation from all services
 * - Error and crash tracking
 * - Query and filter capabilities
 * - Real-time log streaming
 * - Analytics and metrics
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
	LOGS: AnalyticsEngineDataset
}

interface LogEntry {
	timestamp: number
	service: string
	level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
	message: string
	metadata?: Record<string, any>
	error?: {
		name: string
		message: string
		stack?: string
	}
	requestId?: string
	userId?: string
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url)

		// Health check
		if (url.pathname === '/health') {
			return Response.json({
				status: 'ok',
				service: 'observability',
				features: ['logs', 'errors', 'metrics', 'streaming'],
			})
		}

		// Log a new entry
		if (url.pathname === '/log' && request.method === 'POST') {
			try {
				const log: LogEntry = await request.json()

				// Validate log entry
				if (!log.service || !log.level || !log.message) {
					return Response.json({ error: 'Invalid log entry' }, { status: 400 })
				}

				// Store in Analytics Engine
				env.LOGS.writeDataPoint({
					indexes: [log.service, log.level, log.requestId || '', log.userId || ''],
					blobs: [log.message, JSON.stringify(log.metadata || {}), log.error ? JSON.stringify(log.error) : ''],
					doubles: [log.timestamp],
				})

				return Response.json({ success: true, logged: log })
			} catch (error) {
				return Response.json(
					{
						error: 'Failed to log entry',
						message: error instanceof Error ? error.message : String(error),
					},
					{ status: 500 }
				)
			}
		}

		// Get logs for a service
		if (url.pathname.startsWith('/logs/')) {
			const service = url.pathname.split('/')[2]
			const params = url.searchParams

			const level = params.get('level')
			const limit = parseInt(params.get('limit') || '100')
			const since = params.get('since') // ISO timestamp

			return Response.json({
				service,
				filters: { level, limit, since },
				logs: [], // TODO: Query Analytics Engine
				note: 'Analytics Engine query not yet implemented',
			})
		}

		// Get all errors
		if (url.pathname === '/errors') {
			const params = url.searchParams
			const service = params.get('service')
			const limit = parseInt(params.get('limit') || '50')

			return Response.json({
				filters: { service, limit },
				errors: [], // TODO: Query Analytics Engine for errors
				note: 'Error query not yet implemented',
			})
		}

		// Get service health status
		if (url.pathname === '/status') {
			const services = ['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp', 'queue']

			// Check health of all services
			const healthChecks = await Promise.all(
				services.map(async service => {
					try {
						const binding = (service.toUpperCase() + '_SERVICE') as keyof Env
						const fetcher = env[binding] as Fetcher

						const response = await fetcher.fetch(`http://${service}/health`)
						const data = await response.json()

						return {
							service,
							status: response.status === 200 ? 'healthy' : 'unhealthy',
							data,
						}
					} catch (error) {
						return {
							service,
							status: 'error',
							error: error instanceof Error ? error.message : String(error),
						}
					}
				})
			)

			const healthyCount = healthChecks.filter(h => h.status === 'healthy').length
			const unhealthyCount = healthChecks.filter(h => h.status === 'unhealthy').length
			const errorCount = healthChecks.filter(h => h.status === 'error').length

			return Response.json({
				overall: healthyCount === services.length ? 'healthy' : 'degraded',
				summary: {
					total: services.length,
					healthy: healthyCount,
					unhealthy: unhealthyCount,
					error: errorCount,
				},
				services: healthChecks,
			})
		}

		// Get metrics
		if (url.pathname === '/metrics') {
			return Response.json({
				metrics: {
					totalLogs: 0, // TODO: Query Analytics Engine
					totalErrors: 0,
					logsByService: {},
					errorsByService: {},
				},
				note: 'Metrics not yet implemented',
			})
		}

		// Stream logs in real-time (SSE)
		if (url.pathname === '/stream') {
			const service = url.searchParams.get('service')
			const level = url.searchParams.get('level')

			// TODO: Implement real-time log streaming with SSE
			return new Response('Log streaming not yet implemented', {
				headers: { 'Content-Type': 'text/plain' },
			})
		}

		// Default response
		return Response.json(
			{
				error: 'Not Found',
				message: 'Observability Worker - Centralized logging and error tracking',
				endpoints: {
					'GET /health': 'Health check',
					'POST /log': 'Log a new entry',
					'GET /logs/:service': 'Get logs for a service',
					'GET /errors': 'Get all errors',
					'GET /status': 'Get service health status',
					'GET /metrics': 'Get log metrics',
					'GET /stream': 'Stream logs in real-time (SSE)',
				},
			},
			{ status: 404 }
		)
	},
} satisfies ExportedHandler<Env>
