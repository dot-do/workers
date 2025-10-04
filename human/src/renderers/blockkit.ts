/**
 * Slack BlockKit Renderer
 *
 * Converts React components to Slack BlockKit JSON format
 * Supports: Prompt, Form, Select, MultiSelect, TextInput, Button, Review
 */

import type { ReactElement } from 'react'
import type {
  Renderer,
  RenderContext,
  ChannelPayload,
  BlockKitPayload,
  FormData,
  PromptProps,
  FormProps,
  TextInputProps,
  SelectProps,
  MultiSelectProps,
  ButtonProps,
  ReviewProps,
  DegradationStrategy,
} from './base'

/**
 * BlockKit Block types
 */
interface BlockKitBlock {
  type: string
  [key: string]: any
}

interface SectionBlock extends BlockKitBlock {
  type: 'section'
  text?: {
    type: 'plain_text' | 'mrkdwn'
    text: string
  }
  accessory?: any
  fields?: Array<{ type: 'mrkdwn'; text: string }>
}

interface InputBlock extends BlockKitBlock {
  type: 'input'
  block_id: string
  label: {
    type: 'plain_text'
    text: string
  }
  element: any
  optional?: boolean
  hint?: {
    type: 'plain_text'
    text: string
  }
}

interface ActionsBlock extends BlockKitBlock {
  type: 'actions'
  elements: any[]
}

interface DividerBlock extends BlockKitBlock {
  type: 'divider'
}

interface ContextBlock extends BlockKitBlock {
  type: 'context'
  elements: Array<{
    type: 'plain_text' | 'mrkdwn'
    text: string
  }>
}

interface HeaderBlock extends BlockKitBlock {
  type: 'header'
  text: {
    type: 'plain_text'
    text: string
  }
}

/**
 * BlockKit Renderer Implementation
 */
export class BlockKitRenderer implements Renderer {
  channel = 'blockkit' as const
  degradationStrategy: DegradationStrategy = 'simplify'

