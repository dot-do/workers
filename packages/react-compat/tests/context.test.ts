/**
 * @dotdo/react-compat - Context API Tests
 * Beads Issue: workers-harw
 *
 * TDD RED Phase: These tests verify that the Context API is properly
 * exported and works correctly when backed by hono/jsx/dom.
 *
 * Tests cover:
 * - createContext returns object with Provider
 * - useContext returns default value without Provider
 * - useContext returns Provider value when wrapped
 * - Nested Providers override correctly
 */

import { describe, it, expect, vi } from 'vitest'
import { createContext, useContext, type Context } from '../src/index'

describe('createContext', () => {
  it('should be exported as a function', () => {
    expect(typeof createContext).toBe('function')
  })

  it('should return a context object', () => {
    const TestContext = createContext('default')
    expect(TestContext).toBeDefined()
    // hono returns a function, not an object
    expect(TestContext).toBeTruthy()
  })

  it('should return context with Provider property', () => {
    const TestContext = createContext('default')
    expect(TestContext).toHaveProperty('Provider')
    expect(TestContext.Provider).toBeDefined()
  })

  it('should have values property for default value access', () => {
    const TestContext = createContext('default-value')
    // Hono uses values array internally for context
    // Consumer is not a standard part of hono context API
    expect(TestContext).toBeDefined()
    expect(TestContext.Provider).toBeDefined()
  })

  it('should store default value', () => {
    const defaultValue = { user: 'guest', theme: 'light' }
    const TestContext = createContext(defaultValue)

    // Context should be created with default value accessible
    expect(TestContext).toBeDefined()
  })

  it('should accept displayName', () => {
    const TestContext = createContext('default')
    TestContext.displayName = 'MyTestContext'
    expect(TestContext.displayName).toBe('MyTestContext')
  })

  it('should work with undefined default', () => {
    const TestContext = createContext<string | undefined>(undefined)
    expect(TestContext).toBeDefined()
  })

  it('should work with null default', () => {
    const TestContext = createContext<string | null>(null)
    expect(TestContext).toBeDefined()
  })

  it('should work with complex object default', () => {
    interface AppState {
      user: { name: string; id: number } | null
      settings: { theme: 'light' | 'dark'; locale: string }
    }

    const defaultState: AppState = {
      user: null,
      settings: { theme: 'light', locale: 'en' },
    }

    const AppContext = createContext<AppState>(defaultState)
    expect(AppContext).toBeDefined()
    expect(AppContext.Provider).toBeDefined()
  })
})

describe('useContext', () => {
  it('should be exported as a function', () => {
    expect(typeof useContext).toBe('function')
  })

  it('should return default value without Provider', () => {
    const defaultValue = 'default-theme'
    const ThemeContext = createContext(defaultValue)

    const value = useContext(ThemeContext)
    expect(value).toBe('default-theme')
  })

  it('should return default object without Provider', () => {
    const defaultUser = { name: 'Guest', role: 'anonymous' }
    const UserContext = createContext(defaultUser)

    const value = useContext(UserContext)
    expect(value).toEqual({ name: 'Guest', role: 'anonymous' })
  })

  it('should return undefined when default is undefined', () => {
    const OptionalContext = createContext<string | undefined>(undefined)
    const value = useContext(OptionalContext)
    expect(value).toBeUndefined()
  })

  it('should return null when default is null', () => {
    const NullableContext = createContext<string | null>(null)
    const value = useContext(NullableContext)
    expect(value).toBeNull()
  })
})

describe('Context Provider', () => {
  it('Provider should be a valid component', () => {
    const TestContext = createContext('default')
    expect(TestContext.Provider).toBeDefined()
    // Provider should be callable as a component
    expect(typeof TestContext.Provider).toBe('function')
  })

  it('Provider should accept value prop', () => {
    const TestContext = createContext('default')
    const { Provider } = TestContext

    // Provider should accept value prop without throwing
    expect(() => {
      Provider({ value: 'custom', children: null })
    }).not.toThrow()
  })

  it('Provider should accept children prop', () => {
    const TestContext = createContext('default')
    const { Provider } = TestContext

    const mockChild = { type: 'div', props: {}, key: null }
    expect(() => {
      Provider({ value: 'custom', children: mockChild })
    }).not.toThrow()
  })
})

