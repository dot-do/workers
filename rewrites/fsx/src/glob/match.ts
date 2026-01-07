/**
 * Pattern matching for glob patterns
 *
 * This module provides functions for matching file paths against glob patterns.
 * Supports standard glob syntax: *, **, ?, [abc], [a-z], [!abc], {a,b,c}
 */

/**
 * Options for pattern matching
 */
export interface MatchOptions {
  /** Match dotfiles (files starting with .) - default: false */
  dot?: boolean
  /** Case insensitive matching - default: false */
  nocase?: boolean
}

/**
 * Compiled pattern for efficient reuse
 */
interface CompiledPattern {
  /** Original pattern */
  pattern: string
  /** Whether pattern is negated */
  isNegated: boolean
  /** Regex for matching (null if uses globstar) */
  regex: RegExp | null
  /** Segments for globstar matching */
  segments: string[]
  /** Whether pattern has globstar */
  hasGlobstar: boolean
  /** Options used for compilation */
  options: MatchOptions
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Convert a single pattern segment to regex
 * Handles: *, ?, [abc], [!abc], [a-z], {a,b,c}
 */
function segmentToRegex(segment: string, options: MatchOptions): string {
  let result = ''
  let i = 0
  const dot = options.dot ?? false

  while (i < segment.length) {
    const char = segment[i]

    if (char === '*') {
      // * matches anything except path separator
      // If at start and not dot mode, don't match dotfiles
      if (i === 0 && !dot) {
        result += '(?!\\.)[^/]*'
      } else {
        result += '[^/]*'
      }
      i++
    } else if (char === '?') {
      // ? matches single char except path separator
      // If at start and not dot mode, don't match dotfiles
      if (i === 0 && !dot) {
        result += '(?!\\.)[^/]'
      } else {
        result += '[^/]'
      }
      i++
    } else if (char === '[') {
      // Character class - find the closing ]
      const classStart = i
      i++

      // Check for negation
      let negated = false
      if (segment[i] === '!' || segment[i] === '^') {
        negated = true
        i++
      }

      // Find closing bracket (handle ] as first char in class)
      let classContent = ''
      let firstChar = true
      while (i < segment.length && (segment[i] !== ']' || firstChar)) {
        classContent += segment[i]
        firstChar = false
        i++
      }

      if (segment[i] === ']') {
        i++ // consume ]
        // Build character class
        // Escape special regex chars inside class (but not - or ^)
        let escapedContent = ''
        for (let j = 0; j < classContent.length; j++) {
          const c = classContent[j]
          // Escape special chars except - (which has special meaning)
          if (c === '\\' || c === ']' || c === '^') {
            escapedContent += '\\' + c
          } else {
            escapedContent += c
          }
        }
        result += negated ? `[^${escapedContent}]` : `[${escapedContent}]`
      } else {
        // No closing bracket, treat as literal
        result += escapeRegex(segment.slice(classStart))
      }
    } else if (char === '{') {
      // Brace expansion - find closing }
      const braceStart = i
      i++
      let depth = 1
      let braceContent = ''

      while (i < segment.length && depth > 0) {
        if (segment[i] === '{') depth++
        else if (segment[i] === '}') depth--
        if (depth > 0) {
          braceContent += segment[i]
        }
        i++
      }

      if (depth === 0) {
        // Split by comma and convert each alternative
        const alternatives = splitBraceContent(braceContent)
        const altRegexes = alternatives.map(alt => segmentToRegex(alt, { ...options, dot: true }))
        result += `(?:${altRegexes.join('|')})`
      } else {
        // No closing brace, treat as literal
        result += escapeRegex(segment.slice(braceStart))
      }
    } else if (char === '\\' && i + 1 < segment.length) {
      // Escaped character - treat next char literally
      result += escapeRegex(segment[i + 1])
      i += 2
    } else {
      // Literal character
      result += escapeRegex(char)
      i++
    }
  }

  return result
}

/**
 * Split brace content by comma, handling nested braces
 */
function splitBraceContent(content: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '{') {
      depth++
      current += char
    } else if (char === '}') {
      depth--
      current += char
    } else if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  parts.push(current)

  return parts
}

/**
 * Compile a pattern for efficient reuse
 */
function compilePattern(pattern: string, options: MatchOptions = {}): CompiledPattern {
  if (pattern === '') {
    throw new Error('Pattern cannot be empty')
  }

  // Handle negation
  let isNegated = false
  let workingPattern = pattern

  while (workingPattern.startsWith('!')) {
    isNegated = !isNegated
    workingPattern = workingPattern.slice(1)
  }

  // Handle special case of just "/"
  if (workingPattern === '/') {
    return {
      pattern,
      isNegated,
      regex: /^\/$/,
      segments: ['/'],
      hasGlobstar: false,
      options,
    }
  }

  // Split pattern into segments
  const segments = workingPattern.split('/').filter((s, i, arr) => {
    // Keep empty strings for trailing slashes
    if (i === arr.length - 1 && s === '') return true
    return s !== ''
  })

  // Check if pattern has globstar
  const hasGlobstar = segments.some(s => s === '**')

  // If no globstar, we can compile to a single regex
  if (!hasGlobstar) {
    const regexParts = segments.map(seg => segmentToRegex(seg, options))
    const regexStr = '^' + regexParts.join('/') + '$'
    const flags = options.nocase ? 'i' : ''

    return {
      pattern,
      isNegated,
      regex: new RegExp(regexStr, flags),
      segments,
      hasGlobstar: false,
      options,
    }
  }

  // Has globstar - we'll use segment matching
  return {
    pattern,
    isNegated,
    regex: null,
    segments,
    hasGlobstar: true,
    options,
  }
}

