/**
 * Shared tagged template helper for .do SDKs
 *
 * This helper enables dual-syntax support:
 * - Tagged template literal: fn`template ${value} here`
 * - String with options: fn(prompt, options)
 *
 * Previously duplicated across 30+ SDKs. Now centralized here.
 */

export interface DoOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  [key: string]: unknown
}

export type TaggedTemplate<T> = {
  (strings: TemplateStringsArray, ...values: unknown[]): T
  (prompt: string, options?: DoOptions): T
}

export function tagged<T>(
  fn: (prompt: string, options?: DoOptions) => T
): TaggedTemplate<T> {
  return function(stringsOrPrompt: TemplateStringsArray | string, ...values: unknown[]): T {
    if (typeof stringsOrPrompt === 'string') {
      const options = values[0] as DoOptions | undefined
      return fn(stringsOrPrompt, options)
    }
    // Template literal - join strings with interpolated values
    const prompt = stringsOrPrompt.reduce((acc, str, i) => {
      const value = values[i] !== undefined ? String(values[i]) : ''
      return acc + str + value
    }, '')
    return fn(prompt)
  } as TaggedTemplate<T>
}
