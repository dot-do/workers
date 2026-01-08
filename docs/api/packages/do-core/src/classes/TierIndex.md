[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / TierIndex

# Class: TierIndex

Defined in: [packages/do-core/src/tier-index.ts:188](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L188)

Repository for tracking data location across storage tiers.

This is the index that tracks where every piece of data lives,
enabling efficient tiered storage management.

## Example

```typescript
const tierIndex = new TierIndex(sql)
await tierIndex.ensureSchema()

// Record a hot item
await tierIndex.record({
  id: 'event-001',
  sourceTable: 'events',
  tier: 'hot',
})

// Find items eligible for migration
const staleItems = await tierIndex.findEligibleForMigration({
  fromTier: 'hot',
  accessThresholdMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: 100,
})

// Migrate to warm tier
for (const item of staleItems) {
  await tierIndex.migrate(item.id, {
    tier: 'warm',
    location: `r2://bucket/events/${item.id}.json`,
  })
}
```

## Constructors

### Constructor

> **new TierIndex**(`sql`): `TierIndex`

Defined in: [packages/do-core/src/tier-index.ts:191](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L191)

#### Parameters

##### sql

[`SqlStorage`](../interfaces/SqlStorage.md)

#### Returns

`TierIndex`

## Methods

### ensureSchema()

> **ensureSchema**(): `Promise`\<`void`\>

Defined in: [packages/do-core/src/tier-index.ts:196](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L196)

Ensure the tier_index schema is initialized

#### Returns

`Promise`\<`void`\>

***

### record()

> **record**(`input`): `Promise`\<[`TierIndexEntry`](../interfaces/TierIndexEntry.md)\>

Defined in: [packages/do-core/src/tier-index.ts:221](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L221)

Record a new item's location

#### Parameters

##### input

[`CreateTierIndexInput`](../interfaces/CreateTierIndexInput.md)

#### Returns

`Promise`\<[`TierIndexEntry`](../interfaces/TierIndexEntry.md)\>

***

### get()

> **get**(`id`): `Promise`\<[`TierIndexEntry`](../interfaces/TierIndexEntry.md) \| `null`\>

Defined in: [packages/do-core/src/tier-index.ts:261](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L261)

Get an entry by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`TierIndexEntry`](../interfaces/TierIndexEntry.md) \| `null`\>

***

### delete()

> **delete**(`id`): `Promise`\<`boolean`\>

Defined in: [packages/do-core/src/tier-index.ts:281](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L281)

Delete an entry by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`boolean`\>

***

### findByTier()

> **findByTier**(`tier`, `options?`): `Promise`\<[`TierIndexEntry`](../interfaces/TierIndexEntry.md)[]\>

Defined in: [packages/do-core/src/tier-index.ts:297](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L297)

Find all items in a specific tier

#### Parameters

##### tier

[`StorageTier`](../type-aliases/StorageTier.md)

##### options?

###### sourceTable?

`string`

#### Returns

`Promise`\<[`TierIndexEntry`](../interfaces/TierIndexEntry.md)[]\>

***

### findEligibleForMigration()

> **findEligibleForMigration**(`criteria`): `Promise`\<[`TierIndexEntry`](../interfaces/TierIndexEntry.md)[]\>

Defined in: [packages/do-core/src/tier-index.ts:317](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L317)

Find items eligible for migration

#### Parameters

##### criteria

[`MigrationEligibility`](../interfaces/MigrationEligibility.md)

#### Returns

`Promise`\<[`TierIndexEntry`](../interfaces/TierIndexEntry.md)[]\>

***

### migrate()

> **migrate**(`id`, `update`): `Promise`\<[`TierIndexEntry`](../interfaces/TierIndexEntry.md) \| `null`\>

Defined in: [packages/do-core/src/tier-index.ts:364](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L364)

Migrate an item to a new tier

#### Parameters

##### id

`string`

##### update

###### tier

[`StorageTier`](../type-aliases/StorageTier.md)

###### location

`string`

#### Returns

`Promise`\<[`TierIndexEntry`](../interfaces/TierIndexEntry.md) \| `null`\>

***

### batchMigrate()

> **batchMigrate**(`updates`, `options?`): `Promise`\<([`TierIndexEntry`](../interfaces/TierIndexEntry.md) \| `null`)[]\>

Defined in: [packages/do-core/src/tier-index.ts:397](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L397)

Batch migrate multiple items

#### Parameters

##### updates

[`MigrationUpdate`](../interfaces/MigrationUpdate.md)[]

##### options?

[`BatchMigrateOptions`](../interfaces/BatchMigrateOptions.md)

#### Returns

`Promise`\<([`TierIndexEntry`](../interfaces/TierIndexEntry.md) \| `null`)[]\>

***

### recordAccess()

> **recordAccess**(`id`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/tier-index.ts:439](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L439)

Record an access to an item

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### batchRecordAccess()

> **batchRecordAccess**(`ids`): `Promise`\<`void`\>

Defined in: [packages/do-core/src/tier-index.ts:453](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L453)

Batch record accesses

#### Parameters

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>

***

### getStatistics()

> **getStatistics**(`options?`): `Promise`\<[`TierStatistics`](../interfaces/TierStatistics.md)\>

Defined in: [packages/do-core/src/tier-index.ts:464](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/tier-index.ts#L464)

Get tier distribution statistics

#### Parameters

##### options?

###### sourceTable?

`string`

#### Returns

`Promise`\<[`TierStatistics`](../interfaces/TierStatistics.md)\>
