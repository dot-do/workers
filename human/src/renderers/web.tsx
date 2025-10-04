/**
 * Web Renderer (HTML/Next.js)
 *
 * Converts React components to HTML with CSS
 * Supports: All components with full styling
 */

import type { ReactElement } from 'react'
import type {
  Renderer,
  RenderContext,
  ChannelPayload,
  WebPayload,
  FormData,
  PromptProps,
  FormProps,
  TextInputProps,
  SelectProps,
  MultiSelectProps,
  ButtonProps,
  ReviewProps,
  Theme,
} from './base'
import { defaultTheme, darkTheme } from './base'

/**
 * Web Renderer Implementation
 */
export class WebRenderer implements Renderer {
  channel = 'web' as const
  private theme: Theme = defaultTheme

  setTheme(theme: Theme | 'light' | 'dark') {
    if (typeof theme === 'string') {
      this.theme = theme === 'dark' ? darkTheme : defaultTheme
    } else {
      this.theme = theme
    }
  }

  async renderPrompt(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const props = component.props as PromptProps
    const text = this.extractText(props.children)

    const html = `
      <div class="prompt prompt-${props.type || 'info'}" ${props.id ? `id="${props.id}"` : ''}>
        ${props.icon ? `<span class="prompt-icon">${props.icon}</span>` : ''}
        <div class="prompt-text">${this.escapeHtml(text)}</div>
      </div>
    `

    const css = this.generatePromptCSS(props.type)

    return {
      html: html.trim(),
      css,
    } as WebPayload
  }

  async renderForm(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const props = component.props as FormProps
    const children = Array.isArray(props.children) ? props.children : [props.children]

    let html = `<form class="universal-form" ${props.id ? `id="${props.id}"` : ''} ${props.action ? `action="${props.action}"` : ''} method="${props.method || 'post'}">`

    for (const child of children) {
      if (!child || typeof child !== 'object') continue

      const childElement = child as ReactElement
      const componentName = (childElement.type as any).displayName || (childElement.type as any).name

      switch (componentName) {
        case 'Prompt':
          html += await this.renderPromptHTML(childElement)
          break
        case 'TextInput':
          html += await this.renderTextInputHTML(childElement)
          break
        case 'Select':
          html += await this.renderSelectHTML(childElement)
          break
        case 'MultiSelect':
          html += await this.renderMultiSelectHTML(childElement)
          break
        case 'Button':
          html += await this.renderButtonHTML(childElement)
          break
      }
    }

    html += '</form>'

    const css = this.generateFormCSS()

    return {
      html: html.trim(),
      css,
      metadata: {
        title: 'Form',
      },
    } as WebPayload
  }

  async renderReview(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const props = component.props as ReviewProps

    let html = `<div class="review" ${props.id ? `id="${props.id}"` : ''}>`

    if (props.title) {
      html += `<h2 class="review-title">${this.escapeHtml(props.title)}</h2>`
    }

    html += '<dl class="review-list">'

    for (const item of props.items) {
      html += `
        <div class="review-item">
          <dt class="review-label">${this.escapeHtml(item.label)}</dt>
          <dd class="review-value">${this.escapeHtml(this.formatValue(item.value, item.format))}</dd>
        </div>
      `
    }

    html += '</dl></div>'

    const css = this.generateReviewCSS()

    return {
      html: html.trim(),
      css,
    } as WebPayload
  }

  async parseResponse(payload: any): Promise<FormData> {
    const fields: Record<string, any> = {}

    // Parse form data from HTTP POST
    if (payload instanceof FormData) {
      for (const [key, value] of payload.entries()) {
        fields[key] = value
      }
    } else if (typeof payload === 'object') {
      Object.assign(fields, payload)
    }

    return {
      fields,
      timestamp: new Date().toISOString(),
      channel: 'web',
    }
  }

  supports(component: ReactElement): boolean {
    const componentName = (component.type as any).displayName || (component.type as any).name
    const supported = ['Prompt', 'Form', 'TextInput', 'Select', 'MultiSelect', 'Button', 'Review']
    return supported.includes(componentName)
  }

