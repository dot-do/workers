/**
 * AWS Service Integrations
 * S3, Lambda, and other AWS service wrappers
 */

import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { LambdaClient, ListFunctionsCommand, InvokeCommand, GetFunctionCommand } from '@aws-sdk/client-lambda'
import type { AWSApiClient } from './api'
import type { S3Bucket, S3Object, S3ListOptions, LambdaFunction, LambdaInvocation, ListOptions } from './types'

export class S3Service {
	constructor(private apiClient: AWSApiClient) {}

	/**
	 * List all S3 buckets
	 */
	async listBuckets(): Promise<S3Bucket[]> {
		const config = await this.apiClient.getClientConfig()
		const s3Client = new S3Client(config)

		const command = new ListBucketsCommand({})
		const result = await s3Client.send(command)

		return (
			result.Buckets?.map((bucket) => ({
				name: bucket.Name!,
				creationDate: bucket.CreationDate!,
			})) || []
		)
	}

	/**
	 * List objects in an S3 bucket
	 */
	async listObjects(bucket: string, options: S3ListOptions = {}): Promise<{ objects: S3Object[]; nextToken?: string }> {
		const config = await this.apiClient.getClientConfig()
		const s3Client = new S3Client(config)

		const command = new ListObjectsV2Command({
			Bucket: bucket,
			Prefix: options.prefix,
			Delimiter: options.delimiter,
			MaxKeys: options.limit || 1000,
			ContinuationToken: options.nextToken,
		})

		const result = await s3Client.send(command)

		const objects =
			result.Contents?.map((obj) => ({
				key: obj.Key!,
				size: obj.Size || 0,
				lastModified: obj.LastModified!,
				etag: obj.ETag || '',
			})) || []

		return {
			objects,
			nextToken: result.NextContinuationToken,
		}
	}

	/**
	 * Get object from S3 bucket
	 */
	async getObject(bucket: string, key: string): Promise<ArrayBuffer> {
		const config = await this.apiClient.getClientConfig()
		const s3Client = new S3Client(config)

		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		})

		const result = await s3Client.send(command)

		if (!result.Body) {
			throw new Error('Object body is empty')
		}

		// Convert stream to ArrayBuffer
		const chunks: Uint8Array[] = []
		for await (const chunk of result.Body as any) {
			chunks.push(chunk)
		}

		const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
		const buffer = new Uint8Array(totalLength)
		let offset = 0
		for (const chunk of chunks) {
			buffer.set(chunk, offset)
			offset += chunk.length
		}

		return buffer.buffer
	}

	/**
	 * Put object to S3 bucket
	 */
	async putObject(bucket: string, key: string, body: ArrayBuffer | string, contentType?: string): Promise<void> {
		const config = await this.apiClient.getClientConfig()
		const s3Client = new S3Client(config)

		const command = new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: typeof body === 'string' ? Buffer.from(body) : Buffer.from(body),
			ContentType: contentType,
		})

		await s3Client.send(command)
	}

	/**
	 * Delete object from S3 bucket
	 */
	async deleteObject(bucket: string, key: string): Promise<void> {
		const config = await this.apiClient.getClientConfig()
		const s3Client = new S3Client(config)

		const command = new DeleteObjectCommand({
			Bucket: bucket,
			Key: key,
		})

		await s3Client.send(command)
	}
}

export class LambdaService {
	constructor(private apiClient: AWSApiClient) {}

	/**
	 * List Lambda functions
	 */
	async listFunctions(options: ListOptions = {}): Promise<{ functions: LambdaFunction[]; nextToken?: string }> {
		const config = await this.apiClient.getClientConfig()
		const lambdaClient = new LambdaClient(config)

		const command = new ListFunctionsCommand({
			MaxItems: options.limit || 50,
			Marker: options.nextToken,
		})

		const result = await lambdaClient.send(command)

		const functions =
			result.Functions?.map((fn) => ({
				functionName: fn.FunctionName!,
				functionArn: fn.FunctionArn!,
				runtime: fn.Runtime!,
				handler: fn.Handler!,
				codeSize: fn.CodeSize || 0,
				description: fn.Description,
				timeout: fn.Timeout || 3,
				memorySize: fn.MemorySize || 128,
				lastModified: fn.LastModified!,
				version: fn.Version!,
				role: fn.Role!,
			})) || []

		return {
			functions,
			nextToken: result.NextMarker,
		}
	}

	/**
	 * Get Lambda function details
	 */
	async getFunction(functionName: string): Promise<LambdaFunction> {
		const config = await this.apiClient.getClientConfig()
		const lambdaClient = new LambdaClient(config)

		const command = new GetFunctionCommand({
			FunctionName: functionName,
		})

		const result = await lambdaClient.send(command)

		if (!result.Configuration) {
			throw new Error('Function configuration not found')
		}

		const fn = result.Configuration

		return {
			functionName: fn.FunctionName!,
			functionArn: fn.FunctionArn!,
			runtime: fn.Runtime!,
			handler: fn.Handler!,
			codeSize: fn.CodeSize || 0,
			description: fn.Description,
			timeout: fn.Timeout || 3,
			memorySize: fn.MemorySize || 128,
			lastModified: fn.LastModified!,
			version: fn.Version!,
			role: fn.Role!,
		}
	}

	/**
	 * Invoke Lambda function
	 */
	async invoke(functionName: string, payload?: any, invocationType: 'RequestResponse' | 'Event' | 'DryRun' = 'RequestResponse'): Promise<LambdaInvocation> {
		const config = await this.apiClient.getClientConfig()
		const lambdaClient = new LambdaClient(config)

		const command = new InvokeCommand({
			FunctionName: functionName,
			InvocationType: invocationType,
			Payload: payload ? JSON.stringify(payload) : undefined,
			LogType: 'Tail', // Include last 4KB of logs
		})

		const result = await lambdaClient.send(command)

		let responsePayload: any
		if (result.Payload) {
			const decoder = new TextDecoder()
			const payloadStr = decoder.decode(result.Payload)
			try {
				responsePayload = JSON.parse(payloadStr)
			} catch {
				responsePayload = payloadStr
			}
		}

		return {
			statusCode: result.StatusCode,
			payload: responsePayload,
			logResult: result.LogResult ? atob(result.LogResult) : undefined,
			executedVersion: result.ExecutedVersion,
			functionError: result.FunctionError,
		}
	}
}