  async renderPrompt(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const blocks: BlockKitBlock[] = []

    // Extract props and children
    const props = component.props as PromptProps
    const text = this.extractText(props.children)

    // Add icon/type indicator
    const icon = this.getTypeIcon(props.type)
    const formattedText = icon ? `${icon} ${text}` : text

    // Create section block
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: formattedText,
      },
    } as SectionBlock)

    return {
      blocks,
      response_type: 'ephemeral',
    } as BlockKitPayload
  }

  async renderForm(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const blocks: BlockKitBlock[] = []
    const props = component.props as FormProps

    // Extract form children
    const children = Array.isArray(props.children) ? props.children : [props.children]

    for (const child of children) {
      if (!child || typeof child !== 'object') continue

      const childElement = child as ReactElement
      const componentName = (childElement.type as any).displayName || (childElement.type as any).name

      switch (componentName) {
        case 'Prompt':
          blocks.push(...(await this.renderPromptBlock(childElement)))
          break
        case 'TextInput':
          blocks.push(...(await this.renderTextInputBlock(childElement)))
          break
        case 'Select':
          blocks.push(...(await this.renderSelectBlock(childElement)))
          break
        case 'MultiSelect':
          blocks.push(...(await this.renderMultiSelectBlock(childElement)))
          break
        case 'Button':
          // Buttons go in actions block at end
          break
      }
    }

    // Add buttons at end
    const buttons = children.filter((c) => {
      if (!c || typeof c !== 'object') return false
      const ce = c as ReactElement
      const name = (ce.type as any).displayName || (ce.type as any).name
      return name === 'Button'
    })

    if (buttons.length > 0) {
      blocks.push(await this.renderButtonsBlock(buttons as ReactElement[]))
    }

    return {
      blocks,
      response_type: 'ephemeral',
    } as BlockKitPayload
  }

  async renderReview(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const blocks: BlockKitBlock[] = []
    const props = component.props as ReviewProps

    // Add header if provided
    if (props.title) {
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: props.title,
        },
      } as HeaderBlock)
    }

    // Add divider
    blocks.push({ type: 'divider' } as DividerBlock)

    // Add review items as fields
    const fields = props.items.map((item) => ({
      type: 'mrkdwn' as const,
      text: `*${item.label}*\n${this.formatValue(item.value, item.format)}`,
    }))

    // Split fields into groups of 2 (BlockKit limit)
    for (let i = 0; i < fields.length; i += 2) {
      blocks.push({
        type: 'section',
        fields: fields.slice(i, i + 2),
      } as SectionBlock)
    }

    // Add divider
    blocks.push({ type: 'divider' } as DividerBlock)

    return {
      blocks,
      response_type: 'ephemeral',
    } as BlockKitPayload
  }

  async parseResponse(payload: any): Promise<FormData> {
    const fields: Record<string, any> = {}

    // BlockKit sends form data in state.values
    if (payload.state && payload.state.values) {
      for (const [blockId, block] of Object.entries(payload.state.values)) {
        for (const [actionId, action] of Object.entries(block as any)) {
          const value = this.extractActionValue(action)
          fields[actionId] = value
        }
      }
    }

    // Extract action from actions payload
    let action: string | undefined
    if (payload.actions && payload.actions[0]) {
      action = payload.actions[0].action_id
    }

    return {
      fields,
      action,
      timestamp: new Date().toISOString(),
      channel: 'blockkit',
    }
  }

  supports(component: ReactElement): boolean {
    const componentName = (component.type as any).displayName || (component.type as any).name
    const supported = ['Prompt', 'Form', 'TextInput', 'Select', 'MultiSelect', 'Button', 'Review']
    return supported.includes(componentName)
  }

  // ============================================================================
  // BLOCK RENDERERS
  // ============================================================================

  private async renderPromptBlock(component: ReactElement): Promise<BlockKitBlock[]> {
    const props = component.props as PromptProps
    const text = this.extractText(props.children)
    const icon = this.getTypeIcon(props.type)
    const formattedText = icon ? `${icon} ${text}` : text

    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: formattedText,
        },
      } as SectionBlock,
    ]
  }

  private async renderTextInputBlock(component: ReactElement): Promise<BlockKitBlock[]> {
    const props = component.props as TextInputProps

    return [
      {
        type: 'input',
        block_id: props.id || `input_${props.name}`,
        label: {
          type: 'plain_text',
          text: props.label,
        },
        element: {
          type: 'plain_text_input',
          action_id: props.name,
          placeholder: props.placeholder
            ? {
                type: 'plain_text',
                text: props.placeholder,
              }
            : undefined,
          initial_value: props.defaultValue,
          multiline: false,
        },
        optional: !props.required,
        hint: props.validation?.length
          ? {
              type: 'plain_text',
              text: props.validation[0].message,
            }
          : undefined,
      } as InputBlock,
    ]
  }

  private async renderSelectBlock(component: ReactElement): Promise<BlockKitBlock[]> {
    const props = component.props as SelectProps

    return [
      {
        type: 'input',
        block_id: props.id || `select_${props.name}`,
        label: {
          type: 'plain_text',
          text: props.label,
        },
        element: {
          type: 'static_select',
          action_id: props.name,
          placeholder: props.placeholder
            ? {
                type: 'plain_text',
                text: props.placeholder,
              }
            : undefined,
          options: props.options.map((opt) => ({
            text: {
              type: 'plain_text',
              text: opt.label,
            },
            value: opt.value,
            description: opt.description
              ? {
                  type: 'plain_text',
                  text: opt.description,
                }
              : undefined,
          })),
        },
        optional: !props.required,
      } as InputBlock,
    ]
  }

  private async renderMultiSelectBlock(component: ReactElement): Promise<BlockKitBlock[]> {
    const props = component.props as MultiSelectProps

    return [
      {
        type: 'input',
        block_id: props.id || `multiselect_${props.name}`,
        label: {
          type: 'plain_text',
          text: props.label,
        },
        element: {
          type: 'multi_static_select',
          action_id: props.name,
          placeholder: props.placeholder
            ? {
                type: 'plain_text',
                text: props.placeholder,
              }
            : undefined,
          options: props.options.map((opt) => ({
            text: {
              type: 'plain_text',
              text: opt.label,
            },
            value: opt.value,
          })),
          max_selected_items: props.maxSelected,
        },
        optional: !props.required,
      } as InputBlock,
    ]
  }

  private async renderButtonsBlock(buttons: ReactElement[]): Promise<BlockKitBlock> {
    const elements = buttons.map((button) => {
      const props = button.props as ButtonProps
      const text = this.extractText(props.children)

      return {
        type: 'button',
        action_id: props.id || text.toLowerCase().replace(/\s+/g, '_'),
        text: {
          type: 'plain_text',
          text,
        },
        value: text,
        style: this.mapButtonStyle(props.variant),
      }
    })

    return {
      type: 'actions',
      elements,
    } as ActionsBlock
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
        return ':information_source:'
      case 'warning':
        return ':warning:'
      case 'error':
        return ':x:'
      case 'success':
        return ':white_check_mark:'
      default:
        return ''
    }
  }

  private mapButtonStyle(variant?: string): string | undefined {
    switch (variant) {
      case 'primary':
        return 'primary'
      case 'danger':
        return 'danger'
      default:
        return undefined
    }
  }

  private formatValue(value: any, format?: string): string {
    if (value == null) return 'N/A'

    switch (format) {
      case 'currency':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      case 'date':
        return new Date(value).toLocaleDateString()
      case 'boolean':
        return value ? 'Yes' : 'No'
      default:
        return String(value)
    }
  }

  private extractActionValue(action: any): any {
    if (action.selected_option) {
      return action.selected_option.value
    }
    if (action.selected_options) {
      return action.selected_options.map((opt: any) => opt.value)
    }
    if (action.value !== undefined) {
      return action.value
    }
    return null
  }
}
