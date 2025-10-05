/**
 * AWS Integration Worker
 * OAuth integration with AWS Cognito + service wrappers for S3, Lambda, and more
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, ApiResponse, AWSConnection, S3Bucket, S3Object, LambdaFunction, LambdaInvocation } from './types'
import { CognitoOAuth, storeConnection, getConnection, deleteConnection, ensureValidConnection } from './cognito'
import { AWSApiClient } from './api'
import { S3Service, LambdaService } from './services'

/**
 * AWSService RPC Interface
 */
export class AWSService extends WorkerEntrypoint<Env> {
	private getCognito(): CognitoOAuth {
		const cognitoDomain = this.env.AWS_COGNITO_DOMAIN || ''
		const clientId = this.env.AWS_COGNITO_CLIENT_ID || ''
		const clientSecret = this.env.AWS_COGNITO_CLIENT_SECRET || ''
		const region = this.env.AWS_REGION || 'us-east-1'

		return new CognitoOAuth(this.env, cognitoDomain, clientId, clientSecret, region)
	}

	/**
	 * Connect AWS account via OAuth
	 */
	async connect(userId: string, code: string, redirectUri: string, cognitoDomain?: string): Promise<ApiResponse<AWSConnection>> {
		try {
			const domain = cognitoDomain || this.env.AWS_COGNITO_DOMAIN || ''
			const region = this.env.AWS_REGION || 'us-east-1'

			const cognito = this.getCognito()

			// Exchange code for tokens
			const tokens = await cognito.exchangeCode(code, redirectUri)

			// Parse ID token to get user info
			const idTokenPayload = cognito.parseIdToken(tokens.id_token)

			// Create connection
			const connection: AWSConnection = {
				userId,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				idToken: tokens.id_token,
				expiresAt: Date.now() + tokens.expires_in * 1000,
				region,
				cognitoDomain: domain,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			}

			// Store connection
			await storeConnection(this.env, connection)

			return {
				success: true,
				data: connection,
				timestamp: Date.now(),
			}
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
				code: 'CONNECT_FAILED',
				timestamp: Date.now(),
			}
		}
	}

	/**
	 * Disconnect AWS account
	 */
	async disconnect(userId: string): Promise<ApiResponse<void>> {
		try {
			const connection = await getConnection(this.env, userId)

			if (connection && connection.refreshToken) {
				// Revoke refresh token
				const cognito = this.getCognito()
				try {
					await cognito.revokeToken(connection.refreshToken)
				} catch {
					// Continue even if revocation fails
				}
			}

			// Delete connection
			await deleteConnection(this.env, userId)

			return {
				success: true,
				timestamp: Date.now(),
			}
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
				code: 'DISCONNECT_FAILED',
				timestamp: Date.now(),
			}
		}
	}

	/**
	 * Get connection status
	 */
	async getConnection(userId: string): Promise<ApiResponse<AWSConnection | null>> {
		try {
			const connection = await getConnection(this.env, userId)

			return {
				success: true,
				data: connection,
				timestamp: Date.now(),
			}
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
				code: 'GET_CONNECTION_FAILED',
				timestamp: Date.now(),
			}
		}
	}

	/**
	 * List S3 buckets
	 */
	async listBuckets(userId: string): Promise<ApiResponse<S3Bucket[]>> {
		try {
			const cognito = this.getCognito()
			const connection = await ensureValidConnection(this.env, userId, cognito)

			const apiClient = new AWSApiClient(this.env, connection)
			const s3Service = new S3Service(apiClient)

			const buckets = await s3Service.listBuckets()

			return {
				success: true,
				data: buckets,
				timestamp: Date.now(),
			}
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
				code: 'LIST_BUCKETS_FAILED',
				timestamp: Date.now(),
			}
		}
	}

	/**
	 * List objects in S3 bucket
	 */
	async listObjects(userId: string, bucket: string, prefix?: string, limit?: number): Promise<ApiResponse<{ objects: S3Object[]; nextToken?: string }>> {
		try {
			const cognito = this.getCognito()
			const connection = await ensureValidConnection(this.env, userId, cognito)

			const apiClient = new AWSApiClient(this.env, connection)
			const s3Service = new S3Service(apiClient)

			const result = await s3Service.listObjects(bucket, { prefix, limit })

			return {
				success: true,
				data: result,
				timestamp: Date.now(),
			}
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
				code: 'LIST_OBJECTS_FAILED',
				timestamp: Date.now(),
			}
		}
	}

	/**
	 * List Lambda functions
	 */
	async listFunctions(userId: string, limit?: number): Promise<ApiResponse<{ functions: LambdaFunction[]; nextToken?: string }>> {
		try {
			const cognito = this.getCognito()
			const connection = await ensureValidConnection(this.env, userId, cognito)

			const apiClient = new AWSApiClient(this.env, connection)
			const lambdaService = new LambdaService(apiClient)

			const result = await lambdaService.listFunctions({ limit })

			return {
				success: true,
				data: result,
				timestamp: Date.now(),
			}
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
				code: 'LIST_FUNCTIONS_FAILED',
				timestamp: Date.now(),
			}
		}
	}

	/**
	 * Get Lambda function details
	 */
	async getFunction(userId: string, functionName: string): Promise<ApiResponse<LambdaFunction>> {
		try {
			const cognito = this.getCognito()
			const connection = await ensureValidConnection(this.env, userId, cognito)

			const apiClient = new AWSApiClient(this.env, connection)
			const lambdaService = new LambdaService(apiClient)

			const fn = await lambdaService.getFunction(functionName)

			return {
				success: true,
				data: fn,
				timestamp: Date.now(),
			}
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
				code: 'GET_FUNCTION_FAILED',
				timestamp: Date.now(),
			}
		}
	}

	/**
	 * Invoke Lambda function
	 */
	async invokeLambda(userId: string, functionName: string, payload?: any): Promise<ApiResponse<LambdaInvocation>> {
		try {
			const cognito = this.getCognito()
			const connection = await ensureValidConnection(this.env, userId, cognito)

			const apiClient = new AWSApiClient(this.env, connection)
			const lambdaService = new LambdaService(apiClient)

			const result = await lambdaService.invoke(functionName, payload)

			return {
				success: true,
				data: result,
				timestamp: Date.now(),
			}
		} catch (error: any) {
			return {
				success: false,
				error: error.message,
				code: 'INVOKE_LAMBDA_FAILED',
				timestamp: Date.now(),
			}
		}
	}
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

