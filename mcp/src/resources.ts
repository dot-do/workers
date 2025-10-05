import type { Context } from 'hono'
import type { Env, MCPResource, MCPResourceContent } from './types'

/**
 * MCP Resources
 * Provide access to platform documentation and metadata
 */

export function listResources(): MCPResource[] {
  return [
    {
      uri: 'docs://api-reference',
      name: 'API Reference',
      description: 'Complete API documentation',
      mimeType: 'text/markdown'
    },
    {
      uri: 'docs://database-schema',
      name: 'Database Schema',
      description: 'Database schema documentation',
      mimeType: 'text/markdown'
    },
    {
      uri: 'docs://tool-catalog',
      name: 'Tool Catalog',
      description: 'All available MCP tools',
      mimeType: 'application/json'
    },
    {
      uri: 'docs://examples',
      name: 'Usage Examples',
      description: 'Common workflow examples',
      mimeType: 'text/markdown'
    }
  ]
}

export async function readResource(
  uri: string,
  c: Context<{ Bindings: Env }>
): Promise<MCPResourceContent> {
  switch (uri) {
    case 'docs://api-reference':
      return {
        uri,
        mimeType: 'text/markdown',
        text: getApiReference()
      }

    case 'docs://database-schema':
      return {
        uri,
        mimeType: 'text/markdown',
        text: getDatabaseSchema()
      }

    case 'docs://tool-catalog':
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(getToolCatalog(), null, 2)
      }

    case 'docs://examples':
      return {
        uri,
        mimeType: 'text/markdown',
        text: getExamples()
      }

    default:
      throw new Error(`Unknown resource: ${uri}`)
  }
}

function getApiReference(): string {
  return `# API Reference

## Database Tools

### db_query
Execute SQL queries against the database.

**Parameters:**
- \`sql\` (string, required): SQL query
- \`params\` (array, optional): Query parameters

**Example:**
\`\`\`json
{
  "sql": "SELECT * FROM things WHERE ns = $1 LIMIT 10",
  "params": ["onet"]
}
\`\`\`

### db_get
Get entity by namespace and ID.

### db_list
List entities with filters.

### db_upsert
Create or update entity.

### db_delete
Delete entity (soft or hard delete).

## AI Tools

### ai_generate
Generate text using AI models.

### ai_stream
Stream text generation.

### ai_embed
Generate text embeddings.

### ai_analyze
Analyze content with structured output.

## Auth Tools

### auth_create_key
Generate API key.

### auth_list_keys
List API keys.

### auth_revoke_key
Revoke API key.

### auth_get_user
Get current user info.

## Search Tools

### db_search
Full-text, vector, or hybrid search.

## Queue Tools

### queue_enqueue
Add background job.

### queue_status
Check job status.

### queue_list
List jobs.

## Workflow Tools

### workflow_start
Start workflow execution.

### workflow_status
Check execution status.

### workflow_list
List workflows or executions.
`
}

function getDatabaseSchema(): string {
  return `# Database Schema

## Things Table

Stores all entities in the knowledge graph.

**Columns:**
- \`ns\` (text): Namespace (e.g., onet, naics, schema)
- \`id\` (text): Entity ID
- \`v\` (serial): Version number (auto-incrementing)
- \`type\` (text): Schema.org type
- \`data\` (jsonb): Entity data
- \`content\` (text): Markdown content
- \`visibility\` (text): public, private, unlisted
- \`embedding\` (vector(768)): Text embedding
- \`createdAt\` (timestamp): Creation time
- \`updatedAt\` (timestamp): Last update time

**Primary Key:** (ns, id)

**Indexes:**
- Full-text search on data + content
- Vector similarity on embedding
- Type index for filtering

## Relationships Table

Stores relationships between entities.

**Columns:**
- \`ns\` (text): Namespace
- \`id\` (text): Relationship ID
- \`type\` (text): Relationship type
- \`fromNs\` (text): Source namespace
- \`fromId\` (text): Source ID
- \`toNs\` (text): Target namespace
- \`toId\` (text): Target ID
- \`data\` (jsonb): Relationship metadata
- \`visibility\` (text): public, private, unlisted

## Namespaces

- \`onet\`: O*NET occupation data
- \`naics\`: NAICS industry classifications
- \`schema\`: Schema.org vocabulary
- \`zapier\`: Zapier integrations
- \`gs1\`: GS1 standards
- \`apqc\`: APQC process framework
- \`services\`: Platform services
- \`user:{userId}\`: User personal namespace
`
}

function getToolCatalog(): any {
  return {
    categories: [
      {
        name: 'Database Tools',
        tools: ['db_query', 'db_get', 'db_list', 'db_upsert', 'db_delete'],
        count: 5
      },
      {
        name: 'AI Tools',
        tools: ['ai_generate', 'ai_stream', 'ai_embed', 'ai_analyze'],
        count: 4
      },
      {
        name: 'Auth Tools',
        tools: ['auth_create_key', 'auth_list_keys', 'auth_revoke_key', 'auth_get_user'],
        count: 4
      },
      {
        name: 'Search Tools',
        tools: ['db_search'],
        count: 1
      },
      {
        name: 'Queue Tools',
        tools: ['queue_enqueue', 'queue_status', 'queue_list'],
        count: 3
      },
      {
        name: 'Workflow Tools',
        tools: ['workflow_start', 'workflow_status', 'workflow_list'],
        count: 3
      }
    ],
    total: 20,
    authentication: {
      public: ['db_search'],
      authenticated: 'all other tools'
    }
  }
}

function getExamples(): string {
  return `# Usage Examples

## Example 1: Search and Retrieve

\`\`\`json
// Search for occupations
{
  "tool": "db_search",
  "arguments": {
    "query": "software developer",
    "mode": "hybrid",
    "namespace": "onet",
    "limit": 5
  }
}

// Get specific occupation
{
  "tool": "db_get",
  "arguments": {
    "namespace": "onet",
    "id": "15-1252.00"
  }
}
\`\`\`

## Example 2: AI Generation

\`\`\`json
// Generate summary
{
  "tool": "ai_generate",
  "arguments": {
    "prompt": "Summarize the key skills for a software developer",
    "maxTokens": 500,
    "temperature": 0.7
  }
}

// Generate embedding
{
  "tool": "ai_embed",
  "arguments": {
    "text": "Software development involves coding, testing, and debugging"
  }
}
\`\`\`

## Example 3: Create Entity

\`\`\`json
{
  "tool": "db_upsert",
  "arguments": {
    "namespace": "user:abc123",
    "id": "my-custom-skill",
    "type": "DefinedTerm",
    "data": {
      "name": "TypeScript Development",
      "description": "Building applications with TypeScript"
    },
    "visibility": "public"
  }
}
\`\`\`

## Example 4: Background Job

\`\`\`json
// Enqueue job
{
  "tool": "queue_enqueue",
  "arguments": {
    "type": "generate_embeddings",
    "data": {
      "namespace": "onet",
      "batchSize": 100
    },
    "priority": 5
  }
}

// Check status
{
  "tool": "queue_status",
  "arguments": {
    "jobId": "job-123"
  }
}
\`\`\`

## Example 5: Workflow Execution

\`\`\`json
// Start workflow
{
  "tool": "workflow_start",
  "arguments": {
    "workflowId": "data-enrichment",
    "input": {
      "namespace": "onet",
      "entityIds": ["15-1252.00", "15-1253.00"]
    }
  }
}

// Check status
{
  "tool": "workflow_status",
  "arguments": {
    "executionId": "exec-456"
  }
}
\`\`\`
`
}
