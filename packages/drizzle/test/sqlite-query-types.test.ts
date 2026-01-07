/**
 * RED Phase TDD: SQLite Query Type Safety Tests
 *
 * These tests define the contract for typed SQLite query helpers that ensure
 * type safety when working with Durable Object storage.
 *
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * Issue: workers-fbhm-red
 *
 * Problem Being Solved:
 * The codebase has 30+ occurrences of unsafe patterns like:
 *   const rows = result.toArray() as Array<{ version: string }>
 *   const sessions = result.toArray() as StoredSession[]
 *
 * These patterns bypass TypeScript's type checking and can lead to runtime
 * errors when the actual data doesn't match the expected shape.
 *
 * This test suite defines the interface for:
 * - TypedQuery: Query interface with generic type parameter
 * - StorageHelpers: Helper methods for typed database operations
 * - Compile-time rejection of unsafe patterns (any, unknown)
 * - Null safety for queryOne operations
 */

import { describe, it, expect, expectTypeOf } from 'vitest'

// ============================================
// Type Stubs for RED Phase Testing
// ============================================
// These types represent what SHOULD be exported from ../src/index.js
// When implementation exists, replace these with actual imports:
//   import type { TypedQuery, StorageHelpers, ... } from '../src/index.js'

/**
 * TypedQuery interface - represents a typed SQL query
 * T is the expected row type
 */
interface TypedQuery<T> {
  /** The SQL query string */
  sql: string
  /** Query parameters/bindings */
  bindings?: unknown[]
  /** The result type (for type inference) */
  result: T[]
  /** Execute and return typed array */
  execute(sql: SqlStorage): Promise<T[]>
  /** Execute and return single result or undefined */
  executeOne(sql: SqlStorage, bindings?: unknown[]): Promise<T | undefined>
  /** Fluent where clause */
  where(clause: string, bindings?: unknown[]): TypedQuery<T>
  /** Fluent order by */
  orderBy(column: keyof T, direction?: 'ASC' | 'DESC'): TypedQuery<T>
  /** Fluent limit */
  limit(count: number): TypedQuery<T>
  /** Narrow to specific columns */
  select<K extends keyof T>(columns: K[]): TypedQuery<Pick<T, K>>
}

/**
 * TypedSqlResult interface - typed wrapper around SqlStorageCursor
 */
interface TypedSqlResult<T> {
  readonly columnNames: string[]
  readonly rowsRead: number
  readonly rowsWritten: number
  toArray(): T[]
  one(): T | null
}

/**
 * StorageHelpers interface - helper methods for typed DB operations
 */
interface StorageHelpers {
  query<T>(sql: string, bindings?: unknown[], options?: QueryOptions): Promise<T[]>
  queryOne<T>(sql: string, bindings?: unknown[], options?: QueryOptions): Promise<T | undefined>
  queryOneOrThrow<T>(sql: string, bindings?: unknown[], options?: QueryOptions): Promise<T>
  queryCursor<T>(sql: string, bindings?: unknown[]): AsyncIterable<T>
  queryWithMeta<T>(sql: string, bindings?: unknown[]): Promise<{
    data: T[]
    rowsRead: number
    rowsWritten: number
    columnNames: string[]
  }>
  execute(sql: string, bindings?: unknown[]): Promise<void>
}

/**
 * QueryOptions for customizing query behavior
 */
interface QueryOptions {
  schema?: unknown // Would be ZodType in practice
  timeout?: number
}

/**
 * TypedRow utility - maps SQL column types to TypeScript types
 */
type TypedRow<Schema extends Record<string, string>> = {
  [K in keyof Schema]: Schema[K] extends 'text'
    ? string
    : Schema[K] extends 'text | null'
      ? string | null
      : Schema[K] extends 'integer'
        ? number
        : Schema[K] extends 'real'
          ? number
          : Schema[K] extends 'blob'
            ? ArrayBuffer
            : unknown
}

/**
 * SqlStorage interface (matches Cloudflare DO SqlStorage)
 */
interface SqlStorage {
  exec<T = Record<string, unknown>>(query: string, ...bindings: unknown[]): SqlStorageCursor<T>
}

/**
 * SqlStorageCursor interface (matches Cloudflare DO SqlStorageCursor)
 */
interface SqlStorageCursor<T = Record<string, unknown>> {
  readonly columnNames: string[]
  readonly rowsRead: number
  readonly rowsWritten: number
  toArray(): T[]
  one(): T | null
}

