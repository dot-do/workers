/**
 * Tests for Package Exports and Type Definitions
 *
 * RED phase TDD tests that verify:
 * - All 11 glyphs are exported correctly
 * - All 11 ASCII aliases are exported correctly
 * - Type definitions are properly inferred
 * - Tree-shaking works with individual imports
 *
 * These tests should FAIL until the GREEN phase implementation is complete.
 */

import { describe, it, expect } from 'vitest'

describe('Package Exports', () => {
  describe('All 11 Glyphs Exported from Main Entry', () => {
    it('should export 入 (invoke) glyph', async () => {
      const { 入 } = await import('../src/index.js')
      expect(入).toBeDefined()
      expect(入).not.toBeNull()
      expect(入).not.toBe(undefined)
    })

    it('should export 人 (worker) glyph', async () => {
      const { 人 } = await import('../src/index.js')
      expect(人).toBeDefined()
      expect(人).not.toBeNull()
      expect(人).not.toBe(undefined)
    })

    it('should export 巛 (event) glyph', async () => {
      const { 巛 } = await import('../src/index.js')
      expect(巛).toBeDefined()
      expect(巛).not.toBeNull()
      expect(巛).not.toBe(undefined)
    })

    it('should export 彡 (database) glyph', async () => {
      const { 彡 } = await import('../src/index.js')
      expect(彡).toBeDefined()
      expect(彡).not.toBeNull()
      expect(彡).not.toBe(undefined)
    })

    it('should export 田 (collection) glyph', async () => {
      const { 田 } = await import('../src/index.js')
      expect(田).toBeDefined()
      expect(田).not.toBeNull()
      expect(田).not.toBe(undefined)
    })

    it('should export 目 (list) glyph', async () => {
      const { 目 } = await import('../src/index.js')
      expect(目).toBeDefined()
      expect(目).not.toBeNull()
      expect(目).not.toBe(undefined)
    })

    it('should export 口 (type) glyph', async () => {
      const { 口 } = await import('../src/index.js')
      expect(口).toBeDefined()
      expect(口).not.toBeNull()
      expect(口).not.toBe(undefined)
    })

    it('should export 回 (instance) glyph', async () => {
      const { 回 } = await import('../src/index.js')
      expect(回).toBeDefined()
      expect(回).not.toBeNull()
      expect(回).not.toBe(undefined)
    })

    it('should export 亘 (site) glyph', async () => {
      const { 亘 } = await import('../src/index.js')
      expect(亘).toBeDefined()
      expect(亘).not.toBeNull()
      expect(亘).not.toBe(undefined)
    })

    it('should export ılıl (metrics) glyph', async () => {
      // Note: ılıl uses Turkish dotless i characters
      const exports = await import('../src/index.js')
      expect(exports.ılıl).toBeDefined()
      expect(exports.ılıl).not.toBeNull()
      expect(exports.ılıl).not.toBe(undefined)
    })

    it('should export 卌 (queue) glyph', async () => {
      const { 卌 } = await import('../src/index.js')
      expect(卌).toBeDefined()
      expect(卌).not.toBeNull()
      expect(卌).not.toBe(undefined)
    })
  })

  describe('All 11 ASCII Aliases Exported from Main Entry', () => {
    it('should export fn as ASCII alias for 入', async () => {
      const { fn, 入 } = await import('../src/index.js')
      expect(fn).toBeDefined()
      expect(fn).not.toBeNull()
      expect(fn).not.toBe(undefined)
      expect(fn).toBe(入)
    })

    it('should export worker as ASCII alias for 人', async () => {
      const { worker, 人 } = await import('../src/index.js')
      expect(worker).toBeDefined()
      expect(worker).not.toBeNull()
      expect(worker).not.toBe(undefined)
      expect(worker).toBe(人)
    })

    it('should export on as ASCII alias for 巛', async () => {
      const { on, 巛 } = await import('../src/index.js')
      expect(on).toBeDefined()
      expect(on).not.toBeNull()
      expect(on).not.toBe(undefined)
      expect(on).toBe(巛)
    })

    it('should export db as ASCII alias for 彡', async () => {
      const { db, 彡 } = await import('../src/index.js')
      expect(db).toBeDefined()
      expect(db).not.toBeNull()
      expect(db).not.toBe(undefined)
      expect(db).toBe(彡)
    })

    it('should export c as ASCII alias for 田', async () => {
      const { c, 田 } = await import('../src/index.js')
      expect(c).toBeDefined()
      expect(c).not.toBeNull()
      expect(c).not.toBe(undefined)
      expect(c).toBe(田)
    })

    it('should export ls as ASCII alias for 目', async () => {
      const { ls, 目 } = await import('../src/index.js')
      expect(ls).toBeDefined()
      expect(ls).not.toBeNull()
      expect(ls).not.toBe(undefined)
      expect(ls).toBe(目)
    })

    it('should export T as ASCII alias for 口', async () => {
      const { T, 口 } = await import('../src/index.js')
      expect(T).toBeDefined()
      expect(T).not.toBeNull()
      expect(T).not.toBe(undefined)
      expect(T).toBe(口)
    })

    it('should export $ as ASCII alias for 回', async () => {
      const { $, 回 } = await import('../src/index.js')
      expect($).toBeDefined()
      expect($).not.toBeNull()
      expect($).not.toBe(undefined)
      expect($).toBe(回)
    })

    it('should export www as ASCII alias for 亘', async () => {
      const { www, 亘 } = await import('../src/index.js')
      expect(www).toBeDefined()
      expect(www).not.toBeNull()
      expect(www).not.toBe(undefined)
      expect(www).toBe(亘)
    })

    it('should export m as ASCII alias for ılıl', async () => {
      const exports = await import('../src/index.js')
      expect(exports.m).toBeDefined()
      expect(exports.m).not.toBeNull()
      expect(exports.m).not.toBe(undefined)
      expect(exports.m).toBe(exports.ılıl)
    })

    it('should export q as ASCII alias for 卌', async () => {
      const { q, 卌 } = await import('../src/index.js')
      expect(q).toBeDefined()
      expect(q).not.toBeNull()
      expect(q).not.toBe(undefined)
      expect(q).toBe(卌)
    })
  })

  describe('All Exports in Single Import Statement', () => {
    it('should export all 22 symbols (11 glyphs + 11 aliases) from package', async () => {
      const exports = await import('../src/index.js')

      // All 11 glyphs
      const glyphs = ['入', '人', '巛', '彡', '田', '目', '口', '回', '亘', 'ılıl', '卌']
      for (const glyph of glyphs) {
        expect(exports).toHaveProperty(glyph)
        expect((exports as Record<string, unknown>)[glyph]).toBeDefined()
        expect((exports as Record<string, unknown>)[glyph]).not.toBe(undefined)
      }

      // All 11 ASCII aliases
      const aliases = ['fn', 'worker', 'on', 'db', 'c', 'ls', 'T', '$', 'www', 'm', 'q']
      for (const alias of aliases) {
        expect(exports).toHaveProperty(alias)
        expect((exports as Record<string, unknown>)[alias]).toBeDefined()
        expect((exports as Record<string, unknown>)[alias]).not.toBe(undefined)
      }
    })
  })

  describe('Tree-Shakable Individual Imports', () => {
    it('should allow importing 入/fn from invoke module', async () => {
      const { 入, fn } = await import('../src/invoke.js')
      expect(入).toBeDefined()
      expect(fn).toBeDefined()
      expect(fn).toBe(入)
    })

    it('should allow importing 人/worker from worker module', async () => {
      const { 人, worker } = await import('../src/worker.js')
      expect(人).toBeDefined()
      expect(worker).toBeDefined()
      expect(worker).toBe(人)
    })

    it('should allow importing 巛/on from event module', async () => {
      const { 巛, on } = await import('../src/event.js')
      expect(巛).toBeDefined()
      expect(on).toBeDefined()
      expect(on).toBe(巛)
    })

    it('should allow importing 彡/db from db module', async () => {
      const { 彡, db } = await import('../src/db.js')
      expect(彡).toBeDefined()
      expect(db).toBeDefined()
      expect(db).toBe(彡)
    })

    it('should allow importing 田/c from collection module', async () => {
      const { 田, c } = await import('../src/collection.js')
      expect(田).toBeDefined()
      expect(c).toBeDefined()
      expect(c).toBe(田)
    })

    it('should allow importing 目/ls from list module', async () => {
      const { 目, ls } = await import('../src/list.js')
      expect(目).toBeDefined()
      expect(ls).toBeDefined()
      expect(ls).toBe(目)
    })

    it('should allow importing 口/T from type module', async () => {
      const { 口, T } = await import('../src/type.js')
      expect(口).toBeDefined()
      expect(T).toBeDefined()
      expect(T).toBe(口)
    })

    it('should allow importing 回/$ from instance module', async () => {
      const { 回, $ } = await import('../src/instance.js')
      expect(回).toBeDefined()
      expect($).toBeDefined()
      expect($).toBe(回)
    })

    it('should allow importing 亘/www from site module', async () => {
      const { 亘, www } = await import('../src/site.js')
      expect(亘).toBeDefined()
      expect(www).toBeDefined()
      expect(www).toBe(亘)
    })

    it('should allow importing ılıl/m from metrics module', async () => {
      // Metrics module may not exist yet - this is expected to fail in RED phase
      const { ılıl, m } = await import('../src/metrics.js')
      expect(ılıl).toBeDefined()
      expect(m).toBeDefined()
      expect(m).toBe(ılıl)
    })

    it('should allow importing 卌/q from queue module', async () => {
      const { 卌, q } = await import('../src/queue.js')
      expect(卌).toBeDefined()
      expect(q).toBeDefined()
      expect(q).toBe(卌)
    })
  })
})

