[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/observability/src](../README.md) / Span

# Class: Span

Defined in: packages/observability/dist/index.d.ts:93

## Constructors

### Constructor

> **new Span**(`name`, `traceId`, `spanId`, `parentSpanId?`, `onEnd?`): `Span`

Defined in: packages/observability/dist/index.d.ts:107

#### Parameters

##### name

`string`

##### traceId

`string`

##### spanId

`string`

##### parentSpanId?

`string`

##### onEnd?

(`span`) => `void`

#### Returns

`Span`

## Properties

### name

> `readonly` **name**: `string`

Defined in: packages/observability/dist/index.d.ts:94

***

### spanId

> `readonly` **spanId**: `string`

Defined in: packages/observability/dist/index.d.ts:95

***

### traceId

> `readonly` **traceId**: `string`

Defined in: packages/observability/dist/index.d.ts:96

***

### parentSpanId?

> `readonly` `optional` **parentSpanId**: `string`

Defined in: packages/observability/dist/index.d.ts:97

***

### startTime

> `readonly` **startTime**: `number`

Defined in: packages/observability/dist/index.d.ts:98

***

### endTime?

> `optional` **endTime**: `number`

Defined in: packages/observability/dist/index.d.ts:99

***

### duration?

> `optional` **duration**: `number`

Defined in: packages/observability/dist/index.d.ts:100

***

### status?

> `optional` **status**: `"error"` \| `"ok"`

Defined in: packages/observability/dist/index.d.ts:101

***

### statusMessage?

> `optional` **statusMessage**: `string`

Defined in: packages/observability/dist/index.d.ts:102

## Methods

### setAttribute()

> **setAttribute**(`key`, `value`): `void`

Defined in: packages/observability/dist/index.d.ts:108

#### Parameters

##### key

`string`

##### value

`string` | `number` | `boolean`

#### Returns

`void`

***

### setAttributes()

> **setAttributes**(`attributes`): `void`

Defined in: packages/observability/dist/index.d.ts:109

#### Parameters

##### attributes

`Record`\<`string`, `string` \| `number` \| `boolean`\>

#### Returns

`void`

***

### getAttribute()

> **getAttribute**(`key`): `string` \| `number` \| `boolean` \| `undefined`

Defined in: packages/observability/dist/index.d.ts:110

#### Parameters

##### key

`string`

#### Returns

`string` \| `number` \| `boolean` \| `undefined`

***

### addEvent()

> **addEvent**(`name`, `attributes?`): `void`

Defined in: packages/observability/dist/index.d.ts:111

#### Parameters

##### name

`string`

##### attributes?

`Record`\<`string`, `string` \| `number` \| `boolean`\>

#### Returns

`void`

***

### getEvents()

> **getEvents**(): [`SpanEvent`](../interfaces/SpanEvent.md)[]

Defined in: packages/observability/dist/index.d.ts:112

#### Returns

[`SpanEvent`](../interfaces/SpanEvent.md)[]

***

### setStatus()

> **setStatus**(`status`, `message?`): `void`

Defined in: packages/observability/dist/index.d.ts:113

#### Parameters

##### status

`"error"` | `"ok"`

##### message?

`string`

#### Returns

`void`

***

### recordException()

> **recordException**(`error`): `void`

Defined in: packages/observability/dist/index.d.ts:114

#### Parameters

##### error

`Error`

#### Returns

`void`

***

### end()

> **end**(): `void`

Defined in: packages/observability/dist/index.d.ts:115

#### Returns

`void`

***

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Defined in: packages/observability/dist/index.d.ts:116

#### Returns

`Record`\<`string`, `unknown`\>
