#!/bin/bash
# Deploy an MDX worker to Cloudflare
#
# Usage:
#   ./scripts/deploy-mdx-worker.sh yaml
#   ./scripts/deploy-mdx-worker.sh esbuild
#   ./scripts/deploy-mdx-worker.sh yaml --env staging

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <worker-name> [--env <environment>]"
  echo ""
  echo "Examples:"
  echo "  $0 yaml"
  echo "  $0 esbuild --env staging"
  exit 1
fi

WORKER_NAME=$1
shift  # Remove worker name from arguments, keep remaining args for wrangler

MDX_FILE="${WORKER_NAME}.mdx"
WORKER_DIR="${WORKER_NAME}"

# Check if .mdx file exists
if [ ! -f "$MDX_FILE" ]; then
  echo "❌ Error: $MDX_FILE not found"
  exit 1
fi

echo "🔨 Building worker: $WORKER_NAME"
echo ""

# Build worker from .mdx file
pnpm build-mdx "$MDX_FILE"

echo ""
echo "🚀 Deploying worker: $WORKER_NAME"
echo ""

# Change to worker directory and deploy
cd "$WORKER_DIR"
npx wrangler deploy "$@"

echo ""
echo "✅ Deployed $WORKER_NAME successfully!"
