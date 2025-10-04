/**
 * Cold Email Extensions
 * Adds cold email specific functionality to the email service
 */

import type { EmailMessage, EmailResult, TemplateData } from './types'

/**
 * Cold Email Options
 */
export interface ColdEmailOptions {
  // Personalization
  contactId: string
  campaignId: string
  variables?: Record<string, string>

  // Tracking
  trackOpens?: boolean
  trackClicks?: boolean

  // Domain & Sending
  domainId: string
  respectWarmup?: boolean
  respectRateLimits?: boolean

  // Unsubscribe
  unsubscribeUrl: string
  listUnsubscribeHeader?: boolean
}

/**
 * Cold Email Result
 */
export interface ColdEmailResult extends EmailResult {
  contactId: string
  campaignId: string
  trackedLinks: string[]
  hasTrackingPixel: boolean
  hasUnsubscribeLink: boolean
}

/**
 * Template Variable Pattern
 */
const VARIABLE_PATTERN = /\{\{([a-zA-Z0-9_\.]+)\}\}/g

/**
 * Replace template variables in text
 */
export function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (match, key) => {
    // Support nested keys like "company.name"
    const keys = key.split('.')
    let value: any = variables

    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }

    return value !== undefined ? String(value) : match
  })
}

/**
 * Inject tracking pixel into HTML
 */
export function injectTrackingPixel(html: string, trackingUrl: string): string {
  // Add tracking pixel before closing </body> tag if exists
  if (html.includes('</body>')) {
    return html.replace('</body>', `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none" /></body>`)
  }

  // Otherwise append to end
  return `${html}<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none" />`
}

/**
 * Track all links in HTML
 */
export function trackLinks(html: string, trackingBaseUrl: string, contactId: string, campaignId: string): { html: string; trackedLinks: string[] } {
  const trackedLinks: string[] = []
  let linkIndex = 0

  // Match all <a href="..."> tags
  const trackedHtml = html.replace(/<a\s+href="([^"]+)"/gi, (match, originalUrl) => {
    // Skip mailto, tel, and tracking URLs
    if (originalUrl.startsWith('mailto:') || originalUrl.startsWith('tel:') || originalUrl.includes('/track/')) {
      return match
    }

    // Skip unsubscribe links (tracked separately)
    if (originalUrl.includes('unsubscribe')) {
      return match
    }

    // Create tracking URL
    const trackingUrl = `${trackingBaseUrl}/track/click?contact=${contactId}&campaign=${campaignId}&link=${linkIndex}&url=${encodeURIComponent(originalUrl)}`
    trackedLinks.push(originalUrl)
    linkIndex++

    return `<a href="${trackingUrl}"`
  })

  return { html: trackedHtml, trackedLinks }
}

/**
 * Inject unsubscribe link
 */
export function injectUnsubscribeLink(html: string, text: string, unsubscribeUrl: string): { html: string; text: string } {
  const unsubscribeText = `\n\nIf you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}">unsubscribe here</a>.`
  const unsubscribeTextPlain = `\n\nIf you no longer wish to receive these emails, you can unsubscribe here: ${unsubscribeUrl}`

  // Inject before closing </body> or append
  let updatedHtml = html
  if (html.includes('</body>')) {
    updatedHtml = html.replace('</body>', `<p style="font-size:12px;color:#666;margin-top:40px;">${unsubscribeText}</p></body>`)
  } else {
    updatedHtml = `${html}<p style="font-size:12px;color:#666;margin-top:40px;">${unsubscribeText}</p>`
  }

  const updatedText = text + unsubscribeTextPlain

  return { html: updatedHtml, text: updatedText }
}

/**
 * Add List-Unsubscribe header (RFC 8058)
 */
