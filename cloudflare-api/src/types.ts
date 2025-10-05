/**
 * TypeScript types for Cloudflare API integration
 */

export interface Env {
	DB: any // Database service binding
	AUTH: any // Auth service binding
	CLOUDFLARE_CACHE: KVNamespace
}

// ============================================================================
// Connection Types
// ============================================================================

export interface CloudflareConnection {
	userId: string
	apiToken: string // Encrypted in storage
	accountId?: string
	email?: string
	verified: boolean
	createdAt: number
	updatedAt: number
	lastUsedAt?: number
}

export interface ConnectionMetadata {
	accountId: string
	email: string
	accounts: CloudflareAccount[]
}

// ============================================================================
// Cloudflare API Response Types
// ============================================================================

export interface CloudflareApiResponse<T = any> {
	success: boolean
	errors: Array<{ code: number; message: string }>
	messages: string[]
	result: T
	result_info?: {
		page: number
		per_page: number
		count: number
		total_count: number
		total_pages: number
	}
}

export interface CloudflareAccount {
	id: string
	name: string
	type: string
	settings?: {
		enforce_twofactor: boolean
	}
}

export interface CloudflareUser {
	id: string
	email: string
	first_name?: string
	last_name?: string
	username: string
	telephone?: string
	country?: string
	zipcode?: string
	created_on: string
	modified_on: string
	two_factor_authentication?: {
		enabled: boolean
		locked: boolean
	}
}

// ============================================================================
// Zone Types
// ============================================================================

export interface CloudflareZone {
	id: string
	name: string
	status: 'active' | 'pending' | 'initializing' | 'moved' | 'deleted' | 'deactivated'
	paused: boolean
	type: 'full' | 'partial'
	development_mode: number
	name_servers: string[]
	original_name_servers?: string[]
	original_registrar?: string
	original_dnshost?: string
	modified_on: string
	created_on: string
	activated_on?: string
	account: {
		id: string
		name: string
	}
	permissions?: string[]
	plan?: {
		id: string
		name: string
		price: number
		currency: string
		frequency: string
	}
}

// ============================================================================
// Workers Types
// ============================================================================

export interface CloudflareWorker {
	id: string
	etag: string
	script?: string
	size?: number
	modified_on: string
	created_on: string
	usage_model?: 'bundled' | 'unbound'
	compatibility_date?: string
	compatibility_flags?: string[]
	bindings?: WorkerBinding[]
	routes?: WorkerRoute[]
	logpush?: boolean
	tail_consumers?: Array<{
		service: string
		namespace?: string
		environment?: string
	}>
}

export interface WorkerBinding {
	type: string
	name: string
	[key: string]: any
}

export interface WorkerRoute {
	id: string
	pattern: string
	script: string
	zone_id?: string
	zone_name?: string
}

// ============================================================================
// R2 Types
// ============================================================================

export interface CloudflareR2Bucket {
	name: string
	creation_date: string
	location?: string
	storage_class?: string
}

export interface R2BucketUsage {
	bucket: string
	payloadCount: number
	metadataCount: number
	objectCount: number
	uploadCount: number
	deleteCount: number
	listCount: number
	readCount: number
	payloadSizeBytes: number
	metadataSizeBytes: number
}

// ============================================================================
// D1 Types
// ============================================================================

export interface CloudflareD1Database {
	uuid: string
	name: string
	version: string
	num_tables: number
	file_size: number
	created_at: string
}

// ============================================================================
// KV Types
// ============================================================================

export interface CloudflareKVNamespace {
	id: string
	title: string
	supports_url_encoding?: boolean
}

// ============================================================================
// Pages Types
// ============================================================================

export interface CloudflareProject {
	id: string
	name: string
	subdomain: string
	domains: string[]
	source?: {
		type: string
		config: {
			owner: string
			repo_name: string
			production_branch: string
		}
	}
	build_config?: {
		build_command: string
		destination_dir: string
		root_dir: string
	}
	deployment_configs: {
		production: DeploymentConfig
		preview: DeploymentConfig
	}
	created_on: string
	production_branch?: string
	latest_deployment?: CloudflareDeployment
}

export interface DeploymentConfig {
	env_vars?: Record<string, { value: string; type: string }>
	kv_namespaces?: Record<string, { namespace_id: string }>
	durable_object_namespaces?: Record<string, { namespace_id: string }>
	d1_databases?: Record<string, { id: string }>
	r2_buckets?: Record<string, { name: string }>
	services?: Record<string, { service: string; environment?: string }>
	compatibility_date?: string
	compatibility_flags?: string[]
}

export interface CloudflareDeployment {
	id: string
	short_id: string
	project_id: string
	project_name: string
	environment: 'production' | 'preview'
	url: string
	created_on: string
	modified_on: string
	latest_stage: {
		name: string
		started_on: string
		ended_on?: string
		status: 'active' | 'canceled' | 'failure' | 'success' | 'idle' | 'skipped'
	}
	deployment_trigger: {
		type: string
		metadata: {
			branch?: string
			commit_hash?: string
			commit_message?: string
		}
	}
	stages: Array<{
		name: string
		started_on: string
		ended_on?: string
		status: string
	}>
	build_config: {
		build_command: string
		destination_dir: string
		root_dir: string
	}
	production_branch?: string
	source?: {
		type: string
		config: {
			owner: string
			repo_name: string
			production_branch: string
		}
	}
	env_vars?: Record<string, { value: string }>
	aliases?: string[]
}

// ============================================================================
// Error Types
// ============================================================================

export class CloudflareApiError extends Error {
	constructor(
		message: string,
		public code?: number,
		public errors?: Array<{ code: number; message: string }>
	) {
		super(message)
		this.name = 'CloudflareApiError'
	}
}

// ============================================================================
// RPC Method Types
// ============================================================================

export interface ConnectResponse {
	success: boolean
	accountId?: string
	email?: string
	accounts?: CloudflareAccount[]
	error?: string
}

export interface VerifyTokenResponse {
	valid: boolean
	accountId?: string
	email?: string
	accounts?: CloudflareAccount[]
	error?: string
}

export interface ListOptions {
	page?: number
	per_page?: number
	order?: 'name' | 'status' | 'created_on'
	direction?: 'asc' | 'desc'
	match?: string
	status?: string
}
