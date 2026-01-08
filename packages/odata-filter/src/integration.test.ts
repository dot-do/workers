import { describe, it, expect } from 'vitest'
import { odataToSQL } from './index'

/**
 * Integration tests for the complete OData filter pipeline
 */
describe('Integration: OData to SQL', () => {
  describe('Simple filters', () => {
    it('should convert simple equality filter', () => {
      const { sql, params } = odataToSQL("status eq 'active'")

      expect(sql).toBe('status = ?')
      expect(params).toEqual(['active'])
    })

    it('should convert numeric comparison', () => {
      const { sql, params } = odataToSQL('age gt 18')

      expect(sql).toBe('age > ?')
      expect(params).toEqual([18])
    })
  })

  describe('Compound filters', () => {
    it('should convert AND filter', () => {
      const { sql, params } = odataToSQL("status eq 'active' and verified eq true")

      expect(sql).toBe('(status = ? AND verified = ?)')
      expect(params).toEqual(['active', true])
    })

    it('should convert OR filter', () => {
      const { sql, params } = odataToSQL("role eq 'admin' or role eq 'moderator'")

      expect(sql).toBe('(role = ? OR role = ?)')
      expect(params).toEqual(['admin', 'moderator'])
    })

    it('should handle mixed AND/OR', () => {
      const { sql, params } = odataToSQL(
        "status eq 'active' and (role eq 'admin' or role eq 'moderator')"
      )

      expect(sql).toBe('(status = ? AND (role = ? OR role = ?))')
      expect(params).toEqual(['active', 'admin', 'moderator'])
    })
  })

  describe('String functions', () => {
    it('should convert contains function', () => {
      const { sql, params } = odataToSQL("contains(name, 'test')")

      expect(sql).toBe('name LIKE ?')
      expect(params).toEqual(['%test%'])
    })

    it('should convert startswith function', () => {
      const { sql, params } = odataToSQL("startswith(email, 'admin')")

      expect(sql).toBe('email LIKE ?')
      expect(params).toEqual(['admin%'])
    })

    it('should convert endswith function', () => {
      const { sql, params } = odataToSQL("endswith(filename, '.pdf')")

      expect(sql).toBe('filename LIKE ?')
      expect(params).toEqual(['%.pdf'])
    })
  })

  describe('NOT expressions', () => {
    it('should convert simple NOT', () => {
      const { sql, params } = odataToSQL("not deleted eq true")

      expect(sql).toBe('NOT (deleted = ?)')
      expect(params).toEqual([true])
    })

    it('should convert NOT with complex expression', () => {
      const { sql, params } = odataToSQL("not (status eq 'inactive' or archived eq true)")

      expect(sql).toBe('NOT ((status = ? OR archived = ?))')
      expect(params).toEqual(['inactive', true])
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle Microsoft Dynamics 365 account filter', () => {
      const { sql, params } = odataToSQL(
        "revenue gt 1000000 and statecode eq 0 and contains(name, 'Corp')"
      )

      expect(sql).toBe('((revenue > ? AND statecode = ?) AND name LIKE ?)')
      expect(params).toEqual([1000000, 0, '%Corp%'])
    })

    it('should handle SAP Business One customer filter', () => {
      const { sql, params } = odataToSQL(
        "CardType eq 'C' and (GroupCode eq 100 or GroupCode eq 101) and Frozen eq 'N'"
      )

      expect(sql).toBe('((CardType = ? AND (GroupCode = ? OR GroupCode = ?)) AND Frozen = ?)')
      expect(params).toEqual(['C', 100, 101, 'N'])
    })

    it('should handle Zendesk-style user filter', () => {
      const { sql, params } = odataToSQL(
        "role eq 'agent' and active eq true and contains(email, '@company.com')"
      )

      expect(sql).toBe('((role = ? AND active = ?) AND email LIKE ?)')
      expect(params).toEqual(['agent', true, '%@company.com%'])
    })

    it('should handle HubSpot contact filter', () => {
      const { sql, params } = odataToSQL(
        "lifecyclestage eq 'customer' and (hs_lead_status eq 'OPEN' or hs_lead_status eq 'IN_PROGRESS') and createdate ge '2024-01-01'"
      )

      expect(sql).toBe(
        '((lifecyclestage = ? AND (hs_lead_status = ? OR hs_lead_status = ?)) AND createdate >= ?)'
      )
      expect(params).toEqual(['customer', 'OPEN', 'IN_PROGRESS', '2024-01-01'])
    })

    it('should handle date range with status filter', () => {
      const { sql, params } = odataToSQL(
        "createdAt ge '2024-01-01' and createdAt le '2024-12-31' and status ne 'deleted'"
      )

      expect(sql).toBe('((createdAt >= ? AND createdAt <= ?) AND status != ?)')
      expect(params).toEqual(['2024-01-01', '2024-12-31', 'deleted'])
    })

    it('should handle complex search with multiple functions', () => {
      const { sql, params } = odataToSQL(
        "contains(title, 'important') and (startswith(category, 'Tech') or endswith(tags, 'urgent')) and priority ge 3"
      )

      expect(sql).toBe(
        '((title LIKE ? AND (category LIKE ? OR tags LIKE ?)) AND priority >= ?)'
      )
      expect(params).toEqual(['%important%', 'Tech%', '%urgent', 3])
    })

    it('should handle NULL checks', () => {
      const { sql, params } = odataToSQL("deletedAt eq null and archivedAt eq null")

      expect(sql).toBe('(deletedAt = ? AND archivedAt = ?)')
      expect(params).toEqual([null, null])
    })

    it('should handle boolean flags with negation', () => {
      const { sql, params } = odataToSQL(
        "verified eq true and not suspended eq true and emailConfirmed eq true"
      )

      expect(sql).toBe('((verified = ? AND NOT (suspended = ?)) AND emailConfirmed = ?)')
      expect(params).toEqual([true, true, true])
    })
  })

  describe('Error handling', () => {
    it('should throw on malformed expression', () => {
      expect(() => odataToSQL('status eq')).toThrow('Failed to parse filter expression')
    })

    it('should throw on invalid syntax', () => {
      expect(() => odataToSQL('status = "active"')).toThrow()
    })
  })

  describe('Edge cases', () => {
    it('should handle extra whitespace', () => {
      const { sql, params } = odataToSQL('  status   eq   "active"  ')

      expect(sql).toBe('status = ?')
      expect(params).toEqual(['active'])
    })

    it('should handle underscores in identifiers', () => {
      const { sql, params } = odataToSQL("user_status eq 'active'")

      expect(sql).toBe('user_status = ?')
      expect(params).toEqual(['active'])
    })

    it('should handle negative numbers', () => {
      const { sql, params } = odataToSQL('balance lt -100')

      expect(sql).toBe('balance < ?')
      expect(params).toEqual([-100])
    })

    it('should handle decimal numbers', () => {
      const { sql, params } = odataToSQL('price le 99.99')

      expect(sql).toBe('price <= ?')
      expect(params).toEqual([99.99])
    })
  })
})
