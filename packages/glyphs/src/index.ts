/**
 * @dotdo/glyphs - Visual DSL for TypeScript
 *
 * A visual programming language embedded in TypeScript using CJK glyphs as valid identifiers.
 *
 * Each glyph exports both the visual symbol and an ASCII alias.
 */

// Invoke - Function invocation via tagged templates
export { 入, fn } from './invoke'

// Worker - Agent execution
export { 人, worker } from './worker'

// Event - Event emission and subscription
export { 巛, on } from './event'

// Database - Type-safe database access
export { 彡, db } from './db'

// Collection - Typed collections
export { 田, c } from './collection'

// List - List operations and queries
export { 目, ls } from './list'

// Type - Schema/type definition
export { 口, T } from './type'

// Instance - Object instance creation
export { 回, $ } from './instance'

// Site - Page rendering
export { 亘, www } from './site'

// Metrics - Metrics tracking
export { ılıl, m } from './metrics'

// Queue - Queue operations
export { 卌, q } from './queue'
