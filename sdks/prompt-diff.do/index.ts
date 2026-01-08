/**
 * prompt-diff.do - Prompt Diff Visualization
 *
 * Compare and visualize changes between AI prompts.
 * Supports side-by-side and inline diff formats with change highlighting.
 *
 * @example
 * ```typescript
 * import { diffPrompts, formatSideBySide, formatInline } from 'prompt-diff.do'
 *
 * const oldPrompt = "You are a helpful assistant."
 * const newPrompt = "You are a very helpful AI assistant."
 *
 * const diff = diffPrompts(oldPrompt, newPrompt)
 * console.log(formatSideBySide(diff))
 * console.log(formatInline(diff))
 * ```
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type ChangeType = 'add' | 'remove' | 'unchanged' | 'modify'

export interface DiffLine {
  type: ChangeType
  oldLineNumber?: number
  newLineNumber?: number
  content: string
  oldContent?: string
  newContent?: string
}

export interface DiffResult {
  lines: DiffLine[]
  stats: {
    additions: number
    deletions: number
    modifications: number
    unchanged: number
  }
}

export interface DiffOptions {
  ignoreWhitespace?: boolean
  ignoreCase?: boolean
  contextLines?: number
}

export interface FormatOptions {
  showLineNumbers?: boolean
  colorize?: boolean
  width?: number
  highlightChanges?: boolean
}

// ============================================================================
// Diff Algorithm (Myers' Diff)
// ============================================================================

/**
 * Compute the Longest Common Subsequence (LCS) between two arrays
 */
