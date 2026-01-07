import { describe, it, expect, beforeEach } from 'vitest'
import {
  RBAC,
  Role,
  AuthContext,
  RBACConfig,
  createRBAC,
  checkPermission,
  hasRole,
  hasPermission,
  requirePermissions,
  requireRole,
  PermissionDeniedError,
} from '../src/index.js'

describe('RBAC Permission Checking', () => {
  // Test data
  const adminRole: Role = {
    id: 'admin',
    name: 'Administrator',
    permissions: ['read', 'write', 'delete', 'admin'],
    inherits: [],
  }

  const editorRole: Role = {
    id: 'editor',
    name: 'Editor',
    permissions: ['read', 'write'],
    inherits: [],
  }

  const viewerRole: Role = {
    id: 'viewer',
    name: 'Viewer',
    permissions: ['read'],
    inherits: [],
  }

  const moderatorRole: Role = {
    id: 'moderator',
    name: 'Moderator',
    permissions: ['moderate'],
    inherits: ['editor'], // Inherits from editor
  }

  const config: RBACConfig = {
    roles: [adminRole, editorRole, viewerRole, moderatorRole],
    defaultRole: 'viewer',
  }

  let rbac: RBAC

  beforeEach(() => {
    rbac = createRBAC(config)
  })

  describe('createRBAC', () => {
    it('should create an RBAC instance with configured roles', () => {
      expect(rbac).toBeDefined()
      expect(rbac.getRoles()).toHaveLength(4)
    })

    it('should set the default role', () => {
      expect(rbac.getDefaultRole()).toBe('viewer')
    })

    it('should throw error if invalid role in inherits', () => {
      const invalidConfig: RBACConfig = {
        roles: [{
          id: 'test',
          name: 'Test',
          permissions: [],
          inherits: ['nonexistent'],
        }],
      }
      expect(() => createRBAC(invalidConfig)).toThrow('Role "nonexistent" not found')
    })
  })

  describe('hasRole', () => {
    it('should return true if user has the role directly', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['editor'],
        permissions: [],
      }
      expect(hasRole(context, 'editor')).toBe(true)
    })

    it('should return false if user does not have the role', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['viewer'],
        permissions: [],
      }
      expect(hasRole(context, 'admin')).toBe(false)
    })

    it('should return true if user has multiple roles including the target', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['viewer', 'editor'],
        permissions: [],
      }
      expect(hasRole(context, 'editor')).toBe(true)
    })

    it('should return false for empty roles array', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: [],
        permissions: [],
      }
      expect(hasRole(context, 'viewer')).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should return true if user has permission directly', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: [],
        permissions: ['read'],
      }
      expect(hasPermission(context, 'read')).toBe(true)
    })

    it('should return false if user does not have permission', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: [],
        permissions: ['read'],
      }
      expect(hasPermission(context, 'write')).toBe(false)
    })

    it('should return true if user has permission via role', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['editor'],
        permissions: [],
      }
      expect(rbac.hasPermission(context, 'write')).toBe(true)
    })

    it('should return true if user has permission via inherited role', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['moderator'],
        permissions: [],
      }
      // Moderator inherits from editor which has 'write'
      expect(rbac.hasPermission(context, 'write')).toBe(true)
    })

    it('should handle wildcard permission', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: [],
        permissions: ['*'],
      }
      expect(hasPermission(context, 'anything')).toBe(true)
    })
  })

  describe('checkPermission', () => {
    it('should return true for valid permission', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['admin'],
        permissions: [],
      }
      expect(rbac.checkPermission(context, 'delete')).toBe(true)
    })

    it('should return false for missing permission', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['viewer'],
        permissions: [],
      }
      expect(rbac.checkPermission(context, 'delete')).toBe(false)
    })

    it('should check multiple permissions (all required)', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['editor'],
        permissions: [],
      }
      expect(rbac.checkPermissions(context, ['read', 'write'])).toBe(true)
      expect(rbac.checkPermissions(context, ['read', 'delete'])).toBe(false)
    })

    it('should support checking any of multiple permissions', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['viewer'],
        permissions: [],
      }
      expect(rbac.checkAnyPermission(context, ['read', 'write'])).toBe(true)
      expect(rbac.checkAnyPermission(context, ['delete', 'admin'])).toBe(false)
    })
  })

  describe('resource-based permissions', () => {
    it('should check permission on specific resource', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['editor'],
        permissions: [],
        resourcePermissions: {
          'document:123': ['read', 'write'],
        },
      }
      expect(rbac.checkResourcePermission(context, 'document:123', 'write')).toBe(true)
      expect(rbac.checkResourcePermission(context, 'document:456', 'write')).toBe(false)
    })

    it('should fallback to role-based permission for resources', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['admin'],
        permissions: [],
      }
      // Admin has all permissions, so should have access to any resource
      expect(rbac.checkResourcePermission(context, 'document:123', 'delete')).toBe(true)
    })
  })

  describe('requirePermissions decorator/guard', () => {
    it('should allow access when permission is present', async () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['editor'],
        permissions: [],
      }
      const guard = requirePermissions(rbac, ['read'])
      await expect(guard(context)).resolves.toBeUndefined()
    })

    it('should throw PermissionDeniedError when permission is missing', async () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['viewer'],
        permissions: [],
      }
      const guard = requirePermissions(rbac, ['delete'])
      await expect(guard(context)).rejects.toThrow(PermissionDeniedError)
    })

    it('should include missing permissions in error', async () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['viewer'],
        permissions: [],
      }
      const guard = requirePermissions(rbac, ['delete', 'admin'])
      try {
        await guard(context)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionDeniedError)
        expect((error as PermissionDeniedError).missingPermissions).toContain('delete')
        expect((error as PermissionDeniedError).missingPermissions).toContain('admin')
      }
    })
  })

  describe('requireRole guard', () => {
    it('should allow access when role is present', async () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['admin'],
        permissions: [],
      }
      const guard = requireRole(['admin'])
      await expect(guard(context)).resolves.toBeUndefined()
    })

    it('should throw error when role is missing', async () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['viewer'],
        permissions: [],
      }
      const guard = requireRole(['admin'])
      await expect(guard(context)).rejects.toThrow(PermissionDeniedError)
    })

    it('should allow if user has any of the required roles', async () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: ['editor'],
        permissions: [],
      }
      const guard = requireRole(['admin', 'editor'])
      await expect(guard(context)).resolves.toBeUndefined()
    })
  })

  describe('role inheritance', () => {
    it('should resolve inherited permissions', () => {
      const permissions = rbac.getEffectivePermissions('moderator')
      expect(permissions).toContain('moderate')
      expect(permissions).toContain('read')
      expect(permissions).toContain('write')
    })

    it('should handle deep inheritance', () => {
      const deepConfig: RBACConfig = {
        roles: [
          { id: 'base', name: 'Base', permissions: ['base'], inherits: [] },
          { id: 'level1', name: 'Level 1', permissions: ['level1'], inherits: ['base'] },
          { id: 'level2', name: 'Level 2', permissions: ['level2'], inherits: ['level1'] },
        ],
      }
      const deepRbac = createRBAC(deepConfig)
      const permissions = deepRbac.getEffectivePermissions('level2')
      expect(permissions).toContain('base')
      expect(permissions).toContain('level1')
      expect(permissions).toContain('level2')
    })

    it('should handle circular inheritance gracefully', () => {
      // This should be detected and handled during validation
      const circularConfig: RBACConfig = {
        roles: [
          { id: 'a', name: 'A', permissions: ['a'], inherits: ['b'] },
          { id: 'b', name: 'B', permissions: ['b'], inherits: ['a'] },
        ],
      }
      expect(() => createRBAC(circularConfig)).toThrow('Circular inheritance detected')
    })
  })

  describe('AuthContext helpers', () => {
    it('should create anonymous context', () => {
      const context = AuthContext.anonymous()
      expect(context.userId).toBeUndefined()
      expect(context.roles).toEqual([])
      expect(context.permissions).toEqual([])
    })

    it('should create system context with full permissions', () => {
      const context = AuthContext.system()
      expect(context.userId).toBe('system')
      expect(context.permissions).toContain('*')
    })

    it('should merge contexts', () => {
      const base: AuthContext = {
        userId: 'user1',
        roles: ['viewer'],
        permissions: ['read'],
      }
      const additional: Partial<AuthContext> = {
        roles: ['editor'],
        permissions: ['write'],
      }
      const merged = AuthContext.merge(base, additional)
      expect(merged.roles).toContain('viewer')
      expect(merged.roles).toContain('editor')
      expect(merged.permissions).toContain('read')
      expect(merged.permissions).toContain('write')
    })
  })

  describe('Permission string patterns', () => {
    it('should support namespaced permissions', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: [],
        permissions: ['documents:read', 'documents:write'],
      }
      expect(hasPermission(context, 'documents:read')).toBe(true)
      expect(hasPermission(context, 'documents:delete')).toBe(false)
    })

    it('should support wildcard namespace permissions', () => {
      const context: AuthContext = {
        userId: 'user1',
        roles: [],
        permissions: ['documents:*'],
      }
      expect(checkPermission(context, 'documents:read')).toBe(true)
      expect(checkPermission(context, 'documents:delete')).toBe(true)
      expect(checkPermission(context, 'users:read')).toBe(false)
    })
  })
})