  // ============================================================================
  // HTML RENDERERS
  // ============================================================================

  private async renderPromptHTML(component: ReactElement): Promise<string> {
    const props = component.props as PromptProps
    const text = this.extractText(props.children)

    return `
      <div class="form-prompt prompt-${props.type || 'info'}">
        ${props.icon ? `<span class="prompt-icon">${props.icon}</span>` : ''}
        <div class="prompt-text">${this.escapeHtml(text)}</div>
      </div>
    `
  }

  private async renderTextInputHTML(component: ReactElement): Promise<string> {
    const props = component.props as TextInputProps

    return `
      <div class="form-field" ${props.id ? `id="${props.id}-wrapper"` : ''}>
        <label for="${props.name}" class="form-label">
          ${this.escapeHtml(props.label)}
          ${props.required ? '<span class="required">*</span>' : ''}
        </label>
        <input
          type="${props.type || 'text'}"
          id="${props.name}"
          name="${props.name}"
          class="form-input"
          ${props.placeholder ? `placeholder="${this.escapeHtml(props.placeholder)}"` : ''}
          ${props.required ? 'required' : ''}
          ${props.disabled ? 'disabled' : ''}
          ${props.defaultValue ? `value="${this.escapeHtml(String(props.defaultValue))}"` : ''}
          ${props.minLength ? `minlength="${props.minLength}"` : ''}
          ${props.maxLength ? `maxlength="${props.maxLength}"` : ''}
          ${props.pattern ? `pattern="${this.escapeHtml(props.pattern)}"` : ''}
        />
        ${props.validation?.length ? `<div class="form-hint">${this.escapeHtml(props.validation[0].message)}</div>` : ''}
      </div>
    `
  }

  private async renderSelectHTML(component: ReactElement): Promise<string> {
    const props = component.props as SelectProps

    let html = `
      <div class="form-field" ${props.id ? `id="${props.id}-wrapper"` : ''}>
        <label for="${props.name}" class="form-label">
          ${this.escapeHtml(props.label)}
          ${props.required ? '<span class="required">*</span>' : ''}
        </label>
        <select
          id="${props.name}"
          name="${props.name}"
          class="form-select"
          ${props.required ? 'required' : ''}
          ${props.disabled ? 'disabled' : ''}
          ${props.multiple ? 'multiple' : ''}
        >
          ${props.placeholder ? `<option value="">${this.escapeHtml(props.placeholder)}</option>` : ''}
    `

    for (const option of props.options) {
      html += `
        <option value="${this.escapeHtml(option.value)}">
          ${this.escapeHtml(option.label)}
        </option>
      `
    }

    html += `
        </select>
        ${props.validation?.length ? `<div class="form-hint">${this.escapeHtml(props.validation[0].message)}</div>` : ''}
      </div>
    `

    return html
  }

  private async renderMultiSelectHTML(component: ReactElement): Promise<string> {
    const props = component.props as MultiSelectProps

    let html = `
      <div class="form-field" ${props.id ? `id="${props.id}-wrapper"` : ''}>
        <label class="form-label">
          ${this.escapeHtml(props.label)}
          ${props.required ? '<span class="required">*</span>' : ''}
        </label>
        <div class="multi-select">
    `

    for (const option of props.options) {
      const id = `${props.name}-${option.value}`
      html += `
        <label class="multi-select-option">
          <input
            type="checkbox"
            id="${id}"
            name="${props.name}"
            value="${this.escapeHtml(option.value)}"
            ${props.disabled ? 'disabled' : ''}
          />
          <span class="multi-select-label">${this.escapeHtml(option.label)}</span>
          ${option.description ? `<span class="multi-select-description">${this.escapeHtml(option.description)}</span>` : ''}
        </label>
      `
    }

    html += `
        </div>
        ${props.validation?.length ? `<div class="form-hint">${this.escapeHtml(props.validation[0].message)}</div>` : ''}
      </div>
    `

    return html
  }

