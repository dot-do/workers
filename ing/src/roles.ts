/**
 * Role Resolution and Capabilities
 */

import type { RoleDefinition, CapabilityCheck, Env } from './types'
import { resolveVerb } from './verbs'

/**
 * Predefined roles with capabilities
 */
const PREDEFINED_ROLES: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'admin',
    capabilities: ['*'], // All capabilities
    description: 'System administrator with full access',
  },
  {
    id: 'accountant',
    name: 'accountant',
    capabilities: ['invoicing', 'reconciling', 'reporting', 'reading', 'writing'],
    onet_code: '13-2011.00', // O*NET code for Accountants and Auditors
    description: 'Financial professional handling accounting tasks',
  },
  {
    id: 'developer',
    name: 'developer',
    capabilities: ['coding', 'reviewing', 'testing', 'reading', 'writing', 'editing'],
    onet_code: '15-1252.00', // O*NET code for Software Developers
    description: 'Software developer writing and maintaining code',
  },
  {
    id: 'senior_developer',
    name: 'senior_developer',
    parent_role: 'developer',
    capabilities: ['coding', 'reviewing', 'testing', 'deploying', 'approving', 'reading', 'writing', 'editing'],
    description: 'Senior developer with deployment and approval rights',
  },
  {
    id: 'doctor',
    name: 'doctor',
    capabilities: ['diagnosing', 'treating', 'prescribing', 'reading', 'writing'],
    onet_code: '29-1215.00', // O*NET code for Family Medicine Physicians
    description: 'Medical doctor diagnosing and treating patients',
  },
  {
    id: 'nurse',
    name: 'nurse',
    capabilities: ['treating', 'monitoring', 'reading', 'writing'],
    onet_code: '29-1141.00', // O*NET code for Registered Nurses
    description: 'Registered nurse providing patient care',
  },
  {
    id: 'lawyer',
    name: 'lawyer',
    capabilities: ['advising', 'reviewing', 'litigating', 'reading', 'writing', 'editing'],
    onet_code: '23-1011.00', // O*NET code for Lawyers
    description: 'Legal professional providing legal services',
  },
  {
    id: 'manager',
    name: 'manager',
    capabilities: ['approving', 'delegating', 'evaluating', 'reviewing', 'reading', 'writing'],
    description: 'Manager with approval and delegation authority',
  },
  {
    id: 'finance_manager',
    name: 'finance_manager',
    parent_role: 'manager',
    capabilities: ['approving', 'delegating', 'evaluating', 'reviewing', 'invoicing', 'paying', 'reading', 'writing'],
    onet_code: '11-3031.00', // O*NET code for Financial Managers
    description: 'Finance manager with financial authority',
  },
  {
    id: 'devops_engineer',
    name: 'devops_engineer',
    capabilities: ['deploying', 'monitoring', 'configuring', 'reading', 'writing', 'coding'],
    onet_code: '15-1252.00', // O*NET code (similar to developers)
    description: 'DevOps engineer managing deployments and infrastructure',
  },
  {
    id: 'viewer',
    name: 'viewer',
    capabilities: ['reading'],
    description: 'Read-only access user',
  },
]

/**
 * In-memory role registry
 */
const ROLE_REGISTRY = new Map<string, RoleDefinition>()

/**
 * Initialize role registry
 */
export function initializeRoleRegistry(): void {
  for (const role of PREDEFINED_ROLES) {
    ROLE_REGISTRY.set(role.name, role)
  }
}

/**
 * Resolve role definition
 */
export async function resolveRole(subject: string, env: Env): Promise<RoleDefinition | null> {
  // Check in-memory registry
  if (ROLE_REGISTRY.has(subject)) {
    return ROLE_REGISTRY.get(subject)!
  }

  // Query database for custom roles
  const result = await env.DB_SERVICE.query({
    query: 'SELECT * FROM roles WHERE name = ? LIMIT 1',
    params: [subject],
  })

  if (result.rows && result.rows.length > 0) {
    const row = result.rows[0]
    const role: RoleDefinition = {
      id: row.id,
      name: row.name,
      capabilities: row.capabilities ? JSON.parse(row.capabilities) : [],
      forbidden_verbs: row.forbidden_verbs ? JSON.parse(row.forbidden_verbs) : undefined,
      parent_role: row.parent_role,
      onet_code: row.onet_code,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }

    // Cache in memory
    ROLE_REGISTRY.set(subject, role)

    return role
  }

  // Try to infer role from O*NET occupation data
  return await inferRoleFromONet(subject, env)
}

