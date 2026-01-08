[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/observability/src](../README.md) / ObservabilityHooks

# Interface: ObservabilityHooks

Defined in: packages/observability/dist/index.d.ts:129

## Methods

### onRequest()

> **onRequest**(`request`): `void`

Defined in: packages/observability/dist/index.d.ts:130

#### Parameters

##### request

`Request`

#### Returns

`void`

***

### onResponse()

> **onResponse**(`request`, `response`, `duration`): `void`

Defined in: packages/observability/dist/index.d.ts:131

#### Parameters

##### request

`Request`

##### response

`Response`

##### duration

`number`

#### Returns

`void`

***

### onError()

> **onError**(`error`, `request?`): `void`

Defined in: packages/observability/dist/index.d.ts:132

#### Parameters

##### error

`Error`

##### request?

`Request`\<`unknown`, `CfProperties`\<`unknown`\>\>

#### Returns

`void`

***

### onStorageOperation()

> **onStorageOperation**(`op`, `key`, `duration`): `void`

Defined in: packages/observability/dist/index.d.ts:133

#### Parameters

##### op

`string`

##### key

`string`

##### duration

`number`

#### Returns

`void`
