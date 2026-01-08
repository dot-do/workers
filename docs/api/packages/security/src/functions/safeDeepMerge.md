[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/security/src](../README.md) / safeDeepMerge

# Function: safeDeepMerge()

> **safeDeepMerge**\<`T`\>(`target`, `source`): `T`

Defined in: [packages/security/src/prototype-pollution.ts:161](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/security/src/prototype-pollution.ts#L161)

Safely deep merge objects, filtering out prototype pollution keys
Uses null prototype to ensure no inherited constructor/prototype properties

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### target

`T`

The target object to merge into

### source

`Partial`\<`T`\>

The source object to merge from

## Returns

`T`

A new merged object without prototype pollution
