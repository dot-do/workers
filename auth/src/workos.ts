/**
 * WorkOS Integration
 * Handles OAuth, SSO, SCIM, Directory Sync, and Audit Logs
 */

import { WorkOS } from '@workos-inc/node'
import type { User as WorkOSUser, AuthenticationResponse } from '@workos-inc/node'
import type { AuthServiceEnv, WorkOSAuthResponse, WorkOSSSOOptions } from './types'

/**
 * Create WorkOS client instance
 */
export function createWorkOSClient(env: AuthServiceEnv): WorkOS {
  return new WorkOS(env.WORKOS_API_KEY, {
    clientId: env.WORKOS_CLIENT_ID,
  })
}

/**
 * Get AuthKit authorization URL for OAuth flow
 */
export async function getAuthorizationURL(env: AuthServiceEnv, options: { redirectUri: string; state?: string; provider?: string }): Promise<string> {
  const workos = createWorkOSClient(env)

  return workos.userManagement.getAuthorizationUrl({
    provider: options.provider || 'authkit',
    clientId: env.WORKOS_CLIENT_ID,
    redirectUri: options.redirectUri,
    state: options.state,
  })
}

/**
 * Exchange authorization code for access token and user info
 */
export async function exchangeCodeForToken(env: AuthServiceEnv, code: string): Promise<WorkOSAuthResponse> {
  const workos = createWorkOSClient(env)

  const response: AuthenticationResponse = await workos.userManagement.authenticateWithCode({
    clientId: env.WORKOS_CLIENT_ID,
    code,
  })

  const { accessToken, refreshToken, user, organizationId } = response

  // Decode JWT to get permissions
  const payload = JSON.parse(atob(accessToken.split('.')[1]))
  const permissions = payload.permissions || []

  return {
    user,
    accessToken,
    refreshToken,
    organizationId,
    permissions,
  }
}

/**
 * Get user profile from access token
 */
export async function getUserProfile(env: AuthServiceEnv, accessToken: string): Promise<WorkOSUser> {
  const workos = createWorkOSClient(env)

  return await workos.userManagement.getUser({
    accessToken,
  })
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(env: AuthServiceEnv, refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
  const workos = createWorkOSClient(env)

  const response = await workos.userManagement.authenticateWithRefreshToken({
    clientId: env.WORKOS_CLIENT_ID,
    refreshToken,
  })

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  }
}

/**
 * Get organization memberships for a user
 */
export async function getUserOrganizations(env: AuthServiceEnv, userId: string): Promise<any[]> {
  const workos = createWorkOSClient(env)

  const { data: memberships } = await workos.userManagement.listOrganizationMemberships({
    userId,
  })

  return memberships
}

/**
 * Get organization details
 */
export async function getOrganization(env: AuthServiceEnv, organizationId: string): Promise<any> {
  const workos = createWorkOSClient(env)
  return await workos.organizations.getOrganization(organizationId)
}

/**
 * Create organization
 */
export async function createOrganization(env: AuthServiceEnv, name: string, domains?: string[]): Promise<any> {
  const workos = createWorkOSClient(env)

  return await workos.organizations.createOrganization({
    name,
    domainData: domains?.map(domain => ({ domain })),
  })
}

/**
 * Get SSO authorization URL
 */
export async function getSSOAuthorizationURL(env: AuthServiceEnv, options: WorkOSSSOOptions): Promise<string> {
  const workos = createWorkOSClient(env)

  return workos.sso.getAuthorizationUrl({
    organizationId: options.organizationId,
    connection: options.connection,
    provider: options.provider,
    clientId: env.WORKOS_CLIENT_ID,
    redirectUri: options.redirectUri,
    state: options.state,
  })
}

/**
 * Authenticate with SSO code
 */
export async function authenticateWithSSO(env: AuthServiceEnv, code: string): Promise<{ profile: any; accessToken?: string }> {
  const workos = createWorkOSClient(env)

  const response = await workos.sso.getProfileAndToken({
    code,
    clientId: env.WORKOS_CLIENT_ID,
  })

  return {
    profile: response.profile,
    accessToken: response.accessToken,
  }
}

/**
 * List SSO connections for an organization
 */
export async function listSSOConnections(env: AuthServiceEnv, organizationId: string): Promise<any[]> {
  const workos = createWorkOSClient(env)

  const { data: connections } = await workos.sso.listConnections({
    organizationId,
  })

  return connections
}

/**
 * List directory users (SCIM)
 */
export async function listDirectoryUsers(env: AuthServiceEnv, directoryId: string, options?: { limit?: number; after?: string }): Promise<{ data: any[]; listMetadata: any }> {
  const workos = createWorkOSClient(env)

  return await workos.directorySync.listUsers({
    directory: directoryId,
    ...options,
  })
}

/**
 * List directory groups (SCIM)
 */
export async function listDirectoryGroups(env: AuthServiceEnv, directoryId: string, options?: { limit?: number; after?: string }): Promise<{ data: any[]; listMetadata: any }> {
  const workos = createWorkOSClient(env)

  return await workos.directorySync.listGroups({
    directory: directoryId,
    ...options,
  })
}

/**
 * Get directory details
 */
export async function getDirectory(env: AuthServiceEnv, directoryId: string): Promise<any> {
  const workos = createWorkOSClient(env)
  return await workos.directorySync.getDirectory(directoryId)
}

/**
 * List directories for organization
 */
export async function listDirectories(env: AuthServiceEnv, organizationId: string): Promise<{ data: any[]; listMetadata: any }> {
  const workos = createWorkOSClient(env)

  return await workos.directorySync.listDirectories({
    organizationId,
  })
}

/**
 * Create audit log event
 */
export async function createAuditLogEvent(
  env: AuthServiceEnv,
  organizationId: string,
  event: {
    action: string
    actorName?: string
    actorId?: string
    targetName?: string
    targetId?: string
    location?: string
    occurredAt?: string
    metadata?: Record<string, any>
  }
): Promise<void> {
  const workos = createWorkOSClient(env)

  await workos.auditLogs.createEvent(organizationId, event)
}

/**
 * Verify domain for organization
 */
export async function verifyDomain(env: AuthServiceEnv, organizationId: string, domain: string): Promise<any> {
  const workos = createWorkOSClient(env)

  return await workos.organizations.createOrganizationDomain(organizationId, {
    domain,
  })
}

/**
 * Delete user from WorkOS
 */
export async function deleteUser(env: AuthServiceEnv, userId: string): Promise<void> {
  const workos = createWorkOSClient(env)
  await workos.userManagement.deleteUser(userId)
}

/**
 * Update user profile
 */
export async function updateUser(
  env: AuthServiceEnv,
  userId: string,
  updates: {
    firstName?: string
    lastName?: string
    emailVerified?: boolean
  }
): Promise<WorkOSUser> {
  const workos = createWorkOSClient(env)

  return await workos.userManagement.updateUser({
    userId,
    ...updates,
  })
}

/**
 * Verify webhook signature (for WorkOS webhooks)
 */
export async function verifyWebhookSignature(env: AuthServiceEnv, payload: string, signature: string, timestamp: string): Promise<boolean> {
  if (!env.WORKOS_WEBHOOK_SECRET) {
    throw new Error('WORKOS_WEBHOOK_SECRET not configured')
  }

  const workos = createWorkOSClient(env)

  try {
    workos.webhooks.constructEvent({
      payload,
      sigHeader: signature,
      secret: env.WORKOS_WEBHOOK_SECRET,
    })
    return true
  } catch {
    return false
  }
}
