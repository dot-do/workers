/**
 * Type definitions for Human Functions
 */

export interface HumanFunctionPayload {
  id: string
  functionType: 'approval' | 'form' | 'notification' | 'custom'
  prompt: string
  fields?: FormField[]
  buttons?: Button[]
  timeout?: number // milliseconds
  metadata?: Record<string, any>
}

export interface FormField {
  id: string
  type: 'text' | 'number' | 'email' | 'select' | 'textarea'
  label: string
  prompt?: string // Voice-specific prompt
  required?: boolean
  validation?: {
    pattern?: string
    min?: number
    max?: number
    options?: string[]
  }
}

export interface Button {
  id: string
  label: string
  action: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface HumanFunctionResponse {
  id: string
  approved?: boolean
  values?: Record<string, any>
  timestamp: string
  channel: 'voice' | 'email' | 'sms' | 'web'
  metadata?: Record<string, any>
}

export interface ChannelConfig {
  timeout?: number
  retries?: number
  confirmations?: boolean
}
