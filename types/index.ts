/**
 * @dotdo/types - TypeScript type definitions for workers.do platform
 *
 * This package consolidates and extends types from:
 * - primitives/* (ai-functions, ai-workflows, ai-database, etc.)
 * - Cloudflare Durable Objects
 * - CapnWeb RPC
 *
 * Key patterns:
 * - TaggedCallable: fn(args), fn`template`, fn`{named}`(params)
 * - RpcPromise: Promise pipelining for efficient RPC
 * - SerializableSqlQuery: Transform tagged templates for RPC wire format
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Utility Types
// =============================================================================

export * from './template.js'
export * from './rpc.js'

// =============================================================================
// Durable Object Types
// =============================================================================

export * from './do.js'
export * from './sql.js'
export * from './function.js'

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
