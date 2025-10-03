#!/bin/bash

# Configuration Status Checker
# Shows what's configured and what still needs to be done

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Workers Deployment Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
  echo -e "${RED}❌ wrangler not found${NC}"
  echo "Install with: npm install -g wrangler"
  exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
  echo -e "${RED}❌ Not logged in to Cloudflare${NC}"
  echo "Run: wrangler login"
  exit 1
fi

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to check KV namespace in wrangler.jsonc
check_kv_namespace() {
  local service=$1
  local binding=$2
  local file="$service/wrangler.jsonc"

  if [ ! -f "$file" ]; then
    echo -e "  ${RED}❌${NC} wrangler.jsonc not found"
    ((FAILED_CHECKS++))
    return 1
  fi

  # Check if placeholder ID exists
  if grep -q "placeholder\|YOUR_" "$file" 2>/dev/null; then
    echo -e "  ${RED}❌${NC} $binding has placeholder ID"
    ((FAILED_CHECKS++))
    return 1
  else
    echo -e "  ${GREEN}✅${NC} $binding configured"
    ((PASSED_CHECKS++))
    return 0
  fi
}

# Function to check if secret exists
check_secret() {
  local service=$1
  local secret_name=$2

  cd "$service" 2>/dev/null || return 1

  # Try to list secrets (this will show if the secret exists)
  if wrangler secret list 2>/dev/null | grep -q "$secret_name"; then
    echo -e "  ${GREEN}✅${NC} $secret_name set"
    ((PASSED_CHECKS++))
    cd - > /dev/null
    return 0
  else
    echo -e "  ${RED}❌${NC} $secret_name not set"
    ((FAILED_CHECKS++))
    cd - > /dev/null
    return 1
  fi
}

# Function to check if service is deployed
check_deployment() {
  local service_name=$1

  if wrangler deployments list --name "$service_name" 2>/dev/null | grep -q "Active"; then
    echo -e "  ${GREEN}✅${NC} $service_name deployed"
    ((PASSED_CHECKS++))
    return 0
  else
    echo -e "  ${RED}❌${NC} $service_name not deployed"
    ((FAILED_CHECKS++))
    return 1
  fi
}

echo -e "${BLUE}━━━ KV Namespaces ━━━${NC}"
echo ""

echo "Gateway:"
((TOTAL_CHECKS++))
check_kv_namespace "gateway" "GATEWAY_KV"
echo ""

echo "Auth:"
((TOTAL_CHECKS+=2))
check_kv_namespace "auth" "RATE_LIMIT_KV"
check_kv_namespace "auth" "SESSIONS_KV"
echo ""

echo "MCP:"
((TOTAL_CHECKS++))
check_kv_namespace "mcp" "KV"
echo ""

echo -e "${BLUE}━━━ Secrets ━━━${NC}"
echo ""

echo "Database:"
((TOTAL_CHECKS++))
check_secret "db" "DATABASE_URL"
echo ""

echo "Auth:"
((TOTAL_CHECKS+=5))
check_secret "auth" "WORKOS_API_KEY"
check_secret "auth" "WORKOS_CLIENT_ID"
check_secret "auth" "WORKOS_CLIENT_SECRET"
check_secret "auth" "JWT_SECRET"
check_secret "auth" "JWT_REFRESH_SECRET"
echo ""

echo "Email:"
((TOTAL_CHECKS+=2))
check_secret "email" "RESEND_API_KEY"
check_secret "email" "WORKOS_API_KEY"
echo ""

echo "MCP:"
((TOTAL_CHECKS++))
check_secret "mcp" "GITHUB_TOKEN"
echo ""

echo "Webhooks (optional):"
((TOTAL_CHECKS+=4))
check_secret "webhooks" "STRIPE_WEBHOOK_SECRET"
check_secret "webhooks" "WORKOS_WEBHOOK_SECRET"
check_secret "webhooks" "GITHUB_WEBHOOK_SECRET"
check_secret "webhooks" "RESEND_WEBHOOK_SECRET"
echo ""

echo -e "${BLUE}━━━ Deployments ━━━${NC}"
echo ""

((TOTAL_CHECKS+=7))
check_deployment "do-db"
check_deployment "do-auth"
check_deployment "do-schedule"
check_deployment "do-webhooks"
check_deployment "do-email"
check_deployment "do-mcp"
check_deployment "do-gateway"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo ""

PERCENT=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
echo -e "Configuration: ${PERCENT}% complete"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! Ready to deploy.${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some configuration still needed.${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run configuration wizard: ./scripts/configure.sh"
  echo "  2. See QUICK-START.md for manual setup"
  echo "  3. Run this check again: ./scripts/check-status.sh"
  exit 1
fi
