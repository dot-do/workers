/**
 * ONET MDX Parser
 *
 * Transforms ONET MDX files into Things & Relationships
 * Uses mdxdb parser to extract structured data
 */

import type { Thing, Relationship } from '@do/graph-types'
import type {
  OccupationData,
  SkillData,
  KnowledgeData,
  AbilityData,
  TechnologyData,
  OccupationSkillRelationship,
  OccupationKnowledgeRelationship,
  OccupationAbilityRelationship,
  OccupationTechnologyRelationship,
} from './types.js'

/**
 * Parse Result
 */
export interface ParseResult {
  things: Thing[]
  relationships: Relationship[]
  errors: string[]
}

/**
 * Parsed ONET MDX file (from mdxdb)
 */
interface OnetMdxFile {
  type: 'occupation' | 'skill' | 'knowledge' | 'ability' | 'technology'
  data: Record<string, any>
  content?: string
  code?: string
}

/**
 * Parse ONET MDX files into Things & Relationships
 *
 * @param files - Array of parsed MDX files from mdxdb
 * @returns Things and Relationships ready for bulk import
 */
export function parseOnetFiles(files: OnetMdxFile[]): ParseResult {
  const things: Thing[] = []
  const relationships: Relationship[] = []
  const errors: string[] = []

  // Track created things to avoid duplicates
  const thingIds = new Set<string>()

  // First pass: Create all Things
  for (const file of files) {
    try {
      const thing = parseOnetThing(file)
      if (thing) {
        const key = `${thing.ns}:${thing.id}`
        if (!thingIds.has(key)) {
          things.push(thing)
          thingIds.add(key)
        }
      }
    } catch (error) {
      errors.push(`Error parsing ${file.type}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Second pass: Create Relationships
  for (const file of files) {
    if (file.type === 'occupation') {
      try {
        const rels = parseOccupationRelationships(file)
        relationships.push(...rels)
      } catch (error) {
        errors.push(`Error parsing relationships for ${file.data.soc_code}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  return { things, relationships, errors }
}

/**
 * Parse a single ONET MDX file into a Thing
 */
function parseOnetThing(file: OnetMdxFile): Thing | null {
  switch (file.type) {
    case 'occupation':
      return parseOccupation(file)
    case 'skill':
      return parseSkill(file)
    case 'knowledge':
      return parseKnowledge(file)
    case 'ability':
      return parseAbility(file)
    case 'technology':
      return parseTechnology(file)
    default:
      return null
  }
}

/**
 * Parse Occupation into Thing
 */
function parseOccupation(file: OnetMdxFile): Thing {
  const data = file.data as Partial<OccupationData>

  if (!data.soc_code) {
    throw new Error('Occupation missing soc_code')
  }

  const occupation: OccupationData = {
    title: data.title || 'Untitled Occupation',
    soc_code: data.soc_code,
    description: data.description,
    also_called: data.also_called,
    tasks: data.tasks,
    technology_skills: data.technology_skills,
    education: data.education,
    experience: data.experience,
    training: data.training,
    job_zone: data.job_zone,
    bright_outlook: data.bright_outlook,
    green: data.green,
    detailed_work_activities: data.detailed_work_activities,
    work_context: data.work_context,
    work_styles: data.work_styles,
    work_values: data.work_values,
    related_occupations: data.related_occupations,
    wages: data.wages,
  }

  return {
    ns: 'onet',
    id: data.soc_code,
    type: 'occupation',
    data: occupation,
    content: file.content,
    code: file.code,
    meta: {
      imported_at: new Date().toISOString(),
      source: 'onet-mdx',
    },
  }
}

/**
 * Parse Skill into Thing
 */
function parseSkill(file: OnetMdxFile): Thing {
  const data = file.data as Partial<SkillData>

  if (!data.element_id) {
    throw new Error('Skill missing element_id')
  }

  const skill: SkillData = {
    name: data.name || 'Untitled Skill',
    element_id: data.element_id,
    description: data.description,
    category: data.category,
  }

  return {
    ns: 'onet',
    id: data.element_id,
    type: 'skill',
    data: skill,
    content: file.content,
    meta: {
      imported_at: new Date().toISOString(),
      source: 'onet-mdx',
    },
  }
}

/**
 * Parse Knowledge into Thing
 */
function parseKnowledge(file: OnetMdxFile): Thing {
  const data = file.data as Partial<KnowledgeData>

  if (!data.element_id) {
    throw new Error('Knowledge missing element_id')
  }

  const knowledge: KnowledgeData = {
    name: data.name || 'Untitled Knowledge',
    element_id: data.element_id,
    description: data.description,
    category: data.category,
  }

  return {
    ns: 'onet',
    id: data.element_id,
    type: 'knowledge',
    data: knowledge,
    content: file.content,
    meta: {
      imported_at: new Date().toISOString(),
      source: 'onet-mdx',
    },
  }
}

/**
 * Parse Ability into Thing
 */
function parseAbility(file: OnetMdxFile): Thing {
  const data = file.data as Partial<AbilityData>

  if (!data.element_id) {
    throw new Error('Ability missing element_id')
  }

  const ability: AbilityData = {
    name: data.name || 'Untitled Ability',
    element_id: data.element_id,
    description: data.description,
    category: data.category,
  }

  return {
    ns: 'onet',
    id: data.element_id,
    type: 'ability',
    data: ability,
    content: file.content,
    meta: {
      imported_at: new Date().toISOString(),
      source: 'onet-mdx',
    },
  }
}

/**
 * Parse Technology into Thing
 */
function parseTechnology(file: OnetMdxFile): Thing {
  const data = file.data as Partial<TechnologyData>

  // Generate ID from name if not provided
  const id = data.name ? slugify(data.name) : `tech-${Date.now()}`

  const technology: TechnologyData = {
    name: data.name || 'Untitled Technology',
    example: data.example,
    hot_technology: data.hot_technology,
    category: data.category,
  }

  return {
    ns: 'onet',
    id,
    type: 'technology',
    data: technology,
    content: file.content,
    meta: {
      imported_at: new Date().toISOString(),
      source: 'onet-mdx',
    },
  }
}

/**
 * Parse Occupation relationships
 */
function parseOccupationRelationships(file: OnetMdxFile): Relationship[] {
  const relationships: Relationship[] = []
  const data = file.data as Partial<OccupationData>

  if (!data.soc_code) {
    return relationships
  }

  // Parse skills relationships
  if (data.technology_skills && Array.isArray(data.technology_skills)) {
    for (const skill of data.technology_skills) {
      if (typeof skill === 'object' && skill.name) {
        const rel: Relationship = {
          fromNs: 'onet',
          fromId: data.soc_code,
          fromType: 'occupation',
          predicate: 'requires_skill',
          toNs: 'onet',
          toId: slugify(skill.name),
          toType: 'skill',
          data: {
            level: skill.level,
            importance: skill.importance,
          } as OccupationSkillRelationship,
          meta: {
            imported_at: new Date().toISOString(),
          },
        }
        relationships.push(rel)
      }
    }
  }

  // Parse related occupations
  if (data.related_occupations && Array.isArray(data.related_occupations)) {
    for (const related of data.related_occupations) {
      if (typeof related === 'string') {
        const rel: Relationship = {
          fromNs: 'onet',
          fromId: data.soc_code,
          fromType: 'occupation',
          predicate: 'related_to',
          toNs: 'onet',
          toId: related,
          toType: 'occupation',
          meta: {
            imported_at: new Date().toISOString(),
          },
        }
        relationships.push(rel)
      }
    }
  }

  return relationships
}

/**
 * Convert string to slug (lowercase, hyphens)
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
