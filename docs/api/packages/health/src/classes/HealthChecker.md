[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/health/src](../README.md) / HealthChecker

# Class: HealthChecker

Defined in: packages/health/dist/index.d.ts:91

HealthChecker - Comprehensive health checking for Cloudflare Workers

Provides:
- Liveness probe: Is the process alive?
- Readiness probe: Can the service accept traffic?
- Dependency health checks: Are all dependencies healthy?
- Aggregated health status: Overall service health

## Constructors

### Constructor

> **new HealthChecker**(`config?`): `HealthChecker`

Defined in: packages/health/dist/index.d.ts:97

#### Parameters

##### config?

[`HealthCheckerConfig`](../interfaces/HealthCheckerConfig.md)

#### Returns

`HealthChecker`

## Methods

### getDefaultTimeout()

> **getDefaultTimeout**(): `number`

Defined in: packages/health/dist/index.d.ts:101

Get the default timeout for dependency checks

#### Returns

`number`

***

### setVersion()

> **setVersion**(`version`): `void`

Defined in: packages/health/dist/index.d.ts:105

Set the service version for health responses

#### Parameters

##### version

`string`

#### Returns

`void`

***

### setServiceName()

> **setServiceName**(`name`): `void`

Defined in: packages/health/dist/index.d.ts:109

Set the service name for health responses

#### Parameters

##### name

`string`

#### Returns

`void`

***

### liveness()

> **liveness**(): `Promise`\<[`LivenessProbe`](../interfaces/LivenessProbe.md)\>

Defined in: packages/health/dist/index.d.ts:116

Liveness probe - checks if the process is alive

This should always return healthy unless the process is dead.
Use for Kubernetes liveness probes.

#### Returns

`Promise`\<[`LivenessProbe`](../interfaces/LivenessProbe.md)\>

***

### readiness()

> **readiness**(): `Promise`\<[`ReadinessProbe`](../interfaces/ReadinessProbe.md)\>

Defined in: packages/health/dist/index.d.ts:123

Readiness probe - checks if the service can accept traffic

Returns unhealthy if any registered dependency is unhealthy.
Use for Kubernetes readiness probes.

#### Returns

`Promise`\<[`ReadinessProbe`](../interfaces/ReadinessProbe.md)\>

***

### registerDependency()

> **registerDependency**(`name`, `checkFn`, `options?`): `void`

Defined in: packages/health/dist/index.d.ts:127

Register a dependency for health checking

#### Parameters

##### name

`string`

##### checkFn

[`DependencyCheckFn`](../type-aliases/DependencyCheckFn.md)

##### options?

[`DependencyOptions`](../interfaces/DependencyOptions.md)

#### Returns

`void`

***

### unregisterDependency()

> **unregisterDependency**(`name`): `void`

Defined in: packages/health/dist/index.d.ts:131

Unregister a dependency

#### Parameters

##### name

`string`

#### Returns

`void`

***

### getDependencies()

> **getDependencies**(): `string`[]

Defined in: packages/health/dist/index.d.ts:135

Get list of registered dependency names

#### Returns

`string`[]

***

### checkDependency()

> **checkDependency**(`name`): `Promise`\<[`DependencyStatus`](../interfaces/DependencyStatus.md)\>

Defined in: packages/health/dist/index.d.ts:139

Check a specific dependency's health

#### Parameters

##### name

`string`

#### Returns

`Promise`\<[`DependencyStatus`](../interfaces/DependencyStatus.md)\>

***

### health()

> **health**(): `Promise`\<[`AggregatedHealth`](../interfaces/AggregatedHealth.md)\>

Defined in: packages/health/dist/index.d.ts:150

Aggregated health status - comprehensive health check

Combines liveness, readiness, and all dependency checks into
a single response. Use for detailed health monitoring.

#### Returns

`Promise`\<[`AggregatedHealth`](../interfaces/AggregatedHealth.md)\>

***

### livenessResponse()

> **livenessResponse**(): `Promise`\<`Response`\>

Defined in: packages/health/dist/index.d.ts:154

Generate HTTP Response for liveness probe

#### Returns

`Promise`\<`Response`\>

***

### readinessResponse()

> **readinessResponse**(): `Promise`\<`Response`\>

Defined in: packages/health/dist/index.d.ts:158

Generate HTTP Response for readiness probe

#### Returns

`Promise`\<`Response`\>

***

### healthResponse()

> **healthResponse**(): `Promise`\<`Response`\>

Defined in: packages/health/dist/index.d.ts:162

Generate HTTP Response for aggregated health

#### Returns

`Promise`\<`Response`\>
