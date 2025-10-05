/**
 * AI Code Generation Tests - Track D Phase 7 Universal API
 *
 * Tests for AI-powered API code generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  analyzeIntegrationRequirements,
  generateAPICode,
  validateGeneratedCode,
  hashArguments,
  type IntegrationRequirements,
  type GeneratedAPICode,
  type CodeValidation,
} from '../src/ai'

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  }
})

describe('AI Code Generation', () => {
  let mockEnv: any
  let mockAnthropic: any

  beforeEach(async () => {
    mockEnv = {
      ANTHROPIC_API_KEY: 'sk-ant-test-key',
    }

    // Reset mocks
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    mockAnthropic = new Anthropic({ apiKey: mockEnv.ANTHROPIC_API_KEY })
    vi.clearAllMocks()
  })

  describe('analyzeIntegrationRequirements', () => {
    it('should analyze Stripe payment request', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              provider: 'stripe',
              method: 'createPaymentIntent',
              arguments: {
                customer: 'cus_123',
                amount: 5000,
                currency: 'usd',
                description: 'Order #123',
              },
              confidence: 0.95,
              reasoning: 'User requested to charge a customer, which requires Stripe payment intent',
            }),
          },
        ],
      })

      const requirements = await analyzeIntegrationRequirements('charge customer cus_123 $50 for order #123', ['stripe', 'github'], mockEnv)

      expect(requirements).toBeDefined()
      expect(requirements.provider).toBe('stripe')
      expect(requirements.method).toBe('createPaymentIntent')
      expect(requirements.arguments.customer).toBe('cus_123')
      expect(requirements.arguments.amount).toBe(5000)
      expect(requirements.confidence).toBeGreaterThan(0.9)
    })

    it('should analyze GitHub repository creation request', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              provider: 'github',
              method: 'createRepository',
              arguments: {
                name: 'my-new-repo',
                description: 'Test repository',
                private: true,
              },
              confidence: 0.92,
              reasoning: 'User requested to create a repository on GitHub',
            }),
          },
        ],
      })

      const requirements = await analyzeIntegrationRequirements('create a private GitHub repository called my-new-repo', ['stripe', 'github'], mockEnv)

      expect(requirements.provider).toBe('github')
      expect(requirements.method).toBe('createRepository')
      expect(requirements.arguments.name).toBe('my-new-repo')
      expect(requirements.arguments.private).toBe(true)
    })

    it('should handle AI response parsing errors', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Invalid JSON response' }],
      })

      await expect(analyzeIntegrationRequirements('test request', ['stripe'], mockEnv)).rejects.toThrow('Failed to analyze integration requirements')
    })
  })

  describe('generateAPICode', () => {
    it('should generate Stripe payment code', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: `async function callAPI(accessToken: string, args: any): Promise<any> {
  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${accessToken}\`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(args).toString(),
  });

  if (!response.ok) {
    return { success: false, error: await response.text() };
  }

  return { success: true, data: await response.json() };
}`,
              imports: [],
              exports: 'export { callAPI }',
              description: 'Creates a Stripe payment intent',
              warnings: ['Ensure amount is in cents (smallest currency unit)'],
            }),
          },
        ],
      })

      const requirements: IntegrationRequirements = {
        provider: 'stripe',
        method: 'createPaymentIntent',
        arguments: { customer: 'cus_123', amount: 5000 },
        confidence: 0.95,
        reasoning: 'Payment request',
      }

      const integration = {
        base_url: 'https://api.stripe.com',
      }

      const code = await generateAPICode(requirements, integration, mockEnv)

      expect(code).toBeDefined()
      expect(code.code).toContain('async function callAPI')
      expect(code.code).toContain('fetch')
      expect(code.code).toContain('Authorization')
      expect(code.description).toContain('payment intent')
      expect(code.warnings).toBeDefined()
    })

    it('should generate GitHub repository creation code', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: `async function callAPI(accessToken: string, args: any): Promise<any> {
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${accessToken}\`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    return { success: false, error: await response.text() };
  }

  return { success: true, data: await response.json() };
}`,
              imports: [],
              exports: 'export { callAPI }',
              description: 'Creates a GitHub repository',
              warnings: [],
            }),
          },
        ],
      })

      const requirements: IntegrationRequirements = {
        provider: 'github',
        method: 'createRepository',
        arguments: { name: 'test-repo', private: true },
        confidence: 0.92,
        reasoning: 'Repository creation',
      }

      const integration = {
        base_url: 'https://api.github.com',
      }

      const code = await generateAPICode(requirements, integration, mockEnv)

      expect(code.code).toContain('https://api.github.com')
      expect(code.code).toContain('POST')
      expect(code.description).toContain('repository')
    })

    it('should handle AI response parsing errors', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Invalid JSON' }],
      })

      const requirements: IntegrationRequirements = {
        provider: 'stripe',
        method: 'test',
        arguments: {},
        confidence: 0.9,
        reasoning: 'test',
      }

      await expect(generateAPICode(requirements, {}, mockEnv)).rejects.toThrow('Failed to generate API code')
    })
  })

  describe('validateGeneratedCode', () => {
    it('should validate secure code', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              isValid: true,
              errors: [],
              warnings: ['Consider adding timeout to fetch request'],
              suggestions: ['Add retry logic for network failures'],
            }),
          },
        ],
      })

      const code = `async function callAPI(accessToken: string, args: any): Promise<any> {
  const response = await fetch('https://api.example.com/endpoint', {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${accessToken}\` },
    body: JSON.stringify(args),
  });
  return { success: response.ok, data: await response.json() };
}`

      const validation = await validateGeneratedCode(code, mockEnv)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.warnings).toBeDefined()
      expect(validation.suggestions).toBeDefined()
    })

    it('should detect security issues', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              isValid: false,
              errors: ['Uses eval() which is a security risk', 'SQL injection vulnerability detected'],
              warnings: [],
              suggestions: ['Remove eval() and use safe alternatives', 'Use parameterized queries'],
            }),
          },
        ],
      })

      const unsafeCode = `async function callAPI(token, sql) {
  eval(token);
  const result = await db.query("SELECT * FROM users WHERE id = " + sql);
  return result;
}`

      const validation = await validateGeneratedCode(unsafeCode, mockEnv)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors.some((e) => e.toLowerCase().includes('eval'))).toBe(true)
    })

    it('should detect syntax errors', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              isValid: false,
              errors: ['Missing closing brace', 'Unexpected token'],
              warnings: [],
              suggestions: ['Fix syntax errors before execution'],
            }),
          },
        ],
      })

      const syntaxError = 'async function callAPI( { return "incomplete'

      const validation = await validateGeneratedCode(syntaxError, mockEnv)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should handle validation errors gracefully', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Not valid JSON' }],
      })

      await expect(validateGeneratedCode('test code', mockEnv)).rejects.toThrow('Failed to validate generated code')
    })
  })

  describe('hashArguments', () => {
    it('should generate consistent hash for same arguments', async () => {
      const args1 = { customer: 'cus_123', amount: 5000, currency: 'usd' }
      const args2 = { customer: 'cus_123', amount: 5000, currency: 'usd' }

      const hash1 = await hashArguments(args1)
      const hash2 = await hashArguments(args2)

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex format
    })

    it('should generate different hashes for different arguments', async () => {
      const args1 = { customer: 'cus_123', amount: 5000 }
      const args2 = { customer: 'cus_456', amount: 5000 }

      const hash1 = await hashArguments(args1)
      const hash2 = await hashArguments(args2)

      expect(hash1).not.toBe(hash2)
    })

    it('should be order-independent (same hash regardless of key order)', async () => {
      const args1 = { amount: 5000, customer: 'cus_123', currency: 'usd' }
      const args2 = { currency: 'usd', customer: 'cus_123', amount: 5000 }

      const hash1 = await hashArguments(args1)
      const hash2 = await hashArguments(args2)

      expect(hash1).toBe(hash2)
    })

    it('should handle empty arguments', async () => {
      const hash = await hashArguments({})
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should handle nested objects', async () => {
      const args = {
        customer: 'cus_123',
        metadata: {
          order_id: '123',
          source: 'web',
        },
      }

      const hash = await hashArguments(args)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
