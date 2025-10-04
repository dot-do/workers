/**
 * Tests for ONET MDX Parser
 */

import { describe, it, expect } from 'vitest'
import { parseOnetFiles } from '../src/parser.js'

describe('ONET Parser', () => {
  it('should parse occupation MDX file', () => {
    const files = [
      {
        type: 'occupation' as const,
        data: {
          soc_code: '15-1252.00',
          title: 'Software Developers',
          description: 'Develop software applications',
          job_zone: 4,
          bright_outlook: true,
        },
        content: '# Software Developers\n\nDevelop software applications',
      },
    ]

    const result = parseOnetFiles(files)

    expect(result.things).toHaveLength(1)
    expect(result.things[0]).toMatchObject({
      ns: 'onet',
      id: '15-1252.00',
      type: 'occupation',
      data: {
        soc_code: '15-1252.00',
        title: 'Software Developers',
        description: 'Develop software applications',
        job_zone: 4,
        bright_outlook: true,
      },
    })
    expect(result.relationships).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('should parse skill MDX file', () => {
    const files = [
      {
        type: 'skill' as const,
        data: {
          element_id: 'critical-thinking',
          name: 'Critical Thinking',
          description: 'Using logic and reasoning',
          category: 'complex-problem-solving',
        },
      },
    ]

    const result = parseOnetFiles(files)

    expect(result.things).toHaveLength(1)
    expect(result.things[0]).toMatchObject({
      ns: 'onet',
      id: 'critical-thinking',
      type: 'skill',
      data: {
        element_id: 'critical-thinking',
        name: 'Critical Thinking',
        category: 'complex-problem-solving',
      },
    })
  })

  it('should parse occupation with relationships', () => {
    const files = [
      {
        type: 'occupation' as const,
        data: {
          soc_code: '15-1252.00',
          title: 'Software Developers',
          technology_skills: [
            {
              name: 'JavaScript',
              level: 5,
              importance: 4,
            },
            {
              name: 'Python',
              level: 4,
              importance: 5,
            },
          ],
          related_occupations: ['15-1253.00', '15-1254.00'],
        },
      },
    ]

    const result = parseOnetFiles(files)

    expect(result.things).toHaveLength(1)
    expect(result.relationships).toHaveLength(4) // 2 skills + 2 related occupations

    // Check skill relationships
    const skillRels = result.relationships.filter((r) => r.predicate === 'requires_skill')
    expect(skillRels).toHaveLength(2)
    expect(skillRels[0]).toMatchObject({
      fromId: '15-1252.00',
      fromType: 'occupation',
      predicate: 'requires_skill',
      toId: 'javascript',
      toType: 'skill',
      data: {
        level: 5,
        importance: 4,
      },
    })

    // Check related occupation relationships
    const relatedRels = result.relationships.filter((r) => r.predicate === 'related_to')
    expect(relatedRels).toHaveLength(2)
  })

  it('should handle multiple files and deduplicate things', () => {
    const files = [
      {
        type: 'occupation' as const,
        data: {
          soc_code: '15-1252.00',
          title: 'Software Developers',
        },
      },
      {
        type: 'occupation' as const,
        data: {
          soc_code: '15-1252.00', // Duplicate
          title: 'Software Developers (Updated)',
        },
      },
      {
        type: 'skill' as const,
        data: {
          element_id: 'critical-thinking',
          name: 'Critical Thinking',
        },
      },
    ]

    const result = parseOnetFiles(files)

    expect(result.things).toHaveLength(2) // Deduplicated occupation + skill
  })

  it('should collect errors for invalid files', () => {
    const files = [
      {
        type: 'occupation' as const,
        data: {
          // Missing soc_code
          title: 'Invalid Occupation',
        },
      },
      {
        type: 'skill' as const,
        data: {
          // Missing element_id
          name: 'Invalid Skill',
        },
      },
    ]

    const result = parseOnetFiles(files)

    expect(result.things).toHaveLength(0)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toContain('Occupation missing soc_code')
    expect(result.errors[1]).toContain('Skill missing element_id')
  })
})
