#!/bin/bash

# Add Driv.ly account_id to all wrangler configs that don't have it

ACCOUNT_ID="b6641681fe423910342b9ffa1364c76d"

echo "Adding Driv.ly account_id to wrangler configs..."
echo ""

updated=0
skipped=0
failed=0

while IFS= read -r file; do
  if grep -q "account_id.*$ACCOUNT_ID" "$file"; then
    echo "⏭️  Skipping $file (already configured)"
    ((skipped++))
  else
    echo "🔧 Updating $file"

    # For .jsonc files
    if [[ "$file" == *.jsonc ]]; then
      # Check if file already has an account_id field
      if grep -q '"account_id"' "$file"; then
        # Replace existing account_id
        if sed -i '' "s/\"account_id\".*:.*\".*\"/\"account_id\": \"$ACCOUNT_ID\"/g" "$file"; then
          echo "   ✅ Updated existing account_id"
          ((updated++))
        else
          echo "   ❌ Failed to update"
          ((failed++))
        fi
      else
        # Add account_id after compatibility_date
        if sed -i '' "/\"compatibility_date\":/a\\
\t\"account_id\": \"$ACCOUNT_ID\",
" "$file"; then
          echo "   ✅ Added account_id"
          ((updated++))
        else
          echo "   ❌ Failed to add"
          ((failed++))
        fi
      fi
    fi

    # For .toml files
    if [[ "$file" == *.toml ]]; then
      # Check if file already has account_id
      if grep -q "^account_id" "$file"; then
        # Replace existing
        if sed -i '' "s/^account_id.*/account_id = \"$ACCOUNT_ID\"/g" "$file"; then
          echo "   ✅ Updated existing account_id"
          ((updated++))
        else
          echo "   ❌ Failed to update"
          ((failed++))
        fi
      else
        # Add after name field
        if sed -i '' "/^name =/a\\
account_id = \"$ACCOUNT_ID\"
" "$file"; then
          echo "   ✅ Added account_id"
          ((updated++))
        else
          echo "   ❌ Failed to add"
          ((failed++))
        fi
      fi
    fi
  fi
done < <(find . -name "wrangler.jsonc" -o -name "wrangler.toml" | grep -v node_modules | grep -v templates | sort)

echo ""
echo "Summary:"
echo "  Updated: $updated"
echo "  Skipped: $skipped"
echo "  Failed: $failed"
