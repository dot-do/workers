#!/bin/bash

# Configuration Wizard for Workers Deployment
# Guides user through KV namespace creation and secret configuration

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Workers Deployment Configuration Wizard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
echo ""

if ! command -v wrangler &> /dev/null; then
  echo -e "${RED}❌ wrangler not found${NC}"
  echo "Install with: npm install -g wrangler"
  exit 1
fi

if ! wrangler whoami &> /dev/null; then
  echo -e "${RED}❌ Not logged in to Cloudflare${NC}"
  echo "Run: wrangler login"
  exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Phase 1: KV Namespaces
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 1: Create KV Namespaces"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "We need to create KV namespaces for:"
echo "  - Gateway rate limiting"
echo "  - Auth sessions and rate limiting"
echo "  - MCP memory store"
echo ""

read -p "Create KV namespaces now? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Skipping KV namespace creation"
  echo "You can run this later with: ./scripts/configure.sh"
  exit 0
fi

echo ""
echo -e "${BLUE}Creating Gateway KV namespace...${NC}"
cd gateway
GATEWAY_KV_OUTPUT=$(wrangler kv:namespace create "GATEWAY_KV" 2>&1)
GATEWAY_KV_ID=$(echo "$GATEWAY_KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -n "$GATEWAY_KV_ID" ]; then
  echo -e "${GREEN}✅ Created: $GATEWAY_KV_ID${NC}"

  # Update wrangler.jsonc
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/placeholder-kv-namespace-id/$GATEWAY_KV_ID/" wrangler.jsonc
  else
    # Linux
    sed -i "s/placeholder-kv-namespace-id/$GATEWAY_KV_ID/" wrangler.jsonc
  fi

  echo -e "${GREEN}✅ Updated wrangler.jsonc${NC}"
else
  echo -e "${RED}❌ Failed to create Gateway KV namespace${NC}"
fi

cd ..
echo ""

echo -e "${BLUE}Creating Auth KV namespaces...${NC}"
cd auth

# Rate limiting KV
RATE_LIMIT_KV_OUTPUT=$(wrangler kv:namespace create "RATE_LIMIT_KV" 2>&1)
RATE_LIMIT_KV_ID=$(echo "$RATE_LIMIT_KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -n "$RATE_LIMIT_KV_ID" ]; then
  echo -e "${GREEN}✅ Created RATE_LIMIT_KV: $RATE_LIMIT_KV_ID${NC}"

  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/YOUR_RATE_LIMIT_KV_ID/$RATE_LIMIT_KV_ID/" wrangler.jsonc
  else
    sed -i "s/YOUR_RATE_LIMIT_KV_ID/$RATE_LIMIT_KV_ID/" wrangler.jsonc
  fi
else
  echo -e "${RED}❌ Failed to create RATE_LIMIT_KV${NC}"
fi

# Sessions KV
SESSIONS_KV_OUTPUT=$(wrangler kv:namespace create "SESSIONS_KV" 2>&1)
SESSIONS_KV_ID=$(echo "$SESSIONS_KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -n "$SESSIONS_KV_ID" ]; then
  echo -e "${GREEN}✅ Created SESSIONS_KV: $SESSIONS_KV_ID${NC}"

  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/YOUR_SESSIONS_KV_ID/$SESSIONS_KV_ID/" wrangler.jsonc
  else
    sed -i "s/YOUR_SESSIONS_KV_ID/$SESSIONS_KV_ID/" wrangler.jsonc
  fi

  echo -e "${GREEN}✅ Updated wrangler.jsonc${NC}"
else
  echo -e "${RED}❌ Failed to create SESSIONS_KV${NC}"
fi

cd ..
echo ""

echo -e "${BLUE}Creating MCP KV namespace...${NC}"
cd mcp
MCP_KV_OUTPUT=$(wrangler kv:namespace create "KV" 2>&1)
MCP_KV_ID=$(echo "$MCP_KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

if [ -n "$MCP_KV_ID" ]; then
  echo -e "${GREEN}✅ Created: $MCP_KV_ID${NC}"

  # MCP wrangler.jsonc might have placeholder, update if found
  if grep -q "placeholder" wrangler.jsonc; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/\"id\": \"[^\"]*\"/\"id\": \"$MCP_KV_ID\"/" wrangler.jsonc
    else
      sed -i "s/\"id\": \"[^\"]*\"/\"id\": \"$MCP_KV_ID\"/" wrangler.jsonc
    fi
    echo -e "${GREEN}✅ Updated wrangler.jsonc${NC}"
  fi
else
  echo -e "${RED}❌ Failed to create MCP KV namespace${NC}"
fi

cd ..
echo ""

echo -e "${GREEN}✅ KV Namespaces Created${NC}"
echo ""

# Phase 2: Secrets
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 2: Configure Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "We need to set secrets for each service."
echo "You'll need to have these ready:"
echo ""
echo "  Database:"
echo "    - PostgreSQL connection string from Neon"
echo ""
echo "  Auth:"
echo "    - WorkOS API Key, Client ID, Client Secret"
echo "    - JWT Secret (can generate with: openssl rand -base64 32)"
echo "    - JWT Refresh Secret (can generate)"
echo ""
echo "  Email:"
echo "    - Resend API Key"
echo "    - WorkOS API Key (same as Auth)"
echo ""
echo "  MCP:"
echo "    - GitHub Personal Access Token"
echo ""
echo "  Webhooks:"
echo "    - Stripe Webhook Secret"
echo "    - WorkOS Webhook Secret"
echo "    - GitHub Webhook Secret"
echo "    - Resend Webhook Secret"
echo ""

read -p "Configure secrets now? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${YELLOW}⚠️  Skipping secrets configuration${NC}"
  echo ""
  echo "You can set secrets later with:"
  echo "  cd <service> && wrangler secret put <SECRET_NAME>"
  echo ""
  echo "See QUICK-START.md for the complete list of required secrets"
  exit 0
fi

echo ""

# Database secrets
echo -e "${BLUE}Database Service Secrets:${NC}"
cd db
echo "Setting DATABASE_URL..."
wrangler secret put DATABASE_URL
cd ..
echo ""

# Auth secrets
echo -e "${BLUE}Auth Service Secrets:${NC}"
cd auth
echo "Setting WORKOS_API_KEY..."
wrangler secret put WORKOS_API_KEY
echo "Setting WORKOS_CLIENT_ID..."
wrangler secret put WORKOS_CLIENT_ID
echo "Setting WORKOS_CLIENT_SECRET..."
wrangler secret put WORKOS_CLIENT_SECRET

echo ""
echo "Generate JWT secrets with: openssl rand -base64 32"
echo ""
echo "Setting JWT_SECRET..."
wrangler secret put JWT_SECRET
echo "Setting JWT_REFRESH_SECRET..."
wrangler secret put JWT_REFRESH_SECRET
cd ..
echo ""

# Email secrets
echo -e "${BLUE}Email Service Secrets:${NC}"
cd email
echo "Setting RESEND_API_KEY..."
wrangler secret put RESEND_API_KEY
echo "Setting WORKOS_API_KEY (for magic links)..."
wrangler secret put WORKOS_API_KEY
cd ..
echo ""

# MCP secrets
echo -e "${BLUE}MCP Service Secrets:${NC}"
cd mcp
echo "Setting GITHUB_TOKEN..."
wrangler secret put GITHUB_TOKEN
cd ..
echo ""

# Webhooks secrets
echo -e "${BLUE}Webhooks Service Secrets:${NC}"
echo "These are optional - only set if you're using the respective providers"
echo ""
read -p "Configure webhook secrets? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  cd webhooks
  echo "Setting STRIPE_WEBHOOK_SECRET..."
  wrangler secret put STRIPE_WEBHOOK_SECRET
  echo "Setting WORKOS_WEBHOOK_SECRET..."
  wrangler secret put WORKOS_WEBHOOK_SECRET
  echo "Setting GITHUB_WEBHOOK_SECRET..."
  wrangler secret put GITHUB_WEBHOOK_SECRET
  echo "Setting RESEND_WEBHOOK_SECRET..."
  wrangler secret put RESEND_WEBHOOK_SECRET
  cd ..
fi
echo ""

echo -e "${GREEN}✅ Configuration Complete${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Verify configuration:"
echo "   pnpm tsx scripts/verify-deployment.ts"
echo ""
echo "2. Deploy all services:"
echo "   ./scripts/deploy-all.sh"
echo ""
echo "3. Test health checks:"
echo "   curl https://do-gateway.YOUR_SUBDOMAIN.workers.dev/health"
echo ""
echo "4. Follow integration testing guide:"
echo "   See INTEGRATION.md"
echo ""
