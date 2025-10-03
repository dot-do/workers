/**
 * Email Service Tests
 *
 * Comprehensive tests for email service functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import EmailService from '../src/index'
import { ResendProvider } from '../src/providers/resend'
import { WorkOSProvider } from '../src/providers/workos'
import { renderTemplate, getTemplate, listTemplates } from '../src/templates'
import { generateEmailId, isValidEmail, sanitizeHtml, htmlToText, parseEmailAddress } from '../src/utils'
import type { EmailMessage } from '../src/types'

// ============================================================================
// Provider Tests
// ============================================================================

describe('ResendProvider', () => {
  it('should create provider with API key', () => {
    const provider = new ResendProvider('test-key')
    expect(provider.name).toBe('resend')
  })

  it('should normalize email addresses', () => {
    const provider = new ResendProvider('test-key')
    // @ts-ignore - accessing private method for testing
    expect(provider.normalizeAddress('test@example.com')).toBe('test@example.com')
    // @ts-ignore
    expect(provider.normalizeAddress({ email: 'test@example.com', name: 'Test User' })).toBe('Test User <test@example.com>')
  })

  it('should validate email messages', () => {
    const provider = new ResendProvider('test-key')

    expect(() => {
      // @ts-ignore
      provider.validateMessage({ to: '', from: 'test@example.com', subject: 'Test' })
    }).toThrow('at least one recipient')

    expect(() => {
      // @ts-ignore
      provider.validateMessage({ to: 'test@example.com', from: '', subject: 'Test' })
    }).toThrow('from address')

    expect(() => {
      // @ts-ignore
      provider.validateMessage({ to: 'test@example.com', from: 'test@example.com', subject: '' })
    }).toThrow('subject')

    expect(() => {
      // @ts-ignore
      provider.validateMessage({ to: 'test@example.com', from: 'test@example.com', subject: 'Test' })
    }).toThrow('HTML or text content')
  })
})

describe('WorkOSProvider', () => {
  it('should create provider with API key', () => {
    const provider = new WorkOSProvider('test-key')
    expect(provider.name).toBe('workos')
  })
})

// ============================================================================
// Template Tests
// ============================================================================

describe('Templates', () => {
  it('should list all templates', () => {
    const templates = listTemplates()
    expect(templates.length).toBeGreaterThan(0)
    expect(templates[0]).toHaveProperty('name')
    expect(templates[0]).toHaveProperty('description')
    expect(templates[0]).toHaveProperty('requiredFields')
  })

  it('should get template by name', () => {
    const template = getTemplate('welcome')
    expect(template).not.toBeNull()
    expect(template?.name).toBe('welcome')
  })

  it('should return null for non-existent template', () => {
    const template = getTemplate('non-existent')
    expect(template).toBeNull()
  })

  describe('Welcome Template', () => {
    it('should render welcome email', () => {
      const result = renderTemplate('welcome', {
        name: 'John Doe',
        loginUrl: 'https://example.com/login',
      })

      expect(result.subject).toContain('Welcome')
      expect(result.html).toContain('John Doe')
      expect(result.html).toContain('https://example.com/login')
      expect(result.text).toContain('John Doe')
      expect(result.text).toContain('https://example.com/login')
    })

    it('should throw on missing required fields', () => {
      expect(() => {
        renderTemplate('welcome', { name: 'John Doe' })
      }).toThrow('Missing required fields')
    })
  })

  describe('Password Reset Template', () => {
    it('should render password reset email', () => {
      const result = renderTemplate('password-reset', {
        name: 'John Doe',
        resetUrl: 'https://example.com/reset',
        expiresIn: '1 hour',
      })

      expect(result.subject).toContain('Password')
      expect(result.html).toContain('John Doe')
      expect(result.html).toContain('https://example.com/reset')
      expect(result.html).toContain('1 hour')
    })
  })

  describe('Magic Link Template', () => {
    it('should render magic link email', () => {
      const result = renderTemplate('magic-link', {
        loginUrl: 'https://example.com/magic',
        expiresIn: '15 minutes',
      })

      expect(result.subject).toContain('Login')
      expect(result.html).toContain('https://example.com/magic')
      expect(result.html).toContain('15 minutes')
    })

    it('should include optional name and IP', () => {
      const result = renderTemplate('magic-link', {
        name: 'John Doe',
        loginUrl: 'https://example.com/magic',
        ipAddress: '192.168.1.1',
      })

      expect(result.html).toContain('John Doe')
      expect(result.html).toContain('192.168.1.1')
    })
  })

  describe('API Key Template', () => {
    it('should render API key email', () => {
      const result = renderTemplate('apikey', {
        name: 'John Doe',
        apiKey: 'sk_test_123456',
        createdAt: '2025-10-02',
      })

      expect(result.subject).toContain('API Key')
      expect(result.html).toContain('sk_test_123456')
      expect(result.html).toContain('2025-10-02')
    })
  })

  describe('Invite Template', () => {
    it('should render invite email', () => {
      const result = renderTemplate('invite', {
        inviterName: 'Jane Smith',
        organizationName: 'Acme Corp',
        inviteUrl: 'https://example.com/invite',
        role: 'Admin',
      })

      expect(result.subject).toContain('Acme Corp')
      expect(result.html).toContain('Jane Smith')
      expect(result.html).toContain('Admin')
      expect(result.html).toContain('https://example.com/invite')
    })
  })

  describe('Notification Template', () => {
    it('should render notification email', () => {
      const result = renderTemplate('notification', {
        title: 'New Update',
        message: 'Your account has been updated.',
        actionUrl: 'https://example.com/view',
        actionText: 'View Changes',
      })

      expect(result.subject).toBe('New Update')
      expect(result.html).toContain('Your account has been updated')
      expect(result.html).toContain('https://example.com/view')
      expect(result.html).toContain('View Changes')
    })
  })

  describe('Verification Template', () => {
    it('should render verification email', () => {
      const result = renderTemplate('verification', {
        name: 'John Doe',
        verificationUrl: 'https://example.com/verify',
        code: '123456',
      })

      expect(result.subject).toContain('Verify')
      expect(result.html).toContain('123456')
      expect(result.html).toContain('https://example.com/verify')
    })
  })
})

// ============================================================================
// Utility Tests
// ============================================================================

describe('Utilities', () => {
  describe('generateEmailId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateEmailId()
      const id2 = generateEmailId()
      expect(id1).not.toBe(id2)
      expect(id1.length).toBeGreaterThan(0)
    })
  })

  describe('isValidEmail', () => {
    it('should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user+tag@domain.co.uk')).toBe(true)
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('missing@domain')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
    })
  })

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<p>Hello</p><script>alert("xss")</script>'
      const sanitized = sanitizeHtml(html)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('<p>Hello</p>')
    })

    it('should remove javascript: URLs', () => {
      const html = '<a href="javascript:alert()">Click</a>'
      const sanitized = sanitizeHtml(html)
      expect(sanitized).not.toContain('javascript:')
    })

    it('should remove inline event handlers', () => {
      const html = '<div onclick="alert()">Click me</div>'
      const sanitized = sanitizeHtml(html)
      expect(sanitized).not.toContain('onclick=')
    })
  })

  describe('htmlToText', () => {
    it('should convert HTML to plain text', () => {
      const html = '<p>Hello <strong>world</strong></p><p>Next paragraph</p>'
      const text = htmlToText(html)
      expect(text).toContain('Hello world')
      expect(text).not.toContain('<p>')
      expect(text).not.toContain('<strong>')
    })

    it('should handle HTML entities', () => {
      const html = '&lt;div&gt; &amp; &quot;test&quot;'
      const text = htmlToText(html)
      expect(text).toBe('<div> & "test"')
    })
  })

  describe('parseEmailAddress', () => {
    it('should parse email with name', () => {
      const result = parseEmailAddress('John Doe <john@example.com>')
      expect(result.name).toBe('John Doe')
      expect(result.email).toBe('john@example.com')
    })

    it('should parse plain email', () => {
      const result = parseEmailAddress('john@example.com')
      expect(result.email).toBe('john@example.com')
      expect(result.name).toBeUndefined()
    })
  })
})

// ============================================================================
// Service Tests
// ============================================================================

describe('EmailService', () => {
  let service: EmailService
  let env: any

  beforeEach(() => {
    env = {
      RESEND_API_KEY: 'test-resend-key',
      WORKOS_API_KEY: 'test-workos-key',
      DB: {
        query: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
      },
    }
    service = new EmailService({} as any, env)
  })

  describe('getTemplates', () => {
    it('should return all templates', async () => {
      const templates = await service.getTemplates()
      expect(templates.length).toBeGreaterThan(0)
    })
  })

  describe('getTemplate', () => {
    it('should return specific template', async () => {
      const template = await service.getTemplate('welcome')
      expect(template).not.toBeNull()
      expect(template?.name).toBe('welcome')
    })

    it('should return null for non-existent template', async () => {
      const template = await service.getTemplate('non-existent')
      expect(template).toBeNull()
    })
  })
})
