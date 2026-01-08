/**
 * @dotdo/react-compat - lazy() and Suspense Tests
 * Beads Issue: workers-01dj
 *
 * Tests for code splitting with lazy() and Suspense boundary.
 *
 * Tests cover:
 * - lazy() creates lazy-loaded components
 * - lazy() accepts factory returning Promise<{ default: Component }>
 * - lazy() throws promise while loading (Suspense boundary catches it)
 * - lazy() renders component after loading
 * - lazy() has preload() method
 * - lazy() handles loading errors
 * - Suspense is exported and available
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { lazy, Suspense, createElement } from '../src/index'

describe('lazy()', () => {
  it('should be exported as a function', () => {
    expect(typeof lazy).toBe('function')
  })

  it('should accept a factory function', () => {
    const factory = () => Promise.resolve({ default: () => createElement('div', null, 'Loaded') })
    expect(() => lazy(factory)).not.toThrow()
  })

  it('should return a component function', () => {
    const factory = () => Promise.resolve({ default: () => createElement('div', null, 'Loaded') })
    const LazyComponent = lazy(factory)
    expect(typeof LazyComponent).toBe('function')
  })

  it('should have a preload method', () => {
    const factory = () => Promise.resolve({ default: () => createElement('div', null, 'Loaded') })
    const LazyComponent = lazy(factory)
    expect(typeof LazyComponent.preload).toBe('function')
  })

  it('should throw promise on first render (for Suspense)', () => {
    const Component = () => createElement('div', null, 'Loaded')
    const factory = () => Promise.resolve({ default: Component })
    const LazyComponent = lazy(factory)

    // First call should throw a promise
    expect(() => LazyComponent({})).toThrow()
  })

  it('should render component after promise resolves', async () => {
    const Component = () => createElement('div', null, 'Loaded')
    const factory = () => Promise.resolve({ default: Component })
    const LazyComponent = lazy(factory)

    // First call throws
    try {
      LazyComponent({})
    } catch (e) {
      // Should be a promise
      expect(e).toBeInstanceOf(Promise)
      // Wait for it to resolve
      await e
    }

    // Second call should render
    const result = LazyComponent({})
    expect(result).toBeDefined()
  })

  it('should pass props to the loaded component', async () => {
    const Component = (props: { message: string }) => createElement('div', null, props.message)
    const factory = () => Promise.resolve({ default: Component })
    const LazyComponent = lazy(factory)

    // Load the component
    try {
      LazyComponent({ message: 'Hello' })
    } catch (promise) {
      await promise
    }

    // Render with props
    const result = LazyComponent({ message: 'Hello' })
    expect(result).toBeDefined()
  })

  it('preload() should return a promise', () => {
    const Component = () => createElement('div', null, 'Loaded')
    const factory = () => Promise.resolve({ default: Component })
    const LazyComponent = lazy(factory)

    const preloadPromise = LazyComponent.preload()
    expect(preloadPromise).toBeInstanceOf(Promise)
  })

  it('preload() should load component without throwing', async () => {
    const Component = () => createElement('div', null, 'Loaded')
    const factory = () => Promise.resolve({ default: Component })
    const LazyComponent = lazy(factory)

    // Preload
    await LazyComponent.preload()

    // Now rendering should not throw
    const result = LazyComponent({})
    expect(result).toBeDefined()
  })

  it('should handle factory errors', async () => {
    const error = new Error('Load failed')
    const factory = () => Promise.reject(error)
    const LazyComponent = lazy(factory)

    // First call throws promise
    try {
      LazyComponent({})
    } catch (promise) {
      // Wait for promise to reject
      await promise.catch(() => {})
    }

    // Second call should throw the error
    expect(() => LazyComponent({})).toThrow('Load failed')
  })

  it('should only call factory once', async () => {
    const factory = vi.fn(() => Promise.resolve({
      default: () => createElement('div', null, 'Loaded')
    }))
    const LazyComponent = lazy(factory)

    // First render
    try {
      LazyComponent({})
    } catch (promise) {
      await promise
    }

    // Second render
    LazyComponent({})

    // Factory should be called only once
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('should cache the loaded component', async () => {
    const factory = vi.fn(() => Promise.resolve({
      default: () => createElement('div', null, 'Loaded')
    }))
    const LazyComponent = lazy(factory)

    // Load
    try {
      LazyComponent({})
    } catch (promise) {
      await promise
    }

    // Render multiple times
    LazyComponent({})
    LazyComponent({})
    LazyComponent({})

    // Factory should only be called once (caching works)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('preload() should use same promise as render', () => {
    const factory = () => Promise.resolve({
      default: () => createElement('div', null, 'Loaded')
    })
    const LazyComponent = lazy(factory)

    const preloadPromise = LazyComponent.preload()

    // Render should throw same promise
    try {
      LazyComponent({})
    } catch (renderPromise) {
      // Should be the same promise reference
      expect(renderPromise).toBe(preloadPromise)
    }
  })
})

describe('Suspense', () => {
  it('should be exported', () => {
    expect(Suspense).toBeDefined()
  })

  it('should be a function or component', () => {
    // Suspense should be a function (component) or object
    expect(typeof Suspense === 'function' || typeof Suspense === 'object').toBe(true)
  })
})
