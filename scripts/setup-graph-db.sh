#!/bin/bash
#
# Setup Graph Database
#
# Creates D1 database and applies schemas for Things & Relationships

set -e

echo "🗄️  Setting up Graph Database..."

# Check if database already exists
DB_LIST=$(npx wrangler d1 list | grep "graph-db" || true)

if [ -z "$DB_LIST" ]; then
  echo "Creating D1 database: graph-db"
  npx wrangler d1 create graph-db

  echo ""
  echo "⚠️  Copy the database_id from above and update:"
  echo "   - workers/graph/wrangler.jsonc"
  echo "   - workers/importers/onet/wrangler.jsonc"
  echo ""
  read -p "Press enter after updating wrangler configs..."
else
  echo "✅ Database already exists"
fi

# Get database ID
DB_ID=$(npx wrangler d1 list | grep "graph-db" | awk '{print $2}')

if [ -z "$DB_ID" ]; then
  echo "❌ Could not find database ID"
  exit 1
fi

echo "Database ID: $DB_ID"

# Apply schemas
echo ""
echo "📝 Applying Things schema..."
npx wrangler d1 execute graph-db --file=workers/graph/schema/things.sql

echo ""
echo "📝 Applying Relationships schema..."
npx wrangler d1 execute graph-db --file=workers/graph/schema/relationships.sql

echo ""
echo "✅ Graph database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update wrangler.jsonc files with database_id: $DB_ID"
echo "  2. Deploy services: cd workers/graph && pnpm deploy"
echo "  3. Test import: pnpm test:import"
