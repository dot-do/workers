/**
 * Test ONET Import
 *
 * End-to-end test of ONET importer with sample data
 */

import { parseOnetFiles } from '../importers/onet/src/parser.js'
import { bulkCreateThings, bulkCreateRelationships, queryThings, getInboundRelationships } from '../packages/graph-api/src/index.js'

/**
 * Sample ONET data
 */
const sampleData = [
  // Occupation: Software Developer
  {
    type: 'occupation' as const,
    data: {
      soc_code: '15-1252.00',
      title: 'Software Developers',
      description:
        'Research, design, and develop computer and network software or specialized utility programs. Analyze user needs and develop software solutions, applying principles and techniques of computer science, engineering, and mathematical analysis. Update software or enhance existing software capabilities. May work with computer hardware engineers to integrate hardware and software systems, and develop specifications and performance requirements.',
      job_zone: 4,
      bright_outlook: true,
      education: "Bachelor's degree",
      experience: 'None',
      training: 'None',
      technology_skills: [
        { name: 'JavaScript', level: 5, importance: 5 },
        { name: 'Python', level: 5, importance: 5 },
        { name: 'TypeScript', level: 5, importance: 4 },
        { name: 'Git', level: 4, importance: 5 },
      ],
      related_occupations: ['15-1253.00', '15-1254.00', '15-1299.08'],
      wages: {
        median_annual: 120730,
        median_hourly: 58.04,
        employment: 1847900,
        projected_growth: '25% (Much faster than average)',
      },
    },
    content: '# Software Developers\n\nResearch, design, and develop computer and network software...',
  },

  // Occupation: Web Developer
  {
    type: 'occupation' as const,
    data: {
      soc_code: '15-1254.00',
      title: 'Web Developers',
      description: 'Design, create, and modify websites. Analyze user needs to implement website content, graphics, performance and capacity.',
      job_zone: 3,
      bright_outlook: true,
      education: "Associate's degree",
      experience: 'None',
      training: 'None',
      technology_skills: [
        { name: 'JavaScript', level: 5, importance: 5 },
        { name: 'HTML', level: 5, importance: 5 },
        { name: 'CSS', level: 5, importance: 5 },
        { name: 'React', level: 4, importance: 4 },
      ],
      related_occupations: ['15-1252.00', '15-1255.00'],
    },
  },

  // Skills
  {
    type: 'skill' as const,
    data: {
      element_id: 'javascript',
      name: 'JavaScript',
      description: 'Programming language for web development',
      category: 'technical',
    },
  },
  {
    type: 'skill' as const,
    data: {
      element_id: 'python',
      name: 'Python',
      description: 'High-level programming language',
      category: 'technical',
    },
  },
  {
    type: 'skill' as const,
    data: {
      element_id: 'typescript',
      name: 'TypeScript',
      description: 'Typed superset of JavaScript',
      category: 'technical',
    },
  },
  {
    type: 'skill' as const,
    data: {
      element_id: 'git',
      name: 'Git',
      description: 'Version control system',
      category: 'technical',
    },
  },
  {
    type: 'skill' as const,
    data: {
      element_id: 'html',
      name: 'HTML',
      description: 'Markup language for web pages',
      category: 'technical',
    },
  },
  {
    type: 'skill' as const,
    data: {
      element_id: 'css',
      name: 'CSS',
      description: 'Stylesheet language for web design',
      category: 'technical',
    },
  },
  {
    type: 'skill' as const,
    data: {
      element_id: 'react',
      name: 'React',
      description: 'JavaScript library for building user interfaces',
      category: 'technical',
    },
  },
]

/**
 * Run end-to-end import test
 */
async function testImport() {
  console.log('🧪 Testing ONET Import...\n')

  // Step 1: Parse MDX files
  console.log('📝 Parsing sample ONET data...')
  const { things, relationships, errors } = parseOnetFiles(sampleData)

  console.log(`   ✅ Parsed ${things.length} things`)
  console.log(`   ✅ Parsed ${relationships.length} relationships`)
  if (errors.length > 0) {
    console.log(`   ⚠️  ${errors.length} errors:`)
    errors.forEach((err) => console.log(`      - ${err}`))
  }

  // Step 2: Show what was created
  console.log('\n📊 Things by type:')
  const thingsByType = things.reduce(
    (acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  Object.entries(thingsByType).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}`)
  })

  console.log('\n🔗 Relationships by predicate:')
  const relsByPredicate = relationships.reduce(
    (acc, r) => {
      acc[r.predicate] = (acc[r.predicate] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  Object.entries(relsByPredicate).forEach(([predicate, count]) => {
    console.log(`   - ${predicate}: ${count}`)
  })

  // Step 3: Show sample data
  console.log('\n📄 Sample Occupation:')
  const occupation = things.find((t) => t.type === 'occupation')
  if (occupation) {
    console.log(`   ID: ${occupation.ns}:${occupation.id}`)
    console.log(`   Title: ${occupation.data.title}`)
    console.log(`   Description: ${occupation.data.description?.substring(0, 80)}...`)
  }

  console.log('\n📄 Sample Skill:')
  const skill = things.find((t) => t.type === 'skill')
  if (skill) {
    console.log(`   ID: ${skill.ns}:${skill.id}`)
    console.log(`   Name: ${skill.data.name}`)
    console.log(`   Description: ${skill.data.description}`)
  }

  console.log('\n📄 Sample Relationship:')
  const rel = relationships[0]
  if (rel) {
    console.log(`   From: ${rel.fromNs}:${rel.fromId} (${rel.fromType})`)
    console.log(`   Predicate: ${rel.predicate}`)
    console.log(`   To: ${rel.toNs}:${rel.toId} (${rel.toType})`)
    console.log(`   Data: ${JSON.stringify(rel.data)}`)
  }

  console.log('\n✅ Import test complete!')
  console.log('\nNext steps:')
  console.log('  1. Run setup-graph-db.sh to create database')
  console.log('  2. Deploy graph service: cd workers/graph && pnpm deploy')
  console.log('  3. Deploy onet-importer: cd workers/importers/onet && pnpm deploy')
  console.log('  4. Use RPC/REST/MCP to import real ONET data')
}

// Run test
testImport().catch(console.error)
