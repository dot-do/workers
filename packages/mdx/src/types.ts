/**
 * Configuration options for MDX middleware
 */
export interface MdxOptions {
  /**
   * Parse YAML frontmatter from markdown
   * @default true
   */
  frontmatter?: boolean

  /**
   * Add IDs to headings (GitHub-flavored)
   * @default true
   */
  headingIds?: boolean

  /**
   * Enable GitHub-flavored markdown extensions
   * @default true
   */
  gfm?: boolean

  /**
   * CSS styling preset for HTML output
   * - 'github': Use GitHub markdown CSS
   * - 'minimal': Basic styling
   * - 'none': No styling
   * @default 'github'
   */
  styling?: 'github' | 'minimal' | 'none'

  /**
   * Wrap output in full HTML document
   * @default true
   */
  wrapper?: boolean

  /**
   * Custom renderer function (advanced)
   */
  customRenderer?: (markdown: string) => string | Promise<string>
}

/**
 * Parsed frontmatter data
 */
export interface Frontmatter {
  [key: string]: any
}

/**
 * Context variables set by MDX middleware
 */
export interface MdxContext {
  'mdx:frontmatter': Frontmatter
  'mdx:html': string
  'mdx:markdown': string
}
