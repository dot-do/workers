[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / MigrationDecision

# Interface: MigrationDecision

Defined in: [packages/do-core/src/migration-policy.ts:85](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L85)

Decision result from policy evaluation

## Properties

### shouldMigrate

> **shouldMigrate**: `boolean`

Defined in: [packages/do-core/src/migration-policy.ts:87](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L87)

Whether the item should be migrated

***

### reason

> **reason**: `string`

Defined in: [packages/do-core/src/migration-policy.ts:89](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L89)

Human-readable reason for the decision

***

### targetTier?

> `optional` **targetTier**: `StorageTier`

Defined in: [packages/do-core/src/migration-policy.ts:91](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L91)

Target tier if migration is recommended

***

### priority?

> `optional` **priority**: [`MigrationPriority`](../type-aliases/MigrationPriority.md)

Defined in: [packages/do-core/src/migration-policy.ts:93](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L93)

Priority rule that made the decision

***

### isEmergency?

> `optional` **isEmergency**: `boolean`

Defined in: [packages/do-core/src/migration-policy.ts:95](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L95)

Whether this is an emergency migration
