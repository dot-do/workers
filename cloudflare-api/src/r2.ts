/**
 * Cloudflare R2 Storage API
 */

import { cloudflareRequest } from './api'
import type { CloudflareR2Bucket, R2BucketUsage, ListOptions } from './types'

/**
 * List all R2 buckets in an account
 */
export async function listR2Buckets(
	apiToken: string,
	accountId: string,
	options: ListOptions = {}
): Promise<{ buckets: CloudflareR2Bucket[]; total: number }> {
	const params = new URLSearchParams()
	if (options.page) params.set('page', options.page.toString())
	if (options.per_page) params.set('per_page', options.per_page.toString())
	if (options.order) params.set('order', options.order)
	if (options.direction) params.set('direction', options.direction)

	const queryString = params.toString()
	const endpoint = `/accounts/${accountId}/r2/buckets${queryString ? `?${queryString}` : ''}`

	const response = await cloudflareRequest<{ buckets: CloudflareR2Bucket[] }>(endpoint, apiToken)

	return {
		buckets: response.buckets || [],
		total: (response.buckets || []).length,
	}
}

/**
 * Get R2 bucket details
 */
export async function getR2Bucket(
	apiToken: string,
	accountId: string,
	bucketName: string
): Promise<CloudflareR2Bucket> {
	return cloudflareRequest<CloudflareR2Bucket>(`/accounts/${accountId}/r2/buckets/${bucketName}`, apiToken)
}

/**
 * Create R2 bucket
 */
export async function createR2Bucket(
	apiToken: string,
	accountId: string,
	bucketName: string,
	locationHint?: string
): Promise<CloudflareR2Bucket> {
	const body: any = { name: bucketName }
	if (locationHint) body.locationHint = locationHint

	return cloudflareRequest<CloudflareR2Bucket>(`/accounts/${accountId}/r2/buckets`, apiToken, {
		method: 'POST',
		body: JSON.stringify(body),
	})
}

/**
 * Delete R2 bucket
 */
export async function deleteR2Bucket(apiToken: string, accountId: string, bucketName: string): Promise<void> {
	await cloudflareRequest(`/accounts/${accountId}/r2/buckets/${bucketName}`, apiToken, {
		method: 'DELETE',
	})
}

/**
 * Get R2 bucket usage statistics
 */
export async function getR2BucketUsage(
	apiToken: string,
	accountId: string,
	bucketName: string
): Promise<R2BucketUsage> {
	return cloudflareRequest<R2BucketUsage>(`/accounts/${accountId}/r2/buckets/${bucketName}/usage`, apiToken)
}

/**
 * List objects in R2 bucket (requires S3-compatible API, not REST API)
 * Note: This requires AWS S3 SDK with R2 credentials, not API tokens
 * Included here for completeness but would need separate implementation
 */
export async function listR2Objects(
	apiToken: string,
	accountId: string,
	bucketName: string,
	options: {
		prefix?: string
		delimiter?: string
		maxKeys?: number
		startAfter?: string
	} = {}
): Promise<{
	objects: Array<{ key: string; size: number; lastModified: string; etag: string }>
	isTruncated: boolean
	nextContinuationToken?: string
}> {
	// Note: This endpoint doesn't exist in the REST API
	// R2 object operations require S3-compatible API with access key/secret
	// This is a placeholder for the interface
	throw new Error('R2 object listing requires S3-compatible API with access credentials')
}

/**
 * Get R2 bucket CORS configuration
 */
export async function getR2BucketCORS(
	apiToken: string,
	accountId: string,
	bucketName: string
): Promise<{
	allowedOrigins: string[]
	allowedMethods: string[]
	allowedHeaders: string[]
	exposeHeaders: string[]
	maxAgeSeconds: number
}> {
	return cloudflareRequest(`/accounts/${accountId}/r2/buckets/${bucketName}/cors`, apiToken)
}

/**
 * Update R2 bucket CORS configuration
 */
export async function updateR2BucketCORS(
	apiToken: string,
	accountId: string,
	bucketName: string,
	cors: {
		allowedOrigins: string[]
		allowedMethods: string[]
		allowedHeaders?: string[]
		exposeHeaders?: string[]
		maxAgeSeconds?: number
	}
): Promise<void> {
	await cloudflareRequest(`/accounts/${accountId}/r2/buckets/${bucketName}/cors`, apiToken, {
		method: 'PUT',
		body: JSON.stringify(cors),
	})
}

/**
 * Delete R2 bucket CORS configuration
 */
export async function deleteR2BucketCORS(apiToken: string, accountId: string, bucketName: string): Promise<void> {
	await cloudflareRequest(`/accounts/${accountId}/r2/buckets/${bucketName}/cors`, apiToken, {
		method: 'DELETE',
	})
}
