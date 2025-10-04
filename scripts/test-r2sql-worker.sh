#!/bin/bash
#
# Test R2 SQL Query Worker
#
# This script tests the R2 SQL query Worker locally.
#
# Prerequisites:
# 1. R2 SQL Worker running: cd workers/r2sql-query && pnpm dev --remote
# 2. R2 SQL Pipeline set up (relationships table exists)
#
# Usage:
#   ./test-r2sql-worker.sh

set -e

echo "🧪 Testing R2 SQL Query Worker"
echo "=============================="
echo ""

# Configuration
WORKER_URL="${R2SQL_WORKER_URL:-http://localhost:8787}"
WAREHOUSE="b6641681fe423910342b9ffa1364c76d_mdxld-graph"

echo "Worker URL: $WORKER_URL"
echo "Warehouse:  $WAREHOUSE"
echo ""

# Test 1: Health Check
echo "📋 Test 1: Health Check"
echo "----------------------"
HEALTH_RESPONSE=$(curl -s "$WORKER_URL/health")
echo "$HEALTH_RESPONSE" | jq .
echo ""

# Test 2: Simple Query (List all relationships)
echo "📋 Test 2: Simple Query (List all relationships)"
echo "------------------------------------------------"
QUERY1='{"sql":"SELECT * FROM default.relationships LIMIT 5"}'
echo "Query: SELECT * FROM default.relationships LIMIT 5"
echo ""

RESPONSE1=$(curl -s -X POST "$WORKER_URL/query" \
  -H 'Content-Type: application/json' \
  -d "$QUERY1")

echo "Response:"
echo "$RESPONSE1" | jq .
echo ""

# Test 3: Backlink Query (What links to github.com/dot-do/api?)
echo "📋 Test 3: Backlink Query (What links to github.com/dot-do/api?)"
echo "-----------------------------------------------------------------"
QUERY2="{\"sql\":\"SELECT fromNs, fromId, fromType, predicate FROM default.relationships WHERE toNs = 'github.com' AND toId = '/dot-do/api'\",\"warehouse\":\"$WAREHOUSE\"}"
echo "Query: SELECT fromNs, fromId, fromType, predicate"
echo "       FROM default.relationships"
echo "       WHERE toNs = 'github.com' AND toId = '/dot-do/api'"
echo ""

RESPONSE2=$(curl -s -X POST "$WORKER_URL/query" \
  -H 'Content-Type: application/json' \
  -d "$QUERY2")

echo "Response:"
echo "$RESPONSE2" | jq .
echo ""

# Test 4: Count Query
echo "📋 Test 4: Count Query (Total relationships)"
echo "-------------------------------------------"
QUERY3='{"sql":"SELECT COUNT(*) as count FROM default.relationships"}'
echo "Query: SELECT COUNT(*) as count FROM default.relationships"
echo ""

RESPONSE3=$(curl -s -X POST "$WORKER_URL/query" \
  -H 'Content-Type: application/json' \
  -d "$QUERY3")

echo "Response:"
echo "$RESPONSE3" | jq .
echo ""

# Summary
echo "✅ All tests completed!"
echo ""
echo "Next Steps:"
echo "----------"
echo "1. Verify responses look correct"
echo "2. Run benchmark suite:"
echo "   pnpm tsx scripts/benchmark-backlinks.ts --backend r2sql --iterations 10"
echo ""
