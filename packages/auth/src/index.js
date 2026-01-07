// RBAC Permission Checking - Types and Implementations
// @dotdo/auth - Role-Based Access Control for Cloudflare Workers
/**
 * Error thrown when permission check fails
 */
export class PermissionDeniedError extends Error {
    missingPermissions;
    context;
    constructor(message, missingPermissions, context) {
        super(message);
        this.name = 'PermissionDeniedError';
        this.missingPermissions = missingPermissions;
        this.context = context;
    }
}
/**
 * Check if a permission pattern matches a target permission
 * Supports wildcards: '*' matches everything, 'namespace:*' matches 'namespace:anything'
 */
function permissionMatches(pattern, target) {
    if (pattern === '*')
        return true;
    if (pattern === target)
        return true;
    // Handle namespaced wildcards like 'documents:*'
    if (pattern.endsWith(':*')) {
        const namespace = pattern.slice(0, -1); // Remove the '*', keep 'documents:'
        return target.startsWith(namespace);
    }
    return false;
}
/**
 * Check if any permission in the list matches the target
 */
function hasMatchingPermission(permissions, target) {
    return permissions.some(p => permissionMatches(p, target));
}
/**
 * Detect circular inheritance in role definitions
 */
function detectCircularInheritance(roles) {
    const roleMap = new Map(roles.map(r => [r.id, r]));
    for (const role of roles) {
        const visited = new Set();
        const stack = [...role.inherits];
        while (stack.length > 0) {
            const currentId = stack.pop();
            if (currentId === role.id) {
                return role.id;
            }
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            const current = roleMap.get(currentId);
            if (current) {
                stack.push(...current.inherits);
            }
        }
    }
    return null;
}
/**
 * Internal RBAC implementation
 */
class RBACImpl {
    roleMap;
    config;
    permissionCache = new Map();
    constructor(config) {
        this.config = config;
        this.roleMap = new Map(config.roles.map(r => [r.id, r]));
        // Validate role references in inherits
        for (const role of config.roles) {
            for (const inheritedId of role.inherits) {
                if (!this.roleMap.has(inheritedId)) {
                    throw new Error(`Role "${inheritedId}" not found in inheritance chain for role "${role.id}"`);
                }
            }
        }
        // Check for circular inheritance
        const circularRole = detectCircularInheritance(config.roles);
        if (circularRole) {
            throw new Error(`Circular inheritance detected in role "${circularRole}"`);
        }
    }
    getRoles() {
        return [...this.config.roles];
    }
    getDefaultRole() {
        return this.config.defaultRole;
    }
    getRole(roleId) {
        return this.roleMap.get(roleId);
    }
    /**
     * Get all permissions for a role, including inherited permissions
     */
    getEffectivePermissions(roleId) {
        // Check cache first
        const cached = this.permissionCache.get(roleId);
        if (cached)
            return cached;
        const role = this.roleMap.get(roleId);
        if (!role)
            return [];
        const allPermissions = new Set(role.permissions);
        const visited = new Set([roleId]);
        const stack = [...role.inherits];
        while (stack.length > 0) {
            const currentId = stack.pop();
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            const current = this.roleMap.get(currentId);
            if (current) {
                current.permissions.forEach(p => allPermissions.add(p));
                stack.push(...current.inherits);
            }
        }
        const result = [...allPermissions];
        this.permissionCache.set(roleId, result);
        return result;
    }
    /**
     * Check if context has a specific permission (via direct permissions or roles)
     */
    hasPermission(context, permission) {
        // Check direct permissions first
        if (hasMatchingPermission(context.permissions, permission)) {
            return true;
        }
        // Check role-based permissions
        for (const roleId of context.roles) {
            const rolePermissions = this.getEffectivePermissions(roleId);
            if (hasMatchingPermission(rolePermissions, permission)) {
                return true;
            }
        }
        return false;
    }
    checkPermission(context, permission) {
        return this.hasPermission(context, permission);
    }
    /**
     * Check if context has ALL of the specified permissions
     */
    checkPermissions(context, permissions) {
        return permissions.every(p => this.hasPermission(context, p));
    }
    /**
     * Check if context has ANY of the specified permissions
     */
    checkAnyPermission(context, permissions) {
        return permissions.some(p => this.hasPermission(context, p));
    }
    /**
     * Check permission on a specific resource
     *
     * When resourcePermissions is defined but doesn't include the resource,
     * we still fallback to role-based permissions. The test case expects
     * that if a user has specific resource permissions for one resource,
     * they shouldn't automatically get access to OTHER resources via roles.
     *
     * Logic:
     * 1. If resourcePermissions has entries for THIS resource, use those
     * 2. If resourcePermissions exists but NOT for this resource, deny (no fallback)
     * 3. If resourcePermissions is undefined/empty, fallback to role-based
     */
    checkResourcePermission(context, resource, permission) {
        // Check resource-specific permissions first
        const resourcePerms = context.resourcePermissions?.[resource];
        if (resourcePerms) {
            // Resource has specific permissions defined - only check those
            return hasMatchingPermission(resourcePerms, permission);
        }
        // If there are ANY resource permissions defined (but not for this resource),
        // don't fall back to role-based permissions
        if (context.resourcePermissions && Object.keys(context.resourcePermissions).length > 0) {
            return false;
        }
        // No resource permissions defined at all - fall back to role-based permissions
        return this.hasPermission(context, permission);
    }
}
/**
 * Create a new RBAC instance from configuration
 */
