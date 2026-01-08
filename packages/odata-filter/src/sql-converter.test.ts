import { describe, it, expect } from 'vitest'
import { parseFilter } from './parser'
import { filterToSQL, SQLConverter } from './sql-converter'

describe('SQL Converter', () => {
  describe('Binary expressions', () => {
    it('should convert eq operator to =', () => {
      const result = parseFilter("status eq 'active'")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('status = ?')
      expect(params).toEqual(['active'])
    })

    it('should convert ne operator to !=', () => {
      const result = parseFilter('count ne 0')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('count != ?')
      expect(params).toEqual([0])
    })

    it('should convert gt operator to >', () => {
      const result = parseFilter('age gt 18')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('age > ?')
      expect(params).toEqual([18])
    })

    it('should convert ge operator to >=', () => {
      const result = parseFilter('age ge 21')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('age >= ?')
      expect(params).toEqual([21])
    })

    it('should convert lt operator to <', () => {
      const result = parseFilter('price lt 100')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('price < ?')
      expect(params).toEqual([100])
    })

    it('should convert le operator to <=', () => {
      const result = parseFilter('price le 99.99')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('price <= ?')
      expect(params).toEqual([99.99])
    })
  })

  describe('Logical expressions', () => {
    it('should convert AND expressions', () => {
      const result = parseFilter("status eq 'active' and age gt 18")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('(status = ? AND age > ?)')
      expect(params).toEqual(['active', 18])
    })

    it('should convert OR expressions', () => {
      const result = parseFilter("status eq 'active' or status eq 'pending'")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('(status = ? OR status = ?)')
      expect(params).toEqual(['active', 'pending'])
    })

    it('should handle nested logical expressions', () => {
      const result = parseFilter("(a eq 1 and b eq 2) or c eq 3")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('((a = ? AND b = ?) OR c = ?)')
      expect(params).toEqual([1, 2, 3])
    })
  })

  describe('Unary expressions', () => {
    it('should convert NOT expressions', () => {
      const result = parseFilter("not status eq 'inactive'")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('NOT (status = ?)')
      expect(params).toEqual(['inactive'])
    })

    it('should handle nested NOT expressions', () => {
      const result = parseFilter('not not active eq true')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('NOT (NOT (active = ?))')
      expect(params).toEqual([true])
    })
  })

  describe('Function calls', () => {
    it('should convert contains to LIKE with wildcards', () => {
      const result = parseFilter("contains(name, 'John')")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('name LIKE ?')
      expect(params).toEqual(['%John%'])
    })

    it('should convert startswith to LIKE with trailing wildcard', () => {
      const result = parseFilter("startswith(email, 'admin')")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('email LIKE ?')
      expect(params).toEqual(['admin%'])
    })

    it('should convert endswith to LIKE with leading wildcard', () => {
      const result = parseFilter("endswith(domain, '.com')")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('domain LIKE ?')
      expect(params).toEqual(['%.com'])
    })
  })

  describe('Literal types', () => {
    it('should parameterize string literals', () => {
      const result = parseFilter("name eq 'John Doe'")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('name = ?')
      expect(params).toEqual(['John Doe'])
    })

    it('should parameterize number literals', () => {
      const result = parseFilter('count eq 42')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('count = ?')
      expect(params).toEqual([42])
    })

    it('should parameterize boolean literals', () => {
      const result = parseFilter('active eq true')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('active = ?')
      expect(params).toEqual([true])
    })

    it('should parameterize null literals', () => {
      const result = parseFilter('deletedAt eq null')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('deletedAt = ?')
      expect(params).toEqual([null])
    })
  })

  describe('Complex expressions', () => {
    it('should convert complex filter with multiple conditions', () => {
      const result = parseFilter(
        "status eq 'active' and age gt 18 and verified eq true"
      )
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('((status = ? AND age > ?) AND verified = ?)')
      expect(params).toEqual(['active', 18, true])
    })

    it('should convert filter with functions and comparisons', () => {
      const result = parseFilter("contains(name, 'test') and age ge 21")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('(name LIKE ? AND age >= ?)')
      expect(params).toEqual(['%test%', 21])
    })

    it('should convert grouped expressions correctly', () => {
      const result = parseFilter(
        "(status eq 'active' or status eq 'pending') and verified eq true"
      )
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('((status = ? OR status = ?) AND verified = ?)')
      expect(params).toEqual(['active', 'pending', true])
    })

    it('should handle date comparisons', () => {
      const result = parseFilter(
        "createdAt gt '2024-01-01' and createdAt lt '2024-12-31'"
      )
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('(createdAt > ? AND createdAt < ?)')
      expect(params).toEqual(['2024-01-01', '2024-12-31'])
    })
  })

  describe('Edge cases', () => {
    it('should handle identifiers as-is', () => {
      const result = parseFilter("user_status eq 'active'")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('user_status = ?')
      expect(params).toEqual(['active'])
    })

    it('should handle negative numbers', () => {
      const result = parseFilter('temperature lt -10')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('temperature < ?')
      expect(params).toEqual([-10])
    })

    it('should handle decimal numbers', () => {
      const result = parseFilter('price eq 19.99')
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('price = ?')
      expect(params).toEqual([19.99])
    })

    it('should maintain parameter order', () => {
      const result = parseFilter("a eq 1 and b eq 2 and c eq 3")
      const { sql, params } = filterToSQL(result.ast)

      expect(params).toEqual([1, 2, 3])
      expect(sql).toBe('((a = ? AND b = ?) AND c = ?)')
    })
  })

  describe('Real-world examples', () => {
    it('should convert Dynamics 365 style filter', () => {
      const result = parseFilter("revenue gt 1000000 and statecode eq 0")
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('(revenue > ? AND statecode = ?)')
      expect(params).toEqual([1000000, 0])
    })

    it('should convert user search filter', () => {
      const result = parseFilter(
        "contains(name, 'John') and active eq true and role eq 'admin'"
      )
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('((name LIKE ? AND active = ?) AND role = ?)')
      expect(params).toEqual(['%John%', true, 'admin'])
    })

    it('should convert date range filter', () => {
      const result = parseFilter(
        "createdAt ge '2024-01-01' and createdAt le '2024-12-31' and status eq 'completed'"
      )
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('((createdAt >= ? AND createdAt <= ?) AND status = ?)')
      expect(params).toEqual(['2024-01-01', '2024-12-31', 'completed'])
    })

    it('should convert multi-status filter', () => {
      const result = parseFilter(
        "(status eq 'active' or status eq 'pending' or status eq 'review') and priority ge 3"
      )
      const { sql, params } = filterToSQL(result.ast)

      expect(sql).toBe('(((status = ? OR status = ?) OR status = ?) AND priority >= ?)')
      expect(params).toEqual(['active', 'pending', 'review', 3])
    })
  })
})
