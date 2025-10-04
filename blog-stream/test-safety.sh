#!/bin/bash
# Test safety checks for blog-stream worker

BASE_URL="http://localhost:8788"

echo "Testing blog-stream safety checks..."
echo

# Valid slug
echo "1. Valid slug (should work):"
curl -s "$BASE_URL/blog/hello-world" | head -5
echo
echo

# SQL injection
echo "2. SQL injection (should fail):"
curl -s "$BASE_URL/blog/test';DROP%20TABLE" | jq
echo
echo

# XSS
echo "3. XSS attack (should fail):"
curl -s "$BASE_URL/blog/test%3Cscript%3Ealert(1)%3C/script%3E" | jq
echo
echo

# Path traversal
echo "4. Path traversal (should fail):"
curl -s "$BASE_URL/blog/../etc/passwd" | jq
echo
echo

# Command injection
echo "5. Command injection (should fail):"
curl -s "$BASE_URL/blog/test;ls%20-la" | jq
echo
echo

# Too long
echo "6. Too long slug (should fail):"
curl -s "$BASE_URL/blog/$(python3 -c 'print("a"*250)')" | jq
echo
echo

# Empty slug
echo "7. Empty/dash-only slug (should fail):"
curl -s "$BASE_URL/blog/---" | jq
echo

echo "Safety tests complete!"
