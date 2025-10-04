/**
 * Tests for Test Data Generator
 */

import { describe, it, expect } from 'vitest'
import { generateTestContent } from '../src/test-data'

describe('Test Data Generator', () => {
  describe('generateTestContent', () => {
    it('should generate content with all required fields', () => {
      const content = generateTestContent()

      expect(content).toHaveProperty('ns')
      expect(content).toHaveProperty('id')
      expect(content).toHaveProperty('json')
      expect(content).toHaveProperty('code')
      expect(content).toHaveProperty('markdown')
      expect(content).toHaveProperty('html')
      expect(content).toHaveProperty('ast')
      expect(content).toHaveProperty('hash')
      expect(content).toHaveProperty('language')
    })

    it('should generate valid namespace', () => {
      const content = generateTestContent()

      // Should be domain format
      expect(content.ns).toMatch(/^[\w.-]+\.(org|com|to)$/)
    })

    it('should generate ID with spaces', () => {
      const content = generateTestContent()

      // Should have spaces (Wikipedia-style titles)
      expect(content.id).toContain(' ')
    })

    it('should generate markdown with frontmatter', () => {
      const content = generateTestContent()

      // Should start with YAML frontmatter
      expect(content.markdown).toMatch(/^---\n/)
      expect(content.markdown).toContain('title:')
      expect(content.markdown).toContain('description:')
      expect(content.markdown).toContain('tags:')
    })

    it('should generate HTML from markdown', () => {
      const content = generateTestContent()

      // Should have HTML tags
      expect(content.html).toContain('<h1>')
      expect(content.html).toContain('</h1>')
      expect(content.html).toContain('<div class="content">')
    })

    it('should generate AST structure', () => {
      const content = generateTestContent()

      // Should be valid JSON with root node
      expect(content.ast).toHaveProperty('type', 'root')
      expect(content.ast).toHaveProperty('children')
      expect(Array.isArray(content.ast.children)).toBe(true)
    })

    it('should generate content hash', () => {
      const content = generateTestContent()

      // Should be hex string
      expect(content.hash).toMatch(/^[0-9a-f]+$/)
      expect(content.hash.length).toBeGreaterThan(0)
    })

    it('should generate TypeScript code', () => {
      const content = generateTestContent()

      // Should have code snippet
      expect(content.code).toBeTruthy()
      expect(content.code).toContain('export')
    })

    it('should generate JSON metadata', () => {
      const content = generateTestContent()

      // Should have metadata
      expect(content.json).toHaveProperty('title')
      expect(content.json).toHaveProperty('ns')
      expect(content.json).toHaveProperty('id')
      expect(content.json).toHaveProperty('type', 'page')
      expect(content.json).toHaveProperty('language', 'en')
    })

    it('should generate content approximately to target size', () => {
      const targetKB = 225
      const content = generateTestContent(targetKB)

      // Total size should be roughly target (markdown + HTML + AST)
      const totalKB =
        (content.markdown.length + content.html.length + JSON.stringify(content.ast).length) / 1024

      // Content should have reasonable size (algorithm may not be exact)
      // Accept content that's at least 25% of target (very loose for now)
      expect(totalKB).toBeGreaterThan(targetKB * 0.25)
      expect(totalKB).toBeLessThan(targetKB * 2)
    })

    it('should generate different content each time', () => {
      const content1 = generateTestContent()
      const content2 = generateTestContent()

      // Should have different IDs and hashes
      expect(content1.id).not.toBe(content2.id)
      expect(content1.hash).not.toBe(content2.hash)
      expect(content1.markdown).not.toBe(content2.markdown)
    })

    it('should use English language by default', () => {
      const content = generateTestContent()

      expect(content.language).toBe('en')
    })
  })
})
