/**
 * Verb Registry and Resolution
 */

import type { VerbDefinition, Env } from './types'

/**
 * GS1 Business Steps (37 verbs)
 */
const GS1_VERBS: VerbDefinition[] = [
  { id: 'accepting', gerund: 'accepting', base_form: 'accept', category: 'supply-chain', gs1_step: 'BizStep-Accepting', danger_level: 'safe' },
  { id: 'arriving', gerund: 'arriving', base_form: 'arrive', category: 'supply-chain', gs1_step: 'BizStep-Arriving', danger_level: 'safe' },
  { id: 'assembling', gerund: 'assembling', base_form: 'assemble', category: 'supply-chain', gs1_step: 'BizStep-Assembling', danger_level: 'low' },
  { id: 'collecting', gerund: 'collecting', base_form: 'collect', category: 'supply-chain', gs1_step: 'BizStep-Collecting', danger_level: 'safe' },
  { id: 'commissioning', gerund: 'commissioning', base_form: 'commission', category: 'supply-chain', gs1_step: 'BizStep-Commissioning', danger_level: 'medium' },
  { id: 'consigning', gerund: 'consigning', base_form: 'consign', category: 'supply-chain', gs1_step: 'BizStep-Consigning', danger_level: 'low' },
  { id: 'creating', gerund: 'creating', base_form: 'create', category: 'supply-chain', gs1_step: 'BizStep-Creating_Class_Instance', danger_level: 'low' },
  { id: 'cycle_counting', gerund: 'cycle_counting', base_form: 'cycle_count', category: 'supply-chain', gs1_step: 'BizStep-Cycle_Counting', danger_level: 'safe' },
  { id: 'decommissioning', gerund: 'decommissioning', base_form: 'decommission', category: 'supply-chain', gs1_step: 'BizStep-Decommissioning', danger_level: 'high' },
  { id: 'departing', gerund: 'departing', base_form: 'depart', category: 'supply-chain', gs1_step: 'BizStep-Departing', danger_level: 'safe' },
  { id: 'destroying', gerund: 'destroying', base_form: 'destroy', category: 'supply-chain', gs1_step: 'BizStep-Destroying', danger_level: 'critical', requires_approval: true },
  { id: 'disassembling', gerund: 'disassembling', base_form: 'disassemble', category: 'supply-chain', gs1_step: 'BizStep-Disassembling', danger_level: 'low' },
  { id: 'dispensing', gerund: 'dispensing', base_form: 'dispense', category: 'supply-chain', gs1_step: 'BizStep-Dispensing', danger_level: 'medium' },
  { id: 'encoding', gerund: 'encoding', base_form: 'encode', category: 'supply-chain', gs1_step: 'BizStep-Encoding', danger_level: 'low' },
  { id: 'entering_exiting', gerund: 'entering_exiting', base_form: 'enter_exit', category: 'supply-chain', gs1_step: 'BizStep-Entering_Exiting', danger_level: 'safe' },
  { id: 'holding', gerund: 'holding', base_form: 'hold', category: 'supply-chain', gs1_step: 'BizStep-Holding', danger_level: 'safe' },
  { id: 'inspecting', gerund: 'inspecting', base_form: 'inspect', category: 'supply-chain', gs1_step: 'BizStep-Inspecting', danger_level: 'safe' },
  { id: 'installing', gerund: 'installing', base_form: 'install', category: 'supply-chain', gs1_step: 'BizStep-Installing', danger_level: 'medium' },
  { id: 'killing', gerund: 'killing', base_form: 'kill', category: 'supply-chain', gs1_step: 'BizStep-Killing', danger_level: 'critical', requires_approval: true },
  { id: 'packing', gerund: 'packing', base_form: 'pack', category: 'supply-chain', gs1_step: 'BizStep-Packing', danger_level: 'safe' },
  { id: 'picking', gerund: 'picking', base_form: 'pick', category: 'supply-chain', gs1_step: 'BizStep-Picking', danger_level: 'safe' },
  { id: 'receiving', gerund: 'receiving', base_form: 'receive', category: 'supply-chain', gs1_step: 'BizStep-Receiving', danger_level: 'safe' },
  { id: 'removing', gerund: 'removing', base_form: 'remove', category: 'supply-chain', gs1_step: 'BizStep-Removing', danger_level: 'medium' },
  { id: 'repackaging', gerund: 'repackaging', base_form: 'repackage', category: 'supply-chain', gs1_step: 'BizStep-Repackaging', danger_level: 'low' },
  { id: 'repairing', gerund: 'repairing', base_form: 'repair', category: 'supply-chain', gs1_step: 'BizStep-Repairing', danger_level: 'medium' },
  { id: 'replacing', gerund: 'replacing', base_form: 'replace', category: 'supply-chain', gs1_step: 'BizStep-Replacing', danger_level: 'medium' },
  { id: 'reserving', gerund: 'reserving', base_form: 'reserve', category: 'supply-chain', gs1_step: 'BizStep-Reserving', danger_level: 'safe' },
  { id: 'retail_selling', gerund: 'retail_selling', base_form: 'retail_sell', category: 'supply-chain', gs1_step: 'BizStep-Retail_Selling', danger_level: 'low' },
  { id: 'sampling', gerund: 'sampling', base_form: 'sample', category: 'supply-chain', gs1_step: 'BizStep-Sampling', danger_level: 'safe' },
  { id: 'sensor_reporting', gerund: 'sensor_reporting', base_form: 'sensor_report', category: 'supply-chain', gs1_step: 'BizStep-Sensor_Reporting', danger_level: 'safe' },
  { id: 'shipping', gerund: 'shipping', base_form: 'ship', category: 'supply-chain', gs1_step: 'BizStep-Shipping', danger_level: 'medium' },
  { id: 'staging_outbound', gerund: 'staging_outbound', base_form: 'stage_outbound', category: 'supply-chain', gs1_step: 'BizStep-Staging_Outbound', danger_level: 'safe' },
  { id: 'stock_taking', gerund: 'stock_taking', base_form: 'stock_take', category: 'supply-chain', gs1_step: 'BizStep-Stock_Taking', danger_level: 'safe' },
  { id: 'stocking', gerund: 'stocking', base_form: 'stock', category: 'supply-chain', gs1_step: 'BizStep-Stocking', danger_level: 'safe' },
  { id: 'storing', gerund: 'storing', base_form: 'store', category: 'supply-chain', gs1_step: 'BizStep-Storing', danger_level: 'safe' },
  { id: 'transporting', gerund: 'transporting', base_form: 'transport', category: 'supply-chain', gs1_step: 'BizStep-Transporting', danger_level: 'medium' },
  { id: 'unloading', gerund: 'unloading', base_form: 'unload', category: 'supply-chain', gs1_step: 'BizStep-Unloading', danger_level: 'safe' },
]

