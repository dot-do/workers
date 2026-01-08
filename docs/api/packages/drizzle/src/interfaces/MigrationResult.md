[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/drizzle/src](../README.md) / MigrationResult

# Interface: MigrationResult

Defined in: [packages/drizzle/src/index.ts:35](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L35)

## Properties

### success

> **success**: `boolean`

Defined in: [packages/drizzle/src/index.ts:37](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L37)

Whether the migration was successful

***

### migration

> **migration**: [`Migration`](Migration.md)

Defined in: [packages/drizzle/src/index.ts:39](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L39)

Migration that was applied

***

### durationMs

> **durationMs**: `number`

Defined in: [packages/drizzle/src/index.ts:41](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L41)

Duration in milliseconds

***

### error?

> `optional` **error**: `Error`

Defined in: [packages/drizzle/src/index.ts:43](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L43)

Error if migration failed
