/**
 * @dotdo/react-compat/dom
 *
 * react-dom replacement using hono/jsx/dom
 */

export { render, flushSync, createPortal } from 'hono/jsx/dom'

// React 18 createRoot API - implement wrapper around hono's render
export function createRoot(container: HTMLElement) {
  return {
    render(element: JSX.Element) {
      // Import dynamically to avoid circular dependency
      const { render } = require('hono/jsx/dom')
      render(element, container)
    },
    unmount() {
      container.innerHTML = ''
    },
  }
}

// Hydration for SSR
export function hydrateRoot(container: HTMLElement, element: JSX.Element) {
  const { render } = require('hono/jsx/dom')
  // Hono's render handles hydration automatically
  render(element, container)
  return {
    render(newElement: JSX.Element) {
      render(newElement, container)
    },
    unmount() {
      container.innerHTML = ''
    },
  }
}

// Client entry point (react-dom/client compatibility)
export const client = {
  createRoot,
  hydrateRoot,
}

export default {
  render: require('hono/jsx/dom').render,
  createRoot,
  hydrateRoot,
  createPortal: require('hono/jsx/dom').createPortal,
  flushSync: require('hono/jsx/dom').flushSync,
}
