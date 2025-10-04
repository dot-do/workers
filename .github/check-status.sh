#!/bin/bash

# CI/CD Status Check Script
# Quickly check the status of your CI/CD setup

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

clear
print_header "📊 CI/CD Status Check"
echo ""

# Check GitHub Secrets
print_header "GitHub Secrets"
echo ""

SECRETS=$(gh secret list 2>/dev/null)
if [ $? -eq 0 ]; then
    if echo "$SECRETS" | grep -q "CLOUDFLARE_ACCOUNT_ID"; then
        print_success "CLOUDFLARE_ACCOUNT_ID: Configured"
    else
        print_error "CLOUDFLARE_ACCOUNT_ID: Missing"
    fi

    if echo "$SECRETS" | grep -q "CLOUDFLARE_API_TOKEN"; then
        print_success "CLOUDFLARE_API_TOKEN: Configured"
    else
        print_error "CLOUDFLARE_API_TOKEN: Missing"
    fi

    if echo "$SECRETS" | grep -q "CODECOV_TOKEN"; then
        print_success "CODECOV_TOKEN: Configured (optional)"
    else
        print_info "CODECOV_TOKEN: Not configured (optional)"
    fi
else
    print_error "Cannot access GitHub secrets"
    print_info "Run: gh auth login"
fi

echo ""

# Check Workflows
print_header "GitHub Actions Workflows"
echo ""

if [ -d ".github/workflows" ]; then
    WORKFLOW_COUNT=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l | tr -d ' ')
    print_success "Found $WORKFLOW_COUNT workflow files"
    ls -1 .github/workflows/*.yml | while read file; do
        basename=$(basename "$file")
        print_info "  • $basename"
    done
else
    print_error "No .github/workflows directory found"
fi

echo ""

# Check Recent Runs
print_header "Recent Workflow Runs"
echo ""

RUNS=$(gh run list --limit 5 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "$RUNS" | head -n 6
else
    print_error "Cannot access workflow runs"
fi

echo ""

# Check Latest Run Status
print_header "Latest Workflow Status"
echo ""

LATEST=$(gh run view 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "$LATEST" | head -n 15
    echo ""

    # Check if failed
    if echo "$LATEST" | grep -q "Status.*failure"; then
        print_error "Latest workflow failed"
        print_info "View logs: gh run view --log"
    elif echo "$LATEST" | grep -q "Status.*success"; then
        print_success "Latest workflow succeeded"
    elif echo "$LATEST" | grep -q "Status.*in_progress"; then
        print_info "Latest workflow is in progress"
        print_info "Watch: gh run watch"
    fi
else
    print_info "No recent workflow runs"
fi

echo ""

# Check Service Status
print_header "Core Services Status"
echo ""

SERVICES=("gateway" "db" "auth" "schedule" "webhooks" "email" "mcp" "queue")
for service in "${SERVICES[@]}"; do
    if [ -f "$service/wrangler.jsonc" ]; then
        print_success "$service: wrangler.jsonc exists"
    else
        print_warning "$service: No wrangler.jsonc"
    fi
done

echo ""

# Quick Actions
print_header "Quick Actions"
echo ""

echo "View workflow logs:        gh run view --log"
echo "Watch live workflow:       gh run watch"
echo "List all runs:             gh run list"
echo "Open in browser:           gh run view --web"
echo ""
echo "Run CI manually:           gh workflow run ci.yml"
echo "Deploy to staging:         gh workflow run deploy.yml --field service=all --field environment=staging"
echo ""
echo "Setup guide:               cat .github/SETUP_GUIDE.md"
echo "Full CI/CD guide:          cat .github/CI_CD_GUIDE.md"
echo ""

# Summary
print_header "Summary"
echo ""

# Count issues
ISSUES=0

if ! echo "$SECRETS" | grep -q "CLOUDFLARE_ACCOUNT_ID"; then
    ((ISSUES++))
fi

if ! echo "$SECRETS" | grep -q "CLOUDFLARE_API_TOKEN"; then
    ((ISSUES++))
fi

if [ $ISSUES -eq 0 ]; then
    print_success "CI/CD is configured and ready!"
    echo ""
    print_info "Next: Push a commit to trigger CI"
    echo "  git commit --allow-empty -m 'test: CI/CD test'"
    echo "  git push"
else
    print_error "Found $ISSUES configuration issues"
    echo ""
    print_info "Run setup script: .github/setup-ci-cd.sh"
fi

echo ""
