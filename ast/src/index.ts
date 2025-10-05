import { WorkerEntrypoint } from 'cloudflare:workers'
import * as yaml from 'yaml'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { mdxjs } from 'micromark-extension-mdxjs'
import { mdxFromMarkdown } from 'mdast-util-mdx'
import * as acorn from 'acorn'
import jsx from 'acorn-jsx'

// Extend acorn with JSX support
const jsxParser = acorn.Parser.extend(jsx())

// Helper function to remove position data from AST nodes
function removePositions(node: any): any {
  if (!node || typeof node !== 'object') return node

  // Handle arrays
  if (Array.isArray(node)) {
    return node.map(removePositions)
  }

  // Create a new object without position-related fields
  const cleaned: any = {}
  for (const key in node) {
    if (key === 'position' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') {
      continue
    }
    cleaned[key] = removePositions(node[key])
  }

  return cleaned
}

// Helper function to extract and parse code blocks
function extractAndParseCodeBlocks(content: string): ASTResult['jsCodeBlocks'] {
  // Regex to match code blocks with language identifier
  const codeBlockRegex = new RegExp('