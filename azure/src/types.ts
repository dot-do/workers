/**
 * Azure OAuth and API Types
 */

export interface Env {
	// KV Namespace for token storage
	AZURE_TOKENS: KVNamespace

	// Service bindings
	DB: any
	AUTH: any

	// Environment variables
	AZURE_CLIENT_ID: string
	AZURE_CLIENT_SECRET: string
	AZURE_TENANT_ID?: string // Optional: for single-tenant apps
	AZURE_REDIRECT_URI?: string
}

// ========================================
// OAuth Types
// ========================================

export interface AzureOAuthConfig {
	clientId: string
	clientSecret: string
	tenantId?: string // Optional: use 'common' for multi-tenant
	redirectUri: string
	scopes: string[]
}

export interface AzureTokens {
	access_token: string
	refresh_token?: string
	id_token?: string
	token_type: string
	expires_in: number
	expires_at: number // Calculated timestamp
	scope: string
}

export interface AzureConnection {
	userId: string
	tenantId: string
	tokens: AzureTokens
	userInfo: AzureUserInfo
	createdAt: number
	updatedAt: number
}

// ========================================
// Microsoft Graph API Types
// ========================================

export interface AzureUserInfo {
	id: string
	displayName: string
	givenName?: string
	surname?: string
	userPrincipalName: string
	mail?: string
	mobilePhone?: string
	jobTitle?: string
	officeLocation?: string
	preferredLanguage?: string
}

export interface GraphApiResponse<T> {
	'@odata.context'?: string
	'@odata.nextLink'?: string
	value?: T[]
	error?: {
		code: string
		message: string
	}
}

export interface GraphMailMessage {
	id: string
	subject: string
	bodyPreview: string
	from: {
		emailAddress: {
			name: string
			address: string
		}
	}
	receivedDateTime: string
	hasAttachments: boolean
	importance: string
	isRead: boolean
}

export interface GraphCalendarEvent {
	id: string
	subject: string
	start: {
		dateTime: string
		timeZone: string
	}
	end: {
		dateTime: string
		timeZone: string
	}
	location?: {
		displayName: string
	}
	organizer: {
		emailAddress: {
			name: string
			address: string
		}
	}
}

// ========================================
// Azure Resource Manager Types
// ========================================

export interface AzureSubscription {
	id: string
	subscriptionId: string
	displayName: string
	state: string
	tenantId: string
}

export interface AzureResourceGroup {
	id: string
	name: string
	location: string
	properties: {
		provisioningState: string
	}
	tags?: Record<string, string>
}

export interface AzureResource {
	id: string
	name: string
	type: string
	location: string
	resourceGroup?: string
	tags?: Record<string, string>
	properties?: Record<string, any>
}

// ========================================
// RPC Interface Types
// ========================================

export interface ConnectOptions {
	userId: string
	code: string
	tenantId?: string
	state?: string
	codeVerifier?: string
}

export interface ConnectResult {
	success: boolean
	connection?: AzureConnection
	error?: string
}

export interface DisconnectOptions {
	userId: string
}

export interface DisconnectResult {
	success: boolean
	error?: string
}

export interface GetUserOptions {
	userId: string
}

export interface ListSubscriptionsOptions {
	userId: string
}

export interface ListResourceGroupsOptions {
	userId: string
	subscriptionId: string
}

export interface ListResourcesOptions {
	userId: string
	subscriptionId: string
	resourceGroupName?: string
}

export interface GetMailOptions {
	userId: string
	top?: number
	skip?: number
	filter?: string
}

export interface GetCalendarEventsOptions {
	userId: string
	startDateTime?: string
	endDateTime?: string
}

// ========================================
// Error Types
// ========================================

export interface AzureError {
	error: string
	error_description?: string
	error_codes?: number[]
	timestamp?: string
	trace_id?: string
	correlation_id?: string
}
