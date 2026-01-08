[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/observability/src](../README.md) / Tracer

# Class: Tracer

Defined in: packages/observability/dist/index.d.ts:118

## Constructors

### Constructor

> **new Tracer**(): `Tracer`

#### Returns

`Tracer`

## Methods

### startSpan()

> **startSpan**(`name`, `options?`): [`Span`](Span.md)

Defined in: packages/observability/dist/index.d.ts:122

#### Parameters

##### name

`string`

##### options?

[`SpanOptions`](../interfaces/SpanOptions.md)

#### Returns

[`Span`](Span.md)

***

### activeSpan()

> **activeSpan**(): [`Span`](Span.md) \| `null`

Defined in: packages/observability/dist/index.d.ts:123

#### Returns

[`Span`](Span.md) \| `null`

***

### setActiveSpan()

> **setActiveSpan**(`span`): `void`

Defined in: packages/observability/dist/index.d.ts:124

#### Parameters

##### span

[`Span`](Span.md)

#### Returns

`void`

***

### withSpan()

> **withSpan**\<`T`\>(`name`, `fn`): `Promise`\<`T`\>

Defined in: packages/observability/dist/index.d.ts:125

#### Type Parameters

##### T

`T`

#### Parameters

##### name

`string`

##### fn

(`span`) => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

***

### getCompletedSpans()

> **getCompletedSpans**(): [`Span`](Span.md)[]

Defined in: packages/observability/dist/index.d.ts:126

#### Returns

[`Span`](Span.md)[]

***

### reset()

> **reset**(): `void`

Defined in: packages/observability/dist/index.d.ts:127

#### Returns

`void`
