/**
 * SandboxManager - Cloudflare Sandbox SDK Integration
 *
 * Manages Cloudflare Sandbox operations for Python and JavaScript code execution.
 * Simplified version without full observability layer (uses console logging).
 */

import { getSandbox } from '@cloudflare/sandbox'
import type { Env, ISandboxManager, SandboxExecResult } from './types'

/**
 * SandboxManager handles Cloudflare Sandbox operations
 */
export class SandboxManager implements ISandboxManager {
  private env: Env
  private sandboxStubs: Map<string, any> = new Map()
  private codeContexts: Map<string, any> = new Map()

  constructor(env: Env) {
    this.env = env
  }

  /**
   * Create a new sandbox instance using Durable Objects
   */
  async createSandbox(id: string, envVars?: Record<string, string>): Promise<void> {
    console.log(`[SandboxManager] Creating sandbox: ${id}`)

    if (this.sandboxStubs.has(id)) {
      throw new Error(`Sandbox ${id} already exists`)
    }

    if (!this.env.SANDBOX) {
      throw new Error('SANDBOX binding not available - containers must be enabled')
    }

    try {
      // Get Durable Object instance
      const sandbox = getSandbox(this.env.SANDBOX, id)

      // Set environment variables if provided
      if (envVars && Object.keys(envVars).length > 0) {
        await sandbox.setEnvVars(envVars)
      }

      // Cache the stub
      this.sandboxStubs.set(id, sandbox)

      // Cache metadata in KV if available
      if (this.env.KV) {
        await this.env.KV.put(
          `sandbox:${id}`,
          JSON.stringify({
            id,
            createdAt: Date.now(),
            envVars,
          }),
          { expirationTtl: 3600 }
        )
      }

      console.log(`[SandboxManager] Sandbox created: ${id}`)
    } catch (error) {
      console.error(`[SandboxManager] Failed to create sandbox: ${id}`, error)
      throw new Error(`Failed to create sandbox: ${(error as Error).message}`)
    }
  }

