[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/drizzle/src](../README.md) / Migration

# Interface: Migration

Defined in: [packages/drizzle/src/index.ts:22](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L22)

## Properties

### id

> **id**: `string`

Defined in: [packages/drizzle/src/index.ts:24](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L24)

Unique migration identifier (usually timestamp + name)

***

### name

> **name**: `string`

Defined in: [packages/drizzle/src/index.ts:26](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L26)

Migration name

***

### up

> **up**: `string`[]

Defined in: [packages/drizzle/src/index.ts:28](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L28)

SQL statements for applying the migration

***

### down

> **down**: `string`[]

Defined in: [packages/drizzle/src/index.ts:30](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L30)

SQL statements for reverting the migration

***

### createdAt

> **createdAt**: `Date`

Defined in: [packages/drizzle/src/index.ts:32](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L32)

Timestamp when migration was created
