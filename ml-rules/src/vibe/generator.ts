/**
 * Vibe Coding AI Generator - Generate and test code variants
 *
 * Based on Cloudflare AI Vibe Coding Platform approach:
 * - Multi-model code generation (GPT-4, Claude, Llama)
 * - Sandbox execution and testing
 * - Automatic error detection and fixing
 * - Cost tracking via AI Gateway
 */

import type { Env, CodeVariant, VibeExperiment } from '../types'

export interface VibeGeneratorConfig {
  models: string[] // Models to try in parallel
  maxRetries: number
  timeout: number // ms
  temperature: number
  maxTokens: number
}

/**
 * Generate code variants for A/B testing
 */
export async function generateCodeVariants(env: Env, prompt: string, config: Partial<VibeGeneratorConfig> = {}): Promise<CodeVariant[]> {
  const {
    models = ['gpt-4o', '@cf/meta/llama-3.1-8b-instruct', '@cf/anthropic/claude-3-haiku'],
    maxRetries = 3,
    timeout = 30000,
    temperature = 0.7,
    maxTokens = 2000,
  } = config

  const variants: CodeVariant[] = []

  // Generate variants in parallel using different models
  const promises = models.map(async model => {
    return await generateVariantWithModel(env, prompt, model, {
      maxRetries,
      timeout,
      temperature,
      maxTokens,
    })
  })

  const results = await Promise.allSettled(promises)

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      variants.push(result.value)
    }
  }

  return variants
}

/**
 * Generate a single variant with a specific model
 */
async function generateVariantWithModel(
  env: Env,
  prompt: string,
  model: string,
  config: { maxRetries: number; timeout: number; temperature: number; maxTokens: number }
): Promise<CodeVariant | null> {
  const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const variantId = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  let retries = 0
  let lastError: string | undefined

  while (retries < config.maxRetries) {
    try {
      const startTime = Date.now()

      // Generate code using AI
      const code = await generateCode(env, prompt, model, config)

      // Test the generated code
      const testResult = await testCode(env, code)

      const latency = Date.now() - startTime

      const variant: CodeVariant = {
        id: variantId,
        experiment_id: experimentId,
        code,
        language: 'typescript',
        model,
        prompt,
        success: testResult.success,
        error: testResult.error,
        performance: {
          latency,
          tokens_used: estimateTokens(prompt + code),
          cost: estimateCost(model, prompt.length, code.length),
        },
        created_at: Date.now(),
      }

      // If successful, return
      if (testResult.success) {
        return variant
      }

      // If failed, try to auto-fix
      lastError = testResult.error
      if (retries < config.maxRetries - 1) {
        prompt = createFixPrompt(prompt, code, testResult.error)
        retries++
        continue
      }

      // Return failed variant if no more retries
      return variant
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      retries++

      if (retries >= config.maxRetries) {
        // Return failed variant
        return {
          id: variantId,
          experiment_id: experimentId,
          code: '',
          language: 'typescript',
          model,
          prompt,
          success: false,
          error: lastError,
          created_at: Date.now(),
        }
      }
    }
  }

  return null
}

/**
 * Generate code using AI model
 */
async function generateCode(env: Env, prompt: string, model: string, config: { temperature: number; maxTokens: number }): Promise<string> {
  // Use AI service binding
  const response = await env.AI_SERVICE.generate(prompt, {
    model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    provider: model.startsWith('@cf/') ? 'workers-ai' : model.startsWith('claude') ? 'anthropic' : 'openai',
  })

  return extractCodeFromResponse(response.text)
}

/**
 * Test generated code in sandbox
 */
async function testCode(env: Env, code: string): Promise<{ success: boolean; error?: string; result?: any }> {
  try {
    // Execute code in sandbox
    const result = await env.CODE_EXEC.executeCode(code, 'typescript', {}, { timeout: 5000 })

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Execution failed',
      }
    }

    return {
      success: true,
      result: result.result,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Test execution failed',
    }
  }
}

/**
 * Create prompt for fixing errors
 */
function createFixPrompt(originalPrompt: string, failedCode: string, error: string): string {
  return `
${originalPrompt}

The previous attempt generated this code:
\`\`\`typescript
${failedCode}
\`\`\`

But it failed with this error:
${error}

Please fix the error and generate corrected code.
`.trim()
}

/**
 * Extract code from AI response (handles markdown code blocks)
 */