/**
 * Common business verbs (extensible)
 */
const COMMON_VERBS: VerbDefinition[] = [
  { id: 'reading', gerund: 'reading', base_form: 'read', category: 'knowledge', danger_level: 'safe' },
  { id: 'writing', gerund: 'writing', base_form: 'write', category: 'knowledge', danger_level: 'low' },
  { id: 'editing', gerund: 'editing', base_form: 'edit', category: 'knowledge', danger_level: 'low' },
  { id: 'deleting', gerund: 'deleting', base_form: 'delete', category: 'knowledge', danger_level: 'critical', requires_approval: true },
  { id: 'reviewing', gerund: 'reviewing', base_form: 'review', category: 'business', danger_level: 'safe' },
  { id: 'approving', gerund: 'approving', base_form: 'approve', category: 'business', danger_level: 'high', required_role: ['manager', 'admin'] },
  { id: 'deploying', gerund: 'deploying', base_form: 'deploy', category: 'technology', danger_level: 'high', requires_approval: true },
  { id: 'coding', gerund: 'coding', base_form: 'code', category: 'technology', danger_level: 'low' },
  { id: 'testing', gerund: 'testing', base_form: 'test', category: 'technology', danger_level: 'safe' },
  { id: 'designing', gerund: 'designing', base_form: 'design', category: 'creative', danger_level: 'safe' },
  { id: 'invoicing', gerund: 'invoicing', base_form: 'invoice', category: 'finance', danger_level: 'low', required_role: ['accountant'] },
  { id: 'paying', gerund: 'paying', base_form: 'pay', category: 'finance', danger_level: 'high', requires_approval: true },
  { id: 'diagnosing', gerund: 'diagnosing', base_form: 'diagnose', category: 'medical', danger_level: 'high', required_role: ['doctor'] },
  { id: 'prescribing', gerund: 'prescribing', base_form: 'prescribe', category: 'medical', danger_level: 'high', required_role: ['doctor'] },
  { id: 'treating', gerund: 'treating', base_form: 'treat', category: 'medical', danger_level: 'high', required_role: ['doctor', 'nurse'] },
]

