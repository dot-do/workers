[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / WarmToColdPolicy

# Interface: WarmToColdPolicy

Defined in: [packages/do-core/src/migration-policy.ts:46](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L46)

Policy for warm to cold tier migration

## Properties

### maxAge

> **maxAge**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:48](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L48)

Maximum age in milliseconds in warm tier before cold migration

***

### minPartitionSize

> **minPartitionSize**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:50](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L50)

Minimum batch size in bytes for cold migration

***

### retentionPeriod?

> `optional` **retentionPeriod**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:52](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L52)

Optional: Retention period before deletion
