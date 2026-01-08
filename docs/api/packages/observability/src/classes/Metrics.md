[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/observability/src](../README.md) / Metrics

# Class: Metrics

Defined in: packages/observability/dist/index.d.ts:71

## Constructors

### Constructor

> **new Metrics**(): `Metrics`

#### Returns

`Metrics`

## Methods

### counter()

> **counter**(`name`, `value?`, `tags?`): `void`

Defined in: packages/observability/dist/index.d.ts:74

#### Parameters

##### name

`string`

##### value?

`number`

##### tags?

[`Tags`](../type-aliases/Tags.md)

#### Returns

`void`

***

### gauge()

> **gauge**(`name`, `value`, `tags?`): `void`

Defined in: packages/observability/dist/index.d.ts:75

#### Parameters

##### name

`string`

##### value

`number`

##### tags?

[`Tags`](../type-aliases/Tags.md)

#### Returns

`void`

***

### incrementGauge()

> **incrementGauge**(`name`, `value?`, `tags?`): `void`

Defined in: packages/observability/dist/index.d.ts:76

#### Parameters

##### name

`string`

##### value?

`number`

##### tags?

[`Tags`](../type-aliases/Tags.md)

#### Returns

`void`

***

### decrementGauge()

> **decrementGauge**(`name`, `value?`, `tags?`): `void`

Defined in: packages/observability/dist/index.d.ts:77

#### Parameters

##### name

`string`

##### value?

`number`

##### tags?

[`Tags`](../type-aliases/Tags.md)

#### Returns

`void`

***

### histogram()

> **histogram**(`name`, `value`, `tags?`, `buckets?`): `void`

Defined in: packages/observability/dist/index.d.ts:78

#### Parameters

##### name

`string`

##### value

`number`

##### tags?

[`Tags`](../type-aliases/Tags.md)

##### buckets?

`number`[]

#### Returns

`void`

***

### timing()

> **timing**(`name`, `ms`, `tags?`): `void`

Defined in: packages/observability/dist/index.d.ts:79

#### Parameters

##### name

`string`

##### ms

`number`

##### tags?

[`Tags`](../type-aliases/Tags.md)

#### Returns

`void`

***

### startTimer()

> **startTimer**(`name`, `tags?`): `MetricTimer`

Defined in: packages/observability/dist/index.d.ts:80

#### Parameters

##### name

`string`

##### tags?

[`Tags`](../type-aliases/Tags.md)

#### Returns

`MetricTimer`

***

### getMetric()

> **getMetric**(`name`): [`Counter`](../interfaces/Counter.md) \| [`Gauge`](../interfaces/Gauge.md) \| [`Histogram`](../interfaces/Histogram.md) \| `undefined`

Defined in: packages/observability/dist/index.d.ts:81

#### Parameters

##### name

`string`

#### Returns

[`Counter`](../interfaces/Counter.md) \| [`Gauge`](../interfaces/Gauge.md) \| [`Histogram`](../interfaces/Histogram.md) \| `undefined`

***

### getMetricValue()

> **getMetricValue**(`name`, `tags?`): `number` \| `undefined`

Defined in: packages/observability/dist/index.d.ts:82

#### Parameters

##### name

`string`

##### tags?

[`Tags`](../type-aliases/Tags.md)

#### Returns

`number` \| `undefined`

***

### getMetricValues()

> **getMetricValues**(`name`): [`MetricValue`](../interfaces/MetricValue.md)[]

Defined in: packages/observability/dist/index.d.ts:83

#### Parameters

##### name

`string`

#### Returns

[`MetricValue`](../interfaces/MetricValue.md)[]

***

### getHistogram()

> **getHistogram**(`name`, `tags?`): [`Histogram`](../interfaces/Histogram.md) \| `undefined`

Defined in: packages/observability/dist/index.d.ts:85

#### Parameters

##### name

`string`

##### tags?

[`Tags`](../type-aliases/Tags.md)

#### Returns

[`Histogram`](../interfaces/Histogram.md) \| `undefined`

***

### getMetricNames()

> **getMetricNames**(): `string`[]

Defined in: packages/observability/dist/index.d.ts:86

#### Returns

`string`[]

***

### reset()

> **reset**(): `void`

Defined in: packages/observability/dist/index.d.ts:87

#### Returns

`void`

***

### resetMetric()

> **resetMetric**(`name`): `void`

Defined in: packages/observability/dist/index.d.ts:88

#### Parameters

##### name

`string`

#### Returns

`void`

***

### setDescription()

> **setDescription**(`name`, `description`): `void`

Defined in: packages/observability/dist/index.d.ts:89

#### Parameters

##### name

`string`

##### description

`string`

#### Returns

`void`

***

### getDescription()

> **getDescription**(`name`): `string` \| `undefined`

Defined in: packages/observability/dist/index.d.ts:90

#### Parameters

##### name

`string`

#### Returns

`string` \| `undefined`

***

### \_getInternalMetrics()

> **\_getInternalMetrics**(): `Map`\<`string`, `InternalMetric`\>

Defined in: packages/observability/dist/index.d.ts:91

#### Returns

`Map`\<`string`, `InternalMetric`\>
