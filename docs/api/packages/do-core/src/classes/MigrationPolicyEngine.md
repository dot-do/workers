[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / MigrationPolicyEngine

# Class: MigrationPolicyEngine

Defined in: [packages/do-core/src/migration-policy.ts:190](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L190)

Migration Policy Engine

Evaluates migration policies and selects candidates for tier migration.
This is the RED phase stub - implementation pending.

## Constructors

### Constructor

> **new MigrationPolicyEngine**(`policy`): `MigrationPolicyEngine`

Defined in: [packages/do-core/src/migration-policy.ts:200](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L200)

#### Parameters

##### policy

[`MigrationPolicyConfig`](../interfaces/MigrationPolicyConfig.md)

#### Returns

`MigrationPolicyEngine`

## Methods

### evaluateHotToWarm()

> **evaluateHotToWarm**(`item`, `tierUsage`, `accessStats?`): [`MigrationDecision`](../interfaces/MigrationDecision.md)

Defined in: [packages/do-core/src/migration-policy.ts:236](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L236)

Evaluate if an item should migrate from hot to warm tier

#### Parameters

##### item

###### id

`string`

###### createdAt

`number`

###### lastAccessedAt

`number`

###### accessCount

`number`

###### tier

`string`

##### tierUsage

[`TierUsage`](../interfaces/TierUsage.md)

##### accessStats?

[`AccessStats`](../interfaces/AccessStats.md)

#### Returns

[`MigrationDecision`](../interfaces/MigrationDecision.md)

***

### evaluateWarmToCold()

> **evaluateWarmToCold**(`item`): [`MigrationDecision`](../interfaces/MigrationDecision.md)

Defined in: [packages/do-core/src/migration-policy.ts:301](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L301)

Evaluate if an item should migrate from warm to cold tier

#### Parameters

##### item

###### id

`string`

###### createdAt

`number`

###### tier

`string`

#### Returns

[`MigrationDecision`](../interfaces/MigrationDecision.md)

***

### selectHotToWarmBatch()

> **selectHotToWarmBatch**\<`T`\>(`items`, `tierUsage`): [`BatchSelection`](../interfaces/BatchSelection.md)\<`T`\>

Defined in: [packages/do-core/src/migration-policy.ts:330](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L330)

Select a batch of items for hot to warm migration

#### Type Parameters

##### T

`T` *extends* `object`

#### Parameters

##### items

`T`[]

##### tierUsage

[`TierUsage`](../interfaces/TierUsage.md)

#### Returns

[`BatchSelection`](../interfaces/BatchSelection.md)\<`T`\>

***

### selectWarmToColdBatch()

> **selectWarmToColdBatch**\<`T`\>(`items`): [`BatchSelection`](../interfaces/BatchSelection.md)\<`T`\>

Defined in: [packages/do-core/src/migration-policy.ts:402](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L402)

Select a batch of items for warm to cold migration

#### Type Parameters

##### T

`T` *extends* `object`

#### Parameters

##### items

`T`[]

#### Returns

[`BatchSelection`](../interfaces/BatchSelection.md)\<`T`\>

***

### createCandidate()

> **createCandidate**(`item`, `sourceTier`, `targetTier`): [`MigrationCandidate`](../interfaces/MigrationCandidate.md)

Defined in: [packages/do-core/src/migration-policy.ts:431](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L431)

Create a migration candidate from an item

#### Parameters

##### item

###### id

`string`

###### sizeBytes

`number`

##### sourceTier

`StorageTier`

##### targetTier

`StorageTier`

#### Returns

[`MigrationCandidate`](../interfaces/MigrationCandidate.md)

***

### prioritizeCandidates()

> **prioritizeCandidates**\<`T`\>(`items`, `_tierUsage`): `T`[]

Defined in: [packages/do-core/src/migration-policy.ts:452](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L452)

Prioritize migration candidates

Priority is based on: older items and less accessed items first.
Score = age (ms) - (accessCount * weight)
Higher score = higher priority for migration

#### Type Parameters

##### T

`T` *extends* `object`

#### Parameters

##### items

`T`[]

##### \_tierUsage

[`TierUsage`](../interfaces/TierUsage.md)

#### Returns

`T`[]

***

### recordMigration()

> **recordMigration**(`batch`): `void`

Defined in: [packages/do-core/src/migration-policy.ts:472](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L472)

Record a migration for statistics

#### Parameters

##### batch

[`BatchSelection`](../interfaces/BatchSelection.md)

#### Returns

`void`

***

### getStatistics()

> **getStatistics**(): [`MigrationStatistics`](../interfaces/MigrationStatistics.md)

Defined in: [packages/do-core/src/migration-policy.ts:488](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L488)

Get migration statistics

#### Returns

[`MigrationStatistics`](../interfaces/MigrationStatistics.md)

***

### updatePolicy()

> **updatePolicy**(`updates`): `void`

Defined in: [packages/do-core/src/migration-policy.ts:495](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L495)

Update policy configuration

#### Parameters

##### updates

`Partial`\<[`MigrationPolicyConfig`](../interfaces/MigrationPolicyConfig.md)\>

#### Returns

`void`

***

### getPolicy()

> **getPolicy**(): [`MigrationPolicyConfig`](../interfaces/MigrationPolicyConfig.md)

Defined in: [packages/do-core/src/migration-policy.ts:510](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L510)

Get current policy configuration

#### Returns

[`MigrationPolicyConfig`](../interfaces/MigrationPolicyConfig.md)
