/**
 * Email Template Registry
 *
 * Central registry for all email templates
 */

import type { Template, TemplateData, RenderedEmail } from '../types'
import { renderWelcome } from './welcome'
import { renderPasswordReset } from './reset'
import { renderMagicLink } from './magic-link'
import { renderApiKey } from './apikey'
import { renderInvite } from './invite'
import { renderNotification } from './notification'
import { renderVerification } from './verification'

// Template registry
export const templates: Record<string, Template> = {
  welcome: {
    name: 'welcome',
    description: 'Welcome email sent when a new user signs up',
    requiredFields: ['name', 'loginUrl'],
    render: renderWelcome,
  },

  'password-reset': {
    name: 'password-reset',
    description: 'Password reset email with secure link',
    requiredFields: ['name', 'resetUrl'],
    render: renderPasswordReset,
  },

  'magic-link': {
    name: 'magic-link',
    description: 'Passwordless login magic link',
    requiredFields: ['loginUrl'],
    render: renderMagicLink,
  },

  apikey: {
    name: 'apikey',
    description: 'API key generation notification',
    requiredFields: ['name', 'apiKey', 'createdAt'],
    render: renderApiKey,
  },

  invite: {
    name: 'invite',
    description: 'Team/organization invitation',
    requiredFields: ['inviterName', 'organizationName', 'inviteUrl'],
    render: renderInvite,
  },

  notification: {
    name: 'notification',
    description: 'General purpose notification',
    requiredFields: ['title', 'message'],
    render: renderNotification,
  },

  verification: {
    name: 'verification',
    description: 'Email address verification',
    requiredFields: ['name', 'verificationUrl'],
    render: renderVerification,
  },
}

/**
 * Get a template by name
 */
export function getTemplate(name: string): Template | null {
  return templates[name] || null
}

/**
 * List all available templates
 */
export function listTemplates(): Template[] {
  return Object.values(templates)
}

/**
 * Render a template with data
 */
export function renderTemplate(name: string, data: TemplateData): RenderedEmail {
  const template = getTemplate(name)
  if (!template) {
    throw new Error(`Template not found: ${name}`)
  }

  // Validate required fields
  const missingFields = template.requiredFields.filter((field) => !(field in data))
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields for template ${name}: ${missingFields.join(', ')}`)
  }

  return template.render(data)
}

/**
 * Validate template data
 */
export function validateTemplateData(name: string, data: TemplateData): { valid: boolean; errors: string[] } {
  const template = getTemplate(name)
  if (!template) {
    return { valid: false, errors: [`Template not found: ${name}`] }
  }

  const errors: string[] = []
  const missingFields = template.requiredFields.filter((field) => !(field in data))

  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
