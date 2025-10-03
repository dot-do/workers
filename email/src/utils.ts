/**
 * Email Service Utilities
 *
 * Helper functions for email handling
 */

import { ulid } from 'ulid'
import type { EmailLog } from './types'

/**
 * Generate a unique email ID
 */
export function generateEmailId(): string {
  return ulid()
}

/**
 * Sanitize HTML content to prevent XSS
 * Basic sanitization - in production, use a library like DOMPurify
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

/**
 * Extract plain text from HTML
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Format email log for database storage
 */
export function formatEmailLog(log: Partial<EmailLog>): EmailLog {
  return {
    id: log.id || generateEmailId(),
    userId: log.userId,
    recipient: log.recipient!,
    subject: log.subject!,
    template: log.template,
    provider: log.provider!,
    providerId: log.providerId,
    status: log.status || 'sent',
    error: log.error,
    sentAt: log.sentAt || new Date().toISOString(),
    deliveredAt: log.deliveredAt,
    openedAt: log.openedAt,
    clickedAt: log.clickedAt,
    bouncedAt: log.bouncedAt,
  }
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Parse email address from string (e.g., "John Doe <john@example.com>")
 */
export function parseEmailAddress(address: string): { email: string; name?: string } {
  const match = address.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    }
  }
  return { email: address.trim() }
}

/**
 * Format date for email display
 */
export function formatEmailDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Create a success response
 */
export function success<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
  }
}

/**
 * Create an error response
 */
export function error(code: string, message: string, details?: any, statusCode: number = 400) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    statusCode,
  }
}
