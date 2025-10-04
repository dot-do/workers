import { describe, it, expect } from 'vitest'
import {
  replaceVariables,
  injectTrackingPixel,
  trackLinks,
  injectUnsubscribeLink,
  processColdEmail,
  extractVariables,
  validateVariables,
  getColdEmailTemplate,
  listColdEmailTemplates,
  type ColdEmailOptions,
} from '../src/cold-email'
import type { EmailMessage } from '../src/types'

describe('Cold Email Functions', () => {
  describe('replaceVariables', () => {
    it('should replace simple variables', () => {
      const template = 'Hello {{firstName}}, welcome to {{company}}!'
      const variables = { firstName: 'John', company: 'Acme' }
      const result = replaceVariables(template, variables)
      expect(result).toBe('Hello John, welcome to Acme!')
    })

    it('should replace nested variables', () => {
      const template = 'Hi {{firstName}}, I noticed {{company.name}} is hiring'
      const variables = { firstName: 'John', company: { name: 'Acme Corp' } }
      const result = replaceVariables(template, variables as any)
      expect(result).toBe('Hi John, I noticed Acme Corp is hiring')
    })

    it('should leave undefined variables unchanged', () => {
      const template = 'Hello {{firstName}}, your role is {{title}}'
      const variables = { firstName: 'John' }
      const result = replaceVariables(template, variables)
      expect(result).toBe('Hello John, your role is {{title}}')
    })
  })

  describe('injectTrackingPixel', () => {
    it('should inject before </body> tag', () => {
      const html = '<html><body>Content</body></html>'
      const trackingUrl = 'https://track.example.com/pixel.gif'
      const result = injectTrackingPixel(html, trackingUrl)
      expect(result).toContain('<img src="https://track.example.com/pixel.gif"')
      expect(result).toContain('</body>')
      expect(result.indexOf('<img')).toBeLessThan(result.indexOf('</body>'))
    })

    it('should append to end if no </body> tag', () => {
      const html = '<p>Content</p>'
      const trackingUrl = 'https://track.example.com/pixel.gif'
      const result = injectTrackingPixel(html, trackingUrl)
      expect(result).toContain('<img src="https://track.example.com/pixel.gif"')
      expect(result).toEndWith('"/>')
    })
  })

  describe('trackLinks', () => {
    it('should track all links', () => {
      const html = `
        <p>Check out <a href="https://example.com">our website</a>
        and <a href="https://blog.example.com">blog</a>!</p>
      `
      const tracked = trackLinks(html, 'https://track.services.do', 'contact-123', 'campaign-456')

      expect(tracked.html).toContain('track.services.do/track/click')
      expect(tracked.html).toContain('contact=contact-123')
      expect(tracked.html).toContain('campaign=campaign-456')
      expect(tracked.trackedLinks).toHaveLength(2)
      expect(tracked.trackedLinks).toContain('https://example.com')
      expect(tracked.trackedLinks).toContain('https://blog.example.com')
    })

    it('should not track mailto links', () => {
      const html = '<a href="mailto:test@example.com">Email us</a>'
      const tracked = trackLinks(html, 'https://track.services.do', 'contact-123', 'campaign-456')

      expect(tracked.html).not.toContain('track.services.do')
      expect(tracked.trackedLinks).toHaveLength(0)
    })

    it('should not track unsubscribe links', () => {
      const html = '<a href="https://example.com/unsubscribe">Unsubscribe</a>'
      const tracked = trackLinks(html, 'https://track.services.do', 'contact-123', 'campaign-456')

      expect(tracked.html).not.toContain('track.services.do')
      expect(tracked.trackedLinks).toHaveLength(0)
    })
  })

  describe('injectUnsubscribeLink', () => {
    it('should add unsubscribe to HTML and text', () => {
      const html = '<p>Email content</p>'
      const text = 'Email content'
      const unsubscribeUrl = 'https://example.com/unsubscribe'
      const result = injectUnsubscribeLink(html, text, unsubscribeUrl)

      expect(result.html).toContain('unsubscribe here')
      expect(result.html).toContain(unsubscribeUrl)
      expect(result.text).toContain('unsubscribe here')
      expect(result.text).toContain(unsubscribeUrl)
    })

    it('should inject before </body> if present', () => {
      const html = '<html><body>Content</body></html>'
      const text = 'Content'
      const unsubscribeUrl = 'https://example.com/unsubscribe'
      const result = injectUnsubscribeLink(html, text, unsubscribeUrl)

      expect(result.html.indexOf('unsubscribe')).toBeLessThan(result.html.indexOf('</body>'))
    })
  })

  describe('extractVariables', () => {
    it('should extract all variables from template', () => {
      const template = 'Hi {{firstName}}, welcome to {{company.name}}! Your role is {{title}}.'
      const variables = extractVariables(template)

      expect(variables).toHaveLength(3)
      expect(variables).toContain('firstName')
      expect(variables).toContain('company.name')
      expect(variables).toContain('title')
    })

    it('should not duplicate variables', () => {
      const template = 'Hi {{firstName}}, {{firstName}} is a great name!'
      const variables = extractVariables(template)

      expect(variables).toHaveLength(1)
      expect(variables).toContain('firstName')
    })
  })

  describe('validateVariables', () => {
    it('should validate all variables are provided', () => {
      const template = 'Hi {{firstName}}, welcome to {{company}}!'
      const variables = { firstName: 'John', company: 'Acme' }
      const validation = validateVariables(template, variables)

      expect(validation.valid).toBe(true)
      expect(validation.missing).toHaveLength(0)
    })

    it('should detect missing variables', () => {
      const template = 'Hi {{firstName}}, your role is {{title}}'
      const variables = { firstName: 'John' }
      const validation = validateVariables(template, variables)

      expect(validation.valid).toBe(false)
      expect(validation.missing).toHaveLength(1)
      expect(validation.missing).toContain('title')
    })

    it('should validate nested variables', () => {
      const template = 'Hi {{firstName}}, welcome to {{company.name}}'
      const variables = { firstName: 'John', company: { name: 'Acme' } }
      const validation = validateVariables(template, variables as any)

      expect(validation.valid).toBe(true)
      expect(validation.missing).toHaveLength(0)
    })
  })

  describe('processColdEmail', () => {
    it('should process complete cold email', () => {
      const message: EmailMessage = {
        to: 'recipient@example.com',
        from: 'sender@yourdomain.com',
        subject: 'Hello {{firstName}}',
        html: '<p>Hi {{firstName}}, check out <a href="https://example.com">our site</a>!</p>',
        text: 'Hi {{firstName}}, check out our site: https://example.com',
      }

      const options: ColdEmailOptions = {
        contactId: 'contact-123',
        campaignId: 'campaign-456',
        domainId: 'domain-789',
        variables: { firstName: 'John' },
        trackOpens: true,
        trackClicks: true,
        unsubscribeUrl: 'https://example.com/unsubscribe',
        listUnsubscribeHeader: true,
      }

      const result = processColdEmail(message, options, 'https://track.services.do')

      // Variables replaced
      expect(result.message.subject).toBe('Hello John')
      expect(result.message.html).toContain('Hi John')

      // Links tracked
      expect(result.trackedLinks).toHaveLength(1)
      expect(result.message.html).toContain('track.services.do/track/click')

      // Tracking pixel
      expect(result.hasTrackingPixel).toBe(true)
      expect(result.message.html).toContain('track.services.do/track/open')

      // Unsubscribe
      expect(result.hasUnsubscribeLink).toBe(true)
      expect(result.message.html).toContain('unsubscribe')
      expect(result.message.headers?.['List-Unsubscribe']).toBeDefined()

      // Metadata
      expect(result.message.tags?.contactId).toBe('contact-123')
      expect(result.message.tags?.campaignId).toBe('campaign-456')
    })
  })

  describe('templates', () => {
    it('should get template by ID', () => {
      const template = getColdEmailTemplate('intro-pain-point')
      expect(template).toBeDefined()
      expect(template?.name).toBe('Introduction - Pain Point')
      expect(template?.category).toBe('introduction')
    })

    it('should return null for unknown template', () => {
      const template = getColdEmailTemplate('unknown-template')
      expect(template).toBeNull()
    })

    it('should list all templates', () => {
      const templates = listColdEmailTemplates()
      expect(templates.length).toBeGreaterThan(0)
      expect(templates.every((t) => t.id && t.name && t.category)).toBe(true)
    })

    it('should filter templates by category', () => {
      const followUpTemplates = listColdEmailTemplates('follow-up')
      expect(followUpTemplates.length).toBeGreaterThan(0)
      expect(followUpTemplates.every((t) => t.category === 'follow-up')).toBe(true)
    })
  })
})
