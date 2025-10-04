import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.test.jsonc' },
				miniflare: {
					compatibilityDate: '2025-01-01',
					compatibilityFlags: ['nodejs_compat'],
					// Mock service bindings for testing
					serviceBindings: {
						GATEWAY_SERVICE: async (request: Request) => {
							const url = new URL(request.url)
							if (url.pathname === '/health') {
								return Response.json({ status: 'ok', service: 'gateway' })
							}
							return Response.json({ message: 'Gateway service (mocked)' })
						},
						DB_SERVICE: async (request: Request) => {
							const url = new URL(request.url)
							if (url.pathname === '/health') {
								return Response.json({ status: 'ok', service: 'db' })
							}
							if (url.pathname === '/query') {
								return Response.json({ data: [{ test: 1 }], success: true })
							}
							return Response.json({ message: 'DB service (mocked)' })
						},
						AUTH_SERVICE: async (request: Request) => {
							const url = new URL(request.url)
							if (url.pathname === '/health') {
								return Response.json({ status: 'ok', service: 'auth' })
							}
							if (url.pathname === '/validate') {
								return Response.json({ valid: false, error: 'Invalid token' })
							}
							return Response.json({ message: 'Auth service (mocked)' })
						},
						SCHEDULE_SERVICE: async (request: Request) => {
							const url = new URL(request.url)
							if (url.pathname === '/health') {
								return Response.json({ status: 'ok', service: 'schedule' })
							}
							if (url.pathname === '/jobs') {
								return Response.json({ jobs: [], total: 0 })
							}
							return Response.json({ message: 'Schedule service (mocked)' })
						},
						WEBHOOKS_SERVICE: async (request: Request) => {
							const url = new URL(request.url)
							if (url.pathname === '/health') {
								return Response.json({ status: 'ok', service: 'webhooks' })
							}
							if (url.pathname === '/handlers') {
								return Response.json({ handlers: [], total: 0 })
							}
							return Response.json({ message: 'Webhooks service (mocked)' })
						},
						EMAIL_SERVICE: async (request: Request) => {
							const url = new URL(request.url)
							if (url.pathname === '/health') {
								return Response.json({ status: 'ok', service: 'email' })
							}
							return Response.json({ message: 'Email service (mocked)' })
						},
						MCP_SERVICE: async (request: Request) => {
							const url = new URL(request.url)
							if (url.pathname === '/health') {
								return Response.json({ status: 'ok', service: 'mcp' })
							}
							if (url.pathname === '/tools') {
								return Response.json({ tools: [], total: 0 })
							}
							return Response.json({ message: 'MCP service (mocked)' })
						},
						QUEUE_SERVICE: async (request: Request) => {
							const url = new URL(request.url)
							if (url.pathname === '/health') {
								return Response.json({ status: 'ok', service: 'queue' })
							}
							return Response.json({ message: 'Queue service (mocked)' })
						},
					},
				},
			},
		},
	},
})