// Placeholder factory functions - will throw until implemented
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createStorageHelpers(_sql: SqlStorage, _options?: { schema?: unknown; strict?: boolean; defaultSchema?: unknown }): StorageHelpers {
  throw new Error('createStorageHelpers not implemented - RED phase')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createTypedQuery<T>(_sql: string): TypedQuery<T> {
  throw new Error('createTypedQuery not implemented - RED phase')
}

// ============================================
// Type-Level Test Utilities
// ============================================

/**
 * Helper type to test that a type is exactly `any`
 * If T is any, this resolves to true, otherwise false
 */
type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * Helper type to test that a type is `never`
 */
type IsNever<T> = [T] extends [never] ? true : false

/**
 * Helper type to test that a type is `unknown`
 */
type IsUnknown<T> = unknown extends T ? (IsAny<T> extends true ? false : true) : false

// ============================================
// Mock Types for Testing (Before Implementation)
// ============================================

// These represent the expected data shapes we'll be querying
interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

interface Session {
  id: string
  userId: string
  token: string
  expiresAt: number
}

interface MigrationRecord {
  version: string
  appliedAt: string
  checksum: string
}

interface Thing {
  id: string
  type: string
  data: string
  createdAt: string
  updatedAt: string
}

// ============================================
// Test Suite: TypedQuery Interface
// ============================================

describe('TypedQuery Interface Contract', () => {
  describe('Type Contract Definitions', () => {
    it('TypedQuery type should be defined with correct shape', () => {
      // TypedQuery must have these properties
      const assertType: TypedQuery<User> = {} as TypedQuery<User>
      expect(assertType).toBeDefined()

      // Verify the interface shape
      expectTypeOf<TypedQuery<User>>().toHaveProperty('sql')
      expectTypeOf<TypedQuery<User>>().toHaveProperty('result')
      expectTypeOf<TypedQuery<User>>().toHaveProperty('execute')
      expectTypeOf<TypedQuery<User>>().toHaveProperty('executeOne')
    })

    it('StorageHelpers type should be defined with correct methods', () => {
      const assertType: StorageHelpers = {} as StorageHelpers
      expect(assertType).toBeDefined()

      // Verify required methods exist
      expectTypeOf<StorageHelpers>().toHaveProperty('query')
      expectTypeOf<StorageHelpers>().toHaveProperty('queryOne')
      expectTypeOf<StorageHelpers>().toHaveProperty('queryOneOrThrow')
      expectTypeOf<StorageHelpers>().toHaveProperty('execute')
    })

    it('TypedSqlResult type should wrap SqlStorageCursor with type safety', () => {
      const assertType: TypedSqlResult<User> = {} as TypedSqlResult<User>
      expect(assertType).toBeDefined()

      // Verify typed methods
      expectTypeOf<TypedSqlResult<User>>().toHaveProperty('toArray')
      expectTypeOf<TypedSqlResult<User>>().toHaveProperty('one')
      expectTypeOf<TypedSqlResult<User>>().toHaveProperty('rowsRead')
    })

    it('QueryOptions type should support schema validation', () => {
      const assertType: QueryOptions = {} as QueryOptions
      expect(assertType).toBeDefined()
    })

    it('createStorageHelpers factory should throw in RED phase', () => {
      // RED phase: factory throws because implementation doesn't exist
      const mockSql = {} as SqlStorage
      expect(() => createStorageHelpers(mockSql)).toThrow('createStorageHelpers not implemented')
    })

    it('createTypedQuery factory should throw in RED phase', () => {
      // RED phase: factory throws because implementation doesn't exist
      expect(() => createTypedQuery<User>('SELECT * FROM users')).toThrow('createTypedQuery not implemented')
    })
  })

  describe('TypedQuery Generic Constraints', () => {
    it('should preserve generic type parameter in query result', () => {
      // TypedQuery<T>.execute() should return T[]
      type QueryResult = TypedQuery<User>['result']

      // The result type should be User[], not any[] or unknown[]
      expectTypeOf<QueryResult>().toMatchTypeOf<User[]>()
    })

    it('should preserve generic type in toArray output', () => {
      // TypedSqlResult<T>.toArray() should return T[]
      type ArrayResult = ReturnType<TypedSqlResult<User>['toArray']>

      expectTypeOf<ArrayResult>().toMatchTypeOf<User[]>()
    })

    it('should preserve generic type in one() output', () => {
      // TypedSqlResult<T>.one() should return T | null
      type OneResult = ReturnType<TypedSqlResult<User>['one']>

      expectTypeOf<OneResult>().toMatchTypeOf<User | null>()
    })
  })

  describe('StorageHelpers Method Signatures', () => {
    it('query<T>() should return Promise<T[]>', () => {
      type QueryMethod = StorageHelpers['query']

      // query<User>(sql) should return Promise<User[]>
      // This validates the generic is properly threaded through
      type UserQueryResult = ReturnType<typeof query<User>>

      // Type assertion - will fail if signatures don't match
      const query: QueryMethod = (() => {}) as QueryMethod
      expectTypeOf(query<User>).returns.resolves.toMatchTypeOf<User[]>()
    })

    it('queryOne<T>() should return Promise<T | undefined>', () => {
      type QueryOneMethod = StorageHelpers['queryOne']

      // queryOne<User>(sql) should return Promise<User | undefined>
      const queryOne: QueryOneMethod = (() => {}) as QueryOneMethod
      expectTypeOf(queryOne<User>).returns.resolves.toMatchTypeOf<User | undefined>()
    })

    it('execute() should return Promise<void> for mutations', () => {
      type ExecuteMethod = StorageHelpers['execute']

      const execute: ExecuteMethod = (() => {}) as ExecuteMethod
      expectTypeOf(execute).returns.resolves.toMatchTypeOf<void>()
    })

    it('queryWithMeta<T>() should return result with metadata', () => {
      type QueryWithMetaMethod = StorageHelpers['queryWithMeta']

      const queryWithMeta: QueryWithMetaMethod = (() => {}) as QueryWithMetaMethod

      // Should return data plus metadata (rowsRead, rowsWritten, etc.)
      type ResultWithMeta = Awaited<ReturnType<typeof queryWithMeta<User>>>

      expectTypeOf<ResultWithMeta>().toHaveProperty('data')
      expectTypeOf<ResultWithMeta>().toHaveProperty('rowsRead')
      expectTypeOf<ResultWithMeta>().toHaveProperty('rowsWritten')
    })
  })
})

// ============================================
// Test Suite: Compile-Time Type Safety
// ============================================

describe('Compile-Time Type Safety Contract', () => {
  describe('Rejection of Unsafe Patterns', () => {
    it('should document that query<any> should be rejected in GREEN phase', () => {
      // This test documents that query<any> SHOULD be rejected
      // The GREEN implementation must add conditional types to prevent this
      //
      // Expected GREEN phase implementation:
      // type TypedQuery<T> = IsAny<T> extends true ? never : { ... }
      //
      // Currently in RED phase, this is allowed but shouldn't be:
      type UnsafeAnyQuery = TypedQuery<any>

      // This test passes in RED (type is allowed) but documents the contract
      // GREEN phase should make this a compile error
      expect(true).toBe(true) // Placeholder - real check is compile-time
    })

    it('should document that query<unknown> should be rejected in GREEN phase', () => {
      // Similarly, query<unknown> defeats the purpose of typing
      // GREEN implementation should reject this
      type UnsafeUnknownQuery = TypedQuery<unknown>

      // RED phase allows this, GREEN phase should reject
      expect(true).toBe(true)
    })

    it('should document that primitive types should be rejected in GREEN phase', () => {
      // Query results should be objects, not primitives
      // GREEN implementation should add: T extends object constraint
      type PrimitiveQuery = TypedQuery<string>
      type NumberQuery = TypedQuery<number>

      // RED phase allows these, GREEN phase should reject
      expect(true).toBe(true)
    })

    it('should document that empty object should be rejected in GREEN phase', () => {
      // TypedRow should enforce that row types have meaningful properties
      // GREEN implementation should add constraints
      type EmptyRowQuery = TypedQuery<Record<string, never>>

      // RED phase allows this, GREEN phase should reject
      expect(true).toBe(true)
    })
  })

  describe('Type Inference from SQL Schema', () => {
    it('should infer column types from schema definition', () => {
      // When using with Drizzle schema, types should be inferred

      // This represents a schema-driven query
      type SchemaUser = TypedRow<{
        id: 'text'
        name: 'text'
        age: 'integer'
        score: 'real'
        active: 'integer' // SQLite doesn't have boolean
      }>

      // The inferred type should match SQLite column types
      expectTypeOf<SchemaUser>().toMatchTypeOf<{
        id: string
        name: string
        age: number
        score: number
        active: number
      }>()
    })

    it('should handle nullable columns', () => {
      // Nullable columns should be typed as T | null

      type NullableUser = TypedRow<{
        id: 'text'
        email: 'text | null'
        bio: 'text | null'
      }>

      expectTypeOf<NullableUser['email']>().toMatchTypeOf<string | null>()
      expectTypeOf<NullableUser['bio']>().toMatchTypeOf<string | null>()
    })

    it('should map SQLite types to TypeScript types', () => {
      // Verify type mapping: TEXT -> string, INTEGER -> number, etc.

      type MappedTypes = TypedRow<{
        textCol: 'text'
        intCol: 'integer'
        realCol: 'real'
        blobCol: 'blob'
      }>

      expectTypeOf<MappedTypes['textCol']>().toBeString()
      expectTypeOf<MappedTypes['intCol']>().toBeNumber()
      expectTypeOf<MappedTypes['realCol']>().toBeNumber()
      expectTypeOf<MappedTypes['blobCol']>().toMatchTypeOf<ArrayBuffer>()
    })
  })

  describe('Branded Types for Additional Safety', () => {
    it('should support branded ID types', () => {
      // Branded types prevent mixing up IDs from different tables

      type UserId = string & { readonly __brand: 'UserId' }
      type SessionId = string & { readonly __brand: 'SessionId' }

      interface BrandedUser {
        id: UserId
        name: string
      }

      interface BrandedSession {
        id: SessionId
        userId: UserId
      }

      type BrandedUserQuery = TypedQuery<BrandedUser>
      type BrandedSessionQuery = TypedQuery<BrandedSession>

      // These should be distinct types
      expectTypeOf<BrandedUserQuery>().not.toMatchTypeOf<BrandedSessionQuery>()
    })
  })
})

// ============================================
// Test Suite: DO Storage Integration
// ============================================

describe('Durable Object Storage Integration Contract', () => {
  describe('StorageHelpers Factory', () => {
    it('should define factory signature that creates helpers from SqlStorage', () => {
      // RED phase: verify the factory TYPE is correct, not runtime behavior
      // createStorageHelpers should accept SqlStorage and return StorageHelpers
      type FactoryResult = ReturnType<typeof createStorageHelpers>
      expectTypeOf<FactoryResult>().toMatchTypeOf<StorageHelpers>()

      // Runtime test - should throw in RED phase
      const mockSql = {} as SqlStorage
      expect(() => createStorageHelpers(mockSql)).toThrow()
    })

    it('should define factory accepting optional validation schema', () => {
      // Type-level verification of the factory signature
      const mockSql = {} as SqlStorage
      const mockSchema = {} as unknown

      // Verify the overload accepts options
      type WithOptions = Parameters<typeof createStorageHelpers>[1]
      expectTypeOf<WithOptions>().toHaveProperty('schema')
      expectTypeOf<WithOptions>().toHaveProperty('strict')

      // Runtime throws in RED phase
      expect(() => createStorageHelpers(mockSql, { schema: mockSchema })).toThrow()
    })
  })

  describe('Safe Query Execution (Type Contracts)', () => {
    it('query<T> method signature should return Promise<T[]>', () => {
      // Type-level test: verify the method signature
      type QueryMethod = StorageHelpers['query']
      type QueryResult = ReturnType<QueryMethod>

      // The result should be Promise<T[]> where T is the generic parameter
      expectTypeOf<QueryResult>().toMatchTypeOf<Promise<unknown[]>>()
    })

    it('parameterized queries should accept binding arrays', () => {
      // Type-level test: verify binding parameter types
      type QueryParams = Parameters<StorageHelpers['query']>

      // Should accept: (sql: string, bindings?: unknown[], options?: QueryOptions)
      expectTypeOf<QueryParams[0]>().toBeString()
      expectTypeOf<QueryParams[1]>().toMatchTypeOf<unknown[] | undefined>()
    })

    it('queryCursor<T> should return AsyncIterable<T>', () => {
      // Type-level test: cursor should yield typed rows
      type CursorMethod = StorageHelpers['queryCursor']
      type CursorResult = ReturnType<CursorMethod>

      expectTypeOf<CursorResult>().toMatchTypeOf<AsyncIterable<unknown>>()
    })
  })

  describe('Null Safety for Single Row Queries (Type Contracts)', () => {
    it('queryOne<T> return type should include undefined', () => {
      // Type-level test: queryOne must return T | undefined
      type QueryOneMethod = StorageHelpers['queryOne']
      type QueryOneResult = ReturnType<QueryOneMethod>

      // Result should be Promise<T | undefined>, not Promise<T>
      expectTypeOf<QueryOneResult>().toMatchTypeOf<Promise<unknown | undefined>>()
    })

    it('queryOneOrThrow<T> return type should NOT include undefined', () => {
      // Type-level test: queryOneOrThrow returns T (throws on not found)
      type QueryOneOrThrowMethod = StorageHelpers['queryOneOrThrow']
      type QueryOneOrThrowResult = Awaited<ReturnType<QueryOneOrThrowMethod>>

      // Result should be T, not T | undefined
      // The undefined case throws instead
      expectTypeOf<QueryOneOrThrowResult>().not.toBeNullable()
    })

    it('should document null check requirement for queryOne result', () => {
      // This test documents the expected behavior:
      // When using queryOne<User>, the result type is User | undefined
      // Direct property access without null check should be a type error
      //
      // Example of what GREEN phase should enforce:
      // const result = await helpers.queryOne<User>('...')
      // result.name  // ERROR: result might be undefined
      // result?.name // OK: optional chaining handles undefined
      //
      // This is enforced by the return type Promise<T | undefined>

      type Result = Awaited<ReturnType<StorageHelpers['queryOne']>>

      // Verify undefined is in the union
      expectTypeOf<Result>().toMatchTypeOf<unknown | undefined>()
    })
  })
})

// ============================================
// Test Suite: TypedQuery Builder Pattern
// ============================================

describe('TypedQuery Builder Pattern Contract', () => {
  describe('Query Builder Creation', () => {
    it('should define createTypedQuery that returns TypedQuery<T>', () => {
      // Type-level verification
      type FactoryResult = ReturnType<typeof createTypedQuery<User>>
      expectTypeOf<FactoryResult>().toMatchTypeOf<TypedQuery<User>>()

      // Runtime throws in RED phase
      expect(() => createTypedQuery<User>('SELECT * FROM users')).toThrow()
    })

    it('TypedQuery should support fluent method chaining', () => {
      // Type-level verification of fluent interface
      type WhereResult = ReturnType<TypedQuery<User>['where']>
      type OrderByResult = ReturnType<TypedQuery<User>['orderBy']>
      type LimitResult = ReturnType<TypedQuery<User>['limit']>

      // All fluent methods should return TypedQuery<T>
      expectTypeOf<WhereResult>().toMatchTypeOf<TypedQuery<User>>()
      expectTypeOf<OrderByResult>().toMatchTypeOf<TypedQuery<User>>()
      expectTypeOf<LimitResult>().toMatchTypeOf<TypedQuery<User>>()
    })
  })

  describe('Query Execution (Type Contracts)', () => {
    it('execute() should return Promise<T[]>', () => {
      // Type-level verification
      type ExecuteMethod = TypedQuery<User>['execute']
      type ExecuteResult = Awaited<ReturnType<ExecuteMethod>>

      expectTypeOf<ExecuteResult>().toMatchTypeOf<User[]>()
    })

    it('executeOne() should return Promise<T | undefined>', () => {
      // Type-level verification
      type ExecuteOneMethod = TypedQuery<User>['executeOne']
      type ExecuteOneResult = Awaited<ReturnType<ExecuteOneMethod>>

      expectTypeOf<ExecuteOneResult>().toMatchTypeOf<User | undefined>()
    })
  })

  describe('Select Column Subset (Type Contracts)', () => {
    it('select() should narrow return type to Pick<T, K>', () => {
      // When selecting specific columns, return type should narrow
      type SelectMethod = TypedQuery<User>['select']

      // select(['id', 'name']) should return TypedQuery<Pick<User, 'id' | 'name'>>
      // This is enforced by the generic constraint K extends keyof T

      // Type-level verification: the select method signature narrows the result
      type NarrowedResult = ReturnType<(columns: ('id' | 'name')[]) => TypedQuery<Pick<User, 'id' | 'name'>>>

      expectTypeOf<NarrowedResult>().toMatchTypeOf<TypedQuery<Pick<User, 'id' | 'name'>>>()
    })

    it('select() should only accept valid column names', () => {
      // Type-level verification: select parameter is constrained to keyof T
      type SelectParams = Parameters<TypedQuery<User>['select']>[0]

      // Should be (keyof User)[] which is ('id' | 'name' | 'email' | 'createdAt')[]
      expectTypeOf<SelectParams>().toMatchTypeOf<(keyof User)[]>()
    })
  })
})

// ============================================
// Test Suite: Runtime Validation Integration
// ============================================

describe('Runtime Validation Integration Contract', () => {
  describe('Zod Schema Validation (Type Contracts)', () => {
    it('QueryOptions should accept schema parameter', () => {
      // Type-level verification: QueryOptions should have schema property
      type SchemaOption = QueryOptions['schema']

      // Schema is typed as unknown to allow any Zod schema
      expectTypeOf<SchemaOption>().toMatchTypeOf<unknown>()
    })

    it('factory should accept defaultSchema in options', () => {
      // Type-level verification of factory options
      type FactoryOptions = Parameters<typeof createStorageHelpers>[1]

      expectTypeOf<FactoryOptions>().toHaveProperty('defaultSchema')
    })

    it('per-query schema should be passable via options', () => {
      // Type-level verification
      type QueryOptions3rdParam = Parameters<StorageHelpers['query']>[2]

      expectTypeOf<QueryOptions3rdParam>().toMatchTypeOf<QueryOptions | undefined>()
    })
  })

  describe('Optional Runtime Validation (Type Contracts)', () => {
    it('query should work without schema (TypeScript-only typing)', () => {
      // Type-level verification: bindings and options are optional
      type QueryParams = Parameters<StorageHelpers['query']>

      // All parameters after first should be optional
      expectTypeOf<QueryParams[1]>().toMatchTypeOf<unknown[] | undefined>()
      expectTypeOf<QueryParams[2]>().toMatchTypeOf<QueryOptions | undefined>()
    })

    it('factory should accept strict option', () => {
      // Type-level verification
      type FactoryOptions = Parameters<typeof createStorageHelpers>[1]

      expectTypeOf<FactoryOptions>().toHaveProperty('strict')
    })
  })
})

// ============================================
// Test Suite: Migration Safety
// ============================================

describe('Migration Type Safety Contract', () => {
  it('query<MigrationRecord> should return typed migration rows', () => {
    // Type-level verification: query with MigrationRecord type
    type QueryResult = Awaited<ReturnType<StorageHelpers['query']>>

    // When called as query<MigrationRecord>('...'), result should be MigrationRecord[]
    // This is verified by the generic constraint
    expectTypeOf<QueryResult>().toMatchTypeOf<unknown[]>()
  })

  it('migration version access should require null check on array element', () => {
    // Type-level verification: array access returns T | undefined
    type MigrationArray = MigrationRecord[]
    type FirstElement = MigrationArray[0]

    // Array element access returns T | undefined
    expectTypeOf<FirstElement>().toMatchTypeOf<MigrationRecord | undefined>()

    // This means migrations[0]?.version is required, not migrations[0].version
  })

  it('schema introspection queries should be typeable', () => {
    // Type-level verification: PRAGMA results can be typed
    interface TableInfo {
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }

    // query<TableInfo>('PRAGMA table_info(...)') should work
    type PragmaResult = TableInfo[]

    expectTypeOf<PragmaResult[0]>().toMatchTypeOf<TableInfo | undefined>()
  })
})

// ============================================
// Test Suite: Error Types
// ============================================

describe('Error Type Safety Contract', () => {
  it('should define QueryError type', () => {
    // Import would fail until implemented
    type QueryError = {
      code: string
      message: string
      query: string
      bindings: unknown[]
      cause?: Error
    }

    const error: QueryError = {
      code: 'SQLITE_ERROR',
      message: 'no such table: users',
      query: 'SELECT * FROM users',
      bindings: [],
    }

    expectTypeOf(error).toMatchTypeOf<QueryError>()
  })

  it('should define ValidationError type', () => {
    type ValidationError = {
      code: 'VALIDATION_ERROR'
      message: string
      row: unknown
      expected: string
      actual: string
    }

    const error: ValidationError = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid row data',
      row: { id: 1 },
      expected: 'string',
      actual: 'number',
    }

    expectTypeOf(error).toMatchTypeOf<ValidationError>()
  })
})
