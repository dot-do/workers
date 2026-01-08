[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / TierUsage

# Interface: TierUsage

Defined in: [packages/do-core/src/migration-policy.ts:119](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L119)

Usage statistics for a storage tier

## Properties

### tier

> **tier**: `StorageTier`

Defined in: [packages/do-core/src/migration-policy.ts:121](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L121)

Storage tier

***

### itemCount

> **itemCount**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:123](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L123)

Number of items in tier

***

### totalBytes

> **totalBytes**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:125](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L125)

Total bytes used

***

### maxBytes

> **maxBytes**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:127](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L127)

Maximum capacity in bytes

***

### percentFull

> **percentFull**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:129](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L129)

Percentage of capacity used
