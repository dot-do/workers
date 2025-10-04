/**
 * Import Sample ONET Data to D1 Graph Database
 *
 * Creates a small sample of ONET data:
 * - 5 occupations (Software Developer, Data Scientist, Web Developer, etc.)
 * - 15 skills (JavaScript, Python, Communication, etc.)
 * - 30 relationships (occupation requires_skill skill)
 */

const GRAPH_API_URL = 'https://graph.drivly.workers.dev'

// Sample ONET occupations
const occupations = [
  {
    ns: 'onet',
    id: '15-1252.00',
    type: 'occupation',
    data: {
      title: 'Software Developers, Applications',
      description: 'Develop, create, and modify general computer applications software or specialized utility programs.',
      bright_outlook: true,
      annual_median_wage: 120730,
      education_level: 'Bachelors degree',
    },
    content: `# Software Developers, Applications

Develop, create, and modify general computer applications software or specialized utility programs. Analyze user needs and develop software solutions.

## Key Responsibilities
- Design software or customize software for client use
- Analyze and design databases within an application area
- Confer with systems analysts, engineers, programmers
- Develop and direct software system testing procedures`,
  },
  {
    ns: 'onet',
    id: '15-2051.00',
    type: 'occupation',
    data: {
      title: 'Data Scientists',
      description: 'Develop and implement a set of techniques or analytics applications to transform raw data into meaningful information.',
      bright_outlook: true,
      annual_median_wage: 108020,
      education_level: 'Bachelors degree',
    },
    content: `# Data Scientists

Develop and implement a set of techniques or analytics applications to transform raw data into meaningful information using data-oriented programming languages and visualization software.`,
  },
  {
    ns: 'onet',
    id: '15-1254.00',
    type: 'occupation',
    data: {
      title: 'Web Developers',
      description: 'Develop and implement websites, web applications, application databases, and interactive web interfaces.',
      bright_outlook: false,
      annual_median_wage: 84960,
      education_level: 'Bachelors degree',
    },
    content: `# Web Developers

Design, create, and modify Web sites. Analyze user needs to implement Web site content, graphics, performance, and capacity.`,
  },
  {
    ns: 'onet',
    id: '15-1299.09',
    type: 'occupation',
    data: {
      title: 'Cybersecurity Analysts',
      description: 'Plan, implement, upgrade, or monitor security measures for the protection of computer networks and information.',
      bright_outlook: true,
      annual_median_wage: 112000,
      education_level: 'Bachelors degree',
    },
    content: `# Cybersecurity Analysts

Plan, implement, upgrade, or monitor security measures for the protection of computer networks and information.`,
  },
  {
    ns: 'onet',
    id: '11-3021.00',
    type: 'occupation',
    data: {
      title: 'Computer and Information Systems Managers',
      description: 'Plan, direct, or coordinate activities in such fields as electronic data processing, information systems, and computer programming.',
      bright_outlook: false,
      annual_median_wage: 164070,
      education_level: 'Bachelors degree',
    },
    content: `# Computer and Information Systems Managers

Plan, direct, or coordinate activities in such fields as electronic data processing, information systems, systems analysis, and computer programming.`,
  },
]

// Sample ONET skills
const skills = [
  { ns: 'onet', id: 'javascript', type: 'skill', data: { name: 'JavaScript', category: 'technical' } },
  { ns: 'onet', id: 'python', type: 'skill', data: { name: 'Python', category: 'technical' } },
  { ns: 'onet', id: 'java', type: 'skill', data: { name: 'Java', category: 'technical' } },
  { ns: 'onet', id: 'sql', type: 'skill', data: { name: 'SQL', category: 'technical' } },
  { ns: 'onet', id: 'html-css', type: 'skill', data: { name: 'HTML/CSS', category: 'technical' } },
  { ns: 'onet', id: 'react', type: 'skill', data: { name: 'React', category: 'technical' } },
  { ns: 'onet', id: 'machine-learning', type: 'skill', data: { name: 'Machine Learning', category: 'technical' } },
  { ns: 'onet', id: 'data-analysis', type: 'skill', data: { name: 'Data Analysis', category: 'technical' } },
  { ns: 'onet', id: 'cybersecurity', type: 'skill', data: { name: 'Cybersecurity', category: 'technical' } },
  { ns: 'onet', id: 'cloud-computing', type: 'skill', data: { name: 'Cloud Computing', category: 'technical' } },
  { ns: 'onet', id: 'communication', type: 'skill', data: { name: 'Communication', category: 'soft' } },
  { ns: 'onet', id: 'problem-solving', type: 'skill', data: { name: 'Problem Solving', category: 'soft' } },
  { ns: 'onet', id: 'teamwork', type: 'skill', data: { name: 'Teamwork', category: 'soft' } },
  { ns: 'onet', id: 'critical-thinking', type: 'skill', data: { name: 'Critical Thinking', category: 'soft' } },
  { ns: 'onet', id: 'project-management', type: 'skill', data: { name: 'Project Management', category: 'soft' } },
]

