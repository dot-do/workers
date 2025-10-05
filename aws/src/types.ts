/**
 * AWS Integration Types
 */

export interface Env {
	// Service Bindings
	DB: any
	AUTH: any

	// KV Namespaces
	AWS_CACHE: KVNamespace

	// Environment Variables
	AWS_COGNITO_DOMAIN?: string
	AWS_COGNITO_CLIENT_ID?: string
	AWS_COGNITO_CLIENT_SECRET?: string
	AWS_REGION?: string
}

export interface AWSConnection {
	userId: string
	accessToken: string
	refreshToken?: string
	idToken?: string
	expiresAt: number
	identityId?: string
	region: string
	cognitoDomain: string
	createdAt: number
	updatedAt: number
}

export interface CognitoTokens {
	access_token: string
	id_token: string
	refresh_token?: string
	token_type: string
	expires_in: number
}

export interface S3Bucket {
	name: string
	creationDate: Date
	region?: string
}

export interface S3Object {
	key: string
	size: number
	lastModified: Date
	etag: string
}

export interface LambdaFunction {
	functionName: string
	functionArn: string
	runtime: string
	handler: string
	codeSize: number
	description?: string
	timeout: number
	memorySize: number
	lastModified: string
	version: string
	role: string
}

export interface LambdaInvocation {
	statusCode?: number
	payload?: any
	logResult?: string
	executedVersion?: string
	functionError?: string
}

export interface AWSCredentials {
	accessKeyId: string
	secretAccessKey: string
	sessionToken: string
	expiration: Date
}

export interface ApiResponse<T = any> {
	success: boolean
	data?: T
	error?: string
	code?: string
	timestamp: number
}

export interface ListOptions {
	limit?: number
	nextToken?: string
}

export interface S3ListOptions extends ListOptions {
	prefix?: string
	delimiter?: string
}
