/**
 * Cloudflare Snippets API Client
 *
 * Snippets are lightweight JavaScript modules that run at the edge
 * before Workers or origin. They have no billing cost on any plan.
 *
 * API Endpoints:
 * - PUT /zones/{zone_id}/snippets/{snippet_name} - Create/update snippet
 * - GET /zones/{zone_id}/snippets/{snippet_name} - Get snippet metadata
 * - GET /zones/{zone_id}/snippets/{snippet_name}/content - Get snippet code
 * - DELETE /zones/{zone_id}/snippets/{snippet_name} - Delete snippet
 * - GET /zones/{zone_id}/snippets - List all snippets
 * - PUT /zones/{zone_id}/snippets/snippet_rules - Update snippet rules
 */

export interface SnippetMetadata {
  snippet_name: string
  created_on: string
  modified_on: string
}

export interface SnippetRule {
  snippet_name: string
  expression: string
  enabled?: boolean
  description?: string
}

export interface SnippetRulesResponse {
  rules: SnippetRule[]
}

export interface DeploySnippetOptions {
  /** Cloudflare Zone ID */
  zoneId: string
  /** Snippet name (used in URLs and API) */
  name: string
  /** JavaScript code content */
  code: string
  /** Cloudflare API token with Zone.Snippets permissions */
  apiToken: string
  /** Optional filter expression for when snippet runs */
  expression?: string
  /** Optional description */
  description?: string
}

export interface SnippetDeploymentResult {
  success: boolean
  snippet: SnippetMetadata
  ruleUpdated?: boolean
  message: string
}

const CF_API_BASE = 'https://api.cloudflare.com/client/v4'

/**
 * Deploy a snippet to Cloudflare
 */
export async function deploySnippet(options: DeploySnippetOptions): Promise<SnippetDeploymentResult> {
  const { zoneId, name, code, apiToken, expression, description } = options

  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  }

  // Step 1: Upload the snippet code using multipart/form-data
  const formData = new FormData()

  // Create a blob for the snippet code
  const codeBlob = new Blob([code], { type: 'application/javascript' })
  formData.append('files', codeBlob, 'snippet.js')

  // Add metadata
  const metadata = {
    main_module: 'snippet.js',
  }
  formData.append('metadata', JSON.stringify(metadata))

  const uploadResponse = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/snippets/${name}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        // Don't set Content-Type for FormData - let browser/node set it with boundary
      },
      body: formData,
    }
  )

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text()
    throw new Error(`Failed to upload snippet: ${uploadResponse.status} - ${errorBody}`)
  }

  const uploadResult = await uploadResponse.json() as {
    success: boolean
    result: SnippetMetadata
    errors?: Array<{ message: string }>
  }

  if (!uploadResult.success) {
    const errorMsg = uploadResult.errors?.map(e => e.message).join(', ') || 'Unknown error'
    throw new Error(`Snippet upload failed: ${errorMsg}`)
  }

  // Step 2: If expression provided, update snippet rules
  let ruleUpdated = false
  if (expression) {
    // First get existing rules
    const rulesResponse = await fetch(
      `${CF_API_BASE}/zones/${zoneId}/snippets/snippet_rules`,
      { headers }
    )

    let existingRules: SnippetRule[] = []
    if (rulesResponse.ok) {
      const rulesResult = await rulesResponse.json() as {
        success: boolean
        result: { rules: SnippetRule[] }
      }
      existingRules = rulesResult.result?.rules || []
    }

    // Update or add rule for this snippet
    const ruleIndex = existingRules.findIndex(r => r.snippet_name === name)
    const newRule: SnippetRule = {
      snippet_name: name,
      expression,
      enabled: true,
      description: description || `Rule for ${name} snippet`,
    }

    if (ruleIndex >= 0) {
      existingRules[ruleIndex] = newRule
    } else {
      existingRules.push(newRule)
    }

    // Update rules
    const updateRulesResponse = await fetch(
      `${CF_API_BASE}/zones/${zoneId}/snippets/snippet_rules`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rules: existingRules }),
      }
    )

    if (!updateRulesResponse.ok) {
      console.warn('Warning: Snippet uploaded but rule update failed')
    } else {
      ruleUpdated = true
    }
  }

  return {
    success: true,
    snippet: uploadResult.result,
    ruleUpdated,
    message: `Snippet "${name}" deployed successfully${ruleUpdated ? ' with rule' : ''}`,
  }
}

/**
 * List all snippets in a zone
 */
export async function listSnippets(
  zoneId: string,
  apiToken: string
): Promise<SnippetMetadata[]> {
  const response = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/snippets`,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to list snippets: ${response.status}`)
  }

  const result = await response.json() as {
    success: boolean
    result: SnippetMetadata[]
  }

  return result.result || []
}

/**
 * Get snippet content
 */
export async function getSnippetContent(
  zoneId: string,
  snippetName: string,
  apiToken: string
): Promise<string> {
  const response = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/snippets/${snippetName}/content`,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get snippet content: ${response.status}`)
  }

  return await response.text()
}

/**
 * Delete a snippet
 */
export async function deleteSnippet(
  zoneId: string,
  snippetName: string,
  apiToken: string
): Promise<void> {
  const response = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/snippets/${snippetName}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to delete snippet: ${response.status}`)
  }
}

/**
 * Get snippet rules
 */
export async function getSnippetRules(
  zoneId: string,
  apiToken: string
): Promise<SnippetRule[]> {
  const response = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/snippets/snippet_rules`,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get snippet rules: ${response.status}`)
  }

  const result = await response.json() as {
    success: boolean
    result: { rules: SnippetRule[] }
  }

  return result.result?.rules || []
}
