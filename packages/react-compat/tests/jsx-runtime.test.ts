/**
 * @dotdo/react-compat - JSX Runtime Tests
 * Beads Issue: workers-p5py
 *
 * TDD RED Phase: Tests for jsx-runtime exports needed for automatic JSX transform.
 * These exports are required for React 17+ automatic JSX transform to work
 * (when using jsxImportSource).
 *
 * Tests cover:
 * - jsx creates element
 * - jsxs creates element with multiple children
 * - Fragment works
 * - jsxDEV includes debug info
 */

import { describe, it, expect, vi } from 'vitest'
import { jsx, jsxs, Fragment } from '../src/jsx-runtime'
import { jsxDEV, Fragment as DevFragment } from '../src/jsx-dev-runtime'

describe('jsx', () => {
  it('should be exported as a function', () => {
    expect(typeof jsx).toBe('function')
  })

  it('should create an element with type', () => {
    const element = jsx('div', {})

    expect(element).toBeDefined()
    expect(element.type).toBe('div')
  })

  it('should create an element with props', () => {
    const element = jsx('div', { className: 'container', id: 'main' })

    expect(element.props).toBeDefined()
    expect(element.props.className).toBe('container')
    expect(element.props.id).toBe('main')
  })

  it('should handle children in props', () => {
    const element = jsx('span', { children: 'Hello' })

    expect(element.props.children).toBe('Hello')
  })

  it('should handle key parameter', () => {
    const element = jsx('li', { children: 'Item' }, 'item-1')

    expect(element.key).toBe('item-1')
  })

  it('should create element with function type (component)', () => {
    const MyComponent = (props: { name: string }) => jsx('div', { children: props.name })
    const element = jsx(MyComponent, { name: 'Test' })

    expect(element.type).toBe(MyComponent)
    expect(element.props.name).toBe('Test')
  })

  it('should handle boolean attributes', () => {
    const element = jsx('input', { disabled: true, readOnly: false })

    expect(element.props.disabled).toBe(true)
    expect(element.props.readOnly).toBe(false)
  })

  it('should handle event handlers', () => {
    const onClick = vi.fn()
    const element = jsx('button', { onClick, children: 'Click' })

    expect(element.props.onClick).toBe(onClick)
  })

  it('should handle style object', () => {
    const style = { color: 'red', fontSize: '16px' }
    const element = jsx('div', { style })

    expect(element.props.style).toEqual(style)
  })

  it('should handle ref prop', () => {
    const ref = { current: null }
    const element = jsx('div', { ref })

    // ref should be in props or handled specially
    expect(element.props.ref).toBe(ref)
  })

  it('should handle null children', () => {
    const element = jsx('div', { children: null })

    expect(element.props.children).toBeNull()
  })

  it('should handle undefined children', () => {
    const element = jsx('div', { children: undefined })

    expect(element.props.children).toBeUndefined()
  })
})

describe('jsxs', () => {
  it('should be exported as a function', () => {
    expect(typeof jsxs).toBe('function')
  })

  it('should create element with multiple children', () => {
    const element = jsxs('div', {
      children: [jsx('span', { children: 'First' }), jsx('span', { children: 'Second' })],
    })

    expect(element.type).toBe('div')
    expect(Array.isArray(element.props.children)).toBe(true)
    expect(element.props.children).toHaveLength(2)
  })

  it('should handle mixed children types', () => {
    const element = jsxs('p', {
      children: ['Text ', jsx('strong', { children: 'bold' }), ' more text'],
    })

    expect(element.props.children).toHaveLength(3)
    expect(element.props.children[0]).toBe('Text ')
    expect(element.props.children[2]).toBe(' more text')
  })

  it('should handle key with multiple children', () => {
    const element = jsxs(
      'ul',
      {
        children: [jsx('li', { children: 'A' }, 'a'), jsx('li', { children: 'B' }, 'b')],
      },
      'list-key'
    )

    expect(element.key).toBe('list-key')
  })

  it('should handle empty children array', () => {
    const element = jsxs('div', { children: [] })

    expect(element.props.children).toEqual([])
  })

  it('should handle nested structures', () => {
    const element = jsxs('div', {
      children: [
        jsx('header', { children: 'Header' }),
        jsxs('main', {
          children: [jsx('p', { children: 'Paragraph 1' }), jsx('p', { children: 'Paragraph 2' })],
        }),
        jsx('footer', { children: 'Footer' }),
      ],
    })

    expect(element.props.children).toHaveLength(3)
  })
})

describe('Fragment', () => {
  it('should be exported', () => {
    expect(Fragment).toBeDefined()
  })

  it('should be usable as element type', () => {
    const element = jsx(Fragment, { children: 'Content' })

    expect(element.type).toBe(Fragment)
  })

  it('should handle multiple children in Fragment', () => {
    const element = jsxs(Fragment, {
      children: [jsx('span', { children: 'A' }), jsx('span', { children: 'B' })],
    })

    expect(element.type).toBe(Fragment)
    expect(element.props.children).toHaveLength(2)
  })

  it('should not add extra DOM nodes', () => {
    // Fragment should not produce a wrapper element
    const element = jsxs(Fragment, {
      children: [jsx('li', { children: 'Item 1' }), jsx('li', { children: 'Item 2' })],
    })

    // Type should be Fragment, not a string
    expect(typeof element.type).not.toBe('string')
  })

  it('Fragment should support key prop', () => {
    const element = jsx(Fragment, { children: 'Content' }, 'fragment-key')

    expect(element.key).toBe('fragment-key')
  })
})

