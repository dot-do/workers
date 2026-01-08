/**
 * Tests for 目 (list/ls) glyph - List Operations
 *
 * This is a RED phase TDD test file. These tests define the API contract
 * for the list operations glyph before implementation exists.
 *
 * The 目 glyph represents rows of items (an eye with horizontal lines) -
 * a visual metaphor for list items or rows in a table.
 *
 * Covers:
 * - Query builder creation: 目(array)
 * - Filtering: .where({ field: { op: value } })
 * - Transformation: .map(fn)
 * - Ordering: .sort(key, direction)
 * - Limiting: .limit(n)
 * - Skipping: .offset(n) / .skip(n)
 * - Execution: .execute() / .toArray()
 * - Async iteration: for await (const item of 目(array))
 * - First/Last: .first() / .last()
 * - Count: .count()
 * - Method chaining
 * - ASCII alias: ls
 */

import { describe, it, expect, vi } from 'vitest'
// These imports will fail until implementation exists
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Module doesn't exist yet (RED phase)
import { 目, ls } from '../src/list.js'

interface User {
  id: string
  name: string
  age: number
  active?: boolean
  email?: string
}

const users: User[] = [
  { id: '1', name: 'Tom', age: 30, active: true, email: 'tom@example.com' },
  { id: '2', name: 'Priya', age: 28, active: true, email: 'priya@example.com' },
  { id: '3', name: 'Ralph', age: 35, active: false, email: 'ralph@example.com' },
  { id: '4', name: 'Quinn', age: 25, active: true, email: 'quinn@example.com' },
  { id: '5', name: 'Mark', age: 32, active: false, email: 'mark@example.com' },
]

