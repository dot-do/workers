[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / MigrationCandidate

# Interface: MigrationCandidate

Defined in: [packages/do-core/src/migration-policy.ts:101](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L101)

Candidate item for migration

## Properties

### itemId

> **itemId**: `string`

Defined in: [packages/do-core/src/migration-policy.ts:103](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L103)

Unique identifier of the item

***

### sourceTier

> **sourceTier**: `StorageTier`

Defined in: [packages/do-core/src/migration-policy.ts:105](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L105)

Current storage tier

***

### targetTier

> **targetTier**: `StorageTier`

Defined in: [packages/do-core/src/migration-policy.ts:107](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L107)

Target storage tier

***

### createdAt

> **createdAt**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:109](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L109)

Timestamp when candidate was created

***

### estimatedBytes

> **estimatedBytes**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:111](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L111)

Estimated size in bytes

***

### priority?

> `optional` **priority**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:113](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L113)

Priority score (lower = higher priority)
