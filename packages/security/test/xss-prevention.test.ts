import { describe, it, expect } from 'vitest'
import {
  encodeHtmlEntities,
  decodeHtmlEntities,
  detectScriptTags,
  escapeScriptTags,
  sanitizeEventHandlers,
  isValidUrl,
  isJavaScriptUrl,
  sanitizeUrl,
  generateCspHeader,
  createCspNonce,
  type CspDirectives,
} from '../src/xss'

describe('XSS Prevention', () => {
  describe('HTML Entity Encoding', () => {
    it('should encode < and > characters', () => {
      expect(encodeHtmlEntities('<script>')).toBe('&lt;script&gt;')
    })

    it('should encode ampersand', () => {
      expect(encodeHtmlEntities('foo & bar')).toBe('foo &amp; bar')
    })

    it('should encode double quotes', () => {
      expect(encodeHtmlEntities('value="test"')).toBe('value=&quot;test&quot;')
    })

    it('should encode single quotes', () => {
      expect(encodeHtmlEntities("it's")).toBe('it&#x27;s')
    })

    it('should handle multiple special characters together', () => {
      const input = '<div onclick="alert(\'xss\')">test & more</div>'
      const encoded = encodeHtmlEntities(input)
      expect(encoded).not.toContain('<')
      expect(encoded).not.toContain('>')
      expect(encoded).not.toContain('"')
      expect(encoded).toContain('&lt;')
      expect(encoded).toContain('&gt;')
    })

    it('should decode HTML entities back to original', () => {
      const encoded = '&lt;script&gt;&amp;&quot;&#x27;'
      expect(decodeHtmlEntities(encoded)).toBe('<script>&"\'')
    })

    it('should handle empty strings', () => {
      expect(encodeHtmlEntities('')).toBe('')
      expect(decodeHtmlEntities('')).toBe('')
    })

    it('should handle strings with no special characters', () => {
      expect(encodeHtmlEntities('hello world')).toBe('hello world')
    })
  })

  describe('Script Tag Detection and Escaping', () => {
    it('should detect basic script tags', () => {
      expect(detectScriptTags('<script>alert(1)</script>')).toBe(true)
    })

    it('should detect script tags with attributes', () => {
      expect(detectScriptTags('<script src="evil.js"></script>')).toBe(true)
    })

    it('should detect case-insensitive script tags', () => {
      expect(detectScriptTags('<SCRIPT>alert(1)</SCRIPT>')).toBe(true)
      expect(detectScriptTags('<ScRiPt>alert(1)</ScRiPt>')).toBe(true)
    })

    it('should detect script tags with whitespace variations', () => {
      expect(detectScriptTags('< script>alert(1)</script>')).toBe(true)
      expect(detectScriptTags('<script >alert(1)</script>')).toBe(true)
    })

    it('should return false for safe content', () => {
      expect(detectScriptTags('hello world')).toBe(false)
      expect(detectScriptTags('<div>content</div>')).toBe(false)
    })

    it('should escape script tags by removing them', () => {
      const input = '<script>alert(1)</script>'
      const escaped = escapeScriptTags(input)
      expect(escaped).not.toContain('<script')
      expect(escaped).not.toContain('</script>')
    })

    it('should escape multiple script tags', () => {
      const input = '<script>a</script>text<script>b</script>'
      const escaped = escapeScriptTags(input)
      expect(escaped).not.toContain('<script')
      expect(escaped).toContain('text')
    })
  })

  describe('Event Handler Attribute Sanitization', () => {
    it('should remove onclick handlers', () => {
      const input = '<div onclick="alert(1)">click me</div>'
      const sanitized = sanitizeEventHandlers(input)
      expect(sanitized).not.toContain('onclick')
    })

    it('should remove onmouseover handlers', () => {
      const input = '<img onmouseover="alert(1)" src="x">'
      const sanitized = sanitizeEventHandlers(input)
      expect(sanitized).not.toContain('onmouseover')
    })

    it('should remove onerror handlers', () => {
      const input = '<img onerror="alert(1)" src="x">'
      const sanitized = sanitizeEventHandlers(input)
      expect(sanitized).not.toContain('onerror')
    })

    it('should remove onload handlers', () => {
      const input = '<body onload="alert(1)">content</body>'
      const sanitized = sanitizeEventHandlers(input)
      expect(sanitized).not.toContain('onload')
    })

    it('should handle case-insensitive event handlers', () => {
      const input = '<div ONCLICK="alert(1)" OnMouseOver="x">test</div>'
      const sanitized = sanitizeEventHandlers(input)
      expect(sanitized.toLowerCase()).not.toContain('onclick')
      expect(sanitized.toLowerCase()).not.toContain('onmouseover')
    })

    it('should preserve other attributes', () => {
      const input = '<div class="btn" onclick="x" id="foo">test</div>'
      const sanitized = sanitizeEventHandlers(input)
      expect(sanitized).toContain('class="btn"')
      expect(sanitized).toContain('id="foo"')
    })

    it('should handle multiple event handlers on same element', () => {
      const input = '<div onclick="a" onmouseover="b" onload="c">test</div>'
      const sanitized = sanitizeEventHandlers(input)
      expect(sanitized).not.toContain('onclick')
      expect(sanitized).not.toContain('onmouseover')
      expect(sanitized).not.toContain('onload')
    })
  })

  describe('URL Validation for javascript: Schemes', () => {
    it('should detect javascript: URLs', () => {
      expect(isJavaScriptUrl('javascript:alert(1)')).toBe(true)
    })

    it('should detect javascript: URLs with whitespace', () => {
      expect(isJavaScriptUrl('  javascript:alert(1)')).toBe(true)
      expect(isJavaScriptUrl('javascript:  alert(1)')).toBe(true)
    })

    it('should detect case-insensitive javascript: URLs', () => {
      expect(isJavaScriptUrl('JAVASCRIPT:alert(1)')).toBe(true)
      expect(isJavaScriptUrl('JavaScript:alert(1)')).toBe(true)
    })

    it('should detect javascript: URLs with encoding', () => {
      expect(isJavaScriptUrl('java\tscript:alert(1)')).toBe(true)
      expect(isJavaScriptUrl('java\nscript:alert(1)')).toBe(true)
    })

    it('should validate safe URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://example.com')).toBe(true)
      expect(isValidUrl('/relative/path')).toBe(true)
      expect(isValidUrl('./relative/path')).toBe(true)
    })

    it('should reject javascript: URLs as invalid', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false)
    })

    it('should reject data: URLs by default', () => {
      expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    })

    it('should sanitize dangerous URLs to safe default', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('about:blank')
      expect(sanitizeUrl('data:text/html,evil')).toBe('about:blank')
    })

    it('should return safe URLs unchanged', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page')
    })
  })

  describe('Content Security Policy Helpers', () => {
    it('should generate basic CSP header', () => {
      const directives: CspDirectives = {
        defaultSrc: ["'self'"],
      }
      const header = generateCspHeader(directives)
      expect(header).toBe("default-src 'self'")
    })

    it('should generate CSP with multiple directives', () => {
      const directives: CspDirectives = {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.example.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
      }
      const header = generateCspHeader(directives)
      expect(header).toContain("default-src 'self'")
      expect(header).toContain("script-src 'self' https://cdn.example.com")
      expect(header).toContain("style-src 'self' 'unsafe-inline'")
    })

    it('should handle imgSrc directive', () => {
      const directives: CspDirectives = {
        imgSrc: ["'self'", 'data:', 'https:'],
      }
      const header = generateCspHeader(directives)
      expect(header).toBe("img-src 'self' data: https:")
    })

    it('should handle connectSrc directive', () => {
      const directives: CspDirectives = {
        connectSrc: ["'self'", 'https://api.example.com'],
      }
      const header = generateCspHeader(directives)
      expect(header).toBe("connect-src 'self' https://api.example.com")
    })

    it('should handle frameSrc directive', () => {
      const directives: CspDirectives = {
        frameSrc: ["'none'"],
      }
      const header = generateCspHeader(directives)
      expect(header).toBe("frame-src 'none'")
    })

    it('should generate nonce for CSP', () => {
      const nonce = createCspNonce()
      expect(typeof nonce).toBe('string')
      expect(nonce.length).toBeGreaterThanOrEqual(16)
    })

    it('should generate unique nonces', () => {
      const nonce1 = createCspNonce()
      const nonce2 = createCspNonce()
      expect(nonce1).not.toBe(nonce2)
    })

    it('should generate CSP header with nonce', () => {
      const nonce = 'abc123'
      const directives: CspDirectives = {
        scriptSrc: ["'self'", `'nonce-${nonce}'`],
      }
      const header = generateCspHeader(directives)
      expect(header).toContain(`'nonce-${nonce}'`)
    })

    it('should handle empty directives', () => {
      const directives: CspDirectives = {}
      const header = generateCspHeader(directives)
      expect(header).toBe('')
    })
  })
})
