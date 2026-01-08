[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/health/src](../README.md) / AggregatedHealth

# Interface: AggregatedHealth

Defined in: packages/health/dist/index.d.ts:44

Aggregated health status combining all probes

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"` \| `"degraded"`

Defined in: packages/health/dist/index.d.ts:45

***

### timestamp

> **timestamp**: `number`

Defined in: packages/health/dist/index.d.ts:46

***

### liveness

> **liveness**: [`LivenessProbe`](LivenessProbe.md)

Defined in: packages/health/dist/index.d.ts:47

***

### readiness

> **readiness**: [`ReadinessProbe`](ReadinessProbe.md)

Defined in: packages/health/dist/index.d.ts:48

***

### dependencies

> **dependencies**: `Record`\<`string`, [`DependencyStatus`](DependencyStatus.md)\>

Defined in: packages/health/dist/index.d.ts:49

***

### version?

> `optional` **version**: `string`

Defined in: packages/health/dist/index.d.ts:50

***

### service?

> `optional` **service**: `string`

Defined in: packages/health/dist/index.d.ts:51