describe('Type Definitions', () => {
  describe('Glyph Type Inference', () => {
    it('should infer 入 as callable tagged template', async () => {
      const { 入 } = await import('../src/index.js')
      // Type check: 入 should be callable as tagged template
      // This will fail at runtime if 入 is undefined, but the type should be correct
      expect(typeof 入).toBe('function')
    })

    it('should infer 人 as callable tagged template with proxy methods', async () => {
      const { 人 } = await import('../src/index.js')
      expect(typeof 人).toBe('function')
      // Worker should have .with() method
      expect(typeof 人.with).toBe('function')
      // Worker should have .timeout() method
      expect(typeof 人.timeout).toBe('function')
    })

    it('should infer 巛 as callable tagged template (event emitter)', async () => {
      const { 巛 } = await import('../src/index.js')
      expect(typeof 巛).toBe('function')
    })

    it('should infer 彡 as callable for database proxy creation', async () => {
      const { 彡 } = await import('../src/index.js')
      expect(typeof 彡).toBe('function')
    })

    it('should infer 田 as callable for collection creation', async () => {
      const { 田 } = await import('../src/index.js')
      expect(typeof 田).toBe('function')
    })

    it('should infer 目 as callable for list operations', async () => {
      const { 目 } = await import('../src/index.js')
      expect(typeof 目).toBe('function')
    })

    it('should infer 口 as callable for type/schema definition', async () => {
      const { 口 } = await import('../src/index.js')
      expect(typeof 口).toBe('function')
    })

    it('should infer 回 as callable for instance creation', async () => {
      const { 回 } = await import('../src/index.js')
      expect(typeof 回).toBe('function')
    })

    it('should infer 亘 as callable for site/page definition', async () => {
      const { 亘 } = await import('../src/index.js')
      expect(typeof 亘).toBe('function')
    })

    it('should infer ılıl as callable for metrics operations', async () => {
      const exports = await import('../src/index.js')
      expect(typeof exports.ılıl).toBe('function')
    })

    it('should infer 卌 as callable for queue operations', async () => {
      const { 卌 } = await import('../src/index.js')
      expect(typeof 卌).toBe('function')
    })
  })

  describe('ASCII Alias Type Equivalence', () => {
    it('should have fn with same type as 入', async () => {
      const { 入, fn } = await import('../src/index.js')
      expect(typeof fn).toBe(typeof 入)
      // They should be the exact same reference
      expect(Object.is(fn, 入)).toBe(true)
    })

    it('should have worker with same type as 人', async () => {
      const { 人, worker } = await import('../src/index.js')
      expect(typeof worker).toBe(typeof 人)
      expect(Object.is(worker, 人)).toBe(true)
    })

    it('should have on with same type as 巛', async () => {
      const { 巛, on } = await import('../src/index.js')
      expect(typeof on).toBe(typeof 巛)
      expect(Object.is(on, 巛)).toBe(true)
    })

    it('should have db with same type as 彡', async () => {
      const { 彡, db } = await import('../src/index.js')
      expect(typeof db).toBe(typeof 彡)
      expect(Object.is(db, 彡)).toBe(true)
    })

    it('should have c with same type as 田', async () => {
      const { 田, c } = await import('../src/index.js')
      expect(typeof c).toBe(typeof 田)
      expect(Object.is(c, 田)).toBe(true)
    })

    it('should have ls with same type as 目', async () => {
      const { 目, ls } = await import('../src/index.js')
      expect(typeof ls).toBe(typeof 目)
      expect(Object.is(ls, 目)).toBe(true)
    })

    it('should have T with same type as 口', async () => {
      const { 口, T } = await import('../src/index.js')
      expect(typeof T).toBe(typeof 口)
      expect(Object.is(T, 口)).toBe(true)
    })

    it('should have $ with same type as 回', async () => {
      const { 回, $ } = await import('../src/index.js')
      expect(typeof $).toBe(typeof 回)
      expect(Object.is($, 回)).toBe(true)
    })

    it('should have www with same type as 亘', async () => {
      const { 亘, www } = await import('../src/index.js')
      expect(typeof www).toBe(typeof 亘)
      expect(Object.is(www, 亘)).toBe(true)
    })

    it('should have m with same type as ılıl', async () => {
      const exports = await import('../src/index.js')
      expect(typeof exports.m).toBe(typeof exports.ılıl)
      expect(Object.is(exports.m, exports.ılıl)).toBe(true)
    })

    it('should have q with same type as 卌', async () => {
      const { 卌, q } = await import('../src/index.js')
      expect(typeof q).toBe(typeof 卌)
      expect(Object.is(q, 卌)).toBe(true)
    })
  })
})

