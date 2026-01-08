[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / VersionConflictError

# Class: VersionConflictError

Defined in: [packages/do-core/src/event-mixin.ts:115](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L115)

Error thrown when expectedVersion doesn't match actual version

## Extends

- `Error`

## Constructors

### Constructor

> **new VersionConflictError**(`streamId`, `expectedVersion`, `actualVersion`): `VersionConflictError`

Defined in: [packages/do-core/src/event-mixin.ts:120](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L120)

#### Parameters

##### streamId

`string`

##### expectedVersion

`number`

##### actualVersion

`number`

#### Returns

`VersionConflictError`

#### Overrides

`Error.constructor`

## Properties

### streamId

> `readonly` **streamId**: `string`

Defined in: [packages/do-core/src/event-mixin.ts:116](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L116)

***

### expectedVersion

> `readonly` **expectedVersion**: `number`

Defined in: [packages/do-core/src/event-mixin.ts:117](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L117)

***

### actualVersion

> `readonly` **actualVersion**: `number`

Defined in: [packages/do-core/src/event-mixin.ts:118](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-mixin.ts#L118)
