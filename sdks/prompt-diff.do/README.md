# prompt-diff.do

Prompt diff visualization for AI/LLM prompts. Compare and visualize changes between prompts with multiple output formats.

## Features

- **Multiple Diff Formats**: Side-by-side, inline (unified), and HTML
- **Character-Level Highlighting**: See exactly what changed within lines
- **Flexible Options**: Ignore whitespace, ignore case, context lines
- **Comprehensive Stats**: Track additions, deletions, modifications
- **Line Numbers**: Optional line numbering for easy reference
- **Color Support**: Terminal colors for better visibility
- **HTML Export**: Generate styled HTML diffs for web display

## Installation

```bash
npm install prompt-diff.do
```

## Usage

### Basic Diff

```typescript
import { diffPrompts, formatSideBySide, formatInline } from 'prompt-diff.do'

const oldPrompt = "You are a helpful assistant."
const newPrompt = "You are a very helpful AI assistant."

// Compute the diff
const diff = diffPrompts(oldPrompt, newPrompt)

// Format as side-by-side
console.log(formatSideBySide(diff))

// Format as inline
console.log(formatInline(diff))
```

### Side-by-Side Format

```typescript
const diff = diffPrompts(oldPrompt, newPrompt)
const sideBySide = formatSideBySide(diff, {
  showLineNumbers: true,
  colorize: true,
  width: 120,
  highlightChanges: true
})

console.log(sideBySide)
```

Output:
```
OLD                                      | NEW
=========================================================================
   1 You are a helpful assistant.       ~    1 You are a very helpful AI assistant.
=========================================================================
Stats: +0 -0 ~1 =0
```

### Inline Format

```typescript
const diff = diffPrompts(oldPrompt, newPrompt)
const inline = formatInline(diff, {
  showLineNumbers: true,
  colorize: true,
  highlightChanges: true
})

console.log(inline)
```

Output:
```
PROMPT DIFF
================================================================================
-    1 | You are a [-helpful-] assistant.
+    1 | You are a [+very helpful AI+] assistant.
================================================================================
Stats: +0 additions, -0 deletions, ~1 modifications
```

### HTML Format

```typescript
const diff = diffPrompts(oldPrompt, newPrompt)
const html = formatHTML(diff, {
  showLineNumbers: true,
  highlightChanges: true
})

// Use in a web page
document.getElementById('diff').innerHTML = html
```

### Options

#### Diff Options

```typescript
interface DiffOptions {
  ignoreWhitespace?: boolean  // Ignore whitespace differences
  ignoreCase?: boolean         // Case-insensitive comparison
  contextLines?: number        // Lines of context around changes
}

const diff = diffPrompts(oldPrompt, newPrompt, {
  ignoreWhitespace: true,
  ignoreCase: false
})
```

#### Format Options

```typescript
interface FormatOptions {
  showLineNumbers?: boolean    // Show line numbers
  colorize?: boolean           // Use terminal colors
  width?: number               // Output width (side-by-side only)
  highlightChanges?: boolean   // Highlight character changes
}
```

## API

### `diffPrompts(oldPrompt, newPrompt, options?)`

Computes the difference between two prompts.

**Parameters:**
- `oldPrompt` (string): The original prompt
- `newPrompt` (string): The modified prompt
- `options` (DiffOptions, optional): Diff options

**Returns:** `DiffResult` object with:
- `lines`: Array of diff lines
- `stats`: Statistics object with counts

### `formatSideBySide(diff, options?)`

Formats a diff in side-by-side layout.

**Parameters:**
- `diff` (DiffResult): The diff to format
- `options` (FormatOptions, optional): Formatting options

**Returns:** Formatted string

### `formatInline(diff, options?)`

Formats a diff in inline (unified) layout.

**Parameters:**
- `diff` (DiffResult): The diff to format
- `options` (FormatOptions, optional): Formatting options

**Returns:** Formatted string

### `formatHTML(diff, options?)`

Formats a diff as HTML.

**Parameters:**
- `diff` (DiffResult): The diff to format
- `options` (FormatOptions, optional): Formatting options

**Returns:** HTML string with embedded CSS

## Use Cases

### 1. Prompt Version Control

Track changes to AI prompts over time:

```typescript
import { diffPrompts, formatInline } from 'prompt-diff.do'

const versions = [
  { v: 1, prompt: "You are a helpful assistant." },
  { v: 2, prompt: "You are a very helpful AI assistant." },
  { v: 3, prompt: "You are a very helpful AI assistant that thinks step-by-step." }
]

for (let i = 1; i < versions.length; i++) {
  console.log(`\n=== Version ${versions[i-1].v} → ${versions[i].v} ===`)
  const diff = diffPrompts(versions[i-1].prompt, versions[i].prompt)
  console.log(formatInline(diff))
}
```

### 2. A/B Testing Prompts

Compare prompt variations:

```typescript
const promptA = "You are a concise assistant."
const promptB = "You are a detailed assistant."

const diff = diffPrompts(promptA, promptB)
console.log(`Changes: ${diff.stats.modifications} modifications`)
console.log(formatSideBySide(diff))
```

### 3. Prompt Review Tool

Build a web-based prompt review interface:

```typescript
import { diffPrompts, formatHTML } from 'prompt-diff.do'

function reviewPrompt(original, modified) {
  const diff = diffPrompts(original, modified)
  return {
    html: formatHTML(diff, { highlightChanges: true }),
    stats: diff.stats,
    approved: diff.stats.modifications < 5 // Auto-approve small changes
  }
}
```

### 4. Debugging Prompt Evolution

See how prompts change through a pipeline:

```typescript
const stages = {
  initial: "You are an assistant.",
  enhanced: "You are a helpful assistant.",
  specialized: "You are a helpful coding assistant.",
  final: "You are a helpful TypeScript coding assistant."
}

let current = stages.initial
for (const [stage, prompt] of Object.entries(stages).slice(1)) {
  const diff = diffPrompts(current, prompt)
  console.log(`\nStage: ${stage}`)
  console.log(formatInline(diff, { highlightChanges: true }))
  current = prompt
}
```

## Types

```typescript
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
```

## Examples

See the [test](./test/diff.test.ts) directory for more examples.

## License

MIT

## Contributing

Issues and PRs welcome at [github.com/dot-do/workers](https://github.com/dot-do/workers)