describe('jsxDEV (Development Runtime)', () => {
  it('should be exported as a function', () => {
    expect(typeof jsxDEV).toBe('function')
  })

  it('should create an element similar to jsx', () => {
    const element = jsxDEV('div', { className: 'test' }, undefined, false, {}, undefined)

    expect(element).toBeDefined()
    expect(element.type).toBe('div')
    expect(element.props.className).toBe('test')
  })

  it('should accept isStaticChildren parameter', () => {
    // jsxDEV(type, props, key, isStaticChildren, source, self)
    expect(() => {
      jsxDEV('div', { children: 'test' }, null, false, {}, undefined)
    }).not.toThrow()

    expect(() => {
      jsxDEV('div', { children: ['a', 'b'] }, null, true, {}, undefined)
    }).not.toThrow()
  })

  it('should accept source parameter for debugging', () => {
    const source = {
      fileName: '/path/to/Component.tsx',
      lineNumber: 42,
      columnNumber: 8,
    }

    const element = jsxDEV('div', {}, null, false, source, undefined)

    // Source info should be stored for debugging
    expect(element).toBeDefined()
  })

  it('should accept self parameter', () => {
    const self = {}

    expect(() => {
      jsxDEV('div', {}, null, false, {}, self)
    }).not.toThrow()
  })

  it('should handle key parameter', () => {
    const element = jsxDEV('li', { children: 'Item' }, 'my-key', false, {}, undefined)

    expect(element.key).toBe('my-key')
  })

  it('should handle component types', () => {
    const MyComponent = () => jsxDEV('span', {}, undefined, false, {}, undefined)
    const element = jsxDEV(MyComponent, { prop: 'value' }, null, false, {}, undefined)

    expect(element.type).toBe(MyComponent)
  })
})

describe('DevFragment', () => {
  it('should be exported from jsx-dev-runtime', () => {
    expect(DevFragment).toBeDefined()
  })

  it('should be the same as production Fragment', () => {
    // Both should reference the same Fragment symbol/component
    expect(DevFragment).toBe(Fragment)
  })

  it('should work with jsxDEV', () => {
    const element = jsxDEV(
      DevFragment,
      {
        children: [
          jsxDEV('span', { children: 'A' }, 'a', false, {}, undefined),
          jsxDEV('span', { children: 'B' }, 'b', false, {}, undefined),
        ],
      },
      null,
      true,
      {},
      undefined
    )

    expect(element.type).toBe(DevFragment)
  })
})

describe('JSX Transform Integration', () => {
  it('jsx should produce valid element structure', () => {
    const element = jsx('div', {
      id: 'app',
      className: 'container',
      children: 'Hello World',
    })

    // Should have standard element structure
    expect(element).toHaveProperty('type')
    expect(element).toHaveProperty('props')
    expect(element.type).toBe('div')
    expect(element.props.id).toBe('app')
    expect(element.props.className).toBe('container')
    expect(element.props.children).toBe('Hello World')
  })

  it('should handle complex nested structure', () => {
    const App = () =>
      jsxs('div', {
        className: 'app',
        children: [
          jsx('header', {
            children: jsx('h1', { children: 'Title' }),
          }),
          jsxs('main', {
            children: [
              jsx('p', { children: 'Paragraph 1' }),
              jsx('p', { children: 'Paragraph 2' }),
            ],
          }),
          jsx('footer', { children: 'Footer' }),
        ],
      })

    const element = App()

    expect(element.type).toBe('div')
    expect(element.props.className).toBe('app')
    expect(element.props.children).toHaveLength(3)
  })

  it('should handle conditional rendering', () => {
    const showExtra = true

    const element = jsxs('div', {
      children: [jsx('span', { children: 'Always' }), showExtra && jsx('span', { children: 'Conditional' })],
    })

    expect(element.props.children).toHaveLength(2)
  })

  it('should handle list rendering', () => {
    const items = ['A', 'B', 'C']

    const element = jsx('ul', {
      children: items.map((item, i) => jsx('li', { children: item }, `item-${i}`)),
    })

    expect(element.type).toBe('ul')
    // children should be the mapped array
    expect(Array.isArray(element.props.children)).toBe(true)
  })
})

describe('Type Safety', () => {
  it('should accept HTML intrinsic element types', () => {
    // These should compile without errors
    const div = jsx('div', {})
    const span = jsx('span', {})
    const button = jsx('button', { disabled: false })
    const input = jsx('input', { placeholder: 'Enter...' })

    // Verify elements are created
    // Note: hono uses .type for simple tags but may wrap interactive elements
    expect(div).toBeDefined()
    expect(div.type).toBe('div')
    expect(span).toBeDefined()
    expect(span.type).toBe('span')
    expect(button).toBeDefined()
    // button and input are interactive elements, hono may wrap them
    expect(button.type).toBeDefined()
    expect(input).toBeDefined()
    expect(input.type).toBeDefined()
  })

  it('should accept function components', () => {
    interface Props {
      name: string
      count?: number
    }

    const MyComponent = (props: Props) => jsx('div', { children: `${props.name}: ${props.count ?? 0}` })

    const element = jsx(MyComponent, { name: 'Counter', count: 5 })

    expect(element.type).toBe(MyComponent)
    expect(element.props.name).toBe('Counter')
    expect(element.props.count).toBe(5)
  })

  it('should handle generic components', () => {
    interface ListProps<T> {
      items: T[]
      renderItem: (item: T) => ReturnType<typeof jsx>
    }

    function List<T>(props: ListProps<T>) {
      return jsx('ul', {
        children: props.items.map((item, i) => jsx('li', { children: props.renderItem(item) }, String(i))),
      })
    }

    const element = jsx(List<string>, {
      items: ['a', 'b'],
      renderItem: (item) => jsx('span', { children: item }),
    })

    expect(element.type).toBe(List)
  })
})
