/**
 * mdxui/playground - Interactive code playground components
 *
 * Provides live code editing and preview capabilities for documentation.
 *
 * @example
 * ```tsx
 * import { LiveProvider, LiveEditor, LivePreview, LiveError } from 'mdxui/playground'
 *
 * function CodePlayground({ code }) {
 *   return (
 *     <LiveProvider code={code} scope={{ React }}>
 *       <LiveEditor />
 *       <LivePreview />
 *       <LiveError />
 *     </LiveProvider>
 *   )
 * }
 * ```
 */

import type { ComponentType, ReactNode } from 'react'

export interface LiveProviderProps {
  /** Initial code */
  code: string
  /** Scope for code execution (available variables) */
  scope?: Record<string, any>
  /** Disable live updates */
  disabled?: boolean
  /** Language for syntax highlighting */
  language?: string
  /** Theme for editor */
  theme?: any
  /** Children */
  children: ReactNode
}

export interface LiveEditorProps {
  /** Custom className */
  className?: string
  /** Placeholder text */
  placeholder?: string
  /** Read-only mode */
  readOnly?: boolean
}

export interface LivePreviewProps {
  /** Custom className */
  className?: string
  /** Component wrapper */
  Component?: ComponentType<any>
}

export interface LiveErrorProps {
  /** Custom className */
  className?: string
}

// Placeholder implementations - will be connected to actual live-code library
export const LiveProvider: ComponentType<LiveProviderProps> = ({ children }) => null as any
export const LiveEditor: ComponentType<LiveEditorProps> = () => null as any
export const LivePreview: ComponentType<LivePreviewProps> = () => null as any
export const LiveError: ComponentType<LiveErrorProps> = () => null as any

/**
 * Hook to access live playground context
 */
export function useLiveContext(): {
  code: string
  error: Error | null
  onChange: (code: string) => void
} {
  // Placeholder - will use React context in full implementation
  return {
    code: '',
    error: null,
    onChange: () => {},
  }
}

/**
 * Transform code before execution
 */
export type CodeTransformer = (code: string) => string

/**
 * Create a playground with custom transformers
 */
export function createPlayground(options: {
  transformers?: CodeTransformer[]
  defaultScope?: Record<string, any>
}) {
  // Placeholder - factory for customized playgrounds
  return {
    LiveProvider,
    LiveEditor,
    LivePreview,
    LiveError,
  }
}
