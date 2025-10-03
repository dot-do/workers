// Mailgun ESP Provider

import type { EmailMessage, SendResult, ESPConfig } from '../types'

export class MailgunProvider {
  constructor(private config: ESPConfig) {}

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const formData = new FormData()
      formData.append('from', message.from)

      const toAddresses = Array.isArray(message.to) ? message.to : [message.to]
      toAddresses.forEach(to => formData.append('to', to))

      if (message.cc) {
        const ccAddresses = Array.isArray(message.cc) ? message.cc : [message.cc]
        ccAddresses.forEach(cc => formData.append('cc', cc))
      }

      if (message.bcc) {
        const bccAddresses = Array.isArray(message.bcc) ? message.bcc : [message.bcc]
        bccAddresses.forEach(bcc => formData.append('bcc', bcc))
      }

      formData.append('subject', message.subject)
      if (message.html) formData.append('html', message.html)
      if (message.text) formData.append('text', message.text)
      if (message.replyTo) formData.append('h:Reply-To', message.replyTo)

      // Tags
      if (message.tags) {
        message.tags.forEach(tag => formData.append('o:tag', tag))
      }

      // Custom headers
      if (message.headers) {
        Object.entries(message.headers).forEach(([key, value]) => {
          formData.append(`h:${key}`, value)
        })
      }

      // Attachments
      if (message.attachments) {
        message.attachments.forEach((att, i) => {
          const blob = new Blob([Buffer.from(att.content, 'base64')], { type: att.contentType })
          formData.append('attachment', blob, att.filename)
        })
      }

      const response = await fetch(
        `https://api.mailgun.net/v3/${this.config.domain}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`api:${this.config.apiKey}`)}`,
          },
          body: formData,
        }
      )

      const data: any = await response.json()

      if (response.ok) {
        return {
          success: true,
          provider: 'mailgun',
          messageId: data.id,
          metadata: data,
        }
      }

      return {
        success: false,
        provider: 'mailgun',
        messageId: '',
        error: data.message || 'Mailgun send failed',
        metadata: data,
      }
    } catch (error: any) {
      return {
        success: false,
        provider: 'mailgun',
        messageId: '',
        error: error.message,
      }
    }
  }
}
