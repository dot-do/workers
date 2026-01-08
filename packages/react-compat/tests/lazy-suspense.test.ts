/**
 * @dotdo/react-compat - lazy() and Suspense Tests
 * Beads Issue: workers-3tkq
 *
 * TDD RED Phase: These tests verify that lazy() and Suspense code splitting
 * support works correctly when backed by hono/jsx/dom.
 *
 * React's lazy() creates a component that suspends while loading.
 * Suspense catches the promise and shows fallback until loaded.
 *
 * Tests cover:
 * - lazy() returns a component function
 * - lazy() component throws promise on first render (suspends)
 * - lazy() component renders after promise resolves
 * - Suspense shows fallback while lazy component loads
 * - Suspense renders loaded component after resolution
 * - lazy().preload() starts loading before render
 * - Error handling for failed imports
 * - Multiple lazy components in same Suspense boundary
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  Suspense,
  createElement,
  Fragment,
  lazy,
} from '../src/index'

describe('lazy() function', () => {
  it('should be exported as a function', () => {
    expect(typeof lazy).toBe('function')
  })

  it('should accept a dynamic import function', () => {
    const loader = () => Promise.resolve({ default: () => createElement('div', null, 'Loaded') })
    expect(() => lazy(loader)).not.toThrow()
  })

  it('should return a component (function)', () => {
    const loader = () => Promise.resolve({ default: () => createElement('div', null, 'Loaded') })
    const LazyComponent = lazy(loader)
    expect(typeof LazyComponent).toBe('function')
  })

  it('should have displayName property for debugging', () => {
    const loader = () => Promise.resolve({ default: () => createElement('div', null, 'Loaded') })
    const LazyComponent = lazy(loader)
    // React sets displayName for debugging
    expect(LazyComponent).toHaveProperty('displayName')
  })

  it('should have _init and _payload for React internals compatibility', () => {
    // React's lazy uses these internals for reconciliation
    const loader = () => Promise.resolve({ default: () => createElement('div', null, 'Loaded') })
    const LazyComponent = lazy(loader)

    // These are React internals but some libraries check for them
    expect(LazyComponent).toHaveProperty('_init')
    expect(LazyComponent).toHaveProperty('_payload')
  })
})

describe('lazy() component behavior', () => {
  it('should throw a promise on first render (suspend)', () => {
    let resolveLoader: (value: { default: () => JSX.Element }) => void
    const loaderPromise = new Promise<{ default: () => JSX.Element }>(resolve => {
      resolveLoader = resolve
    })
    const loader = () => loaderPromise
    const LazyComponent = lazy(loader)

    // First render should throw the loading promise
    expect(() => LazyComponent({})).toThrow()

    // The thrown value should be a Promise
    try {
      LazyComponent({})
    } catch (e) {
      expect(e).toBeInstanceOf(Promise)
    }
  })

  it('should render the loaded component after promise resolves', async () => {
    const LoadedComponent = () => createElement('div', { id: 'loaded' }, 'Success')
    const loader = () => Promise.resolve({ default: LoadedComponent })
    const LazyComponent = lazy(loader)

    // First call throws promise
    try {
      LazyComponent({})
    } catch (e) {
      // Wait for the promise to resolve
      await e
    }

    // Second call should return the component result
    const result = LazyComponent({})
    expect(result).toBeDefined()
  })

  it('should only call loader once (memoize)', async () => {
    const loaderFn = vi.fn(() => Promise.resolve({ default: () => createElement('div', null, 'Test') }))
    const LazyComponent = lazy(loaderFn)

    // First call
    try { LazyComponent({}) } catch (e) { await e }

    // Second call
    try { LazyComponent({}) } catch (e) { await e }

    // Third call
    try { LazyComponent({}) } catch (e) { await e }

    // Loader should only be called once
    expect(loaderFn).toHaveBeenCalledTimes(1)
  })

  it('should pass props through to loaded component', async () => {
    const LoadedComponent = vi.fn((props: { name: string }) =>
      createElement('div', null, `Hello ${props.name}`)
    )
    const loader = () => Promise.resolve({ default: LoadedComponent })
    const LazyComponent = lazy(loader)

    // Load the component
    try { LazyComponent({ name: 'World' }) } catch (e) { await e }

    // Render with props
    LazyComponent({ name: 'Test' })

    expect(LoadedComponent).toHaveBeenCalledWith({ name: 'Test' })
  })
})

describe('lazy().preload()', () => {
  it('should have a preload method', () => {
    const loader = () => Promise.resolve({ default: () => createElement('div', null, 'Loaded') })
    const LazyComponent = lazy(loader)

    expect(typeof LazyComponent.preload).toBe('function')
  })

  it('preload should start loading before render', async () => {
    const loaderFn = vi.fn(() => Promise.resolve({ default: () => createElement('div', null, 'Test') }))
    const LazyComponent = lazy(loaderFn)

    // Call preload
    LazyComponent.preload()

    // Loader should be called immediately
    expect(loaderFn).toHaveBeenCalledTimes(1)
  })

  it('preload should return the loading promise', () => {
    const loaderPromise = Promise.resolve({ default: () => createElement('div', null, 'Test') })
    const loader = () => loaderPromise
    const LazyComponent = lazy(loader)

    const preloadResult = LazyComponent.preload()
    expect(preloadResult).toBeInstanceOf(Promise)
  })

  it('preload should make subsequent render synchronous', async () => {
    const LoadedComponent = () => createElement('div', null, 'Loaded')
    const loader = () => Promise.resolve({ default: LoadedComponent })
    const LazyComponent = lazy(loader)

    // Preload and wait
    await LazyComponent.preload()

    // Now render should not throw
    expect(() => LazyComponent({})).not.toThrow()
  })
})

describe('lazy() error handling', () => {
  it('should throw error when import fails', async () => {
    const error = new Error('Module not found')
    const loader = () => Promise.reject(error)
    const LazyComponent = lazy(loader)

    // First call throws the loading promise
    let loadingPromise: Promise<unknown>
    try {
      LazyComponent({})
    } catch (e) {
      loadingPromise = e as Promise<unknown>
    }

    // Wait for loading to fail
    await expect(loadingPromise!).rejects.toThrow('Module not found')

    // Subsequent render should throw the actual error
    expect(() => LazyComponent({})).toThrow('Module not found')
  })

  it('should throw error for modules without default export', async () => {
    // Module without default export
    const loader = () => Promise.resolve({} as { default: () => JSX.Element })
    const LazyComponent = lazy(loader)

    try {
      LazyComponent({})
    } catch (e) {
      await e
    }

    // Should throw an error about missing default export
    expect(() => LazyComponent({})).toThrow()
  })
})

describe('Suspense with lazy components', () => {
  it('Suspense should be exported', () => {
    expect(Suspense).toBeDefined()
    expect(typeof Suspense).toBe('function')
  })

  it('Suspense should accept fallback prop', () => {
    const fallback = createElement('div', null, 'Loading...')

    expect(() => {
      Suspense({ fallback, children: null })
    }).not.toThrow()
  })

  it('Suspense should catch promise from lazy component', () => {
    let resolveLoader: (value: { default: () => JSX.Element }) => void
    const loaderPromise = new Promise<{ default: () => JSX.Element }>(resolve => {
      resolveLoader = resolve
    })
    const LazyComponent = lazy(() => loaderPromise)

    const fallback = createElement('div', { id: 'loading' }, 'Loading...')

    // Suspense should handle the thrown promise
    expect(() => {
      Suspense({
        fallback,
        children: createElement(LazyComponent, null),
      })
    }).not.toThrow()
  })

  it('Suspense should render fallback while loading', () => {
    let resolveLoader: (value: { default: () => JSX.Element }) => void
    const loaderPromise = new Promise<{ default: () => JSX.Element }>(resolve => {
      resolveLoader = resolve
    })
    const LazyComponent = lazy(() => loaderPromise)

    const fallback = createElement('div', { id: 'loading' }, 'Loading...')

    const result = Suspense({
      fallback,
      children: createElement(LazyComponent, null),
    })

    // Result should be defined (returns fallback or handles internally)
    expect(result).toBeDefined()
  })

  it('Suspense should render loaded component after resolution', async () => {
    const LoadedComponent = () => createElement('div', { id: 'loaded' }, 'Loaded!')
    const loader = () => Promise.resolve({ default: LoadedComponent })
    const LazyComponent = lazy(loader)

    // Preload to ensure loaded
    await LazyComponent.preload()

    const fallback = createElement('div', { id: 'loading' }, 'Loading...')

    const result = Suspense({
      fallback,
      children: createElement(LazyComponent, null),
    })

    // After loading, should render the actual component
    expect(result).toBeDefined()
  })
})

describe('Multiple lazy components', () => {
  it('should handle multiple lazy components in same Suspense', () => {
    const loader1 = () => Promise.resolve({ default: () => createElement('div', null, 'One') })
    const loader2 = () => Promise.resolve({ default: () => createElement('div', null, 'Two') })

    const Lazy1 = lazy(loader1)
    const Lazy2 = lazy(loader2)

    const fallback = createElement('div', null, 'Loading...')

    // Should not throw
    expect(() => {
      Suspense({
        fallback,
        children: [
          createElement(Lazy1, { key: '1' }),
          createElement(Lazy2, { key: '2' }),
        ],
      })
    }).not.toThrow()
  })

  it('each lazy component should have independent loading state', async () => {
    let resolve1: (value: { default: () => JSX.Element }) => void
    let resolve2: (value: { default: () => JSX.Element }) => void

    const promise1 = new Promise<{ default: () => JSX.Element }>(r => { resolve1 = r })
    const promise2 = new Promise<{ default: () => JSX.Element }>(r => { resolve2 = r })

    const Lazy1 = lazy(() => promise1)
    const Lazy2 = lazy(() => promise2)

    // Both should throw initially
    expect(() => Lazy1({})).toThrow()
    expect(() => Lazy2({})).toThrow()

    // Resolve first one
    resolve1!({ default: () => createElement('div', null, 'One') })
    await promise1

    // First should not throw, second still should
    expect(() => Lazy1({})).not.toThrow()
    expect(() => Lazy2({})).toThrow()

    // Resolve second one
    resolve2!({ default: () => createElement('div', null, 'Two') })
    await promise2

    // Both should render
    expect(() => Lazy1({})).not.toThrow()
    expect(() => Lazy2({})).not.toThrow()
  })
})

describe('lazy() TypeScript types', () => {
  it('should preserve component prop types', async () => {
    interface MyComponentProps {
      name: string
      count: number
      optional?: boolean
    }

    const MyComponent = (props: MyComponentProps) =>
      createElement('div', null, `${props.name}: ${props.count}`)

    const loader = () => Promise.resolve({ default: MyComponent })
    const LazyMyComponent = lazy(loader)

    // Preload to make synchronous
    await LazyMyComponent.preload()

    // TypeScript should allow valid props (this is a compile-time check)
    // Runtime test just verifies it works
    expect(() => {
      LazyMyComponent({ name: 'Test', count: 42 })
    }).not.toThrow()
  })
})

describe('React.lazy compatibility', () => {
  // These tests verify React API compatibility for library interop

  it('should work like React.lazy with module syntax', async () => {
    // Simulate ESM dynamic import
    const moduleLoader = () => import('./fixtures/lazy-test-component')
      .catch(() => Promise.resolve({
        default: () => createElement('div', null, 'Fallback for test')
      }))

    const LazyComponent = lazy(moduleLoader)

    // Should be callable
    expect(typeof LazyComponent).toBe('function')
  })

  it('lazy component should have $$typeof for React DevTools', () => {
    const loader = () => Promise.resolve({ default: () => createElement('div', null, 'Test') })
    const LazyComponent = lazy(loader)

    // React uses Symbol.for('react.lazy') for type checking
    // If Symbol is not available, use string fallback
    const REACT_LAZY_TYPE = typeof Symbol === 'function' && Symbol.for
      ? Symbol.for('react.lazy')
      : 0xead4

    expect(LazyComponent.$$typeof).toBe(REACT_LAZY_TYPE)
  })
})
