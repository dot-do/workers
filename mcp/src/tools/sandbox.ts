import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'
import { SandboxManager } from '../sandbox-manager'

/**
 * Sandbox Execution Tools
 * Execute Python and JavaScript code in secure Cloudflare Sandboxes
 */

export function getTools(): MCPTool[] {
  return [
    {
      name: 'sandbox_create',
      description: `Create a new sandbox instance for executing Python or JavaScript code.

Each sandbox is isolated with its own filesystem and environment variables.
Use this before executing code or performing file operations.

Example:
- Create a sandbox: sandbox_create({ sandboxId: "data-analysis", envVars: { "API_KEY": "xxx" } })`,
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: {
            type: 'string',
            description: 'Unique identifier for the sandbox. Use descriptive names like "data-analysis" or "ml-training".'
          },
          envVars: {
            type: 'object',
            description: 'Optional environment variables to set in the sandbox (e.g., API keys, config values)'
          }
        },
        required: ['sandboxId']
      }
    },
    {
      name: 'sandbox_execute_python',
      description: `Execute Python code in a sandbox with optional persistent context.

Supports:
- Standard library and common packages (pandas, numpy, requests, etc.)
- Persistent REPL-like contexts (variables persist across executions)
- File I/O operations
- Network requests

Example:
- Execute code: sandbox_execute_python({ sandboxId: "test", code: "import pandas as pd\\nprint(pd.__version__)" })
- With context: sandbox_execute_python({ sandboxId: "test", code: "x = x + 1\\nprint(x)", contextId: "session1" })`,
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: {
            type: 'string',
            description: 'Sandbox identifier where code will execute'
          },
          code: {
            type: 'string',
            description: 'Python code to execute. Use print() for output.'
          },
          contextId: {
            type: 'string',
            description: 'Optional context ID for persistent variables (REPL-like behavior). Same context = same variables.'
          },
          timeout: {
            type: 'number',
            description: 'Execution timeout in milliseconds (default: 30000, max: 60000)',
            default: 30000
          }
        },
        required: ['sandboxId', 'code']
      }
    },
    {
      name: 'sandbox_execute_javascript',
      description: `Execute JavaScript code in a sandbox with optional persistent context.

Supports:
- Modern JavaScript (ES2022)
- Node.js built-in modules
- Persistent REPL-like contexts
- Async/await
- Network requests

Example:
- Execute code: sandbox_execute_javascript({ sandboxId: "test", code: "console.log('Hello World')" })
- With context: sandbox_execute_javascript({ sandboxId: "test", code: "count++; console.log(count)", contextId: "session1" })`,
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: {
            type: 'string',
            description: 'Sandbox identifier where code will execute'
          },
          code: {
            type: 'string',
            description: 'JavaScript code to execute. Use console.log() for output.'
          },
          contextId: {
            type: 'string',
            description: 'Optional context ID for persistent variables (REPL-like behavior)'
          },
          timeout: {
            type: 'number',
            description: 'Execution timeout in milliseconds (default: 30000, max: 60000)',
            default: 30000
          }
        },
        required: ['sandboxId', 'code']
      }
    },
    {
      name: 'sandbox_write_file',
      description: `Write a file to the sandbox filesystem.

Files persist within the sandbox and can be read by code executions.
Supports creating directories automatically.

Example:
- Write data: sandbox_write_file({ sandboxId: "test", path: "/app/data.csv", content: "name,age\\nAlice,30" })`,
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: {
            type: 'string',
            description: 'Sandbox identifier'
          },
          path: {
            type: 'string',
            description: 'File path (absolute or relative to /app). Directories created automatically.'
          },
          content: {
            type: 'string',
            description: 'File content to write'
          }
        },
        required: ['sandboxId', 'path', 'content']
      }
    },
    {
      name: 'sandbox_read_file',
      description: `Read a file from the sandbox filesystem.

Returns the file content as a string.

Example:
- Read data: sandbox_read_file({ sandboxId: "test", path: "/app/data.csv" })`,
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: {
            type: 'string',
            description: 'Sandbox identifier'
          },
          path: {
            type: 'string',
            description: 'File path to read'
          }
        },
        required: ['sandboxId', 'path']
      }
    },
    {
      name: 'sandbox_run_command',
      description: `Run a shell command in the sandbox.

Supports standard Unix commands (ls, cat, grep, git, etc.).
Returns stdout, stderr, and exit code.

Example:
- List files: sandbox_run_command({ sandboxId: "test", command: "ls", args: ["-la", "/app"] })
- Run script: sandbox_run_command({ sandboxId: "test", command: "python", args: ["script.py"] })`,
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: {
            type: 'string',
            description: 'Sandbox identifier'
          },
          command: {
            type: 'string',
            description: 'Command to execute (e.g., "ls", "python", "git")'
          },
          args: {
            type: 'array',
            items: { type: 'string' },
            description: 'Command arguments',
            default: []
          },
          timeout: {
            type: 'number',
            description: 'Command timeout in milliseconds (default: 30000)',
            default: 30000
          }
        },
        required: ['sandboxId', 'command']
      }
    },
    {
      name: 'sandbox_git_clone',
      description: `Clone a Git repository into the sandbox.

Clones the repository to /app/repo by default.
Only HTTPS URLs are supported (no SSH).

Example:
- Clone repo: sandbox_git_clone({ sandboxId: "test", repoUrl: "https://github.com/user/repo.git", branch: "main" })`,
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: {
            type: 'string',
            description: 'Sandbox identifier'
          },
          repoUrl: {
            type: 'string',
            description: 'Git repository URL (HTTPS only, e.g., https://github.com/user/repo.git)'
          },
          branch: {
            type: 'string',
            description: 'Branch to clone (default: "main")',
            default: 'main'
          }
        },
        required: ['sandboxId', 'repoUrl']
      }
    },
    {
      name: 'sandbox_list',
      description: `List all active sandbox instances.

Returns an array of sandbox IDs.

Example:
- List sandboxes: sandbox_list({})`,
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'sandbox_delete',
      description: `Delete a sandbox instance and clean up resources.

Removes the sandbox from memory and clears associated contexts.

Example:
- Delete sandbox: sandbox_delete({ sandboxId: "test" })`,
      inputSchema: {
        type: 'object',
        properties: {
          sandboxId: {
            type: 'string',
            description: 'Sandbox identifier to delete'
          }
        },
        required: ['sandboxId']
      }
    }
  ]
}

