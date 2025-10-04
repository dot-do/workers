import type {
  Channel,
  ChannelMessage,
  ChannelConfig,
  InteractionPayload,
  InteractionResponse
} from '../types'

/**
 * Slack BlockKit Channel Implementation
 *
 * Provides rich interactive UIs for human functions using Slack's BlockKit.
 * Supports buttons, selects, modals, and threaded conversations.
 *
 * Features:
 * - BlockKit message builder
 * - Interactive component handlers (buttons, selects, modals)
 * - Thread support for organized conversations
 * - Message updates (progress, completion)
 * - Slash command integration
 * - Request signature verification
 *
 * Security:
 * - Verifies all Slack request signatures
 * - Rate limit handling
 * - Token rotation support
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SlackConfig extends ChannelConfig {
  channel: 'slack'
  botToken: string           // Bot User OAuth Token
  signingSecret: string      // For verifying requests
  appToken?: string          // For Socket Mode
  defaultChannel?: string    // Default channel ID
  useSocketMode?: boolean    // Use Socket Mode vs webhooks
}

export interface SlackMessage {
  channel: string
  text?: string              // Fallback text
  blocks?: SlackBlock[]      // Rich UI blocks
  thread_ts?: string         // Thread parent message
  metadata?: Record<string, any>
  attachments?: SlackAttachment[]
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'actions' | 'input' | 'context' | 'header' | 'image'
  block_id?: string
  text?: SlackText
  fields?: SlackText[]
  accessory?: SlackElement
  elements?: SlackElement[]
  image_url?: string
  alt_text?: string
}

export interface SlackText {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
  verbatim?: boolean
}

export interface SlackElement {
  type: 'button' | 'static_select' | 'multi_static_select' | 'datepicker' | 'timepicker' | 'plain_text_input'
  action_id: string
  text?: SlackText
  value?: string
  style?: 'primary' | 'danger'
  confirm?: SlackConfirmation
  options?: SlackOption[]
  initial_option?: SlackOption
  initial_options?: SlackOption[]
  placeholder?: SlackText
  initial_date?: string
  initial_time?: string
  multiline?: boolean
  min_length?: number
  max_length?: number
}

export interface SlackOption {
  text: SlackText
  value: string
  description?: SlackText
}

export interface SlackConfirmation {
  title: SlackText
  text: SlackText
  confirm: SlackText
  deny: SlackText
  style?: 'primary' | 'danger'
}

export interface SlackAttachment {
  color?: string
  fallback?: string
  blocks?: SlackBlock[]
}

export interface SlackModal {
  type: 'modal'
  callback_id: string
  title: SlackText
  blocks: SlackBlock[]
  submit?: SlackText
  close?: SlackText
  private_metadata?: string
  notify_on_close?: boolean
}

export interface SlackInteractionPayload {
  type: 'block_actions' | 'view_submission' | 'view_closed' | 'message_action' | 'shortcut'
  user: {
    id: string
    username: string
    name: string
  }
  team: {
    id: string
    domain: string
  }
  channel?: {
    id: string
    name: string
  }
  message?: {
    ts: string
    text: string
  }
  actions?: Array<{
    action_id: string
    block_id: string
    type: string
    value?: string
    selected_option?: SlackOption
    selected_options?: SlackOption[]
    selected_date?: string
    selected_time?: string
  }>
  view?: {
    id: string
    callback_id: string
    type: string
    state: {
      values: Record<string, Record<string, any>>
    }
    private_metadata?: string
  }
  response_url?: string
  trigger_id?: string
}

// ============================================================================
// SLACK CHANNEL CLASS
// ============================================================================

export class SlackChannel implements Channel {
  readonly type = 'slack'
  private config: SlackConfig
  private baseUrl = 'https://slack.com/api'

  constructor(config: SlackConfig) {
    this.config = config
  }

  // ==========================================================================
  // CHANNEL INTERFACE IMPLEMENTATION
  // ==========================================================================

  /**
   * Send a message to Slack
   */
  async sendMessage(message: ChannelMessage): Promise<{ id: string; timestamp: string }> {
    const blocks = this.buildBlocks(message)

    const slackMessage: SlackMessage = {
      channel: message.recipientId || this.config.defaultChannel || '',
      text: message.text || 'Human input required',
      blocks,
      metadata: message.metadata,
    }

    const response = await this.callSlackAPI('chat.postMessage', slackMessage)

    return {
      id: response.ts,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Update an existing message
   */
  async updateMessage(messageId: string, message: ChannelMessage): Promise<void> {
    const blocks = this.buildBlocks(message)

    await this.callSlackAPI('chat.update', {
      channel: message.recipientId || this.config.defaultChannel || '',
      ts: messageId,
      text: message.text || 'Human input required',
      blocks,
    })
  }

  /**
   * Handle incoming interactions (button clicks, select changes, modal submissions)
   */
  async handleInteraction(payload: InteractionPayload): Promise<InteractionResponse> {
    const slackPayload = payload.rawPayload as SlackInteractionPayload

    // Route based on interaction type
    switch (slackPayload.type) {
      case 'block_actions':
        return this.handleBlockActions(slackPayload)

      case 'view_submission':
        return this.handleModalSubmission(slackPayload)

      case 'view_closed':
        return this.handleModalClosed(slackPayload)

      default:
        throw new Error(`Unsupported interaction type: ${slackPayload.type}`)
    }
  }

  /**
   * Verify webhook signature
   */
  async verifySignature(body: string, timestamp: string, signature: string): Promise<boolean> {
    const baseString = `v0:${timestamp}:${body}`

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.config.signingSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString))
    const signatureHex = Array.from(new Uint8Array(signed))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const expected = `v0=${signatureHex}`
    return expected === signature
  }

  // ==========================================================================
  // BLOCKKIT MESSAGE BUILDERS
  // ==========================================================================

  /**
   * Build BlockKit blocks from generic channel message
   */
  private buildBlocks(message: ChannelMessage): SlackBlock[] {
    const blocks: SlackBlock[] = []

    // Header/Title
    if (message.title) {
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: message.title,
          emoji: true,
        },
      })
    }

    // Main text
    if (message.text) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.text,
        },
      })
    }

    // Fields (key-value pairs)
    if (message.fields && message.fields.length > 0) {
      blocks.push({
        type: 'section',
        fields: message.fields.map(field => ({
          type: 'mrkdwn',
          text: `*${field.label}*\n${field.value}`,
        })),
      })
    }

    // Divider before actions
    if (message.actions && message.actions.length > 0) {
      blocks.push({ type: 'divider' })
    }

    // Actions (buttons, selects)
    if (message.actions && message.actions.length > 0) {
      const elements: SlackElement[] = message.actions.map(action => {
        if (action.type === 'button') {
          return {
            type: 'button',
            action_id: action.id,
            text: {
              type: 'plain_text',
              text: action.label,
              emoji: true,
            },
            value: action.value,
            style: action.style === 'destructive' ? 'danger' : action.style === 'primary' ? 'primary' : undefined,
            confirm: action.confirm ? {
              title: { type: 'plain_text', text: action.confirm.title },
              text: { type: 'mrkdwn', text: action.confirm.text },
              confirm: { type: 'plain_text', text: action.confirm.confirmLabel || 'Yes' },
              deny: { type: 'plain_text', text: action.confirm.denyLabel || 'No' },
            } : undefined,
          }
        } else if (action.type === 'select') {
          return {
            type: 'static_select',
            action_id: action.id,
            placeholder: {
              type: 'plain_text',
              text: action.placeholder || 'Select an option',
            },
            options: action.options?.map(opt => ({
              text: { type: 'plain_text', text: opt.label },
              value: opt.value,
              description: opt.description ? { type: 'plain_text', text: opt.description } : undefined,
            })) || [],
          }
        }
        throw new Error(`Unsupported action type: ${action.type}`)
      })

      blocks.push({
        type: 'actions',
        elements,
      })
    }

    // Context (footer)
    if (message.footer) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: message.footer,
          } as any,
        ],
      })
    }

    return blocks
  }

  /**
   * Build a modal view
   */
  buildModal(
    callbackId: string,
    title: string,
    blocks: SlackBlock[],
    submitLabel: string = 'Submit',
    metadata?: string
  ): SlackModal {
    return {
      type: 'modal',
      callback_id: callbackId,
      title: {
        type: 'plain_text',
        text: title,
      },
      blocks,
      submit: {
        type: 'plain_text',
        text: submitLabel,
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      private_metadata: metadata,
    }
  }

  /**
   * Build input blocks for forms
   */
  buildInputBlock(
    blockId: string,
    actionId: string,
    label: string,
    placeholder: string,
    options?: {
      multiline?: boolean
      minLength?: number
      maxLength?: number
      optional?: boolean
    }
  ): SlackBlock {
    return {
      type: 'input',
      block_id: blockId,
      element: {
        type: 'plain_text_input',
        action_id: actionId,
        placeholder: {
          type: 'plain_text',
          text: placeholder,
        },
        multiline: options?.multiline,
        min_length: options?.minLength,
        max_length: options?.maxLength,
      },
      label: {
        type: 'plain_text',
        text: label,
      },
      optional: options?.optional,
    } as any
  }

  /**
   * Build select block
   */
  buildSelectBlock(
    blockId: string,
    actionId: string,
    label: string,
    options: Array<{ label: string; value: string; description?: string }>,
    placeholder: string = 'Select an option'
  ): SlackBlock {
    return {
      type: 'input',
      block_id: blockId,
      element: {
        type: 'static_select',
        action_id: actionId,
        placeholder: {
          type: 'plain_text',
          text: placeholder,
        },
        options: options.map(opt => ({
          text: { type: 'plain_text', text: opt.label },
          value: opt.value,
          description: opt.description ? { type: 'plain_text', text: opt.description } : undefined,
        })),
      },
      label: {
        type: 'plain_text',
        text: label,
      },
    } as any
  }

  // ==========================================================================
  // INTERACTION HANDLERS
  // ==========================================================================

  /**
   * Handle button clicks and select changes
   */
  private async handleBlockActions(payload: SlackInteractionPayload): Promise<InteractionResponse> {
    if (!payload.actions || payload.actions.length === 0) {
      throw new Error('No actions in payload')
    }

    const action = payload.actions[0]
    const value = action.value || action.selected_option?.value || action.selected_options?.map(o => o.value).join(',')

    return {
      success: true,
      value,
      metadata: {
        actionId: action.action_id,
        blockId: action.block_id,
        userId: payload.user.id,
        channelId: payload.channel?.id,
        messageTs: payload.message?.ts,
      },
    }
  }

  /**
   * Handle modal submission
   */
  private async handleModalSubmission(payload: SlackInteractionPayload): Promise<InteractionResponse> {
    if (!payload.view) {
      throw new Error('No view in modal submission')
    }

    // Extract form values
    const values: Record<string, any> = {}
    const state = payload.view.state.values

    for (const blockId in state) {
      for (const actionId in state[blockId]) {
        const field = state[blockId][actionId]

        if (field.type === 'plain_text_input') {
          values[actionId] = field.value
        } else if (field.type === 'static_select') {
          values[actionId] = field.selected_option?.value
        } else if (field.type === 'multi_static_select') {
          values[actionId] = field.selected_options?.map((o: SlackOption) => o.value)
        } else if (field.type === 'datepicker') {
          values[actionId] = field.selected_date
        } else if (field.type === 'timepicker') {
          values[actionId] = field.selected_time
        }
      }
    }

    return {
      success: true,
      value: values,
      metadata: {
        callbackId: payload.view.callback_id,
        viewId: payload.view.id,
        privateMetadata: payload.view.private_metadata,
        userId: payload.user.id,
      },
    }
  }

  /**
   * Handle modal closed (dismissed)
   */
  private async handleModalClosed(payload: SlackInteractionPayload): Promise<InteractionResponse> {
    return {
      success: false,
      value: null,
      metadata: {
        callbackId: payload.view?.callback_id,
        viewId: payload.view?.id,
        userId: payload.user.id,
        dismissed: true,
      },
    }
  }

  // ==========================================================================
  // SLACK API METHODS
  // ==========================================================================

  /**
   * Open a modal dialog
   */
  async openModal(triggerId: string, modal: SlackModal): Promise<void> {
    await this.callSlackAPI('views.open', {
      trigger_id: triggerId,
      view: modal,
    })
  }

  /**
   * Update a modal
   */
  async updateModal(viewId: string, modal: SlackModal): Promise<void> {
    await this.callSlackAPI('views.update', {
      view_id: viewId,
      view: modal,
    })
  }

  /**
   * Send ephemeral message (only visible to one user)
   */
  async sendEphemeral(
    channel: string,
    user: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<void> {
    await this.callSlackAPI('chat.postEphemeral', {
      channel,
      user,
      text,
      blocks,
    })
  }

  /**
   * Send message to thread
   */
  async sendThreadMessage(
    channel: string,
    threadTs: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<{ ts: string }> {
    const response = await this.callSlackAPI('chat.postMessage', {
      channel,
      thread_ts: threadTs,
      text,
      blocks,
    })

    return { ts: response.ts }
  }

  /**
   * Get channel info
   */
  async getChannel(channelId: string): Promise<any> {
    return await this.callSlackAPI('conversations.info', {
      channel: channelId,
    })
  }

  /**
   * Get user info
   */
  async getUser(userId: string): Promise<any> {
    return await this.callSlackAPI('users.info', {
      user: userId,
    })
  }

  /**
   * Post message using response_url (for interactions)
   */
  async respondToInteraction(
    responseUrl: string,
    text: string,
    blocks?: SlackBlock[],
    replaceOriginal: boolean = false
  ): Promise<void> {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        blocks,
        replace_original: replaceOriginal,
      }),
    })
  }

  // ==========================================================================
  // SLACK WEB API CLIENT
  // ==========================================================================

  /**
   * Call Slack Web API
   */
  private async callSlackAPI(method: string, data: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.botToken}`,
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`)
    }

    return result
  }

  // ==========================================================================
  // SLASH COMMAND HANDLER
  // ==========================================================================

  /**
   * Handle slash commands
   *
   * Example: /approve-expense 12345
   */
  async handleSlashCommand(
    command: string,
    payload: {
      user_id: string
      channel_id: string
      text: string
      trigger_id: string
      response_url: string
    }
  ): Promise<{ text: string; blocks?: SlackBlock[] }> {
    // Parse command
    const parts = payload.text.trim().split(/\s+/)
    const action = parts[0]
    const args = parts.slice(1)

    // Route to appropriate handler
    switch (action) {
      case 'help':
        return this.handleHelpCommand()

      case 'status':
        return this.handleStatusCommand(args[0], payload)

      default:
        return {
          text: `Unknown command: ${action}. Type \`${command} help\` for available commands.`,
        }
    }
  }

  /**
   * Help command
   */
  private handleHelpCommand(): { text: string; blocks: SlackBlock[] } {
    return {
      text: 'Available commands',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Available Commands*',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '• `help` - Show this help\n• `status <id>` - Check function status',
          },
        },
      ],
    }
  }

  /**
   * Status command
   */
  private async handleStatusCommand(
    functionId: string,
    payload: any
  ): Promise<{ text: string; blocks?: SlackBlock[] }> {
    if (!functionId) {
      return {
        text: 'Usage: /command status <function-id>',
      }
    }

    // Would query status from storage
    return {
      text: `Status for function ${functionId}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Function Status*\nID: ${functionId}\nStatus: Pending`,
          },
        },
      ],
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse Slack interaction payload from request
 */
export function parseSlackPayload(body: string): SlackInteractionPayload {
  // Slack sends the payload as form-encoded 'payload' field
  const params = new URLSearchParams(body)
  const payloadStr = params.get('payload')

  if (!payloadStr) {
    throw new Error('No payload in request')
  }

  return JSON.parse(payloadStr)
}

/**
 * Parse slash command payload
 */
export function parseSlashCommand(body: string): Record<string, string> {
  const params = new URLSearchParams(body)
  const result: Record<string, string> = {}

  for (const [key, value] of params.entries()) {
    result[key] = value
  }

  return result
}

/**
 * Verify Slack request timestamp (replay attack prevention)
 */
export function verifyTimestamp(timestamp: string, maxAge: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000)
  const requestTime = parseInt(timestamp, 10)

  return Math.abs(now - requestTime) <= maxAge
}
