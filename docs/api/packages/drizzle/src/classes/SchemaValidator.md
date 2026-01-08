[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/drizzle/src](../README.md) / SchemaValidator

# Class: SchemaValidator

Defined in: [packages/drizzle/src/index.ts:505](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L505)

## Constructors

### Constructor

> **new SchemaValidator**(): `SchemaValidator`

#### Returns

`SchemaValidator`

## Methods

### validate()

> **validate**(`schema`): `Promise`\<[`SchemaValidationResult`](../interfaces/SchemaValidationResult.md)\>

Defined in: [packages/drizzle/src/index.ts:509](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L509)

Validate a schema definition

#### Parameters

##### schema

`unknown`

#### Returns

`Promise`\<[`SchemaValidationResult`](../interfaces/SchemaValidationResult.md)\>

***

### diff()

> **diff**(`current`, `target`): `Promise`\<`string`[]\>

Defined in: [packages/drizzle/src/index.ts:599](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L599)

Generate SQL diff between two schemas

#### Parameters

##### current

`unknown`

##### target

`unknown`

#### Returns

`Promise`\<`string`[]\>

***

### introspect()

> **introspect**(): `Promise`\<`SchemaDefinition`\>

Defined in: [packages/drizzle/src/index.ts:686](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/drizzle/src/index.ts#L686)

Introspect current database schema

#### Returns

`Promise`\<`SchemaDefinition`\>