// CORS
app.use(
	'/*',
	cors({
		origin: '*',
		allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization'],
	})
)

// Health check
app.get('/health', (c) => {
	return c.json({ status: 'ok', service: 'aws', timestamp: Date.now() })
})

// OAuth endpoints
app.get('/connect', async (c) => {
	const userId = c.req.header('X-User-Id')
	const redirectUri = c.req.query('redirect_uri')
	const state = c.req.query('state') || crypto.randomUUID()

	if (!userId || !redirectUri) {
		return c.json({ success: false, error: 'Missing userId or redirect_uri' }, 400)
	}

	const service = new AWSService(c.env.ctx, c.env)
	const cognitoDomain = c.env.AWS_COGNITO_DOMAIN || ''
	const clientId = c.env.AWS_COGNITO_CLIENT_ID || ''
	const clientSecret = c.env.AWS_COGNITO_CLIENT_SECRET || ''
	const region = c.env.AWS_REGION || 'us-east-1'

	const cognito = new CognitoOAuth(c.env, cognitoDomain, clientId, clientSecret, region)
	const authUrl = cognito.generateAuthUrl(redirectUri, state)

	return c.json({ success: true, data: { authUrl, state } })
})

app.post('/callback', async (c) => {
	const { userId, code, redirectUri, cognitoDomain } = await c.req.json()

	if (!userId || !code || !redirectUri) {
		return c.json({ success: false, error: 'Missing required fields' }, 400)
	}

	const service = new AWSService(c.env.ctx, c.env)
	const result = await service.connect(userId, code, redirectUri, cognitoDomain)

	return c.json(result, result.success ? 200 : 400)
})

app.post('/disconnect', async (c) => {
	const userId = c.req.header('X-User-Id')

	if (!userId) {
		return c.json({ success: false, error: 'Missing userId' }, 400)
	}

	const service = new AWSService(c.env.ctx, c.env)
	const result = await service.disconnect(userId)

	return c.json(result, result.success ? 200 : 400)
})

// S3 endpoints
app.get('/s3/buckets', async (c) => {
	const userId = c.req.header('X-User-Id')

	if (!userId) {
		return c.json({ success: false, error: 'Missing userId' }, 401)
	}

	const service = new AWSService(c.env.ctx, c.env)
	const result = await service.listBuckets(userId)

	return c.json(result, result.success ? 200 : 400)
})

app.get('/s3/buckets/:bucket/objects', async (c) => {
	const userId = c.req.header('X-User-Id')
	const bucket = c.req.param('bucket')
	const prefix = c.req.query('prefix')
	const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined

	if (!userId) {
		return c.json({ success: false, error: 'Missing userId' }, 401)
	}

	const service = new AWSService(c.env.ctx, c.env)
	const result = await service.listObjects(userId, bucket, prefix, limit)

	return c.json(result, result.success ? 200 : 400)
})

// Lambda endpoints
app.get('/lambda/functions', async (c) => {
	const userId = c.req.header('X-User-Id')
	const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined

	if (!userId) {
		return c.json({ success: false, error: 'Missing userId' }, 401)
	}

	const service = new AWSService(c.env.ctx, c.env)
	const result = await service.listFunctions(userId, limit)

	return c.json(result, result.success ? 200 : 400)
})

app.get('/lambda/functions/:name', async (c) => {
	const userId = c.req.header('X-User-Id')
	const functionName = c.req.param('name')

	if (!userId) {
		return c.json({ success: false, error: 'Missing userId' }, 401)
	}

	const service = new AWSService(c.env.ctx, c.env)
	const result = await service.getFunction(userId, functionName)

	return c.json(result, result.success ? 200 : 400)
})

app.post('/lambda/functions/:name/invoke', async (c) => {
	const userId = c.req.header('X-User-Id')
	const functionName = c.req.param('name')
	const { payload } = await c.req.json()

	if (!userId) {
		return c.json({ success: false, error: 'Missing userId' }, 401)
	}

	const service = new AWSService(c.env.ctx, c.env)
	const result = await service.invokeLambda(userId, functionName, payload)

	return c.json(result, result.success ? 200 : 400)
})

export default {
	fetch: app.fetch,
}
