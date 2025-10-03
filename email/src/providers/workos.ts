/**
 * WorkOS Email Provider
 *
 * Integration with WorkOS for magic link authentication emails
 * Docs: https://workos.com/docs/magic-link/guide
 */

import { BaseEmailProvider } from './base'
import type { EmailMessage, EmailResult } from '../types'

export class WorkOSProvider extends BaseEmailProvider {
  name = 'workos'
  private apiUrl = 'https://api.workos.com'

  constructor(apiKey: string) {
    super(apiKey)
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    this.validateMessage(message)

    // WorkOS only supports sending to a single recipient
    const recipients = this.normalizeAddresses(message.to)
    if (recipients.length > 1) {
      throw new Error('WorkOS provider only supports sending to a single recipient')
    }

    try {
      // Note: This is a simplified implementation
      // In practice, you'd use WorkOS's magic link API which handles the email automatically
      const response = await fetch(`${this.apiUrl}/passwordless/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          email: recipients[0],
          type: 'MagicLink',
        }),
      })

      if (!response.ok) {
        const error: any = await response.json()
        return {
          id: `failed-${Date.now()}`,
          provider: this.name,
          status: 'failed',
          error: error.message || `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        }
      }

      const result: any = await response.json()

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
}
