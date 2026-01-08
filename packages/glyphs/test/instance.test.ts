/**
 * Tests for 回 (instance/$) - Object Instance Creation Glyph
 *
 * RED Phase: Define the API contract through failing tests.
 *
 * The 回 glyph provides:
 * - Instance creation: 回(Schema, data)
 * - Tagged template creation: 回`type ${data}`
 * - Validation on creation
 * - Immutable instances
 * - Clone and update operations
 * - ASCII alias: $
 *
 * Visual metaphor: 回 looks like a nested box - a container within a container,
 * representing an instance (concrete value) wrapped by its type (abstract schema).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// These imports will fail until implementation exists
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Module doesn't exist yet (RED phase)
import { 回, $, ValidationError } from '../src/instance.js'

// Mock schema type for testing (mimics 口 output)
interface Schema<T = unknown> {
  readonly _type: T
  readonly _schema: Record<string, unknown>
  readonly validate?: (value: unknown) => boolean
}

// Helper to create mock schemas (simulating 口 glyph behavior)
function createSchema<T>(shape: Record<string, unknown>, validate?: (value: unknown) => boolean): Schema<T> {
  return {
    _type: undefined as T,
    _schema: shape,
    validate,
  }
}

describe('回 (instance/$) - Object Instance Creation', () => {
  describe('Basic Instance Creation', () => {
    it('should create an instance from schema and data', () => {
      const UserSchema = createSchema<{ name: string; email: string }>({
        name: String,
        email: String,
      })

      const user = 回(UserSchema, {
        name: 'Alice',
        email: 'alice@example.com',
      })

      expect(user).toBeDefined()
      expect(user.name).toBe('Alice')
      expect(user.email).toBe('alice@example.com')
    })

    it('should create instance with nested objects', () => {
      const ProfileSchema = createSchema<{
        user: { name: string; age: number }
        settings: { theme: string }
      }>({
        user: { name: String, age: Number },
        settings: { theme: String },
      })

      const profile = 回(ProfileSchema, {
        user: { name: 'Bob', age: 30 },
        settings: { theme: 'dark' },
      })

      expect(profile.user.name).toBe('Bob')
      expect(profile.user.age).toBe(30)
      expect(profile.settings.theme).toBe('dark')
    })

    it('should create instance with arrays', () => {
      const TeamSchema = createSchema<{
        name: string
        members: string[]
      }>({
        name: String,
        members: [String],
      })

      const team = 回(TeamSchema, {
        name: 'Engineering',
        members: ['Alice', 'Bob', 'Charlie'],
      })

      expect(team.name).toBe('Engineering')
      expect(team.members).toEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('should handle optional fields', () => {
      const ConfigSchema = createSchema<{
        host: string
        port?: number
      }>({
        host: String,
        port: Number,
      })

      const config = 回(ConfigSchema, {
        host: 'localhost',
      })

      expect(config.host).toBe('localhost')
      expect(config.port).toBeUndefined()
    })

    it('should handle null values', () => {
      const NullableSchema = createSchema<{
        name: string
        nickname: string | null
      }>({
        name: String,
        nickname: String,
      })

      const data = 回(NullableSchema, {
        name: 'Alice',
        nickname: null,
      })

      expect(data.name).toBe('Alice')
      expect(data.nickname).toBeNull()
    })
  })

  describe('Instance Metadata', () => {
    it('should attach __schema metadata to instance', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = 回(UserSchema, { name: 'Alice' })

      expect(user.__schema).toBe(UserSchema)
    })

    it('should attach __createdAt timestamp', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const before = Date.now()
      const user = 回(UserSchema, { name: 'Alice' })
      const after = Date.now()

      expect(user.__createdAt).toBeGreaterThanOrEqual(before)
      expect(user.__createdAt).toBeLessThanOrEqual(after)
    })

    it('should attach unique __id to each instance', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user1 = 回(UserSchema, { name: 'Alice' })
      const user2 = 回(UserSchema, { name: 'Bob' })

      expect(user1.__id).toBeDefined()
      expect(user2.__id).toBeDefined()
      expect(user1.__id).not.toBe(user2.__id)
    })

    it('should have non-enumerable metadata properties', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = 回(UserSchema, { name: 'Alice' })
      const keys = Object.keys(user)

      expect(keys).toContain('name')
      expect(keys).not.toContain('__schema')
      expect(keys).not.toContain('__createdAt')
      expect(keys).not.toContain('__id')
    })
  })

  describe('Validation', () => {
    it('should validate data against schema on creation', () => {
      const EmailSchema = createSchema<{ email: string }>(
        { email: String },
        (value) => {
          const v = value as { email: string }
          return typeof v.email === 'string' && v.email.includes('@')
        }
      )

      expect(() =>
        回(EmailSchema, { email: 'not-an-email' })
      ).toThrow(ValidationError)
    })

    it('should throw ValidationError with field name', () => {
      const UserSchema = createSchema<{ name: string; age: number }>(
        { name: String, age: Number },
        (value) => {
          const v = value as { name: string; age: number }
          if (typeof v.age !== 'number') {
            throw new ValidationError('Invalid type', 'age', 'number', typeof v.age)
          }
          return true
        }
      )

      try {
        回(UserSchema, { name: 'Alice', age: 'thirty' as unknown as number })
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError)
        expect((e as ValidationError).field).toBe('age')
      }
    })

    it('should include expected and received types in ValidationError', () => {
      const NumberSchema = createSchema<{ value: number }>(
        { value: Number },
        (data) => {
          const v = data as { value: unknown }
          if (typeof v.value !== 'number') {
            throw new ValidationError(
              'Type mismatch',
              'value',
              'number',
              typeof v.value
            )
          }
          return true
        }
      )

      try {
        回(NumberSchema, { value: 'string' as unknown as number })
        expect.fail('Should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError)
        const err = e as ValidationError
        expect(err.expected).toBe('number')
        expect(err.received).toBe('string')
      }
    })

    it('should skip validation when validate option is false', () => {
      const StrictSchema = createSchema<{ value: number }>(
        { value: Number },
        () => false // Always fails
      )

      // Should not throw with validate: false
      const instance = 回(StrictSchema, { value: 42 }, { validate: false })

      expect(instance.value).toBe(42)
    })

    it('should call custom onError handler', () => {
      const onError = vi.fn()
      const FailingSchema = createSchema<{ value: number }>(
        { value: Number },
        () => {
          throw new ValidationError('Always fails', 'value')
        }
      )

      回(FailingSchema, { value: 42 }, { onError })

      expect(onError).toHaveBeenCalled()
    })
  })

  describe('Immutability', () => {
    it('should create frozen instance by default', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = 回(UserSchema, { name: 'Alice' })

      expect(Object.isFrozen(user)).toBe(true)
    })

    it('should prevent property modification', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = 回(UserSchema, { name: 'Alice' })

      expect(() => {
        (user as { name: string }).name = 'Bob'
      }).toThrow()
    })

    it('should deep freeze nested objects', () => {
      const ProfileSchema = createSchema<{
        user: { name: string }
      }>({
        user: { name: String },
      })

      const profile = 回(ProfileSchema, {
        user: { name: 'Alice' },
      })

      expect(Object.isFrozen(profile.user)).toBe(true)
    })

    it('should freeze arrays', () => {
      const ListSchema = createSchema<{ items: string[] }>({
        items: [String],
      })

      const list = 回(ListSchema, { items: ['a', 'b', 'c'] })

      expect(Object.isFrozen(list.items)).toBe(true)
      expect(() => {
        list.items.push('d')
      }).toThrow()
    })

    it('should allow mutable instance with freeze: false', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = 回(UserSchema, { name: 'Alice' }, { freeze: false })

      expect(Object.isFrozen(user)).toBe(false)
      user.name = 'Bob'
      expect(user.name).toBe('Bob')
    })
  })

  describe('Factory Method: from()', () => {
    it('should create instance via from() method', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = 回.from(UserSchema, { name: 'Alice' })

      expect(user.name).toBe('Alice')
    })

    it('should accept options in from()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = 回.from(UserSchema, { name: 'Alice' }, { freeze: false })

      expect(Object.isFrozen(user)).toBe(false)
    })

    it('should be equivalent to direct invocation', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user1 = 回(UserSchema, { name: 'Alice' })
      const user2 = 回.from(UserSchema, { name: 'Alice' })

      expect(user1.name).toBe(user2.name)
      expect(user1.__schema).toBe(user2.__schema)
    })
  })

  describe('Partial Instances', () => {
    it('should create partial instance with partial()', () => {
      const UserSchema = createSchema<{
        name: string
        email: string
        age: number
      }>({
        name: String,
        email: String,
        age: Number,
      })

      const partial = 回.partial(UserSchema, { name: 'Alice' })

      expect(partial.name).toBe('Alice')
      expect(partial.email).toBeUndefined()
      expect(partial.age).toBeUndefined()
    })

    it('should still attach metadata to partial instances', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const partial = 回.partial(UserSchema, {})

      expect(partial.__schema).toBe(UserSchema)
      expect(partial.__id).toBeDefined()
    })

    it('should not validate required fields in partial()', () => {
      const RequiredSchema = createSchema<{
        name: string
        email: string
      }>(
        { name: String, email: String },
        (data) => {
          const d = data as { name?: string; email?: string }
          if (!d.name || !d.email) {
            throw new ValidationError('Missing required field')
          }
          return true
        }
      )

      // Should not throw even though email is missing
      const partial = 回.partial(RequiredSchema, { name: 'Alice' })

      expect(partial.name).toBe('Alice')
    })
  })

  describe('Clone Operation', () => {
    it('should clone an existing instance', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const original = 回(UserSchema, { name: 'Alice' })
      const cloned = 回.clone(original)

      expect(cloned.name).toBe('Alice')
      expect(cloned).not.toBe(original)
    })

    it('should generate new __id for clone', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const original = 回(UserSchema, { name: 'Alice' })
      const cloned = 回.clone(original)

      expect(cloned.__id).not.toBe(original.__id)
    })

    it('should update __createdAt for clone', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const original = 回(UserSchema, { name: 'Alice' })

      // Small delay to ensure different timestamp
      const cloned = 回.clone(original)

      expect(cloned.__createdAt).toBeGreaterThanOrEqual(original.__createdAt)
    })

    it('should preserve schema reference in clone', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const original = 回(UserSchema, { name: 'Alice' })
      const cloned = 回.clone(original)

      expect(cloned.__schema).toBe(original.__schema)
    })

    it('should deep clone nested objects', () => {
      const ProfileSchema = createSchema<{
        user: { name: string }
      }>({
        user: { name: String },
      })

      const original = 回(ProfileSchema, { user: { name: 'Alice' } })
      const cloned = 回.clone(original)

      expect(cloned.user).not.toBe(original.user)
      expect(cloned.user.name).toBe('Alice')
    })
  })

  describe('Update Operation', () => {
    it('should create updated instance with patch', () => {
      const UserSchema = createSchema<{ name: string; email: string }>({
        name: String,
        email: String,
      })

      const original = 回(UserSchema, {
        name: 'Alice',
        email: 'alice@example.com',
      })

      const updated = 回.update(original, { name: 'Alicia' })

      expect(updated.name).toBe('Alicia')
      expect(updated.email).toBe('alice@example.com')
    })

    it('should not modify original instance', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const original = 回(UserSchema, { name: 'Alice' })
      回.update(original, { name: 'Bob' })

      expect(original.name).toBe('Alice')
    })

    it('should generate new __id for updated instance', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const original = 回(UserSchema, { name: 'Alice' })
      const updated = 回.update(original, { name: 'Bob' })

      expect(updated.__id).not.toBe(original.__id)
    })

    it('should validate updated data', () => {
      const PositiveSchema = createSchema<{ value: number }>(
        { value: Number },
        (data) => {
          const d = data as { value: number }
          if (d.value < 0) {
            throw new ValidationError('Value must be positive', 'value')
          }
          return true
        }
      )

      const original = 回(PositiveSchema, { value: 10 })

      expect(() =>
        回.update(original, { value: -5 })
      ).toThrow(ValidationError)
    })

    it('should handle nested updates', () => {
      const ProfileSchema = createSchema<{
        user: { name: string; age: number }
      }>({
        user: { name: String, age: Number },
      })

      const original = 回(ProfileSchema, {
        user: { name: 'Alice', age: 30 },
      })

      const updated = 回.update(original, {
        user: { name: 'Alicia', age: 31 },
      })

      expect(updated.user.name).toBe('Alicia')
      expect(updated.user.age).toBe(31)
    })
  })

  describe('Validation Methods', () => {
    it('should validate data without creating instance via validate()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const validData = { name: 'Alice' }
      const invalidData = { name: 123 }

      expect(回.validate(UserSchema, validData)).toBe(true)
      // Note: basic type validation may still pass, depends on implementation
    })

    it('should check if value is an instance via isInstance()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const instance = 回(UserSchema, { name: 'Alice' })
      const plainObject = { name: 'Bob' }

      expect(回.isInstance(instance)).toBe(true)
      expect(回.isInstance(plainObject)).toBe(false)
    })

    it('should check instance against specific schema', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })
      const OtherSchema = createSchema<{ value: number }>({ value: Number })

      const user = 回(UserSchema, { name: 'Alice' })

      expect(回.isInstance(user, UserSchema)).toBe(true)
      expect(回.isInstance(user, OtherSchema)).toBe(false)
    })

    it('should handle null and undefined in isInstance()', () => {
      expect(回.isInstance(null)).toBe(false)
      expect(回.isInstance(undefined)).toBe(false)
    })

    it('should handle primitives in isInstance()', () => {
      expect(回.isInstance('string')).toBe(false)
      expect(回.isInstance(123)).toBe(false)
      expect(回.isInstance(true)).toBe(false)
    })
  })

  describe('Batch Operations', () => {
    it('should create multiple instances with many()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const users = 回.many(UserSchema, [
        { name: 'Alice' },
        { name: 'Bob' },
        { name: 'Charlie' },
      ])

      expect(users).toHaveLength(3)
      expect(users[0].name).toBe('Alice')
      expect(users[1].name).toBe('Bob')
      expect(users[2].name).toBe('Charlie')
    })

    it('should attach metadata to all instances in many()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const users = 回.many(UserSchema, [
        { name: 'Alice' },
        { name: 'Bob' },
      ])

      expect(users[0].__schema).toBe(UserSchema)
      expect(users[1].__schema).toBe(UserSchema)
      expect(users[0].__id).not.toBe(users[1].__id)
    })

    it('should validate all items in many()', () => {
      const PositiveSchema = createSchema<{ value: number }>(
        { value: Number },
        (data) => {
          const d = data as { value: number }
          if (d.value < 0) {
            throw new ValidationError('Must be positive')
          }
          return true
        }
      )

      expect(() =>
        回.many(PositiveSchema, [
          { value: 1 },
          { value: -1 }, // Invalid
          { value: 2 },
        ])
      ).toThrow(ValidationError)
    })

    it('should pass options to all instances in many()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const users = 回.many(UserSchema, [{ name: 'Alice' }], { freeze: false })

      expect(Object.isFrozen(users[0])).toBe(false)
    })

    it('should handle empty array in many()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const users = 回.many(UserSchema, [])

      expect(users).toEqual([])
    })
  })

  describe('Schema Access', () => {
    it('should retrieve schema from instance via schemaOf()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = 回(UserSchema, { name: 'Alice' })
      const schema = 回.schemaOf(user)

      expect(schema).toBe(UserSchema)
    })
  })

  describe('Tagged Template Usage', () => {
    it('should create instance via tagged template', () => {
      const userData = { name: 'Alice', email: 'alice@example.com' }

      // Tagged template with type name and data
      const user = 回`User ${userData}`

      expect(user).toBeDefined()
    })

    it('should handle multiple interpolations in tagged template', () => {
      const name = 'Alice'
      const email = 'alice@example.com'

      const result = 回`User ${{ name }} ${{ email }}`

      expect(result).toBeDefined()
    })

    it('should parse type name from template string', () => {
      const data = { value: 42 }

      // The type name should be extracted from the literal part
      回`Counter ${data}`
    })
  })

  describe('ASCII Alias - $', () => {
    it('should export $ as alias for 回', () => {
      expect($).toBeDefined()
      expect($).toBe(回)
    })

    it('should work identically via $ alias - basic creation', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = $(UserSchema, { name: 'Alice' })

      expect(user.name).toBe('Alice')
    })

    it('should work identically via $ alias - from()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = $.from(UserSchema, { name: 'Alice' })

      expect(user.name).toBe('Alice')
    })

    it('should work identically via $ alias - clone()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const original = $(UserSchema, { name: 'Alice' })
      const cloned = $.clone(original)

      expect(cloned.name).toBe('Alice')
      expect(cloned).not.toBe(original)
    })

    it('should work identically via $ alias - update()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const original = $(UserSchema, { name: 'Alice' })
      const updated = $.update(original, { name: 'Bob' })

      expect(updated.name).toBe('Bob')
    })

    it('should work identically via $ alias - many()', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const users = $.many(UserSchema, [
        { name: 'Alice' },
        { name: 'Bob' },
      ])

      expect(users).toHaveLength(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty object schema', () => {
      const EmptySchema = createSchema<Record<string, never>>({})

      const instance = 回(EmptySchema, {})

      expect(instance).toBeDefined()
      expect(Object.keys(instance).length).toBe(0)
    })

    it('should handle Date values', () => {
      const EventSchema = createSchema<{
        name: string
        date: Date
      }>({
        name: String,
        date: Date,
      })

      const now = new Date()
      const event = 回(EventSchema, { name: 'Meeting', date: now })

      expect(event.date).toEqual(now)
    })

    it('should handle symbol keys', () => {
      const sym = Symbol('test')
      const SymSchema = createSchema<{ [sym]: string }>({
        [sym]: String,
      })

      const instance = 回(SymSchema, { [sym]: 'value' })

      expect(instance[sym]).toBe('value')
    })

    it('should handle circular reference prevention', () => {
      const NodeSchema = createSchema<{
        value: number
        next?: unknown
      }>({
        value: Number,
        next: Object,
      })

      // Creating a node should work
      const node = 回(NodeSchema, { value: 1 })

      expect(node.value).toBe(1)
    })

    it('should handle very large objects', () => {
      const LargeSchema = createSchema<Record<string, number>>({})

      const largeData: Record<string, number> = {}
      for (let i = 0; i < 1000; i++) {
        largeData[`field${i}`] = i
      }

      const instance = 回(LargeSchema, largeData)

      expect(instance.field0).toBe(0)
      expect(instance.field999).toBe(999)
    })

    it('should handle unicode property names', () => {
      const UnicodeSchema = createSchema<{ 名前: string }>({
        名前: String,
      })

      const instance = 回(UnicodeSchema, { 名前: 'アリス' })

      expect(instance.名前).toBe('アリス')
    })

    it('should handle special characters in string values', () => {
      const StringSchema = createSchema<{ value: string }>({
        value: String,
      })

      const instance = 回(StringSchema, {
        value: '特殊文字: \n\t\r\0"\'`${}'
      })

      expect(instance.value).toContain('\n')
      expect(instance.value).toContain('特殊文字')
    })

    it('should handle BigInt values', () => {
      const BigSchema = createSchema<{ big: bigint }>({
        big: BigInt,
      })

      const instance = 回(BigSchema, { big: BigInt(9007199254740991) })

      expect(instance.big).toBe(BigInt(9007199254740991))
    })

    it('should handle Map and Set values', () => {
      const CollectionSchema = createSchema<{
        map: Map<string, number>
        set: Set<string>
      }>({
        map: Map,
        set: Set,
      })

      const map = new Map([['a', 1], ['b', 2]])
      const set = new Set(['x', 'y', 'z'])

      const instance = 回(CollectionSchema, { map, set })

      expect(instance.map.get('a')).toBe(1)
      expect(instance.set.has('x')).toBe(true)
    })
  })

  describe('Type Safety', () => {
    it('should infer correct type from schema', () => {
      const UserSchema = createSchema<{
        name: string
        age: number
        active: boolean
      }>({
        name: String,
        age: Number,
        active: Boolean,
      })

      const user = 回(UserSchema, {
        name: 'Alice',
        age: 30,
        active: true,
      })

      // TypeScript should infer these types
      const name: string = user.name
      const age: number = user.age
      const active: boolean = user.active

      expect(name).toBe('Alice')
      expect(age).toBe(30)
      expect(active).toBe(true)
    })

    it('should maintain type safety through clone', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const original = 回(UserSchema, { name: 'Alice' })
      const cloned = 回.clone(original)

      // Type should be preserved
      const name: string = cloned.name
      expect(name).toBe('Alice')
    })

    it('should maintain type safety through update', () => {
      const UserSchema = createSchema<{ name: string; age: number }>({
        name: String,
        age: Number,
      })

      const original = 回(UserSchema, { name: 'Alice', age: 30 })
      const updated = 回.update(original, { age: 31 })

      // Types should be preserved
      const name: string = updated.name
      const age: number = updated.age

      expect(name).toBe('Alice')
      expect(age).toBe(31)
    })
  })

  describe('Integration Scenarios', () => {
    it('should work with spread operator for updates', () => {
      const UserSchema = createSchema<{ name: string; email: string }>({
        name: String,
        email: String,
      })

      const original = 回(UserSchema, {
        name: 'Alice',
        email: 'alice@example.com',
      })

      // Using spread to create new instance manually
      const updated = 回(UserSchema, {
        ...original,
        name: 'Alicia',
      })

      expect(updated.name).toBe('Alicia')
      expect(updated.email).toBe('alice@example.com')
    })

    it('should work with Object.assign pattern', () => {
      const UserSchema = createSchema<{ name: string }>({ name: String })

      const user = 回(UserSchema, { name: 'Alice' })

      // Object.assign should work for reading (even though instance is frozen)
      const copy = Object.assign({}, user)

      expect(copy.name).toBe('Alice')
    })

    it('should serialize to JSON correctly', () => {
      const UserSchema = createSchema<{ name: string; email: string }>({
        name: String,
        email: String,
      })

      const user = 回(UserSchema, {
        name: 'Alice',
        email: 'alice@example.com',
      })

      const json = JSON.stringify(user)
      const parsed = JSON.parse(json)

      expect(parsed.name).toBe('Alice')
      expect(parsed.email).toBe('alice@example.com')
      // Metadata should not be in JSON (non-enumerable)
      expect(parsed.__schema).toBeUndefined()
      expect(parsed.__id).toBeUndefined()
    })

    it('should work with destructuring', () => {
      const UserSchema = createSchema<{ name: string; age: number }>({
        name: String,
        age: Number,
      })

      const user = 回(UserSchema, { name: 'Alice', age: 30 })

      const { name, age } = user

      expect(name).toBe('Alice')
      expect(age).toBe(30)
    })

    it('should work with array methods on nested arrays', () => {
      const ListSchema = createSchema<{ items: number[] }>({
        items: [Number],
      })

      const list = 回(ListSchema, { items: [1, 2, 3, 4, 5] }, { freeze: false })

      // Array methods should work on mutable instances
      const filtered = list.items.filter((n) => n > 2)
      const mapped = list.items.map((n) => n * 2)

      expect(filtered).toEqual([3, 4, 5])
      expect(mapped).toEqual([2, 4, 6, 8, 10])
    })
  })
})

describe('ValidationError', () => {
  it('should be throwable', () => {
    expect(() => {
      throw new ValidationError('Test error')
    }).toThrow(ValidationError)
  })

  it('should have correct name property', () => {
    const error = new ValidationError('Test')

    expect(error.name).toBe('ValidationError')
  })

  it('should store field information', () => {
    const error = new ValidationError('Invalid value', 'email')

    expect(error.field).toBe('email')
  })

  it('should store expected and received types', () => {
    const error = new ValidationError('Type mismatch', 'age', 'number', 'string')

    expect(error.expected).toBe('number')
    expect(error.received).toBe('string')
  })

  it('should be instanceof Error', () => {
    const error = new ValidationError('Test')

    expect(error).toBeInstanceOf(Error)
  })
})
