[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / EventSerializer

# Interface: EventSerializer

Defined in: [packages/do-core/src/event-store.ts:179](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L179)

Event serializer interface for custom serialization strategies.

Implement this interface to use custom serialization (e.g., MessagePack,
Protocol Buffers, or encrypted storage).

## Example

```typescript
const encryptedSerializer: EventSerializer = {
  serialize: (data) => encrypt(JSON.stringify(data)),
  deserialize: (str) => JSON.parse(decrypt(str)),
}
```

## Methods

### serialize()

> **serialize**(`data`): `string`

Defined in: [packages/do-core/src/event-store.ts:185](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L185)

Serialize data to a string for storage.

#### Parameters

##### data

`unknown`

The data to serialize

#### Returns

`string`

Serialized string representation

***

### deserialize()

> **deserialize**(`str`): `unknown`

Defined in: [packages/do-core/src/event-store.ts:192](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/event-store.ts#L192)

Deserialize a string back to data.

#### Parameters

##### str

`string`

The serialized string

#### Returns

`unknown`

Deserialized data
