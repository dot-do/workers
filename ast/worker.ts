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
  const codeBlockRegex = /```(javascript|js|jsx|typescript|ts|tsx)\n([\s\S]*?)```/g
  const blocks: ASTResult['jsCodeBlocks'] = []
  
  let match
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [, lang, code] = match
    
    try {
      // Parse JS/JSX code into AST
      const ast = jsxParser.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        allowImportExportEverywhere: true,
      })
      
      blocks.push({
        code,
        lang,
        ast: removePositions(ast)
      })
    } catch (error) {
      blocks.push({
        code,
        lang,
        error: error instanceof Error ? error.message : 'Parse error'
      })
    }
  }
  
  return blocks
}

// Type definitions
interface FrontmatterResult {
  data: Record<string, any>
  content: string
}

interface ASTResult {
  frontmatter?: Record<string, any>
  mdxAst?: any
  jsCodeBlocks?: Array<{
    code: string
    lang: string
    ast?: any
    error?: string
  }>
}

export default class extends WorkerEntrypoint {
  async fetch(request: Request) {
    const url = new URL(request.url)
    
    // Handle POST requests with content in the body
    if (request.method === 'POST') {
      try {
        const content = await request.text()
        const result = await this.parseContent(content)
        
        return Response.json({
          success: true,
          method: 'POST',
          ast: result
        })
      } catch (error) {
        console.error('Error in POST:', error)
        return Response.json({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 })
      }
    }
    
    // Handle GET requests - fetch from URL
    const { pathname, search } = url
    const target = 'https:/' + pathname + search
    
    try {
      const response = await fetch(target)
      
      if (!response.ok) {
        return Response.json({ 
          error: `Failed to fetch target: ${response.status} ${response.statusText}` 
        }, { status: response.status })
      }

      // Check if we have a body
      if (!response.body) {
        return Response.json({ error: 'No response body' }, { status: 400 })
      }

      // For debugging: collect the entire response first
      const text = await response.text()
      console.log('Fetched content length:', text.length)
      console.log('First 200 chars:', text.substring(0, 200))

      // Parse the content
      const result = await this.parseContent(text)

      return Response.json({
        success: true,
        url: target,
        ast: result,
        debug: {
          contentLength: text.length,
          hasContent: text.length > 0
        }
      })
    } catch (error) {
      console.error('Error in fetch:', error)
      return Response.json({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
  }

  private async parseContent(content: string): Promise<ASTResult> {
    const result: ASTResult = {}

    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
    let actualContent = content

    if (frontmatterMatch) {
      try {
        result.frontmatter = yaml.parse(frontmatterMatch[1])
        actualContent = content.substring(frontmatterMatch[0].length)
      } catch (e) {
        console.error('Frontmatter parse error:', e)
        result.frontmatter = { 
          _error: 'Failed to parse YAML frontmatter',
          _raw: frontmatterMatch[1] 
        }
      }
    }

    // Parse MDX/Markdown to AST
    try {
      // First try with MDX extensions (supports JSX)
      const tree = fromMarkdown(actualContent, {
        extensions: [mdxjs()],
        mdastExtensions: [mdxFromMarkdown()]
      })
      
      result.mdxAst = removePositions(tree)
    } catch (mdxError) {
      // If MDX parsing fails, try regular markdown
      try {
        const tree = fromMarkdown(actualContent)
        result.mdxAst = removePositions(tree)
        
        // Add a note that we fell back to regular markdown
        if (result.mdxAst && typeof result.mdxAst === 'object') {
          result.mdxAst._parsedAs = 'markdown'
          result.mdxAst._mdxError = mdxError instanceof Error ? mdxError.message : 'MDX parse error'
        }
      } catch (markdownError) {
        console.error('Markdown parse error:', markdownError)
        result.mdxAst = { 
          _error: 'Failed to parse content',
          _mdxError: mdxError instanceof Error ? mdxError.message : 'MDX parse error',
          _markdownError: markdownError instanceof Error ? markdownError.message : 'Markdown parse error'
        }
      }
    }

    // Extract and parse code blocks
    result.jsCodeBlocks = extractAndParseCodeBlocks(actualContent)

    return result
  }

  // Additional helper methods for specific parsing needs
  async parse(content: string): Promise<ASTResult> {
    // Direct parsing method that reuses parseContent
    return this.parseContent(content)
  }
}
