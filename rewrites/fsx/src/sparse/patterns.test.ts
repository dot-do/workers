import { describe, it, expect } from 'vitest'
import { parsePattern, type ParsedPattern } from './patterns'

describe('parsePattern', () => {
  describe('simple patterns', () => {
    it('should parse wildcard pattern *.ts', () => {
      const result = parsePattern('*.ts')
      expect(result).toEqual({
        pattern: '*.ts',
        isNegated: false,
        segments: ['*.ts'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should parse wildcard pattern src/*', () => {
      const result = parsePattern('src/*')
      expect(result).toEqual({
        pattern: 'src/*',
        isNegated: false,
        segments: ['src', '*'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should parse simple filename', () => {
      const result = parsePattern('package.json')
      expect(result).toEqual({
        pattern: 'package.json',
        isNegated: false,
        segments: ['package.json'],
        isDirectory: false,
      } as ParsedPattern)
    })
  })

  describe('nested patterns', () => {
    it('should parse double-star pattern src/**/*.ts', () => {
      const result = parsePattern('src/**/*.ts')
      expect(result).toEqual({
        pattern: 'src/**/*.ts',
        isNegated: false,
        segments: ['src', '**', '*.ts'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should parse multi-level pattern lib/utils/**/*.js', () => {
      const result = parsePattern('lib/utils/**/*.js')
      expect(result).toEqual({
        pattern: 'lib/utils/**/*.js',
        isNegated: false,
        segments: ['lib', 'utils', '**', '*.js'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should parse double-star only pattern **/*.md', () => {
      const result = parsePattern('**/*.md')
      expect(result).toEqual({
        pattern: '**/*.md',
        isNegated: false,
        segments: ['**', '*.md'],
        isDirectory: false,
      } as ParsedPattern)
    })
  })

  describe('directory patterns', () => {
    it('should parse directory pattern src/', () => {
      const result = parsePattern('src/')
      expect(result).toEqual({
        pattern: 'src/',
        isNegated: false,
        segments: ['src'],
        isDirectory: true,
      } as ParsedPattern)
    })

    it('should parse nested directory pattern src/lib/', () => {
      const result = parsePattern('src/lib/')
      expect(result).toEqual({
        pattern: 'src/lib/',
        isNegated: false,
        segments: ['src', 'lib'],
        isDirectory: true,
      } as ParsedPattern)
    })

    it('should parse directory with wildcard pattern src/*/test/', () => {
      const result = parsePattern('src/*/test/')
      expect(result).toEqual({
        pattern: 'src/*/test/',
        isNegated: false,
        segments: ['src', '*', 'test'],
        isDirectory: true,
      } as ParsedPattern)
    })
  })

  describe('negation patterns', () => {
    it('should parse negated pattern !node_modules', () => {
      const result = parsePattern('!node_modules')
      expect(result).toEqual({
        pattern: '!node_modules',
        isNegated: true,
        segments: ['node_modules'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should parse negated directory pattern !node_modules/', () => {
      const result = parsePattern('!node_modules/')
      expect(result).toEqual({
        pattern: '!node_modules/',
        isNegated: true,
        segments: ['node_modules'],
        isDirectory: true,
      } as ParsedPattern)
    })

    it('should parse negated wildcard pattern !*.test.ts', () => {
      const result = parsePattern('!*.test.ts')
      expect(result).toEqual({
        pattern: '!*.test.ts',
        isNegated: true,
        segments: ['*.test.ts'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should parse negated nested pattern !src/**/*.spec.ts', () => {
      const result = parsePattern('!src/**/*.spec.ts')
      expect(result).toEqual({
        pattern: '!src/**/*.spec.ts',
        isNegated: true,
        segments: ['src', '**', '*.spec.ts'],
        isDirectory: false,
      } as ParsedPattern)
    })
  })

  describe('edge cases', () => {
    it('should throw on empty string', () => {
      expect(() => parsePattern('')).toThrow()
    })

    it('should parse single character pattern', () => {
      const result = parsePattern('*')
      expect(result).toEqual({
        pattern: '*',
        isNegated: false,
        segments: ['*'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should parse single directory slash', () => {
      const result = parsePattern('/')
      expect(result).toEqual({
        pattern: '/',
        isNegated: false,
        segments: [],
        isDirectory: true,
      } as ParsedPattern)
    })

    it('should handle multiple consecutive slashes', () => {
      const result = parsePattern('src//lib')
      expect(result).toEqual({
        pattern: 'src//lib',
        isNegated: false,
        segments: ['src', 'lib'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should handle leading slash', () => {
      const result = parsePattern('/src/lib')
      expect(result).toEqual({
        pattern: '/src/lib',
        isNegated: false,
        segments: ['src', 'lib'],
        isDirectory: false,
      } as ParsedPattern)
    })
  })

  describe('special characters', () => {
    it('should parse pattern with brackets [a-z]', () => {
      const result = parsePattern('file-[a-z].ts')
      expect(result).toEqual({
        pattern: 'file-[a-z].ts',
        isNegated: false,
        segments: ['file-[a-z].ts'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should parse pattern with braces {js,ts}', () => {
      const result = parsePattern('*.{js,ts}')
      expect(result).toEqual({
        pattern: '*.{js,ts}',
        isNegated: false,
        segments: ['*.{js,ts}'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should parse pattern with question mark', () => {
      const result = parsePattern('file?.ts')
      expect(result).toEqual({
        pattern: 'file?.ts',
        isNegated: false,
        segments: ['file?.ts'],
        isDirectory: false,
      } as ParsedPattern)
    })
  })

  describe('escaped characters', () => {
    it('should parse pattern with escaped wildcard', () => {
      const result = parsePattern('file\\*.ts')
      expect(result).toEqual({
        pattern: 'file\\*.ts',
        isNegated: false,
        segments: ['file\\*.ts'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should parse pattern with escaped exclamation', () => {
      const result = parsePattern('\\!important.txt')
      expect(result).toEqual({
        pattern: '\\!important.txt',
        isNegated: false,
        segments: ['\\!important.txt'],
        isDirectory: false,
      } as ParsedPattern)
    })
  })

  describe('validation', () => {
    it('should throw on pattern with only negation', () => {
      expect(() => parsePattern('!')).toThrow()
    })

    it('should throw on invalid double-star usage ***', () => {
      expect(() => parsePattern('src/***/lib')).toThrow()
    })

    it('should throw on whitespace-only pattern', () => {
      expect(() => parsePattern('   ')).toThrow()
    })
  })

  describe('normalization', () => {
    it('should normalize Windows-style paths', () => {
      const result = parsePattern('src\\lib\\file.ts')
      expect(result).toEqual({
        pattern: 'src\\lib\\file.ts',
        isNegated: false,
        segments: ['src', 'lib', 'file.ts'],
        isDirectory: false,
      } as ParsedPattern)
    })

    it('should normalize mixed separators', () => {
      const result = parsePattern('src\\lib/file.ts')
      expect(result).toEqual({
        pattern: 'src\\lib/file.ts',
        isNegated: false,
        segments: ['src', 'lib', 'file.ts'],
        isDirectory: false,
      } as ParsedPattern)
    })
  })
})
