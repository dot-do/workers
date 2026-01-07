/**
 * MCP Tools for n8n.do
 *
 * AI-native workflow creation and execution via Model Context Protocol.
 */

export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required?: string[]
  }
}

export const n8nTools: McpTool[] = [
  {
    name: 'workflow_create',
    description: 'Create a new workflow with nodes and triggers',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Unique workflow identifier'
        },
        name: {
          type: 'string',
          description: 'Human-readable workflow name'
        },
        trigger: {
          type: 'string',
          description: 'Trigger type: webhook, cron, event, manual, interval',
          enum: ['webhook', 'cron', 'event', 'manual', 'interval']
        },
        triggerConfig: {
          type: 'string',
          description: 'Trigger configuration (cron expression, event name, interval duration)'
        },
        natural: {
          type: 'string',
          description: 'Natural language description of the workflow to create'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'workflow_execute',
    description: 'Execute a workflow with input data',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to execute'
        },
        data: {
          type: 'string',
          description: 'JSON string of input data for the workflow'
        }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'workflow_list',
    description: 'List all workflows',
    inputSchema: {
      type: 'object',
      properties: {
        triggerType: {
          type: 'string',
          description: 'Filter by trigger type',
          enum: ['webhook', 'cron', 'event', 'manual', 'interval']
        }
      }
    }
  },
  {
    name: 'workflow_get',
    description: 'Get workflow details by ID',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to retrieve'
        }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'workflow_delete',
    description: 'Delete a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to delete'
        }
      },
      required: ['workflowId']
    }
  },
  {
    name: 'execution_list',
    description: 'List workflow executions',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Filter by workflow ID'
        },
        status: {
          type: 'string',
          description: 'Filter by execution status',
          enum: ['running', 'success', 'error', 'waiting']
        },
        limit: {
          type: 'string',
          description: 'Maximum number of executions to return'
        }
      }
    }
  },
  {
    name: 'execution_get',
    description: 'Get execution details by ID',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: {
          type: 'string',
          description: 'ID of the execution to retrieve'
        }
      },
      required: ['executionId']
    }
  },
  {
    name: 'execution_retry',
    description: 'Retry a failed execution',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: {
          type: 'string',
          description: 'ID of the execution to retry'
        }
      },
      required: ['executionId']
    }
  },
  {
    name: 'node_run',
    description: 'Execute a single node with input data',
    inputSchema: {
      type: 'object',
      properties: {
        nodeType: {
          type: 'string',
          description: 'Type of node to execute',
          enum: ['httpRequest', 'code', 'if', 'switch', 'merge', 'slack', 'airtable', 'email']
        },
        config: {
          type: 'string',
          description: 'JSON string of node configuration'
        },
        items: {
          type: 'string',
          description: 'JSON string of input items'
        }
      },
      required: ['nodeType', 'config']
    }
  },
  {
    name: 'credential_create',
    description: 'Create a new credential',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Credential name'
        },
        type: {
          type: 'string',
          description: 'Credential type (e.g., slack, airtable, github)'
        },
        data: {
          type: 'string',
          description: 'JSON string of credential data (will be encrypted)'
        }
      },
      required: ['name', 'type', 'data']
    }
  },
  {
    name: 'credential_list',
    description: 'List all credentials (metadata only)',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Filter by credential type'
        }
      }
    }
  },
  {
    name: 'credential_delete',
    description: 'Delete a credential',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the credential to delete'
        }
      },
      required: ['name']
    }
  }
]

/**
 * Invoke an MCP tool
 */
export async function invokeTool(
  name: string,
  params: Record<string, unknown>
): Promise<unknown> {
  // TODO: Implement tool invocation via DO stubs
  throw new Error(`Tool invocation not implemented: ${name}`)
}
