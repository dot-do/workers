[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/drizzle/src](../README.md) / MigrationStatus

# Interface: MigrationStatus

Defined in: [packages/drizzle/src/index.ts:77](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L77)

## Properties

### id

> **id**: `string`

Defined in: [packages/drizzle/src/index.ts:79](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L79)

Migration ID

***

### name

> **name**: `string`

Defined in: [packages/drizzle/src/index.ts:81](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L81)

Migration name

***

### applied

> **applied**: `boolean`

Defined in: [packages/drizzle/src/index.ts:83](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L83)

Whether migration has been applied

***

### appliedAt?

> `optional` **appliedAt**: `Date`

Defined in: [packages/drizzle/src/index.ts:85](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L85)

When migration was applied
