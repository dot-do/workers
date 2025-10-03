// SendGrid ESP Provider

import type { EmailMessage, SendResult, ESPConfig } from '../types'

export class SendGridProvider {
  constructor(private config: ESPConfig) {}

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const payload = {
        personalizations: [
          {
            to: this.normalizeAddresses(message.to),
            cc: message.cc ? this.normalizeAddresses(message.cc) : undefined,
            bcc: message.bcc ? this.normalizeAddresses(message.bcc) : undefined,
            subject: message.subject,
            custom_args: message.metadata || {},
          },
        ],
        from: this.parseAddress(message.from),
        reply_to: message.replyTo ? this.parseAddress(message.replyTo) : undefined,
        subject: message.subject,
        content: [
          ...(message.text ? [{ type: 'text/plain', value: message.text }] : []),
          ...(message.html ? [{ type: 'text/html', value: message.html }] : []),
        ],
        attachments: message.attachments?.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.contentType,
          disposition: att.disposition || 'attachment',
          content_id: att.contentId,
        })),
        categories: message.tags,
        custom_args: message.metadata,
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const messageId = response.headers.get('x-message-id') || ''
        return {
          success: true,
          provider: 'sendgrid',
          messageId,
        }
      }

      const errorData: any = await response.json().catch(() => ({}))
      return {
        success: false,
        provider: 'sendgrid',
        messageId: '',
        error: errorData.errors?.[0]?.message || 'SendGrid send failed',
        metadata: errorData,
      }
    } catch (error: any) {
      return {
        success: false,
        provider: 'sendgrid',
        messageId: '',
        error: error.message,
      }
    }
  }

  private normalizeAddresses(addresses: string | string[]) {
    const addrs = Array.isArray(addresses) ? addresses : [addresses]
    return addrs.map(addr => this.parseAddress(addr))
  }

  private parseAddress(address: string) {
    const match = address.match(/^(.+?)\s*<(.+?)>$/)
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() }
    }
    return { email: address.trim() }
  }
}
