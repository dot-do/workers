/**
 * @dotdo/types - TypeScript type definitions for workers.do platform
 *
 * This package consolidates and extends types from:
 * - primitives/* (ai-functions, ai-workflows, ai-database, etc.)
 * - Cloudflare Durable Objects
 * - CapnWeb RPC
 *
 * Key patterns:
 * - Fn<T, Args, Config>: Three calling styles
 *   - fn(args, config?) - Direct call
 *   - fn`${vals}` - Tagged template with interpolation
 *   - fn`{name}`(params) - Tagged template with named params
 * - RpcFn<T, Args, Config>: Returns RpcPromise for pipelining
 * - SerializableSqlQuery: Transform tagged templates for RPC wire format
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Function & RPC Types
// =============================================================================

export * from './fn.js'
export * from './rpc.js'

// =============================================================================
// Durable Object Types
// =============================================================================

export * from './do.js'
export * from './sql.js'

// =============================================================================
// Primitives Re-exports
// =============================================================================

// AI Functions
export * from './ai.js'

// Workflows
export * from './workflows.js'

// Database
export * from './database.js'

// Digital Workers
export * from './workers.js'

// Autonomous Agents
export * from './agents.js'

// Human-in-the-Loop
export * from './humans.js'
