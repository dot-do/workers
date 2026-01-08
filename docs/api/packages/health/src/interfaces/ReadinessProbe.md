[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/health/src](../README.md) / ReadinessProbe

# Interface: ReadinessProbe

Defined in: packages/health/dist/index.d.ts:26

Readiness probe response - indicates if the service can accept traffic

## Properties

### status

> **status**: `"healthy"` \| `"unhealthy"`

Defined in: packages/health/dist/index.d.ts:27

***

### ready

> **ready**: `boolean`

Defined in: packages/health/dist/index.d.ts:28

***

### timestamp

> **timestamp**: `number`

Defined in: packages/health/dist/index.d.ts:29

***

### details?

> `optional` **details**: `Record`\<`string`, [`DependencyStatus`](DependencyStatus.md)\>

Defined in: packages/health/dist/index.d.ts:30
