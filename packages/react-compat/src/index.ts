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
