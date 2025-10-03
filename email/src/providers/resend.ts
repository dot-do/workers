/**
 * Resend Email Provider
 *
 * Integration with Resend API for sending transactional emails
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */

import { BaseEmailProvider } from './base'
import type { EmailMessage, EmailResult, EmailStatus } from '../types'

interface ResendEmailRequest {
  from: string
  to: string[]
  subject: string
  html?: string
  text?: string
  cc?: string[]
  bcc?: string[]
  reply_to?: string
  attachments?: Array<{
    filename: string
    content: string
  }>
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
}

interface ResendEmailResponse {
  id: string
}

interface ResendErrorResponse {
  statusCode: number
  message: string
  name: string
}

export class ResendProvider extends BaseEmailProvider {
  name = 'resend'
  private apiUrl = 'https://api.resend.com'

  constructor(apiKey: string) {
    super(apiKey)
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    this.validateMessage(message)

    const payload: ResendEmailRequest = {
      from: this.normalizeAddress(message.from),
      to: this.normalizeAddresses(message.to),
      subject: message.subject,
      html: message.html,
      text: message.text,
    }

    if (message.cc) {
      payload.cc = this.normalizeAddresses(message.cc)
    }

    if (message.bcc) {
      payload.bcc = this.normalizeAddresses(message.bcc)
    }

    if (message.replyTo) {
      payload.reply_to = this.normalizeAddress(message.replyTo)
    }

    if (message.attachments && message.attachments.length > 0) {
      payload.attachments = message.attachments.map((att) => ({
        filename: att.filename,
        content: typeof att.content === 'string' ? att.content : this.arrayBufferToBase64(att.content),
      }))
    }

    if (message.headers) {
      payload.headers = message.headers
    }

    if (message.tags) {
      payload.tags = Object.entries(message.tags).map(([name, value]) => ({ name, value }))
    }

    try {
      const response = await fetch(`${this.apiUrl}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error: ResendErrorResponse = await response.json()
        return {
          id: `failed-${Date.now()}`,
          provider: this.name,
          status: 'failed',
          error: error.message || `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        }
      }

      const result: ResendEmailResponse = await response.json()

      return {
        id: result.id,
        provider: this.name,
        status: 'sent',
        providerId: result.id,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        id: `failed-${Date.now()}`,
        provider: this.name,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  }

  async getStatus(id: string): Promise<EmailStatus | null> {
    try {
      const response = await fetch(`${this.apiUrl}/emails/${id}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        return null
      }

      const data: any = await response.json()

      return {
        id,
        providerId: id,
        status: this.mapResendStatus(data.last_event),
        sentAt: data.created_at,
        deliveredAt: data.last_event === 'delivered' ? data.updated_at : undefined,
        openedAt: data.last_event === 'opened' ? data.updated_at : undefined,
        clickedAt: data.last_event === 'clicked' ? data.updated_at : undefined,
        bouncedAt: data.last_event === 'bounced' ? data.updated_at : undefined,
        recipient: data.to[0],
      }
    } catch (error) {
      return null
    }
  }

  private mapResendStatus(event: string): EmailStatus['status'] {
    const statusMap: Record<string, EmailStatus['status']> = {
      sent: 'sent',
      delivered: 'delivered',
      opened: 'opened',
      clicked: 'clicked',
      bounced: 'bounced',
      complained: 'complained',
    }
    return statusMap[event] || 'sent'
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }
}
