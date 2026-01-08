/**
 * Tests for React.Component and React.PureComponent class support
 *
 * Tests comprehensive class component functionality including:
 * - Base class extension
 * - Props and state management
 * - setState and forceUpdate
 * - Lifecycle methods
 * - PureComponent shallow comparison
 * - Children, context, and refs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Component, PureComponent, createElement } from '../src/index'
import { render } from 'hono/jsx/dom'

describe('Class Components', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('Component Base Class', () => {
    it('Component can be extended', () => {
      class MyComponent extends Component {
        render() {
          return createElement('div', null, 'Hello')
        }
      }
      const instance = new MyComponent({ test: 'prop' })
      expect(instance).toBeInstanceOf(Component)
      expect(instance.props).toEqual({ test: 'prop' })
    })

    it('Component has initial state', () => {
      class StatefulComponent extends Component {
        state = { count: 0, message: 'hello' }
        render() {
          return createElement('div', null, String(this.state.count))
        }
      }
      const instance = new StatefulComponent({})
      expect(instance.state).toEqual({ count: 0, message: 'hello' })
    })

    it('Component.setState merges state', () => {
      class Counter extends Component {
        state = { count: 0, other: 'value' }
        render() {
          return createElement('div', null, String(this.state.count))
        }
      }
      const instance = new Counter({})
      expect(instance.state).toEqual({ count: 0, other: 'value' })

      // Mock the re-render mechanism
      const originalState = instance.state
      instance.setState({ count: 1 })

      expect(instance.state.count).toBe(1)
      expect(instance.state.other).toBe('value') // Should preserve other state
    })

    it('Component.setState accepts function', () => {
      class Counter extends Component {
        state = { count: 0 }
        render() {
          return createElement('div', null, String(this.state.count))
        }
      }
      const instance = new Counter({})
      instance.setState((prevState) => ({ count: prevState.count + 1 }))
      expect(instance.state.count).toBe(1)
    })

    it('Component.setState calls callback', () => {
      const callback = vi.fn()
      class Counter extends Component {
        state = { count: 0 }
        render() {
          return createElement('div', null, String(this.state.count))
        }
      }
      const instance = new Counter({})
      instance.setState({ count: 1 }, callback)
      expect(callback).toHaveBeenCalled()
    })

    it('Component.forceUpdate exists', () => {
      class MyComponent extends Component {
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new MyComponent({})
      expect(typeof instance.forceUpdate).toBe('function')
      expect(() => instance.forceUpdate()).not.toThrow()
    })

    it('Component.forceUpdate calls callback', () => {
      const callback = vi.fn()
      class MyComponent extends Component {
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new MyComponent({})
      instance.forceUpdate(callback)
      expect(callback).toHaveBeenCalled()
    })

    it('Component has refs object', () => {
      class MyComponent extends Component {
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new MyComponent({})
      expect(instance.refs).toEqual({})
      expect(typeof instance.refs).toBe('object')
    })

    it('Component has context property', () => {
      class MyComponent extends Component {
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new MyComponent({})
      expect(instance.context).toBeDefined()
    })
  })

  describe('Component Lifecycle Methods', () => {
    it('componentDidMount can be defined', () => {
      const spy = vi.fn()
      class Lifecycle extends Component {
        componentDidMount() {
          spy()
        }
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new Lifecycle({})
      expect(typeof instance.componentDidMount).toBe('function')
      instance.componentDidMount!()
      expect(spy).toHaveBeenCalled()
    })

    it('componentDidUpdate can be defined', () => {
      const spy = vi.fn()
      class Lifecycle extends Component {
        state = { count: 0 }
        componentDidUpdate(prevProps: any, prevState: any) {
          spy(prevProps, prevState)
        }
        render() {
          return createElement('div', null, String(this.state.count))
        }
      }
      const instance = new Lifecycle({ prop: 'value' })
      expect(typeof instance.componentDidUpdate).toBe('function')
      const prevState = { count: 0 }
      instance.componentDidUpdate!({ prop: 'value' }, prevState)
      expect(spy).toHaveBeenCalledWith({ prop: 'value' }, prevState)
    })

    it('componentWillUnmount can be defined', () => {
      const spy = vi.fn()
      class Lifecycle extends Component {
        componentWillUnmount() {
          spy()
        }
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new Lifecycle({})
      expect(typeof instance.componentWillUnmount).toBe('function')
      instance.componentWillUnmount!()
      expect(spy).toHaveBeenCalled()
    })

    it('shouldComponentUpdate can be defined', () => {
      class Lifecycle extends Component {
        shouldComponentUpdate(nextProps: any, nextState: any) {
          return nextState.count > 0
        }
        state = { count: 0 }
        render() {
          return createElement('div', null, String(this.state.count))
        }
      }
      const instance = new Lifecycle({})
      expect(typeof instance.shouldComponentUpdate).toBe('function')
      expect(instance.shouldComponentUpdate!({}, { count: 0 })).toBe(false)
      expect(instance.shouldComponentUpdate!({}, { count: 1 })).toBe(true)
    })

    it('shouldComponentUpdate defaults to true if not defined', () => {
      class Lifecycle extends Component {
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new Lifecycle({})
      // When not defined, component should always update
      expect(instance.shouldComponentUpdate).toBeUndefined()
    })

    it('getSnapshotBeforeUpdate can be defined', () => {
      class Lifecycle extends Component {
        getSnapshotBeforeUpdate(prevProps: any, prevState: any) {
          return { snapshot: true }
        }
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new Lifecycle({})
      expect(typeof instance.getSnapshotBeforeUpdate).toBe('function')
      expect(instance.getSnapshotBeforeUpdate!({}, {})).toEqual({ snapshot: true })
    })

    it('componentDidCatch can be defined', () => {
      const spy = vi.fn()
      class ErrorBoundary extends Component {
        state = { hasError: false }
        componentDidCatch(error: Error, errorInfo: any) {
          spy(error, errorInfo)
          this.setState({ hasError: true })
        }
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new ErrorBoundary({})
      expect(typeof instance.componentDidCatch).toBe('function')
      const error = new Error('test')
      const errorInfo = { componentStack: 'stack' }
      instance.componentDidCatch!(error, errorInfo)
      expect(spy).toHaveBeenCalledWith(error, errorInfo)
      expect(instance.state.hasError).toBe(true)
    })
  })

  describe('Component Static Methods', () => {
    it('getDerivedStateFromProps can be defined', () => {
      class Lifecycle extends Component {
        static getDerivedStateFromProps(props: any, state: any) {
          return { derived: props.value }
        }
        state = { derived: null }
        render() {
          return createElement('div', null, String(this.state.derived))
        }
      }
      expect(typeof Lifecycle.getDerivedStateFromProps).toBe('function')
      const derivedState = Lifecycle.getDerivedStateFromProps({ value: 'test' }, {})
      expect(derivedState).toEqual({ derived: 'test' })
    })

    it('getDerivedStateFromError can be defined', () => {
      class ErrorBoundary extends Component {
        static getDerivedStateFromError(error: Error) {
          return { hasError: true, error: error.message }
        }
        state = { hasError: false, error: null }
        render() {
          return createElement('div', null, this.state.hasError ? 'Error' : 'OK')
        }
      }
      expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function')
      const derivedState = ErrorBoundary.getDerivedStateFromError(new Error('test error'))
      expect(derivedState).toEqual({ hasError: true, error: 'test error' })
    })
  })

  describe('PureComponent', () => {
    it('PureComponent can be extended', () => {
      class PureComp extends PureComponent {
        render() {
          return createElement('div', null, 'Pure')
        }
      }
      const instance = new PureComp({})
      expect(instance).toBeInstanceOf(PureComponent)
      expect(instance).toBeInstanceOf(Component)
    })

    it('PureComponent implements shouldComponentUpdate', () => {
      class PureComp extends PureComponent {
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new PureComp({ value: 1 })
      expect(typeof instance.shouldComponentUpdate).toBe('function')
    })

    it('PureComponent prevents re-render with same props', () => {
      class PureComp extends PureComponent<{ value: number }> {
        render() {
          return createElement('div', null, String(this.props.value))
        }
      }
      const instance = new PureComp({ value: 1 })

      // Same props should not update
      expect(instance.shouldComponentUpdate!({ value: 1 }, {})).toBe(false)

      // Different props should update
      expect(instance.shouldComponentUpdate!({ value: 2 }, {})).toBe(true)
    })

    it('PureComponent prevents re-render with same state', () => {
      class PureComp extends PureComponent {
        state = { count: 0 }
        render() {
          return createElement('div', null, String(this.state.count))
        }
      }
      const instance = new PureComp({})

      // Same state should not update
      expect(instance.shouldComponentUpdate!({}, { count: 0 })).toBe(false)

      // Different state should update
      expect(instance.shouldComponentUpdate!({}, { count: 1 })).toBe(true)
    })

    it('PureComponent uses shallow comparison', () => {
      class PureComp extends PureComponent<{ obj: { nested: number } }> {
        render() {
          return createElement('div', null, 'test')
        }
      }
      const obj = { nested: 1 }
      const instance = new PureComp({ obj })

      // Same object reference should not update
      expect(instance.shouldComponentUpdate!({ obj }, {})).toBe(false)

      // Different object reference should update (even with same values)
      expect(instance.shouldComponentUpdate!({ obj: { nested: 1 } }, {})).toBe(true)
    })

    it('PureComponent updates when both props and state change', () => {
      class PureComp extends PureComponent<{ value: number }> {
        state = { count: 0 }
        render() {
          return createElement('div', null, `${this.props.value}-${this.state.count}`)
        }
      }
      const instance = new PureComp({ value: 1 })

      // Same props and state should not update
      expect(instance.shouldComponentUpdate!({ value: 1 }, { count: 0 })).toBe(false)

      // Different props should update
      expect(instance.shouldComponentUpdate!({ value: 2 }, { count: 0 })).toBe(true)

      // Different state should update
      expect(instance.shouldComponentUpdate!({ value: 1 }, { count: 1 })).toBe(true)

      // Both different should update
      expect(instance.shouldComponentUpdate!({ value: 2 }, { count: 1 })).toBe(true)
    })
  })

  describe('TypeScript Generics', () => {
    it('Component supports Props generic', () => {
      interface MyProps {
        name: string
        age: number
      }
      class TypedComponent extends Component<MyProps> {
        render() {
          return createElement('div', null, `${this.props.name} is ${this.props.age}`)
        }
      }
      const instance = new TypedComponent({ name: 'Alice', age: 30 })
      expect(instance.props.name).toBe('Alice')
      expect(instance.props.age).toBe(30)
    })

    it('Component supports Props and State generics', () => {
      interface MyProps {
        initial: number
      }
      interface MyState {
        count: number
        message: string
      }
      class TypedComponent extends Component<MyProps, MyState> {
        state = { count: this.props.initial, message: 'hello' }
        render() {
          return createElement('div', null, `${this.state.message}: ${this.state.count}`)
        }
      }
      const instance = new TypedComponent({ initial: 5 })
      expect(instance.state.count).toBe(5)
      expect(instance.state.message).toBe('hello')
    })

    it('PureComponent supports Props generic', () => {
      interface MyProps {
        value: string
      }
      class TypedPureComponent extends PureComponent<MyProps> {
        render() {
          return createElement('div', null, this.props.value)
        }
      }
      const instance = new TypedPureComponent({ value: 'test' })
      expect(instance.props.value).toBe('test')
    })

    it('PureComponent supports Props and State generics', () => {
      interface MyProps {
        multiplier: number
      }
      interface MyState {
        value: number
      }
      class TypedPureComponent extends PureComponent<MyProps, MyState> {
        state = { value: 1 }
        render() {
          return createElement('div', null, String(this.state.value * this.props.multiplier))
        }
      }
      const instance = new TypedPureComponent({ multiplier: 5 })
      expect(instance.state.value).toBe(1)
      expect(instance.props.multiplier).toBe(5)
    })
  })

  describe('Children Handling', () => {
    it('Component receives children in props', () => {
      class Container extends Component<{ children?: any }> {
        render() {
          return createElement('div', null, this.props.children)
        }
      }
      const child = createElement('span', null, 'child')
      const instance = new Container({ children: child })
      expect(instance.props.children).toBe(child)
    })
  })

  describe('Context Support', () => {
    it('Component can access context', () => {
      class ContextComponent extends Component {
        static contextType = { theme: 'dark' }
        render() {
          return createElement('div', null, 'test')
        }
      }
      const instance = new ContextComponent({})
      expect(instance.context).toBeDefined()
    })
  })

  describe('Refs Support', () => {
    it('Component has refs object for string refs', () => {
      class RefComponent extends Component {
        render() {
          return createElement('div', { ref: 'myDiv' }, 'test')
        }
      }
      const instance = new RefComponent({})
      expect(instance.refs).toBeDefined()
      expect(typeof instance.refs).toBe('object')
    })
  })
})
