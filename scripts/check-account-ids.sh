#!/bin/bash

# Check which wrangler configs have Driv.ly account_id configured

ACCOUNT_ID="b6641681fe423910342b9ffa1364c76d"

echo "Checking wrangler configs for Driv.ly account_id..."
echo ""

missing=0
configured=0

while IFS= read -r file; do
  if grep -q "account_id.*$ACCOUNT_ID" "$file"; then
    echo "✅ $file"
    ((configured++))
  else
    echo "❌ $file"
    ((missing++))
  fi
done < <(find . -name "wrangler.jsonc" -o -name "wrangler.toml" | grep -v node_modules | grep -v templates | sort)

echo ""
echo "Summary:"
echo "  Configured: $configured"
echo "  Missing: $missing"
echo "  Total: $((configured + missing))"
