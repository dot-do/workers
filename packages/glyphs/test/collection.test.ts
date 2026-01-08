/**
 * Tests for 田 (collection/c) glyph - Typed Collections
 *
 * This is a RED phase TDD test file. These tests define the API contract
 * for the collection glyph before implementation exists.
 *
 * The 田 glyph represents a grid/field - a visual metaphor for
 * a collection of structured data items arranged in rows.
 *
 * Covers:
 * - Collection creation: 田<T>('name')
 * - CRUD operations: add, get, update, delete
 * - List operations: list, count, clear
 * - Query operations: where, find, findOne
 * - Batch operations: addMany, updateMany, deleteMany
 * - Events: on('add'), on('update'), on('delete')
 * - ASCII alias: c
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
// These imports will fail until implementation exists - this is expected for RED phase
import { 田, c } from '../src/collection.js'

// Test interfaces
interface User {
  id: string
  name: string
  email: string
}

interface Product {
  id: string
  name: string
  price: number
  inStock: boolean
}

interface Order {
  id: string
  userId: string
  productIds: string[]
  total: number
  status: 'pending' | 'shipped' | 'delivered'
}

describe('田 (collection/c) - Typed Collections', () => {
  describe('Collection Creation', () => {
    it('should create a typed collection with 田<T>(name)', () => {
      const users = 田<User>('users')

      expect(users).toBeDefined()
      expect(users.name).toBe('users')
    })

    it('should create a typed collection with ASCII alias c<T>(name)', () => {
      const users = c<User>('users')

      expect(users).toBeDefined()
      expect(users.name).toBe('users')
    })

    it('should have c as the exact same function as 田', () => {
      expect(c).toBe(田)
    })

    it('should create independent collections for different names', () => {
      const users = 田<User>('users')
      const products = 田<Product>('products')

      expect(users).not.toBe(products)
      expect(users.name).toBe('users')
      expect(products.name).toBe('products')
    })

    it('should return same collection instance for same name (singleton)', () => {
      const users1 = 田<User>('users')
      const users2 = 田<User>('users')

      expect(users1).toBe(users2)
    })

    it('should support collection with options', () => {
      const users = 田<User>('users', {
        idField: 'id',
        timestamps: true,
      })

      expect(users).toBeDefined()
      expect(users.options?.timestamps).toBe(true)
    })
  })

  describe('CRUD Operations - Add', () => {
    let users: ReturnType<typeof 田<User>>

    beforeEach(() => {
      users = 田<User>('test-users-add')
      users.clear?.()
    })

    it('should add an item to the collection', async () => {
      const user: User = { id: '1', name: 'Tom', email: 'tom@agents.do' }

      const added = await users.add(user)

      expect(added).toBeDefined()
      expect(added.id).toBe('1')
      expect(added.name).toBe('Tom')
      expect(added.email).toBe('tom@agents.do')
    })

    it('should return the added item', async () => {
      const user: User = { id: '2', name: 'Priya', email: 'priya@agents.do' }

      const result = await users.add(user)

      expect(result).toEqual(user)
    })

    it('should allow adding multiple items sequentially', async () => {
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })
      await users.add({ id: '2', name: 'Priya', email: 'priya@agents.do' })
      await users.add({ id: '3', name: 'Ralph', email: 'ralph@agents.do' })

      const count = await users.count()
      expect(count).toBe(3)
    })

    it('should throw or reject when adding duplicate id', async () => {
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })

      await expect(
        users.add({ id: '1', name: 'Duplicate', email: 'dup@agents.do' })
      ).rejects.toThrow()
    })

    it('should auto-generate id if not provided and configured', async () => {
      const autoIdUsers = 田<Omit<User, 'id'> & { id?: string }>('auto-id-users', {
        autoId: true,
      })

      const added = await autoIdUsers.add({ name: 'Quinn', email: 'quinn@agents.do' })

      expect(added.id).toBeDefined()
      expect(typeof added.id).toBe('string')
      expect(added.id.length).toBeGreaterThan(0)
    })
  })

  describe('CRUD Operations - Get', () => {
    let users: ReturnType<typeof 田<User>>

    beforeEach(async () => {
      users = 田<User>('test-users-get')
      users.clear?.()
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })
      await users.add({ id: '2', name: 'Priya', email: 'priya@agents.do' })
    })

    it('should get an item by id', async () => {
      const user = await users.get('1')

      expect(user).toBeDefined()
      expect(user?.id).toBe('1')
      expect(user?.name).toBe('Tom')
    })

    it('should return null for non-existent id', async () => {
      const user = await users.get('non-existent')

      expect(user).toBeNull()
    })

    it('should return the correct item among multiple', async () => {
      const user = await users.get('2')

      expect(user?.name).toBe('Priya')
      expect(user?.email).toBe('priya@agents.do')
    })

    it('should support getting multiple ids with getMany', async () => {
      const results = await users.getMany(['1', '2'])

      expect(results).toHaveLength(2)
      expect(results.map(u => u.id)).toContain('1')
      expect(results.map(u => u.id)).toContain('2')
    })

    it('should return partial results for getMany with some non-existent ids', async () => {
      const results = await users.getMany(['1', 'non-existent', '2'])

      expect(results).toHaveLength(2)
    })
  })

  describe('CRUD Operations - Update', () => {
    let users: ReturnType<typeof 田<User>>

    beforeEach(async () => {
      users = 田<User>('test-users-update')
      users.clear?.()
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })
    })

    it('should update an item with partial data', async () => {
      const updated = await users.update('1', { name: 'Thomas' })

      expect(updated).toBeDefined()
      expect(updated.id).toBe('1')
      expect(updated.name).toBe('Thomas')
      expect(updated.email).toBe('tom@agents.do') // Unchanged
    })

    it('should return the updated item', async () => {
      const updated = await users.update('1', { email: 'thomas@agents.do' })

      expect(updated.email).toBe('thomas@agents.do')
    })

    it('should persist the update', async () => {
      await users.update('1', { name: 'Thomas' })

      const retrieved = await users.get('1')
      expect(retrieved?.name).toBe('Thomas')
    })

    it('should throw or reject when updating non-existent id', async () => {
      await expect(
        users.update('non-existent', { name: 'Nobody' })
      ).rejects.toThrow()
    })

    it('should support updateOrCreate (upsert)', async () => {
      // Update existing
      await users.upsert('1', { id: '1', name: 'Updated', email: 'updated@agents.do' })
      const existing = await users.get('1')
      expect(existing?.name).toBe('Updated')

      // Create new
      await users.upsert('3', { id: '3', name: 'New', email: 'new@agents.do' })
      const created = await users.get('3')
      expect(created?.name).toBe('New')
    })

    it('should support partial update without overwriting entire document', async () => {
      await users.update('1', { name: 'Thomas' })

      const retrieved = await users.get('1')
      expect(retrieved).toEqual({
        id: '1',
        name: 'Thomas',
        email: 'tom@agents.do', // Should still be present
      })
    })
  })

  describe('CRUD Operations - Delete', () => {
    let users: ReturnType<typeof 田<User>>

    beforeEach(async () => {
      users = 田<User>('test-users-delete')
      users.clear?.()
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })
      await users.add({ id: '2', name: 'Priya', email: 'priya@agents.do' })
    })

    it('should delete an item by id', async () => {
      await users.delete('1')

      const user = await users.get('1')
      expect(user).toBeNull()
    })

    it('should not affect other items when deleting', async () => {
      await users.delete('1')

      const remaining = await users.get('2')
      expect(remaining).toBeDefined()
      expect(remaining?.name).toBe('Priya')
    })

    it('should reduce count after delete', async () => {
      const beforeCount = await users.count()
      await users.delete('1')
      const afterCount = await users.count()

      expect(afterCount).toBe(beforeCount - 1)
    })

    it('should handle deleting non-existent id gracefully', async () => {
      // Should not throw
      await expect(users.delete('non-existent')).resolves.not.toThrow()
    })

    it('should return deleted item or boolean from delete', async () => {
      const result = await users.delete('1')

      // Either returns the deleted item or true
      expect(result === true || (result && result.id === '1')).toBe(true)
    })
  })

  describe('List Operations', () => {
    let users: ReturnType<typeof 田<User>>

    beforeEach(async () => {
      users = 田<User>('test-users-list')
      users.clear?.()
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })
      await users.add({ id: '2', name: 'Priya', email: 'priya@agents.do' })
      await users.add({ id: '3', name: 'Ralph', email: 'ralph@agents.do' })
    })

    it('should list all items in collection', async () => {
      const list = await users.list()

      expect(Array.isArray(list)).toBe(true)
      expect(list).toHaveLength(3)
    })

    it('should return items with correct types', async () => {
      const list = await users.list()

      list.forEach(user => {
        expect(user.id).toBeDefined()
        expect(user.name).toBeDefined()
        expect(user.email).toBeDefined()
      })
    })

    it('should return empty array for empty collection', async () => {
      const emptyCollection = 田<User>('empty-collection')
      emptyCollection.clear?.()

      const list = await emptyCollection.list()

      expect(list).toEqual([])
    })

    it('should support pagination with limit and offset', async () => {
      const page1 = await users.list({ limit: 2, offset: 0 })
      const page2 = await users.list({ limit: 2, offset: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(1)
    })

    it('should count items in collection', async () => {
      const count = await users.count()

      expect(count).toBe(3)
    })

    it('should clear all items from collection', async () => {
      await users.clear()

      const count = await users.count()
      expect(count).toBe(0)
    })
  })

  describe('Query Operations', () => {
    let products: ReturnType<typeof 田<Product>>

    beforeEach(async () => {
      products = 田<Product>('test-products')
      products.clear?.()
      await products.add({ id: '1', name: 'Widget', price: 10, inStock: true })
      await products.add({ id: '2', name: 'Gadget', price: 25, inStock: true })
      await products.add({ id: '3', name: 'Gizmo', price: 50, inStock: false })
      await products.add({ id: '4', name: 'Thingamajig', price: 15, inStock: true })
    })

    it('should find items matching simple query', async () => {
      const inStock = await products.where({ inStock: true })

      expect(inStock).toHaveLength(3)
      inStock.forEach(p => expect(p.inStock).toBe(true))
    })

    it('should find items with comparison operators', async () => {
      const expensive = await products.where({ price: { $gt: 20 } })

      expect(expensive).toHaveLength(2)
      expensive.forEach(p => expect(p.price).toBeGreaterThan(20))
    })

    it('should find items with $lt operator', async () => {
      const cheap = await products.where({ price: { $lt: 20 } })

      expect(cheap).toHaveLength(2)
      cheap.forEach(p => expect(p.price).toBeLessThan(20))
    })

    it('should find items with $gte and $lte operators', async () => {
      const midRange = await products.where({
        price: { $gte: 15, $lte: 25 },
      })

      expect(midRange).toHaveLength(2)
      midRange.forEach(p => {
        expect(p.price).toBeGreaterThanOrEqual(15)
        expect(p.price).toBeLessThanOrEqual(25)
      })
    })

    it('should find items with $in operator', async () => {
      const selected = await products.where({
        name: { $in: ['Widget', 'Gadget'] },
      })

      expect(selected).toHaveLength(2)
    })

    it('should find items with $contains for string search', async () => {
      const gProducts = await products.where({
        name: { $contains: 'G' },
      })

      expect(gProducts.length).toBeGreaterThan(0)
      gProducts.forEach(p => expect(p.name.toLowerCase()).toContain('g'))
    })

    it('should find first matching item with findOne', async () => {
      const product = await products.findOne({ inStock: true })

      expect(product).toBeDefined()
      expect(product?.inStock).toBe(true)
    })

    it('should return null from findOne when no match', async () => {
      const product = await products.findOne({ price: { $gt: 100 } })

      expect(product).toBeNull()
    })

    it('should support combining multiple query conditions (AND)', async () => {
      const results = await products.where({
        inStock: true,
        price: { $lt: 20 },
      })

      expect(results).toHaveLength(2)
      results.forEach(p => {
        expect(p.inStock).toBe(true)
        expect(p.price).toBeLessThan(20)
      })
    })

    it('should support sorting with orderBy', async () => {
      const sorted = await products.list({ orderBy: 'price', order: 'asc' })

      expect(sorted[0].price).toBe(10)
      expect(sorted[sorted.length - 1].price).toBe(50)
    })

    it('should support descending sort', async () => {
      const sorted = await products.list({ orderBy: 'price', order: 'desc' })

      expect(sorted[0].price).toBe(50)
      expect(sorted[sorted.length - 1].price).toBe(10)
    })
  })

  describe('Batch Operations', () => {
    let users: ReturnType<typeof 田<User>>

    beforeEach(() => {
      users = 田<User>('test-users-batch')
      users.clear?.()
    })

    it('should add many items at once', async () => {
      const newUsers: User[] = [
        { id: '1', name: 'Tom', email: 'tom@agents.do' },
        { id: '2', name: 'Priya', email: 'priya@agents.do' },
        { id: '3', name: 'Ralph', email: 'ralph@agents.do' },
      ]

      const added = await users.addMany(newUsers)

      expect(added).toHaveLength(3)
      const count = await users.count()
      expect(count).toBe(3)
    })

    it('should update many items matching query', async () => {
      await users.addMany([
        { id: '1', name: 'Tom', email: 'tom@old.com' },
        { id: '2', name: 'Priya', email: 'priya@old.com' },
        { id: '3', name: 'Ralph', email: 'ralph@agents.do' },
      ])

      const updated = await users.updateMany(
        { email: { $contains: '@old.com' } },
        { email: 'updated@agents.do' }
      )

      expect(updated).toBe(2)

      const tom = await users.get('1')
      expect(tom?.email).toBe('updated@agents.do')
    })

    it('should delete many items matching query', async () => {
      await users.addMany([
        { id: '1', name: 'Tom', email: 'tom@agents.do' },
        { id: '2', name: 'Priya', email: 'priya@agents.do' },
        { id: '3', name: 'Ralph', email: 'ralph@other.com' },
      ])

      const deleted = await users.deleteMany({ email: { $contains: '@agents.do' } })

      expect(deleted).toBe(2)
      const count = await users.count()
      expect(count).toBe(1)
    })
  })

  describe('Collection Events', () => {
    let users: ReturnType<typeof 田<User>>

    beforeEach(() => {
      users = 田<User>('test-users-events')
      users.clear?.()
    })

    it('should emit add event when item is added', async () => {
      const onAdd = vi.fn()
      users.on('add', onAdd)

      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', name: 'Tom' })
      )
    })

    it('should emit update event when item is updated', async () => {
      const onUpdate = vi.fn()
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })

      users.on('update', onUpdate)
      await users.update('1', { name: 'Thomas' })

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', name: 'Thomas' })
      )
    })

    it('should emit delete event when item is deleted', async () => {
      const onDelete = vi.fn()
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })

      users.on('delete', onDelete)
      await users.delete('1')

      expect(onDelete).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1' })
      )
    })

    it('should support unsubscribing from events', async () => {
      const onAdd = vi.fn()
      const unsubscribe = users.on('add', onAdd)

      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })
      expect(onAdd).toHaveBeenCalledTimes(1)

      unsubscribe()

      await users.add({ id: '2', name: 'Priya', email: 'priya@agents.do' })
      expect(onAdd).toHaveBeenCalledTimes(1) // Still 1, not called again
    })

    it('should emit clear event when collection is cleared', async () => {
      const onClear = vi.fn()
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })

      users.on('clear', onClear)
      await users.clear()

      expect(onClear).toHaveBeenCalled()
    })
  })

  describe('Collection Properties', () => {
    let users: ReturnType<typeof 田<User>>

    beforeEach(async () => {
      users = 田<User>('test-users-props')
      users.clear?.()
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })
      await users.add({ id: '2', name: 'Priya', email: 'priya@agents.do' })
    })

    it('should expose collection name', () => {
      expect(users.name).toBe('test-users-props')
    })

    it('should check if collection is empty', async () => {
      expect(await users.isEmpty()).toBe(false)

      await users.clear()
      expect(await users.isEmpty()).toBe(true)
    })

    it('should check if item exists with has(id)', async () => {
      expect(await users.has('1')).toBe(true)
      expect(await users.has('non-existent')).toBe(false)
    })

    it('should get all ids with ids()', async () => {
      const ids = await users.ids()

      expect(ids).toContain('1')
      expect(ids).toContain('2')
      expect(ids).toHaveLength(2)
    })
  })

  describe('Tagged Template Support', () => {
    it('should support tagged template for quick queries', async () => {
      const products = 田<Product>('tagged-products')
      products.clear?.()
      await products.add({ id: '1', name: 'Widget', price: 10, inStock: true })
      await products.add({ id: '2', name: 'Gadget', price: 25, inStock: true })

      // Tagged template query syntax
      const result = await 田`products where inStock = true`

      expect(Array.isArray(result)).toBe(true)
    })

    it('should support interpolated values in tagged template', async () => {
      const products = 田<Product>('tagged-products-2')
      products.clear?.()
      await products.add({ id: '1', name: 'Widget', price: 10, inStock: true })

      const minPrice = 5
      const result = await 田`products where price > ${minPrice}`

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Storage Integration', () => {
    it('should support configurable storage adapter', () => {
      const memoryStorage = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      }

      const users = 田<User>('storage-test', {
        storage: memoryStorage,
      })

      expect(users).toBeDefined()
    })

    it('should work with default in-memory storage', async () => {
      const users = 田<User>('memory-users')
      users.clear?.()

      await users.add({ id: '1', name: 'Test', email: 'test@example.com' })
      const retrieved = await users.get('1')

      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Test')
    })
  })

  describe('Type Safety', () => {
    it('should enforce item type on add', async () => {
      const users = 田<User>('typed-users')

      // TypeScript should enforce correct shape
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })

      // These would fail TypeScript (not runtime):
      // await users.add({ id: '1', name: 'Tom' }) // missing email
      // await users.add({ id: '1', name: 123, email: 'test' }) // wrong type
    })

    it('should infer correct return type from get', async () => {
      const users = 田<User>('typed-get')
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })

      const user = await users.get('1')

      // TypeScript infers user as User | null
      if (user) {
        expect(typeof user.name).toBe('string')
        expect(typeof user.email).toBe('string')
      }
    })

    it('should type update partial correctly', async () => {
      const users = 田<User>('typed-update')
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })

      // Partial<User> for update - only some fields required
      const updated = await users.update('1', { name: 'Thomas' })

      expect(updated.name).toBe('Thomas')
      expect(updated.email).toBe('tom@agents.do')
    })
  })

  describe('Edge Cases', () => {
    let users: ReturnType<typeof 田<User>>

    beforeEach(() => {
      users = 田<User>('edge-case-users')
      users.clear?.()
    })

    it('should handle empty string id', async () => {
      // Empty string id should either work or throw meaningful error
      try {
        await users.add({ id: '', name: 'Empty', email: 'empty@test.com' })
        const retrieved = await users.get('')
        expect(retrieved).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle unicode in collection name', () => {
      const collection = 田<User>('users-')
      expect(collection.name).toBe('users-')
    })

    it('should handle special characters in item values', async () => {
      await users.add({
        id: '1',
        name: "O'Brien",
        email: 'obrien+test@example.com',
      })

      const retrieved = await users.get('1')
      expect(retrieved?.name).toBe("O'Brien")
      expect(retrieved?.email).toBe('obrien+test@example.com')
    })

    it('should handle concurrent operations', async () => {
      const addPromises = Array.from({ length: 10 }, (_, i) =>
        users.add({ id: String(i), name: `User ${i}`, email: `user${i}@test.com` })
      )

      await Promise.all(addPromises)

      const count = await users.count()
      expect(count).toBe(10)
    })

    it('should handle very long values', async () => {
      const longName = 'A'.repeat(10000)

      await users.add({ id: '1', name: longName, email: 'test@test.com' })

      const retrieved = await users.get('1')
      expect(retrieved?.name).toBe(longName)
    })
  })

  describe('Async Iterator Support', () => {
    it('should support async iteration over collection', async () => {
      const users = 田<User>('async-iter-users')
      users.clear?.()
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })
      await users.add({ id: '2', name: 'Priya', email: 'priya@agents.do' })

      const items: User[] = []
      for await (const user of users) {
        items.push(user)
      }

      expect(items).toHaveLength(2)
    })

    it('should support async iteration with early break', async () => {
      const users = 田<User>('async-iter-break')
      users.clear?.()
      await users.add({ id: '1', name: 'Tom', email: 'tom@agents.do' })
      await users.add({ id: '2', name: 'Priya', email: 'priya@agents.do' })
      await users.add({ id: '3', name: 'Ralph', email: 'ralph@agents.do' })

      const items: User[] = []
      for await (const user of users) {
        items.push(user)
        if (items.length === 2) break
      }

      expect(items).toHaveLength(2)
    })
  })
})

describe('田 Type Safety Verification', () => {
  it('should be callable as generic function', () => {
    const collection = 田<User>('test')
    expect(collection).toBeDefined()
  })

  it('should have proper method signatures', () => {
    const collection = 田<User>('methods-test')

    expect(typeof collection.add).toBe('function')
    expect(typeof collection.get).toBe('function')
    expect(typeof collection.update).toBe('function')
    expect(typeof collection.delete).toBe('function')
    expect(typeof collection.list).toBe('function')
    expect(typeof collection.where).toBe('function')
    expect(typeof collection.count).toBe('function')
    expect(typeof collection.clear).toBe('function')
  })

  it('should have matching ASCII alias c', () => {
    expect(c).toBe(田)

    const viaGlyph = 田<User>('alias-test-1')
    const viaAlias = c<User>('alias-test-2')

    // Both should create valid collections
    expect(viaGlyph.name).toBe('alias-test-1')
    expect(viaAlias.name).toBe('alias-test-2')
  })
})
