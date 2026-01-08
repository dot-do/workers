[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / StorageProvider

# Interface: StorageProvider

Defined in: [packages/do-core/src/crud-mixin.ts:44](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L44)

Interface for classes that can provide storage access.
Implemented by DO classes that want to use CRUD operations.

## Methods

### getStorage()

> **getStorage**(): [`DOStorage`](DOStorage.md)

Defined in: [packages/do-core/src/crud-mixin.ts:46](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/crud-mixin.ts#L46)

Get the storage interface for CRUD operations

#### Returns

[`DOStorage`](DOStorage.md)
