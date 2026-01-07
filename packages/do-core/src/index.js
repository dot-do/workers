/**
 * @dotdo/do-core - Slim Durable Object Core
 *
 * A minimal Durable Object implementation providing:
 * - Minimal DO interface contract (fetch, constructor)
 * - State persistence (KV-style storage)
 * - Alarm handling (scheduled wake-ups)
 * - WebSocket hibernation (cost-effective long-lived connections)
 * - Lazy schema initialization (performance optimization)
 * - Repository pattern for consistent data access
 *
 * Target: ~500-800 lines of core code
 *
 * This module is the RED phase - tests define the contract,
 * implementation comes in GREEN phase.
 */
// Re-export core types and DOCore class (no dependencies)
export * from './core.js';
// Re-export schema module (depends on core types)
export * from './schema.js';
// Re-export agent module (depends on core)
export * from './agent.js';
// Re-export MCP error types
export * from './mcp-error.js';
// Re-export CRUD mixin (depends on core)
export * from './crud-mixin.js';
// Re-export Actions mixin (depends on core)
export * from './actions-mixin.js';
// Re-export Events mixin (depends on core)
export * from './events.js';
// Re-export Things mixin (depends on core)
export * from './things-mixin.js';
// Re-export Repository pattern (base classes and interfaces)
export * from './repository.js';
// Re-export EventsRepository (depends on repository)
export * from './events-repository.js';
// Re-export ThingsRepository (depends on repository)
export * from './things-repository.js';
// Re-export ErrorBoundary (no dependencies)
export * from './error-boundary.js';
