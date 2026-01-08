[**@dotdo/workers API Documentation v0.0.1**](../../../../README.md)

***

[@dotdo/workers API Documentation](../../../../modules.md) / [packages/do-core/src](../README.md) / AccessStats

# Interface: AccessStats

Defined in: [packages/do-core/src/migration-policy.ts:135](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L135)

Access statistics for an item

## Properties

### itemId

> **itemId**: `string`

Defined in: [packages/do-core/src/migration-policy.ts:137](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L137)

Item identifier

***

### totalAccesses

> **totalAccesses**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:139](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L139)

Total access count

***

### recentAccesses

> **recentAccesses**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:141](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L141)

Accesses within the recent window

***

### lastAccessedAt

> **lastAccessedAt**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:143](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L143)

Timestamp of last access

***

### accessWindow

> **accessWindow**: `number`

Defined in: [packages/do-core/src/migration-policy.ts:145](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/packages/do-core/src/migration-policy.ts#L145)

Window size in milliseconds
