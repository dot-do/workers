/**
 * TypeScript types for Vercel integration
 */

export interface Env {
	// Service bindings
	DB: any
	AUTH: any

	// Environment variables
	VERCEL_API_BASE: string
	VERCEL_CLIENT_ID: string
	VERCEL_CLIENT_SECRET: string

	// Context
	ctx: ExecutionContext
}

// OAuth Types
export interface VercelOAuthTokenResponse {
	access_token: string
	token_type: 'Bearer'
	installation_id?: string
	user_id: string
	team_id?: string
}

export interface VercelConnection {
	userId: string
	accessToken: string
	vercelUserId: string
	teamId?: string
	connectedAt: number
	lastUsedAt: number
}

// User Types
export interface VercelUser {
	id: string
	email: string
	name?: string
	username?: string
	avatar?: string
	createdAt: number
}

// Team Types
export interface VercelTeam {
	id: string
	slug: string
	name: string
	avatar?: string
	createdAt: number
	membership: {
		role: 'OWNER' | 'MEMBER' | 'VIEWER'
		createdAt: number
	}
}

// Project Types
export interface VercelProject {
	id: string
	name: string
	accountId: string
	framework?: string
	rootDirectory?: string
	latestDeployments?: VercelDeployment[]
	link?: {
		type: 'github' | 'gitlab' | 'bitbucket'
		repo: string
		repoId: number
		org?: string
		gitCredentialId?: string
		sourceless: boolean
		productionBranch?: string
		createdAt: number
		updatedAt: number
	}
	targets?: {
		production: {
			alias: string[]
			url: string
		}
	}
	updatedAt: number
	createdAt: number
}

// Deployment Types
export interface VercelDeployment {
	id: string
	uid: string
	name: string
	url: string
	state: 'BUILDING' | 'ERROR' | 'READY' | 'QUEUED' | 'CANCELED'
	type: 'LAMBDAS' | 'EDGE_FUNCTIONS' | 'CRON'
	creator: {
		uid: string
		email?: string
		username?: string
	}
	target: 'production' | 'preview' | 'development'
	source?: 'cli' | 'git' | 'import'
	projectId?: string
	meta?: Record<string, any>
	inspectorUrl?: string
	ready?: number
	readyState?: 'BUILDING' | 'ERROR' | 'READY' | 'QUEUED' | 'CANCELED'
	checksConclusion?: 'succeeded' | 'failed' | 'skipped' | 'canceled'
	checksState?: 'registered' | 'running' | 'completed'
	buildingAt?: number
	createdAt: number
}

export interface CreateDeploymentOptions {
	name: string
	files?: Array<{
		file: string
		data: string
		encoding?: 'base64' | 'utf-8'
	}>
	gitSource?: {
		type: 'github' | 'gitlab' | 'bitbucket'
		repo: string
		ref: string
		sha?: string
	}
	projectSettings?: {
		framework?: string
		buildCommand?: string
		outputDirectory?: string
		installCommand?: string
		devCommand?: string
		rootDirectory?: string
	}
	target?: 'production' | 'preview' | 'development'
	env?: Record<string, string>
	build?: {
		env?: Record<string, string>
	}
	teamId?: string
	withCache?: boolean
}

// Domain Types
export interface VercelDomain {
	id: string
	name: string
	verified: boolean
	projectId?: string
	redirect?: string
	redirectStatusCode?: number
	gitBranch?: string
	customEnvironmentId?: string
	createdAt: number
	updatedAt: number
}

// API Response Types
export interface VercelAPIError {
	error: {
		code: string
		message: string
		details?: any
	}
}

export interface PaginatedResponse<T> {
	data: T[]
	pagination: {
		count: number
		next?: string
		prev?: string
	}
}

// RPC Method Types
export interface ConnectInput {
	userId: string
	code: string
}

export interface ConnectResponse {
	success: boolean
	connection?: VercelConnection
	error?: string
}

export interface DeploymentInput {
	userId: string
	options: CreateDeploymentOptions
}

export interface ListProjectsInput {
	userId: string
	teamId?: string
	limit?: number
	since?: number
	until?: number
}

export interface GetDeploymentInput {
	userId: string
	deploymentId: string
	teamId?: string
}

export interface ListDeploymentsInput {
	userId: string
	projectId?: string
	teamId?: string
	limit?: number
	since?: number
	until?: number
	state?: 'BUILDING' | 'ERROR' | 'READY' | 'QUEUED' | 'CANCELED'
}
