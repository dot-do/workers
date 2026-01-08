/**
 * React-compatible Component and PureComponent classes
 *
 * Provides class component support for legacy libraries and codebases
 * that rely on class-based components.
 */

/**
 * Shallow comparison utility for PureComponent
 */
function shallowEqual(objA: any, objB: any): boolean {
  if (Object.is(objA, objB)) {
    return true
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false
  }

  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) {
    return false
  }

  // Test for A's keys different from B
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i]
    if (!Object.prototype.hasOwnProperty.call(objB, key) || !Object.is(objA[key], objB[key])) {
      return false
    }
  }

  return true
}

/**
 * Base Component class
 *
 * Provides the foundation for class-based React components with:
 * - Props and state management
 * - setState and forceUpdate methods
 * - Lifecycle method hooks
 * - Context and refs support
 */
export class Component<P = {}, S = {}> {
  /**
   * Component props (read-only)
   */
  props: Readonly<P>

  /**
   * Component state (read-only, use setState to update)
   */
  state: Readonly<S>

  /**
   * Component context
   */
  context: any

  /**
   * Legacy string refs object
   */
  refs: { [key: string]: any }

  /**
   * Static contextType for consuming a single context
   */
  static contextType?: any

  /**
   * Construct a new component with props
   */
  constructor(props: P) {
    this.props = props
    this.state = {} as S
    this.context = {}
    this.refs = {}
  }

  /**
   * Update component state and trigger re-render
   *
   * @param state - Partial state or function that returns partial state
   * @param callback - Optional callback called after state update
   */
  setState<K extends keyof S>(
    state:
      | ((prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | S | null)
      | (Pick<S, K> | S | null),
    callback?: () => void
  ): void {
    let nextState: Partial<S> | null

    if (typeof state === 'function') {
      nextState = state(this.state, this.props)
    } else {
      nextState = state
    }

    if (nextState !== null) {
      // Merge state (shallow merge)
      this.state = Object.assign({}, this.state, nextState)
    }

    // Call callback if provided
    if (callback) {
      callback()
    }

    // Note: In a real implementation, this would trigger a re-render
    // For basic compatibility, we just update the state
  }

  /**
   * Force a re-render of the component
   *
   * @param callback - Optional callback called after update
   */
  forceUpdate(callback?: () => void): void {
    // Call callback if provided
    if (callback) {
      callback()
    }

    // Note: In a real implementation, this would trigger a re-render
    // For basic compatibility, this is a no-op
  }

  /**
   * Render method - must be overridden by subclasses
   */
  render(): any {
    return null
  }

  // Lifecycle methods (optional, can be overridden by subclasses)

  /**
   * Called immediately after component is mounted
   */
  componentDidMount?(): void

  /**
   * Called immediately after updating occurs
   */
  componentDidUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>, snapshot?: any): void

  /**
   * Called immediately before component is unmounted and destroyed
   */
  componentWillUnmount?(): void

  /**
   * Determine if component should re-render
   * Return false to skip rendering
   */
  shouldComponentUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>): boolean

  /**
   * Called right before the most recently rendered output is committed
   * Return value will be passed as third parameter to componentDidUpdate
   */
  getSnapshotBeforeUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>): any

  /**
   * Error boundary: catch errors in child components
   */
  componentDidCatch?(error: Error, errorInfo: any): void

  /**
   * Static lifecycle: derive state from props
   */
  static getDerivedStateFromProps?(props: any, state: any): any

  /**
   * Static lifecycle: derive state from error (error boundaries)
   */
  static getDerivedStateFromError?(error: Error): any
}

/**
 * PureComponent class
 *
 * Extends Component with a default implementation of shouldComponentUpdate
 * that performs shallow comparison of props and state.
 *
 * Use PureComponent when your component renders the same output given
 * the same props and state, to get a performance boost by skipping
 * unnecessary re-renders.
 */
export class PureComponent<P = {}, S = {}> extends Component<P, S> {
  /**
   * Implements shouldComponentUpdate with shallow comparison
   *
   * Only re-renders if props or state have changed (shallow comparison)
   */
  shouldComponentUpdate(nextProps: Readonly<P>, nextState: Readonly<S>): boolean {
    return !shallowEqual(this.props, nextProps) || !shallowEqual(this.state, nextState)
  }
}
