/**
 * RED Tests: workers/ai extract() method
 *
 * These tests define the contract for the AIDO.extract() method which extracts
 * structured data from unstructured text using AI.
 *
 * Per README.md:
 * - extract<T>(text, schema, options?) extracts structured data from text
 * - Schema can use simple notation: { name: 'string', age: 'number', company: 'string?' }
 * - Optional fields are marked with '?' suffix
 * - Supports union types: 'low | medium | high'
 *
 * RED PHASE: These tests MUST FAIL because AIDO.extract() is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-thmr5).
 *
 * @see workers/ai/README.md
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockAIEnv, type SimpleSchema, type ExtractOptions } from './helpers.js'

/**
 * Interface definition for AIDO - this defines the contract
 * The implementation must satisfy this interface
 */
export interface AIDOContract {
  extract<T extends Record<string, unknown>>(
    text: string,
    schema: SimpleSchema,
    options?: ExtractOptions
  ): Promise<T>
}

/**
 * Attempt to load AIDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadAIDO(): Promise<new (ctx: MockDOState, env: MockAIEnv) => AIDOContract> {
  // This dynamic import will fail because src/ai.js doesn't exist yet
  const module = await import('../src/ai.js')
  return module.AIDO
}

describe('AIDO.extract() - Text Extraction with Schema', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    AIDO = await loadAIDO()
  })

  describe('basic extraction', () => {
    it('should extract a simple object from text', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'John Smith is a software engineer at Acme Corp.'
      const schema: SimpleSchema = {
        name: 'string',
        role: 'string',
        company: 'string',
      }

      const result = await instance.extract<{ name: string; role: string; company: string }>(text, schema)

      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('role')
      expect(result).toHaveProperty('company')
      expect(typeof result.name).toBe('string')
      expect(typeof result.role).toBe('string')
      expect(typeof result.company).toBe('string')
    })

    it('should extract multiple fields from an email', async () => {
      const instance = new AIDO(ctx, env)
      const text = `
        From: Jane Doe <jane.doe@example.com>
        Subject: Urgent: Q4 Budget Review

        Hi Team,
        Please review the attached budget proposal for Q4.
        Best regards,
        Jane
      `
      const schema: SimpleSchema = {
        senderName: 'string',
        senderEmail: 'string',
        subject: 'string',
      }

      const result = await instance.extract<{
        senderName: string
        senderEmail: string
        subject: string
      }>(text, schema)

      expect(result.senderName).toBeDefined()
      expect(result.senderEmail).toMatch(/@/)
      expect(result.subject).toBeDefined()
    })

    it('should extract numeric values correctly', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'The product costs $49.99 and we have 150 units in stock.'
      const schema: SimpleSchema = {
        price: 'number',
        quantity: 'number',
      }

      const result = await instance.extract<{ price: number; quantity: number }>(text, schema)

      expect(typeof result.price).toBe('number')
      expect(typeof result.quantity).toBe('number')
      expect(result.price).toBeCloseTo(49.99, 1)
      expect(result.quantity).toBe(150)
    })

    it('should extract boolean values', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'The user has agreed to the terms and conditions but has not verified their email.'
      const schema: SimpleSchema = {
        agreedToTerms: 'boolean',
        emailVerified: 'boolean',
      }

      const result = await instance.extract<{ agreedToTerms: boolean; emailVerified: boolean }>(text, schema)

      expect(typeof result.agreedToTerms).toBe('boolean')
      expect(typeof result.emailVerified).toBe('boolean')
      expect(result.agreedToTerms).toBe(true)
      expect(result.emailVerified).toBe(false)
    })
  })

  describe('optional fields', () => {
    it('should handle optional fields with ? suffix', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Contact John at john@example.com'
      const schema: SimpleSchema = {
        name: 'string',
        email: 'string',
        phone: 'string?', // Optional field
      }

      const result = await instance.extract<{
        name: string
        email: string
        phone?: string
      }>(text, schema)

      expect(result.name).toBeDefined()
      expect(result.email).toBeDefined()
      // phone should be undefined or not present since it's not in the text
      expect(result.phone).toBeUndefined()
    })

    it('should include optional fields when present in text', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Contact John at john@example.com or call 555-1234'
      const schema: SimpleSchema = {
        name: 'string',
        email: 'string',
        phone: 'string?',
      }

      const result = await instance.extract<{
        name: string
        email: string
        phone?: string
      }>(text, schema)

      expect(result.name).toBeDefined()
      expect(result.email).toBeDefined()
      expect(result.phone).toBeDefined()
      expect(result.phone).toMatch(/555/)
    })

    it('should handle multiple optional fields', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'New user registered: alice'
      const schema: SimpleSchema = {
        username: 'string',
        fullName: 'string?',
        avatar: 'string?',
        bio: 'string?',
      }

      const result = await instance.extract<{
        username: string
        fullName?: string
        avatar?: string
        bio?: string
      }>(text, schema)

      expect(result.username).toBe('alice')
      // All optional fields should be undefined
      expect(result.fullName).toBeUndefined()
      expect(result.avatar).toBeUndefined()
      expect(result.bio).toBeUndefined()
    })

    it('should handle optional number fields', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Product: Widget'
      const schema: SimpleSchema = {
        productName: 'string',
        price: 'number?',
        stock: 'number?',
      }

      const result = await instance.extract<{
        productName: string
        price?: number
        stock?: number
      }>(text, schema)

      expect(result.productName).toBe('Widget')
      expect(result.price).toBeUndefined()
      expect(result.stock).toBeUndefined()
    })
  })

  describe('nested object extraction', () => {
    it('should extract nested address object', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Ship to: John Doe, 123 Main Street, San Francisco, CA 94102'
      const schema: SimpleSchema = {
        'recipient': 'string',
        'address.street': 'string',
        'address.city': 'string',
        'address.state': 'string',
        'address.zip': 'string',
      }

      const result = await instance.extract<{
        recipient: string
        address: {
          street: string
          city: string
          state: string
          zip: string
        }
      }>(text, schema)

      expect(result.recipient).toBeDefined()
      expect(result.address).toBeDefined()
      expect(result.address.street).toBeDefined()
      expect(result.address.city).toBeDefined()
      expect(result.address.state).toBeDefined()
      expect(result.address.zip).toBeDefined()
    })

    it('should extract deeply nested objects', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Order #12345 from Acme Corp (contact: bob@acme.com) for 5 units of Widget Pro at $99.99 each'
      const schema: SimpleSchema = {
        'order.id': 'string',
        'order.customer.name': 'string',
        'order.customer.email': 'string',
        'order.items.name': 'string',
        'order.items.quantity': 'number',
        'order.items.price': 'number',
      }

      const result = await instance.extract<{
        order: {
          id: string
          customer: {
            name: string
            email: string
          }
          items: {
            name: string
            quantity: number
            price: number
          }
        }
      }>(text, schema)

      expect(result.order.id).toBe('12345')
      expect(result.order.customer.name).toBe('Acme Corp')
      expect(result.order.customer.email).toBe('bob@acme.com')
      expect(result.order.items.quantity).toBe(5)
    })

    it('should handle optional nested fields', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'User profile: John Doe, member since 2020'
      const schema: SimpleSchema = {
        'name': 'string',
        'memberSince': 'number',
        'preferences.theme': 'string?',
        'preferences.notifications': 'boolean?',
      }

      const result = await instance.extract<{
        name: string
        memberSince: number
        preferences?: {
          theme?: string
          notifications?: boolean
        }
      }>(text, schema)

      expect(result.name).toBe('John Doe')
      expect(result.memberSince).toBe(2020)
      // Optional nested fields should be undefined or not present
    })
  })

  describe('array field extraction', () => {
    it('should extract array of strings', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Tags: javascript, typescript, react, nodejs'
      const schema: SimpleSchema = {
        tags: 'string[]',
      }

      const result = await instance.extract<{ tags: string[] }>(text, schema)

      expect(Array.isArray(result.tags)).toBe(true)
      expect(result.tags.length).toBeGreaterThan(0)
      expect(result.tags).toContain('javascript')
      expect(result.tags).toContain('typescript')
    })

    it('should extract array of numbers', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Scores: 95, 87, 92, 78, 88'
      const schema: SimpleSchema = {
        scores: 'number[]',
      }

      const result = await instance.extract<{ scores: number[] }>(text, schema)

      expect(Array.isArray(result.scores)).toBe(true)
      expect(result.scores.length).toBe(5)
      expect(result.scores).toContain(95)
      expect(result.scores.every(s => typeof s === 'number')).toBe(true)
    })

    it('should extract empty array when no items found', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'No items listed here'
      const schema: SimpleSchema = {
        items: 'string[]?', // Optional array
      }

      const result = await instance.extract<{ items?: string[] }>(text, schema)

      // Should return undefined or empty array for optional missing array
      expect(result.items === undefined || (Array.isArray(result.items) && result.items.length === 0)).toBe(true)
    })

    it('should extract array with nested objects', async () => {
      const instance = new AIDO(ctx, env)
      const text = `
        Team members:
        - Alice (alice@team.com) - Engineer
        - Bob (bob@team.com) - Designer
        - Charlie (charlie@team.com) - PM
      `
      const schema: SimpleSchema = {
        'members[].name': 'string',
        'members[].email': 'string',
        'members[].role': 'string',
      }

      const result = await instance.extract<{
        members: Array<{ name: string; email: string; role: string }>
      }>(text, schema)

      expect(Array.isArray(result.members)).toBe(true)
      expect(result.members.length).toBe(3)
      expect(result.members[0]).toHaveProperty('name')
      expect(result.members[0]).toHaveProperty('email')
      expect(result.members[0]).toHaveProperty('role')
    })

    it('should extract mixed array with optional fields', async () => {
      const instance = new AIDO(ctx, env)
      const text = `
        Products:
        1. Widget ($29.99, in stock)
        2. Gadget ($49.99)
        3. Gizmo ($19.99, in stock)
      `
      const schema: SimpleSchema = {
        'products[].name': 'string',
        'products[].price': 'number',
        'products[].inStock': 'boolean?',
      }

      const result = await instance.extract<{
        products: Array<{ name: string; price: number; inStock?: boolean }>
      }>(text, schema)

      expect(Array.isArray(result.products)).toBe(true)
      expect(result.products.length).toBe(3)
      // First product should have inStock = true
      expect(result.products[0].inStock).toBe(true)
      // Second product may have inStock undefined
    })

    it('should handle array of union types', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Priority levels used: high, low, medium, critical'
      const schema: SimpleSchema = {
        priorities: '(low | medium | high | critical)[]',
      }

      const result = await instance.extract<{
        priorities: Array<'low' | 'medium' | 'high' | 'critical'>
      }>(text, schema)

      expect(Array.isArray(result.priorities)).toBe(true)
      expect(result.priorities.every(p => ['low', 'medium', 'high', 'critical'].includes(p))).toBe(true)
    })
  })

  describe('union types', () => {
    it('should extract enum-like union types', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'URGENT: Server is down! Priority: Critical'
      const schema: SimpleSchema = {
        message: 'string',
        priority: 'low | medium | high | critical',
      }

      const result = await instance.extract<{
        message: string
        priority: 'low' | 'medium' | 'high' | 'critical'
      }>(text, schema)

      expect(result.message).toBeDefined()
      expect(['low', 'medium', 'high', 'critical']).toContain(result.priority)
      expect(result.priority).toBe('critical')
    })

    it('should handle optional union types', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'New ticket created'
      const schema: SimpleSchema = {
        description: 'string',
        severity: 'low | medium | high?',
      }

      const result = await instance.extract<{
        description: string
        severity?: 'low' | 'medium' | 'high'
      }>(text, schema)

      expect(result.description).toBeDefined()
      // severity should be undefined since no severity mentioned
    })

    it('should normalize union type values', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'The task status is: IN PROGRESS'
      const schema: SimpleSchema = {
        status: 'pending | in_progress | completed | cancelled',
      }

      const result = await instance.extract<{
        status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      }>(text, schema)

      // Should normalize "IN PROGRESS" to "in_progress"
      expect(result.status).toBe('in_progress')
    })
  })

  describe('invalid schema handling', () => {
    it('should throw error for null schema', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Some text'

      await expect(
        instance.extract(text, null as unknown as SimpleSchema)
      ).rejects.toThrow(/schema|null|invalid/i)
    })

    it('should throw error for undefined schema', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Some text'

      await expect(
        instance.extract(text, undefined as unknown as SimpleSchema)
      ).rejects.toThrow(/schema|undefined|invalid/i)
    })

    it('should throw error for empty schema object', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Some text'
      const schema: SimpleSchema = {}

      await expect(
        instance.extract(text, schema)
      ).rejects.toThrow(/schema|empty|invalid/i)
    })

    it('should throw error for invalid type in schema', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Some text'
      const schema: SimpleSchema = {
        name: 'invalidType',
      }

      await expect(
        instance.extract(text, schema)
      ).rejects.toThrow(/type|invalid|unknown/i)
    })

    it('should throw error for null text', async () => {
      const instance = new AIDO(ctx, env)
      const schema: SimpleSchema = { name: 'string' }

      await expect(
        instance.extract(null as unknown as string, schema)
      ).rejects.toThrow(/text|null|invalid/i)
    })

    it('should throw error for undefined text', async () => {
      const instance = new AIDO(ctx, env)
      const schema: SimpleSchema = { name: 'string' }

      await expect(
        instance.extract(undefined as unknown as string, schema)
      ).rejects.toThrow(/text|undefined|invalid/i)
    })

    it('should throw error for non-string text', async () => {
      const instance = new AIDO(ctx, env)
      const schema: SimpleSchema = { name: 'string' }

      await expect(
        instance.extract(12345 as unknown as string, schema)
      ).rejects.toThrow(/text|string|invalid/i)
    })

    it('should handle malformed union type syntax', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Some text'
      const schema: SimpleSchema = {
        status: '|bad||syntax|',  // Malformed union syntax
      }

      await expect(
        instance.extract(text, schema)
      ).rejects.toThrow(/union|syntax|invalid|malformed/i)
    })

    it('should handle schema with invalid nested path', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Some text'
      const schema: SimpleSchema = {
        '': 'string', // Empty key
      }

      await expect(
        instance.extract(text, schema)
      ).rejects.toThrow(/key|path|empty|invalid/i)
    })

    it('should handle conflicting schema paths', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Name: John'
      const schema: SimpleSchema = {
        'user': 'string',
        'user.name': 'string', // Conflict: user is both string and object
      }

      await expect(
        instance.extract(text, schema)
      ).rejects.toThrow(/conflict|path|schema|invalid/i)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty text gracefully', async () => {
      const instance = new AIDO(ctx, env)
      const text = ''
      const schema: SimpleSchema = {
        name: 'string?',
        value: 'number?',
      }

      const result = await instance.extract<{ name?: string; value?: number }>(text, schema)

      // All optional fields should be undefined for empty text
      expect(result.name).toBeUndefined()
      expect(result.value).toBeUndefined()
    })

    it('should throw error for missing required fields in strict mode', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Random text without the required data'
      const schema: SimpleSchema = {
        requiredField: 'string',
      }

      await expect(
        instance.extract(text, schema, { strict: true })
      ).rejects.toThrow(/required|missing|extract/i)
    })

    it('should return partial data for missing required fields in non-strict mode', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Just some text'
      const schema: SimpleSchema = {
        name: 'string',
        email: 'string',
      }

      // In non-strict mode, should attempt to extract what it can
      const result = await instance.extract<{ name: string; email: string }>(text, schema)

      // Should not throw, but may have empty/default values
      expect(result).toBeDefined()
    })

    it('should handle very long text', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Important info: name is John. '.repeat(1000) + 'Email is john@example.com'
      const schema: SimpleSchema = {
        name: 'string',
        email: 'string',
      }

      const result = await instance.extract<{ name: string; email: string }>(text, schema)

      expect(result.name).toBeDefined()
      expect(result.email).toContain('@')
    })

    it('should handle special characters in extracted values', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Company: O\'Reilly & Associates, Ltd. Email: contact@o-reilly.co.uk'
      const schema: SimpleSchema = {
        company: 'string',
        email: 'string',
      }

      const result = await instance.extract<{ company: string; email: string }>(text, schema)

      expect(result.company).toContain("O'Reilly")
      expect(result.email).toBe('contact@o-reilly.co.uk')
    })

    it('should handle unicode text', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Name: Nguyen Van Anh, City: Ho Chi Minh'
      const schema: SimpleSchema = {
        name: 'string',
        city: 'string',
      }

      const result = await instance.extract<{ name: string; city: string }>(text, schema)

      expect(result.name).toBeDefined()
      expect(result.city).toBeDefined()
    })
  })

  describe('model selection', () => {
    it('should use default model when not specified', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Test data'
      const schema: SimpleSchema = { value: 'string' }

      await instance.extract(text, schema)

      // Verify the LLM was called (implementation detail - would check mock)
      expect(env.AI.run).toHaveBeenCalled()
    })

    it('should use specified model', async () => {
      const instance = new AIDO(ctx, env)
      const text = 'Test data'
      const schema: SimpleSchema = { value: 'string' }

      await instance.extract(text, schema, { model: '@cf/meta/llama-3.1-8b-instruct' })

      expect(env.AI.run).toHaveBeenCalledWith(
        '@cf/meta/llama-3.1-8b-instruct',
        expect.anything()
      )
    })
  })
})

describe('AIDO.extract() - Real-world Examples', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  it('should extract contact information from business card text', async () => {
    const instance = new AIDO(ctx, env)
    const text = `
      Jane Smith
      Senior Product Manager
      Acme Technologies Inc.
      jane.smith@acme.tech
      +1 (555) 123-4567
      San Francisco, CA
    `
    const schema: SimpleSchema = {
      name: 'string',
      title: 'string',
      company: 'string',
      email: 'string',
      phone: 'string',
      location: 'string?',
    }

    const result = await instance.extract<{
      name: string
      title: string
      company: string
      email: string
      phone: string
      location?: string
    }>(text, schema)

    expect(result.name).toBe('Jane Smith')
    expect(result.title).toContain('Product Manager')
    expect(result.company).toContain('Acme')
    expect(result.email).toBe('jane.smith@acme.tech')
    expect(result.phone).toMatch(/555/)
  })

  it('should extract order details from confirmation email', async () => {
    const instance = new AIDO(ctx, env)
    const text = `
      Order Confirmation #ORD-2024-78901

      Thank you for your purchase!

      Items:
      - 2x Widget Pro ($29.99 each)
      - 1x Gadget Plus ($49.99)

      Subtotal: $109.97
      Shipping: $5.99
      Tax: $9.90
      Total: $125.86

      Shipping to:
      John Doe
      456 Oak Avenue
      Boston, MA 02101
    `
    const schema: SimpleSchema = {
      orderId: 'string',
      subtotal: 'number',
      shipping: 'number',
      tax: 'number',
      total: 'number',
      'shippingAddress.name': 'string',
      'shippingAddress.city': 'string',
      'shippingAddress.state': 'string',
    }

    const result = await instance.extract<{
      orderId: string
      subtotal: number
      shipping: number
      tax: number
      total: number
      shippingAddress: {
        name: string
        city: string
        state: string
      }
    }>(text, schema)

    expect(result.orderId).toContain('78901')
    expect(result.total).toBeCloseTo(125.86, 1)
    expect(result.shippingAddress.city).toBe('Boston')
  })

  it('should extract support ticket information', async () => {
    const instance = new AIDO(ctx, env)
    const text = `
      Ticket #TKT-9876
      Priority: High
      Status: Open

      Customer: Alice Johnson (alice@customer.com)
      Issue: Unable to login after password reset

      Steps to reproduce:
      1. Click forgot password
      2. Enter email
      3. Click reset link
      4. Enter new password
      5. Try to login - fails with "invalid credentials"
    `
    const schema: SimpleSchema = {
      ticketId: 'string',
      priority: 'low | medium | high | critical',
      status: 'open | in_progress | resolved | closed',
      'customer.name': 'string',
      'customer.email': 'string',
      issue: 'string',
    }

    const result = await instance.extract<{
      ticketId: string
      priority: 'low' | 'medium' | 'high' | 'critical'
      status: 'open' | 'in_progress' | 'resolved' | 'closed'
      customer: {
        name: string
        email: string
      }
      issue: string
    }>(text, schema)

    expect(result.ticketId).toContain('9876')
    expect(result.priority).toBe('high')
    expect(result.status).toBe('open')
    expect(result.customer.email).toBe('alice@customer.com')
    expect(result.issue).toContain('login')
  })

  it('should extract meeting details from calendar invite', async () => {
    const instance = new AIDO(ctx, env)
    const text = `
      Meeting: Q4 Planning Session
      Date: December 15, 2024
      Time: 2:00 PM - 4:00 PM EST
      Location: Conference Room A / Zoom

      Attendees:
      - John (required)
      - Jane (required)
      - Bob (optional)

      Agenda:
      Review Q3 results and set Q4 objectives
    `
    const schema: SimpleSchema = {
      title: 'string',
      date: 'string',
      startTime: 'string',
      endTime: 'string',
      location: 'string',
      isVirtual: 'boolean',
      agenda: 'string?',
    }

    const result = await instance.extract<{
      title: string
      date: string
      startTime: string
      endTime: string
      location: string
      isVirtual: boolean
      agenda?: string
    }>(text, schema)

    expect(result.title).toContain('Q4')
    expect(result.date).toContain('December')
    expect(result.isVirtual).toBe(true) // Has Zoom
    expect(result.agenda).toBeDefined()
  })
})
