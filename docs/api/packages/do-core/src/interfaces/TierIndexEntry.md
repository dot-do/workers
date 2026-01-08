[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / TierIndexEntry

# Interface: TierIndexEntry

Defined in: [packages/do-core/src/tier-index.ts:56](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L56)

Tier index entry representing an item's location

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/tier-index.ts:58](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L58)

Unique identifier for the item

***

### sourceTable

> **sourceTable**: `string`

Defined in: [packages/do-core/src/tier-index.ts:60](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L60)

Source table name (e.g., 'events', 'things', 'search')

***

### tier

> **tier**: [`StorageTier`](../type-aliases/StorageTier.md)

Defined in: [packages/do-core/src/tier-index.ts:62](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L62)

Current storage tier

***

### location

> **location**: `string` \| `null`

Defined in: [packages/do-core/src/tier-index.ts:64](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L64)

Location URI for warm/cold tiers (R2 key, archive path)

***

### createdAt

> **createdAt**: `number`

Defined in: [packages/do-core/src/tier-index.ts:66](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L66)

Timestamp when first recorded

***

### migratedAt

> **migratedAt**: `number` \| `null`

Defined in: [packages/do-core/src/tier-index.ts:68](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L68)

Timestamp when last migrated between tiers

***

### accessedAt

> **accessedAt**: `number` \| `null`

Defined in: [packages/do-core/src/tier-index.ts:70](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L70)

Timestamp when last accessed

***

### accessCount

> **accessCount**: `number`

Defined in: [packages/do-core/src/tier-index.ts:72](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L72)

Total number of accesses
