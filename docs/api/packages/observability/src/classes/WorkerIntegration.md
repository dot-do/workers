[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/observability/src](../README.md) / WorkerIntegration

# Class: WorkerIntegration

Defined in: packages/observability/dist/index.d.ts:150

## Constructors

### Constructor

> **new WorkerIntegration**(`config`): `WorkerIntegration`

Defined in: packages/observability/dist/index.d.ts:155

#### Parameters

##### config

[`ObservabilityConfig`](../interfaces/ObservabilityConfig.md)

#### Returns

`WorkerIntegration`

## Methods

### getHooks()

> **getHooks**(): [`ObservabilityHooks`](../interfaces/ObservabilityHooks.md)

Defined in: packages/observability/dist/index.d.ts:156

#### Returns

[`ObservabilityHooks`](../interfaces/ObservabilityHooks.md)

***

### wrapHandler()

> **wrapHandler**(`handler`): (`request`, `env`, `ctx`) => `Promise`\<`Response`\>

Defined in: packages/observability/dist/index.d.ts:157

#### Parameters

##### handler

(`request`, `env`, `ctx`) => `Promise`\<`Response`\>

#### Returns

> (`request`, `env`, `ctx`): `Promise`\<`Response`\>

##### Parameters

###### request

`Request`

###### env

`unknown`

###### ctx

`ExecutionContext`

##### Returns

`Promise`\<`Response`\>

***

### handleMetrics()

> **handleMetrics**(`_request`): `Promise`\<`Response`\>

Defined in: packages/observability/dist/index.d.ts:158

#### Parameters

##### \_request

`Request`

#### Returns

`Promise`\<`Response`\>