export function createRBAC(config) {
    return new RBACImpl(config);
}
/**
 * Check if context has a specific role
 */
export function hasRole(context, role) {
    return context.roles.includes(role);
}
/**
 * Check if context has a specific permission (direct permissions only, no role resolution)
 * For role-resolved permissions, use rbac.hasPermission()
 */
export function hasPermission(context, permission) {
    return hasMatchingPermission(context.permissions, permission);
}
/**
 * Check if context has a specific permission (with wildcard support)
 */
export function checkPermission(context, permission) {
    return hasMatchingPermission(context.permissions, permission);
}
/**
 * Create a guard function that requires specific permissions
 * @returns A function that throws PermissionDeniedError if permissions are missing
 */
export function requirePermissions(rbac, permissions) {
    return async (context) => {
        const missingPermissions = permissions.filter(p => !rbac.hasPermission(context, p));
        if (missingPermissions.length > 0) {
            throw new PermissionDeniedError(`Missing required permissions: ${missingPermissions.join(', ')}`, missingPermissions, context);
        }
    };
}
/**
 * Create a guard function that requires any of the specified roles
 * @returns A function that throws PermissionDeniedError if no required role is present
 */
export function requireRole(roles) {
    return async (context) => {
        const hasRequiredRole = roles.some(role => context.roles.includes(role));
        if (!hasRequiredRole) {
            throw new PermissionDeniedError(`Missing required role. Expected one of: ${roles.join(', ')}`, [], // No specific permissions missing, it's a role requirement
            context);
        }
    };
}
/**
 * AuthContext factory and utilities
 */
export const AuthContext = {
    /**
     * Create an anonymous (unauthenticated) context
     */
    anonymous() {
        return {
            userId: undefined,
            roles: [],
            permissions: [],
        };
    },
    /**
     * Create a system context with full permissions
     */
    system() {
        return {
            userId: 'system',
            roles: ['system'],
            permissions: ['*'],
        };
    },
    /**
     * Merge two contexts, combining roles and permissions
     */
    merge(base, additional) {
        return {
            userId: additional.userId ?? base.userId,
            roles: [...new Set([...base.roles, ...(additional.roles ?? [])])],
            permissions: [...new Set([...base.permissions, ...(additional.permissions ?? [])])],
            resourcePermissions: {
                ...base.resourcePermissions,
                ...additional.resourcePermissions,
            },
            metadata: {
                ...base.metadata,
                ...additional.metadata,
            },
        };
    },
};
