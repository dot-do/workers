[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / BatchSelection

# Interface: BatchSelection\<T\>

Defined in: [packages/do-core/src/migration-policy.ts:151](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L151)

Batch selection result

## Type Parameters

### T

`T` = `unknown`

## Properties

### items

> **items**: `T`[]

Defined in: [packages/do-core/src/migration-policy.ts:153](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L153)

Selected items for the batch

***

### totalBytes

> **totalBytes**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:155](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L155)

Total size of batch in bytes

***

### shouldProceed

> **shouldProceed**: `boolean`

Defined in: [packages/do-core/src/migration-policy.ts:157](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L157)

Whether to proceed with migration

***

### reason

> **reason**: `string`

Defined in: [packages/do-core/src/migration-policy.ts:159](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L159)

Reason for the decision

***

### startedAt?

> `optional` **startedAt**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:161](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L161)

Timestamp when migration started

***

### completedAt?

> `optional` **completedAt**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:163](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L163)

Timestamp when migration completed
