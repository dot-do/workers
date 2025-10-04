#!/bin/bash
#
# R2 SQL Setup Script for MDXLD Graph Database
#
# This script sets up the complete R2 SQL pipeline for relationships backlink queries:
# 1. Creates a sink (output to R2 Data Catalog/Iceberg)
# 2. Creates a stream (input HTTP endpoint)
# 3. Creates a pipeline (connects stream to sink)
#
# Prerequisites:
# - R2 bucket 'mdxld-graph' created
# - Data Catalog enabled on bucket
# - API token with R2 Data Catalog permissions
#
# Usage:
#   export CLOUDFLARE_ACCOUNT_ID=b6641681fe423910342b9ffa1364c76d
#   export R2_SQL_AUTH_TOKEN=<your-api-token>
#   ./r2-sql-setup.sh
#

set -e  # Exit on error

# Configuration
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-b6641681fe423910342b9ffa1364c76d}"
BUCKET="mdxld-graph"
NAMESPACE="default"
TABLE="relationships"
SINK_NAME="mdxld_relationships_sink"
STREAM_NAME="mdxld_relationships_stream"
PIPELINE_NAME="mdxld-relationships"

# Check prerequisites
if [ -z "$R2_SQL_AUTH_TOKEN" ]; then
  echo "Error: R2_SQL_AUTH_TOKEN environment variable not set"
  echo ""
  echo "To create an API token:"
  echo "1. Visit https://dash.cloudflare.com/profile/api-tokens"
  echo "2. Create Token -> Create Custom Token"
  echo "3. Permissions: Account -> R2 Data Catalog -> Read & Write"
  echo "4. Copy the token and export it:"
  echo "   export R2_SQL_AUTH_TOKEN=<your-token>"
  exit 1
fi

echo "🚀 Setting up R2 SQL Pipeline for MDXLD Graph Database"
echo "=================================================="
echo ""
echo "Configuration:"
echo "  Account ID: $ACCOUNT_ID"
echo "  Bucket:     $BUCKET"
echo "  Namespace:  $NAMESPACE"
echo "  Table:      $TABLE"
echo ""

# Step 1: Create Sink
echo "📦 Step 1: Creating R2 Data Catalog Sink..."
echo ""

npx wrangler pipelines sinks create "$SINK_NAME" \
  --type r2-data-catalog \
  --bucket "$BUCKET" \
  --namespace "$NAMESPACE" \
  --table "$TABLE" \
  --catalog-token "$R2_SQL_AUTH_TOKEN" \
  --format parquet \
  --compression zstd \
  --target-row-group-size 128MB \
  --roll-interval 300

echo ""
echo "✅ Sink created: $SINK_NAME"
echo ""

# Step 2: Create Stream
echo "📡 Step 2: Creating HTTP Stream..."
echo ""

# Note: wrangler doesn't have a direct 'streams create' command
# We need to use the pipelines create command which creates both
# Let me check if we can create stream separately...

echo "⚠️  Stream creation requires pipeline creation"
echo "    Will create pipeline in next step..."
echo ""

# Step 3: Create Pipeline
echo "🔗 Step 3: Creating Pipeline..."
echo ""

# Create a SQL file for the pipeline
SQL_FILE="/tmp/pipeline-${PIPELINE_NAME}.sql"
cat > "$SQL_FILE" << 'EOF'
INSERT INTO mdxld_relationships_sink
SELECT * FROM mdxld_relationships_stream
EOF

npx wrangler pipelines create "$PIPELINE_NAME" \
  --sql-file "$SQL_FILE"

rm "$SQL_FILE"

echo ""
echo "✅ Pipeline created: $PIPELINE_NAME"
echo ""

# Step 4: Get Pipeline Details
echo "📋 Step 4: Getting Pipeline Details..."
echo ""

PIPELINE_DETAILS=$(npx wrangler pipelines list | grep "$PIPELINE_NAME")
echo "$PIPELINE_DETAILS"

echo ""
echo "✅ R2 SQL Setup Complete!"
echo ""
echo "Next Steps:"
echo "─────────────────────────────────────────"
echo "1. Get the HTTP endpoint URL:"
echo "   npx wrangler pipelines streams list"
echo ""
echo "2. Send test data:"
echo "   curl -X POST https://<stream-endpoint-url> \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{...}'"
echo ""
echo "3. Query the data:"
echo "   export WRANGLER_R2_SQL_AUTH_TOKEN=\$R2_SQL_AUTH_TOKEN"
echo "   npx wrangler r2 sql query \"${ACCOUNT_ID}_${BUCKET}\" \\"
echo "     \"SELECT * FROM $NAMESPACE.$TABLE LIMIT 10\""
echo ""
