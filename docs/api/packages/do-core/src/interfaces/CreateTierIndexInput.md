[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / CreateTierIndexInput

# Interface: CreateTierIndexInput

Defined in: [packages/do-core/src/tier-index.ts:78](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L78)

Input for creating a new tier index entry

## Properties

### id

> **id**: `string`

Defined in: [packages/do-core/src/tier-index.ts:80](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L80)

Unique identifier for the item

***

### sourceTable

> **sourceTable**: `string`

Defined in: [packages/do-core/src/tier-index.ts:82](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L82)

Source table name

***

### tier

> **tier**: [`StorageTier`](../type-aliases/StorageTier.md)

Defined in: [packages/do-core/src/tier-index.ts:84](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L84)

Storage tier

***

### location?

> `optional` **location**: `string`

Defined in: [packages/do-core/src/tier-index.ts:86](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L86)

Location URI for warm/cold tiers