  /**
   * Execute code in a sandbox with optional persistent context
   */
  async executeCode(
    sandboxId: string,
    code: string,
    language: 'python' | 'javascript',
    contextId?: string
  ): Promise<SandboxExecResult> {
    const startTime = Date.now()
    console.log(`[SandboxManager] Executing code in sandbox: ${sandboxId}, language: ${language}`)

    try {
      const sandbox = this.sandboxStubs.get(sandboxId)
      if (!sandbox) {
        throw new Error(`Sandbox ${sandboxId} not found`)
      }

      // Get or create persistent code context
      let context = contextId ? this.codeContexts.get(contextId) : null
      if (contextId && !context) {
        context = await sandbox.createCodeContext({ language })
        this.codeContexts.set(contextId, context)
        console.log(`[SandboxManager] Created code context: ${contextId}`)
      }

      // Execute code with timeout
      const timeout = parseInt(this.env.SANDBOX_TIMEOUT_MS || '30000')
      const result = await sandbox.runCode(code, {
        context: context || undefined,
        timeout
      })

      const duration = Date.now() - startTime
      const exitCode = (result as any).exitCode || 0

      console.log(`[SandboxManager] Code execution completed: ${sandboxId}, exitCode: ${exitCode}, duration: ${duration}ms`)

      return {
        stdout: (result as any).stdout || '',
        stderr: (result as any).stderr || '',
        exitCode,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[SandboxManager] Code execution failed: ${sandboxId}`, error)

      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
        duration,
      }
    }
  }

  /**
   * Write file to sandbox filesystem
   */
  async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    console.log(`[SandboxManager] Writing file: ${sandboxId}:${path}`)

    try {
      const sandbox = this.sandboxStubs.get(sandboxId)
      if (!sandbox) {
        throw new Error(`Sandbox ${sandboxId} not found`)
      }

      await sandbox.writeFile(path, content)
      console.log(`[SandboxManager] File written: ${sandboxId}:${path}`)
    } catch (error) {
      console.error(`[SandboxManager] File write failed: ${sandboxId}:${path}`, error)
      throw new Error(`Failed to write file: ${(error as Error).message}`)
    }
  }

  /**
   * Read file from sandbox filesystem
   */
  async readFile(sandboxId: string, path: string): Promise<string> {
    console.log(`[SandboxManager] Reading file: ${sandboxId}:${path}`)

    try {
      const sandbox = this.sandboxStubs.get(sandboxId)
      if (!sandbox) {
        throw new Error(`Sandbox ${sandboxId} not found`)
      }

      const content = await sandbox.readFile(path)
      console.log(`[SandboxManager] File read: ${sandboxId}:${path}, size: ${content.length}`)
      return content
    } catch (error) {
      console.error(`[SandboxManager] File read failed: ${sandboxId}:${path}`, error)
      throw new Error(`Failed to read file: ${(error as Error).message}`)
    }
  }

  /**
   * Run a shell command in the sandbox
   */
  async runCommand(sandboxId: string, command: string, args: string[] = []): Promise<SandboxExecResult> {
    const startTime = Date.now()
    console.log(`[SandboxManager] Running command: ${sandboxId}:${command} ${args.join(' ')}`)

    try {
      const sandbox = this.sandboxStubs.get(sandboxId)
      if (!sandbox) {
        throw new Error(`Sandbox ${sandboxId} not found`)
      }

      const result = await sandbox.exec(command, args)
      const stdout = await result.text()
      const exitCode = result.ok ? 0 : 1
      const duration = Date.now() - startTime

      console.log(`[SandboxManager] Command completed: ${sandboxId}:${command}, exitCode: ${exitCode}, duration: ${duration}ms`)

      return {
        stdout,
        stderr: '',
        exitCode,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[SandboxManager] Command failed: ${sandboxId}:${command}`, error)

      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
        duration,
      }
    }
  }

  /**
   * Clone a git repository into the sandbox
   */
  async gitClone(sandboxId: string, repoUrl: string, branch?: string): Promise<void> {
    console.log(`[SandboxManager] Cloning repository: ${sandboxId}:${repoUrl}`)

    try {
      const sandbox = this.sandboxStubs.get(sandboxId)
      if (!sandbox) {
        throw new Error(`Sandbox ${sandboxId} not found`)
      }

      if (!repoUrl.startsWith('https://')) {
        throw new Error('Only HTTPS repository URLs are supported')
      }

      await sandbox.gitCheckout(repoUrl, {
        branch: branch || 'main',
        targetDir: '/app/repo'
      })

      console.log(`[SandboxManager] Repository cloned: ${sandboxId}:${repoUrl}`)
    } catch (error) {
      console.error(`[SandboxManager] Git clone failed: ${sandboxId}:${repoUrl}`, error)
      throw new Error(`Failed to clone repository: ${(error as Error).message}`)
    }
  }

  /**
   * Delete a sandbox instance
   */
  async deleteSandbox(sandboxId: string): Promise<void> {
    console.log(`[SandboxManager] Deleting sandbox: ${sandboxId}`)

    try {
      // Remove from local cache
      this.sandboxStubs.delete(sandboxId)

      // Clear associated code contexts
      for (const [ctxId, _ctx] of this.codeContexts.entries()) {
        if (ctxId.startsWith(sandboxId)) {
          this.codeContexts.delete(ctxId)
        }
      }

      // Remove from KV cache
      if (this.env.KV) {
        await this.env.KV.delete(`sandbox:${sandboxId}`)
      }

      console.log(`[SandboxManager] Sandbox deleted: ${sandboxId}`)
    } catch (error) {
      console.error(`[SandboxManager] Sandbox deletion failed: ${sandboxId}`, error)
      throw new Error(`Failed to delete sandbox: ${(error as Error).message}`)
    }
  }

  /**
   * List all active sandboxes
   */
  listSandboxes(): string[] {
    const sandboxIds = Array.from(this.sandboxStubs.keys())
    console.log(`[SandboxManager] Listing sandboxes: ${sandboxIds.length} active`)
    return sandboxIds
  }
}
