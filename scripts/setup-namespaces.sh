#!/bin/bash
#
# Setup Workers for Platforms Namespaces
#
# Creates 3 dispatch namespaces for different security levels:
# - internal: Internal services (db, auth, schedule, etc.) - admin access only
# - public: Public APIs - open access, rate-limited
# - tenant: Tenant-specific deployments - tenant-scoped auth
#
# NOTE: This is an experimental architecture. We're exploring whether to:
# Option A: Use 3 separate namespaces for security isolation
# Option B: Keep internal as regular workers, only use namespaces for public/tenant
#
# Benefits of Option A (3 namespaces):
# - Clear security boundaries
# - Independent versioning per tier
# - Flexible deployment strategies
# - Better isolation and fault tolerance
#
# Benefits of Option B (internal as regular workers):
# - Simpler deployment for infrastructure
# - Lower overhead for internal services
# - Only use Workers for Platforms where multi-tenancy needed
#
# Usage:
#   ./scripts/setup-namespaces.sh [--force]
#
# The --force flag will delete and recreate existing namespaces.
# Use with caution in production!
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Force flag
FORCE=false
if [ "$1" = "--force" ]; then
  FORCE=true
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Workers for Platforms - Namespace Setup${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  Architecture Decision In Progress${NC}"
echo ""
echo "We're exploring namespace architecture options:"
echo ""
echo -e "${CYAN}Option A: 3 Namespaces${NC}"
echo "  - internal: Infrastructure services (admin-only)"
echo "  - public: Public APIs (open, rate-limited)"
echo "  - tenant: Tenant deployments (tenant-scoped)"
echo ""
echo -e "${CYAN}Option B: Hybrid Approach${NC}"
echo "  - internal: Regular workers (no namespace)"
echo "  - public: Workers for Platforms namespace"
echo "  - tenant: Workers for Platforms namespace"
echo ""
echo -e "This script sets up ${YELLOW}Option A${NC} for testing."
echo ""

# Check for wrangler
if ! command -v wrangler &> /dev/null; then
  echo -e "${RED}Error: wrangler CLI not found${NC}"
  echo "Install with: npm install -g wrangler"
  exit 1
fi

# Check authentication
echo -e "${BLUE}→ Checking Cloudflare authentication...${NC}"
if ! wrangler whoami &> /dev/null; then
  echo -e "${RED}Error: Not authenticated with Cloudflare${NC}"
  echo "Run: wrangler login"
  exit 1
fi
echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Namespace definitions
declare -A NAMESPACES=(
  ["internal"]="dotdo-internal"
  ["public"]="dotdo-public"
  ["tenant"]="dotdo-tenant"
)

declare -A DESCRIPTIONS=(
  ["internal"]="Internal infrastructure services (admin access required)"
  ["public"]="Public APIs and services (open access, rate-limited)"
  ["tenant"]="Tenant-specific deployments (tenant-scoped authentication)"
)

# Function to check if namespace exists
namespace_exists() {
  local name="$1"
  wrangler dispatch-namespace list | grep -q "$name"
}

# Function to delete namespace
delete_namespace() {
  local name="$1"
  echo -e "${YELLOW}  Deleting existing namespace: $name${NC}"
  wrangler dispatch-namespace delete "$name" || true
}

# Function to create namespace
create_namespace() {
  local key="$1"
  local name="${NAMESPACES[$key]}"
  local desc="${DESCRIPTIONS[$key]}"

  echo -e "${BLUE}→ Setting up namespace: ${CYAN}$key${NC}"
  echo -e "  Name: ${GREEN}$name${NC}"
  echo -e "  Description: $desc"
  echo ""

  # Check if exists
  if namespace_exists "$name"; then
    if [ "$FORCE" = true ]; then
      delete_namespace "$name"
    else
      echo -e "${YELLOW}⚠️  Namespace already exists${NC}"
      echo "  Use --force to recreate"
      echo ""
      return 0
    fi
  fi

  # Create namespace
  echo -e "${BLUE}  Creating namespace...${NC}"
  if wrangler dispatch-namespace create "$name"; then
    echo -e "${GREEN}✓ Created namespace: $name${NC}"
    echo ""
  else
    echo -e "${RED}✗ Failed to create namespace: $name${NC}"
    return 1
  fi

  return 0
}

# Create all namespaces
echo -e "${YELLOW}Creating namespaces...${NC}"
echo ""

FAILED=0
for key in internal public tenant; do
  if ! create_namespace "$key"; then
    FAILED=1
    break
  fi
done

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}✓ All namespaces created successfully!${NC}"
  echo -e "${GREEN}============================================${NC}"
  echo ""

  echo -e "${CYAN}Namespace Summary:${NC}"
  echo ""
  wrangler dispatch-namespace list
  echo ""

  echo -e "${CYAN}Service Routing (Planned):${NC}"
  echo ""
  echo -e "${YELLOW}Internal Namespace:${NC}"
  echo "  - db, auth, schedule, webhooks, email, queue, mcp"
  echo "  - Requires admin authentication"
  echo ""
  echo -e "${YELLOW}Public Namespace:${NC}"
  echo "  - gateway (public routes only)"
  echo "  - Open access, rate-limited"
  echo ""
  echo -e "${YELLOW}Tenant Namespace:${NC}"
  echo "  - Customer-specific deployments"
  echo "  - Tenant-scoped authentication"
  echo ""

  echo -e "${CYAN}Next Steps:${NC}"
  echo ""
  echo "1. Update workers/deploy service to route to appropriate namespaces"
  echo "2. Configure gateway to enforce auth per namespace"
  echo "3. Test deployment to each namespace"
  echo "4. Decide on final architecture (Option A vs Option B)"
  echo ""
  echo -e "${YELLOW}Deploy to namespaces:${NC}"
  echo "  ./scripts/deploy-to-namespace.sh <service> internal"
  echo "  ./scripts/deploy-to-namespace.sh <service> public"
  echo "  ./scripts/deploy-to-namespace.sh <service> tenant"
  echo ""
else
  echo -e "${RED}============================================${NC}"
  echo -e "${RED}✗ Namespace setup failed${NC}"
  echo -e "${RED}============================================${NC}"
  exit 1
fi
