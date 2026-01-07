/**
 * @dotdo/objects - The building blocks of autonomous startups
 *
 * All Durable Objects in one package for convenience.
 * Each object can also be imported individually from its own package.
 *
 * @example
 * ```typescript
 * // Import everything
 * import { DO, Agent, Startup, Workflow } from '@dotdo/objects'
 *
 * // Or import specific objects
 * import { Agent } from '@dotdo/objects/agent'
 * import { Startup } from '@dotdo/objects/startup'
 * ```
 */

// Base class
export { DO } from './do/index.ts'

// AI & Automation
export { Agent } from './agent/index.ts'
export { Workflow } from './workflow/index.ts'
export { Function } from './function/index.ts'

// Human-in-the-Loop
export { Human } from './human/index.ts'

// Business & Organization
export { Startup } from './startup/index.ts'
export { Business } from './business/index.ts'
export { Org } from './org/index.ts'

// User-Facing
export { App } from './app/index.ts'
export { Site } from './site/index.ts'

// Re-export types from each module
export type * from './agent/index.ts'
export type * from './workflow/index.ts'
export type * from './function/index.ts'
export type * from './human/index.ts'
export type * from './startup/index.ts'
export type * from './business/index.ts'
export type * from './org/index.ts'
export type * from './app/index.ts'
export type * from './site/index.ts'
