[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/observability/src](../README.md) / ObservabilityConfig

# Interface: ObservabilityConfig

Defined in: packages/observability/dist/index.d.ts:52

## Properties

### metrics?

> `optional` **metrics**: [`Metrics`](../classes/Metrics.md)

Defined in: packages/observability/dist/index.d.ts:53

***

### tracer?

> `optional` **tracer**: [`Tracer`](../classes/Tracer.md)

Defined in: packages/observability/dist/index.d.ts:54

***

### prefix?

> `optional` **prefix**: `string`

Defined in: packages/observability/dist/index.d.ts:55

***

### onRequest()?

> `optional` **onRequest**: (`request`) => `void`

Defined in: packages/observability/dist/index.d.ts:56

#### Parameters

##### request

`Request`

#### Returns

`void`

***

### onResponse()?

> `optional` **onResponse**: (`request`, `response`, `duration`) => `void`

Defined in: packages/observability/dist/index.d.ts:57

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

### onError()?

> `optional` **onError**: (`error`, `request?`) => `void`

Defined in: packages/observability/dist/index.d.ts:58

#### Parameters

##### error

`Error`

##### request?

`Request`\<`unknown`, `CfProperties`\<`unknown`\>\>

#### Returns

`void`

***

### onStorageOperation()?

> `optional` **onStorageOperation**: (`op`, `key`, `duration`) => `void`

Defined in: packages/observability/dist/index.d.ts:59

#### Parameters

##### op

`string`

##### key

`string`

##### duration

`number`

#### Returns

`void`
