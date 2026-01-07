import { describe, it, expect, beforeEach } from 'vitest'
import { Transaction } from './transaction'

describe('Transaction Builder', () => {
  describe('Transaction creation', () => {
    it('should create a new Transaction instance', () => {
      const tx = new Transaction()
      expect(tx).toBeInstanceOf(Transaction)
    })

    it('should start with empty operation queue', () => {
      const tx = new Transaction()
      expect(tx.operations).toEqual([])
      expect(tx.operations).toHaveLength(0)
    })

    it('should have pending status until executed', () => {
      const tx = new Transaction()
      expect(tx.status).toBe('pending')
    })
  })

  describe('Operation queuing', () => {
    let tx: Transaction

    beforeEach(() => {
      tx = new Transaction()
    })

    it('should queue a write operation', () => {
      const data = new Uint8Array([1, 2, 3])
      tx.writeFile('/test.txt', data)

      expect(tx.operations).toHaveLength(1)
      expect(tx.operations[0]).toEqual({
        type: 'write',
        path: '/test.txt',
        data
      })
    })

    it('should queue a delete operation', () => {
      tx.deleteFile('/test.txt')

      expect(tx.operations).toHaveLength(1)
      expect(tx.operations[0]).toEqual({
        type: 'delete',
        path: '/test.txt'
      })
    })

    it('should queue a rename operation', () => {
      tx.rename('/old.txt', '/new.txt')

      expect(tx.operations).toHaveLength(1)
      expect(tx.operations[0]).toEqual({
        type: 'rename',
        oldPath: '/old.txt',
        newPath: '/new.txt'
      })
    })

    it('should queue a mkdir operation', () => {
      tx.mkdir('/newdir')

      expect(tx.operations).toHaveLength(1)
      expect(tx.operations[0]).toEqual({
        type: 'mkdir',
        path: '/newdir'
      })
    })

    it('should store operations in order', () => {
      const data1 = new Uint8Array([1, 2, 3])
      const data2 = new Uint8Array([4, 5, 6])

      tx.writeFile('/a.txt', data1)
      tx.mkdir('/dir')
      tx.writeFile('/b.txt', data2)
      tx.deleteFile('/c.txt')
      tx.rename('/old.txt', '/new.txt')

      expect(tx.operations).toHaveLength(5)
      expect(tx.operations[0].type).toBe('write')
      expect(tx.operations[1].type).toBe('mkdir')
      expect(tx.operations[2].type).toBe('write')
      expect(tx.operations[3].type).toBe('delete')
      expect(tx.operations[4].type).toBe('rename')
    })
  })

  describe('Chainable API', () => {
    it('should return transaction instance from writeFile', () => {
      const tx = new Transaction()
      const result = tx.writeFile('/test.txt', new Uint8Array([1, 2, 3]))

      expect(result).toBe(tx)
      expect(result).toBeInstanceOf(Transaction)
    })

    it('should return transaction instance from deleteFile', () => {
      const tx = new Transaction()
      const result = tx.deleteFile('/test.txt')

      expect(result).toBe(tx)
      expect(result).toBeInstanceOf(Transaction)
    })

    it('should return transaction instance from rename', () => {
      const tx = new Transaction()
      const result = tx.rename('/old.txt', '/new.txt')

      expect(result).toBe(tx)
      expect(result).toBeInstanceOf(Transaction)
    })

    it('should return transaction instance from mkdir', () => {
      const tx = new Transaction()
      const result = tx.mkdir('/dir')

      expect(result).toBe(tx)
      expect(result).toBeInstanceOf(Transaction)
    })

    it('should support method chaining', () => {
      const tx = new Transaction()
      const data1 = new Uint8Array([1, 2, 3])
      const data2 = new Uint8Array([4, 5, 6])

      const result = tx
        .writeFile('/a.txt', data1)
        .mkdir('/dir')
        .writeFile('/b.txt', data2)
        .deleteFile('/c.txt')
        .rename('/old.txt', '/new.txt')

      expect(result).toBe(tx)
      expect(tx.operations).toHaveLength(5)
    })

    it('should allow inline transaction creation and chaining', () => {
      const data1 = new Uint8Array([1, 2, 3])
      const data2 = new Uint8Array([4, 5, 6])

      const tx = new Transaction()
        .writeFile('/a.txt', data1)
        .writeFile('/b.txt', data2)
        .deleteFile('/c.txt')

      expect(tx).toBeInstanceOf(Transaction)
      expect(tx.operations).toHaveLength(3)
    })
  })

  describe('Transaction state', () => {
    it('should start with pending status', () => {
      const tx = new Transaction()
      expect(tx.status).toBe('pending')
    })

    it('should not allow operations after execution (committed)', () => {
      const tx = new Transaction()

      // Manually set status to committed to test state check
      // This will be properly tested in the execute tests
      Object.defineProperty(tx, 'status', { value: 'committed', writable: false })

      expect(() => {
        tx.writeFile('/test.txt', new Uint8Array([1, 2, 3]))
      }).toThrow(/cannot add operations/i)
    })

    it('should not allow operations after rollback', () => {
      const tx = new Transaction()

      // Manually set status to rolled_back to test state check
      Object.defineProperty(tx, 'status', { value: 'rolled_back', writable: false })

      expect(() => {
        tx.deleteFile('/test.txt')
      }).toThrow(/cannot add operations/i)
    })
  })

  describe('Operation types', () => {
    it('should store correct operation type for writeFile', () => {
      const tx = new Transaction()
      tx.writeFile('/test.txt', new Uint8Array([1, 2, 3]))

      expect(tx.operations[0]).toHaveProperty('type', 'write')
      expect(tx.operations[0]).toHaveProperty('path')
      expect(tx.operations[0]).toHaveProperty('data')
    })

    it('should store correct operation type for deleteFile', () => {
      const tx = new Transaction()
      tx.deleteFile('/test.txt')

      expect(tx.operations[0]).toHaveProperty('type', 'delete')
      expect(tx.operations[0]).toHaveProperty('path')
    })

    it('should store correct operation type for rename', () => {
      const tx = new Transaction()
      tx.rename('/old.txt', '/new.txt')

      expect(tx.operations[0]).toHaveProperty('type', 'rename')
      expect(tx.operations[0]).toHaveProperty('oldPath')
      expect(tx.operations[0]).toHaveProperty('newPath')
    })

    it('should store correct operation type for mkdir', () => {
      const tx = new Transaction()
      tx.mkdir('/dir')

      expect(tx.operations[0]).toHaveProperty('type', 'mkdir')
      expect(tx.operations[0]).toHaveProperty('path')
    })
  })

  describe('Data integrity', () => {
    it('should preserve exact data bytes in write operations', () => {
      const tx = new Transaction()
      const data = new Uint8Array([0, 1, 2, 255, 254, 253])

      tx.writeFile('/test.txt', data)

      const storedOp = tx.operations[0] as any
      expect(storedOp.data).toBe(data) // Same reference
      expect(storedOp.data).toEqual(data) // Same content
    })

    it('should preserve path strings exactly', () => {
      const tx = new Transaction()
      const path = '/some/deep/path/file.txt'

      tx.writeFile(path, new Uint8Array([1]))

      expect(tx.operations[0]).toHaveProperty('path', path)
    })

    it('should handle multiple operations with same path', () => {
      const tx = new Transaction()
      const data1 = new Uint8Array([1, 2, 3])
      const data2 = new Uint8Array([4, 5, 6])

      tx.writeFile('/test.txt', data1)
      tx.writeFile('/test.txt', data2)

      expect(tx.operations).toHaveLength(2)
      expect((tx.operations[0] as any).data).toBe(data1)
      expect((tx.operations[1] as any).data).toBe(data2)
    })
  })
})
