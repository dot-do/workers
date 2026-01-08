[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/drizzle/src](../README.md) / MigrationConfig

# Interface: MigrationConfig

Defined in: [packages/drizzle/src/index.ts:13](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L13)

## Properties

### migrationsFolder?

> `optional` **migrationsFolder**: `string`

Defined in: [packages/drizzle/src/index.ts:15](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L15)

Directory containing migration files

***

### migrationsTable?

> `optional` **migrationsTable**: `string`

Defined in: [packages/drizzle/src/index.ts:17](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L17)

Table name for tracking migrations

***

### transactional?

> `optional` **transactional**: `boolean`

Defined in: [packages/drizzle/src/index.ts:19](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L19)

Whether to run migrations in a transaction