/**
 * Check if a role has capability to perform a verb
 */
export async function checkCapability(
  role: string,
  verb: string,
  env: Env
): Promise<CapabilityCheck> {
  // Resolve role definition
  const roleDefinition = await resolveRole(role, env)

  if (!roleDefinition) {
    return {
      allowed: false,
      reason: `Role '${role}' not found`,
    }
  }

  // Resolve verb definition
  const verbDefinition = await resolveVerb(verb, env)

  if (!verbDefinition) {
    return {
      allowed: false,
      reason: `Verb '${verb}' not recognized`,
    }
  }

  // Check if role has wildcard permission (admin)
  if (roleDefinition.capabilities.includes('*')) {
    return {
      allowed: true,
      requires_approval: verbDefinition.requires_approval,
      danger_level: verbDefinition.danger_level,
    }
  }

  // Check if verb is in role's capabilities
  if (roleDefinition.capabilities.includes(verb)) {
    return {
      allowed: true,
      requires_approval: verbDefinition.requires_approval,
      danger_level: verbDefinition.danger_level,
    }
  }

  // Check if verb is explicitly forbidden
  if (roleDefinition.forbidden_verbs?.includes(verb)) {
    return {
      allowed: false,
      reason: `Role '${role}' is explicitly forbidden from '${verb}'`,
    }
  }

  // Check parent role capabilities (inheritance)
  if (roleDefinition.parent_role) {
    const parentCheck = await checkCapability(roleDefinition.parent_role, verb, env)
    if (parentCheck.allowed) {
      return {
        ...parentCheck,
        reason: `Inherited from parent role '${roleDefinition.parent_role}'`,
      }
    }
  }

  // Check verb's required roles
  if (verbDefinition.required_role && verbDefinition.required_role.length > 0) {
    if (!verbDefinition.required_role.includes(role)) {
      return {
        allowed: false,
        reason: `Verb '${verb}' requires one of roles: ${verbDefinition.required_role.join(', ')}`,
        danger_level: verbDefinition.danger_level,
      }
    }

    return {
      allowed: true,
      requires_approval: verbDefinition.requires_approval,
      danger_level: verbDefinition.danger_level,
    }
  }

  // Default deny
  return {
    allowed: false,
    reason: `Role '${role}' does not have capability '${verb}'`,
    danger_level: verbDefinition.danger_level,
  }
}

/**
 * Get all capabilities for a role (including inherited)
 */
export async function getRoleCapabilities(role: string, env: Env): Promise<string[]> {
  const roleDefinition = await resolveRole(role, env)

  if (!roleDefinition) {
    return []
  }

  const capabilities = [...roleDefinition.capabilities]

  // Include parent capabilities
  if (roleDefinition.parent_role) {
    const parentCapabilities = await getRoleCapabilities(roleDefinition.parent_role, env)
    capabilities.push(...parentCapabilities)
  }

  // Remove duplicates
  return [...new Set(capabilities)]
}

/**
 * Register a custom role
 */
export async function registerRole(definition: RoleDefinition, env: Env): Promise<RoleDefinition> {
  // Store in database
  await env.DB_SERVICE.execute({
    query: `
      INSERT INTO roles (
        id, name, capabilities, forbidden_verbs, parent_role,
        onet_code, description, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    params: [
      definition.id,
      definition.name,
      JSON.stringify(definition.capabilities),
      definition.forbidden_verbs ? JSON.stringify(definition.forbidden_verbs) : null,
      definition.parent_role || null,
      definition.onet_code || null,
      definition.description || null,
      definition.metadata ? JSON.stringify(definition.metadata) : null,
      new Date().toISOString(),
    ],
  })

  // Add to in-memory registry
  ROLE_REGISTRY.set(definition.name, definition)

  return definition
}

/**
 * Infer role from O*NET occupation data (placeholder)
 */
async function inferRoleFromONet(subject: string, env: Env): Promise<RoleDefinition | null> {
  // This would query O*NET occupation data to infer role
  // For now, return null (can be implemented later)
  return null
}

/**
 * List all roles
 */
export async function listRoles(env?: Env): Promise<RoleDefinition[]> {
  return Array.from(ROLE_REGISTRY.values())
}
