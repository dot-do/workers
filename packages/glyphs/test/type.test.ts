/**
 * Tests for 口 (type/T) glyph - Schema/Type Definition
 *
 * RED Phase TDD: These tests define the API contract for the type definition glyph
 * before implementation exists. All tests should FAIL until GREEN phase.
 *
 * The 口 glyph represents an empty container - a visual metaphor for a type/schema
 * that can hold structured data. It provides:
 *
 * - Schema definition: 口({ field: Type, ... })
 * - Type inference: 口.Infer<typeof schema>
 * - Validation: schemas validate data at creation/parse time
 * - Nested schemas: 口({ nested: 口({ ... }) })
 * - Optional fields: 口({ optional?: Type })
 * - Arrays: 口({ list: [Type] })
 * - Unions: 口.union(TypeA, TypeB)
 * - Enums: 口.enum('a', 'b', 'c')
 * - Custom validators: 口({ value: String, validate: fn })
 * - ASCII alias: T
 */

import { describe, it, expect, vi } from 'vitest'
// These imports will fail until implementation exists - expected for RED phase
import { 口, T } from '../src/type.js'

describe('口 (type/T) glyph - Schema/Type Definition', () => {
  describe('Basic Schema Definition', () => {
    it('should define a schema with primitive types', () => {
      const User = 口({
        name: String,
        age: Number,
        active: Boolean,
      })

      expect(User).toBeDefined()
      expect(User.shape).toBeDefined()
      expect(User.shape.name).toBe(String)
      expect(User.shape.age).toBe(Number)
      expect(User.shape.active).toBe(Boolean)
    })

    it('should define a schema with only String fields', () => {
      const Name = 口({
        first: String,
        last: String,
      })

      expect(Name.shape.first).toBe(String)
      expect(Name.shape.last).toBe(String)
    })

    it('should define a schema with only Number fields', () => {
      const Coordinates = 口({
        x: Number,
        y: Number,
        z: Number,
      })

      expect(Coordinates.shape.x).toBe(Number)
      expect(Coordinates.shape.y).toBe(Number)
      expect(Coordinates.shape.z).toBe(Number)
    })

    it('should define a schema with Date type', () => {
      const Event = 口({
        title: String,
        startDate: Date,
        endDate: Date,
      })

      expect(Event.shape.startDate).toBe(Date)
      expect(Event.shape.endDate).toBe(Date)
    })

    it('should handle empty schema', () => {
      const Empty = 口({})

      expect(Empty).toBeDefined()
      expect(Object.keys(Empty.shape)).toHaveLength(0)
    })
  })

  describe('Nested Schemas', () => {
    it('should support nested schema definitions', () => {
      const Address = 口({
        street: String,
        city: String,
        zip: String,
      })

      const Person = 口({
        name: String,
        address: Address,
      })

      expect(Person.shape.address).toBe(Address)
    })

    it('should support inline nested schemas', () => {
      const Profile = 口({
        user: 口({
          name: String,
          email: String,
        }),
        settings: 口({
          theme: String,
          notifications: Boolean,
        }),
      })

      expect(Profile.shape.user).toBeDefined()
      expect(Profile.shape.settings).toBeDefined()
    })

    it('should support deeply nested schemas', () => {
      const DeepSchema = 口({
        level1: 口({
          level2: 口({
            level3: 口({
              value: String,
            }),
          }),
        }),
      })

      expect(DeepSchema).toBeDefined()
    })
  })

  describe('Array Types', () => {
    it('should define array of primitives with bracket notation', () => {
      const Tags = 口({
        tags: [String],
      })

      expect(Tags.shape.tags).toEqual([String])
    })

    it('should define array of numbers', () => {
      const Scores = 口({
        scores: [Number],
      })

      expect(Scores.shape.scores).toEqual([Number])
    })

    it('should define array of nested schemas', () => {
      const Item = 口({
        id: String,
        name: String,
      })

      const List = 口({
        items: [Item],
      })

      expect(List.shape.items).toEqual([Item])
    })

    it('should define array with 口.array(Type)', () => {
      const StringArray = 口.array(String)

      expect(StringArray).toBeDefined()
    })

    it('should support nested arrays', () => {
      const Matrix = 口({
        rows: [[Number]],
      })

      expect(Matrix.shape.rows).toEqual([[Number]])
    })
  })

  describe('Optional Fields', () => {
    it('should support optional fields with 口.optional()', () => {
      const User = 口({
        name: String,
        nickname: 口.optional(String),
      })

      expect(User.shape.name).toBe(String)
      expect(User.shape.nickname._optional).toBe(true)
    })

    it('should support optional nested schemas', () => {
      const Profile = 口({
        user: 口({
          name: String,
        }),
        address: 口.optional(口({
          street: String,
          city: String,
        })),
      })

      expect(Profile.shape.address._optional).toBe(true)
    })

    it('should distinguish required from optional in validation', () => {
      const Schema = 口({
        required: String,
        optional: 口.optional(String),
      })

      // Required fields should be marked as required
      expect(Schema.isOptional('required')).toBe(false)
      expect(Schema.isOptional('optional')).toBe(true)
    })
  })

  describe('Nullable Fields', () => {
    it('should support nullable fields with 口.nullable()', () => {
      const User = 口({
        name: String,
        deletedAt: 口.nullable(Date),
      })

      expect(User.shape.deletedAt._nullable).toBe(true)
    })

    it('should allow null values for nullable fields', () => {
      const User = 口({
        middleName: 口.nullable(String),
      })

      const result = User.parse({ middleName: null })

      expect(result.middleName).toBeNull()
    })
  })

  describe('Union Types', () => {
    it('should create union of primitives with 口.union()', () => {
      const StringOrNumber = 口.union(String, Number)

      expect(StringOrNumber).toBeDefined()
      expect(StringOrNumber._union).toEqual([String, Number])
    })

    it('should create union of schemas', () => {
      const Cat = 口({ type: String, meows: Boolean })
      const Dog = 口({ type: String, barks: Boolean })

      const Pet = 口.union(Cat, Dog)

      expect(Pet._union).toEqual([Cat, Dog])
    })

    it('should validate union members correctly', () => {
      const StringOrNumber = 口.union(String, Number)

      expect(StringOrNumber.check('hello')).toBe(true)
      expect(StringOrNumber.check(42)).toBe(true)
      expect(StringOrNumber.check(true)).toBe(false)
    })
  })

  describe('Enum Types', () => {
    it('should create enum with 口.enum()', () => {
      const Status = 口.enum('pending', 'active', 'completed')

      expect(Status).toBeDefined()
      expect(Status.values).toEqual(['pending', 'active', 'completed'])
    })

    it('should validate enum values', () => {
      const Color = 口.enum('red', 'green', 'blue')

      expect(Color.check('red')).toBe(true)
      expect(Color.check('yellow')).toBe(false)
    })

    it('should support enum in schema fields', () => {
      const Status = 口.enum('draft', 'published', 'archived')

      const Post = 口({
        title: String,
        status: Status,
      })

      expect(Post.shape.status).toBe(Status)
    })
  })

  describe('Literal Types', () => {
    it('should create literal type with 口.literal()', () => {
      const SuccessStatus = 口.literal('success')

      expect(SuccessStatus).toBeDefined()
      expect(SuccessStatus.value).toBe('success')
    })

    it('should validate literal values', () => {
      const VersionOne = 口.literal(1)

      expect(VersionOne.check(1)).toBe(true)
      expect(VersionOne.check(2)).toBe(false)
    })

    it('should support literal boolean', () => {
      const AlwaysTrue = 口.literal(true)

      expect(AlwaysTrue.check(true)).toBe(true)
      expect(AlwaysTrue.check(false)).toBe(false)
    })
  })

  describe('Custom Validation', () => {
    it('should support custom validate function in schema', () => {
      const Email = 口({
        value: String,
        validate: (v: string) => v.includes('@'),
      })

      expect(Email).toBeDefined()
    })

    it('should call validate function during parse', () => {
      const validator = vi.fn((v: string) => v.length > 0)

      const NonEmpty = 口({
        value: String,
        validate: validator,
      })

      NonEmpty.parse({ value: 'hello' })

      expect(validator).toHaveBeenCalledWith('hello')
    })

    it('should support 口.refine() for adding validation', () => {
      const PositiveNumber = 口(Number).refine((n) => n > 0, {
        message: 'Must be positive',
      })

      expect(PositiveNumber.check(5)).toBe(true)
      expect(PositiveNumber.check(-1)).toBe(false)
    })

    it('should chain multiple refinements', () => {
      const EvenPositive = 口(Number)
        .refine((n) => n > 0)
        .refine((n) => n % 2 === 0)

      expect(EvenPositive.check(4)).toBe(true)
      expect(EvenPositive.check(3)).toBe(false)
      expect(EvenPositive.check(-2)).toBe(false)
    })

    it('should provide error message from refine', () => {
      const Adult = 口(Number).refine((age) => age >= 18, {
        message: 'Must be 18 or older',
      })

      const result = Adult.safeParse(10)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('18 or older')
      }
    })
  })

  describe('Schema.parse() - Strict Validation', () => {
    it('should parse valid data successfully', () => {
      const User = 口({
        name: String,
        age: Number,
      })

      const result = User.parse({ name: 'Alice', age: 30 })

      expect(result).toEqual({ name: 'Alice', age: 30 })
    })

    it('should throw on invalid data', () => {
      const User = 口({
        name: String,
        age: Number,
      })

      expect(() => User.parse({ name: 123, age: 'not a number' }))
        .toThrow()
    })

    it('should throw on missing required fields', () => {
      const User = 口({
        name: String,
        email: String,
      })

      expect(() => User.parse({ name: 'Alice' }))
        .toThrow()
    })

    it('should strip unknown fields by default', () => {
      const User = 口({
        name: String,
      })

      const result = User.parse({ name: 'Alice', extraField: 'ignored' })

      expect(result).toEqual({ name: 'Alice' })
      expect((result as any).extraField).toBeUndefined()
    })

    it('should coerce types when possible', () => {
      const Schema = 口({
        count: Number,
        active: Boolean,
      })

      const result = Schema.parse({ count: '42', active: 'true' })

      expect(result.count).toBe(42)
      expect(result.active).toBe(true)
    })
  })

  describe('Schema.safeParse() - Non-Throwing Validation', () => {
    it('should return success result for valid data', () => {
      const User = 口({
        name: String,
        age: Number,
      })

      const result = User.safeParse({ name: 'Alice', age: 30 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ name: 'Alice', age: 30 })
      }
    })

    it('should return error result for invalid data', () => {
      const User = 口({
        name: String,
        age: Number,
      })

      const result = User.safeParse({ name: 123, age: 'not a number' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.error.issues).toBeDefined()
      }
    })

    it('should include path in validation errors', () => {
      const Profile = 口({
        user: 口({
          name: String,
          email: String,
        }),
      })

      const result = Profile.safeParse({
        user: { name: 'Alice', email: 123 },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['user', 'email'])
      }
    })

    it('should collect all validation errors', () => {
      const User = 口({
        name: String,
        email: String,
        age: Number,
      })

      const result = User.safeParse({ name: 123, email: true, age: 'invalid' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(3)
      }
    })
  })

  describe('Schema.check() - Type Guard', () => {
    it('should return true for valid data', () => {
      const User = 口({
        name: String,
        age: Number,
      })

      expect(User.check({ name: 'Alice', age: 30 })).toBe(true)
    })

    it('should return false for invalid data', () => {
      const User = 口({
        name: String,
        age: Number,
      })

      expect(User.check({ name: 123, age: 'invalid' })).toBe(false)
    })

    it('should narrow types when used as type guard', () => {
      const User = 口({
        name: String,
        age: Number,
      })

      const data: unknown = { name: 'Alice', age: 30 }

      if (User.check(data)) {
        // TypeScript should know data is { name: string, age: number }
        expect(data.name).toBe('Alice')
        expect(data.age).toBe(30)
      }
    })
  })

  describe('Schema.partial() - Make All Fields Optional', () => {
    it('should create schema with all optional fields', () => {
      const User = 口({
        name: String,
        email: String,
        age: Number,
      })

      const PartialUser = User.partial()

      expect(PartialUser.isOptional('name')).toBe(true)
      expect(PartialUser.isOptional('email')).toBe(true)
      expect(PartialUser.isOptional('age')).toBe(true)
    })

    it('should validate partial data', () => {
      const User = 口({
        name: String,
        email: String,
      })

      const PartialUser = User.partial()
      const result = PartialUser.parse({ name: 'Alice' })

      expect(result).toEqual({ name: 'Alice' })
    })

    it('should make specific fields optional with partial(keys)', () => {
      const User = 口({
        name: String,
        email: String,
        age: Number,
      })

      const PartialUser = User.partial(['email', 'age'])

      expect(PartialUser.isOptional('name')).toBe(false)
      expect(PartialUser.isOptional('email')).toBe(true)
      expect(PartialUser.isOptional('age')).toBe(true)
    })
  })

  describe('Schema.required() - Make All Fields Required', () => {
    it('should create schema with all required fields', () => {
      const User = 口({
        name: String,
        email: 口.optional(String),
        age: 口.optional(Number),
      })

      const RequiredUser = User.required()

      expect(RequiredUser.isOptional('name')).toBe(false)
      expect(RequiredUser.isOptional('email')).toBe(false)
      expect(RequiredUser.isOptional('age')).toBe(false)
    })
  })

  describe('Schema.pick() - Select Specific Fields', () => {
    it('should create schema with only picked fields', () => {
      const User = 口({
        name: String,
        email: String,
        age: Number,
        active: Boolean,
      })

      const NameAndEmail = User.pick(['name', 'email'])

      expect(NameAndEmail.shape.name).toBe(String)
      expect(NameAndEmail.shape.email).toBe(String)
      expect(NameAndEmail.shape.age).toBeUndefined()
      expect(NameAndEmail.shape.active).toBeUndefined()
    })
  })

  describe('Schema.omit() - Exclude Specific Fields', () => {
    it('should create schema without omitted fields', () => {
      const User = 口({
        id: String,
        name: String,
        password: String,
      })

      const PublicUser = User.omit(['password'])

      expect(PublicUser.shape.id).toBe(String)
      expect(PublicUser.shape.name).toBe(String)
      expect(PublicUser.shape.password).toBeUndefined()
    })
  })

  describe('Schema.extend() - Add Fields', () => {
    it('should add new fields to schema', () => {
      const Base = 口({
        id: String,
        name: String,
      })

      const Extended = Base.extend({
        email: String,
        age: Number,
      })

      expect(Extended.shape.id).toBe(String)
      expect(Extended.shape.name).toBe(String)
      expect(Extended.shape.email).toBe(String)
      expect(Extended.shape.age).toBe(Number)
    })

    it('should override existing fields', () => {
      const Base = 口({
        id: String,
        count: String,
      })

      const Extended = Base.extend({
        count: Number, // Override string with number
      })

      expect(Extended.shape.count).toBe(Number)
    })
  })

  describe('Schema.merge() - Combine Schemas', () => {
    it('should merge two schemas', () => {
      const UserBase = 口({
        name: String,
        email: String,
      })

      const UserProfile = 口({
        bio: String,
        avatar: String,
      })

      const FullUser = UserBase.merge(UserProfile)

      expect(FullUser.shape.name).toBe(String)
      expect(FullUser.shape.email).toBe(String)
      expect(FullUser.shape.bio).toBe(String)
      expect(FullUser.shape.avatar).toBe(String)
    })
  })

  describe('Type Inference with 口.Infer', () => {
    it('should infer type from schema', () => {
      const User = 口({
        name: String,
        age: Number,
        active: Boolean,
      })

      type UserType = 口.Infer<typeof User>

      // This is a compile-time check - runtime just validates structure
      const user: UserType = { name: 'Alice', age: 30, active: true }

      expect(user.name).toBe('Alice')
      expect(user.age).toBe(30)
      expect(user.active).toBe(true)
    })

    it('should infer nested types', () => {
      const Profile = 口({
        user: 口({
          name: String,
          email: String,
        }),
        settings: 口({
          theme: String,
        }),
      })

      type ProfileType = 口.Infer<typeof Profile>

      const profile: ProfileType = {
        user: { name: 'Alice', email: 'alice@example.com' },
        settings: { theme: 'dark' },
      }

      expect(profile.user.name).toBe('Alice')
      expect(profile.settings.theme).toBe('dark')
    })

    it('should infer optional fields correctly', () => {
      const User = 口({
        name: String,
        nickname: 口.optional(String),
      })

      type UserType = 口.Infer<typeof User>

      // nickname should be optional in the inferred type
      const user1: UserType = { name: 'Alice' }
      const user2: UserType = { name: 'Alice', nickname: 'Ali' }

      expect(user1.name).toBe('Alice')
      expect(user2.nickname).toBe('Ali')
    })

    it('should infer array types', () => {
      const List = 口({
        items: [String],
        counts: [Number],
      })

      type ListType = 口.Infer<typeof List>

      const list: ListType = {
        items: ['a', 'b', 'c'],
        counts: [1, 2, 3],
      }

      expect(list.items).toHaveLength(3)
      expect(list.counts[0]).toBe(1)
    })
  })

  describe('Primitive Type Wrappers', () => {
    it('should support 口.string() for string type', () => {
      const StringSchema = 口.string()

      expect(StringSchema.check('hello')).toBe(true)
      expect(StringSchema.check(123)).toBe(false)
    })

    it('should support 口.number() for number type', () => {
      const NumberSchema = 口.number()

      expect(NumberSchema.check(42)).toBe(true)
      expect(NumberSchema.check('42')).toBe(false)
    })

    it('should support 口.boolean() for boolean type', () => {
      const BoolSchema = 口.boolean()

      expect(BoolSchema.check(true)).toBe(true)
      expect(BoolSchema.check(false)).toBe(true)
      expect(BoolSchema.check('true')).toBe(false)
    })

    it('should support 口.date() for date type', () => {
      const DateSchema = 口.date()

      expect(DateSchema.check(new Date())).toBe(true)
      expect(DateSchema.check('2024-01-01')).toBe(false)
    })

    it('should support 口.any() for any type', () => {
      const AnySchema = 口.any()

      expect(AnySchema.check('string')).toBe(true)
      expect(AnySchema.check(123)).toBe(true)
      expect(AnySchema.check(null)).toBe(true)
      expect(AnySchema.check(undefined)).toBe(true)
    })

    it('should support 口.unknown() for unknown type', () => {
      const UnknownSchema = 口.unknown()

      expect(UnknownSchema.check('anything')).toBe(true)
    })
  })

  describe('String Validation Helpers', () => {
    it('should support min length with 口.string().min()', () => {
      const Schema = 口.string().min(3)

      expect(Schema.check('abc')).toBe(true)
      expect(Schema.check('ab')).toBe(false)
    })

    it('should support max length with 口.string().max()', () => {
      const Schema = 口.string().max(5)

      expect(Schema.check('abc')).toBe(true)
      expect(Schema.check('abcdef')).toBe(false)
    })

    it('should support email validation with 口.string().email()', () => {
      const Email = 口.string().email()

      expect(Email.check('test@example.com')).toBe(true)
      expect(Email.check('not-an-email')).toBe(false)
    })

    it('should support URL validation with 口.string().url()', () => {
      const Url = 口.string().url()

      expect(Url.check('https://example.com')).toBe(true)
      expect(Url.check('not-a-url')).toBe(false)
    })

    it('should support regex validation with 口.string().regex()', () => {
      const PhoneNumber = 口.string().regex(/^\d{3}-\d{3}-\d{4}$/)

      expect(PhoneNumber.check('123-456-7890')).toBe(true)
      expect(PhoneNumber.check('1234567890')).toBe(false)
    })

    it('should support uuid validation with 口.string().uuid()', () => {
      const Uuid = 口.string().uuid()

      expect(Uuid.check('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(Uuid.check('not-a-uuid')).toBe(false)
    })
  })

  describe('Number Validation Helpers', () => {
    it('should support min value with 口.number().min()', () => {
      const Schema = 口.number().min(0)

      expect(Schema.check(0)).toBe(true)
      expect(Schema.check(10)).toBe(true)
      expect(Schema.check(-1)).toBe(false)
    })

    it('should support max value with 口.number().max()', () => {
      const Schema = 口.number().max(100)

      expect(Schema.check(50)).toBe(true)
      expect(Schema.check(101)).toBe(false)
    })

    it('should support integer validation with 口.number().int()', () => {
      const IntSchema = 口.number().int()

      expect(IntSchema.check(42)).toBe(true)
      expect(IntSchema.check(3.14)).toBe(false)
    })

    it('should support positive validation with 口.number().positive()', () => {
      const PositiveSchema = 口.number().positive()

      expect(PositiveSchema.check(1)).toBe(true)
      expect(PositiveSchema.check(0)).toBe(false)
      expect(PositiveSchema.check(-1)).toBe(false)
    })

    it('should support negative validation with 口.number().negative()', () => {
      const NegativeSchema = 口.number().negative()

      expect(NegativeSchema.check(-1)).toBe(true)
      expect(NegativeSchema.check(0)).toBe(false)
      expect(NegativeSchema.check(1)).toBe(false)
    })
  })

  describe('Array Validation Helpers', () => {
    it('should support min length with 口.array().min()', () => {
      const Schema = 口.array(String).min(2)

      expect(Schema.check(['a', 'b'])).toBe(true)
      expect(Schema.check(['a'])).toBe(false)
    })

    it('should support max length with 口.array().max()', () => {
      const Schema = 口.array(String).max(3)

      expect(Schema.check(['a', 'b'])).toBe(true)
      expect(Schema.check(['a', 'b', 'c', 'd'])).toBe(false)
    })

    it('should support nonempty with 口.array().nonempty()', () => {
      const Schema = 口.array(String).nonempty()

      expect(Schema.check(['a'])).toBe(true)
      expect(Schema.check([])).toBe(false)
    })
  })

  describe('Default Values', () => {
    it('should support default values with 口.default()', () => {
      const Schema = 口({
        name: String,
        role: 口.default('user'),
      })

      const result = Schema.parse({ name: 'Alice' })

      expect(result.role).toBe('user')
    })

    it('should not apply default when value is provided', () => {
      const Schema = 口({
        name: String,
        role: 口.default('user'),
      })

      const result = Schema.parse({ name: 'Alice', role: 'admin' })

      expect(result.role).toBe('admin')
    })

    it('should support function default for dynamic values', () => {
      const Schema = 口({
        id: 口.default(() => crypto.randomUUID()),
        createdAt: 口.default(() => new Date()),
      })

      const result = Schema.parse({})

      expect(typeof result.id).toBe('string')
      expect(result.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('Transform', () => {
    it('should support transform with 口.transform()', () => {
      const LowerCaseEmail = 口.string().transform((s) => s.toLowerCase())

      const result = LowerCaseEmail.parse('ALICE@EXAMPLE.COM')

      expect(result).toBe('alice@example.com')
    })

    it('should chain transforms', () => {
      const Schema = 口.string()
        .transform((s) => s.trim())
        .transform((s) => s.toLowerCase())

      const result = Schema.parse('  HELLO  ')

      expect(result).toBe('hello')
    })
  })

  describe('Passthrough and Strict Modes', () => {
    it('should pass through unknown fields with passthrough()', () => {
      const User = 口({
        name: String,
      }).passthrough()

      const result = User.parse({ name: 'Alice', extra: 'field' })

      expect(result.name).toBe('Alice')
      expect((result as any).extra).toBe('field')
    })

    it('should reject unknown fields with strict()', () => {
      const User = 口({
        name: String,
      }).strict()

      expect(() => User.parse({ name: 'Alice', extra: 'field' }))
        .toThrow()
    })
  })

  describe('ASCII Alias - T', () => {
    it('should export T as alias for 口', () => {
      expect(T).toBeDefined()
      expect(T).toBe(口)
    })

    it('should work identically via T alias - schema creation', () => {
      const User = T({
        name: String,
        age: Number,
      })

      expect(User.shape.name).toBe(String)
      expect(User.shape.age).toBe(Number)
    })

    it('should support T.Infer type helper', () => {
      const User = T({
        name: String,
      })

      type UserType = T.Infer<typeof User>

      const user: UserType = { name: 'Alice' }
      expect(user.name).toBe('Alice')
    })

    it('should support all T methods', () => {
      expect(typeof T.string).toBe('function')
      expect(typeof T.number).toBe('function')
      expect(typeof T.boolean).toBe('function')
      expect(typeof T.array).toBe('function')
      expect(typeof T.union).toBe('function')
      expect(typeof T.enum).toBe('function')
      expect(typeof T.optional).toBe('function')
      expect(typeof T.nullable).toBe('function')
    })
  })

  describe('Discriminated Unions', () => {
    it('should support discriminated unions', () => {
      const Cat = 口({ kind: 口.literal('cat'), meows: Boolean })
      const Dog = 口({ kind: 口.literal('dog'), barks: Boolean })

      const Pet = 口.discriminatedUnion('kind', [Cat, Dog])

      expect(Pet.check({ kind: 'cat', meows: true })).toBe(true)
      expect(Pet.check({ kind: 'dog', barks: true })).toBe(true)
      expect(Pet.check({ kind: 'fish', swims: true })).toBe(false)
    })

    it('should provide better error messages for discriminated unions', () => {
      const Success = 口({ status: 口.literal('success'), data: String })
      const Error = 口({ status: 口.literal('error'), message: String })

      const Response = 口.discriminatedUnion('status', [Success, Error])

      const result = Response.safeParse({ status: 'success', data: 123 })

      expect(result.success).toBe(false)
      if (!result.success) {
        // Error should mention the specific variant based on discriminator
        expect(result.error.issues[0].path).toContain('data')
      }
    })
  })

  describe('Recursive Types', () => {
    it('should support recursive schemas with 口.lazy()', () => {
      interface TreeNode {
        value: string
        children: TreeNode[]
      }

      const TreeNode: 口.Schema<TreeNode> = 口({
        value: String,
        children: 口.lazy(() => 口.array(TreeNode)),
      })

      const tree = TreeNode.parse({
        value: 'root',
        children: [
          { value: 'child1', children: [] },
          { value: 'child2', children: [{ value: 'grandchild', children: [] }] },
        ],
      })

      expect(tree.value).toBe('root')
      expect(tree.children).toHaveLength(2)
    })
  })

  describe('Coercion', () => {
    it('should coerce strings to numbers with 口.coerce.number()', () => {
      const Schema = 口.coerce.number()

      expect(Schema.parse('42')).toBe(42)
      expect(Schema.parse('3.14')).toBe(3.14)
    })

    it('should coerce to boolean with 口.coerce.boolean()', () => {
      const Schema = 口.coerce.boolean()

      expect(Schema.parse('true')).toBe(true)
      expect(Schema.parse('false')).toBe(false)
      expect(Schema.parse(1)).toBe(true)
      expect(Schema.parse(0)).toBe(false)
    })

    it('should coerce to date with 口.coerce.date()', () => {
      const Schema = 口.coerce.date()

      const result = Schema.parse('2024-01-15')

      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('Error Formatting', () => {
    it('should format errors with flatten()', () => {
      const User = 口({
        name: String,
        email: String,
        age: Number,
      })

      const result = User.safeParse({ name: 123, email: 'valid', age: 'invalid' })

      if (!result.success) {
        const formatted = result.error.flatten()

        expect(formatted.fieldErrors.name).toBeDefined()
        expect(formatted.fieldErrors.age).toBeDefined()
        expect(formatted.fieldErrors.email).toBeUndefined()
      }
    })

    it('should format errors with format()', () => {
      const User = 口({
        name: String,
        profile: 口({
          bio: String,
        }),
      })

      const result = User.safeParse({
        name: 123,
        profile: { bio: true },
      })

      if (!result.success) {
        const formatted = result.error.format()

        expect(formatted.name?._errors).toBeDefined()
        expect(formatted.profile?.bio?._errors).toBeDefined()
      }
    })
  })

  describe('Brand Types', () => {
    it('should support branded types with 口.brand()', () => {
      const UserId = 口.string().brand<'UserId'>()
      const PostId = 口.string().brand<'PostId'>()

      const userId = UserId.parse('user-123')
      const postId = PostId.parse('post-456')

      // These should be incompatible at type level
      expect(userId).toBe('user-123')
      expect(postId).toBe('post-456')
    })
  })

  describe('Instance Validation', () => {
    it('should support instanceof checks with 口.instanceof()', () => {
      class CustomClass {
        value: number
        constructor(value: number) {
          this.value = value
        }
      }

      const Schema = 口.instanceof(CustomClass)

      const instance = new CustomClass(42)
      expect(Schema.check(instance)).toBe(true)
      expect(Schema.check({ value: 42 })).toBe(false)
    })
  })

  describe('Record Types', () => {
    it('should support record with 口.record()', () => {
      const StringRecord = 口.record(String)

      expect(StringRecord.check({ a: 'hello', b: 'world' })).toBe(true)
      expect(StringRecord.check({ a: 'hello', b: 123 })).toBe(false)
    })

    it('should support record with key type', () => {
      const NumberRecord = 口.record(口.string(), Number)

      expect(NumberRecord.check({ a: 1, b: 2 })).toBe(true)
      expect(NumberRecord.check({ a: 'not a number' })).toBe(false)
    })
  })

  describe('Map and Set Types', () => {
    it('should support Map type with 口.map()', () => {
      const StringNumberMap = 口.map(口.string(), 口.number())

      const map = new Map([['a', 1], ['b', 2]])
      expect(StringNumberMap.check(map)).toBe(true)
    })

    it('should support Set type with 口.set()', () => {
      const NumberSet = 口.set(口.number())

      const set = new Set([1, 2, 3])
      expect(NumberSet.check(set)).toBe(true)
    })
  })
})

describe('口 Integration with 回 (Instance Creation)', () => {
  it('should work with 回 for instance creation', () => {
    const User = 口({
      name: String,
      email: String,
    })

    // Note: 回 import would come from separate module
    // This test documents the expected integration
    const userData = User.parse({
      name: 'Alice',
      email: 'alice@example.com',
    })

    expect(userData).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
    })
  })

  it('should validate before instance creation', () => {
    const User = 口({
      name: String,
      age: Number,
    })

    expect(() => User.parse({ name: 123, age: 'invalid' })).toThrow()
  })
})
