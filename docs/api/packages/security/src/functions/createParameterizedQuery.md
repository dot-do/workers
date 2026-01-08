[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / createParameterizedQuery

# Function: createParameterizedQuery()

> **createParameterizedQuery**(`sql`, `params`): [`ParameterizedQuery`](../interfaces/ParameterizedQuery.md)

Defined in: [packages/security/src/index.ts:164](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/index.ts#L164)

Create a parameterized query from SQL template and parameters

## Parameters

### sql

`string`

SQL template with placeholders (? or :name)

### params

Array or object of parameter values

`Record`\<`string`, `unknown`\> | `unknown`[]

## Returns

[`ParameterizedQuery`](../interfaces/ParameterizedQuery.md)

ParameterizedQuery with separated SQL and params