function computeLCS<T>(a: T[], b: T[]): T[] {
  const m = a.length
  const n = b.length
  const lcs: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  // Build LCS table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1])
      }
    }
  }

  // Backtrack to find LCS
  const result: T[] = []
  let i = m
  let j = n

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1])
      i--
      j--
    } else if (lcs[i - 1][j] > lcs[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result
}

/**
 * Compute character-level diff for a single line
 */
function computeCharDiff(oldLine: string, newLine: string): { oldHighlight: string; newHighlight: string } {
  const oldChars = oldLine.split('')
  const newChars = newLine.split('')
  const lcs = computeLCS(oldChars, newChars)

  let oldHighlight = ''
  let newHighlight = ''
  let lcsIndex = 0
  let oldIndex = 0
  let newIndex = 0

  // Build highlighted strings for old line
  while (oldIndex < oldChars.length) {
    if (lcsIndex < lcs.length && oldChars[oldIndex] === lcs[lcsIndex]) {
      oldHighlight += oldChars[oldIndex]
      lcsIndex++
      oldIndex++
    } else {
      oldHighlight += `[-${oldChars[oldIndex]}-]`
      oldIndex++
    }
  }

  // Build highlighted strings for new line
  lcsIndex = 0
  while (newIndex < newChars.length) {
    if (lcsIndex < lcs.length && newChars[newIndex] === lcs[lcsIndex]) {
      newHighlight += newChars[newIndex]
      lcsIndex++
      newIndex++
    } else {
      newHighlight += `[+${newChars[newIndex]}+]`
      newIndex++
    }
  }

  return { oldHighlight, newHighlight }
}

/**
 * Normalize text based on options
 */
function normalizeText(text: string, options: DiffOptions): string {
  let result = text

  if (options.ignoreWhitespace) {
    result = result.replace(/\s+/g, ' ').trim()
  }

  if (options.ignoreCase) {
    result = result.toLowerCase()
  }

  return result
}

/**
 * Compare two prompts and generate a diff
 */
export function diffPrompts(oldPrompt: string, newPrompt: string, options: DiffOptions = {}): DiffResult {
  const oldLines = oldPrompt.split('\n')
  const newLines = newPrompt.split('\n')

  const normalizedOldLines = oldLines.map((line) => normalizeText(line, options))
  const normalizedNewLines = newLines.map((line) => normalizeText(line, options))

  const lcs = computeLCS(normalizedOldLines, normalizedNewLines)

  const lines: DiffLine[] = []
  const stats = {
    additions: 0,
    deletions: 0,
    modifications: 0,
    unchanged: 0,
  }

  let oldIndex = 0
  let newIndex = 0
  let lcsIndex = 0

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const normalizedOld = oldIndex < normalizedOldLines.length ? normalizedOldLines[oldIndex] : null
    const normalizedNew = newIndex < normalizedNewLines.length ? normalizedNewLines[newIndex] : null
    const lcsLine = lcsIndex < lcs.length ? lcs[lcsIndex] : null

    // Both lines match LCS - unchanged
    if (normalizedOld === lcsLine && normalizedNew === lcsLine) {
      lines.push({
        type: 'unchanged',
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
        content: oldLines[oldIndex],
      })
      stats.unchanged++
      oldIndex++
      newIndex++
      lcsIndex++
    }
    // Old line matches LCS, new doesn't - new line added
    else if (normalizedOld === lcsLine && normalizedNew !== lcsLine) {
      lines.push({
        type: 'add',
        newLineNumber: newIndex + 1,
        content: newLines[newIndex],
      })
      stats.additions++
      newIndex++
    }
    // New line matches LCS, old doesn't - old line removed
    else if (normalizedNew === lcsLine && normalizedOld !== lcsLine) {
      lines.push({
        type: 'remove',
        oldLineNumber: oldIndex + 1,
        content: oldLines[oldIndex],
      })
      stats.deletions++
      oldIndex++
    }
    // Neither matches - check if modification or separate add/remove
    else if (normalizedOld !== null && normalizedNew !== null) {
      // Treat as modification if lines are similar
      const similarity = computeSimilarity(normalizedOld, normalizedNew)
      if (similarity > 0.3) {
        const { oldHighlight, newHighlight } = computeCharDiff(oldLines[oldIndex], newLines[newIndex])
        lines.push({
          type: 'modify',
          oldLineNumber: oldIndex + 1,
          newLineNumber: newIndex + 1,
          content: newLines[newIndex],
          oldContent: oldLines[oldIndex],
          newContent: newLines[newIndex],
        })
        stats.modifications++
        oldIndex++
        newIndex++
      } else {
        // Treat as separate remove and add
        lines.push({
          type: 'remove',
          oldLineNumber: oldIndex + 1,
          content: oldLines[oldIndex],
        })
        stats.deletions++
        oldIndex++
      }
    }
    // Only old line remains - removed
    else if (normalizedOld !== null) {
      lines.push({
        type: 'remove',
        oldLineNumber: oldIndex + 1,
        content: oldLines[oldIndex],
      })
      stats.deletions++
      oldIndex++
    }
    // Only new line remains - added
    else if (normalizedNew !== null) {
      lines.push({
        type: 'add',
        newLineNumber: newIndex + 1,
        content: newLines[newIndex],
      })
      stats.additions++
      newIndex++
    }
  }

  return { lines, stats }
}

/**
 * Compute similarity between two strings (0 = completely different, 1 = identical)
 */
function computeSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1

  const aChars = a.split('')
  const bChars = b.split('')
  const lcs = computeLCS(aChars, bChars)

  return lcs.length / maxLen
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format diff in side-by-side layout
 */
