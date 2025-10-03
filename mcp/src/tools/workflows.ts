import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'

/**
 * Workflow Tools
 * Workflow execution and management
 */

export function getTools(): MCPTool[] {
  return [
    {
      name: 'workflow_start',
      description: 'Start a workflow execution',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'Workflow ID to execute'
          },
          input: {
            type: 'object',
            description: 'Workflow input data'
          },
          config: {
            type: 'object',
            description: 'Execution configuration (optional)'
          }
        },
        required: ['workflowId', 'input']
      }
    },
    {
      name: 'workflow_status',
      description: 'Check workflow execution status',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: {
            type: 'string',
            description: 'Execution ID to check'
          }
        },
        required: ['executionId']
      }
    },
    {
      name: 'workflow_list',
      description: 'List available workflows or executions',
      inputSchema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['workflows', 'executions'],
            description: 'List workflows or executions (default: workflows)',
            default: 'workflows'
          },
          status: {
            type: 'string',
            enum: ['running', 'completed', 'failed'],
            description: 'Filter executions by status (optional)'
          },
          limit: {
            type: 'number',
            description: 'Maximum results (default: 50)',
            default: 50
          }
        }
      }
    }
  ]
}

export async function workflow_start(
  args: { workflowId: string; input: any; config?: any },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const workflows = c.env.WORKFLOWS
  if (!workflows) throw new Error('Workflows service not available')

  return await workflows.start({
    workflowId: args.workflowId,
    input: args.input,
    config: args.config,
    userId: user?.id
  })
}

export async function workflow_status(
  args: { executionId: string },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const workflows = c.env.WORKFLOWS
  if (!workflows) throw new Error('Workflows service not available')

  return await workflows.getStatus(args.executionId)
}

export async function workflow_list(
  args: { mode?: string; status?: string; limit?: number },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const workflows = c.env.WORKFLOWS
  if (!workflows) throw new Error('Workflows service not available')

  if (args.mode === 'executions') {
    return await workflows.listExecutions({
      status: args.status,
      limit: args.limit || 50,
      userId: user?.id
    })
  }

  return await workflows.listWorkflows({
    limit: args.limit || 50
  })
}
