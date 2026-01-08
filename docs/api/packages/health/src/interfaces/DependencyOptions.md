[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/health/src](../README.md) / DependencyOptions

# Interface: DependencyOptions

Defined in: packages/health/dist/index.d.ts:69

Options for registering a dependency

## Properties

### timeout?

> `optional` **timeout**: `number`

Defined in: packages/health/dist/index.d.ts:71

Timeout in milliseconds for the check (default: 5000)

***

### critical?

> `optional` **critical**: `boolean`

Defined in: packages/health/dist/index.d.ts:73

Whether this dependency is critical (affects overall health status)