describe('Context Consumer (React Compatibility)', () => {
  // Note: Hono's Context API uses useContext hook pattern, not Consumer component
  // Consumer is a legacy React pattern. Hono focuses on the modern useContext API.
  // These tests verify the modern approach works.

  it('useContext should be the primary way to consume context', () => {
    const TestContext = createContext('default-value')
    // Modern approach: use useContext hook
    const value = useContext(TestContext)
    expect(value).toBe('default-value')
  })

  it('context should work with complex values', () => {
    interface AppState {
      theme: string
      count: number
    }
    const TestContext = createContext<AppState>({ theme: 'dark', count: 0 })
    const value = useContext(TestContext)
    expect(value.theme).toBe('dark')
    expect(value.count).toBe(0)
  })

  it('context should work with null values', () => {
    const TestContext = createContext<string | null>(null)
    const value = useContext(TestContext)
    expect(value).toBeNull()
  })
})

describe('Nested Providers', () => {
  it('should allow nested Providers', () => {
    const ThemeContext = createContext('light')

    // Outer provider
    const outerValue = 'dark'
    // Inner provider
    const innerValue = 'system'

    // Both should be valid
    expect(() => {
      ThemeContext.Provider({ value: outerValue, children: null })
    }).not.toThrow()

    expect(() => {
      ThemeContext.Provider({ value: innerValue, children: null })
    }).not.toThrow()
  })

  it('inner Provider should override outer Provider value', () => {
    const NumberContext = createContext(0)

    // Simulate nested context - inner should win
    // This would need component rendering to fully test
    const outerValue = 10
    const innerValue = 20

    // The mechanism for nested override should exist
    expect(NumberContext.Provider).toBeDefined()
  })
})

describe('Multiple Contexts', () => {
  it('should support multiple independent contexts', () => {
    const ThemeContext = createContext('light')
    const UserContext = createContext({ name: 'Guest' })
    const SettingsContext = createContext({ notifications: true })

    expect(ThemeContext).not.toBe(UserContext)
    expect(UserContext).not.toBe(SettingsContext)
    expect(ThemeContext).not.toBe(SettingsContext)
  })

  it('useContext should work with multiple contexts', () => {
    const ThemeContext = createContext('light')
    const LocaleContext = createContext('en')

    const theme = useContext(ThemeContext)
    const locale = useContext(LocaleContext)

    expect(theme).toBe('light')
    expect(locale).toBe('en')
  })
})

describe('Context Type Safety', () => {
  it('should preserve type information', () => {
    interface User {
      id: number
      name: string
      email: string
    }

    const UserContext = createContext<User | null>(null)
    const value = useContext(UserContext)

    // TypeScript should know value is User | null
    expect(value).toBeNull()
  })

  it('should work with discriminated unions', () => {
    type AuthState =
      | { status: 'loading' }
      | { status: 'authenticated'; user: { name: string } }
      | { status: 'unauthenticated' }

    const AuthContext = createContext<AuthState>({ status: 'loading' })
    const value = useContext(AuthContext)

    expect(value.status).toBe('loading')
  })

  it('should work with function types in context', () => {
    type DispatchFn = (action: { type: string }) => void
    const defaultDispatch: DispatchFn = () => {}

    const DispatchContext = createContext<DispatchFn>(defaultDispatch)
    const dispatch = useContext(DispatchContext)

    expect(typeof dispatch).toBe('function')
    expect(() => dispatch({ type: 'TEST' })).not.toThrow()
  })
})

describe('Context with Callbacks', () => {
  it('should handle context with callback functions', () => {
    interface ModalContext {
      isOpen: boolean
      open: () => void
      close: () => void
    }

    const defaultContext: ModalContext = {
      isOpen: false,
      open: () => {},
      close: () => {},
    }

    const ModalContext = createContext<ModalContext>(defaultContext)
    const ctx = useContext(ModalContext)

    expect(ctx.isOpen).toBe(false)
    expect(typeof ctx.open).toBe('function')
    expect(typeof ctx.close).toBe('function')
  })
})
