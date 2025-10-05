/**
 * GCP Worker Types
 * Type definitions for Google Cloud Platform integration
 */

export interface Env {
	// Service bindings
	DB: any
	AUTH: any

	// KV namespace
	TOKEN_KV: KVNamespace

	// Environment variables
	GCP_CLIENT_ID: string
	GCP_CLIENT_SECRET: string
	GCP_REDIRECT_URI: string
}

// OAuth Types
export interface OAuthTokens {
	access_token: string
	refresh_token?: string
	expires_in: number
	scope: string
	token_type: string
	id_token?: string
}

export interface TokenInfo {
	azp: string
	aud: string
	sub: string
	scope: string
	exp: number
	expires_in: number
	email?: string
	email_verified?: boolean
}

export interface UserInfo {
	sub: string
	email: string
	email_verified: boolean
	name?: string
	picture?: string
	given_name?: string
	family_name?: string
	locale?: string
}

// GCP API Types
export interface GCPProject {
	projectId: string
	projectNumber: string
	name: string
	createTime: string
	lifecycleState: string
	parent?: {
		type: string
		id: string
	}
}

export interface GCPBucket {
	name: string
	location: string
	storageClass: string
	timeCreated: string
	updated: string
	selfLink: string
}

export interface GCPFunction {
	name: string
	status: string
	entryPoint: string
	runtime: string
	availableMemoryMb?: number
	timeout?: string
	httpsTrigger?: {
		url: string
	}
	labels?: Record<string, string>
}

export interface GCPFunctionInvocation {
	executionId: string
	result: any
	error?: string
}

// Connection Types
export interface GCPConnection {
	userId: string
	projectId?: string
	accessToken: string
	refreshToken?: string
	expiresAt: number
	scope: string
	userInfo: UserInfo
	createdAt: number
	updatedAt: number
}

// RPC Request/Response Types
export interface ConnectRequest {
	userId: string
	code: string
}

export interface ConnectResponse {
	success: boolean
	userInfo?: UserInfo
	error?: string
}

export interface DisconnectRequest {
	userId: string
}

export interface DisconnectResponse {
	success: boolean
}

export interface ListProjectsRequest {
	userId: string
	pageSize?: number
	pageToken?: string
}

export interface ListProjectsResponse {
	projects: GCPProject[]
	nextPageToken?: string
}

export interface ListBucketsRequest {
	userId: string
	projectId: string
	prefix?: string
	maxResults?: number
}

export interface ListBucketsResponse {
	buckets: GCPBucket[]
	nextPageToken?: string
}

export interface ListFunctionsRequest {
	userId: string
	projectId: string
	location?: string
}

export interface ListFunctionsResponse {
	functions: GCPFunction[]
}

export interface InvokeFunctionRequest {
	userId: string
	projectId: string
	functionName: string
	data?: any
}

export interface InvokeFunctionResponse {
	executionId: string
	result: any
	error?: string
}