describe('目 (list/ls) glyph - List Queries and Transformations', () => {
  describe('Query Builder Creation', () => {
    it('should wrap array in query builder', () => {
      const query = 目(users)
      expect(query).toBeDefined()
    })

    it('should accept empty array', () => {
      const query = 目([])
      expect(query).toBeDefined()
    })

    it('should not mutate original array', async () => {
      const original = [...users]
      const query = 目(users)
      await query.where({ age: { gt: 30 } }).execute()
      expect(users).toEqual(original)
    })

    it('should support typed arrays', () => {
      const query = 目<User>(users)
      expect(query).toBeDefined()
    })
  })

  describe('Filtering with .where()', () => {
    it('should filter with exact match', async () => {
      const result = await 目(users).where({ name: 'Tom' }).execute()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Tom')
    })

    it('should filter with gt (greater than) operator', async () => {
      const result = await 目(users).where({ age: { gt: 29 } }).execute()
      expect(result).toHaveLength(3) // Tom (30), Ralph (35), Mark (32)
      expect(result.every(u => u.age > 29)).toBe(true)
    })

    it('should filter with gte (greater than or equal) operator', async () => {
      const result = await 目(users).where({ age: { gte: 30 } }).execute()
      expect(result).toHaveLength(3) // Tom (30), Ralph (35), Mark (32)
      expect(result.every(u => u.age >= 30)).toBe(true)
    })

    it('should filter with lt (less than) operator', async () => {
      const result = await 目(users).where({ age: { lt: 30 } }).execute()
      expect(result).toHaveLength(2) // Priya (28), Quinn (25)
      expect(result.every(u => u.age < 30)).toBe(true)
    })

    it('should filter with lte (less than or equal) operator', async () => {
      const result = await 目(users).where({ age: { lte: 28 } }).execute()
      expect(result).toHaveLength(2) // Priya (28), Quinn (25)
      expect(result.every(u => u.age <= 28)).toBe(true)
    })

    it('should filter with ne (not equal) operator', async () => {
      const result = await 目(users).where({ name: { ne: 'Tom' } }).execute()
      expect(result).toHaveLength(4)
      expect(result.every(u => u.name !== 'Tom')).toBe(true)
    })

    it('should filter with in operator (array of values)', async () => {
      const result = await 目(users).where({ name: { in: ['Tom', 'Priya'] } }).execute()
      expect(result).toHaveLength(2)
      expect(result.map(u => u.name).sort()).toEqual(['Priya', 'Tom'])
    })

    it('should filter with nin (not in) operator', async () => {
      const result = await 目(users).where({ name: { nin: ['Tom', 'Priya'] } }).execute()
      expect(result).toHaveLength(3)
      expect(result.every(u => !['Tom', 'Priya'].includes(u.name))).toBe(true)
    })

    it('should filter with contains operator for string fields', async () => {
      const result = await 目(users).where({ email: { contains: 'example.com' } }).execute()
      expect(result).toHaveLength(5)
    })

    it('should filter with startsWith operator', async () => {
      const result = await 目(users).where({ name: { startsWith: 'T' } }).execute()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Tom')
    })

    it('should filter with endsWith operator', async () => {
      const result = await 目(users).where({ name: { endsWith: 'n' } }).execute()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Quinn')
    })

    it('should filter with boolean values', async () => {
      const result = await 目(users).where({ active: true }).execute()
      expect(result).toHaveLength(3) // Tom, Priya, Quinn
      expect(result.every(u => u.active === true)).toBe(true)
    })

    it('should combine multiple conditions (AND)', async () => {
      const result = await 目(users).where({ age: { gte: 28 }, active: true }).execute()
      expect(result).toHaveLength(2) // Tom (30, active), Priya (28, active)
    })

    it('should handle empty where clause (return all)', async () => {
      const result = await 目(users).where({}).execute()
      expect(result).toHaveLength(5)
    })

    it('should return empty array when no matches', async () => {
      const result = await 目(users).where({ age: { gt: 100 } }).execute()
      expect(result).toHaveLength(0)
    })
  })

  describe('Transformation with .map()', () => {
    it('should transform items with mapper function', async () => {
      const result = await 目(users).map(u => u.name).execute()
      expect(result).toEqual(['Tom', 'Priya', 'Ralph', 'Quinn', 'Mark'])
    })

    it('should transform to different shape', async () => {
      const result = await 目(users).map(u => ({ fullName: u.name, yearsOld: u.age })).execute()
      expect(result[0]).toEqual({ fullName: 'Tom', yearsOld: 30 })
    })

    it('should receive index as second argument', async () => {
      const result = await 目(users).map((u, i) => ({ ...u, index: i })).execute()
      expect(result[0].index).toBe(0)
      expect(result[4].index).toBe(4)
    })

    it('should chain map after where', async () => {
      const result = await 目(users)
        .where({ age: { gt: 29 } })
        .map(u => u.name)
        .execute()
      expect(result).toEqual(['Tom', 'Ralph', 'Mark'])
    })

    it('should support async mapper function', async () => {
      const result = await 目(users).map(async u => {
        await new Promise(r => setTimeout(r, 1))
        return u.name.toUpperCase()
      }).execute()
      expect(result).toEqual(['TOM', 'PRIYA', 'RALPH', 'QUINN', 'MARK'])
    })
  })

  describe('Ordering with .sort()', () => {
    it('should sort by field ascending by default', async () => {
      const result = await 目(users).sort('age').execute()
      expect(result[0].name).toBe('Quinn') // 25
      expect(result[4].name).toBe('Ralph') // 35
    })

    it('should sort by field ascending explicitly', async () => {
      const result = await 目(users).sort('age', 'asc').execute()
      expect(result[0].age).toBe(25)
      expect(result[4].age).toBe(35)
    })

    it('should sort by field descending', async () => {
      const result = await 目(users).sort('age', 'desc').execute()
      expect(result[0].name).toBe('Ralph') // 35
      expect(result[4].name).toBe('Quinn') // 25
    })

    it('should sort strings alphabetically', async () => {
      const result = await 目(users).sort('name', 'asc').execute()
      expect(result[0].name).toBe('Mark')
      expect(result[4].name).toBe('Tom')
    })

    it('should sort with custom comparator function', async () => {
      const result = await 目(users).sort((a, b) => b.age - a.age).execute()
      expect(result[0].age).toBe(35)
      expect(result[4].age).toBe(25)
    })

    it('should apply sort after where', async () => {
      const result = await 目(users)
        .where({ active: true })
        .sort('age', 'desc')
        .execute()
      expect(result[0].name).toBe('Tom') // 30
      expect(result[2].name).toBe('Quinn') // 25
    })
  })

  describe('Limiting with .limit()', () => {
    it('should limit results to specified count', async () => {
      const result = await 目(users).limit(2).execute()
      expect(result).toHaveLength(2)
    })

    it('should return all if limit exceeds array length', async () => {
      const result = await 目(users).limit(100).execute()
      expect(result).toHaveLength(5)
    })

    it('should return empty array for limit(0)', async () => {
      const result = await 目(users).limit(0).execute()
      expect(result).toHaveLength(0)
    })

    it('should work with other operations', async () => {
      const result = await 目(users)
        .where({ active: true })
        .sort('age', 'desc')
        .limit(2)
        .execute()
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Tom') // Oldest active
    })
  })

  describe('Skipping with .offset() / .skip()', () => {
    it('should skip first n items with offset()', async () => {
      const result = await 目(users).offset(2).execute()
      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('Ralph')
    })

    it('should skip first n items with skip() alias', async () => {
      const result = await 目(users).skip(2).execute()
      expect(result).toHaveLength(3)
    })

    it('should combine offset and limit for pagination', async () => {
      const page1 = await 目(users).limit(2).offset(0).execute()
      const page2 = await 目(users).limit(2).offset(2).execute()
      const page3 = await 目(users).limit(2).offset(4).execute()

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(2)
      expect(page3).toHaveLength(1)
    })

    it('should return empty if offset exceeds length', async () => {
      const result = await 目(users).offset(100).execute()
      expect(result).toHaveLength(0)
    })
  })

  describe('Execution Methods', () => {
    it('should execute with .execute()', async () => {
      const result = await 目(users).execute()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(5)
    })

    it('should execute with .toArray() alias', async () => {
      const result = await 目(users).toArray()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should get first item with .first()', async () => {
      const result = await 目(users).sort('age', 'asc').first()
      expect(result?.name).toBe('Quinn')
    })

    it('should return undefined from .first() on empty result', async () => {
      const result = await 目(users).where({ age: { gt: 100 } }).first()
      expect(result).toBeUndefined()
    })

    it('should get last item with .last()', async () => {
      const result = await 目(users).sort('age', 'asc').last()
      expect(result?.name).toBe('Ralph')
    })

    it('should return undefined from .last() on empty result', async () => {
      const result = await 目(users).where({ age: { gt: 100 } }).last()
      expect(result).toBeUndefined()
    })

    it('should count items with .count()', async () => {
      const count = await 目(users).count()
      expect(count).toBe(5)
    })

    it('should count filtered items', async () => {
      const count = await 目(users).where({ active: true }).count()
      expect(count).toBe(3)
    })
  })

  describe('Async Iteration', () => {
    it('should support async iteration with for-await-of', async () => {
      const names: string[] = []
      for await (const user of 目(users)) {
        names.push(user.name)
      }
      expect(names).toHaveLength(5)
      expect(names).toContain('Tom')
    })

    it('should iterate over filtered results', async () => {
      const names: string[] = []
      for await (const user of 目(users).where({ active: true })) {
        names.push(user.name)
      }
      expect(names).toHaveLength(3)
    })

    it('should iterate in sorted order', async () => {
      const names: string[] = []
      for await (const user of 目(users).sort('age', 'asc')) {
        names.push(user.name)
      }
      expect(names[0]).toBe('Quinn')
      expect(names[4]).toBe('Ralph')
    })

    it('should respect limit during iteration', async () => {
      const names: string[] = []
      for await (const user of 目(users).limit(2)) {
        names.push(user.name)
      }
      expect(names).toHaveLength(2)
    })

    it('should allow early break from iteration', async () => {
      const names: string[] = []
      for await (const user of 目(users)) {
        names.push(user.name)
        if (names.length === 2) break
      }
      expect(names).toHaveLength(2)
    })
  })

  describe('Method Chaining', () => {
    it('should chain all operations fluently', async () => {
      const result = await 目(users)
        .where({ age: { gte: 25 } })
        .map(u => u.name)
        .sort()
        .limit(10)
        .execute()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should support multiple where calls (AND)', async () => {
      const result = await 目(users)
        .where({ age: { gte: 28 } })
        .where({ active: true })
        .execute()
      expect(result).toHaveLength(2) // Tom, Priya
    })

    it('should be immutable - each operation returns new query', () => {
      const base = 目(users)
      const filtered = base.where({ active: true })
      const sorted = filtered.sort('age')

      expect(base).not.toBe(filtered)
      expect(filtered).not.toBe(sorted)
    })

    it('should not execute until terminal operation called', async () => {
      const mapper = vi.fn((u: User) => u.name)
      const query = 目(users).map(mapper)

      // Mapper should not be called yet
      expect(mapper).not.toHaveBeenCalled()

      await query.execute()

      // Now mapper should be called
      expect(mapper).toHaveBeenCalledTimes(5)
    })
  })

  describe('Additional Query Methods', () => {
    it('should check if any match with .some()', async () => {
      const hasOlderThan30 = await 目(users).some(u => u.age > 30)
      expect(hasOlderThan30).toBe(true)

      const hasOlderThan100 = await 目(users).some(u => u.age > 100)
      expect(hasOlderThan100).toBe(false)
    })

    it('should check if all match with .every()', async () => {
      const allAdults = await 目(users).every(u => u.age >= 18)
      expect(allAdults).toBe(true)

      const allActive = await 目(users).every(u => u.active === true)
      expect(allActive).toBe(false)
    })

    it('should find first match with .find()', async () => {
      const found = await 目(users).find(u => u.age > 30)
      expect(found?.name).toBe('Ralph')
    })

    it('should reduce items with .reduce()', async () => {
      const totalAge = await 目(users).reduce((sum, u) => sum + u.age, 0)
      expect(totalAge).toBe(150) // 30 + 28 + 35 + 25 + 32
    })

    it('should group items with .groupBy()', async () => {
      const grouped = await 目(users).groupBy('active')
      expect(grouped.get(true)).toHaveLength(3)
      expect(grouped.get(false)).toHaveLength(2)
    })

    it('should get distinct values with .distinct()', async () => {
      const usersWithDupes = [...users, { id: '6', name: 'Tom', age: 45 }]
      const distinctNames = await 目(usersWithDupes).map(u => u.name).distinct().execute()
      expect(distinctNames).toHaveLength(5) // Tom appears once
    })

    it('should flatten nested arrays with .flat()', async () => {
      const nested = [[1, 2], [3, 4], [5]]
      const result = await 目(nested).flat().execute()
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    it('should flatMap items', async () => {
      const result = await 目(users).flatMap(u => [u.name, u.email]).execute()
      expect(result).toHaveLength(10)
    })
  })

  describe('Type Inference', () => {
    it('should infer types through the chain', async () => {
      // This test verifies TypeScript types work correctly
      const result = await 目(users)
        .where({ active: true })
        .map(u => ({ displayName: u.name, age: u.age }))
        .execute()

      // TypeScript should infer result as { displayName: string, age: number }[]
      expect(result[0].displayName).toBeDefined()
      expect(result[0].age).toBeDefined()
    })
  })

  describe('ASCII Alias: ls', () => {
    it('should export ls as ASCII alias for 目', () => {
      expect(ls).toBe(目)
    })

    it('should work identically to 目 for queries', async () => {
      const result = await ls(users).where({ active: true }).execute()
      expect(result).toHaveLength(3)
    })

    it('should work identically for chained operations', async () => {
      const result = await ls(users)
        .where({ age: { gte: 28 } })
        .map(u => u.name)
        .sort()
        .limit(3)
        .execute()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeLessThanOrEqual(3)
    })

    it('should work identically for async iteration', async () => {
      const names: string[] = []
      for await (const user of ls(users)) {
        names.push(user.name)
      }
      expect(names).toHaveLength(5)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined values in array', async () => {
      const withNulls = [{ name: 'Tom' }, null, { name: 'Priya' }, undefined]
      // Should either filter nulls or handle gracefully
      const result = await 目(withNulls as any[]).execute()
      expect(result).toBeDefined()
    })

    it('should handle objects with missing fields', async () => {
      const incomplete = [
        { id: '1', name: 'Tom' },
        { id: '2' }, // missing name
        { id: '3', name: 'Priya' },
      ]
      const result = await 目(incomplete).where({ name: 'Tom' }).execute()
      expect(result).toHaveLength(1)
    })

    it('should handle very large arrays efficiently', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: String(i),
        value: i,
      }))

      const start = Date.now()
      const result = await 目(largeArray)
        .where({ value: { gt: 9000 } })
        .limit(10)
        .execute()
      const duration = Date.now() - start

      expect(result).toHaveLength(10)
      expect(duration).toBeLessThan(1000) // Should be fast
    })

    it('should handle empty operations gracefully', async () => {
      const result = await 目([]).where({}).map(x => x).sort().execute()
      expect(result).toEqual([])
    })

    it('should handle nested object filtering', async () => {
      const withNested = [
        { id: '1', meta: { score: 100 } },
        { id: '2', meta: { score: 50 } },
        { id: '3', meta: { score: 75 } },
      ]
      const result = await 目(withNested).where({ 'meta.score': { gt: 60 } }).execute()
      expect(result).toHaveLength(2)
    })
  })

  describe('Or Conditions', () => {
    it('should support or conditions with $or', async () => {
      const result = await 目(users).where({
        $or: [
          { name: 'Tom' },
          { name: 'Priya' },
        ],
      }).execute()
      expect(result).toHaveLength(2)
    })

    it('should combine $or with other conditions', async () => {
      const result = await 目(users).where({
        active: true,
        $or: [
          { age: { lt: 28 } },
          { age: { gt: 29 } },
        ],
      }).execute()
      // Active AND (age < 28 OR age > 29) = Tom (30, active) and Quinn (25, active)
      expect(result).toHaveLength(2)
    })
  })
})