/**
 * In-memory verb registry (can be persisted to DB)
 */
const VERB_REGISTRY = new Map<string, VerbDefinition>()

/**
 * Initialize verb registry
 */
export function initializeVerbRegistry(): void {
  // Add GS1 verbs
  for (const verb of GS1_VERBS) {
    VERB_REGISTRY.set(verb.gerund, verb)
  }

  // Add common verbs
  for (const verb of COMMON_VERBS) {
    VERB_REGISTRY.set(verb.gerund, verb)
  }
}

/**
 * Resolve verb from gerund form
 */
export async function resolveVerb(gerund: string, env: Env): Promise<VerbDefinition | null> {
  // Check in-memory registry first
  if (VERB_REGISTRY.has(gerund)) {
    return VERB_REGISTRY.get(gerund)!
  }

  // Query database for custom verbs
  const result = await env.DB_SERVICE.query({
    query: 'SELECT * FROM verbs WHERE gerund = ? LIMIT 1',
    params: [gerund],
  })

  if (result.rows && result.rows.length > 0) {
    const row = result.rows[0]
    const verb: VerbDefinition = {
      id: row.id,
      gerund: row.gerund,
      base_form: row.base_form,
      category: row.category,
      gs1_step: row.gs1_step,
      onet_task_id: row.onet_task_id,
      required_role: row.required_role ? JSON.parse(row.required_role) : undefined,
      danger_level: row.danger_level,
      requires_approval: row.requires_approval,
      description: row.description,
      examples: row.examples ? JSON.parse(row.examples) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }

    // Cache in memory
    VERB_REGISTRY.set(gerund, verb)

    return verb
  }

  return null
}

/**
 * List all verbs (optionally filtered by category)
 */
export async function listVerbs(category?: string, env?: Env): Promise<VerbDefinition[]> {
  // Get from in-memory registry
  const verbs = Array.from(VERB_REGISTRY.values())

  // Filter by category if provided
  if (category) {
    return verbs.filter(v => v.category === category)
  }

  return verbs
}

/**
 * Register a custom verb
 */
export async function registerVerb(definition: VerbDefinition, env: Env): Promise<VerbDefinition> {
  // Store in database
  await env.DB_SERVICE.execute({
    query: `
      INSERT INTO verbs (
        id, gerund, base_form, category, gs1_step, onet_task_id,
        required_role, danger_level, requires_approval,
        description, examples, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    params: [
      definition.id,
      definition.gerund,
      definition.base_form,
      definition.category || null,
      definition.gs1_step || null,
      definition.onet_task_id || null,
      definition.required_role ? JSON.stringify(definition.required_role) : null,
      definition.danger_level || 'safe',
      definition.requires_approval || false,
      definition.description || null,
      definition.examples ? JSON.stringify(definition.examples) : null,
      definition.metadata ? JSON.stringify(definition.metadata) : null,
      new Date().toISOString(),
    ],
  })

  // Add to in-memory registry
  VERB_REGISTRY.set(definition.gerund, definition)

  return definition
}

/**
 * Convert base form to gerund (simple heuristic)
 */
export function toGerund(baseForm: string): string {
  // Simple rules (can be enhanced with AI)
  if (baseForm.endsWith('e')) {
    return baseForm.slice(0, -1) + 'ing' // e.g., code -> coding
  }

  if (baseForm.endsWith('ie')) {
    return baseForm.slice(0, -2) + 'ying' // e.g., die -> dying
  }

  if (
    baseForm.length >= 3 &&
    isConsonant(baseForm[baseForm.length - 1]) &&
    isVowel(baseForm[baseForm.length - 2]) &&
    isConsonant(baseForm[baseForm.length - 3])
  ) {
    // Double last consonant (e.g., run -> running)
    return baseForm + baseForm[baseForm.length - 1] + 'ing'
  }

  return baseForm + 'ing'
}

function isVowel(char: string): boolean {
  return ['a', 'e', 'i', 'o', 'u'].includes(char.toLowerCase())
}

function isConsonant(char: string): boolean {
  return !isVowel(char)
}
