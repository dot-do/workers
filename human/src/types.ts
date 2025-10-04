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

// ============================================================================
// CHANNEL INTERFACE (for Slack and other channels)
// ============================================================================

/**
 * Base channel interface - all channels must implement this
 */
export interface Channel {
  readonly type: string

  /**
   * Send a message to the channel
   */
  sendMessage(message: ChannelMessage): Promise<{ id: string; timestamp: string }>

  /**
   * Update an existing message
   */
  updateMessage(messageId: string, message: ChannelMessage): Promise<void>

  /**
   * Handle incoming interactions (optional - for interactive channels)
   */
  handleInteraction?(payload: InteractionPayload): Promise<InteractionResponse>
}

/**
 * Generic channel message
 */
export interface ChannelMessage {
  recipientId?: string       // Channel-specific recipient (email, phone, slack user)
  title?: string             // Message title/header
  text?: string              // Main message text
  fields?: MessageField[]    // Key-value fields to display
  actions?: MessageAction[]  // Interactive actions (buttons, selects)
  footer?: string            // Footer text
  metadata?: Record<string, any>  // Custom metadata
}

/**
 * Message field (label-value pair)
 */
export interface MessageField {
  label: string
  value: string
}

/**
 * Message action (button, select, etc.)
 */
export interface MessageAction {
  id: string
  type: 'button' | 'select' | 'input'
  label: string
  value?: string
  style?: 'primary' | 'secondary' | 'destructive'
  options?: ActionOption[]
  placeholder?: string
  confirm?: ConfirmDialog
}

/**
 * Action option (for selects)
 */
export interface ActionOption {
  label: string
  value: string
  description?: string
}

/**
 * Confirmation dialog
 */
export interface ConfirmDialog {
  title: string
  text: string
  confirmLabel?: string
  denyLabel?: string
}

/**
 * Interaction payload (from channel)
 */
export interface InteractionPayload {
  messageId: string
  actionId: string
  userId: string
  channelId?: string
  rawPayload: any
}

/**
 * Interaction response
 */
export interface InteractionResponse {
  success: boolean
  value: any
  metadata?: Record<string, any>
}

// ============================================================================
// APPROVAL WORKFLOW TYPES
// ============================================================================

/**
 * Approval function input
 */
export interface ApprovalInput {
  title: string
  description: string
  approver: string           // User to approve (email, slack user, etc.)
  data?: Record<string, any> // Additional context
  timeout?: number
}

/**
 * Approval function output
 */
export interface ApprovalOutput {
  approved: boolean
  approver: string
  comment?: string
  timestamp: string
}
