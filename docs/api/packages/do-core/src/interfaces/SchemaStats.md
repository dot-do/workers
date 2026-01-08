[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / SchemaStats

# Interface: SchemaStats

Defined in: [packages/do-core/src/schema.ts:152](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L152)

Statistics about schema initialization

Performance metrics for monitoring and debugging schema operations.
Useful for performance benchmarking and identifying initialization issues.

## Properties

### initializationCount

> **initializationCount**: `number`

Defined in: [packages/do-core/src/schema.ts:154](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L154)

Number of times schema has been initialized

***

### lastInitTime

> **lastInitTime**: `number` \| `null`

Defined in: [packages/do-core/src/schema.ts:156](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L156)

Timestamp of last initialization

***

### lastInitDurationMs

> **lastInitDurationMs**: `number` \| `null`

Defined in: [packages/do-core/src/schema.ts:158](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/schema.ts#L158)

Duration of last initialization in milliseconds
