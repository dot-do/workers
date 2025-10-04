/**
 * Remote Integration Tests for YAML Worker
 *
 * Tests the YAML worker deployed to Cloudflare using remote:true bindings.
 * This runs against the actual deployed worker, not a local simulation.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'

describe('YAML Worker (Remote)', () => {
  let yamlService: any

  beforeAll(() => {
    yamlService = env.YAML_SERVICE
    if (!yamlService) {
      throw new Error('YAML_SERVICE binding not found - worker may not be deployed')
    }
  })

  describe('parse()', () => {
    it('should parse simple YAML', async () => {
      const yaml = 'name: John\nage: 30'
      const result = await yamlService.parse(yaml)

      expect(result).toEqual({
        name: 'John',
        age: 30,
      })
    })

    it('should parse nested YAML', async () => {
      const yaml = `
person:
  name: John
  address:
    city: New York
    zip: 10001
`
      const result = await yamlService.parse(yaml)

      expect(result).toEqual({
        person: {
          name: 'John',
          address: {
            city: 'New York',
            zip: 10001,
          },
        },
      })
    })

    it('should parse YAML arrays', async () => {
      const yaml = `
items:
  - name: Item 1
    price: 10
  - name: Item 2
    price: 20
`
      const result = await yamlService.parse(yaml)

      expect(result).toEqual({
        items: [
          { name: 'Item 1', price: 10 },
          { name: 'Item 2', price: 20 },
        ],
      })
    })

    it('should handle empty YAML', async () => {
      const result = await yamlService.parse('')
      expect(result).toBeUndefined()
    })
  })

  describe('stringify()', () => {
    it('should stringify simple object', async () => {
      const obj = { name: 'John', age: 30 }
      const result = await yamlService.stringify(obj)

      expect(result).toContain('name: John')
      expect(result).toContain('age: 30')
    })

    it('should stringify nested object', async () => {
      const obj = {
        person: {
          name: 'John',
          address: {
            city: 'New York',
          },
        },
      }
      const result = await yamlService.stringify(obj)

      expect(result).toContain('person:')
      expect(result).toContain('name: John')
      expect(result).toContain('address:')
      expect(result).toContain('city: New York')
    })

    it('should stringify arrays', async () => {
      const obj = {
        items: ['item1', 'item2', 'item3'],
      }
      const result = await yamlService.stringify(obj)

      expect(result).toContain('items:')
      expect(result).toContain('- item1')
      expect(result).toContain('- item2')
      expect(result).toContain('- item3')
    })

    it('should handle null and undefined', async () => {
      const result = await yamlService.stringify({ value: null })
      expect(result).toContain('value: null')
    })
  })

  describe('fetch()', () => {
    it('should return success response', async () => {
      const response = await yamlService.fetch()
      expect(response).toBeDefined()

      const json = await response.json()
      expect(json).toEqual({ success: true })
    })
  })

  describe('Round-trip', () => {
    it('should preserve data through parse → stringify cycle', async () => {
      const original = {
        title: 'Test Document',
        metadata: {
          author: 'John Doe',
          date: '2025-01-01',
        },
        items: [1, 2, 3],
      }

      const yaml = await yamlService.stringify(original)
      const parsed = await yamlService.parse(yaml)

      expect(parsed).toEqual(original)
    })
  })
})