/**
 * Match a single segment pattern against a path segment
 */
function matchSegment(patternSeg: string, pathSeg: string, options: MatchOptions): boolean {
  const regexStr = '^' + segmentToRegex(patternSeg, options) + '$'
  const flags = options.nocase ? 'i' : ''
  const regex = new RegExp(regexStr, flags)
  return regex.test(pathSeg)
}

/**
 * Match path against compiled pattern with globstar support
 */
function matchGlobstar(compiled: CompiledPattern, pathSegments: string[]): boolean {
  const { segments: patternSegments, options } = compiled
  const dot = options.dot ?? false

  // Recursive helper with memoization
  function matchFrom(pi: number, pathi: number, memo: Map<string, boolean>): boolean {
    const key = `${pi}:${pathi}`
    if (memo.has(key)) return memo.get(key)!

    // Base cases
    if (pi === patternSegments.length && pathi === pathSegments.length) {
      memo.set(key, true)
      return true
    }

    if (pi === patternSegments.length) {
      // Pattern exhausted but path remains
      memo.set(key, false)
      return false
    }

    const patternSeg = patternSegments[pi]

    // Handle ** (globstar)
    if (patternSeg === '**') {
      // ** can match:
      // 1. Nothing (skip to next pattern segment)
      if (matchFrom(pi + 1, pathi, memo)) {
        memo.set(key, true)
        return true
      }

      // 2. One or more path segments
      for (let j = pathi; j < pathSegments.length; j++) {
        // Check dotfile constraint for each segment ** matches
        if (!dot && pathSegments[j].startsWith('.')) {
          // ** shouldn't match dotfiles unless dot option
          // But we continue trying to match later segments
        }
        if (matchFrom(pi + 1, j + 1, memo)) {
          memo.set(key, true)
          return true
        }
        // Also try consuming this segment and continuing with **
        if (matchFrom(pi, j + 1, memo)) {
          memo.set(key, true)
          return true
        }
      }

      memo.set(key, false)
      return false
    }

    // Path exhausted but pattern remains (and pattern is not **)
    if (pathi === pathSegments.length) {
      // Special case: trailing empty segment in pattern (for src/)
      if (patternSeg === '' && pi === patternSegments.length - 1) {
        memo.set(key, true)
        return true
      }
      memo.set(key, false)
      return false
    }

    const pathSeg = pathSegments[pathi]

    // Check dotfile constraint
    if (!dot && pathSeg.startsWith('.') && patternSeg !== pathSeg) {
      // If the segment starts with . and pattern doesn't literally match,
      // check if pattern starts with * or ?
      if (patternSeg.startsWith('*') || patternSeg.startsWith('?')) {
        memo.set(key, false)
        return false
      }
    }

    // Match current segments
    if (matchSegment(patternSeg, pathSeg, options)) {
      const result = matchFrom(pi + 1, pathi + 1, memo)
      memo.set(key, result)
      return result
    }

    memo.set(key, false)
    return false
  }

  return matchFrom(0, 0, new Map())
}

/**
 * Match a path against a glob pattern
 *
 * @param pattern - The glob pattern to match against
 * @param path - The path to test
 * @param options - Matching options
 * @returns true if the path matches the pattern
 * @throws Error if pattern is empty
 *
 * @example
 * ```typescript
 * match('*.ts', 'foo.ts')           // true
 * match('src/**\/*.ts', 'src/a/b.ts') // true
 * match('[abc].ts', 'a.ts')         // true
 * match('*.{ts,js}', 'foo.js')      // true
 * ```
 */
export function match(pattern: string, path: string, options: MatchOptions = {}): boolean {
  if (pattern === '') {
    throw new Error('Pattern cannot be empty')
  }

  // Empty path never matches (except empty pattern which throws)
  if (path === '') {
    return false
  }

  const compiled = compilePattern(pattern, options)

  // Handle simple regex match (no globstar)
  if (compiled.regex && !compiled.hasGlobstar) {
    const result = compiled.regex.test(path)
    return compiled.isNegated ? !result : result
  }

  // Handle globstar matching
  const pathSegments = path.split('/').filter((s, i, arr) => {
    // Keep trailing empty segment
    if (i === arr.length - 1 && s === '' && path.endsWith('/')) return true
    return s !== ''
  })

  const result = matchGlobstar(compiled, pathSegments)
  return compiled.isNegated ? !result : result
}

/**
 * Create a reusable matcher function for a pattern
 *
 * More efficient when matching many paths against the same pattern,
 * as the pattern is only parsed once.
 *
 * @param pattern - The glob pattern to compile
 * @param options - Matching options
 * @returns A function that tests paths against the compiled pattern
 * @throws Error if pattern is empty
 *
 * @example
 * ```typescript
 * const isTypeScript = createMatcher('**\/*.ts')
 * isTypeScript('src/index.ts')  // true
 * isTypeScript('README.md')     // false
 * ```
 */
export function createMatcher(pattern: string, options: MatchOptions = {}): (path: string) => boolean {
  if (pattern === '') {
    throw new Error('Pattern cannot be empty')
  }

  const compiled = compilePattern(pattern, options)

  return (path: string): boolean => {
    if (path === '') {
      return false
    }

    // Handle simple regex match (no globstar)
    if (compiled.regex && !compiled.hasGlobstar) {
      const result = compiled.regex.test(path)
      return compiled.isNegated ? !result : result
    }

    // Handle globstar matching
    const pathSegments = path.split('/').filter((s, i, arr) => {
      if (i === arr.length - 1 && s === '' && path.endsWith('/')) return true
      return s !== ''
    })

    const result = matchGlobstar(compiled, pathSegments)
    return compiled.isNegated ? !result : result
  }
}
