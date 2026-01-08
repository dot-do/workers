[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / MigrationPolicyConfig

# Interface: MigrationPolicyConfig

Defined in: [packages/do-core/src/migration-policy.ts:78](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L78)

Full migration policy configuration

## Extends

- [`MigrationPolicy`](MigrationPolicy.md)

## Properties

### hotToWarm

> **hotToWarm**: [`HotToWarmPolicy`](HotToWarmPolicy.md)

Defined in: [packages/do-core/src/migration-policy.ts:71](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L71)

#### Inherited from

[`MigrationPolicy`](MigrationPolicy.md).[`hotToWarm`](MigrationPolicy.md#hottowarm)

***

### warmToCold

> **warmToCold**: [`WarmToColdPolicy`](WarmToColdPolicy.md)

Defined in: [packages/do-core/src/migration-policy.ts:72](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L72)

#### Inherited from

[`MigrationPolicy`](MigrationPolicy.md).[`warmToCold`](MigrationPolicy.md#warmtocold)

***

### batchSize?

> `optional` **batchSize**: [`BatchSizeConfig`](BatchSizeConfig.md)

Defined in: [packages/do-core/src/migration-policy.ts:79](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L79)