describe('目 Type Safety', () => {
  it('should be callable as a function with array argument', () => {
    const query = 目(users)
    expect(query).toBeDefined()
    expect(typeof query.where).toBe('function')
    expect(typeof query.map).toBe('function')
    expect(typeof query.sort).toBe('function')
    expect(typeof query.limit).toBe('function')
    expect(typeof query.execute).toBe('function')
  })

  it('should have proper method signatures', () => {
    const query = 目(users)

    // Verify the shape of the returned object
    expect(typeof query.where).toBe('function')
    expect(typeof query.map).toBe('function')
    expect(typeof query.sort).toBe('function')
    expect(typeof query.limit).toBe('function')
    expect(typeof query.offset).toBe('function')
    expect(typeof query.skip).toBe('function')
    expect(typeof query.execute).toBe('function')
    expect(typeof query.toArray).toBe('function')
    expect(typeof query.first).toBe('function')
    expect(typeof query.last).toBe('function')
    expect(typeof query.count).toBe('function')
    expect(typeof query.some).toBe('function')
    expect(typeof query.every).toBe('function')
    expect(typeof query.find).toBe('function')
    expect(typeof query.reduce).toBe('function')
    expect(typeof query.groupBy).toBe('function')
    expect(typeof query.distinct).toBe('function')
    expect(typeof query.flat).toBe('function')
    expect(typeof query.flatMap).toBe('function')
  })

  it('should implement async iterable protocol', () => {
    const query = 目(users)
    expect(typeof query[Symbol.asyncIterator]).toBe('function')
  })
})
