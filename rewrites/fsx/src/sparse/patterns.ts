/**
 * Parsed pattern structure for glob matching
 */
export interface ParsedPattern {
  /** Original pattern string */
  pattern: string
  /** Whether the pattern is negated (starts with !) */
  isNegated: boolean
  /** Pattern segments split by path separator */
  segments: string[]
  /** Whether the pattern matches only directories (ends with /) */
  isDirectory: boolean
}

/**
 * Parse a glob pattern string into a structured ParsedPattern object
 *
 * @param pattern - The glob pattern to parse
 * @returns ParsedPattern object with pattern metadata
 * @throws Error if pattern is invalid
 */
export function parsePattern(pattern: string): ParsedPattern {
  // Validate: empty string
  if (pattern === '') {
    throw new Error('Pattern cannot be empty')
  }

  // Validate: whitespace only
  if (pattern.trim() === '') {
    throw new Error('Pattern cannot be whitespace only')
  }

  // Validate: invalid triple-star
  if (pattern.includes('***')) {
    throw new Error('Invalid pattern: *** is not allowed')
  }

  // Check for negation (must be unescaped !)
  const isNegated = pattern.startsWith('!') && !pattern.startsWith('\\!')

  // Get the working pattern (without negation prefix)
  let workingPattern = isNegated ? pattern.slice(1) : pattern

  // Validate: negation only
  if (isNegated && workingPattern === '') {
    throw new Error('Pattern cannot be negation only')
  }

  // Check if it's a directory pattern (ends with /)
  const isDirectory = workingPattern.endsWith('/') || workingPattern.endsWith('\\')

  // Remove trailing slash for segment splitting
  if (isDirectory) {
    workingPattern = workingPattern.slice(0, -1)
  }

  // Split on both / and \ (normalize path separators)
  // But preserve escaped characters like \* within segments
  const segments = splitPattern(workingPattern)

  return {
    pattern,
    isNegated,
    segments,
    isDirectory,
  }
}

/**
 * Split a pattern into segments, handling both / and \ as separators
 * while preserving escaped characters within segments
 */
function splitPattern(pattern: string): string[] {
  // Handle empty pattern (e.g., from "/" after removing trailing slash)
  if (pattern === '') {
    return []
  }

  const segments: string[] = []
  let current = ''
  let i = 0

  while (i < pattern.length) {
    const char = pattern[i]

    // Check for path separator
    if (char === '/') {
      if (current !== '') {
        segments.push(current)
        current = ''
      }
      // Skip consecutive slashes and leading slashes
      i++
      continue
    }

    // Check for backslash - could be escape or Windows path separator
    if (char === '\\') {
      const nextChar = pattern[i + 1]

      // If followed by a special glob character, it's an escape sequence
      if (nextChar && isGlobSpecialChar(nextChar)) {
        // Keep the escape sequence in the segment
        current += char + nextChar
        i += 2
        continue
      }

      // Otherwise it's a path separator (Windows style)
      if (current !== '') {
        segments.push(current)
        current = ''
      }
      i++
      continue
    }

    // Regular character
    current += char
    i++
  }

  // Add final segment if any
  if (current !== '') {
    segments.push(current)
  }

  return segments
}

/**
 * Check if a character is a special glob character that can be escaped
 */
function isGlobSpecialChar(char: string): boolean {
  return ['*', '?', '[', ']', '{', '}', '!', '#'].includes(char)
}
