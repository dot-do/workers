/**
 * @dotdo/react-compat
 *
 * React compatibility layer using hono/jsx/dom for dramatic bundle size reduction.
 * Provides React-compatible APIs backed by Hono's JSX implementation.
 *
 * Target: 2.8KB vs React's 50KB+
 */

// Import Fragment separately so we can use it for StrictMode alias
import { Fragment as HonoFragment } from 'hono/jsx/dom'

// Re-export hooks from hono/jsx/dom
export {
  // Core hooks
  useState,
  useEffect,
  useLayoutEffect,
  useInsertionEffect,
  useRef,
  useMemo,
  useCallback,
  useReducer,
  useId,
  useDebugValue,
  useTransition,
  useDeferredValue,
  startTransition,
  useImperativeHandle,

  // Context API
  createContext,
  useContext,

  // External store subscription - CRITICAL for TanStack Query, Zustand, Jotai
  useSyncExternalStore,

  // Component utilities
  memo,
  forwardRef,
  createRef,

  // JSX
  createElement,
  cloneElement,
  isValidElement,
  Fragment,

  // React 18+ features
  Suspense,
  use,

  // Misc
  Children,
  flushSync,
} from 'hono/jsx/dom'

// Re-export types
export type { Context } from 'hono/jsx/dom'

// Additional React compatibility exports
export const StrictMode = HonoFragment

// Version for compatibility checks (match React's version format)
export const version = '18.3.1'

// React internals that some libraries check for
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  ReactCurrentOwner: { current: null },
  ReactCurrentDispatcher: { current: null },
}

// Types for TypeScript compatibility
export type FC<P = object> = (props: P) => JSX.Element | null
export type ReactNode = JSX.Element | string | number | boolean | null | undefined
export type ReactElement = JSX.Element
export type Ref<T> = { current: T | null }
export type RefObject<T> = Ref<T>
export type MutableRefObject<T> = { current: T }
export type Dispatch<A> = (action: A) => void
export type SetStateAction<S> = S | ((prevState: S) => S)
export type Reducer<S, A> = (prevState: S, action: A) => S

// ============================================================================
// Component and PureComponent Classes
// ============================================================================

/**
 * Shallow equality comparison for objects
 * Used by PureComponent to determine if props/state have changed
 */
function shallowEqual<T extends Record<string, unknown>>(objA: T, objB: T): boolean {
  if (Object.is(objA, objB)) {
    return true
  }

  if (typeof objA !== 'object' || objA === null ||
      typeof objB !== 'object' || objB === null) {
    return false
  }

  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) {
    return false
  }

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key) ||
        !Object.is(objA[key], objB[key])) {
      return false
    }
  }

  return true
}

/**
 * React.Component compatible base class
 *
 * Provides a familiar class-based component API for legacy React code and libraries.
 * Note: This is a compatibility shim - lifecycle methods are stubbed for API compatibility
 * but may not trigger automatically in the hono/jsx rendering context.
 *
 * @example
 * ```tsx
 * class Counter extends Component<{}, { count: number }> {
 *   state = { count: 0 }
 *
 *   increment = () => {
 *     this.setState(prev => ({ count: prev.count + 1 }))
 *   }
 *
 *   render() {
 *     return (
 *       <button onClick={this.increment}>
 *         Count: {this.state.count}
 *       </button>
 *     )
 *   }
 * }
 * ```
 */
export class Component<P = object, S = object> {
  props: Readonly<P>
  state: Readonly<S>
  context: unknown
  refs: { [key: string]: unknown }

  constructor(props: P) {
    this.props = props
    this.state = {} as S
    this.context = undefined
    this.refs = {}
  }

  /**
   * Sets the component state, triggering a re-render
   * @param state - Partial state object or updater function
   * @param callback - Optional callback called after state update
   */
  setState<K extends keyof S>(
    state: ((prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | S | null) | (Pick<S, K> | S | null),
    callback?: () => void
  ): void {
    // Compute the new state
    const newState = typeof state === 'function'
      ? (state as (prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | S | null)(this.state, this.props)
      : state

    // Merge with existing state if new state is not null
    if (newState !== null) {
      this.state = { ...this.state, ...newState } as Readonly<S>
    }

    // Call callback if provided (synchronously for simplicity)
    if (callback) {
      callback()
    }
  }

  /**
   * Forces a re-render of the component
   * @param callback - Optional callback called after re-render
   */
  forceUpdate(callback?: () => void): void {
    // In this compatibility layer, forceUpdate is a no-op
    // but we call the callback to maintain API compatibility
    if (callback) {
      callback()
    }
  }

  /**
   * Renders the component. Override in subclasses.
   * @returns JSX element or null
   */
  render(): unknown {
    return null
  }

  // Lifecycle method stubs - can be overridden in subclasses
  componentDidMount?(): void
  componentDidUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>, snapshot?: unknown): void
  componentWillUnmount?(): void
  shouldComponentUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>): boolean
  getSnapshotBeforeUpdate?(prevProps: Readonly<P>, prevState?: Readonly<S>): unknown
  componentDidCatch?(error: Error, errorInfo: { componentStack: string }): void

