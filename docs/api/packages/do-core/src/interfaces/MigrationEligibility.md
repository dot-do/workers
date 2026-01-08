[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / MigrationEligibility

# Interface: MigrationEligibility

Defined in: [packages/do-core/src/tier-index.ts:102](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L102)

Options for finding items eligible for migration

## Properties

### fromTier

> **fromTier**: [`StorageTier`](../type-aliases/StorageTier.md)

Defined in: [packages/do-core/src/tier-index.ts:104](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L104)

Source tier to migrate from

***

### accessThresholdMs?

> `optional` **accessThresholdMs**: `number`

Defined in: [packages/do-core/src/tier-index.ts:106](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L106)

Threshold in milliseconds - items not accessed within this time are eligible

***

### maxAccessCount?

> `optional` **maxAccessCount**: `number`

Defined in: [packages/do-core/src/tier-index.ts:108](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L108)

Maximum access count for eligibility

***

### limit?

> `optional` **limit**: `number`

Defined in: [packages/do-core/src/tier-index.ts:110](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L110)

Maximum number of items to return

***

### orderBy?

> `optional` **orderBy**: `"created_at"` \| `"accessed_at"` \| `"access_count"`

Defined in: [packages/do-core/src/tier-index.ts:112](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L112)

Order by field

***

### orderDirection?

> `optional` **orderDirection**: `"asc"` \| `"desc"`

Defined in: [packages/do-core/src/tier-index.ts:114](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L114)

Order direction

***

### sourceTable?

> `optional` **sourceTable**: `string`

Defined in: [packages/do-core/src/tier-index.ts:116](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L116)

Filter by source table
