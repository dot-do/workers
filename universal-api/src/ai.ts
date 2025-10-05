/**
 * AI Code Generation - Track D Phase 7 Universal API
 *
 * Uses Anthropic Claude to generate TypeScript code for external API calls.
 * Analyzes integration requirements and generates secure, validated code.
 *
 * Key Features:
 * - Analyzes user intent and determines provider/method
 * - Generates TypeScript code with proper error handling
 * - Validates generated code before execution
 * - Caches successful implementations
 */

import Anthropic from '@anthropic-ai/sdk'

/**
 * Integration requirements analysis result
 */
export interface IntegrationRequirements {
  provider: string // e.g., 'stripe', 'github', 'openweather'
  method: string // e.g., 'createPaymentIntent', 'createRepository', 'getCurrentWeather'
  arguments: Record<string, any> // Extracted arguments from user request
  confidence: number // 0-1 confidence score
  reasoning: string // Why this provider/method was chosen
}

/**
 * Generated API code result
 */
export interface GeneratedAPICode {
  code: string // TypeScript code to execute
  imports: string[] // Required imports
  exports: string // Export statement
  description: string // What the code does
  warnings: string[] // Potential issues or limitations
}

/**
 * Code validation result
 */
export interface CodeValidation {
  isValid: boolean
  errors: string[] // Syntax or security errors
  warnings: string[] // Best practice violations
  suggestions: string[] // Improvement suggestions
}

/**
 * Analyze integration requirements from user request
 *
 * Uses Claude to understand what the user wants and determine which
 * provider and API method to use.
 *
 * @param userRequest - Natural language request (e.g., "charge customer $50 for order #123")
 * @param availableProviders - List of configured providers
 * @param env - Worker environment with ANTHROPIC_API_KEY
 * @returns Integration requirements with provider, method, and arguments
 *
 * @example
 * const requirements = await analyzeIntegrationRequirements(
 *   "charge customer cus_123 $50 for order #123",
 *   ['stripe', 'github', 'openweather'],
 *   env
 * )
 * // Returns: { provider: 'stripe', method: 'createPaymentIntent', arguments: { customer: 'cus_123', amount: 5000, ... } }
 */
export async function analyzeIntegrationRequirements(
  userRequest: string,
  availableProviders: string[],
  env: any
): Promise<IntegrationRequirements> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  const systemPrompt = `You are an API integration expert. Analyze user requests and determine:
1. Which API provider to use (from available providers)
2. Which specific API method/endpoint to call
3. What arguments to pass

Available providers: ${availableProviders.join(', ')}

Provider capabilities:
- stripe: Payments, customers, subscriptions, invoices, payment intents
- github: Repositories, issues, pull requests, commits, releases
- openweather: Current weather, forecasts, historical data

Respond in JSON format:
{
  "provider": "provider_name",
  "method": "methodName",
  "arguments": { "arg1": "value1", ... },
  "confidence": 0.95,
  "reasoning": "Why this provider/method was chosen"
}`

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Analyze this user request and determine the API integration requirements:\n\n${userRequest}`,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const result = JSON.parse(responseText)
    return {
      provider: result.provider,
      method: result.method,
      arguments: result.arguments,
      confidence: result.confidence,
      reasoning: result.reasoning,
    }
  } catch (error) {
    console.error('Failed to parse AI response:', responseText)
    throw new Error('Failed to analyze integration requirements')
  }
}

/**
 * Generate TypeScript code to call external API
 *
 * Uses Claude to generate production-ready TypeScript code that:
 * - Authenticates with the provider
 * - Makes the API call with proper error handling
 * - Returns results in a consistent format
 *
 * @param requirements - Integration requirements from analyzeIntegrationRequirements
 * @param integration - Provider configuration (base URL, OAuth config, etc.)
 * @param env - Worker environment with ANTHROPIC_API_KEY
 * @returns Generated TypeScript code
 *
 * @example
 * const code = await generateAPICode(
 *   { provider: 'stripe', method: 'createPaymentIntent', arguments: { ... } },
 *   { baseUrl: 'https://api.stripe.com', ... },
 *   env
 * )
 * // Returns: { code: 'async function callStripeAPI(...) { ... }', imports: [...], ... }
 */
export async function generateAPICode(requirements: IntegrationRequirements, integration: any, env: any): Promise<GeneratedAPICode> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  const systemPrompt = `You are a TypeScript code generator for API integrations.

