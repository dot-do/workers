// Resend ESP Provider

import type { EmailMessage, SendResult, ESPConfig } from '../types'

export class ResendProvider {
  constructor(private config: ESPConfig) {}

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const payload = {
        from: message.from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        cc: message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined,
        bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined,
        reply_to: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
        })),
        tags: message.tags?.map(tag => ({ name: tag, value: 'true' })),
        headers: message.headers,
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data: any = await response.json()

      if (response.ok) {
        return {
          success: true,
          provider: 'resend',
          messageId: data.id,
          metadata: data,
        }
      }

      return {
        success: false,
        provider: 'resend',
        messageId: '',
        error: data.message || 'Resend send failed',
        metadata: data,
      }
    } catch (error: any) {
      return {
        success: false,
        provider: 'resend',
        messageId: '',
        error: error.message,
      }
    }
  }
}
