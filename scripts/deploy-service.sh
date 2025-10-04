#!/bin/bash

###############################################################################
# Deploy Service to Dispatch Namespace
#
# Usage:
#   ./deploy-service.sh <service-name> <namespace> [environment]
#
# Examples:
#   ./deploy-service.sh webhooks dotdo-production production
#   ./deploy-service.sh email dotdo-staging staging
#   ./deploy-service.sh mcp dotdo-development development
#
# Arguments:
#   service-name: Name of the service to deploy (webhooks, email, mcp, queue)
#   namespace: Dispatch namespace (dotdo-production, dotdo-staging, dotdo-development)
#   environment: Optional environment name (production, staging, development)
###############################################################################

set -e # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VALID_SERVICES=("webhooks" "email" "mcp" "queue")
VALID_NAMESPACES=("dotdo-production" "dotdo-staging" "dotdo-development")
WORKERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

###############################################################################
# Helper Functions
###############################################################################

print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  ${1}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

validate_service() {
    local service=$1
    for valid in "${VALID_SERVICES[@]}"; do
        if [ "$service" == "$valid" ]; then
            return 0
        fi
    done
    return 1
}

validate_namespace() {
    local namespace=$1
    for valid in "${VALID_NAMESPACES[@]}"; do
        if [ "$namespace" == "$valid" ]; then
            return 0
        fi
    done
    return 1
}

###############################################################################
# Main Script
###############################################################################

print_section "Deploy Service to Dispatch Namespace"

# Parse arguments
SERVICE_NAME=$1
NAMESPACE=$2
ENVIRONMENT=${3:-""}

# Validate arguments
if [ -z "$SERVICE_NAME" ] || [ -z "$NAMESPACE" ]; then
    print_error "Missing required arguments"
    echo ""
    echo "Usage: $0 <service-name> <namespace> [environment]"
    echo ""
    echo "Valid services: ${VALID_SERVICES[*]}"
    echo "Valid namespaces: ${VALID_NAMESPACES[*]}"
    echo ""
    exit 1
fi

if ! validate_service "$SERVICE_NAME"; then
    print_error "Invalid service name: $SERVICE_NAME"
    echo "Valid services: ${VALID_SERVICES[*]}"
    exit 1
fi

if ! validate_namespace "$NAMESPACE"; then
    print_error "Invalid namespace: $NAMESPACE"
    echo "Valid namespaces: ${VALID_NAMESPACES[*]}"
    exit 1
fi

# Auto-detect environment from namespace if not provided
if [ -z "$ENVIRONMENT" ]; then
    case "$NAMESPACE" in
        dotdo-production)
            ENVIRONMENT="production"
            ;;
        dotdo-staging)
            ENVIRONMENT="staging"
            ;;
        dotdo-development)
            ENVIRONMENT="development"
            ;;
    esac
fi

print_info "Service: $SERVICE_NAME"
print_info "Namespace: $NAMESPACE"
print_info "Environment: $ENVIRONMENT"
print_info "Workers Directory: $WORKERS_DIR"

# Check if service directory exists
SERVICE_DIR="$WORKERS_DIR/$SERVICE_NAME"
if [ ! -d "$SERVICE_DIR" ]; then
    print_error "Service directory not found: $SERVICE_DIR"
    exit 1
fi

print_success "Service directory found"

# Check if wrangler.jsonc exists
WRANGLER_CONFIG="$SERVICE_DIR/wrangler.jsonc"
if [ ! -f "$WRANGLER_CONFIG" ]; then
    print_error "wrangler.jsonc not found: $WRANGLER_CONFIG"
    exit 1
fi

print_success "Wrangler config found"

# Pre-flight checks
print_section "Pre-flight Checks"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "wrangler CLI not found"
    print_info "Install with: npm install -g wrangler"
    exit 1
fi

print_success "wrangler CLI available"

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    print_error "Not logged in to Cloudflare"
    print_info "Login with: wrangler login"
    exit 1
fi

print_success "Authenticated with Cloudflare"

# Verify namespace exists
print_info "Verifying namespace exists..."
if ! wrangler dispatch-namespace list 2>/dev/null | grep -q "$NAMESPACE"; then
    print_warning "Namespace '$NAMESPACE' not found in account"
    print_warning "This may be normal if you don't have permission to list namespaces"
fi

# Build/deploy
print_section "Deploying $SERVICE_NAME to $NAMESPACE"

cd "$SERVICE_DIR"

print_info "Running deployment..."
print_info "Command: wrangler deploy --dispatch-namespace $NAMESPACE"
echo ""

# Deploy with namespace flag
if wrangler deploy --dispatch-namespace "$NAMESPACE"; then
    echo ""
    print_success "Deployment successful!"
else
    echo ""
    print_error "Deployment failed!"
    exit 1
fi

# Post-deployment verification
print_section "Post-deployment Verification"

print_info "Waiting for service to be available..."
sleep 3

# Try to list workers in namespace
print_info "Listing workers in namespace..."
if wrangler dispatch-namespace list-workers "$NAMESPACE" 2>/dev/null | grep -q "$SERVICE_NAME"; then
    print_success "Service appears in namespace worker list"
else
    print_warning "Could not verify service in namespace (may require additional permissions)"
fi

# Summary
print_section "Deployment Summary"

echo "Service: $SERVICE_NAME"
echo "Namespace: $NAMESPACE"
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

print_info "Next steps:"
echo "  1. Monitor logs: wrangler tail $SERVICE_NAME --dispatch-namespace $NAMESPACE"
echo "  2. Test health endpoint (if available)"
echo "  3. Verify service bindings work"
echo "  4. Update documentation with deployment date"
echo ""

print_success "Deployment complete! 🎉"
