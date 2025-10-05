/**
 * TypeScript types for Netlify OAuth integration
 */

export interface Env {
	DB: any
	AUTH: any
	NETLIFY_CACHE: KVNamespace
	NETLIFY_CLIENT_ID: string
	NETLIFY_CLIENT_SECRET: string
	NETLIFY_REDIRECT_URI: string
}

/**
 * Netlify OAuth token response
 */
export interface NetlifyTokenResponse {
	access_token: string
	token_type: 'Bearer'
	created_at: number
}

/**
 * Stored connection data
 */
export interface NetlifyConnection {
	userId: string
	accessToken: string
	createdAt: number
	expiresAt?: number
	netlifyUserId: string
	email: string
}

/**
 * Netlify user information
 */
export interface NetlifyUser {
	id: string
	uid: string
	name: string
	email: string
	affiliate_id: string
	site_count: number
	created_at: string
	last_login: string
	login_providers: string[]
	onboarding_progress: Record<string, any>
}

/**
 * Netlify site
 */
export interface NetlifySite {
	id: string
	name: string
	url: string
	admin_url: string
	ssl_url?: string
	custom_domain?: string
	created_at: string
	updated_at: string
	user_id: string
	state: 'ready' | 'building' | 'error'
	capabilities: Record<string, boolean>
	git_provider?: string
	repo_url?: string
	repo_branch?: string
	published_deploy?: NetlifyDeployment
}

/**
 * Netlify deployment
 */
export interface NetlifyDeployment {
	id: string
	site_id: string
	user_id: string
	build_id: string
	state: 'ready' | 'building' | 'uploading' | 'processing' | 'error'
	name: string
	url: string
	ssl_url?: string
	admin_url: string
	deploy_url: string
	deploy_ssl_url: string
	created_at: string
	updated_at: string
	published_at?: string
	title?: string
	context: 'production' | 'deploy-preview' | 'branch-deploy'
	branch?: string
	commit_ref?: string
	commit_url?: string
	error_message?: string
	framework?: string
	function_schedules?: any[]
	skipped?: boolean
	locked?: boolean
	draft?: boolean
}

/**
 * Deploy options
 */
export interface DeployOptions {
	siteId: string
	files?: Record<string, string>
	functions?: Record<string, string>
	draft?: boolean
	title?: string
	branch?: string
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
	success: boolean
	data?: T
	error?: {
		code: string
		message: string
		details?: any
	}
}

/**
 * List options
 */
export interface ListOptions {
	page?: number
	perPage?: number
	filter?: string
}

/**
 * RPC method responses
 */
export interface ConnectResponse {
	success: boolean
	userId: string
	netlifyUserId: string
	email: string
}

export interface DisconnectResponse {
	success: boolean
	userId: string
}

export interface DeployResponse {
	success: boolean
	deployment: NetlifyDeployment
	siteId: string
	deployId: string
}

export interface ListSitesResponse {
	success: boolean
	sites: NetlifySite[]
	total: number
}

export interface GetDeploymentResponse {
	success: boolean
	deployment: NetlifyDeployment
	siteId: string
}
