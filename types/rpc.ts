/**
 * RPC Types for Promise Pipelining
 *
 * Based on Cloudflare's CapnWeb pattern for efficient RPC:
 * - RpcPromise enables calling methods on promises without awaiting
 * - RpcStub wraps remote objects on the client side
 * - RpcTarget defines objects that can be exposed over RPC
 *
 * Promise pipelining allows chaining calls in a single round trip:
 * ```ts
 * // Without pipelining - 3 round trips:
 * const user = await db.users.get('123')
 * const posts = await user.posts.list()
 * const comments = await posts[0].comments.list()
 *
 * // WITH pipelining - 1 round trip:
 * const comments = await db.users.get('123').posts.list()[0].comments.list()
 * ```
 *
 * @see https://github.com/cloudflare/capnweb
 * @see https://blog.cloudflare.com/javascript-native-rpc/
 * @packageDocumentation
 */

// =============================================================================
// Core RPC Types
// =============================================================================

/**
 * A promise that supports pipelining - calling methods before awaiting.
 *
 * Every method on T that returns a value will return an RpcPromise
 * of that value type, allowing method chaining without await.
 *
 * @typeParam T - The type of the resolved value
 *
 * @example
 * ```ts
 * interface UserService {
 *   get(id: string): User
 *   list(): User[]
 * }
 *
 * declare const users: RpcPromise<UserService>
 *
 * // Can call methods without awaiting:
 * const user = users.get('123')      // RpcPromise<User>
 * const name = user.name             // RpcPromise<string>
 * const posts = user.posts.list()    // RpcPromise<Post[]>
 *
 * // Only await at the end:
 * const result = await posts
 * ```
 */
export type RpcPromise<T> = Promise<T> & RpcPipelined<T>

/**
 * Helper type that makes all methods and properties pipelined.
 *
 * - Methods return RpcPromise of their return type
 * - Properties become RpcPromise of the property type
 */
export type RpcPipelined<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => RpcPromise<Awaited<R>>
    : RpcPromise<T[K]>
}

/**
 * Unwrap an RpcPromise to get the underlying type.
 */
export type UnwrapRpcPromise<T> = T extends RpcPromise<infer U> ? U : T

// =============================================================================
// RPC Stub and Target
// =============================================================================

/**
 * Client-side proxy wrapping a remote object.
 *
 * RpcStub provides type-safe access to remote methods and properties
 * with automatic promise pipelining.
 *
 * @typeParam T - The interface of the remote object
 *
 * @example
 * ```ts
 * interface DatabaseService {
 *   users: UserRepository
 *   posts: PostRepository
 * }
 *
 * const db: RpcStub<DatabaseService> = createStub(connection)
 *
 * // All access returns RpcPromise:
 * const user = await db.users.get('123')
 * ```
 */
export type RpcStub<T> = RpcPipelined<T> & {
  /** Dispose this stub and any pipelined promises */
  [Symbol.dispose]?: () => void
}

/**
 * Server-side object that can be exposed over RPC.
 *
 * Any object can be an RpcTarget - the type just documents the intent.
 *
 * @typeParam T - The interface to expose
 */
export type RpcTarget<T> = T

/**
 * Options for creating an RPC stub
 */
export interface RpcStubOptions {
  /** Timeout for individual calls in milliseconds */
  timeout?: number
  /** Maximum depth for pipelined calls */
  maxPipelineDepth?: number
  /** Whether to automatically dispose on garbage collection */
  autoDispose?: boolean
}

// =============================================================================
// Magic Map Pattern
// =============================================================================

/**
 * A Map-like interface where property access triggers lazy RPC calls.
 *
 * This is the "magic map" pattern - accessing `map.key` returns an
 * RpcPromise that will fetch the value when awaited.
 *
 * @typeParam K - The key type
 * @typeParam V - The value type
 *
 * @example
 * ```ts
 * interface User { id: string; name: string }
 *
 * declare const users: MagicMap<string, User>
 *
 * // Property access returns RpcPromise (no network call yet)
 * const user = users['user-123']  // RpcPromise<User>
 *
 * // Network call happens on await
 * const resolved = await user     // User
 *
 * // Or pipeline further
 * const name = await users['user-123'].name  // string
 * ```
 */
export type MagicMap<K extends string | number | symbol, V> = {
  [key in K]: RpcPromise<V>
} & {
  /** Get a value by key */
  get(key: K): RpcPromise<V | undefined>
  /** Check if a key exists */
  has(key: K): RpcPromise<boolean>
  /** Get all keys */
  keys(): RpcPromise<K[]>
  /** Get all values */
  values(): RpcPromise<V[]>
  /** Get all entries */
  entries(): RpcPromise<[K, V][]>
}

/**
 * A writable magic map that supports set/delete operations.
 */
export type MutableMagicMap<K extends string | number | symbol, V> = MagicMap<K, V> & {
  /** Set a value */
  set(key: K, value: V): RpcPromise<void>
  /** Delete a key */
  delete(key: K): RpcPromise<boolean>
  /** Clear all entries */
  clear(): RpcPromise<void>
}

// =============================================================================
// RPC Method Types
// =============================================================================

/**
 * Extract methods from a type (excluding properties)
 */
export type RpcMethods<T> = {
  [K in keyof T as T[K] extends (...args: unknown[]) => unknown ? K : never]: T[K]
}

/**
 * Extract properties from a type (excluding methods)
 */
export type RpcProperties<T> = {
  [K in keyof T as T[K] extends (...args: unknown[]) => unknown ? never : K]: T[K]
}

/**
 * Make an interface RPC-compatible by wrapping all return types in RpcPromise
 */
export type AsRpc<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => RpcPromise<Awaited<R>>
    : RpcPromise<T[K]>
}

// =============================================================================
// RPC Connection Types
// =============================================================================

/**
 * RPC connection state
 */
export type RpcConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * RPC connection interface
 */
export interface RpcConnection {
  /** Current connection state */
  readonly state: RpcConnectionState

  /** Connect to the RPC endpoint */
  connect(): Promise<void>

  /** Disconnect from the RPC endpoint */
  disconnect(): Promise<void>

  /** Create a stub for a target */
  getStub<T>(target: string): RpcStub<T>

  /** Expose a target for remote access */
  expose<T>(name: string, target: RpcTarget<T>): void
}

/**
 * Options for RPC connections
 */
export interface RpcConnectionOptions {
  /** Connection URL */
  url?: string
  /** Reconnect on disconnect */
  autoReconnect?: boolean
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * A value that might be wrapped in RpcPromise
 */
export type MaybeRpcPromise<T> = T | RpcPromise<T>

/**
 * Deeply unwrap all RpcPromises in a type
 */
export type DeepUnwrapRpcPromise<T> = T extends RpcPromise<infer U>
  ? DeepUnwrapRpcPromise<U>
  : T extends object
    ? { [K in keyof T]: DeepUnwrapRpcPromise<T[K]> }
    : T

/**
 * Check if a type is an RpcPromise
 */
export type IsRpcPromise<T> = T extends RpcPromise<unknown> ? true : false
