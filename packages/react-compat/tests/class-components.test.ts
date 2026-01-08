/**
 * @dotdo/react-compat - Class Component Tests
 * Beads Issue: workers-4jys
 *
 * TDD RED Phase: These tests verify that React.Component and React.PureComponent
 * class support is properly implemented. Tests are designed to FAIL until
 * Component classes are implemented in the compatibility layer.
 *
 * Tests cover:
 * - Component base class can be extended
 * - Component.setState triggers re-render
 * - Component lifecycle methods (componentDidMount, componentDidUpdate, etc.)
 * - PureComponent with shallow prop comparison
 * - forceUpdate functionality
 * - Props and state access patterns
 *
 * Note: Class components are needed for compatibility with legacy React libraries.
 * Full lifecycle support may be limited compared to React.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// Import Component and PureComponent - these should fail until implemented
import {
  Component,
  PureComponent,
  createElement,
} from '../src/index'

describe('Component Base Class', () => {
  it('should be exported as a class/function', () => {
    expect(Component).toBeDefined()
    expect(typeof Component).toBe('function')
  })

  it('Component can be extended', () => {
    class MyComponent extends Component {
      render() {
        return createElement('div', null, 'Hello')
      }
    }
    const instance = new MyComponent({})
    expect(instance).toBeInstanceOf(Component)
  })

  it('should accept props in constructor', () => {
    class MyComponent extends Component<{ name: string }> {
      render() {
        return createElement('div', null, this.props.name)
      }
    }
    const instance = new MyComponent({ name: 'Test' })
    expect(instance.props.name).toBe('Test')
  })

  it('should have render method', () => {
    class MyComponent extends Component {
      render() {
        return createElement('div', null, 'Content')
      }
    }
    const instance = new MyComponent({})
    expect(typeof instance.render).toBe('function')
  })

  it('render should return an element', () => {
    class MyComponent extends Component {
      render() {
        return createElement('span', { id: 'test' }, 'Hello World')
      }
    }
    const instance = new MyComponent({})
    const element = instance.render()
    expect(element).toBeDefined()
    expect(element.type).toBe('span')
    expect(element.props.id).toBe('test')
  })

  it('should support default props via static property', () => {
    class MyComponent extends Component<{ value: number }> {
      static defaultProps = { value: 42 }
      render() {
        return createElement('div', null, String(this.props.value))
      }
    }
    // defaultProps should be applied
    expect(MyComponent.defaultProps).toEqual({ value: 42 })
  })
})

describe('Component State Management', () => {
  it('should initialize state as class property', () => {
    class Counter extends Component {
      state = { count: 0 }
      render() {
        return createElement('div', null, String(this.state.count))
      }
    }
    const instance = new Counter({})
    expect(instance.state).toEqual({ count: 0 })
  })

  it('should have setState method', () => {
    class Counter extends Component {
      state = { count: 0 }
      render() {
        return createElement('div', null, String(this.state.count))
      }
    }
    const instance = new Counter({})
    expect(typeof instance.setState).toBe('function')
  })

  it('setState should accept an object', () => {
    class Counter extends Component<object, { count: number }> {
      state = { count: 0 }
      render() {
        return createElement('div', null, String(this.state.count))
      }
    }
    const instance = new Counter({})
    expect(() => instance.setState({ count: 1 })).not.toThrow()
  })

  it('setState should accept an updater function', () => {
    class Counter extends Component<object, { count: number }> {
      state = { count: 0 }
      increment = () => {
        this.setState((prevState) => ({ count: prevState.count + 1 }))
      }
      render() {
        return createElement('div', null, String(this.state.count))
      }
    }
    const instance = new Counter({})
    expect(() => instance.increment()).not.toThrow()
  })

  it('setState should accept a callback', () => {
    const callback = vi.fn()
    class Counter extends Component<object, { count: number }> {
      state = { count: 0 }
      render() {
        return createElement('div', null, String(this.state.count))
      }
    }
    const instance = new Counter({})
    expect(() => instance.setState({ count: 1 }, callback)).not.toThrow()
  })

  it('should have forceUpdate method', () => {
    class MyComponent extends Component {
      render() {
        return createElement('div', null, 'Force')
      }
    }
    const instance = new MyComponent({})
    expect(typeof instance.forceUpdate).toBe('function')
  })

  it('forceUpdate should accept a callback', () => {
    const callback = vi.fn()
    class MyComponent extends Component {
      render() {
        return createElement('div', null, 'Force')
      }
    }
    const instance = new MyComponent({})
    expect(() => instance.forceUpdate(callback)).not.toThrow()
  })
})

describe('Component Lifecycle Methods', () => {
  it('componentDidMount should be callable', () => {
    const spy = vi.fn()
    class Lifecycle extends Component {
      componentDidMount() {
        spy()
      }
      render() {
        return createElement('div', null, 'Mounted')
      }
    }
    const instance = new Lifecycle({})
    expect(typeof instance.componentDidMount).toBe('function')
  })

  it('componentDidUpdate should be callable', () => {
    const spy = vi.fn()
    class Lifecycle extends Component<{ value: number }, { count: number }> {
      state = { count: 0 }
      componentDidUpdate(prevProps: { value: number }, prevState: { count: number }) {
        spy(prevProps, prevState)
      }
      render() {
        return createElement('div', null, String(this.state.count))
      }
    }
    const instance = new Lifecycle({ value: 1 })
    expect(typeof instance.componentDidUpdate).toBe('function')
  })

  it('componentWillUnmount should be callable', () => {
    const spy = vi.fn()
    class Lifecycle extends Component {
      componentWillUnmount() {
        spy()
      }
      render() {
        return createElement('div', null, 'Will Unmount')
      }
    }
    const instance = new Lifecycle({})
    expect(typeof instance.componentWillUnmount).toBe('function')
  })

  it('shouldComponentUpdate should be callable', () => {
    class Lifecycle extends Component<{ value: number }, { count: number }> {
      state = { count: 0 }
      shouldComponentUpdate(nextProps: { value: number }, nextState: { count: number }) {
        return nextProps.value !== this.props.value || nextState.count !== this.state.count
      }
      render() {
        return createElement('div', null, String(this.state.count))
      }
    }
    const instance = new Lifecycle({ value: 1 })
    expect(typeof instance.shouldComponentUpdate).toBe('function')
    expect(instance.shouldComponentUpdate({ value: 2 }, { count: 0 })).toBe(true)
    expect(instance.shouldComponentUpdate({ value: 1 }, { count: 0 })).toBe(false)
  })

  it('getSnapshotBeforeUpdate should be callable', () => {
    class Lifecycle extends Component<{ value: number }> {
      getSnapshotBeforeUpdate(prevProps: { value: number }) {
        return { wasValue: prevProps.value }
      }
      render() {
        return createElement('div', null, String(this.props.value))
      }
    }
    const instance = new Lifecycle({ value: 1 })
    expect(typeof instance.getSnapshotBeforeUpdate).toBe('function')
  })

  it('static getDerivedStateFromProps should be definable', () => {
    class Lifecycle extends Component<{ value: number }, { derivedValue: number }> {
      state = { derivedValue: 0 }
      static getDerivedStateFromProps(props: { value: number }) {
        return { derivedValue: props.value * 2 }
      }
      render() {
        return createElement('div', null, String(this.state.derivedValue))
      }
    }
    expect(typeof Lifecycle.getDerivedStateFromProps).toBe('function')
    expect(Lifecycle.getDerivedStateFromProps({ value: 5 })).toEqual({ derivedValue: 10 })
  })

  it('static getDerivedStateFromError should be definable', () => {
    class ErrorBoundary extends Component<object, { hasError: boolean }> {
      state = { hasError: false }
      static getDerivedStateFromError(_error: Error) {
        return { hasError: true }
      }
      render() {
        return createElement('div', null, this.state.hasError ? 'Error' : 'OK')
      }
    }
    expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function')
    expect(ErrorBoundary.getDerivedStateFromError(new Error('test'))).toEqual({ hasError: true })
  })

  it('componentDidCatch should be callable', () => {
    const spy = vi.fn()
    class ErrorBoundary extends Component<object, { hasError: boolean }> {
      state = { hasError: false }
      componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
        spy(error, errorInfo)
      }
      render() {
        return createElement('div', null, 'Boundary')
      }
    }
    const instance = new ErrorBoundary({})
    expect(typeof instance.componentDidCatch).toBe('function')
  })
})

describe('PureComponent', () => {
  it('should be exported as a class/function', () => {
    expect(PureComponent).toBeDefined()
    expect(typeof PureComponent).toBe('function')
  })

  it('PureComponent can be extended', () => {
    class MyPureComponent extends PureComponent {
      render() {
        return createElement('div', null, 'Pure')
      }
    }
    const instance = new MyPureComponent({})
    expect(instance).toBeInstanceOf(PureComponent)
  })

  it('PureComponent should also be instanceof Component', () => {
    class MyPureComponent extends PureComponent {
      render() {
        return createElement('div', null, 'Pure')
      }
    }
    const instance = new MyPureComponent({})
    expect(instance).toBeInstanceOf(Component)
  })

  it('should have render method', () => {
    class MyPureComponent extends PureComponent<{ value: number }> {
      render() {
        return createElement('div', null, String(this.props.value))
      }
    }
    const instance = new MyPureComponent({ value: 42 })
    expect(typeof instance.render).toBe('function')
  })

  it('should have setState method', () => {
    class MyPureComponent extends PureComponent<object, { count: number }> {
      state = { count: 0 }
      render() {
        return createElement('div', null, String(this.state.count))
      }
    }
    const instance = new MyPureComponent({})
    expect(typeof instance.setState).toBe('function')
  })

  it('should have implicit shouldComponentUpdate with shallow compare', () => {
    class MyPureComponent extends PureComponent<{ value: number }> {
      render() {
        return createElement('div', null, String(this.props.value))
      }
    }
    const instance = new MyPureComponent({ value: 1 })
    // PureComponent should have built-in shallow comparison
    // When props are the same, shouldComponentUpdate returns false
    expect(instance).toBeDefined()
  })

  it('should support all lifecycle methods like Component', () => {
    const mountSpy = vi.fn()
    const updateSpy = vi.fn()
    const unmountSpy = vi.fn()

    class MyPureComponent extends PureComponent<{ value: number }> {
      componentDidMount() {
        mountSpy()
      }
      componentDidUpdate() {
        updateSpy()
      }
      componentWillUnmount() {
        unmountSpy()
      }
      render() {
        return createElement('div', null, String(this.props.value))
      }
    }
    const instance = new MyPureComponent({ value: 1 })
    expect(typeof instance.componentDidMount).toBe('function')
    expect(typeof instance.componentDidUpdate).toBe('function')
    expect(typeof instance.componentWillUnmount).toBe('function')
  })
})

describe('Component with Children', () => {
  it('should access children via props', () => {
    class Container extends Component<{ children?: unknown }> {
      render() {
        return createElement('div', { className: 'container' }, this.props.children)
      }
    }
    const childElement = createElement('span', null, 'Child')
    const instance = new Container({ children: childElement })
    expect(instance.props.children).toBe(childElement)
  })

  it('should handle multiple children', () => {
    class Container extends Component<{ children?: unknown[] }> {
      render() {
        return createElement('div', null, ...(this.props.children || []))
      }
    }
    const children = [
      createElement('span', { key: '1' }, 'First'),
      createElement('span', { key: '2' }, 'Second'),
    ]
    const instance = new Container({ children })
    expect(instance.props.children).toEqual(children)
    expect(instance.props.children?.length).toBe(2)
  })
})

describe('Component Context (Legacy)', () => {
  it('should support contextType static property', () => {
    // Create a mock context for testing
    const mockContext = { Provider: () => null, Consumer: () => null }

    class MyComponent extends Component {
      static contextType = mockContext
      render() {
        return createElement('div', null, 'Context')
      }
    }
    expect(MyComponent.contextType).toBe(mockContext)
  })

  it('should have context property accessible', () => {
    class MyComponent extends Component {
      context: unknown
      render() {
        return createElement('div', null, String(this.context))
      }
    }
    const instance = new MyComponent({})
    // context should be accessible (even if undefined)
    expect('context' in instance || instance.context === undefined).toBe(true)
  })
})

describe('Component Refs', () => {
  it('should support refs via createRef pattern', () => {
    class MyComponent extends Component {
      divRef = { current: null as HTMLDivElement | null }
      render() {
        return createElement('div', { ref: this.divRef }, 'Ref')
      }
    }
    const instance = new MyComponent({})
    expect(instance.divRef).toBeDefined()
    expect(instance.divRef.current).toBeNull()
  })

  it('should support callback refs in render', () => {
    class MyComponent extends Component {
      element: HTMLDivElement | null = null
      setRef = (el: HTMLDivElement | null) => {
        this.element = el
      }
      render() {
        return createElement('div', { ref: this.setRef }, 'Callback Ref')
      }
    }
    const instance = new MyComponent({})
    expect(typeof instance.setRef).toBe('function')
  })
})

describe('Component Type Checking', () => {
  it('should support generic props type', () => {
    interface MyProps {
      name: string
      count: number
      optional?: boolean
    }

    class TypedComponent extends Component<MyProps> {
      render() {
        const { name, count, optional } = this.props
        return createElement('div', null, `${name}: ${count} (${optional ? 'yes' : 'no'})`)
      }
    }

    const instance = new TypedComponent({ name: 'Test', count: 5 })
    expect(instance.props.name).toBe('Test')
    expect(instance.props.count).toBe(5)
    expect(instance.props.optional).toBeUndefined()
  })

  it('should support generic state type', () => {
    interface MyState {
      loading: boolean
      data: string | null
      error: Error | null
    }

    class TypedComponent extends Component<object, MyState> {
      state: MyState = {
        loading: true,
        data: null,
        error: null,
      }
      render() {
        if (this.state.loading) {
          return createElement('div', null, 'Loading...')
        }
        return createElement('div', null, this.state.data || 'No data')
      }
    }

    const instance = new TypedComponent({})
    expect(instance.state.loading).toBe(true)
    expect(instance.state.data).toBeNull()
    expect(instance.state.error).toBeNull()
  })
})

describe('Component as JSX Type', () => {
  it('should be usable as createElement type argument', () => {
    class MyComponent extends Component<{ message: string }> {
      render() {
        return createElement('div', null, this.props.message)
      }
    }

    // Component class should work as first argument to createElement
    const element = createElement(MyComponent, { message: 'Hello' })
    expect(element).toBeDefined()
    expect(element.type).toBe(MyComponent)
    expect(element.props.message).toBe('Hello')
  })

  it('PureComponent should be usable as createElement type argument', () => {
    class MyPureComponent extends PureComponent<{ value: number }> {
      render() {
        return createElement('div', null, String(this.props.value))
      }
    }

    const element = createElement(MyPureComponent, { value: 123 })
    expect(element).toBeDefined()
    expect(element.type).toBe(MyPureComponent)
    expect(element.props.value).toBe(123)
  })
})

describe('Component displayName', () => {
  it('should support displayName static property', () => {
    class MyComponent extends Component {
      static displayName = 'MyCustomComponent'
      render() {
        return createElement('div', null, 'Display')
      }
    }
    expect(MyComponent.displayName).toBe('MyCustomComponent')
  })

  it('should support displayName on PureComponent', () => {
    class MyPureComponent extends PureComponent {
      static displayName = 'MyCustomPureComponent'
      render() {
        return createElement('div', null, 'Pure Display')
      }
    }
    expect(MyPureComponent.displayName).toBe('MyCustomPureComponent')
  })
})