Generate production-ready TypeScript code that:
1. Uses fetch() to make HTTP requests (Cloudflare Workers environment)
2. Includes proper error handling and type safety
3. Returns results in a consistent format: { success: boolean, data?: any, error?: string }
4. Uses Bearer token authentication: Authorization: Bearer \${accessToken}
5. NO IMPORTS - all code must be self-contained (use fetch, not axios)
6. NO console.log() - return errors in the result object

Provider: ${requirements.provider}
API Base URL: ${integration.base_url}
Method: ${requirements.method}
Arguments: ${JSON.stringify(requirements.arguments, null, 2)}

Respond in JSON format:
{
  "code": "async function callAPI(accessToken: string, args: any): Promise<any> { ... }",
  "imports": [],
  "exports": "export { callAPI }",
  "description": "What this code does",
  "warnings": ["Potential issues..."]
}

The code should be a single async function that takes accessToken and args as parameters.`

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate TypeScript code to call the ${requirements.provider} API, method: ${requirements.method}`,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const result = JSON.parse(responseText)
    return {
      code: result.code,
      imports: result.imports || [],
      exports: result.exports || '',
      description: result.description,
      warnings: result.warnings || [],
    }
  } catch (error) {
    console.error('Failed to parse AI response:', responseText)
    throw new Error('Failed to generate API code')
  }
}

/**
 * Validate generated code before execution
 *
 * Uses Claude to review generated code for:
 * - Syntax errors
 * - Security issues (injection attacks, unsafe operations)
 * - Best practices violations
 * - Potential runtime errors
 *
 * @param code - Generated TypeScript code
 * @param env - Worker environment with ANTHROPIC_API_KEY
 * @returns Validation result with errors, warnings, and suggestions
 *
 * @example
 * const validation = await validateGeneratedCode(generatedCode.code, env)
 * if (!validation.isValid) {
 *   console.error('Code validation failed:', validation.errors)
 * }
 */
export async function validateGeneratedCode(code: string, env: any): Promise<CodeValidation> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  const systemPrompt = `You are a code security and quality reviewer for TypeScript.

Review the provided code for:
1. **Security issues**: SQL injection, command injection, eval(), unsafe operations
2. **Syntax errors**: TypeScript syntax problems
3. **Best practices**: Proper error handling, type safety, async/await usage
4. **Potential runtime errors**: Null pointer errors, type mismatches

Respond in JSON format:
{
  "isValid": true/false,
  "errors": ["Critical issues that must be fixed"],
  "warnings": ["Best practice violations"],
  "suggestions": ["Improvement suggestions"]
}

If there are any security issues or syntax errors, set isValid to false.`

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Review this TypeScript code:\n\n\`\`\`typescript\n${code}\n\`\`\``,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const result = JSON.parse(responseText)
    return {
      isValid: result.isValid,
      errors: result.errors || [],
      warnings: result.warnings || [],
      suggestions: result.suggestions || [],
    }
  } catch (error) {
    console.error('Failed to parse AI response:', responseText)
    throw new Error('Failed to validate generated code')
  }
}

/**
 * Generate unique hash for arguments (for caching)
 *
 * Creates a deterministic hash from method arguments to enable caching
 * of generated code for identical requests.
 *
 * @param args - Method arguments object
 * @returns SHA-256 hash of arguments
 *
 * @example
 * const hash = await hashArguments({ customer: 'cus_123', amount: 5000 })
 * // Returns: "a1b2c3d4e5f6..."
 */
export async function hashArguments(args: Record<string, any>): Promise<string> {
  const sortedArgs = Object.keys(args)
    .sort()
    .reduce((acc, key) => {
      acc[key] = args[key]
      return acc
    }, {} as Record<string, any>)

  const argsString = JSON.stringify(sortedArgs)
  const encoder = new TextEncoder()
  const data = encoder.encode(argsString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}
