/**
 * AWS API Client Wrapper
 * Provides unified interface for AWS SDK clients with credential management
 */

import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity-provider'
import { STSClient, AssumeRoleWithWebIdentityCommand } from '@aws-sdk/client-sts'
import type { Env, AWSConnection, AWSCredentials } from './types'

export class AWSApiClient {
	constructor(
		private env: Env,
		private connection: AWSConnection
	) {}

	/**
	 * Get temporary AWS credentials from Cognito Identity Pool
	 */
	async getCredentials(): Promise<AWSCredentials> {
		const cacheKey = `aws:credentials:${this.connection.userId}`

		// Check cache first
		const cached = await this.env.AWS_CACHE.get(cacheKey, 'json')
		if (cached) {
			const creds = cached as AWSCredentials
			// Check if credentials are still valid (with 5 min buffer)
			if (new Date(creds.expiration).getTime() > Date.now() + 300000) {
				return creds
			}
		}

		// Get Cognito Identity ID
		const identityClient = new CognitoIdentityClient({
			region: this.connection.region,
		})

		let identityId = this.connection.identityId

		if (!identityId) {
			// Get Identity ID using ID token
			const getIdCommand = new GetIdCommand({
				IdentityPoolId: `${this.connection.region}:${this.connection.cognitoDomain}`,
				Logins: {
					[`cognito-idp.${this.connection.region}.amazonaws.com/${this.connection.cognitoDomain}`]: this.connection.idToken!,
				},
			})

			const idResult = await identityClient.send(getIdCommand)
			identityId = idResult.IdentityId!
		}

		// Get credentials for identity
		const getCredsCommand = new GetCredentialsForIdentityCommand({
			IdentityId: identityId,
			Logins: {
				[`cognito-idp.${this.connection.region}.amazonaws.com/${this.connection.cognitoDomain}`]: this.connection.idToken!,
			},
		})

		const credsResult = await identityClient.send(getCredsCommand)

		if (!credsResult.Credentials) {
			throw new Error('Failed to get AWS credentials')
		}

		const credentials: AWSCredentials = {
			accessKeyId: credsResult.Credentials.AccessKeyId!,
			secretAccessKey: credsResult.Credentials.SecretKey!,
			sessionToken: credsResult.Credentials.SessionToken!,
			expiration: credsResult.Credentials.Expiration!,
		}

		// Cache credentials
		const ttl = Math.floor((new Date(credentials.expiration).getTime() - Date.now()) / 1000)
		await this.env.AWS_CACHE.put(cacheKey, JSON.stringify(credentials), {
			expirationTtl: ttl,
		})

		return credentials
	}

	/**
	 * Get base AWS client configuration
	 */
	async getClientConfig() {
		const credentials = await this.getCredentials()

		return {
			region: this.connection.region,
			credentials: {
				accessKeyId: credentials.accessKeyId,
				secretAccessKey: credentials.secretAccessKey,
				sessionToken: credentials.sessionToken,
			},
		}
	}

	/**
	 * Assume role for additional permissions (if needed)
	 */
	async assumeRole(roleArn: string, sessionName: string = 'do-aws-session'): Promise<AWSCredentials> {
		const config = await this.getClientConfig()
		const stsClient = new STSClient(config)

		const command = new AssumeRoleWithWebIdentityCommand({
			RoleArn: roleArn,
			RoleSessionName: sessionName,
			WebIdentityToken: this.connection.idToken,
		})

		const result = await stsClient.send(command)

		if (!result.Credentials) {
			throw new Error('Failed to assume role')
		}

		return {
			accessKeyId: result.Credentials.AccessKeyId!,
			secretAccessKey: result.Credentials.SecretAccessKey!,
			sessionToken: result.Credentials.SessionToken!,
			expiration: result.Credentials.Expiration!,
		}
	}
}
