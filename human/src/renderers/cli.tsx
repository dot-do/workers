/**
 * CLI Renderer (react-ink)
 *
 * Converts React components to terminal output
 * Uses react-ink for rich terminal UIs
 * Supports: All components with terminal styling
 */

import type { ReactElement } from 'react'
import type {
  Renderer,
  RenderContext,
  ChannelPayload,
  CLIPayload,
  FormData,
  PromptProps,
  FormProps,
  TextInputProps,
  SelectProps,
  MultiSelectProps,
  ButtonProps,
  ReviewProps,
} from './base'

/**
 * ANSI color codes
 */
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
}

/**
 * CLI Renderer Implementation
 */
export class CLIRenderer implements Renderer {
  channel = 'cli' as const
  private width = 80 // Terminal width

  setWidth(width: number) {
    this.width = width
  }

  async renderPrompt(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const props = component.props as PromptProps
    const text = this.extractText(props.children)

    const icon = this.getTypeIcon(props.type)
    const color = this.getTypeColor(props.type)

    const output = `${color}${icon} ${text}${colors.reset}\n`

    return {
      output,
      cursor: 'hide',
    } as CLIPayload
  }

  async renderForm(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const props = component.props as FormProps
    const children = Array.isArray(props.children) ? props.children : [props.children]

    let output = ''

    // Render form header
    output += `${colors.bold}Form${colors.reset}\n`
    output += this.hr()

    for (const child of children) {
      if (!child || typeof child !== 'object') continue

      const childElement = child as ReactElement
      const componentName = (childElement.type as any).displayName || (childElement.type as any).name

      switch (componentName) {
        case 'Prompt':
          output += await this.renderPromptText(childElement)
          break
        case 'TextInput':
          output += await this.renderTextInputText(childElement)
          break
        case 'Select':
          output += await this.renderSelectText(childElement)
          break
        case 'MultiSelect':
          output += await this.renderMultiSelectText(childElement)
          break
        case 'Button':
          output += await this.renderButtonText(childElement)
          break
      }

      output += '\n'
    }

    return {
      output,
      cursor: 'show',
      clearScreen: true,
    } as CLIPayload
  }

  async renderReview(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const props = component.props as ReviewProps
    let output = ''

    // Header
    if (props.title) {
      output += `${colors.bold}${colors.cyan}${props.title}${colors.reset}\n`
      output += this.hr()
    }

    // Items
    const maxLabelWidth = Math.max(...props.items.map((item) => item.label.length))

    for (const item of props.items) {
      const label = item.label.padEnd(maxLabelWidth)
      const value = this.formatValue(item.value, item.format)
      output += `${colors.gray}${label}${colors.reset}  ${colors.white}${value}${colors.reset}\n`
    }

    output += this.hr()

    return {
      output,
      cursor: 'hide',
    } as CLIPayload
  }

  async parseResponse(payload: any): Promise<FormData> {
    const fields: Record<string, any> = {}

    // CLI responses are typically key-value pairs
    if (typeof payload === 'object') {
      Object.assign(fields, payload)
    } else if (typeof payload === 'string') {
      // Parse "key=value" format
      const lines = payload.split('\n')
      for (const line of lines) {
        const [key, ...valueParts] = line.split('=')
        if (key && valueParts.length > 0) {
          fields[key.trim()] = valueParts.join('=').trim()
        }
      }
    }

    return {
      fields,
      timestamp: new Date().toISOString(),
      channel: 'cli',
    }
  }

  supports(component: ReactElement): boolean {
    const componentName = (component.type as any).displayName || (component.type as any).name
    const supported = ['Prompt', 'Form', 'TextInput', 'Select', 'MultiSelect', 'Button', 'Review']
    return supported.includes(componentName)
  }

  // ============================================================================
  // TEXT RENDERERS
  // ============================================================================

  private async renderPromptText(component: ReactElement): Promise<string> {
    const props = component.props as PromptProps
    const text = this.extractText(props.children)
    const icon = this.getTypeIcon(props.type)
    const color = this.getTypeColor(props.type)

    return `${color}${icon} ${text}${colors.reset}\n`
  }

  private async renderTextInputText(component: ReactElement): Promise<string> {
    const props = component.props as TextInputProps

    let output = `${colors.cyan}${props.label}${props.required ? colors.red + ' *' : ''}${colors.reset}\n`

    if (props.placeholder) {
      output += `${colors.dim}(${props.placeholder})${colors.reset}\n`
    }

    output += `${colors.white}> ${colors.reset}`

    if (props.validation?.length) {
      output += `\n${colors.gray}${props.validation[0].message}${colors.reset}`
    }

    return output + '\n'
  }

  private async renderSelectText(component: ReactElement): Promise<string> {
    const props = component.props as SelectProps

    let output = `${colors.cyan}${props.label}${props.required ? colors.red + ' *' : ''}${colors.reset}\n`

    for (let i = 0; i < props.options.length; i++) {
      const option = props.options[i]
      output += `${colors.white}${i + 1}.${colors.reset} ${option.label}`

      if (option.description) {
        output += `${colors.gray} - ${option.description}${colors.reset}`
      }

      output += '\n'
    }

    output += `${colors.white}> ${colors.reset}`

    return output + '\n'
  }

  private async renderMultiSelectText(component: ReactElement): Promise<string> {
    const props = component.props as MultiSelectProps

    let output = `${colors.cyan}${props.label}${props.required ? colors.red + ' *' : ''}${colors.reset}\n`
    output += `${colors.gray}(Select multiple, separate with commas)${colors.reset}\n`

    for (let i = 0; i < props.options.length; i++) {
      const option = props.options[i]
      output += `${colors.white}${i + 1}.${colors.reset} ${option.label}`

      if (option.description) {
        output += `${colors.gray} - ${option.description}${colors.reset}`
      }

      output += '\n'
    }

    output += `${colors.white}> ${colors.reset}`

    return output + '\n'
  }

  private async renderButtonText(component: ReactElement): Promise<string> {
    const props = component.props as ButtonProps
    const text = this.extractText(props.children)

    const color = props.variant === 'danger' ? colors.bgRed : props.variant === 'secondary' ? colors.bgBlue : colors.bgGreen

    return `\n${color}${colors.bold} ${text} ${colors.reset}\n`
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private extractText(children: any): string {
    if (typeof children === 'string') return children
    if (typeof children === 'number') return children.toString()
    if (Array.isArray(children)) {
      return children.map((c) => this.extractText(c)).join('')
    }
    if (children && typeof children === 'object' && children.props) {
      return this.extractText(children.props.children)
    }
    return ''
  }

  private getTypeIcon(type?: string): string {
    switch (type) {
      case 'info':
        return 'ℹ'
      case 'warning':
        return '⚠'
      case 'error':
        return '✖'
      case 'success':
        return '✔'
      default:
        return '●'
    }
  }

  private getTypeColor(type?: string): string {
    switch (type) {
      case 'info':
        return colors.blue
      case 'warning':
        return colors.yellow
      case 'error':
        return colors.red
      case 'success':
        return colors.green
      default:
        return colors.cyan
    }
  }

  private hr(): string {
    return `${colors.gray}${'─'.repeat(this.width)}${colors.reset}\n`
  }

  private formatValue(value: any, format?: string): string {
    if (value == null) return 'N/A'

    switch (format) {
      case 'currency':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      case 'date':
        return new Date(value).toLocaleDateString()
      case 'boolean':
        return value ? `${colors.green}Yes${colors.reset}` : `${colors.red}No${colors.reset}`
      default:
        return String(value)
    }
  }
}
