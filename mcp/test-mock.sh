#!/bin/bash

# Test Mock MCP Server
# Usage: ./test-mock.sh [url]
# Default: http://localhost:8787

URL="${1:-http://localhost:8787}"

echo "Testing Mock MCP Server at $URL"
echo ""

# Test 1: Initialize
echo "1. Testing initialize..."
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {},
    "id": 1
  }' | jq .

echo ""

# Test 2: List tools
echo "2. Testing tools/list..."
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }' | jq .

echo ""

# Test 3: Call eval tool - Database example
echo "3. Testing eval tool - Database operations..."
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "eval",
      "arguments": {
        "code": "const docs = await db.documents.search(\"machine learning\", { limit: 5 }); const summary = await ai.textGeneration({ prompt: \"Summarize these documents\" }); return { docs: docs.length, summary };"
      }
    },
    "id": 3
  }' | jq .

echo ""

# Test 4: Call eval tool - API example
echo "4. Testing eval tool - GitHub API..."
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "eval",
      "arguments": {
        "code": "const repos = await api.github.searchRepositories({ query: \"cloudflare workers mcp\" }); const top = repos[0]; const issues = await api.github.listIssues({ owner: top.owner, repo: top.name }); return { repo: top.name, stars: top.stars, issues: issues.length };"
      }
    },
    "id": 4
  }' | jq .

echo ""

# Test 5: Call eval tool - AI pipeline
echo "5. Testing eval tool - AI pipeline..."
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "eval",
      "arguments": {
        "code": "const response = await fetch(\"https://example.com/article\"); const text = await response.text(); const embedding = await ai.embedding({ text }); await db.documents.put(\"article-123\", { text, embedding: embedding.data[0] }); return \"Processed and stored article with embedding\";"
      }
    },
    "id": 5
  }' | jq .

echo ""
echo "Tests completed!"
