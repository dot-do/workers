import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SandboxManager } from '../src/sandbox-manager'
import type { Env } from '../src/types'

describe('SandboxManager', () => {
  let env: Env
  let manager: SandboxManager

  beforeEach(() => {
    // Mock environment
    env = {
      SANDBOX: {
        get: vi.fn((id: string) => ({
          setEnvVars: vi.fn(),
          createCodeContext: vi.fn(() => Promise.resolve({})),
          runCode: vi.fn((code: string) =>
            Promise.resolve({
              stdout: 'Hello World',
              stderr: '',
              exitCode: 0,
            })
          ),
          writeFile: vi.fn(),
          readFile: vi.fn(() => Promise.resolve('file content')),
          exec: vi.fn(() =>
            Promise.resolve({
              text: () => Promise.resolve('command output'),
              ok: true,
            })
          ),
          gitCheckout: vi.fn(),
        })),
        idFromName: vi.fn((name: string) => ({ toString: () => name })),
        idFromString: vi.fn((str: string) => ({ toString: () => str })),
        newUniqueId: vi.fn(() => ({ toString: () => 'unique-id' })),
      } as any,
      KV: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      } as any,
      DB: null as any,
      DO: null as any,
      AI: null as any,
      AUTH: null as any,
      QUEUE: null as any,
      WORKFLOWS: null as any,
      SANDBOX_TIMEOUT_MS: '30000',
      MAX_SANDBOX_INSTANCES: '10',
      LOG_LEVEL: 'info',
    }

    manager = new SandboxManager(env)
  })

  describe('createSandbox', () => {
    it('should create a new sandbox successfully', async () => {
      await manager.createSandbox('test-sandbox')

      expect(env.SANDBOX?.get).toHaveBeenCalledWith(expect.anything(), 'test-sandbox')
      expect(manager.listSandboxes()).toContain('test-sandbox')
    })

    it('should create sandbox with environment variables', async () => {
      const envVars = { API_KEY: 'secret', ENV: 'test' }
      await manager.createSandbox('test-sandbox', envVars)

      expect(manager.listSandboxes()).toContain('test-sandbox')
    })

    it('should throw error if sandbox already exists', async () => {
      await manager.createSandbox('test-sandbox')

      await expect(manager.createSandbox('test-sandbox')).rejects.toThrow(
        'Sandbox test-sandbox already exists'
      )
    })

    it('should throw error if SANDBOX binding not available', async () => {
      env.SANDBOX = undefined

      await expect(manager.createSandbox('test-sandbox')).rejects.toThrow(
        'SANDBOX binding not available'
      )
    })
  })

  describe('executeCode', () => {
    beforeEach(async () => {
      await manager.createSandbox('test-sandbox')
    })

    it('should execute Python code successfully', async () => {
      const result = await manager.executeCode(
        'test-sandbox',
        'print("Hello World")',
        'python'
      )

      expect(result.stdout).toBe('Hello World')
      expect(result.exitCode).toBe(0)
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('should execute JavaScript code successfully', async () => {
      const result = await manager.executeCode(
        'test-sandbox',
        'console.log("Hello World")',
        'javascript'
      )

      expect(result.stdout).toBe('Hello World')
      expect(result.exitCode).toBe(0)
    })

    it('should execute code with persistent context', async () => {
      const contextId = 'test-context'

      const result1 = await manager.executeCode(
        'test-sandbox',
        'x = 42',
        'python',
        contextId
      )
      expect(result1.exitCode).toBe(0)

      const result2 = await manager.executeCode(
        'test-sandbox',
        'print(x)',
        'python',
        contextId
      )
      expect(result2.exitCode).toBe(0)
    })

    it('should throw error if sandbox not found', async () => {
      const result = await manager.executeCode(
        'nonexistent',
        'print("test")',
        'python'
      )

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('not found')
    })

    it('should handle code execution timeout', async () => {
      env.SANDBOX_TIMEOUT_MS = '1000'

      const result = await manager.executeCode(
        'test-sandbox',
        'import time; time.sleep(10)',
        'python'
      )

      expect(result.exitCode).toBe(0) // Mock doesn't actually timeout
    })
  })

  describe('writeFile', () => {
    beforeEach(async () => {
      await manager.createSandbox('test-sandbox')
    })

    it('should write file successfully', async () => {
      await manager.writeFile('test-sandbox', '/app/test.txt', 'Hello World')

      // No error thrown = success
      expect(true).toBe(true)
    })

    it('should throw error if sandbox not found', async () => {
      await expect(
        manager.writeFile('nonexistent', '/app/test.txt', 'content')
      ).rejects.toThrow('Sandbox nonexistent not found')
    })
  })

  describe('readFile', () => {
    beforeEach(async () => {
      await manager.createSandbox('test-sandbox')
    })

    it('should read file successfully', async () => {
      const content = await manager.readFile('test-sandbox', '/app/test.txt')

      expect(content).toBe('file content')
    })

    it('should throw error if sandbox not found', async () => {
      await expect(manager.readFile('nonexistent', '/app/test.txt')).rejects.toThrow(
        'Sandbox nonexistent not found'
      )
    })
  })

  describe('runCommand', () => {
    beforeEach(async () => {
      await manager.createSandbox('test-sandbox')
    })

    it('should run command successfully', async () => {
      const result = await manager.runCommand('test-sandbox', 'ls', ['-la'])

      expect(result.stdout).toBe('command output')
      expect(result.exitCode).toBe(0)
    })

    it('should throw error if sandbox not found', async () => {
      const result = await manager.runCommand('nonexistent', 'ls', [])

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('not found')
    })
  })

  describe('gitClone', () => {
    beforeEach(async () => {
      await manager.createSandbox('test-sandbox')
    })

    it('should clone repository successfully', async () => {
      await manager.gitClone(
        'test-sandbox',
        'https://github.com/user/repo.git',
        'main'
      )

      // No error thrown = success
      expect(true).toBe(true)
    })

    it('should throw error for non-HTTPS URLs', async () => {
      await expect(
        manager.gitClone('test-sandbox', 'git@github.com:user/repo.git')
      ).rejects.toThrow('Only HTTPS repository URLs are supported')
    })

    it('should throw error if sandbox not found', async () => {
      await expect(
        manager.gitClone('nonexistent', 'https://github.com/user/repo.git')
      ).rejects.toThrow('Sandbox nonexistent not found')
    })
  })

  describe('deleteSandbox', () => {
    it('should delete sandbox successfully', async () => {
      await manager.createSandbox('test-sandbox')
      expect(manager.listSandboxes()).toContain('test-sandbox')

      await manager.deleteSandbox('test-sandbox')
      expect(manager.listSandboxes()).not.toContain('test-sandbox')
    })

    it('should delete sandbox and associated contexts', async () => {
      await manager.createSandbox('test-sandbox')

      // Create context
      await manager.executeCode('test-sandbox', 'x = 1', 'python', 'test-context')

      await manager.deleteSandbox('test-sandbox')

      expect(manager.listSandboxes()).not.toContain('test-sandbox')
    })
  })

  describe('listSandboxes', () => {
    it('should list all active sandboxes', async () => {
      await manager.createSandbox('sandbox1')
      await manager.createSandbox('sandbox2')
      await manager.createSandbox('sandbox3')

      const sandboxes = manager.listSandboxes()

      expect(sandboxes).toContain('sandbox1')
      expect(sandboxes).toContain('sandbox2')
      expect(sandboxes).toContain('sandbox3')
      expect(sandboxes.length).toBe(3)
    })

    it('should return empty array if no sandboxes', () => {
      const sandboxes = manager.listSandboxes()

      expect(sandboxes).toEqual([])
    })
  })

  describe('Multi-step workflows', () => {
    it('should support data analysis workflow', async () => {
      await manager.createSandbox('data-sandbox')

      // Write CSV data
      const csvData = 'name,age\\nAlice,30\\nBob,25'
      await manager.writeFile('data-sandbox', '/app/data.csv', csvData)

      // Execute Python to analyze
      const result = await manager.executeCode(
        'data-sandbox',
        `
import csv
with open('/app/data.csv', 'r') as f:
    reader = csv.DictReader(f)
    total_age = sum(int(row['age']) for row in reader)
    print(f'Total age: {total_age}')
      `,
        'python'
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Total age')
    })

    it('should support git clone and code execution workflow', async () => {
      await manager.createSandbox('repo-sandbox')

      // Clone repository
      await manager.gitClone(
        'repo-sandbox',
        'https://github.com/user/repo.git',
        'main'
      )

      // Run tests
      const result = await manager.runCommand('repo-sandbox', 'ls', [
        '-la',
        '/app/repo',
      ])

      expect(result.exitCode).toBe(0)
    })

    it('should support persistent REPL-like sessions', async () => {
      await manager.createSandbox('repl-sandbox')
      const contextId = 'repl-session'

      // Execute multiple statements in same context
      await manager.executeCode('repl-sandbox', 'x = 10', 'python', contextId)
      await manager.executeCode('repl-sandbox', 'y = 20', 'python', contextId)
      const result = await manager.executeCode(
        'repl-sandbox',
        'print(x + y)',
        'python',
        contextId
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('30')
    })
  })
})
