/**
 * ONET Data Types
 *
 * TypeScript types for ONET occupations, skills, knowledge, etc.
 * Maps to graph Things & Relationships
 */

/**
 * ONET Occupation
 *
 * Stored as Thing with:
 * - ns: 'onet'
 * - id: SOC code (e.g., '15-1252.00')
 * - type: 'occupation'
 * - data: { title, description, ... }
 */
export interface OccupationData {
  title: string
  soc_code: string
  description?: string
  also_called?: string[]
  tasks?: string[]
  technology_skills?: string[]
  education?: string
  experience?: string
  training?: string
  job_zone?: number
  bright_outlook?: boolean
  green?: boolean
  detailed_work_activities?: string[]
  work_context?: Record<string, number>
  work_styles?: Record<string, number>
  work_values?: Record<string, number>
  related_occupations?: string[]
  wages?: {
    median_annual?: number
    median_hourly?: number
    employment?: number
    projected_growth?: string
  }
}

/**
 * ONET Skill
 *
 * Stored as Thing with:
 * - ns: 'onet'
 * - id: skill ID (e.g., 'critical-thinking')
 * - type: 'skill'
 * - data: { name, description, ... }
 */
export interface SkillData {
  name: string
  element_id: string
  description?: string
  category?: 'basic' | 'cross-functional' | 'resource-management' | 'social' | 'complex-problem-solving' | 'technical' | 'systems'
}

/**
 * ONET Knowledge
 *
 * Stored as Thing with:
 * - ns: 'onet'
 * - id: knowledge ID
 * - type: 'knowledge'
 */
export interface KnowledgeData {
  name: string
  element_id: string
  description?: string
  category?: string
}

/**
 * ONET Ability
 *
 * Stored as Thing with:
 * - ns: 'onet'
 * - id: ability ID
 * - type: 'ability'
 */
export interface AbilityData {
  name: string
  element_id: string
  description?: string
  category?: 'cognitive' | 'psychomotor' | 'physical' | 'sensory'
}

/**
 * ONET Technology
 *
 * Stored as Thing with:
 * - ns: 'onet'
 * - id: technology ID
 * - type: 'technology'
 */
export interface TechnologyData {
  name: string
  example?: string
  hot_technology?: boolean
  category?: string
}

/**
 * Occupation-Skill Relationship
 *
 * Stored as Relationship with:
 * - fromNs: 'onet'
 * - fromId: occupation SOC code
 * - fromType: 'occupation'
 * - predicate: 'requires_skill'
 * - toNs: 'onet'
 * - toId: skill ID
 * - toType: 'skill'
 * - data: { level, importance }
 */
export interface OccupationSkillRelationship {
  level?: number // 0-7 scale
  importance?: number // 1-5 scale
}

/**
 * Occupation-Knowledge Relationship
 */
export interface OccupationKnowledgeRelationship {
  level?: number
  importance?: number
}

/**
 * Occupation-Ability Relationship
 */
export interface OccupationAbilityRelationship {
  level?: number
  importance?: number
}

/**
 * Occupation-Technology Relationship
 */
export interface OccupationTechnologyRelationship {
  frequency?: 'rarely' | 'occasionally' | 'frequently'
}

/**
 * Import statistics
 */
export interface ImportStats {
  occupations: number
  skills: number
  knowledge: number
  abilities: number
  technologies: number
  relationships: number
  errors: number
  duration_ms: number
}
