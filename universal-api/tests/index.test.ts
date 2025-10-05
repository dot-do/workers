/**
 * Universal API Tests - Track E Phase 7
 *
 * Tests for main universal API orchestration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UniversalAPIService, type UniversalAPIEnv, type UniversalAPIRequest } from '../src/index'

// Mock AI module
vi.mock('../src/ai', () => ({
  analyzeIntegrationRequirements: vi.fn(),
  generateAPICode: vi.fn(),
  validateGeneratedCode: vi.fn(),
  hashArguments: vi.fn(),
}))

describe('Universal API Service', () => {
  let service: UniversalAPIService
  let mockEnv: UniversalAPIEnv

  beforeEach(async () => {
    // Create mock environment
    mockEnv = {
      DB: {
        query: vi.fn(),
        getIntegration: vi.fn(),
        getGeneratedCode: vi.fn(),
        saveGeneratedCode: vi.fn(),
        logAPIExecution: vi.fn(),
      },
      AUTH: {
        getUniversalOAuthToken: vi.fn(),
        isUniversalOAuthTokenExpired: vi.fn(),
        refreshUniversalOAuthToken: vi.fn(),
        getUniversalOAuthUrl: vi.fn(),
        exchangeUniversalOAuthCode: vi.fn(),
        storeUniversalOAuthToken: vi.fn(),
      },
      ANTHROPIC_API_KEY: 'sk-ant-test-key',
      ENCRYPTION_SECRET: 'test-encryption-secret',
      ctx: {} as any,
    }

    // Create service instance
    service = new UniversalAPIService({} as any, mockEnv)

    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('callAPI - Full Flow', () => {
    it('should successfully call API with cached code', async () => {
      const ai = await import('../src/ai')

      // Mock database responses
      mockEnv.DB.query.mockResolvedValue({
        rows: [{ provider: 'stripe' }, { provider: 'github' }],
      })

      // Mock AI analysis
      vi.mocked(ai.analyzeIntegrationRequirements).mockResolvedValue({
        provider: 'stripe',
        method: 'createPaymentIntent',
        arguments: { customer: 'cus_123', amount: 5000, currency: 'usd' },
        confidence: 0.95,
        reasoning: 'User wants to charge a customer',
      })

      // Mock integration config
      mockEnv.DB.getIntegration.mockResolvedValue({
        provider: 'stripe',
        base_url: 'https://api.stripe.com',
      })

      // Mock OAuth token
      mockEnv.AUTH.getUniversalOAuthToken.mockResolvedValue({
        userId: 'user_123',
        provider: 'stripe',
        accessToken: 'sk_test_token',
        scopes: ['read_write'],
      })

      mockEnv.AUTH.isUniversalOAuthTokenExpired.mockReturnValue(false)

      // Mock args hash
      vi.mocked(ai.hashArguments).mockResolvedValue('abc123hash')

      // Mock cached code
      mockEnv.DB.getGeneratedCode.mockResolvedValue({
        generated_code: `
          async function callAPI(accessToken, args) {
            return { success: true, data: { id: 'pi_123', amount: args.amount } };
          }
        `,
      })

      mockEnv.DB.logAPIExecution.mockResolvedValue({ success: true })

      // Execute
      const result = await service.callAPI({
        userId: 'user_123',
        request: 'charge customer cus_123 $50',
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.provider).toBe('stripe')
      expect(result.method).toBe('createPaymentIntent')
      expect(result.cached).toBe(true)
      expect(result.codeGenerated).toBe(false)
    })

    it('should generate code if not cached', async () => {
      const ai = await import('../src/ai')

      mockEnv.DB.query.mockResolvedValue({
        rows: [{ provider: 'stripe' }],
      })

      vi.mocked(ai.analyzeIntegrationRequirements).mockResolvedValue({
        provider: 'stripe',
        method: 'createCustomer',
        arguments: { email: 'test@example.com' },
        confidence: 0.9,
        reasoning: 'Create customer',
      })

      mockEnv.DB.getIntegration.mockResolvedValue({
        provider: 'stripe',
        base_url: 'https://api.stripe.com',
      })

      mockEnv.AUTH.getUniversalOAuthToken.mockResolvedValue({
        accessToken: 'sk_test_token',
        scopes: [],
      })

      mockEnv.AUTH.isUniversalOAuthTokenExpired.mockReturnValue(false)

      vi.mocked(ai.hashArguments).mockResolvedValue('xyz789hash')

      // No cached code
      mockEnv.DB.getGeneratedCode.mockResolvedValue(null)

      // Mock code generation
      vi.mocked(ai.generateAPICode).mockResolvedValue({
        code: `
          async function callAPI(accessToken, args) {
            return { success: true, data: { id: 'cus_new', email: args.email } };
          }
        `,
        imports: [],
        exports: 'export { callAPI }',
        description: 'Create Stripe customer',
        warnings: [],
      })

      // Mock validation
      vi.mocked(ai.validateGeneratedCode).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      })

      mockEnv.DB.saveGeneratedCode.mockResolvedValue({ success: true })
      mockEnv.DB.logAPIExecution.mockResolvedValue({ success: true })

      const result = await service.callAPI({
        userId: 'user_123',
        request: 'create a customer with email test@example.com',
      })

      expect(result.success).toBe(true)
      expect(result.codeGenerated).toBe(true)
      expect(result.cached).toBe(false)
      expect(mockEnv.DB.saveGeneratedCode).toHaveBeenCalled()
    })

    it('should fail if provider not found', async () => {
      const ai = await import('../src/ai')

      mockEnv.DB.query.mockResolvedValue({
        rows: [{ provider: 'stripe' }],
      })

      vi.mocked(ai.analyzeIntegrationRequirements).mockResolvedValue({
        provider: 'unknown-provider',
        method: 'someMethod',
        arguments: {},
        confidence: 0.5,
        reasoning: 'Unknown',
      })

      mockEnv.DB.getIntegration.mockResolvedValue(null)

      const result = await service.callAPI({
        userId: 'user_123',
        request: 'call unknown API',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Provider')
      expect(result.error).toContain('not found')
    })

    it('should fail if OAuth token missing', async () => {
      const ai = await import('../src/ai')

      mockEnv.DB.query.mockResolvedValue({
        rows: [{ provider: 'stripe' }],
      })

      vi.mocked(ai.analyzeIntegrationRequirements).mockResolvedValue({
        provider: 'stripe',
        method: 'test',
        arguments: {},
        confidence: 0.9,
        reasoning: 'Test',
      })

      mockEnv.DB.getIntegration.mockResolvedValue({
        provider: 'stripe',
        base_url: 'https://api.stripe.com',
      })

      // No OAuth token
      mockEnv.AUTH.getUniversalOAuthToken.mockResolvedValue(null)

      const result = await service.callAPI({
        userId: 'user_123',
        request: 'test request',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('OAuth token required')
      expect(result.error).toContain('authenticate')
    })

    it('should refresh expired token automatically', async () => {
      const ai = await import('../src/ai')

      mockEnv.DB.query.mockResolvedValue({
        rows: [{ provider: 'stripe' }],
      })

      vi.mocked(ai.analyzeIntegrationRequirements).mockResolvedValue({
        provider: 'stripe',
        method: 'test',
        arguments: {},
        confidence: 0.9,
        reasoning: 'Test',
      })

      mockEnv.DB.getIntegration.mockResolvedValue({
        provider: 'stripe',
        base_url: 'https://api.stripe.com',
      })

      mockEnv.AUTH.getUniversalOAuthToken
        .mockResolvedValueOnce({
          accessToken: 'old_token',
          expiresAt: new Date(Date.now() - 1000), // Expired
          scopes: [],
        })
        .mockResolvedValueOnce({
          accessToken: 'new_token',
          expiresAt: new Date(Date.now() + 3600000), // Fresh
          scopes: [],
        })

      mockEnv.AUTH.isUniversalOAuthTokenExpired.mockReturnValue(true)
      mockEnv.AUTH.refreshUniversalOAuthToken.mockResolvedValue(true)

      vi.mocked(ai.hashArguments).mockResolvedValue('hash')

      mockEnv.DB.getGeneratedCode.mockResolvedValue({
        generated_code: `
          async function callAPI(accessToken, args) {
            return { success: true, data: { token: accessToken } };
          }
        `,
      })

      mockEnv.DB.logAPIExecution.mockResolvedValue({ success: true })

      const result = await service.callAPI({
        userId: 'user_123',
        request: 'test',
      })

      expect(result.success).toBe(true)
      expect(mockEnv.AUTH.refreshUniversalOAuthToken).toHaveBeenCalled()
    })

    it('should fail if code validation fails', async () => {
      const ai = await import('../src/ai')

      mockEnv.DB.query.mockResolvedValue({
        rows: [{ provider: 'stripe' }],
      })

      vi.mocked(ai.analyzeIntegrationRequirements).mockResolvedValue({
        provider: 'stripe',
        method: 'test',
        arguments: {},
        confidence: 0.9,
        reasoning: 'Test',
      })

      mockEnv.DB.getIntegration.mockResolvedValue({
        provider: 'stripe',
        base_url: 'https://api.stripe.com',
      })

      mockEnv.AUTH.getUniversalOAuthToken.mockResolvedValue({
        accessToken: 'token',
        scopes: [],
      })

      mockEnv.AUTH.isUniversalOAuthTokenExpired.mockReturnValue(false)

      vi.mocked(ai.hashArguments).mockResolvedValue('hash')
      mockEnv.DB.getGeneratedCode.mockResolvedValue(null)

      vi.mocked(ai.generateAPICode).mockResolvedValue({
        code: 'malicious code with eval()',
        imports: [],
        exports: '',
        description: 'Bad code',
        warnings: [],
      })

      // Validation fails
      vi.mocked(ai.validateGeneratedCode).mockResolvedValue({
        isValid: false,
        errors: ['Contains eval() which is dangerous'],
        warnings: [],
        suggestions: [],
      })

      const result = await service.callAPI({
        userId: 'user_123',
        request: 'test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Code validation failed')
      expect(mockEnv.DB.saveGeneratedCode).not.toHaveBeenCalled()
    })
  })

  describe('OAuth Methods', () => {
    it('should get OAuth authorization URL', async () => {
      mockEnv.AUTH.getUniversalOAuthUrl.mockResolvedValue('https://stripe.com/oauth/authorize?client_id=...')

      const url = await service.getOAuthUrl('user_123', 'stripe', 'https://example.com/callback')

      expect(url).toBeDefined()
      expect(url).toContain('https://stripe.com/oauth/authorize')
      expect(mockEnv.AUTH.getUniversalOAuthUrl).toHaveBeenCalledWith('stripe', 'https://example.com/callback', expect.any(String))
    })

    it('should handle OAuth callback successfully', async () => {
      mockEnv.AUTH.exchangeUniversalOAuthCode.mockResolvedValue({
        access_token: 'sk_test_abc',
        refresh_token: 'rt_test_xyz',
        expires_in: 3600,
        scope: 'read_write',
      })

      mockEnv.AUTH.storeUniversalOAuthToken.mockResolvedValue(true)

      const success = await service.handleOAuthCallback('user_123', 'stripe', 'auth_code_xyz', 'https://example.com/callback')

      expect(success).toBe(true)
      expect(mockEnv.AUTH.exchangeUniversalOAuthCode).toHaveBeenCalled()
      expect(mockEnv.AUTH.storeUniversalOAuthToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          provider: 'stripe',
          accessToken: 'sk_test_abc',
          refreshToken: 'rt_test_xyz',
        })
      )
    })

    it('should fail OAuth callback if exchange fails', async () => {
      mockEnv.AUTH.exchangeUniversalOAuthCode.mockResolvedValue(null)

      const success = await service.handleOAuthCallback('user_123', 'stripe', 'invalid_code', 'https://example.com/callback')

      expect(success).toBe(false)
      expect(mockEnv.AUTH.storeUniversalOAuthToken).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle AI analysis errors gracefully', async () => {
      const ai = await import('../src/ai')

      mockEnv.DB.query.mockResolvedValue({
        rows: [{ provider: 'stripe' }],
      })

      vi.mocked(ai.analyzeIntegrationRequirements).mockRejectedValue(new Error('AI service unavailable'))

      const result = await service.callAPI({
        userId: 'user_123',
        request: 'test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('AI service unavailable')
    })

    it('should handle code execution errors', async () => {
      const ai = await import('../src/ai')

      mockEnv.DB.query.mockResolvedValue({
        rows: [{ provider: 'stripe' }],
      })

      vi.mocked(ai.analyzeIntegrationRequirements).mockResolvedValue({
        provider: 'stripe',
        method: 'test',
        arguments: {},
        confidence: 0.9,
        reasoning: 'Test',
      })

      mockEnv.DB.getIntegration.mockResolvedValue({
        provider: 'stripe',
        base_url: 'https://api.stripe.com',
      })

      mockEnv.AUTH.getUniversalOAuthToken.mockResolvedValue({
        accessToken: 'token',
        scopes: [],
      })

      mockEnv.AUTH.isUniversalOAuthTokenExpired.mockReturnValue(false)

      vi.mocked(ai.hashArguments).mockResolvedValue('hash')

      // Code that throws error
      mockEnv.DB.getGeneratedCode.mockResolvedValue({
        generated_code: `
          async function callAPI(accessToken, args) {
            throw new Error('Runtime error in generated code');
          }
        `,
      })

      mockEnv.DB.logAPIExecution.mockResolvedValue({ success: true })

      const result = await service.callAPI({
        userId: 'user_123',
        request: 'test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Runtime error')
    })
  })
})