// Shared sandbox manager instance (per-request)
function getSandboxManager(env: Env): SandboxManager {
  return new SandboxManager(env)
}

/**
 * Create a new sandbox instance
 */
export async function sandbox_create(
  args: {
    sandboxId: string
    envVars?: Record<string, string>
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const manager = getSandboxManager(c.env)
  await manager.createSandbox(args.sandboxId, args.envVars)
  return {
    success: true,
    sandboxId: args.sandboxId,
    message: 'Sandbox created successfully'
  }
}

/**
 * Execute Python code
 */
export async function sandbox_execute_python(
  args: {
    sandboxId: string
    code: string
    contextId?: string
    timeout?: number
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const manager = getSandboxManager(c.env)
  const result = await manager.executeCode(args.sandboxId, args.code, 'python', args.contextId)
  return result
}

/**
 * Execute JavaScript code
 */
export async function sandbox_execute_javascript(
  args: {
    sandboxId: string
    code: string
    contextId?: string
    timeout?: number
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const manager = getSandboxManager(c.env)
  const result = await manager.executeCode(args.sandboxId, args.code, 'javascript', args.contextId)
  return result
}

/**
 * Write file to sandbox
 */
export async function sandbox_write_file(
  args: {
    sandboxId: string
    path: string
    content: string
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const manager = getSandboxManager(c.env)
  await manager.writeFile(args.sandboxId, args.path, args.content)
  return {
    success: true,
    path: args.path,
    size: args.content.length
  }
}

/**
 * Read file from sandbox
 */
export async function sandbox_read_file(
  args: {
    sandboxId: string
    path: string
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const manager = getSandboxManager(c.env)
  const content = await manager.readFile(args.sandboxId, args.path)
  return {
    path: args.path,
    content,
    size: content.length
  }
}

/**
 * Run command in sandbox
 */
export async function sandbox_run_command(
  args: {
    sandboxId: string
    command: string
    args?: string[]
    timeout?: number
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const manager = getSandboxManager(c.env)
  const result = await manager.runCommand(args.sandboxId, args.command, args.args || [])
  return result
}

/**
 * Clone git repository
 */
export async function sandbox_git_clone(
  args: {
    sandboxId: string
    repoUrl: string
    branch?: string
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const manager = getSandboxManager(c.env)
  await manager.gitClone(args.sandboxId, args.repoUrl, args.branch)
  return {
    success: true,
    repoUrl: args.repoUrl,
    branch: args.branch || 'main',
    targetDir: '/app/repo'
  }
}

/**
 * List all sandboxes
 */
export async function sandbox_list(
  args: {},
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const manager = getSandboxManager(c.env)
  const sandboxes = manager.listSandboxes()
  return {
    sandboxes,
    count: sandboxes.length
  }
}

/**
 * Delete sandbox
 */
export async function sandbox_delete(
  args: {
    sandboxId: string
  },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const manager = getSandboxManager(c.env)
  await manager.deleteSandbox(args.sandboxId)
  return {
    success: true,
    sandboxId: args.sandboxId,
    message: 'Sandbox deleted successfully'
  }
}
