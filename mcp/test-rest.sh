#!/bin/bash

# Test REST API for Mock MCP Server
# Usage: ./test-rest.sh [url]
# Default: http://localhost:8787

URL="${1:-http://localhost:8787}"

echo "🌐 Testing REST API at $URL"
echo "================================"
echo ""

# Test 1: API Discovery (Root)
echo "1️⃣  API Discovery (GET /)"
echo "   Testing HATEOAS root endpoint..."
curl -s "$URL" | jq '.name, ._links.rest.eval.get.examples[0].description, ._links.rest.eval.get.examples[0].href' | head -10
echo ""

# Test 2: Quick Start Guide
echo "2️⃣  Quick Start Guide (GET /docs/quickstart)"
echo "   Fetching interactive guide..."
curl -s "$URL/docs/quickstart" | jq '.title, .steps[0].title, .steps[0].action.href' | head -10
echo ""

# Test 3: Examples Catalog
echo "3️⃣  Examples Catalog (GET /docs/examples)"
echo "   Fetching example use cases..."
curl -s "$URL/docs/examples" | jq '.examples[0].category, .examples[0].examples[0].title'
echo ""

# Test 4: Simple GET request
echo "4️⃣  Simple Eval (GET /mock/eval?code=...)"
echo "   Code: return \"Hello from REST API!\""
SIMPLE_CODE=$(echo 'return "Hello from REST API!"' | jq -sRr @uri)
curl -s "$URL/mock/eval?code=$SIMPLE_CODE" | jq .
echo ""

# Test 5: GitHub API GET request
echo "5️⃣  GitHub API Call (GET /mock/eval)"
echo "   Code: const repos = await api.github.searchRepositories({ query: \"cloudflare workers\" }); return { found: repos.length, top: repos[0].name };"
GH_CODE=$(echo 'const repos = await api.github.searchRepositories({ query: "cloudflare workers" }); return { found: repos.length, top: repos[0].name };' | jq -sRr @uri)
curl -s "$URL/mock/eval?code=$GH_CODE" | jq '.success, .data.content[0].text' | head -20
echo ""

# Test 6: Database + AI with session (GET)
echo "6️⃣  Database + AI with Session (GET /mock/eval)"
echo "   Code: const docs = await db.documents.search(\"machine learning\", { limit: 5 }); return docs.length;"
DB_CODE=$(echo 'const docs = await db.documents.search("machine learning", { limit: 5 }); const summary = await ai.textGeneration({ prompt: "Summarize" }); return { docs: docs.length, summary };' | jq -sRr @uri)
curl -s "$URL/mock/eval?code=$DB_CODE&session=test-session" | jq '.success, .session, .data.content[0].text' | head -20
echo ""

# Test 7: POST with JSON body
echo "7️⃣  POST with JSON Body (POST /mock/eval)"
echo "   Testing multi-step AI pipeline..."
curl -s -X POST "$URL/mock/eval" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const response = await fetch(\"https://example.com/data\"); const data = await response.json(); const embedding = await ai.embedding({ text: JSON.stringify(data) }); await db.documents.put(\"doc-123\", { data, embedding: embedding.data[0] }); return \"Processed and stored\";",
    "session": "pipeline-test"
  }' | jq '.success, .session, .data.content[0].text' | head -20
echo ""

# Test 8: Session context persistence
echo "8️⃣  Session Context Test (2 requests with same session)"
echo "   Request 1: Create user Alice..."
CREATE_USER=$(echo 'await db.users.put("alice", { name: "Alice", role: "engineer" }); return "User created";' | jq -sRr @uri)
curl -s "$URL/mock/eval?code=$CREATE_USER&session=context-test" | jq '.success, .data.content[0].text' | head -10
echo ""
echo "   Request 2: Retrieve Alice's role (AI should remember context)..."
GET_USER=$(echo 'const alice = await db.users.get("alice"); return alice.role;' | jq -sRr @uri)
curl -s "$URL/mock/eval?code=$GET_USER&session=context-test" | jq '.success, .data.content[0].text' | head -10
echo ""

# Test 9: Context parameter
echo "9️⃣  Context Parameter (POST with context)"
echo "   Passing userId in context..."
curl -s -X POST "$URL/mock/eval" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "return \"User \" + context.userId + \" (\" + context.role + \") is logged in\";",
    "context": { "userId": "user-123", "role": "admin" }
  }' | jq '.success, .data.content[0].text' | head -10
echo ""

# Test 10: Event-driven workflow
echo "🔟 Event-Driven Workflow (POST)"
echo "   Registering event handlers..."
curl -s -X POST "$URL/mock/eval" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "on(\"webhook.github.push\", async (event) => { const analysis = await ai.textGeneration({ prompt: \"Analyze commits\" }); await send(\"analysis.complete\", { analysis }); }); return \"Event listener registered\";",
    "session": "events-test"
  }' | jq '.success, .data.content[0].text' | head -15
echo ""

echo "✅ REST API Tests Complete!"
echo ""
echo "💡 Tips:"
echo "   • Open $URL in browser to see clickable links"
echo "   • Try $URL/docs/quickstart for interactive guide"
echo "   • Visit $URL/docs/examples to see all use cases"
echo "   • Each example has clickable execution links!"
echo ""
echo "📚 Documentation:"
echo "   • REST_API.md - Complete REST API guide"
echo "   • MOCK_POC.md - MCP protocol documentation"
echo "   • TESTING.mock.md - Testing guide"
