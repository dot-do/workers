#!/bin/bash

###############################################################################
# Deploy All Wave 2F Services to Dispatch Namespace
#
# Usage:
#   ./deploy-wave-2f.sh <environment>
#
# Examples:
#   ./deploy-wave-2f.sh production   # Deploys to dotdo-production
#   ./deploy-wave-2f.sh staging      # Deploys to dotdo-staging
#   ./deploy-wave-2f.sh development  # Deploys to dotdo-development
#
# Services deployed:
#   - webhooks
#   - email
#   - mcp
#   - queue
###############################################################################

set -e # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICES=("webhooks" "email" "mcp" "queue")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-service.sh"

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

###############################################################################
# Main Script
###############################################################################

print_section "Deploy Wave 2F Services"

# Parse arguments
ENVIRONMENT=$1

# Validate arguments
if [ -z "$ENVIRONMENT" ]; then
    print_error "Missing environment argument"
    echo ""
    echo "Usage: $0 <environment>"
    echo ""
    echo "Valid environments: production, staging, development"
    echo ""
    exit 1
fi

# Map environment to namespace
case "$ENVIRONMENT" in
    production)
        NAMESPACE="dotdo-production"
        ;;
    staging)
        NAMESPACE="dotdo-staging"
        ;;
    development)
        NAMESPACE="dotdo-development"
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        echo "Valid environments: production, staging, development"
        exit 1
        ;;
esac

print_info "Environment: $ENVIRONMENT"
print_info "Namespace: $NAMESPACE"
print_info "Services to deploy: ${SERVICES[*]}"
echo ""

# Verify deploy script exists
if [ ! -f "$DEPLOY_SCRIPT" ]; then
    print_error "Deploy script not found: $DEPLOY_SCRIPT"
    exit 1
fi

# Verify deploy script is executable
if [ ! -x "$DEPLOY_SCRIPT" ]; then
    print_info "Making deploy script executable..."
    chmod +x "$DEPLOY_SCRIPT"
fi

# Prompt for confirmation
print_warning "This will deploy ${#SERVICES[@]} services to $NAMESPACE"
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled"
    exit 0
fi

# Track deployment results
SUCCESSFUL_DEPLOYMENTS=()
FAILED_DEPLOYMENTS=()
START_TIME=$(date +%s)

# Deploy each service
for SERVICE in "${SERVICES[@]}"; do
    print_section "Deploying: $SERVICE"

    if "$DEPLOY_SCRIPT" "$SERVICE" "$NAMESPACE" "$ENVIRONMENT"; then
        SUCCESSFUL_DEPLOYMENTS+=("$SERVICE")
        print_success "$SERVICE deployed successfully"
    else
        FAILED_DEPLOYMENTS+=("$SERVICE")
        print_error "$SERVICE deployment failed"

        # Ask if we should continue
        echo ""
        print_warning "A deployment failed. Continue with remaining services?"
        read -p "Continue? (y/N) " -n 1 -r
        echo ""

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Deployment cancelled"
            break
        fi
    fi

    # Brief pause between deployments
    sleep 2
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Summary
print_section "Deployment Summary"

echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "Duration: ${DURATION}s"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

if [ ${#SUCCESSFUL_DEPLOYMENTS[@]} -gt 0 ]; then
    print_success "Successfully deployed ${#SUCCESSFUL_DEPLOYMENTS[@]} service(s):"
    for SERVICE in "${SUCCESSFUL_DEPLOYMENTS[@]}"; do
        echo "  ✓ $SERVICE"
    done
    echo ""
fi

if [ ${#FAILED_DEPLOYMENTS[@]} -gt 0 ]; then
    print_error "Failed to deploy ${#FAILED_DEPLOYMENTS[@]} service(s):"
    for SERVICE in "${FAILED_DEPLOYMENTS[@]}"; do
        echo "  ✗ $SERVICE"
    done
    echo ""
fi

# Next steps
if [ ${#SUCCESSFUL_DEPLOYMENTS[@]} -eq ${#SERVICES[@]} ]; then
    print_success "All Wave 2F services deployed successfully! 🎉"
    echo ""
    print_info "Next steps:"
    echo "  1. Verify all services are healthy"
    echo "  2. Test service bindings"
    echo "  3. Monitor logs for errors"
    echo "  4. Update STATUS.md with deployment dates"
    echo "  5. Update NAMESPACES.md with worker counts"
    echo ""
    exit 0
elif [ ${#SUCCESSFUL_DEPLOYMENTS[@]} -gt 0 ]; then
    print_warning "Partial deployment completed"
    echo ""
    print_info "Next steps:"
    echo "  1. Investigate failed deployments"
    echo "  2. Fix issues and retry failed services"
    echo "  3. Verify successful deployments are healthy"
    echo ""
    exit 1
else
    print_error "All deployments failed"
    echo ""
    print_info "Next steps:"
    echo "  1. Check wrangler authentication"
    echo "  2. Verify namespace exists"
    echo "  3. Check service configurations"
    echo "  4. Review error messages above"
    echo ""
    exit 1
fi