// Sample relationships (occupation requires_skill skill)
const relationships = [
  // Software Developer skills
  { fromNs: 'onet', fromId: '15-1252.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'javascript', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '15-1252.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'python', toType: 'skill', data: { level: 4, importance: 4 } },
  { fromNs: 'onet', fromId: '15-1252.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'java', toType: 'skill', data: { level: 4, importance: 4 } },
  { fromNs: 'onet', fromId: '15-1252.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'sql', toType: 'skill', data: { level: 3, importance: 3 } },
  { fromNs: 'onet', fromId: '15-1252.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'communication', toType: 'skill', data: { level: 4, importance: 5 } },
  { fromNs: 'onet', fromId: '15-1252.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'problem-solving', toType: 'skill', data: { level: 5, importance: 5 } },

  // Data Scientist skills
  { fromNs: 'onet', fromId: '15-2051.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'python', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '15-2051.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'sql', toType: 'skill', data: { level: 4, importance: 4 } },
  { fromNs: 'onet', fromId: '15-2051.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'machine-learning', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '15-2051.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'data-analysis', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '15-2051.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'communication', toType: 'skill', data: { level: 4, importance: 4 } },
  { fromNs: 'onet', fromId: '15-2051.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'critical-thinking', toType: 'skill', data: { level: 5, importance: 5 } },

  // Web Developer skills
  { fromNs: 'onet', fromId: '15-1254.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'javascript', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '15-1254.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'html-css', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '15-1254.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'react', toType: 'skill', data: { level: 4, importance: 4 } },
  { fromNs: 'onet', fromId: '15-1254.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'sql', toType: 'skill', data: { level: 3, importance: 3 } },
  { fromNs: 'onet', fromId: '15-1254.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'communication', toType: 'skill', data: { level: 3, importance: 4 } },
  { fromNs: 'onet', fromId: '15-1254.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'problem-solving', toType: 'skill', data: { level: 4, importance: 4 } },

  // Cybersecurity Analyst skills
  { fromNs: 'onet', fromId: '15-1299.09', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'cybersecurity', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '15-1299.09', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'python', toType: 'skill', data: { level: 4, importance: 3 } },
  { fromNs: 'onet', fromId: '15-1299.09', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'cloud-computing', toType: 'skill', data: { level: 4, importance: 4 } },
  { fromNs: 'onet', fromId: '15-1299.09', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'problem-solving', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '15-1299.09', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'critical-thinking', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '15-1299.09', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'communication', toType: 'skill', data: { level: 4, importance: 4 } },

  // CIS Manager skills
  { fromNs: 'onet', fromId: '11-3021.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'project-management', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '11-3021.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'communication', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '11-3021.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'teamwork', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '11-3021.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'cloud-computing', toType: 'skill', data: { level: 3, importance: 3 } },
  { fromNs: 'onet', fromId: '11-3021.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'critical-thinking', toType: 'skill', data: { level: 5, importance: 5 } },
  { fromNs: 'onet', fromId: '11-3021.00', fromType: 'occupation', predicate: 'requires_skill', toNs: 'onet', toId: 'problem-solving', toType: 'skill', data: { level: 5, importance: 5 } },
]

async function importData() {
  console.log('🚀 Importing Sample ONET Data to D1 Graph Database')
  console.log('=' .repeat(60))

  const startTime = Date.now()

  // Import occupations
  console.log(`\n📊 Importing ${occupations.length} occupations...`)
  const occupationStart = Date.now()

  for (const occupation of occupations) {
    const res = await fetch(`${GRAPH_API_URL}/things`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(occupation),
    })

    if (!res.ok) {
      console.error(`❌ Failed to import ${occupation.data.title}: ${res.statusText}`)
      continue
    }

    const data = await res.json()
    console.log(`  ✅ ${occupation.data.title} (${data.ulid})`)
  }

  const occupationTime = Date.now() - occupationStart
  console.log(`  ⏱️  ${occupationTime}ms (avg ${(occupationTime / occupations.length).toFixed(1)}ms per occupation)`)

  // Import skills
  console.log(`\n🛠️  Importing ${skills.length} skills...`)
  const skillStart = Date.now()

  for (const skill of skills) {
    const res = await fetch(`${GRAPH_API_URL}/things`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill),
    })

    if (!res.ok) {
      console.error(`❌ Failed to import ${skill.data.name}: ${res.statusText}`)
      continue
    }

    const data = await res.json()
    console.log(`  ✅ ${skill.data.name} (${data.ulid})`)
  }

  const skillTime = Date.now() - skillStart
  console.log(`  ⏱️  ${skillTime}ms (avg ${(skillTime / skills.length).toFixed(1)}ms per skill)`)

  // Import relationships
  console.log(`\n🔗 Importing ${relationships.length} relationships...`)
  const relationshipStart = Date.now()

  for (const rel of relationships) {
    const res = await fetch(`${GRAPH_API_URL}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rel),
    })

    if (!res.ok) {
      console.error(`❌ Failed to import relationship ${rel.fromId} -> ${rel.toId}: ${res.statusText}`)
      continue
    }

    const data = await res.json()
    console.log(`  ✅ ${rel.fromId} requires ${rel.toId} (${data.ulid})`)
  }

  const relationshipTime = Date.now() - relationshipStart
  console.log(`  ⏱️  ${relationshipTime}ms (avg ${(relationshipTime / relationships.length).toFixed(1)}ms per relationship)`)

  const totalTime = Date.now() - startTime
  console.log(`\n✅ Import Complete!`)
  console.log(`  Total: ${occupations.length + skills.length + relationships.length} records`)
  console.log(`  Time: ${totalTime}ms`)
  console.log(`  Avg: ${(totalTime / (occupations.length + skills.length + relationships.length)).toFixed(1)}ms per record`)

  // Test queries
  console.log(`\n🔍 Testing Queries...`)

  // Query 1: What occupations require JavaScript?
  console.log(`\n  Query: What occupations require JavaScript?`)
  const q1Start = Date.now()
  const q1 = await fetch(`${GRAPH_API_URL}/relationships/inbound/onet/javascript?predicate=requires_skill`)
  const q1Data = await q1.json()
  const q1Time = Date.now() - q1Start
  console.log(`    Result: ${q1Data.items.length} occupations`)
  console.log(`    Time: ${q1Time}ms`)

  // Query 2: What skills does Software Developer need?
  console.log(`\n  Query: What skills does Software Developer need?`)
  const q2Start = Date.now()
  const q2 = await fetch(`${GRAPH_API_URL}/relationships/outbound/onet/15-1252.00?predicate=requires_skill`)
  const q2Data = await q2.json()
  const q2Time = Date.now() - q2Start
  console.log(`    Result: ${q2Data.items.length} skills`)
  console.log(`    Time: ${q2Time}ms`)

  // Query 3: All occupations with bright_outlook=true
  console.log(`\n  Query: All occupations (filter by type)`)
  const q3Start = Date.now()
  const q3 = await fetch(`${GRAPH_API_URL}/things?type=occupation`)
  const q3Data = await q3.json()
  const q3Time = Date.now() - q3Start
  console.log(`    Result: ${q3Data.items.length} occupations`)
  console.log(`    Time: ${q3Time}ms`)

  console.log(`\n✅ All queries successful!`)
}

importData().catch(console.error)