export function formatSideBySide(diff: DiffResult, options: FormatOptions = {}): string {
  const { showLineNumbers = true, colorize = false, width = 80, highlightChanges = true } = options

  const columnWidth = Math.floor((width - 5) / 2)
  const lines: string[] = []

  // Header
  const header = showLineNumbers
    ? `${'OLD'.padEnd(columnWidth)} | ${'NEW'.padEnd(columnWidth)}`
    : `${'OLD'.padEnd(columnWidth)} | ${'NEW'.padEnd(columnWidth)}`

  lines.push(header)
  lines.push('='.repeat(width))

  // Process each diff line
  for (const line of diff.lines) {
    let leftSide = ''
    let rightSide = ''
    let prefix = ' '

    switch (line.type) {
      case 'unchanged':
        prefix = ' '
        leftSide = truncate(line.content, columnWidth)
        rightSide = truncate(line.content, columnWidth)
        if (showLineNumbers) {
          leftSide = `${String(line.oldLineNumber).padStart(4)} ${leftSide}`
          rightSide = `${String(line.newLineNumber).padStart(4)} ${rightSide}`
        }
        break

      case 'add':
        prefix = '+'
        leftSide = ''
        rightSide = truncate(line.content, columnWidth)
        if (showLineNumbers) {
          leftSide = '    '.padEnd(columnWidth)
          rightSide = `${String(line.newLineNumber).padStart(4)} ${rightSide}`
        }
        if (colorize) {
          rightSide = `\x1b[32m${rightSide}\x1b[0m` // Green
        }
        break

      case 'remove':
        prefix = '-'
        leftSide = truncate(line.content, columnWidth)
        rightSide = ''
        if (showLineNumbers) {
          leftSide = `${String(line.oldLineNumber).padStart(4)} ${leftSide}`
          rightSide = '    '.padEnd(columnWidth)
        }
        if (colorize) {
          leftSide = `\x1b[31m${leftSide}\x1b[0m` // Red
        }
        break

      case 'modify':
        prefix = '~'
        if (highlightChanges && line.oldContent && line.newContent) {
          const { oldHighlight, newHighlight } = computeCharDiff(line.oldContent, line.newContent)
          leftSide = truncate(oldHighlight, columnWidth)
          rightSide = truncate(newHighlight, columnWidth)
        } else {
          leftSide = truncate(line.oldContent || '', columnWidth)
          rightSide = truncate(line.newContent || '', columnWidth)
        }
        if (showLineNumbers) {
          leftSide = `${String(line.oldLineNumber).padStart(4)} ${leftSide}`
          rightSide = `${String(line.newLineNumber).padStart(4)} ${rightSide}`
        }
        if (colorize) {
          leftSide = `\x1b[33m${leftSide}\x1b[0m` // Yellow
          rightSide = `\x1b[33m${rightSide}\x1b[0m`
        }
        break
    }

    const formattedLine = `${leftSide.padEnd(columnWidth)} ${prefix} ${rightSide}`
    lines.push(formattedLine)
  }

  // Footer with stats
  lines.push('='.repeat(width))
  lines.push(
    `Stats: +${diff.stats.additions} -${diff.stats.deletions} ~${diff.stats.modifications} =${diff.stats.unchanged}`
  )

  return lines.join('\n')
}

/**
 * Format diff in inline (unified) layout
 */
export function formatInline(diff: DiffResult, options: FormatOptions = {}): string {
  const { showLineNumbers = true, colorize = false, highlightChanges = true } = options

  const lines: string[] = []

  // Header
  lines.push('PROMPT DIFF')
  lines.push('='.repeat(80))

  // Process each diff line
  for (const line of diff.lines) {
    let prefix = ' '
    let lineNum = ''
    let content = line.content

    switch (line.type) {
      case 'unchanged':
        prefix = ' '
        if (showLineNumbers) {
          lineNum = `${String(line.oldLineNumber).padStart(4)} | `
        }
        break

      case 'add':
        prefix = '+'
        if (showLineNumbers) {
          lineNum = `${String(line.newLineNumber).padStart(4)} | `
        }
        if (colorize) {
          content = `\x1b[32m${content}\x1b[0m` // Green
        }
        break

      case 'remove':
        prefix = '-'
        if (showLineNumbers) {
          lineNum = `${String(line.oldLineNumber).padStart(4)} | `
        }
        if (colorize) {
          content = `\x1b[31m${content}\x1b[0m` // Red
        }
        break

      case 'modify':
        if (highlightChanges && line.oldContent && line.newContent) {
          const { oldHighlight, newHighlight } = computeCharDiff(line.oldContent, line.newContent)

          // Show old version
          if (showLineNumbers) {
            lineNum = `${String(line.oldLineNumber).padStart(4)} | `
          }
          let oldLine = `- ${lineNum}${oldHighlight}`
          if (colorize) {
            oldLine = `\x1b[31m${oldLine}\x1b[0m` // Red
          }
          lines.push(oldLine)

          // Show new version
          if (showLineNumbers) {
            lineNum = `${String(line.newLineNumber).padStart(4)} | `
          }
          let newLine = `+ ${lineNum}${newHighlight}`
          if (colorize) {
            newLine = `\x1b[32m${newLine}\x1b[0m` // Green
          }
          lines.push(newLine)
          continue
        } else {
          prefix = '~'
          if (showLineNumbers) {
            lineNum = `${String(line.newLineNumber).padStart(4)} | `
          }
          if (colorize) {
            content = `\x1b[33m${content}\x1b[0m` // Yellow
          }
        }
        break
    }

    lines.push(`${prefix} ${lineNum}${content}`)
  }

  // Footer with stats
  lines.push('='.repeat(80))
  lines.push(
    `Stats: +${diff.stats.additions} additions, -${diff.stats.deletions} deletions, ~${diff.stats.modifications} modifications`
  )

  return lines.join('\n')
}

