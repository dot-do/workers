#!/bin/bash

# Deploy All Services
# Deploys all microservices in dependency order

set -e # Exit on error

echo "=== Workers Deployment Script ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Service deployment order (based on dependencies)
SERVICES=(
  "db"
  "auth"
  "schedule"
  "webhooks"
  "email"
  "mcp"
  "gateway"
)

# Function to deploy a service
deploy_service() {
  local service=$1
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Deploying: $service"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cd "$service"

  # Check if wrangler.jsonc exists
  if [ ! -f "wrangler.jsonc" ]; then
    echo -e "${RED}❌ No wrangler.jsonc found for $service${NC}"
    cd ..
    return 1
  fi

  # Run tests first
  echo "Running tests..."
  if pnpm test > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Tests passed${NC}"
  else
    echo -e "${YELLOW}⚠️  Tests failed or not found${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      cd ..
      return 1
    fi
  fi

  # Type check
  echo "Type checking..."
  if pnpm typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Type check passed${NC}"
  else
    echo -e "${YELLOW}⚠️  Type check failed or not configured${NC}"
  fi

  # Deploy
  echo "Deploying to Cloudflare Workers..."
  if pnpm deploy; then
    echo -e "${GREEN}✅ $service deployed successfully${NC}"
    cd ..
    return 0
  else
    echo -e "${RED}❌ Failed to deploy $service${NC}"
    cd ..
    return 1
  fi
}

# Check prerequisites
echo "Checking prerequisites..."

# Check for wrangler
if ! command -v wrangler &> /dev/null; then
  echo -e "${RED}❌ wrangler not found. Install with: npm install -g wrangler${NC}"
  exit 1
fi

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}❌ pnpm not found. Install with: npm install -g pnpm${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo ""

# Verify we're in the workers directory
if [ ! -d "gateway" ] || [ ! -d "db" ]; then
  echo -e "${RED}❌ Must run from workers/ directory${NC}"
  exit 1
fi

# Show deployment plan
echo "Deployment order:"
for i in "${!SERVICES[@]}"; do
  echo "  $((i+1)). ${SERVICES[$i]}"
done
echo ""

# Confirm deployment
read -p "Deploy all services? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled"
  exit 0
fi

# Deploy each service
DEPLOYED=0
FAILED=0

for service in "${SERVICES[@]}"; do
  if deploy_service "$service"; then
    ((DEPLOYED++))
  else
    ((FAILED++))
    echo -e "${RED}❌ Failed to deploy $service${NC}"
    read -p "Continue with remaining services? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      break
    fi
  fi
done

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Deployed: $DEPLOYED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Failed: $FAILED${NC}"
fi
echo ""

# Verify deployment
echo "Verifying deployments..."
echo ""

for service in "${SERVICES[@]}"; do
  if [ -f "$service/wrangler.jsonc" ]; then
    SERVICE_NAME=$(grep -o '"name": *"[^"]*"' "$service/wrangler.jsonc" | cut -d'"' -f4)
    WORKER_URL="https://$SERVICE_NAME.YOUR_SUBDOMAIN.workers.dev/health"
    echo "  $service: $WORKER_URL"
  fi
done

echo ""
echo "Run these commands to test:"
echo "  curl https://do-gateway.YOUR_SUBDOMAIN.workers.dev/health"
echo "  curl https://do-db.YOUR_SUBDOMAIN.workers.dev/health"
echo "  curl https://do-auth.YOUR_SUBDOMAIN.workers.dev/health"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All services deployed successfully!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some services failed to deploy${NC}"
  exit 1
fi
