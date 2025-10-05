/**
 * GCP Service Integrations
 * High-level service wrappers for common GCP operations
 */

import type { Env, GCPConnection } from './types'
import { GCPAPIClient } from './api'

/**
 * Cloud Storage Service
 */
export class CloudStorageService {
	private client: GCPAPIClient

	constructor(env: Env, connection: GCPConnection) {
		this.client = new GCPAPIClient(env, connection)
	}

	async listBuckets(projectId: string) {
		return this.client.listBuckets(projectId)
	}

	// Add more storage operations as needed
	// async createBucket(projectId: string, bucketName: string, options: BucketOptions) {}
	// async uploadFile(bucketName: string, fileName: string, content: ArrayBuffer) {}
	// async downloadFile(bucketName: string, fileName: string) {}
}

/**
 * Cloud Functions Service
 */
export class CloudFunctionsService {
	private client: GCPAPIClient

	constructor(env: Env, connection: GCPConnection) {
		this.client = new GCPAPIClient(env, connection)
	}

	async listFunctions(projectId: string, location?: string) {
		return this.client.listFunctions(projectId, location)
	}

	async invokeFunction(projectId: string, functionName: string, data?: any) {
		return this.client.invokeFunction(projectId, functionName, data)
	}

	// Add more function operations as needed
	// async createFunction(projectId: string, functionName: string, options: FunctionOptions) {}
	// async deleteFunction(projectId: string, functionName: string) {}
}

/**
 * Compute Engine Service
 */
export class ComputeEngineService {
	private client: GCPAPIClient

	constructor(env: Env, connection: GCPConnection) {
		this.client = new GCPAPIClient(env, connection)
	}

	async listInstances(projectId: string, zone?: string) {
		return this.client.listInstances(projectId, zone)
	}

	// Add more compute operations as needed
	// async createInstance(projectId: string, zone: string, options: InstanceOptions) {}
	// async startInstance(projectId: string, zone: string, instanceName: string) {}
	// async stopInstance(projectId: string, zone: string, instanceName: string) {}
}

/**
 * BigQuery Service
 */
export class BigQueryService {
	private client: GCPAPIClient

	constructor(env: Env, connection: GCPConnection) {
		this.client = new GCPAPIClient(env, connection)
	}

	async listDatasets(projectId: string) {
		return this.client.listDatasets(projectId)
	}

	// Add more BigQuery operations as needed
	// async runQuery(projectId: string, query: string) {}
	// async createDataset(projectId: string, datasetId: string) {}
}

/**
 * Cloud SQL Service
 */
export class CloudSQLService {
	private client: GCPAPIClient

	constructor(env: Env, connection: GCPConnection) {
		this.client = new GCPAPIClient(env, connection)
	}

	async listInstances(projectId: string) {
		return this.client.listCloudSQLInstances(projectId)
	}

	// Add more Cloud SQL operations as needed
	// async createInstance(projectId: string, instanceId: string, options: SQLInstanceOptions) {}
	// async getDatabaseList(projectId: string, instanceId: string) {}
}
