/**
 * mdxui - Enhanced MDX rendering and components
 *
 * A React component library for rich MDX documentation experiences.
 *
 * @example
 * ```tsx
 * import { MDXProvider, components } from 'mdxui'
 *
 * function App({ children }) {
 *   return (
 *     <MDXProvider components={components}>
 *       {children}
 *     </MDXProvider>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Use individual components
 * import { CodeBlock, Playground, Callout } from 'mdxui/components'
 *
 * <CodeBlock language="typescript" showLineNumbers>
 *   {code}
 * </CodeBlock>
 * ```
 */

import type { ComponentType, ReactNode } from 'react'

// Re-export from @mdx-js/react
export { MDXProvider, useMDXComponents } from '@mdx-js/react'

// Types
export interface MDXComponents {
  [key: string]: ComponentType<any>
}

export interface CodeBlockProps {
  /** Code content */
  children: string
  /** Programming language */
  language?: string
  /** Show line numbers */
  showLineNumbers?: boolean
  /** Lines to highlight (e.g., "1,3-5") */
  highlight?: string
  /** Filename to display */
  filename?: string
  /** Show copy button */
  showCopyButton?: boolean
}

export interface PlaygroundProps {
  /** Initial code */
  code: string
  /** Language for syntax highlighting */
  language?: string
  /** Whether code is editable */
  editable?: boolean
  /** Render preview of the code */
  preview?: boolean
  /** Scope for live execution */
  scope?: Record<string, any>
}

export interface CalloutProps {
  /** Callout type */
  type?: 'info' | 'warning' | 'error' | 'tip' | 'note'
  /** Title */
  title?: string
  /** Content */
  children: ReactNode
}

export interface TabsProps {
  /** Tab items */
  items: string[]
  /** Default active tab */
  defaultValue?: string
  /** Tab content */
  children: ReactNode
}

// Placeholder components (to be implemented)
export const CodeBlock: ComponentType<CodeBlockProps> = ({ children, language, showLineNumbers }) => {
  // Placeholder - full implementation will include syntax highlighting
  return null as any
}

export const Playground: ComponentType<PlaygroundProps> = ({ code, language, editable }) => {
  // Placeholder - full implementation will include live code editing
  return null as any
}

export const Callout: ComponentType<CalloutProps> = ({ type, title, children }) => {
  // Placeholder - full implementation will include styled callouts
  return null as any
}

export const Tabs: ComponentType<TabsProps> = ({ items, defaultValue, children }) => {
  // Placeholder - full implementation will include tab switching
  return null as any
}

/**
 * Default MDX components for documentation
 */
export const components: MDXComponents = {
  code: CodeBlock,
  pre: ({ children }) => children, // Let CodeBlock handle rendering
  Playground,
  Callout,
  Tabs,
}

/**
 * Create custom MDX components with your theme
 */
export function createComponents(overrides: Partial<MDXComponents> = {}): MDXComponents {
  return {
    ...components,
    ...overrides,
  }
}

// Export component types
export type { ComponentType, ReactNode }
