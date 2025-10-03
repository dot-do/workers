/**
 * Role-Based Access Control (RBAC)
 * Handles permission checks and role management
 */

import type { AuthServiceEnv, User, Permission, PermissionCheck, Role, RolePermissions } from './types'
import { ForbiddenError } from './types'
import { generateUUID } from './utils'

/**
 * Default role permissions
 */
const ROLE_PERMISSIONS: RolePermissions = {
  admin: ['*'], // All permissions
  user: ['things:read', 'things:write', 'relationships:read', 'relationships:write', 'ai:read', 'ai:write', 'search:read', 'auth:read'],
  viewer: ['things:read', 'relationships:read', 'search:read'],
}

/**
 * Check if user has permission for a resource and action
 */
export async function checkPermission(env: AuthServiceEnv, check: PermissionCheck): Promise<boolean> {
  const { userId, resource, action, organizationId } = check

  // Get user
  const userResult = await env.DB.query({
    sql: 'SELECT * FROM users WHERE id = ? LIMIT 1',
    params: [userId],
  })

  if (!userResult?.rows || userResult.rows.length === 0) {
    return false
  }

  const user = userResult.rows[0]
  const role = (user.role as Role) || 'viewer'

  // Admin has all permissions
  if (role === 'admin') {
    return true
  }

  // Check role-based permissions
  const rolePerms = ROLE_PERMISSIONS[role]
  if (!rolePerms) {
    return false
  }

  // Wildcard permission
  if (rolePerms.includes('*')) {
    return true
  }

  // Exact match
  const permission = `${resource}:${action}`
  if (rolePerms.includes(permission)) {
    return true
  }

  // Resource wildcard (e.g., "things:*")
  const resourceWildcard = `${resource}:*`
  if (rolePerms.includes(resourceWildcard)) {
    return true
  }

  // Check custom permissions in database
  const permResult = await env.DB.query({
    sql: `
      SELECT * FROM permissions
      WHERE user_id = ?
        AND resource = ?
        AND action = ?
        AND (organization_id = ? OR organization_id IS NULL)
      LIMIT 1
    `,
    params: [userId, resource, action, organizationId || null],
  })

  return permResult?.rows && permResult.rows.length > 0
}

/**
 * Require permission (throws ForbiddenError if denied)
 */
export async function requirePermission(env: AuthServiceEnv, check: PermissionCheck): Promise<void> {
  const hasPermission = await checkPermission(env, check)

  if (!hasPermission) {
    throw new ForbiddenError(`Permission denied: ${check.resource}:${check.action}`)
  }
}

/**
 * Grant custom permission to user
 */
export async function grantPermission(env: AuthServiceEnv, userId: string, resource: string, action: string, organizationId?: string): Promise<Permission> {
  const id = generateUUID()
  const now = new Date()

  await env.DB.execute({
    sql: `
      INSERT INTO permissions (id, user_id, resource, action, organization_id, granted_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    params: [id, userId, resource, action, organizationId || null, now.toISOString()],
  })

  return {
    id,
    userId,
    resource,
    action,
    organizationId,
    grantedAt: now,
  }
}

/**
 * Revoke custom permission from user
 */
export async function revokePermission(env: AuthServiceEnv, userId: string, resource: string, action: string, organizationId?: string): Promise<boolean> {
  const result = await env.DB.execute({
    sql: `
      DELETE FROM permissions
      WHERE user_id = ?
        AND resource = ?
        AND action = ?
        AND (organization_id = ? OR organization_id IS NULL)
    `,
    params: [userId, resource, action, organizationId || null],
  })

  return result.changes > 0
}

/**
 * List all permissions for a user
 */
export async function listUserPermissions(env: AuthServiceEnv, userId: string, organizationId?: string): Promise<Permission[]> {
  // Get user role permissions
  const userResult = await env.DB.query({
    sql: 'SELECT * FROM users WHERE id = ? LIMIT 1',
    params: [userId],
  })

  if (!userResult?.rows || userResult.rows.length === 0) {
    return []
  }

  const user = userResult.rows[0]
  const role = (user.role as Role) || 'viewer'
  const rolePerms = ROLE_PERMISSIONS[role]

  // Convert role permissions to Permission objects
  const permissions: Permission[] = rolePerms.map(perm => {
    const [resource, action] = perm.split(':')
    return {
      id: `role-${role}`,
      userId,
      resource,
      action,
      grantedAt: new Date(user.created_at as string),
    }
  })

  // Get custom permissions from database
  const customResult = await env.DB.query({
    sql: `
      SELECT * FROM permissions
      WHERE user_id = ?
        AND (organization_id = ? OR organization_id IS NULL)
    `,
    params: [userId, organizationId || null],
  })

  if (customResult?.rows) {
    for (const row of customResult.rows) {
      permissions.push({
        id: row.id as string,
        userId: row.user_id as string,
        resource: row.resource as string,
        action: row.action as string,
        organizationId: row.organization_id as string | undefined,
        grantedAt: new Date(row.granted_at as string),
      })
    }
  }

  return permissions
}

/**
 * Check if user has role
 */
export async function hasRole(env: AuthServiceEnv, userId: string, role: Role): Promise<boolean> {
  const userResult = await env.DB.query({
    sql: 'SELECT role FROM users WHERE id = ? LIMIT 1',
    params: [userId],
  })

  if (!userResult?.rows || userResult.rows.length === 0) {
    return false
  }

  return (userResult.rows[0].role as Role) === role
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(env: AuthServiceEnv, userId: string, role: Role): Promise<boolean> {
  const now = new Date()

  const result = await env.DB.execute({
    sql: 'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
    params: [role, now.toISOString(), userId],
  })

  return result.changes > 0
}

/**
 * Get all users with a specific role
 */
export async function getUsersByRole(env: AuthServiceEnv, role: Role): Promise<User[]> {
  const result = await env.DB.query({
    sql: 'SELECT * FROM users WHERE role = ?',
    params: [role],
  })

  if (!result?.rows) {
    return []
  }

  return result.rows.map((row: any) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    role: row.role as Role,
    emailVerified: row.email_verified,
    workosId: row.workos_id,
    organizationId: row.organization_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }))
}

/**
 * Check if action is a mutation (write, delete, admin)
 */
export function isMutation(action: string): boolean {
  return ['write', 'delete', 'admin', 'create', 'update'].includes(action)
}

/**
 * Require admin role
 */
export async function requireAdmin(env: AuthServiceEnv, userId: string): Promise<void> {
  const isAdmin = await hasRole(env, userId, 'admin')

  if (!isAdmin) {
    throw new ForbiddenError('Admin access required')
  }
}

/**
 * Require specific role
 */
export async function requireRole(env: AuthServiceEnv, userId: string, role: Role): Promise<void> {
  const hasRequiredRole = await hasRole(env, userId, role)

  if (!hasRequiredRole) {
    throw new ForbiddenError(`Role '${role}' required`)
  }
}

/**
 * Get effective permissions (role + custom)
 */
export async function getEffectivePermissions(env: AuthServiceEnv, userId: string, organizationId?: string): Promise<string[]> {
  const permissions = await listUserPermissions(env, userId, organizationId)

  return permissions.map(p => `${p.resource}:${p.action}`)
}