/**
 * Format diff as HTML
 */
export function formatHTML(diff: DiffResult, options: FormatOptions = {}): string {
  const { showLineNumbers = true, highlightChanges = true } = options

  const lines: string[] = []

  lines.push('<div class="prompt-diff">')
  lines.push('<style>')
  lines.push(`
    .prompt-diff { font-family: monospace; }
    .diff-line { display: flex; }
    .line-num { width: 50px; text-align: right; padding-right: 10px; color: #666; }
    .line-content { flex: 1; white-space: pre-wrap; }
    .add { background-color: #e6ffec; }
    .remove { background-color: #ffebe9; }
    .modify { background-color: #fff8c5; }
    .unchanged { background-color: #fff; }
    .highlight-add { background-color: #acf2bd; }
    .highlight-remove { background-color: #fdb8c0; }
  `)
  lines.push('</style>')

  for (const line of diff.lines) {
    const className = line.type
    let lineNumHTML = ''
    let contentHTML = escapeHTML(line.content)

    if (showLineNumbers) {
      const num = line.oldLineNumber || line.newLineNumber || ''
      lineNumHTML = `<span class="line-num">${num}</span>`
    }

    if (line.type === 'modify' && highlightChanges && line.oldContent && line.newContent) {
      const { oldHighlight, newHighlight } = computeCharDiff(line.oldContent, line.newContent)

      // Render old line
      lines.push(`<div class="diff-line remove">`)
      if (showLineNumbers) {
        lines.push(`<span class="line-num">${line.oldLineNumber}</span>`)
      }
      lines.push(`<span class="line-content">${highlightHTML(oldHighlight, 'remove')}</span>`)
      lines.push(`</div>`)

      // Render new line
      lines.push(`<div class="diff-line add">`)
      if (showLineNumbers) {
        lines.push(`<span class="line-num">${line.newLineNumber}</span>`)
      }
      lines.push(`<span class="line-content">${highlightHTML(newHighlight, 'add')}</span>`)
      lines.push(`</div>`)
    } else {
      lines.push(`<div class="diff-line ${className}">`)
      lines.push(lineNumHTML)
      lines.push(`<span class="line-content">${contentHTML}</span>`)
      lines.push(`</div>`)
    }
  }

  lines.push('</div>')

  return lines.join('\n')
}

// ============================================================================
// Helper Functions
// ============================================================================

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightHTML(str: string, type: 'add' | 'remove'): string {
  const className = type === 'add' ? 'highlight-add' : 'highlight-remove'
  const pattern = type === 'add' ? /\[\+(.+?)\+\]/g : /\[-(.+?)-\]/g

  return escapeHTML(str).replace(pattern, (_, content) => {
    return `<span class="${className}">${content}</span>`
  })
}

// ============================================================================
// Exports
// ============================================================================

export default {
  diffPrompts,
  formatSideBySide,
  formatInline,
  formatHTML,
}
