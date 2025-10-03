import type { Context } from 'hono'
import type { Env, User, MCPTool } from '../types'

/**
 * Queue Tools
 * Background job management
 */

export function getTools(): MCPTool[] {
  return [
    {
      name: 'queue_enqueue',
      description: 'Add a job to the queue for background processing',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Job type (e.g., generate, embed, import)'
          },
          data: {
            type: 'object',
            description: 'Job payload data'
          },
          priority: {
            type: 'number',
            description: 'Job priority 0-10 (default: 5)',
            default: 5
          },
          delay: {
            type: 'number',
            description: 'Delay in seconds before processing (default: 0)',
            default: 0
          }
        },
        required: ['type', 'data']
      }
    },
    {
      name: 'queue_status',
      description: 'Check status of a queued job',
      inputSchema: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: 'Job ID to check'
          }
        },
        required: ['jobId']
      }
    },
    {
      name: 'queue_list',
      description: 'List queued jobs with filters',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
            description: 'Filter by status (optional)'
          },
          type: {
            type: 'string',
            description: 'Filter by job type (optional)'
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

export async function queue_enqueue(
  args: { type: string; data: any; priority?: number; delay?: number },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const queue = c.env.QUEUE
  if (!queue) throw new Error('Queue service not available')

  return await queue.enqueue({
    type: args.type,
    data: args.data,
    priority: args.priority || 5,
    delay: args.delay || 0,
    userId: user?.id
  })
}

export async function queue_status(
  args: { jobId: string },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const queue = c.env.QUEUE
  if (!queue) throw new Error('Queue service not available')

  return await queue.getStatus(args.jobId)
}

export async function queue_list(
  args: { status?: string; type?: string; limit?: number },
  c: Context<{ Bindings: Env }>,
  user: User | null
): Promise<any> {
  const queue = c.env.QUEUE
  if (!queue) throw new Error('Queue service not available')

  return await queue.listJobs({
    status: args.status,
    type: args.type,
    limit: args.limit || 50,
    userId: user?.id
  })
}
