/**
 * DORPC - Durable Object with RPC Worker Bindings
 *
 * Extends the full-featured DO with support for heavy dependencies
 * accessed via Cloudflare Worker service bindings instead of bundling them.
 *
 * This keeps your DO bundle small while still providing access to:
 * - JOSE (JWT operations)
 * - Stripe (payment processing)
 * - WorkOS (SSO/OAuth)
 * - ESBuild (code bundling)
 * - MDX (content compilation)
 * - Cloudflare (API operations)
 * - LLM (AI gateway)
 *
 * @example
 * ```typescript
 * import { DO } from 'dotdo/rpc'
 *
 * export class MyDatabase extends DO {
 *   async verifyToken(token: string) {
 *     // JOSE operations via worker binding
 *     return this.jose.verify(token)
 *   }
 *
 *   async createCharge(amount: number) {
 *     // Stripe operations via worker binding
 *     return this.stripe.charges.create({ amount })
 *   }
 *
 *   async processWithAI(prompt: string) {
 *     // LLM operations via worker binding
 *     return this.llm.complete({ model: 'claude-3-opus', prompt })
 *   }
 * }
 * ```
 */

import { DO } from './do'
import type {
  DOEnvRPC,
  JoseBinding,
  StripeBinding,
  WorkosBinding,
  EsbuildBinding,
  MdxBinding,
  CloudflareBinding,
  LlmBinding,
  DomainsBinding,
} from './types'

// ============================================================================
// DORPC Class
// ============================================================================

/**
 * Durable Object with RPC Worker Bindings
 *
 * Provides convenient accessors for standard worker bindings
 * following the workers.do naming conventions.
 */
export class DO<Env extends DOEnvRPC = DOEnvRPC> extends (DO as any)<Env> {
  // ==========================================================================
  // RPC Binding Accessors
  // ==========================================================================

  /**
   * JOSE Worker binding for JWT operations
   *
   * @example
   * ```typescript
   * const payload = await this.jose.verify(token)
   * const token = await this.jose.sign({ userId: '123' })
   * ```
   */
  get jose(): JoseBinding {
    const binding = (this.env as DOEnvRPC).JOSE
    if (!binding) {
      throw new Error('JOSE binding not configured. Add JOSE service binding to wrangler.toml')
    }
    return binding
  }

  /**
   * Stripe Worker binding for payment operations
   *
   * @example
   * ```typescript
   * const charge = await this.stripe.charges.create({ amount: 1000 })
   * const subscription = await this.stripe.subscriptions.create({ customer, price })
   * ```
   */
  get stripe(): StripeBinding {
    const binding = (this.env as DOEnvRPC).STRIPE
    if (!binding) {
      throw new Error('STRIPE binding not configured. Add STRIPE service binding to wrangler.toml')
    }
    return binding
  }

  /**
   * WorkOS Worker binding for SSO/OAuth operations
   *
   * @example
   * ```typescript
   * const url = await this.workos.sso.getAuthorizationUrl({ organization })
   * const profile = await this.workos.sso.getProfile(code)
   * ```
   */
  get workos(): WorkosBinding {
    const binding = (this.env as DOEnvRPC).WORKOS
    if (!binding) {
      throw new Error('WORKOS binding not configured. Add WORKOS service binding to wrangler.toml')
    }
    return binding
  }

  /**
   * ESBuild Worker binding for code bundling
   *
   * @example
   * ```typescript
   * const result = await this.esbuild.build({ entryPoints: ['src/index.ts'] })
   * const { code } = await this.esbuild.transform(tsCode, { loader: 'ts' })
   * ```
   */
  get esbuild(): EsbuildBinding {
    const binding = (this.env as DOEnvRPC).ESBUILD
    if (!binding) {
      throw new Error('ESBUILD binding not configured. Add ESBUILD service binding to wrangler.toml')
    }
    return binding
  }

  /**
   * MDX Worker binding for content compilation
   *
   * @example
   * ```typescript
   * const { code } = await this.mdx.compile('# Hello\n\nWorld')
   * ```
   */
  get mdx(): MdxBinding {
    const binding = (this.env as DOEnvRPC).MDX
    if (!binding) {
      throw new Error('MDX binding not configured. Add MDX service binding to wrangler.toml')
    }
    return binding
  }

  /**
   * Cloudflare Worker binding for API operations
   *
   * @example
   * ```typescript
   * const zones = await this.cloudflare.zones.list()
   * await this.cloudflare.dns.create(zoneId, { type: 'A', name: 'www', content: '1.2.3.4' })
   * ```
   */
  get cloudflare(): CloudflareBinding {
    const binding = (this.env as DOEnvRPC).CLOUDFLARE
    if (!binding) {
      throw new Error('CLOUDFLARE binding not configured. Add CLOUDFLARE service binding to wrangler.toml')
    }
    return binding
  }

