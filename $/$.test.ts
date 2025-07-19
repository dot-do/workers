import $ from './$.js'

async function runTests() {
  // Test 1: Template literal followed by method call
  console.log('\n=== Test 1: $`https://builder.domains`.get("*") ===')
  await $`https://builder.domains`.get('*')

  // Test 2: Chained method calls
  console.log('\n=== Test 2: $.api.users.find({ id: 123 }).format("json") ===')
  await $.api.users.find({ id: 123 }).format('json')

  // Test 3: Multiple chains
  console.log('\n=== Test 3: $.db.query("SELECT *").limit(10).offset(20) ===')
  await $.db.query('SELECT *').limit(10).offset(20)

  // Test 4: Mixed template and method calls
  console.log('\n=== Test 4: $.ai`Generate blog about ${`AI`}`.summarize().translate("es") ===')
  await $.ai`Generate blog about ${'AI'}`.summarize().translate('es')
}

runTests()