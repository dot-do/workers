#!/bin/bash
#
# Deploy Workers to Dispatch Namespaces
#
# Usage:
#   ./scripts/deploy-to-namespace.sh <service> <namespace>
#   ./scripts/deploy-to-namespace.sh gateway public
#   ./scripts/deploy-to-namespace.sh db internal
#   ./scripts/deploy-to-namespace.sh all internal
#
# Services: gateway, db, auth, schedule, webhooks, email, queue, mcp, all
# Namespaces: internal, public, tenant (new 3-tier architecture)
#           OR production, staging, development (legacy environment-based)
#
# ⚠️  EXPERIMENTAL: Testing 3-tier namespace architecture
#     - internal: Infrastructure services (admin-only)
#     - public: Public APIs (open, rate-limited)
#     - tenant: Tenant deployments (tenant-scoped)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Valid services
SERVICES=("gateway" "db" "auth" "schedule" "webhooks" "email" "queue" "mcp")

# NEW: 3-tier namespace mappings (experimental)
declare -A TIER_NAMESPACES=(
  ["internal"]="dotdo-internal"
  ["public"]="dotdo-public"
  ["tenant"]="dotdo-tenant"
)

# LEGACY: Environment-based namespace mappings (existing)
declare -A ENV_NAMESPACES=(
  ["production"]="dotdo-production"
  ["staging"]="dotdo-staging"
  ["development"]="dotdo-development"
)

declare -A NAMESPACE_IDS=(
  ["production"]="62ce3520-96e8-4d9d-a37d-83e99d5319ab"
  ["staging"]="6eb2b6e7-5e8c-4ce6-bb63-7185e2dadc0e"
  ["development"]="c1a5acfb-fc81-43fc-8d99-8856c6a45c4a"
)

# Display usage
usage() {
  echo "Usage: $0 <service> <namespace>"
  echo ""
  echo "Services:"
  echo "  gateway    - API Gateway"
  echo "  db         - Database RPC service"
  echo "  auth       - Authentication service"
  echo "  schedule   - Cron/scheduled tasks service"
  echo "  webhooks   - External webhooks"
  echo "  email      - Transactional email"
  echo "  queue      - Message queue processing"
  echo "  mcp        - Model Context Protocol server"
  echo "  all        - Deploy all services in order"
  echo ""
  echo -e "${CYAN}3-Tier Namespaces (EXPERIMENTAL):${NC}"
  echo "  internal   - dotdo-internal (infrastructure, admin-only)"
  echo "  public     - dotdo-public (public APIs, rate-limited)"
  echo "  tenant     - dotdo-tenant (tenant-specific, tenant-scoped)"
  echo ""
  echo -e "${CYAN}Environment Namespaces (LEGACY):${NC}"
  echo "  production  - dotdo-production"
  echo "  staging     - dotdo-staging"
  echo "  development - dotdo-development"
  echo ""
  echo "Examples (3-tier):"
  echo "  $0 db internal"
  echo "  $0 gateway public"
  echo "  $0 all internal"
  echo ""
  echo "Examples (legacy):"
  echo "  $0 gateway production"
  echo "  $0 all staging"
  exit 1
}

# Check arguments
if [ $# -ne 2 ]; then
  echo -e "${RED}Error: Invalid number of arguments${NC}"
  usage
fi

SERVICE="$1"
NAMESPACE_KEY="$2"

# Determine namespace type and validate
NAMESPACE=""
NAMESPACE_ID=""
NAMESPACE_TYPE=""

if [ -n "${TIER_NAMESPACES[$NAMESPACE_KEY]}" ]; then
  NAMESPACE="${TIER_NAMESPACES[$NAMESPACE_KEY]}"
  NAMESPACE_TYPE="3-tier"
elif [ -n "${ENV_NAMESPACES[$NAMESPACE_KEY]}" ]; then
  NAMESPACE="${ENV_NAMESPACES[$NAMESPACE_KEY]}"
  NAMESPACE_ID="${NAMESPACE_IDS[$NAMESPACE_KEY]}"
  NAMESPACE_TYPE="environment"
else
  echo -e "${RED}Error: Invalid namespace '$NAMESPACE_KEY'${NC}"
  echo ""
  echo "Valid 3-tier namespaces: internal, public, tenant"
  echo "Valid environment namespaces: production, staging, development"
  exit 1
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Workers for Platforms Deployment${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Service:        ${GREEN}$SERVICE${NC}"
echo -e "Namespace Key:  ${GREEN}$NAMESPACE_KEY${NC}"
echo -e "Namespace:      ${GREEN}$NAMESPACE${NC}"
echo -e "Type:           ${CYAN}$NAMESPACE_TYPE${NC}"
if [ -n "$NAMESPACE_ID" ]; then
  echo -e "Namespace ID:   ${GREEN}$NAMESPACE_ID${NC}"
fi
echo ""

if [ "$NAMESPACE_TYPE" = "3-tier" ]; then
  echo -e "${YELLOW}⚠️  Deploying to EXPERIMENTAL 3-tier architecture${NC}"
  echo ""
fi

# Function to deploy a single service
deploy_service() {
  local svc="$1"
  local ns="$2"

  echo -e "${YELLOW}→ Deploying service: $svc${NC}"

  # Check if service directory exists
  if [ ! -d "$svc" ]; then
    echo -e "${RED}✗ Error: Service directory '$svc' not found${NC}"
    return 1
  fi

  # Navigate to service directory
  cd "$svc"

  # Deploy using wrangler
  echo -e "${BLUE}  Running: wrangler deploy --dispatch-namespace $ns${NC}"

  if npx wrangler deploy --dispatch-namespace "$ns"; then
    echo -e "${GREEN}✓ Successfully deployed $svc to $ns${NC}"
    echo ""
  else
    echo -e "${RED}✗ Failed to deploy $svc${NC}"
    cd ..
    return 1
  fi

  # Return to parent directory
  cd ..

  return 0
}

# Deploy based on service argument
if [ "$SERVICE" = "all" ]; then
  echo -e "${YELLOW}Deploying all services in dependency order...${NC}"
  echo ""

  # Deploy in dependency order
  # 1. gateway (no dependencies)
  # 2. db (gateway depends on this)
  # 3. auth (depends on db)
  # 4. schedule (depends on db)

  FAILED=0

  for svc in "${SERVICES[@]}"; do
    if ! deploy_service "$svc" "$NAMESPACE"; then
      FAILED=1
      echo -e "${RED}Deployment failed at service: $svc${NC}"
      echo -e "${YELLOW}Stopping deployment sequence${NC}"
      break
    fi

    # Small delay between deployments
    sleep 2
  done

  if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}✓ All services deployed successfully!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "Verify deployment:"
    echo "  wrangler dispatch-namespace list-workers $NAMESPACE"
  else
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}✗ Deployment failed${NC}"
    echo -e "${RED}============================================${NC}"
    exit 1
  fi

else
  # Validate service name
  if [[ ! " ${SERVICES[@]} " =~ " ${SERVICE} " ]]; then
    echo -e "${RED}Error: Invalid service '$SERVICE'${NC}"
    echo "Valid services: gateway, db, auth, schedule, all"
    exit 1
  fi

  # Deploy single service
  if deploy_service "$SERVICE" "$NAMESPACE"; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}✓ Deployment complete${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "Verify deployment:"
    echo "  wrangler dispatch-namespace list-workers $NAMESPACE | grep $SERVICE"
    echo ""
    echo "Tail logs:"
    echo "  wrangler tail $SERVICE --dispatch-namespace $NAMESPACE"
  else
    exit 1
  fi
fi
