[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / HotToWarmPolicy

# Interface: HotToWarmPolicy

Defined in: [packages/do-core/src/migration-policy.ts:32](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L32)

Policy for hot to warm tier migration

## Properties

### maxAge

> **maxAge**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:34](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L34)

Maximum age in milliseconds before item is eligible for migration

***

### minAccessCount

> **minAccessCount**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:36](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L36)

Minimum access count in window to keep item hot

***

### maxHotSizePercent

> **maxHotSizePercent**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:38](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L38)

Percentage threshold for hot tier size to trigger migration

***

### accessWindow?

> `optional` **accessWindow**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:40](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L40)

Optional: Time window for access counting
