/**
 * @dotdo/worker-mdx - MDX compiler as RPC worker
 *
 * Exposes @mdx-js/mdx via multi-transport RPC:
 * - Workers RPC: env.MDX.compile(source, options)
 * - REST: POST /api/compile
 * - CapnWeb: WebSocket RPC
 * - MCP: JSON-RPC 2.0
 */

import { compile, evaluate } from '@mdx-js/mdx'
import { RPC } from '@dotdo/rpc'

const mdxAPI = {
  /**
   * Compile MDX source to JavaScript
   */
  async compile(source: string, options?: any) {
    const result = await compile(source, {
      outputFormat: 'function-body',
      ...options,
    })
    return String(result)
  },

  /**
   * Compile and evaluate MDX source
   */
  async evaluate(source: string, options?: any) {
    const result = await evaluate(source, {
      ...options,
    })
    return result
  },

  /**
   * Extract frontmatter from MDX source
   */
  extractFrontmatter(source: string) {
    const match = source.match(/^---\n([\s\S]*?)\n---/)
    if (!match) return { frontmatter: null, content: source }

    // Simple YAML-like parsing
    const frontmatter: Record<string, any> = {}
    for (const line of match[1].split('\n')) {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length) {
        frontmatter[key.trim()] = valueParts.join(':').trim()
      }
    }

    return {
      frontmatter,
      content: source.slice(match[0].length).trim(),
    }
  },
}

export default RPC(mdxAPI)