export function addUnsubscribeHeaders(message: EmailMessage, unsubscribeUrl: string): EmailMessage {
  return {
    ...message,
    headers: {
      ...message.headers,
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

/**
 * Process cold email before sending
 */
export function processColdEmail(
  message: EmailMessage,
  options: ColdEmailOptions,
  trackingBaseUrl: string
): {
  message: EmailMessage
  trackedLinks: string[]
  hasTrackingPixel: boolean
  hasUnsubscribeLink: boolean
} {
  let html = message.html || ''
  let text = message.text || ''
  let trackedLinks: string[] = []
  let hasTrackingPixel = false
  let hasUnsubscribeLink = false

  // 1. Replace template variables
  if (options.variables) {
    html = replaceVariables(html, options.variables)
    text = replaceVariables(text, options.variables)
    message.subject = replaceVariables(message.subject, options.variables)
  }

  // 2. Track links
  if (options.trackClicks !== false && html) {
    const tracked = trackLinks(html, trackingBaseUrl, options.contactId, options.campaignId)
    html = tracked.html
    trackedLinks = tracked.trackedLinks
  }

  // 3. Inject tracking pixel
  if (options.trackOpens !== false && html) {
    const trackingPixelUrl = `${trackingBaseUrl}/track/open?contact=${options.contactId}&campaign=${options.campaignId}`
    html = injectTrackingPixel(html, trackingPixelUrl)
    hasTrackingPixel = true
  }

  // 4. Add unsubscribe link
  if (options.unsubscribeUrl) {
    const withUnsubscribe = injectUnsubscribeLink(html, text, options.unsubscribeUrl)
    html = withUnsubscribe.html
    text = withUnsubscribe.text
    hasUnsubscribeLink = true
  }

  // 5. Build updated message
  let updatedMessage: EmailMessage = {
    ...message,
    html,
    text,
  }

  // 6. Add List-Unsubscribe headers
  if (options.listUnsubscribeHeader !== false && options.unsubscribeUrl) {
    updatedMessage = addUnsubscribeHeaders(updatedMessage, options.unsubscribeUrl)
  }

  // 7. Add campaign metadata
  updatedMessage.tags = {
    ...updatedMessage.tags,
    contactId: options.contactId,
    campaignId: options.campaignId,
    domainId: options.domainId,
  }

  return {
    message: updatedMessage,
    trackedLinks,
    hasTrackingPixel,
    hasUnsubscribeLink,
  }
}

/**
 * Extract personalization variables from template
 */
export function extractVariables(template: string): string[] {
  const variables = new Set<string>()
  let match: RegExpExecArray | null

  const regex = new RegExp(VARIABLE_PATTERN)
  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1])
  }

  return Array.from(variables)
}

/**
 * Validate personalization variables
 */
export function validateVariables(template: string, provided: Record<string, string>): { valid: boolean; missing: string[] } {
  const required = extractVariables(template)
  const missing = required.filter((key) => {
    const keys = key.split('.')
    let value: any = provided

    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) return true
    }

    return false
  })

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Generate sample variables for testing
 */
export function generateSampleVariables(): Record<string, string> {
  return {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: {
      name: 'Acme Corp',
      website: 'https://acme.com',
      industry: 'Technology',
      size: '50-200',
    },
    title: 'CEO',
    linkedin: 'https://linkedin.com/in/johndoe',
  }
}

/**
 * Create cold email template
 */
