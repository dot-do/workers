[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / IdGenerator

# Type Alias: IdGenerator()

> **IdGenerator** = () => `string`

Defined in: [packages/do-core/src/event-store.ts:230](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L230)

ID generator function type.

Implement custom ID generation strategies (UUID, ULID, nanoid, etc.)

## Returns

`string`

A unique identifier string

## Example

```typescript
// UUID generator (default)
const uuidGenerator: IdGenerator = () => crypto.randomUUID()

// ULID generator (requires ulid package)
import { ulid } from 'ulid'
const ulidGenerator: IdGenerator = () => ulid()

// Nanoid generator (requires nanoid package)
import { nanoid } from 'nanoid'
const nanoidGenerator: IdGenerator = () => nanoid()
```
