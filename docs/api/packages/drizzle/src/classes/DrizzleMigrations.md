[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/drizzle/src](../README.md) / DrizzleMigrations

# Class: DrizzleMigrations

Defined in: [packages/drizzle/src/index.ts:150](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L150)

## Constructors

### Constructor

> **new DrizzleMigrations**(`config?`): `DrizzleMigrations`

Defined in: [packages/drizzle/src/index.ts:156](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L156)

#### Parameters

##### config?

[`MigrationConfig`](../interfaces/MigrationConfig.md)

#### Returns

`DrizzleMigrations`

## Methods

### generate()

> **generate**(`name`): `Promise`\<[`Migration`](../interfaces/Migration.md)\>

Defined in: [packages/drizzle/src/index.ts:219](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L219)

Generate a new migration

#### Parameters

##### name

`string`

#### Returns

`Promise`\<[`Migration`](../interfaces/Migration.md)\>

***

### run()

> **run**(): `Promise`\<[`MigrationResult`](../interfaces/MigrationResult.md)[]\>

Defined in: [packages/drizzle/src/index.ts:250](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L250)

Run all pending migrations

#### Returns

`Promise`\<[`MigrationResult`](../interfaces/MigrationResult.md)[]\>

***

### runSingle()

> **runSingle**(`migrationId`): `Promise`\<[`MigrationResult`](../interfaces/MigrationResult.md)\>

Defined in: [packages/drizzle/src/index.ts:311](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L311)

Run a single migration by ID

#### Parameters

##### migrationId

`string`

#### Returns

`Promise`\<[`MigrationResult`](../interfaces/MigrationResult.md)\>

***

### rollback()

> **rollback**(`steps`): `Promise`\<[`MigrationResult`](../interfaces/MigrationResult.md)[]\>

Defined in: [packages/drizzle/src/index.ts:365](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L365)

Rollback the last N migrations

#### Parameters

##### steps

`number` = `1`

#### Returns

`Promise`\<[`MigrationResult`](../interfaces/MigrationResult.md)[]\>

***

### rollbackTo()

> **rollbackTo**(`migrationId`): `Promise`\<[`MigrationResult`](../interfaces/MigrationResult.md)[]\>

Defined in: [packages/drizzle/src/index.ts:407](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L407)

Rollback to a specific migration (exclusive - keeps the target)

#### Parameters

##### migrationId

`string`

#### Returns

`Promise`\<[`MigrationResult`](../interfaces/MigrationResult.md)[]\>

***

### getStatus()

> **getStatus**(): `Promise`\<[`MigrationStatus`](../interfaces/MigrationStatus.md)[]\>

Defined in: [packages/drizzle/src/index.ts:444](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L444)

Get status of all migrations

#### Returns

`Promise`\<[`MigrationStatus`](../interfaces/MigrationStatus.md)[]\>

***

### getPending()

> **getPending**(): `Promise`\<[`Migration`](../interfaces/Migration.md)[]\>

Defined in: [packages/drizzle/src/index.ts:463](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L463)

Get pending (unapplied) migrations

#### Returns

`Promise`\<[`Migration`](../interfaces/Migration.md)[]\>

***

### getApplied()

> **getApplied**(): `Promise`\<[`Migration`](../interfaces/Migration.md)[]\>

Defined in: [packages/drizzle/src/index.ts:487](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L487)

Get applied migrations

#### Returns

`Promise`\<[`Migration`](../interfaces/Migration.md)[]\>
