/**
 * @dotdo/vite - Aliasing Tests
 * Beads Issue: workers-p0f0
 *
 * TDD RED Phase: Tests for Vite plugin React aliasing configuration.
 * These tests verify that the plugin correctly configures module aliases
 * for React compatibility when using hono/jsx instead of React.
 *
 * Tests cover:
 * - resolveConfig({ jsx: 'hono' }) sets react alias to @dotdo/react
 * - resolveConfig({ jsx: 'hono' }) sets react-dom alias to @dotdo/react/dom
 * - resolveConfig({ jsx: 'hono' }) sets react/jsx-runtime alias
 * - resolveConfig({ jsx: 'hono' }) sets react/jsx-dev-runtime alias
 * - resolveConfig({ jsx: 'react' }) does NOT set aliases
 * - resolveConfig({ jsx: 'react-compat' }) sets aliases like 'hono'
 * - Aliases apply to node_modules (important for @tanstack/* packages)
 * - Aliases work in optimizeDeps.include
 * - Aliases work with SSR builds
 * - createDotdoPlugin() factory returns valid Vite plugin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Plugin, ResolvedConfig, UserConfig } from 'vite'

// Import from our source - these don't exist yet (RED phase)
import { resolveConfig, createDotdoPlugin, type DotdoPluginOptions } from '../src/index'

describe('resolveConfig', () => {
  describe('jsx: "hono" mode', () => {
    it('should set react alias to @dotdo/react', () => {
      const config = resolveConfig({ jsx: 'hono' })

      expect(config.resolve?.alias).toBeDefined()
      expect(config.resolve?.alias?.['react']).toBe('@dotdo/react')
    })

    it('should set react-dom alias to @dotdo/react/dom', () => {
      const config = resolveConfig({ jsx: 'hono' })

      expect(config.resolve?.alias?.['react-dom']).toBe('@dotdo/react/dom')
    })

    it('should set react-dom/client alias to @dotdo/react/dom', () => {
      const config = resolveConfig({ jsx: 'hono' })

      expect(config.resolve?.alias?.['react-dom/client']).toBe('@dotdo/react/dom')
    })

    it('should set react/jsx-runtime alias to @dotdo/react/jsx-runtime', () => {
      const config = resolveConfig({ jsx: 'hono' })

      expect(config.resolve?.alias?.['react/jsx-runtime']).toBe('@dotdo/react/jsx-runtime')
    })

    it('should set react/jsx-dev-runtime alias to @dotdo/react/jsx-dev-runtime', () => {
      const config = resolveConfig({ jsx: 'hono' })

      expect(config.resolve?.alias?.['react/jsx-dev-runtime']).toBe('@dotdo/react/jsx-dev-runtime')
    })

    it('should return all required aliases together', () => {
      const config = resolveConfig({ jsx: 'hono' })
      const alias = config.resolve?.alias

      expect(alias).toMatchObject({
        'react': '@dotdo/react',
        'react-dom': '@dotdo/react/dom',
        'react-dom/client': '@dotdo/react/dom',
        'react/jsx-runtime': '@dotdo/react/jsx-runtime',
        'react/jsx-dev-runtime': '@dotdo/react/jsx-dev-runtime',
      })
    })
  })

  describe('jsx: "react" mode', () => {
    it('should NOT set react alias when jsx is "react"', () => {
      const config = resolveConfig({ jsx: 'react' })

      expect(config.resolve?.alias?.['react']).toBeUndefined()
    })

    it('should NOT set react-dom alias when jsx is "react"', () => {
      const config = resolveConfig({ jsx: 'react' })

      expect(config.resolve?.alias?.['react-dom']).toBeUndefined()
    })

    it('should NOT set jsx-runtime alias when jsx is "react"', () => {
      const config = resolveConfig({ jsx: 'react' })

      expect(config.resolve?.alias?.['react/jsx-runtime']).toBeUndefined()
    })

    it('should return empty or undefined alias object when jsx is "react"', () => {
      const config = resolveConfig({ jsx: 'react' })

      // Either no alias object or an empty one
      const alias = config.resolve?.alias
      if (alias) {
        expect(Object.keys(alias)).toHaveLength(0)
      }
    })
  })

  describe('jsx: "react-compat" mode', () => {
    it('should set react alias like hono mode', () => {
      const config = resolveConfig({ jsx: 'react-compat' })

      expect(config.resolve?.alias?.['react']).toBe('@dotdo/react')
    })

    it('should set all aliases like hono mode', () => {
      const honoConfig = resolveConfig({ jsx: 'hono' })
      const compatConfig = resolveConfig({ jsx: 'react-compat' })

      expect(compatConfig.resolve?.alias).toEqual(honoConfig.resolve?.alias)
    })
  })

  describe('default behavior', () => {
    it('should default to "hono" mode when jsx is not specified', () => {
      const config = resolveConfig({})

      expect(config.resolve?.alias?.['react']).toBe('@dotdo/react')
    })

    it('should handle undefined options', () => {
      const config = resolveConfig(undefined as unknown as DotdoPluginOptions)

      expect(config.resolve?.alias?.['react']).toBe('@dotdo/react')
    })
  })
})

describe('Alias Configuration for node_modules', () => {
  describe('optimizeDeps configuration', () => {
    it('should include @dotdo/react in optimizeDeps.include for pre-bundling', () => {
      const config = resolveConfig({ jsx: 'hono' })

      expect(config.optimizeDeps?.include).toContain('@dotdo/react')
    })

    it('should include @dotdo/react/jsx-runtime in optimizeDeps.include', () => {
      const config = resolveConfig({ jsx: 'hono' })

      expect(config.optimizeDeps?.include).toContain('@dotdo/react/jsx-runtime')
    })

    it('should exclude react from optimizeDeps to prevent dual bundling', () => {
      const config = resolveConfig({ jsx: 'hono' })

      // react should be excluded since we're aliasing it
      expect(config.optimizeDeps?.exclude).toContain('react')
    })

    it('should exclude react-dom from optimizeDeps', () => {
      const config = resolveConfig({ jsx: 'hono' })

      expect(config.optimizeDeps?.exclude).toContain('react-dom')
    })
  })

  describe('alias resolution for @tanstack packages', () => {
    it('should configure aliases to resolve inside node_modules', () => {
      const config = resolveConfig({ jsx: 'hono' })

      // When a package like @tanstack/react-query imports 'react',
      // it should resolve to @dotdo/react
      // This requires aliases to work in node_modules
      expect(config.resolve?.alias).toBeDefined()

      // The alias configuration should not be restricted to project files only
      // Verify no restrictive conditions are set
      expect(config.resolve?.alias).not.toHaveProperty('customResolver')
    })
  })
})

describe('SSR Build Configuration', () => {
  it('should configure ssr.noExternal for @dotdo/react', () => {
    const config = resolveConfig({ jsx: 'hono' })

    // For SSR, we need to ensure @dotdo/react is bundled, not treated as external
    expect(config.ssr?.noExternal).toContain('@dotdo/react')
  })

  it('should configure ssr.noExternal for @dotdo/react subpaths', () => {
    const config = resolveConfig({ jsx: 'hono' })

    // This can be a regex pattern or array
    const noExternal = config.ssr?.noExternal
    expect(noExternal).toBeDefined()

    // Check it includes @dotdo/react patterns
    if (Array.isArray(noExternal)) {
      const hasPattern = noExternal.some((item) =>
        typeof item === 'string'
          ? item.includes('@dotdo/react')
          : item instanceof RegExp
            ? item.test('@dotdo/react')
            : false
      )
      expect(hasPattern).toBe(true)
    } else if (noExternal instanceof RegExp) {
      expect(noExternal.test('@dotdo/react')).toBe(true)
    } else if (typeof noExternal === 'string') {
      expect(noExternal).toContain('@dotdo/react')
    }
  })

  it('should NOT set SSR config when jsx is "react"', () => {
    const config = resolveConfig({ jsx: 'react' })

    // When using native React, no special SSR handling needed for @dotdo/react
    const noExternal = config.ssr?.noExternal
    if (noExternal) {
      if (Array.isArray(noExternal)) {
        const hasDotdo = noExternal.some((item) =>
          typeof item === 'string' ? item.includes('@dotdo/react') : false
        )
        expect(hasDotdo).toBe(false)
      }
    }
  })
})

describe('createDotdoPlugin', () => {
  describe('plugin factory', () => {
    it('should return a valid Vite plugin object', () => {
      const plugin = createDotdoPlugin()

      expect(plugin).toBeDefined()
      expect(typeof plugin).toBe('object')
    })

    it('should have name property set to "dotdo"', () => {
      const plugin = createDotdoPlugin()

      expect(plugin.name).toBe('dotdo')
    })

    it('should accept options parameter', () => {
      expect(() => {
        createDotdoPlugin({ jsx: 'hono' })
      }).not.toThrow()

      expect(() => {
        createDotdoPlugin({ jsx: 'react' })
      }).not.toThrow()
    })
  })

  describe('config hook', () => {
    it('should have config hook', () => {
      const plugin = createDotdoPlugin()

      expect(plugin.config).toBeDefined()
      expect(typeof plugin.config).toBe('function')
    })

    it('should return alias configuration from config hook', () => {
      const plugin = createDotdoPlugin({ jsx: 'hono' })

      // Vite calls config hook with (config, env)
      const configHook = plugin.config as (config: UserConfig, env: { command: string }) => UserConfig
      const result = configHook({}, { command: 'serve' })

      expect(result.resolve?.alias?.['react']).toBe('@dotdo/react')
    })

    it('should merge with existing user config', () => {
      const plugin = createDotdoPlugin({ jsx: 'hono' })

      const existingConfig: UserConfig = {
        resolve: {
          alias: {
            '@': '/src',
          },
        },
      }

      const configHook = plugin.config as (config: UserConfig, env: { command: string }) => UserConfig
      const result = configHook(existingConfig, { command: 'serve' })

      // Should have both existing and new aliases
      expect(result.resolve?.alias?.['@']).toBe('/src')
      expect(result.resolve?.alias?.['react']).toBe('@dotdo/react')
    })

    it('should handle build command differently from serve if needed', () => {
      const plugin = createDotdoPlugin({ jsx: 'hono' })

      const configHook = plugin.config as (config: UserConfig, env: { command: string; mode: string }) => UserConfig

      const serveResult = configHook({}, { command: 'serve', mode: 'development' })
      const buildResult = configHook({}, { command: 'build', mode: 'production' })

      // Both should have the same base aliases
      expect(serveResult.resolve?.alias?.['react']).toBe('@dotdo/react')
      expect(buildResult.resolve?.alias?.['react']).toBe('@dotdo/react')
    })
  })

  describe('configResolved hook', () => {
    it('should have configResolved hook', () => {
      const plugin = createDotdoPlugin()

      expect(plugin.configResolved).toBeDefined()
      expect(typeof plugin.configResolved).toBe('function')
    })

    it('should detect React framework from resolved config', () => {
      const plugin = createDotdoPlugin({ jsx: 'hono' })

      const mockResolvedConfig = {
        plugins: [{ name: 'vite:react-refresh' }],
        resolve: { alias: {} },
      } as unknown as ResolvedConfig

      // configResolved should not throw
      const configResolvedHook = plugin.configResolved as (config: ResolvedConfig) => void
      expect(() => {
        configResolvedHook(mockResolvedConfig)
      }).not.toThrow()
    })

    it('should detect React Router framework', () => {
      const plugin = createDotdoPlugin({ jsx: 'hono' })

      const mockResolvedConfig = {
        plugins: [{ name: 'react-router' }],
        resolve: { alias: {} },
      } as unknown as ResolvedConfig

      const configResolvedHook = plugin.configResolved as (config: ResolvedConfig) => void
      expect(() => {
        configResolvedHook(mockResolvedConfig)
      }).not.toThrow()
    })

    it('should warn if React plugin detected but jsx mode is hono', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const plugin = createDotdoPlugin({ jsx: 'hono' })

      const mockResolvedConfig = {
        plugins: [{ name: 'vite:react-refresh' }],
        resolve: { alias: {} },
      } as unknown as ResolvedConfig

      const configResolvedHook = plugin.configResolved as (config: ResolvedConfig) => void
      configResolvedHook(mockResolvedConfig)

      // Should have warned about using hono mode with React plugin
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('integration with @cloudflare/vite-plugin', () => {
    it('should be compatible with cloudflare vite plugin array', () => {
      const plugin = createDotdoPlugin({ jsx: 'hono' })

      // Should work alongside other plugins in an array
      const plugins: Plugin[] = [
        plugin,
        // Mock cloudflare plugin
        { name: 'cloudflare' } as Plugin,
      ]

      expect(plugins).toHaveLength(2)
      expect(plugins[0].name).toBe('dotdo')
      expect(plugins[1].name).toBe('cloudflare')
    })

    it('should not conflict with cloudflare plugin configuration', () => {
      const plugin = createDotdoPlugin({ jsx: 'hono' })

      const configHook = plugin.config as (config: UserConfig, env: { command: string }) => UserConfig
      const result = configHook({}, { command: 'build' })

      // Should not override or conflict with cloudflare-specific settings
      // The config should be focused on aliasing only
      expect(result.build).toBeUndefined() // We don't modify build config
      expect(result.worker).toBeUndefined() // We don't modify worker config
    })

    it('should work with cloudflare workers environment', () => {
      const plugin = createDotdoPlugin({ jsx: 'hono' })

      // Environment detection for workers
      const configHook = plugin.config as (
        config: UserConfig,
        env: { command: string; mode: string; isWorker?: boolean }
      ) => UserConfig

      const result = configHook({}, { command: 'build', mode: 'production' })

      // Aliases should still be set for worker builds
      expect(result.resolve?.alias?.['react']).toBe('@dotdo/react')
    })
  })
})

describe('Plugin Options Type Safety', () => {
  it('should accept jsx: "hono" option', () => {
    const options: DotdoPluginOptions = { jsx: 'hono' }
    expect(options.jsx).toBe('hono')
  })

  it('should accept jsx: "react" option', () => {
    const options: DotdoPluginOptions = { jsx: 'react' }
    expect(options.jsx).toBe('react')
  })

  it('should accept jsx: "react-compat" option', () => {
    const options: DotdoPluginOptions = { jsx: 'react-compat' }
    expect(options.jsx).toBe('react-compat')
  })

  it('should accept empty options object', () => {
    const options: DotdoPluginOptions = {}
    expect(options).toBeDefined()
  })
})

describe('Edge Cases', () => {
  it('should handle multiple calls to resolveConfig', () => {
    const config1 = resolveConfig({ jsx: 'hono' })
    const config2 = resolveConfig({ jsx: 'react' })

    // Configs should be independent
    expect(config1.resolve?.alias?.['react']).toBe('@dotdo/react')
    expect(config2.resolve?.alias?.['react']).toBeUndefined()
  })

  it('should not mutate the options object', () => {
    const options: DotdoPluginOptions = { jsx: 'hono' }
    const originalOptions = { ...options }

    resolveConfig(options)

    expect(options).toEqual(originalOptions)
  })

  it('should handle rapid config changes', () => {
    const plugin = createDotdoPlugin({ jsx: 'hono' })
    const configHook = plugin.config as (config: UserConfig, env: { command: string }) => UserConfig

    // Multiple rapid calls
    for (let i = 0; i < 100; i++) {
      const result = configHook({}, { command: 'serve' })
      expect(result.resolve?.alias?.['react']).toBe('@dotdo/react')
    }
  })

  it('should handle alias paths with special characters', () => {
    // Ensure the alias values don't have issues with special path chars
    const config = resolveConfig({ jsx: 'hono' })

    // All alias values should be valid module specifiers
    Object.values(config.resolve?.alias || {}).forEach((value) => {
      expect(typeof value).toBe('string')
      expect(value).toMatch(/^@dotdo\/react/)
    })
  })
})
