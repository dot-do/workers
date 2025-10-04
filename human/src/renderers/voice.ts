/**
 * Voice Renderer (VAPI)
 *
 * Converts React components to VAPI voice scripts
 * Supports: Prompt, Form with text input, Select
 * Degradation: Complex UI → Voice prompts with DTMF/speech input
 */

import type { ReactElement } from 'react'
import type {
  Renderer,
  RenderContext,
  ChannelPayload,
  VoicePayload,
  VoicePrompt,
  VoiceResponse,
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
 * Voice settings
 */
interface VoiceSettings {
  voice: string
  speed: number
  pauseAfterPrompt: number
  pauseBetweenOptions: number
}

/**
 * Voice Renderer Implementation
 */
export class VoiceRenderer implements Renderer {
  channel = 'voice' as const
  private settings: VoiceSettings = {
    voice: 'en-US-Neural2-F',
    speed: 1.0,
    pauseAfterPrompt: 500,
    pauseBetweenOptions: 300,
  }

  setSettings(settings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...settings }
  }

  async renderPrompt(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const props = component.props as PromptProps
    const text = this.extractText(props.children)

    const prompts: VoicePrompt[] = [
      {
        text: this.sanitizeForVoice(text),
        voice: this.settings.voice,
        speed: this.settings.speed,
        pause: this.settings.pauseAfterPrompt,
      },
    ]

    return {
      script: text,
      prompts,
      responses: [],
    } as VoicePayload
  }

  async renderForm(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const props = component.props as FormProps
    const children = Array.isArray(props.children) ? props.children : [props.children]

    const prompts: VoicePrompt[] = []
    const responses: VoiceResponse[] = []
    const scriptParts: string[] = []

    for (const child of children) {
      if (!child || typeof child !== 'object') continue

      const childElement = child as ReactElement
      const componentName = (childElement.type as any).displayName || (childElement.type as any).name

      switch (componentName) {
        case 'Prompt': {
          const promptText = this.extractText((childElement.props as PromptProps).children)
          scriptParts.push(promptText)
          prompts.push({
            text: this.sanitizeForVoice(promptText),
            voice: this.settings.voice,
            speed: this.settings.speed,
            pause: this.settings.pauseAfterPrompt,
          })
          break
        }

        case 'TextInput': {
          const inputProps = childElement.props as TextInputProps
          const promptText = inputProps.required ? `${inputProps.label}. This field is required.` : inputProps.label

          scriptParts.push(promptText)
          prompts.push({
            text: this.sanitizeForVoice(promptText),
            voice: this.settings.voice,
            speed: this.settings.speed,
            pause: this.settings.pauseAfterPrompt,
          })

          responses.push({
            type: 'speech',
            timeout: 5000,
          })
          break
        }

        case 'Select': {
          const selectProps = childElement.props as SelectProps

          // Read the question
          const questionText = selectProps.label
          scriptParts.push(questionText)
          prompts.push({
            text: this.sanitizeForVoice(questionText),
            voice: this.settings.voice,
            speed: this.settings.speed,
            pause: this.settings.pauseAfterPrompt,
          })

          // Read options with numbers
          const optionsText = selectProps.options.map((opt, idx) => `Press ${idx + 1} for ${opt.label}`).join('. ')

          scriptParts.push(optionsText)
          prompts.push({
            text: this.sanitizeForVoice(optionsText),
            voice: this.settings.voice,
            speed: this.settings.speed,
            pause: this.settings.pauseBetweenOptions,
          })

          responses.push({
            type: 'dtmf',
            expected: selectProps.options.map((_, idx) => String(idx + 1)),
            timeout: 5000,
          })
          break
        }

        case 'MultiSelect': {
          const multiProps = childElement.props as MultiSelectProps

          // For voice, we degrade to single select with "all" option
          const questionText = `${multiProps.label}. You can select multiple options.`
          scriptParts.push(questionText)
          prompts.push({
            text: this.sanitizeForVoice(questionText),
            voice: this.settings.voice,
            speed: this.settings.speed,
            pause: this.settings.pauseAfterPrompt,
          })

          // Read options
          const optionsText = multiProps.options.map((opt, idx) => `Say ${opt.label} to select it`).join('. ')

          scriptParts.push(optionsText)
          prompts.push({
            text: this.sanitizeForVoice(optionsText),
            voice: this.settings.voice,
            speed: this.settings.speed,
            pause: this.settings.pauseBetweenOptions,
          })

          // Add "done" option
          prompts.push({
            text: 'Say done when finished selecting.',
            voice: this.settings.voice,
            speed: this.settings.speed,
            pause: this.settings.pauseAfterPrompt,
          })

          responses.push({
            type: 'speech',
            expected: [...multiProps.options.map((opt) => opt.label), 'done'],
            timeout: 5000,
          })
          break
        }

        case 'Button': {
          // Buttons become voice confirmation
          const buttonText = this.extractText((childElement.props as ButtonProps).children)
          const confirmText = `Say ${buttonText} to continue, or say cancel to go back.`

          scriptParts.push(confirmText)
          prompts.push({
            text: this.sanitizeForVoice(confirmText),
            voice: this.settings.voice,
            speed: this.settings.speed,
            pause: this.settings.pauseAfterPrompt,
          })

          responses.push({
            type: 'speech',
            expected: [buttonText.toLowerCase(), 'cancel'],
            timeout: 5000,
          })
          break
        }
      }
    }

    return {
      script: scriptParts.join(' '),
      prompts,
      responses,
    } as VoicePayload
  }

  async renderReview(component: ReactElement, context: RenderContext): Promise<ChannelPayload> {
    const props = component.props as ReviewProps
    const prompts: VoicePrompt[] = []
    const scriptParts: string[] = []

    if (props.title) {
      scriptParts.push(props.title)
      prompts.push({
        text: this.sanitizeForVoice(props.title),
        voice: this.settings.voice,
        speed: this.settings.speed,
        pause: this.settings.pauseAfterPrompt,
      })
    }

    for (const item of props.items) {
      const reviewText = `${item.label}: ${this.formatValue(item.value, item.format)}`
      scriptParts.push(reviewText)
      prompts.push({
        text: this.sanitizeForVoice(reviewText),
        voice: this.settings.voice,
        speed: this.settings.speed,
        pause: this.settings.pauseBetweenOptions,
      })
    }

    return {
      script: scriptParts.join('. '),
      prompts,
      responses: [],
    } as VoicePayload
  }

  async parseResponse(payload: any): Promise<FormData> {
    const fields: Record<string, any> = {}

    // VAPI sends responses in specific format
    if (payload.transcript) {
      // Speech response
      fields.text = payload.transcript
    }

    if (payload.dtmf) {
      // DTMF response (convert to option index)
      fields.selection = parseInt(payload.dtmf) - 1
    }

    if (payload.messages) {
      // Multiple interactions
      for (let i = 0; i < payload.messages.length; i++) {
        const msg = payload.messages[i]
        fields[`response_${i}`] = msg.transcript || msg.dtmf
      }
    }

    return {
      fields,
      timestamp: new Date().toISOString(),
      channel: 'voice',
    }
  }

  supports(component: ReactElement): boolean {
    const componentName = (component.type as any).displayName || (component.type as any).name

    // Voice has limited support - only text-based components
    const supported = ['Prompt', 'Form', 'TextInput', 'Select', 'Button', 'Review']
    return supported.includes(componentName)
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

  private sanitizeForVoice(text: string): string {
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, '')

    // Convert symbols to words
    text = text.replace(/&/g, ' and ')
    text = text.replace(/@/g, ' at ')
    text = text.replace(/#/g, ' number ')
    text = text.replace(/\$/g, ' dollars ')
    text = text.replace(/%/g, ' percent ')

    // Remove special characters that don't sound good
    text = text.replace(/[^\w\s.,!?-]/g, '')

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim()

    return text
  }

  private formatValue(value: any, format?: string): string {
    if (value == null) return 'Not provided'

    switch (format) {
      case 'currency':
        const amount = Number(value)
        const dollars = Math.floor(amount)
        const cents = Math.round((amount - dollars) * 100)
        return cents > 0 ? `${dollars} dollars and ${cents} cents` : `${dollars} dollars`

      case 'date': {
        const date = new Date(value)
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      }

      case 'boolean':
        return value ? 'yes' : 'no'

      case 'number':
        return String(value)

      default:
        return String(value)
    }
  }
}
