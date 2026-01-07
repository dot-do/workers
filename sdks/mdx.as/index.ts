/**
 * mdx.as - Create interactive content with MDX
 *
 * Write content with the power of components.
 * mdx.as/blog, mdx.as/docs, mdx.as/courses
 *
 * @see https://mdx.as
 *
 * @example
 * ```typescript
 * import { mdx } from 'mdx.as'
 *
 * // Compile MDX content
 * const result = await mdx.compile(`
 * # Hello World
 *
 * <Counter initial={0} />
 *
 * This is **interactive** content.
 * `)
 *
 * // Render to HTML
 * const html = await mdx.render(result.code)
 * ```
 */

import { createClient, type ClientOptions } from 'rpc.do'

// Types
export interface CompileOptions {
  /** MDX content */
  content: string
  /** Custom components to allow */
  components?: string[]
  /** Frontmatter schema */
  frontmatterSchema?: Record<string, unknown>
  /** Output format */
  format?: 'function' | 'html' | 'jsx'
  /** Enable syntax highlighting */
  highlight?: boolean
  /** Code theme */
  theme?: string
  /** Custom remark plugins */
  remarkPlugins?: string[]
  /** Custom rehype plugins */
  rehypePlugins?: string[]
}

export interface CompileResult {
  code: string
  frontmatter: Record<string, unknown>
  headings: Array<{ level: number; text: string; id: string }>
  readingTime: number
  wordCount: number
}

export interface Document {
  id: string
  slug: string
  title: string
  content: string
  compiled: CompileResult
  status: 'draft' | 'published' | 'archived'
  folder?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

export interface Folder {
  id: string
  name: string
  slug: string
  documentCount: number
  createdAt: Date
}

export interface Component {
  name: string
  description?: string
  props: Array<{ name: string; type: string; required: boolean; default?: unknown }>
  source: string
}

export interface Template {
  id: string
  name: string
  description: string
  content: string
  variables: string[]
}

export interface RenderOptions {
  /** Component values/props */
  components?: Record<string, unknown>
  /** Data for dynamic content */
  data?: Record<string, unknown>
  /** Render target */
  target?: 'html' | 'react' | 'vue' | 'svelte'
}

// Client interface
export interface MdxAsClient {
  /**
   * Compile MDX content
   */
  compile(content: string, options?: Omit<CompileOptions, 'content'>): Promise<CompileResult>

  /**
   * Render compiled MDX to HTML
   */
  render(code: string, options?: RenderOptions): Promise<string>

  /**
   * Compile and render in one step
   */
  process(content: string, options?: CompileOptions & RenderOptions): Promise<{ compiled: CompileResult; html: string }>

  /**
   * Create a document
   */
  create(config: { slug: string; title: string; content: string; folder?: string; tags?: string[] }): Promise<Document>

  /**
   * Get a document
   */
  get(slug: string): Promise<Document>

  /**
   * List documents
   */
  list(options?: { folder?: string; tag?: string; status?: Document['status']; limit?: number }): Promise<Document[]>

  /**
   * Update a document
   */
  update(slug: string, config: { title?: string; content?: string; tags?: string[] }): Promise<Document>

  /**
   * Delete a document
   */
  delete(slug: string): Promise<void>

  /**
   * Publish a document
   */
  publish(slug: string): Promise<Document>

  /**
   * Unpublish a document
   */
  unpublish(slug: string): Promise<Document>

  /**
   * Create a folder
   */
  createFolder(config: { name: string; slug?: string }): Promise<Folder>

  /**
   * List folders
   */
  folders(): Promise<Folder[]>

  /**
   * Delete a folder
   */
  deleteFolder(folderId: string): Promise<void>

  /**
   * Register a custom component
   */
  registerComponent(component: Component): Promise<Component>

  /**
   * List registered components
   */
  components(): Promise<Component[]>

  /**
   * Remove a component
   */
  removeComponent(name: string): Promise<void>

  /**
   * Create a template
   */
  createTemplate(template: Omit<Template, 'id'>): Promise<Template>

  /**
   * List templates
   */
  templates(): Promise<Template[]>

  /**
   * Generate document from template
   */
  fromTemplate(templateId: string, variables: Record<string, string>): Promise<Document>

  /**
   * Validate MDX content
   */
  validate(content: string): Promise<{ valid: boolean; errors?: Array<{ line: number; message: string }> }>

  /**
   * Extract table of contents
   */
  toc(content: string): Promise<Array<{ level: number; text: string; id: string }>>

  /**
   * Search across documents
   */
  search(query: string, options?: { folder?: string; limit?: number }): Promise<Array<{ document: Document; snippet: string; score: number }>>

  /**
   * Get document versions
   */
  versions(slug: string): Promise<Array<{ id: string; content: string; createdAt: Date }>>

  /**
   * Restore a version
   */
  restore(slug: string, versionId: string): Promise<Document>

  /**
   * Export documents
   */
  export(options?: { folder?: string; format?: 'mdx' | 'md' | 'html' }): Promise<string>

  /**
   * Import MDX files
   */
  import(content: string, options?: { folder?: string }): Promise<Document[]>
}

/**
 * Create a configured mdx.as client
 */
export function Mdx(options?: ClientOptions): MdxAsClient {
  return createClient<MdxAsClient>('https://mdx.as', options)
}

/**
 * Default mdx.as client instance
 */
export const mdx: MdxAsClient = Mdx({
  apiKey: typeof process !== 'undefined' ? (process.env?.MDX_API_KEY || process.env?.DO_API_KEY) : undefined,
})

// Convenience exports
export const compile = (content: string, options?: Omit<CompileOptions, 'content'>) => mdx.compile(content, options)
export const render = (code: string, options?: RenderOptions) => mdx.render(code, options)
export const process = (content: string, options?: CompileOptions & RenderOptions) => mdx.process(content, options)

export default mdx

// Re-export types
export type { ClientOptions } from 'rpc.do'