  private async renderButtonHTML(component: ReactElement): Promise<string> {
    const props = component.props as ButtonProps
    const text = this.extractText(props.children)

    return `
      <button
        type="${props.type || 'button'}"
        class="form-button button-${props.variant || 'primary'} button-${props.size || 'md'}"
        ${props.id ? `id="${props.id}"` : ''}
        ${props.disabled ? 'disabled' : ''}
      >
        ${props.loading ? '<span class="button-spinner"></span>' : ''}
        <span class="button-text">${this.escapeHtml(text)}</span>
      </button>
    `
  }

  // ============================================================================
  // CSS GENERATORS
  // ============================================================================

  private generatePromptCSS(type?: string): string {
    const theme = this.theme
    const typeColor = type ? theme.colors[type as keyof typeof theme.colors] || theme.colors.info : theme.colors.info

    return `
      .prompt {
        padding: ${theme.spacing.md};
        border-radius: 8px;
        border-left: 4px solid ${typeColor};
        background: ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'};
        color: ${theme.colors.text};
        font-family: ${theme.fonts.body};
        margin-bottom: ${theme.spacing.md};
      }
      .prompt-icon {
        margin-right: ${theme.spacing.sm};
        font-size: 1.25em;
      }
      .prompt-text {
        display: inline;
      }
    `
  }

  private generateFormCSS(): string {
    const theme = this.theme

    return `
      .universal-form {
        max-width: 600px;
        font-family: ${theme.fonts.body};
        color: ${theme.colors.text};
      }
      .form-field {
        margin-bottom: ${theme.spacing.lg};
      }
      .form-label {
        display: block;
        margin-bottom: ${theme.spacing.sm};
        font-weight: 600;
        color: ${theme.colors.text};
      }
      .required {
        color: ${theme.colors.error};
      }
      .form-input,
      .form-select {
        width: 100%;
        padding: ${theme.spacing.sm} ${theme.spacing.md};
        border: 1px solid ${theme.colors.border};
        border-radius: 6px;
        background: ${theme.colors.background};
        color: ${theme.colors.text};
        font-family: ${theme.fonts.body};
        font-size: 1rem;
      }
      .form-input:focus,
      .form-select:focus {
        outline: none;
        border-color: ${theme.colors.primary};
        box-shadow: 0 0 0 3px ${theme.colors.primary}20;
      }
      .form-hint {
        margin-top: ${theme.spacing.xs};
        font-size: 0.875rem;
        color: ${theme.mode === 'dark' ? '#aaa' : '#666'};
      }
      .multi-select {
        border: 1px solid ${theme.colors.border};
        border-radius: 6px;
        padding: ${theme.spacing.sm};
      }
      .multi-select-option {
        display: flex;
        align-items: center;
        padding: ${theme.spacing.sm};
        cursor: pointer;
      }
      .multi-select-option:hover {
        background: ${theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'};
      }
      .form-button {
        padding: ${theme.spacing.sm} ${theme.spacing.lg};
        border: none;
        border-radius: 6px;
        font-family: ${theme.fonts.body};
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .button-primary {
        background: ${theme.colors.primary};
        color: white;
      }
      .button-primary:hover {
        opacity: 0.9;
      }
      .button-secondary {
        background: ${theme.colors.secondary};
        color: white;
      }
      .button-danger {
        background: ${theme.colors.error};
        color: white;
      }
    `
  }

  private generateReviewCSS(): string {
    const theme = this.theme

    return `
      .review {
        font-family: ${theme.fonts.body};
        color: ${theme.colors.text};
      }
      .review-title {
        font-size: 1.5rem;
        margin-bottom: ${theme.spacing.lg};
        color: ${theme.colors.text};
      }
      .review-list {
        display: grid;
        gap: ${theme.spacing.md};
      }
      .review-item {
        display: grid;
        grid-template-columns: 150px 1fr;
        gap: ${theme.spacing.md};
        padding: ${theme.spacing.md};
        border-bottom: 1px solid ${theme.colors.border};
      }
      .review-label {
        font-weight: 600;
        color: ${theme.mode === 'dark' ? '#aaa' : '#666'};
      }
      .review-value {
        margin: 0;
        color: ${theme.colors.text};
      }
    `
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

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return text.replace(/[&<>"']/g, (m) => map[m])
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
}
