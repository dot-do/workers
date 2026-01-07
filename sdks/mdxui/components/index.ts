/**
 * mdxui/components - Individual MDX components
 *
 * @example
 * ```tsx
 * import { CodeBlock, Playground, Callout, Tabs, Steps } from 'mdxui/components'
 * ```
 */

export {
  CodeBlock,
  Playground,
  Callout,
  Tabs,
  type CodeBlockProps,
  type PlaygroundProps,
  type CalloutProps,
  type TabsProps,
} from '../index'

// Additional components for documentation

import type { ComponentType, ReactNode } from 'react'

export interface StepsProps {
  /** Step items */
  children: ReactNode
}

export interface StepProps {
  /** Step title */
  title: string
  /** Step content */
  children: ReactNode
}

export interface FileTreeProps {
  /** File tree structure */
  children: ReactNode
}

export interface CardProps {
  /** Card title */
  title: string
  /** Card description */
  description?: string
  /** Link URL */
  href?: string
  /** Icon */
  icon?: ReactNode
  /** Card content */
  children?: ReactNode
}

export interface CardsProps {
  /** Card items */
  children: ReactNode
  /** Number of columns */
  columns?: 1 | 2 | 3 | 4
}

// Placeholder implementations
export const Steps: ComponentType<StepsProps> = ({ children }) => null as any
export const Step: ComponentType<StepProps> = ({ title, children }) => null as any
export const FileTree: ComponentType<FileTreeProps> = ({ children }) => null as any
export const Card: ComponentType<CardProps> = ({ title, description, href, icon, children }) => null as any
export const Cards: ComponentType<CardsProps> = ({ children, columns }) => null as any