  /**
   * LLM Worker binding for AI operations
   *
   * @example
   * ```typescript
   * const { content } = await this.llm.complete({ model: 'claude-3-opus', prompt: 'Hello' })
   * const stream = this.llm.stream({ model: 'gpt-4', messages })
   * ```
   */
  get llm(): LlmBinding {
    const binding = (this.env as DOEnvRPC).LLM
    if (!binding) {
      throw new Error('LLM binding not configured. Add LLM service binding to wrangler.toml')
    }
    return binding
  }

  /**
   * Domains Worker binding for free domain management
   *
   * @example
   * ```typescript
   * await this.domains.claim('my-startup.hq.com.ai')
   * await this.domains.route('my-startup.hq.com.ai', { worker: 'my-worker' })
   * ```
   */
  get domains(): DomainsBinding {
    const binding = (this.env as DOEnvRPC).DOMAINS
    if (!binding) {
      throw new Error('DOMAINS binding not configured. Add DOMAINS service binding to wrangler.toml')
    }
    return binding
  }

  // ==========================================================================
  // Optional Binding Checks
  // ==========================================================================

  /**
   * Check if JOSE binding is available
   */
  hasJose(): boolean {
    return !!(this.env as DOEnvRPC).JOSE
  }

  /**
   * Check if Stripe binding is available
   */
  hasStripe(): boolean {
    return !!(this.env as DOEnvRPC).STRIPE
  }

  /**
   * Check if WorkOS binding is available
   */
  hasWorkos(): boolean {
    return !!(this.env as DOEnvRPC).WORKOS
  }

  /**
   * Check if ESBuild binding is available
   */
  hasEsbuild(): boolean {
    return !!(this.env as DOEnvRPC).ESBUILD
  }

  /**
   * Check if MDX binding is available
   */
  hasMdx(): boolean {
    return !!(this.env as DOEnvRPC).MDX
  }

  /**
   * Check if Cloudflare binding is available
   */
  hasCloudflare(): boolean {
    return !!(this.env as DOEnvRPC).CLOUDFLARE
  }

  /**
   * Check if LLM binding is available
   */
  hasLlm(): boolean {
    return !!(this.env as DOEnvRPC).LLM
  }

  /**
   * Check if Domains binding is available
   */
  hasDomains(): boolean {
    return !!(this.env as DOEnvRPC).DOMAINS
  }

  // ==========================================================================
  // Enhanced Agentic Capabilities
  // ==========================================================================

  /**
   * Execute a natural language instruction using LLM
   *
   * If LLM binding is available, uses it for intelligent routing.
   * Falls back to simple method matching otherwise.
   */
  async do(prompt: string): Promise<unknown> {
    if (this.hasLlm()) {
      return this.doWithLLM(prompt)
    }

    // Fall back to parent implementation
    return super.do(prompt)
  }

  /**
   * Execute instruction using LLM for intelligent routing
   */
  private async doWithLLM(prompt: string): Promise<unknown> {
    // Build context about available methods
    const methods = this.getAvailableMethods()

    const systemPrompt = `You are an AI assistant that helps execute operations on a Durable Object.
Available methods: ${methods.join(', ')}

Given a user instruction, respond with a JSON object containing:
- method: the method name to call
- params: any parameters to pass (as an object or array)

If you cannot determine the appropriate method, respond with:
- error: explanation of the issue`

    const response = await this.llm.complete({
      model: 'claude-3-haiku',
      prompt: `${systemPrompt}\n\nUser instruction: ${prompt}`,
    })

    try {
      const parsed = JSON.parse(response.content)

      if (parsed.error) {
        throw new Error(parsed.error)
      }

      if (!parsed.method || !this.hasMethod(parsed.method)) {
        throw new Error(`Unknown method: ${parsed.method}`)
      }

      return this.invoke(parsed.method, parsed.params)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse LLM response: ${response.content}`)
      }
      throw error
    }
  }

  /**
   * Get list of available methods for LLM context
   */
  private getAvailableMethods(): string[] {
    const methods: string[] = []

    // Get own methods
    const prototype = Object.getPrototypeOf(this)
    const ownMethods = Object.getOwnPropertyNames(prototype)
      .filter((name) =>
        name !== 'constructor' &&
        typeof (this as any)[name] === 'function' &&
        !name.startsWith('_') &&
        !name.startsWith('get') &&
        !name.startsWith('has')
      )

    methods.push(...ownMethods)

    return methods
  }
}

// ============================================================================
// Exports
// ============================================================================

export type {
  DOEnvRPC,
  JoseBinding,
  StripeBinding,
  WorkosBinding,
  EsbuildBinding,
  MdxBinding,
  CloudflareBinding,
  LlmBinding,
  DomainsBinding,
}

export default DO