describe('Package Structure', () => {
  it('should be importable as ES module', async () => {
    // This test verifies the package can be imported at all
    const glyphs = await import('../src/index.js')
    expect(glyphs).toBeDefined()
    expect(typeof glyphs).toBe('object')
  })

  it('should have no default export (named exports only)', async () => {
    const glyphs = await import('../src/index.js')
    expect(glyphs.default).toBeUndefined()
  })

  it('should export exactly 22 named exports', async () => {
    const glyphs = await import('../src/index.js')
    const exportedNames = Object.keys(glyphs)

    // 11 glyphs + 11 aliases = 22 exports
    expect(exportedNames.length).toBe(22)
  })
})

describe('Glyph-Alias Mapping Correctness', () => {
  const expectedMappings = [
    { glyph: '入', alias: 'fn', description: 'invoke' },
    { glyph: '人', alias: 'worker', description: 'worker/agent' },
    { glyph: '巛', alias: 'on', description: 'event' },
    { glyph: '彡', alias: 'db', description: 'database' },
    { glyph: '田', alias: 'c', description: 'collection' },
    { glyph: '目', alias: 'ls', description: 'list' },
    { glyph: '口', alias: 'T', description: 'type' },
    { glyph: '回', alias: '$', description: 'instance' },
    { glyph: '亘', alias: 'www', description: 'site' },
    { glyph: 'ılıl', alias: 'm', description: 'metrics' },
    { glyph: '卌', alias: 'q', description: 'queue' },
  ]

  for (const { glyph, alias, description } of expectedMappings) {
    it(`should correctly map ${glyph} to ${alias} (${description})`, async () => {
      const exports = await import('../src/index.js') as Record<string, unknown>
      expect(exports[glyph]).toBeDefined()
      expect(exports[alias]).toBeDefined()
      expect(exports[glyph]).toBe(exports[alias])
    })
  }
})
