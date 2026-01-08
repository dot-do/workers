[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / ConcurrencyError

# Class: ConcurrencyError

Defined in: [packages/do-core/src/event-store.ts:424](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L424)

Error thrown when optimistic concurrency check fails.

This error indicates that the stream was modified between reading
the expected version and attempting to append. The client should
reload the stream state and retry the operation.

## Example

```typescript
try {
  await store.append({ streamId, type, payload, expectedVersion: 5 })
} catch (error) {
  if (error instanceof ConcurrencyError) {
    console.log(`Stream ${error.streamId} was modified`)
    console.log(`Expected: ${error.expectedVersion}, Actual: ${error.actualVersion}`)
    // Reload and retry
  }
}
```

## Extends

- `Error`

## Constructors

### Constructor

> **new ConcurrencyError**(`streamId`, `expectedVersion`, `actualVersion`): `ConcurrencyError`

Defined in: [packages/do-core/src/event-store.ts:435](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L435)

Create a new ConcurrencyError.

#### Parameters

##### streamId

`string`

The stream where the conflict occurred

##### expectedVersion

`number`

The version that was expected

##### actualVersion

`number`

The actual current version of the stream

#### Returns

`ConcurrencyError`

#### Overrides

`Error.constructor`

## Properties

### name

> `readonly` **name**: `"ConcurrencyError"` = `'ConcurrencyError'`

Defined in: [packages/do-core/src/event-store.ts:426](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L426)

Name of the error class

#### Overrides

`Error.name`

***

### streamId

> `readonly` **streamId**: `string`

Defined in: [packages/do-core/src/event-store.ts:436](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L436)

The stream where the conflict occurred

***

### expectedVersion

> `readonly` **expectedVersion**: `number`

Defined in: [packages/do-core/src/event-store.ts:437](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L437)

The version that was expected

***

### actualVersion

> `readonly` **actualVersion**: `number`

Defined in: [packages/do-core/src/event-store.ts:438](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L438)

The actual current version of the stream