export interface ColdEmailTemplate {
  id: string
  name: string
  description: string
  subject: string
  html: string
  text: string
  variables: string[]
  category: 'introduction' | 'follow-up' | 'breakup' | 'value' | 'question' | 'custom'
  tags: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Default cold email templates
 */
export const DEFAULT_TEMPLATES: ColdEmailTemplate[] = [
  {
    id: 'intro-pain-point',
    name: 'Introduction - Pain Point',
    description: 'Lead with a specific pain point the prospect faces',
    category: 'introduction',
    subject: 'Quick question about {{company.name}}',
    html: `
      <p>Hi {{firstName}},</p>

      <p>I noticed {{company.name}} is in the {{company.industry}} space, and I've been working with similar companies to solve [specific pain point].</p>

      <p>Would you be open to a 15-minute chat next week to explore if we could help {{company.name}} achieve [specific outcome]?</p>

      <p>Best,<br>{{senderName}}</p>
    `,
    text: `
Hi {{firstName}},

I noticed {{company.name}} is in the {{company.industry}} space, and I've been working with similar companies to solve [specific pain point].

Would you be open to a 15-minute chat next week to explore if we could help {{company.name}} achieve [specific outcome]?

Best,
{{senderName}}
    `,
    variables: ['firstName', 'company.name', 'company.industry', 'senderName'],
    tags: ['intro', 'pain-point', 'value'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'follow-up-1',
    name: 'Follow-up #1 - Gentle Reminder',
    description: 'First follow-up, gentle reminder with added value',
    category: 'follow-up',
    subject: 'Re: Quick question about {{company.name}}',
    html: `
      <p>Hi {{firstName}},</p>

      <p>Following up on my previous email about [topic]. I wanted to share a quick resource that might be helpful:</p>

      <p>[Link to relevant case study, blog post, or resource]</p>

      <p>Would love to hear your thoughts. Are you free for a quick 15-minute call this week?</p>

      <p>Best,<br>{{senderName}}</p>
    `,
    text: `
Hi {{firstName}},

Following up on my previous email about [topic]. I wanted to share a quick resource that might be helpful:

[Link to relevant case study, blog post, or resource]

Would love to hear your thoughts. Are you free for a quick 15-minute call this week?

Best,
{{senderName}}
    `,
    variables: ['firstName', 'company.name', 'senderName'],
    tags: ['follow-up', 'value', 'resource'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'follow-up-2',
    name: 'Follow-up #2 - Social Proof',
    description: 'Second follow-up with social proof and urgency',
    category: 'follow-up',
    subject: 'Helping companies like {{company.name}}',
    html: `
      <p>Hi {{firstName}},</p>

      <p>I know you're busy, so I'll keep this brief.</p>

      <p>We recently helped [Similar Company] achieve [specific result] in [timeframe]. I think {{company.name}} could see similar results.</p>

      <p>Are you open to a quick 10-minute call to discuss?</p>

      <p>Best,<br>{{senderName}}</p>
    `,
    text: `
Hi {{firstName}},

I know you're busy, so I'll keep this brief.

We recently helped [Similar Company] achieve [specific result] in [timeframe]. I think {{company.name}} could see similar results.

Are you open to a quick 10-minute call to discuss?

Best,
{{senderName}}
    `,
    variables: ['firstName', 'company.name', 'senderName'],
    tags: ['follow-up', 'social-proof', 'results'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'breakup',
    name: 'Breakup - Final Follow-up',
    description: 'Last email in sequence, giving them an easy out',
    category: 'breakup',
    subject: 'Should I close your file?',
    html: `
      <p>Hi {{firstName}},</p>

      <p>I haven't heard back from you, so I'm assuming this isn't a priority for {{company.name}} right now.</p>

      <p>Before I close your file, I wanted to give you one last chance to let me know if you'd like to explore this further.</p>

      <p>If I don't hear from you, I'll assume you're not interested and won't reach out again.</p>

      <p>Best,<br>{{senderName}}</p>
    `,
    text: `
Hi {{firstName}},

I haven't heard back from you, so I'm assuming this isn't a priority for {{company.name}} right now.

Before I close your file, I wanted to give you one last chance to let me know if you'd like to explore this further.

If I don't hear from you, I'll assume you're not interested and won't reach out again.

Best,
{{senderName}}
    `,
    variables: ['firstName', 'company.name', 'senderName'],
    tags: ['breakup', 'final', 'closing'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

/**
 * Get template by ID
 */
export function getColdEmailTemplate(id: string): ColdEmailTemplate | null {
  return DEFAULT_TEMPLATES.find((t) => t.id === id) || null
}

/**
 * List all templates
 */
export function listColdEmailTemplates(category?: ColdEmailTemplate['category']): ColdEmailTemplate[] {
  if (category) {
    return DEFAULT_TEMPLATES.filter((t) => t.category === category)
  }
  return DEFAULT_TEMPLATES
}
