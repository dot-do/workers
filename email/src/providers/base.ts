/**
 * Base Email Provider
 *
 * Abstract base class for email providers
 */

import type { EmailMessage, EmailResult, EmailStatus, EmailProvider } from '../types'

export abstract class BaseEmailProvider implements EmailProvider {
  abstract name: string

  constructor(protected apiKey: string) {}

  /**
   * Send an email
   */
  abstract send(message: EmailMessage): Promise<EmailResult>

  /**
   * Get email status (optional - not all providers support this)
   */
  async getStatus(id: string): Promise<EmailStatus | null> {
    return null
  }

  /**
   * Normalize email addresses to strings
   */
  protected normalizeAddress(address: string | { email: string; name?: string }): string {
    if (typeof address === 'string') return address
    return address.name ? `${address.name} <${address.email}>` : address.email
  }

  /**
   * Normalize array of email addresses
   */
  protected normalizeAddresses(addresses: string | string[] | { email: string; name?: string } | { email: string; name?: string }[]): string[] {
    if (!addresses) return []
    if (typeof addresses === 'string') return [addresses]
    if (Array.isArray(addresses)) {
      return addresses.map((addr) => this.normalizeAddress(addr))
    }
    return [this.normalizeAddress(addresses)]
  }

  /**
   * Validate email message
   */
  protected validateMessage(message: EmailMessage): void {
    if (!message.to || (Array.isArray(message.to) && message.to.length === 0)) {
      throw new Error('Email message must have at least one recipient')
    }
    if (!message.from) {
      throw new Error('Email message must have a from address')
    }
    if (!message.subject) {
      throw new Error('Email message must have a subject')
    }
    if (!message.html && !message.text) {
      throw new Error('Email message must have either HTML or text content')
    }
  }
}
