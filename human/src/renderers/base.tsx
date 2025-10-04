/**
 * Base types and interfaces for universal React renderers
 *
 * Enables rendering React components to multiple channels:
 * - Slack BlockKit
 * - Web (HTML/Next.js)
 * - Voice (VAPI scripts)
 * - CLI (react-ink)
 */

import type { ReactElement, ReactNode } from 'react'

/**
 * Supported rendering channels
 */
export type Channel = 'blockkit' | 'web' | 'voice' | 'cli'

/**
 * Channel-specific payload types
 */
export interface BlockKitPayload {
  blocks: any[]
  attachments?: any[]
  response_type?: 'in_channel' | 'ephemeral'
}

export interface WebPayload {
  html: string
  css?: string
  metadata?: {
    title?: string
    description?: string
  }
}

export interface VoicePayload {
  script: string
  prompts: VoicePrompt[]
  responses: VoiceResponse[]
}

export interface VoicePrompt {
  text: string
  voice?: string
  speed?: number
  pause?: number
}

export interface VoiceResponse {
  type: 'dtmf' | 'speech' | 'silence'
  expected?: string[]
  timeout?: number
}

export interface CLIPayload {
  output: string
  cursor?: 'show' | 'hide'
  clearScreen?: boolean
}

export type ChannelPayload = BlockKitPayload | WebPayload | VoicePayload | CLIPayload

/**
 * Rendering context - shared state across all channels
 */
export interface RenderContext {
  channel: Channel
  theme?: 'light' | 'dark'
  locale?: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

/**
 * Form data submitted by user
 */
export interface FormData {
  fields: Record<string, any>
  action?: string
  timestamp: string
  channel: Channel
}

/**
 * Base renderer interface - all renderers must implement this
 */
export interface Renderer {
  channel: Channel

  /**
   * Render a prompt (display-only, no input)
   */
  renderPrompt(component: ReactElement, context: RenderContext): Promise<ChannelPayload>

  /**
   * Render a form (with input fields)
   */
  renderForm(component: ReactElement, context: RenderContext): Promise<ChannelPayload>

  /**
   * Render a review (display previous input/output)
   */
  renderReview(component: ReactElement, context: RenderContext): Promise<ChannelPayload>

  /**
   * Parse response payload from channel
   */
  parseResponse(payload: any): Promise<FormData>

  /**
   * Validate that component is supported
   */
  supports(component: ReactElement): boolean
}

/**
 * Base component props - all components extend this
 */
export interface BaseComponentProps {
  id?: string
  className?: string
  style?: Record<string, any>
  testId?: string
}

/**
 * Prompt component props
 */
export interface PromptProps extends BaseComponentProps {
  children: ReactNode
  type?: 'info' | 'warning' | 'error' | 'success'
  icon?: string
}

/**
 * Form component props
 */
export interface FormProps extends BaseComponentProps {
  children: ReactNode
  onSubmit?: (data: FormData) => void | Promise<void>
  action?: string
  method?: 'get' | 'post'
}

/**
 * Input field base props
 */
export interface InputFieldProps extends BaseComponentProps {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  defaultValue?: any
  validation?: ValidationRule[]
}

/**
 * Text input props
 */
export interface TextInputProps extends InputFieldProps {
  type?: 'text' | 'email' | 'url' | 'tel' | 'number'
  minLength?: number
  maxLength?: number
  pattern?: string
}

/**
 * Select input props
 */
export interface SelectProps extends InputFieldProps {
  options: SelectOption[]
  multiple?: boolean
}

export interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: string
}

/**
 * Multi-select input props
 */
export interface MultiSelectProps extends InputFieldProps {
  options: SelectOption[]
  minSelected?: number
  maxSelected?: number
}

/**
 * Button props
 */
export interface ButtonProps extends BaseComponentProps {
  children: ReactNode
  type?: 'submit' | 'button' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void | Promise<void>
}

/**
 * Review component props
 */
export interface ReviewProps extends BaseComponentProps {
  children: ReactNode
  title?: string
  items: ReviewItem[]
}

export interface ReviewItem {
  label: string
  value: any
  format?: 'text' | 'number' | 'currency' | 'date' | 'boolean'
}

/**
 * Validation rule
 */
export interface ValidationRule {
  type: 'required' | 'email' | 'url' | 'pattern' | 'min' | 'max' | 'length'
  message: string
  value?: any
}

/**
 * Graceful degradation strategy
 *
 * When a component can't be fully rendered in a channel,
 * how should it degrade?
 */
export type DegradationStrategy =
  | 'hide'           // Don't render at all
  | 'simplify'       // Render as simpler component (e.g., Select → TextInput)
  | 'text'           // Render as plain text
  | 'error'          // Throw error

/**
 * Accessibility options
 */
export interface AccessibilityOptions {
  ariaLabel?: string
  ariaDescribedBy?: string
  role?: string
  tabIndex?: number
}

/**
 * Theme configuration
 */
export interface Theme {
  mode: 'light' | 'dark'
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
    info: string
    text: string
    background: string
    border: string
  }
  fonts: {
    body: string
    heading: string
    mono: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
}

/**
 * Default theme (light mode)
 */
export const defaultTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#0066cc',
    secondary: '#6c757d',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
    text: '#212529',
    background: '#ffffff',
    border: '#dee2e6',
  },
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'Menlo, Monaco, "Courier New", monospace',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
}

/**
 * Dark theme
 */
export const darkTheme: Theme = {
  ...defaultTheme,
  mode: 'dark',
  colors: {
    primary: '#4da6ff',
    secondary: '#adb5bd',
    success: '#5cb85c',
    warning: '#f0ad4e',
    error: '#d9534f',
    info: '#5bc0de',
    text: '#f8f9fa',
    background: '#212529',
    border: '#495057',
  },
}

/**
 * Renderer registry - map channel to renderer instance
 */
export class RendererRegistry {
  private renderers = new Map<Channel, Renderer>()

  register(channel: Channel, renderer: Renderer) {
    this.renderers.set(channel, renderer)
  }

  get(channel: Channel): Renderer | undefined {
    return this.renderers.get(channel)
  }

  has(channel: Channel): boolean {
    return this.renderers.has(channel)
  }

  list(): Channel[] {
    return Array.from(this.renderers.keys())
  }
}

/**
 * Global renderer registry
 */
export const renderers = new RendererRegistry()

/**
 * Render a component to a specific channel
 */
export async function render(
  component: ReactElement,
  channel: Channel,
  context: Partial<RenderContext> = {}
): Promise<ChannelPayload> {
  const renderer = renderers.get(channel)
  if (!renderer) {
    throw new Error(`No renderer registered for channel: ${channel}`)
  }

  const fullContext: RenderContext = {
    channel,
    theme: 'light',
    ...context,
  }

  // Determine render method based on component type
  const componentName = (component.type as any).displayName || (component.type as any).name

  if (componentName === 'Form') {
    return renderer.renderForm(component, fullContext)
  } else if (componentName === 'Review') {
    return renderer.renderReview(component, fullContext)
  } else {
    return renderer.renderPrompt(component, fullContext)
  }
}

/**
 * Parse response from a specific channel
 */
export async function parseResponse(
  payload: any,
  channel: Channel
): Promise<FormData> {
  const renderer = renderers.get(channel)
  if (!renderer) {
    throw new Error(`No renderer registered for channel: ${channel}`)
  }

  return renderer.parseResponse(payload)
}
