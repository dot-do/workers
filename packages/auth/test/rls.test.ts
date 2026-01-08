import { describe, it, expect, beforeEach } from 'vitest'
import {
  RLS,
  RLSPolicy,
  RLSContext,
  createRLS,
  PolicyOperation,
} from '../src/rls.js'

describe('Row Level Security (RLS)', () => {
  let rls: RLS
  let userId: string

  beforeEach(() => {
    rls = createRLS()
    userId = 'user-123'
  })

  describe('Policy Definition', () => {
    it('should define a simple RLS policy with auth.uid()', () => {
      const policy: RLSPolicy = {
        id: 'user_policy',
        table: 'documents',
        operation: 'select',
        using: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const policies = rls.getPolicies('documents')

      expect(policies).toHaveLength(1)
      expect(policies[0]?.using).toBe('user_id = auth.uid()')
    })

    it('should define policy with WITH CHECK expression for inserts', () => {
      const policy: RLSPolicy = {
        id: 'insert_policy',
        table: 'documents',
        operation: 'insert',
        withCheck: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const policies = rls.getPolicies('documents', 'insert')

      expect(policies).toHaveLength(1)
      expect(policies[0]?.withCheck).toBe('user_id = auth.uid()')
    })

    it('should support different policies for different operations', () => {
      rls.addPolicy({
        id: 'select_policy',
        table: 'documents',
        operation: 'select',
        using: 'public = true OR user_id = auth.uid()',
      })

      rls.addPolicy({
        id: 'update_policy',
        table: 'documents',
        operation: 'update',
        using: 'user_id = auth.uid()',
        withCheck: 'user_id = auth.uid()',
      })

      const selectPolicies = rls.getPolicies('documents', 'select')
      const updatePolicies = rls.getPolicies('documents', 'update')

      expect(selectPolicies).toHaveLength(1)
      expect(updatePolicies).toHaveLength(1)
      expect(selectPolicies[0]?.id).toBe('select_policy')
      expect(updatePolicies[0]?.id).toBe('update_policy')
    })
  })

  describe('Policy Parsing and SQL Generation', () => {
    it('should parse auth.uid() and convert to parameter binding', () => {
      const policy: RLSPolicy = {
        id: 'user_policy',
        table: 'documents',
        operation: 'select',
        using: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }
      const sqlFilter = rls.generateWhereClause('documents', 'select', context)

      expect(sqlFilter.sql).toBe('user_id = ?')
      expect(sqlFilter.params).toEqual([userId])
    })

    it('should handle complex expressions with multiple auth.uid() calls', () => {
      const policy: RLSPolicy = {
        id: 'complex_policy',
        table: 'documents',
        operation: 'select',
        using: 'owner_id = auth.uid() OR shared_with = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }
      const sqlFilter = rls.generateWhereClause('documents', 'select', context)

      expect(sqlFilter.sql).toBe('owner_id = ? OR shared_with = ?')
      expect(sqlFilter.params).toEqual([userId, userId])
    })

    it('should handle policies without auth.uid()', () => {
      const policy: RLSPolicy = {
        id: 'public_policy',
        table: 'documents',
        operation: 'select',
        using: 'public = true',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }
      const sqlFilter = rls.generateWhereClause('documents', 'select', context)

      expect(sqlFilter.sql).toBe('public = true')
      expect(sqlFilter.params).toEqual([])
    })
  })

  describe('Query Filtering with RLS', () => {
    it('should inject RLS filter into SELECT query', () => {
      const policy: RLSPolicy = {
        id: 'user_policy',
        table: 'documents',
        operation: 'select',
        using: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }

      const originalQuery = 'SELECT * FROM documents WHERE title LIKE ?'
      const params = ['%report%']

      const secured = rls.secureQuery(originalQuery, params, context)

      expect(secured.sql).toContain('user_id = ?')
      expect(secured.params).toContain(userId)
      expect(secured.params).toContain('%report%')
    })

    it('should handle SELECT query without existing WHERE clause', () => {
      const policy: RLSPolicy = {
        id: 'user_policy',
        table: 'documents',
        operation: 'select',
        using: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }

      const originalQuery = 'SELECT * FROM documents'
      const secured = rls.secureQuery(originalQuery, [], context)

      expect(secured.sql).toBe('SELECT * FROM documents WHERE (user_id = ?)')
      expect(secured.params).toEqual([userId])
    })

    it('should respect RLS filter for INSERT with WITH CHECK', () => {
      const policy: RLSPolicy = {
        id: 'insert_policy',
        table: 'documents',
        operation: 'insert',
        withCheck: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }

      // For INSERT, we check if the new row satisfies the policy
      const newRow = { title: 'New Doc', user_id: userId }
      const isAllowed = rls.checkInsert('documents', newRow, context)

      expect(isAllowed).toBe(true)
    })

    it('should deny INSERT if WITH CHECK fails', () => {
      const policy: RLSPolicy = {
        id: 'insert_policy',
        table: 'documents',
        operation: 'insert',
        withCheck: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }

      const newRow = { title: 'New Doc', user_id: 'different-user' }
      const isAllowed = rls.checkInsert('documents', newRow, context)

      expect(isAllowed).toBe(false)
    })

    it('should check RLS for UPDATE on both old and new rows', () => {
      const policy: RLSPolicy = {
        id: 'update_policy',
        table: 'documents',
        operation: 'update',
        using: 'user_id = auth.uid()',
        withCheck: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }

      // Old row must satisfy USING, new row must satisfy WITH CHECK
      const oldRow = { id: '1', title: 'Old', user_id: userId }
      const newRow = { id: '1', title: 'Updated', user_id: userId }

      const isAllowed = rls.checkUpdate('documents', oldRow, newRow, context)

      expect(isAllowed).toBe(true)
    })

    it('should deny UPDATE if old row does not satisfy USING', () => {
      const policy: RLSPolicy = {
        id: 'update_policy',
        table: 'documents',
        operation: 'update',
        using: 'user_id = auth.uid()',
        withCheck: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }

      const oldRow = { id: '1', title: 'Old', user_id: 'different-user' }
      const newRow = { id: '1', title: 'Updated', user_id: userId }

      const isAllowed = rls.checkUpdate('documents', oldRow, newRow, context)

      expect(isAllowed).toBe(false)
    })

    it('should check RLS before DELETE', () => {
      const policy: RLSPolicy = {
        id: 'delete_policy',
        table: 'documents',
        operation: 'delete',
        using: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }

      const row = { id: '1', title: 'Doc', user_id: userId }
      const isAllowed = rls.checkDelete('documents', row, context)

      expect(isAllowed).toBe(true)
    })

    it('should deny DELETE if row does not satisfy USING', () => {
      const policy: RLSPolicy = {
        id: 'delete_policy',
        table: 'documents',
        operation: 'delete',
        using: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { userId }

      const row = { id: '1', title: 'Doc', user_id: 'different-user' }
      const isAllowed = rls.checkDelete('documents', row, context)

      expect(isAllowed).toBe(false)
    })
  })

  describe('Service Role Bypass', () => {
    it('should bypass RLS with service_role key', () => {
      const policy: RLSPolicy = {
        id: 'user_policy',
        table: 'documents',
        operation: 'select',
        using: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { role: 'service_role' }

      const originalQuery = 'SELECT * FROM documents'
      const secured = rls.secureQuery(originalQuery, [], context)

      // Service role should bypass RLS - query unchanged
      expect(secured.sql).toBe(originalQuery)
      expect(secured.params).toEqual([])
    })

    it('should not bypass RLS with authenticated role', () => {
      const policy: RLSPolicy = {
        id: 'user_policy',
        table: 'documents',
        operation: 'select',
        using: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { role: 'authenticated', userId }

      const originalQuery = 'SELECT * FROM documents'
      const secured = rls.secureQuery(originalQuery, [], context)

      // Authenticated role should apply RLS
      expect(secured.sql).toContain('WHERE')
      expect(secured.params).toContain(userId)
    })

    it('should bypass INSERT check with service_role', () => {
      const policy: RLSPolicy = {
        id: 'insert_policy',
        table: 'documents',
        operation: 'insert',
        withCheck: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = { role: 'service_role' }

      const newRow = { title: 'Admin Doc', user_id: 'any-user' }
      const isAllowed = rls.checkInsert('documents', newRow, context)

      expect(isAllowed).toBe(true)
    })
  })

  describe('Multiple Policies Combination', () => {
    it('should combine multiple policies with OR', () => {
      rls.addPolicy({
        id: 'owner_policy',
        table: 'documents',
        operation: 'select',
        using: 'user_id = auth.uid()',
      })

      rls.addPolicy({
        id: 'public_policy',
        table: 'documents',
        operation: 'select',
        using: 'public = true',
      })

      const context: RLSContext = { userId }
      const sqlFilter = rls.generateWhereClause('documents', 'select', context)

      // Multiple policies should be combined with OR
      expect(sqlFilter.sql).toContain('OR')
      expect(sqlFilter.sql).toContain('user_id = ?')
      expect(sqlFilter.sql).toContain('public = true')
    })

    it('should handle three or more policies with OR', () => {
      rls.addPolicy({
        id: 'owner_policy',
        table: 'documents',
        operation: 'select',
        using: 'owner_id = auth.uid()',
      })

      rls.addPolicy({
        id: 'shared_policy',
        table: 'documents',
        operation: 'select',
        using: 'shared_with = auth.uid()',
      })

      rls.addPolicy({
        id: 'public_policy',
        table: 'documents',
        operation: 'select',
        using: 'public = true',
      })

      const context: RLSContext = { userId }
      const sqlFilter = rls.generateWhereClause('documents', 'select', context)

      expect(sqlFilter.sql).toBe('(owner_id = ?) OR (shared_with = ?) OR (public = true)')
      expect(sqlFilter.params).toEqual([userId, userId])
    })
  })

  describe('Error Handling', () => {
    it('should throw error if userId is missing when auth.uid() is used', () => {
      const policy: RLSPolicy = {
        id: 'user_policy',
        table: 'documents',
        operation: 'select',
        using: 'user_id = auth.uid()',
      }

      rls.addPolicy(policy)
      const context: RLSContext = {} // No userId

      expect(() => {
        rls.generateWhereClause('documents', 'select', context)
      }).toThrow('auth.uid() requires userId in context')
    })

    it('should return empty filter if no policies exist for table', () => {
      const context: RLSContext = { userId }
      const sqlFilter = rls.generateWhereClause('nonexistent_table', 'select', context)

      expect(sqlFilter.sql).toBe('')
      expect(sqlFilter.params).toEqual([])
    })
  })
})