function extractCodeFromResponse(response: string): string {
  // Try to extract from markdown code block
  const codeBlockMatch = response.match(/```(?:typescript|javascript|ts|js)?\n([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // Otherwise return entire response
  return response.trim()
}

/**
 * Compare code variants and select the best one
 */
export function selectBestVariant(variants: CodeVariant[], criteria: 'performance' | 'cost' | 'balanced' = 'balanced'): CodeVariant | null {
  const successful = variants.filter(v => v.success)

  if (successful.length === 0) {
    return null
  }

  if (criteria === 'performance') {
    // Select fastest variant
    return successful.reduce((best, current) => {
      return (current.performance?.latency || Infinity) < (best.performance?.latency || Infinity) ? current : best
    })
  } else if (criteria === 'cost') {
    // Select cheapest variant
    return successful.reduce((best, current) => {
      return (current.performance?.cost || Infinity) < (best.performance?.cost || Infinity) ? current : best
    })
  } else {
    // Balanced: cost-performance ratio
    return successful.reduce((best, current) => {
      const currentScore = (current.performance?.cost || 0) * (current.performance?.latency || 0)
      const bestScore = (best.performance?.cost || 0) * (best.performance?.latency || 0)
      return currentScore < bestScore ? current : best
    })
  }
}

/**
 * Create a Vibe Experiment
 */
export async function createVibeExperiment(env: Env, description: string, prompt: string, models?: string[]): Promise<VibeExperiment> {
  const experimentId = `vibe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const experiment: VibeExperiment = {
    id: experimentId,
    description,
    prompt,
    models: models || ['gpt-4o', '@cf/meta/llama-3.1-8b-instruct'],
    variants: [],
    status: 'pending',
    created_at: Date.now(),
  }

  // Store in database
  await env.DB.prepare('INSERT INTO vibe_experiments (id, description, prompt, models, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(experimentId, description, prompt, JSON.stringify(experiment.models), 'pending', experiment.created_at)
    .run()

  return experiment
}

/**
 * Run a Vibe Experiment
 */
export async function runVibeExperiment(env: Env, experimentId: string): Promise<VibeExperiment> {
  // Get experiment from database
  const expRow = await env.DB.prepare('SELECT * FROM vibe_experiments WHERE id = ?').bind(experimentId).first<any>()

  if (!expRow) {
    throw new Error(`Experiment ${experimentId} not found`)
  }

  const experiment: VibeExperiment = {
    id: expRow.id,
    description: expRow.description,
    prompt: expRow.prompt,
    models: JSON.parse(expRow.models),
    variants: [],
    status: 'running',
    created_at: expRow.created_at,
  }

  // Update status
  await env.DB.prepare('UPDATE vibe_experiments SET status = ? WHERE id = ?').bind('running', experimentId).run()

  // Generate variants
  const variants = await generateCodeVariants(env, experiment.prompt, {
    models: experiment.models,
  })

  // Store variants
  for (const variant of variants) {
    await env.DB.prepare(
      'INSERT INTO code_variants (id, experiment_id, code, language, model, prompt, success, error, performance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(variant.id, experimentId, variant.code, variant.language, variant.model, variant.prompt, variant.success ? 1 : 0, variant.error || null, JSON.stringify(variant.performance), variant.created_at)
      .run()
  }

  // Select best variant
  const bestVariant = selectBestVariant(variants)

  // Update experiment
  const completedExperiment: VibeExperiment = {
    ...experiment,
    variants,
    best_variant_id: bestVariant?.id,
    status: 'completed',
    completed_at: Date.now(),
  }

  await env.DB.prepare('UPDATE vibe_experiments SET best_variant_id = ?, status = ?, completed_at = ? WHERE id = ?')
    .bind(bestVariant?.id || null, 'completed', completedExperiment.completed_at, experimentId)
    .run()

  return completedExperiment
}

// ===== Helper Functions =====

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4)
}

function estimateCost(model: string, promptLength: number, completionLength: number): number {
  const promptTokens = Math.ceil(promptLength / 4)
  const completionTokens = Math.ceil(completionLength / 4)

  // Pricing estimates (per 1M tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    '@cf/meta/llama-3.1-8b-instruct': { input: 0.0, output: 0.0 }, // Free on Workers AI
  }

  const modelPricing = pricing[model] || { input: 1.0, output: 3.0 }

  const inputCost = (promptTokens / 1000000) * modelPricing.input
  const outputCost = (completionTokens / 1000000) * modelPricing.output

  return inputCost + outputCost
}