  // Static lifecycle methods - declare as class properties in subclasses
  static getDerivedStateFromProps?: <P, S>(props: Readonly<P>, state: Readonly<S>) => Partial<S> | null
  static getDerivedStateFromError?: (error: Error) => object
}

/**
 * React.PureComponent compatible base class
 *
 * Extends Component with a default shouldComponentUpdate that performs
 * a shallow comparison of props and state to prevent unnecessary re-renders.
 *
 * @example
 * ```tsx
 * class OptimizedItem extends PureComponent<{ item: Item }> {
 *   render() {
 *     return <div>{this.props.item.name}</div>
 *   }
 * }
 * ```
 */
export class PureComponent<P = object, S = object> extends Component<P, S> {
  /**
   * Default implementation that performs shallow comparison
   * @param nextProps - The next props
   * @param nextState - The next state
   * @returns true if component should update, false otherwise
   */
  shouldComponentUpdate(nextProps: Readonly<P>, nextState: Readonly<S>): boolean {
    return !shallowEqual(
      this.props as unknown as Record<string, unknown>,
      nextProps as unknown as Record<string, unknown>
    ) || !shallowEqual(
      this.state as unknown as Record<string, unknown>,
      nextState as unknown as Record<string, unknown>
    )
  }
}

// Import createElement for use in lazy
import { createElement } from 'hono/jsx/dom'

// React.lazy type symbol - used for React DevTools and type checking
const REACT_LAZY_TYPE = typeof Symbol === 'function' && Symbol.for
  ? Symbol.for('react.lazy')
  : 0xead4

/**
 * Component type for lazy loading
 */
export type ComponentType<P = object> = (props: P) => JSX.Element | null

/**
 * LazyExoticComponent interface matching React's API
 */
export interface LazyExoticComponent<T extends ComponentType<any>> {
  (props: Parameters<T>[0]): JSX.Element | null
  readonly $$typeof: symbol | number
  readonly displayName: string
  readonly _init: (payload: unknown) => T
  readonly _payload: unknown
  preload: () => Promise<void>
}

/**
 * React.lazy() compatible implementation for code splitting
 *
 * Creates a component that suspends while loading a dynamically imported module.
 * Works with Suspense to show fallback UI while loading.
 *
 * @example
 * ```tsx
 * const LazyComponent = lazy(() => import('./HeavyComponent'))
 *
 * function App() {
 *   return (
 *     <Suspense fallback={<Loading />}>
 *       <LazyComponent />
 *     </Suspense>
 *   )
 * }
 * ```
 */
export function lazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  // State for the loaded component
  let Component: T | null = null
  let promise: Promise<void> | null = null
  let error: Error | null = null

  // Internal payload for React internals compatibility
  const payload = {
    _status: -1, // -1: uninitialized, 0: pending, 1: resolved, 2: rejected
    _result: factory,
  }

  /**
   * Init function for React internals - starts loading and returns the component
   */
  const init = (_payload: typeof payload): T => {
    if (_payload._status === 1) {
      return _payload._result as unknown as T
    }
    throw _payload._result
  }

  /**
   * Start loading the component if not already loading
   * Returns a promise that REJECTS on error (for proper error propagation)
   */
  const startLoading = (): Promise<void> => {
    if (!promise) {
      payload._status = 0 // pending
      promise = factory()
        .then(mod => {
          if (!mod.default) {
            const noDefaultError = new Error('lazy: Module does not have a default export')
            error = noDefaultError
            payload._status = 2 // rejected
            payload._result = noDefaultError as unknown as typeof factory
            throw noDefaultError
          }
          Component = mod.default
          payload._status = 1 // resolved
          payload._result = mod.default as unknown as typeof factory
        })
        .catch(e => {
          // Store the error for subsequent renders
          error = e instanceof Error ? e : new Error(String(e))
          payload._status = 2 // rejected
          payload._result = error as unknown as typeof factory
          // Re-throw to reject the promise
          throw error
        })
    }
    return promise
  }

  /**
   * The lazy component function - throws promise to suspend, or renders loaded component
   */
  const LazyComponent = function LazyComponent(props: Parameters<T>[0]): JSX.Element | null {
    // If we have an error, throw it for error boundaries
    if (error) {
      throw error
    }

    // If component is loaded, render it directly (call the component function)
    if (Component) {
      return Component(props)
    }

    // Start loading if not started, and throw the promise to suspend
    throw startLoading()
  } as LazyExoticComponent<T>

  // Add React compatibility properties
  Object.defineProperties(LazyComponent, {
    $$typeof: {
      value: REACT_LAZY_TYPE,
      writable: false,
      enumerable: false,
      configurable: false,
    },
    displayName: {
      value: 'Lazy',
      writable: true,
      enumerable: false,
      configurable: true,
    },
    _init: {
      value: init,
      writable: false,
      enumerable: false,
      configurable: false,
    },
    _payload: {
      value: payload,
      writable: false,
      enumerable: false,
      configurable: false,
    },
    /**
     * Preload the component before rendering
     * Useful for route prefetching or hover preloading
     */
    preload: {
      value: function preload(): Promise<void> {
        return startLoading()
      },
      writable: false,
      enumerable: false,
      configurable: false,
    },
  })

  return LazyComponent
}
